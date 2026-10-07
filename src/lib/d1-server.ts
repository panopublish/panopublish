import { createServerFn } from "@tanstack/react-start";
import { getEnv, getBinding } from "./env";
import { verifyJWT, hashPassword, signJWT } from "./auth-server";
import { formatEmailMarkdownToHtml, parseInlineMarkdown } from "./email-formatter";

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

interface CachedUser {
  user: any;
  expiry: number;
}

const tokenCache = new Map<string, CachedUser>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const ADMIN_EMAILS = ["vista360gtp@gmail.com", "er.prashantyadav37@gmail.com"];

function checkIsAdmin(user: any) {
  return user?.email && ADMIN_EMAILS.includes(user.email);
}

let schemaEnsured = false;

async function ensureReferralSchema(db: any) {
  if (!db) return;
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN referral_code TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN payout_upi_id TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN payout_account_name TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN payout_bank_account TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN payout_ifsc TEXT").run();
  } catch (_) {}

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        commission_percent REAL NOT NULL DEFAULT 25.0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (_) {}

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS referral_attributions (
        id TEXT PRIMARY KEY,
        referred_user_id TEXT NOT NULL UNIQUE,
        referrer_user_id TEXT NOT NULL,
        referral_code_id TEXT,
        attributed_code TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (_) {}

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL,
        referred_user_id TEXT NOT NULL,
        payment_source TEXT NOT NULL DEFAULT 'razorpay_subscription',
        payment_reference_id TEXT NOT NULL,
        plan_name TEXT,
        payment_amount_inr REAL NOT NULL,
        commission_percent REAL NOT NULL DEFAULT 25.0,
        commission_amount_inr REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        payout_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (_) {}

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS referral_payouts (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL,
        amount_inr REAL NOT NULL,
        payout_method TEXT NOT NULL DEFAULT 'upi',
        payout_address TEXT NOT NULL,
        transaction_reference TEXT NOT NULL,
        processed_by TEXT NOT NULL,
        notes TEXT,
        paid_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (_) {}

  try {
    if (typeof db.batch === "function") {
      await db.batch([
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON referral_attributions(referrer_user_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_attributions_referred ON referral_attributions(referred_user_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_user_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_referral_payouts_referrer ON referral_payouts(referrer_user_id)"),
      ]);
    }
  } catch (_) {}
}

async function ensureSchema(db: any) {
  if (schemaEnsured || !db) return;
  try {
    await db.prepare("ALTER TABLE tours ADD COLUMN storage_cleared INTEGER DEFAULT 0").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE tours ADD COLUMN first_published_photo_url TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN last_seen_at TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN last_active_path TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN last_active_device TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN applied_promo TEXT").run();
  } catch (_) {}
  try {
    await db.prepare("ALTER TABLE profiles ADD COLUMN promo_discount_redeemed BOOLEAN NOT NULL DEFAULT 0").run();
  } catch (_) {}
  try {
    if (typeof db.batch === "function") {
      await db.batch([
        db.prepare("CREATE INDEX IF NOT EXISTS idx_connections_tour_id ON connections(tour_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_connections_from_photo ON connections(from_photo_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_connections_to_photo ON connections(to_photo_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_constellations_tour_id ON constellations(tour_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen_at)"),
      ]);
    }
  } catch (_) {}
  try {
    // Reset legacy hardcoded credit inflation for tmstudio934@gmail.com (Basic plan has 5 credits)
    await db.prepare("UPDATE profiles SET credits = 5 WHERE LOWER(email) = 'tmstudio934@gmail.com' AND plan = 'basic' AND credits > 5").run();
  } catch (_) {}

  await ensureReferralSchema(db);

  // Auto-heal & backfill: Ensure 360digitalsstudio is attributed to TSR HELP if not already present
  try {
    const tsrProfile: any = await db.prepare(
      "SELECT id, email, name FROM profiles WHERE LOWER(email) = 'tsrhelp7@gmail.com' OR LOWER(name) LIKE '%tsr help%' LIMIT 1"
    ).first();

    const user360: any = await db.prepare(
      "SELECT id, email FROM profiles WHERE LOWER(email) = '360digitalsstudio@gmail.com' LIMIT 1"
    ).first();

    if (tsrProfile && user360) {
      const tsrCodeRow: any = await db.prepare(
        "SELECT id, code FROM referral_codes WHERE user_id = ? LIMIT 1"
      ).bind(tsrProfile.id).first();

      const existingAttr: any = await db.prepare(
        "SELECT id FROM referral_attributions WHERE referred_user_id = ? LIMIT 1"
      ).bind(user360.id).first();

      if (!existingAttr) {
        const codeToUse = tsrCodeRow?.code || "TSRHELP";
        await db.prepare(`
          INSERT INTO referral_attributions (id, referred_user_id, referrer_user_id, referral_code_id, attributed_code, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          crypto.randomUUID(),
          user360.id,
          tsrProfile.id,
          tsrCodeRow?.id || null,
          codeToUse
        ).run();
      }
    }
  } catch (e) {
    console.warn("Failed to auto-heal 360digitalsstudio attribution:", e);
  }

  // Auto-heal: Ensure ALL users referred by TSR HELP have applied_promo = 'TSRHELP' if discount not yet redeemed
  try {
    await db.prepare(`
      UPDATE profiles
      SET applied_promo = 'TSRHELP'
      WHERE (applied_promo IS NULL OR applied_promo = '')
        AND (promo_discount_redeemed = 0 OR promo_discount_redeemed IS NULL)
        AND (
          id IN (
            SELECT referred_user_id FROM referral_attributions
            WHERE UPPER(attributed_code) = 'TSRHELP'
               OR referrer_user_id IN (
                 SELECT user_id FROM referral_codes WHERE UPPER(code) = 'TSRHELP'
               )
               OR referrer_user_id IN (
                 SELECT id FROM profiles WHERE LOWER(email) = 'tsrhelp7@gmail.com' OR LOWER(name) LIKE '%tsr help%'
               )
          )
          OR LOWER(email) = '360digitalsstudio@gmail.com'
        )
    `).run();
  } catch (e) {
    console.warn("Failed to backfill TSRHELP promo to referred users:", e);
  }

  schemaEnsured = true;
}

async function getUserFromToken(token: string) {
  if (!token) {
    throw new Error("No session token provided");
  }

  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiry > now) {
    return cached.user;
  }

  const jwtSecret = getEnv("JWT_SECRET") || "secret";
  const claims = await verifyJWT(token, jwtSecret);
  
  if (!claims || !claims.sub) {
    throw new Error("Invalid session token: JWT verification failed");
  }

  const user = {
    id: claims.sub,
    email: claims.email,
  };
  
  // Cache the user
  tokenCache.set(token, {
    user,
    expiry: Date.now() + CACHE_TTL_MS,
  });

  // Clean up expired items
  if (tokenCache.size > 100) {
    for (const [key, value] of tokenCache.entries()) {
      if (value.expiry < now) {
        tokenCache.delete(key);
      }
    }
  }

  return user;
}

export const runD1Query = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const payload = ctx.data;
      
      // Determine if auth is strictly required
      const isUsernameCheck = 
        payload.table === "profiles" && 
        payload.action === "select" && 
        payload.filters?.length === 1 && 
        payload.filters[0].column === "username" && 
        payload.filters[0].type === "eq" &&
        (payload.selects === "id" || payload.selects === "username" || payload.selects === "id,username");

      const isPublicCouponCheck =
        payload.table === "coupons" &&
        payload.action === "select";

      const isPublicReferralCodeCheck =
        payload.table === "referral_codes" &&
        payload.action === "select";

      const isPublicTourPreviewCheck =
        payload.action === "select" &&
        (
          (payload.table === "tours" && payload.filters?.some((f: any) => f.column === "id" || f.column === "tours.id")) ||
          (payload.table === "photos" && payload.filters?.some((f: any) => f.column === "tour_id" || f.column === "photos.tour_id" || f.column === "id" || f.column === "photos.id")) ||
          (payload.table === "connections" && payload.filters?.some((f: any) => f.column === "tour_id" || f.column === "connections.tour_id")) ||
          (payload.table === "islands" && payload.filters?.some((f: any) => f.column === "tour_id" || f.column === "islands.tour_id")) ||
          (payload.table === "constellations" && payload.filters?.some((f: any) => f.column === "tour_id" || f.column === "constellations.tour_id"))
        );

      const isPublicQuery = isUsernameCheck || isPublicCouponCheck || isPublicReferralCodeCheck || isPublicTourPreviewCheck;

      let user: any = null;
      let userId: string | null = null;

      if (!isPublicQuery) {
        user = await getUserFromToken(payload.token);
        userId = user.id;
      } else if (payload.token) {
        // Optional auth for public queries
        try { user = await getUserFromToken(payload.token); userId = user.id; } catch {}
      }
    const db = getBinding("DB");
    if (!db) {
      return { data: null, error: { message: "Cloudflare D1 Database binding 'DB' is missing" } };
    }

    if (!schemaEnsured) {
      await ensureSchema(db);
    }

    const { table, action } = payload;
    if (table && table.startsWith("referral_")) {
      await ensureReferralSchema(db);
    }

    // Build the query and parameter bindings
    let sql = "";
    const params: any[] = [];

    // Helper to format filters
    const buildWhereClause = () => {
      const clauses: string[] = [];
      const isAdmin = checkIsAdmin(user);

      // Ensure user can only access their own data (Row-Level Security)
      if (isAdmin) {
        // Admin can query any row in any table! No automatic RLS clause.
      } else {
        if (table === "profiles") {
          if (isUsernameCheck) {
            // Public username check, do not restrict to self
          } else if (userId) {
            clauses.push(`${table}.id = ?`);
            params.push(userId);
          } else {
            throw new Error("Unauthorized: Profile access requires authentication");
          }
        } else if (table === "coupons" || table === "referral_codes") {
          // coupons and referral_codes are public read
        } else if (
          table === "referral_attributions" ||
          table === "referral_commissions" ||
          table === "referral_payouts"
        ) {
          if (userId) {
            clauses.push(`${table}.referrer_user_id = ?`);
            params.push(userId);
          } else {
            throw new Error(`Unauthorized: Access to ${table} requires authentication`);
          }
        } else if (table === "connections" || table === "users") {
          // connections are scoped via tour_id (no user_id column)
          // users table is for auth only, no user_id column
        } else if (
          table === "testimonials" ||
          table === "case_studies" ||
          table === "authors" ||
          table === "faqs" ||
          table === "whatsapp_proofs"
        ) {
          // Public content tables — no user_id scoping needed, skip
        } else if (isPublicTourPreviewCheck) {
          // Public tour preview select for tours, photos, connections, islands, constellations
          // Scoped strictly by id or tour_id from the query filters
        } else {
          if (userId) {
            clauses.push(`${table}.user_id = ?`);
            params.push(userId);
          } else {
            throw new Error(`Unauthorized: Access to ${table} requires authentication`);
          }
        }
      }

      if (payload.filters && payload.filters.length > 0) {
        for (const f of payload.filters) {
          const colName = f.column.includes(".") ? f.column : `${table}.${f.column}`;
          if (f.type === "eq") {
            clauses.push(`${colName} = ?`);
            params.push(f.value);
          } else if (f.type === "neq") {
            clauses.push(`${colName} != ?`);
            params.push(f.value);
          } else if (f.type === "is") {
            if (f.value === null) {
              clauses.push(`${colName} IS NULL`);
            } else {
              clauses.push(`${colName} IS ?`);
              params.push(f.value);
            }
          } else if (f.type === "in") {
            if (Array.isArray(f.value) && f.value.length > 0) {
              const placeholders = f.value.map(() => "?").join(", ");
              clauses.push(`${colName} IN (${placeholders})`);
              params.push(...f.value);
            } else {
              clauses.push("0 = 1"); // force empty results for empty IN list
            }
          } else if (f.type === "or") {
            const parts = f.value.split(",");
            const subClauses: string[] = [];
            for (const part of parts) {
              const match = part.match(/^([^.]+)\.eq\.(.+)$/);
              if (match) {
                const subCol = match[1].includes(".") ? match[1] : `${table}.${match[1]}`;
                subClauses.push(`${subCol} = ?`);
                params.push(match[2]);
              }
            }
            if (subClauses.length > 0) {
              clauses.push(`(${subClauses.join(" OR ")})`);
            }
          }
        }
      }

      return clauses.length > 0 ? " WHERE " + clauses.join(" AND ") : "";
    };

    if (action === "select") {
      const whereSql = buildWhereClause();
      let count: number | null = null;

      if (payload.countOption === "exact") {
        const countSql = `SELECT COUNT(*) as total FROM ${table}${whereSql}`;
        try {
          const countRes = await db
            .prepare(countSql)
            .bind(...params)
            .first();
          count = countRes ? (countRes as any).total : 0;
        } catch (countErr: any) {
          if (countErr.message && (countErr.message.includes("no such table") || countErr.message.includes("no such column"))) {
            await ensureReferralSchema(db);
            try {
              await db.prepare("ALTER TABLE tours ADD COLUMN storage_cleared INTEGER DEFAULT 0").run();
            } catch (_) {}
            try {
              await db.prepare("ALTER TABLE tours ADD COLUMN first_published_photo_url TEXT").run();
            } catch (_) {}
            const retryCountRes = await db
              .prepare(countSql)
              .bind(...params)
              .first();
            count = retryCountRes ? (retryCountRes as any).total : 0;
          } else {
            throw countErr;
          }
        }
      }

      if (payload.headOption) {
        return { data: null, count, error: null };
      }

      const selects = (payload.selects || "*") as string;
      let selectFields = selects;
      let joinClause = "";

      if (selects.includes("client:clients")) {
        selectFields = selectFields.replace(
          /client:clients\([^)]+\)/g,
          "clients.name AS client_name",
        );
        joinClause = " LEFT JOIN clients ON tours.client_id = clients.id";
      }

      // clean up other nested fields and qualify main table fields
      selectFields = selectFields
        .split(",")
        .map((f) => f.trim())
        .filter((f) => !f.includes(":"))
        .map((f) => {
          if (f.includes(".") || f.toLowerCase().includes(" as ")) {
            return f;
          }
          if (f === "*") return f;
          return `${table}.${f}`;
        })
        .join(", ");
      if (!selectFields) selectFields = "*";

      sql = `SELECT ${selectFields} FROM ${table}${joinClause}${whereSql}`;

      if (payload.orderCol) {
        const orderColQualified = payload.orderCol.includes(".")
          ? payload.orderCol
          : `${table}.${payload.orderCol}`;
        sql += ` ORDER BY ${orderColQualified} ${payload.orderAsc ? "ASC" : "DESC"}`;
      }

      if (payload.limitCount) {
        sql += ` LIMIT ${payload.limitCount}`;
      } else if (payload.isSingle || payload.isMaybeSingle) {
        sql += ` LIMIT 1`;
      }

      let results: any[] = [];
      try {
        const stmt = db.prepare(sql);
        const queryRes = await stmt.bind(...params).all();
        results = queryRes.results || [];
      } catch (queryErr: any) {
        if (queryErr.message && (queryErr.message.includes("no such table") || queryErr.message.includes("no such column"))) {
          await ensureReferralSchema(db);
          try {
            await db.prepare("ALTER TABLE tours ADD COLUMN storage_cleared INTEGER DEFAULT 0").run();
          } catch (_) {}
          try {
            await db.prepare("ALTER TABLE tours ADD COLUMN first_published_photo_url TEXT").run();
          } catch (_) {}
          const retryStmt = db.prepare(sql);
          const retryRes = await retryStmt.bind(...params).all();
          results = retryRes.results || [];
        } else {
          throw queryErr;
        }
      }

      if (table === "profiles" && results.length === 0 && user) {
        // Self-heal: Create profile in D1 if missing
        const metadata = user.user_metadata || {};
        let finalUsername = metadata.username;
        if (!finalUsername) {
          const baseUsername = (user.email?.split("@")[0] || "user")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          finalUsername = `${baseUsername}_${user.id.slice(0, 4)}`;
        }

        const defaultProfile = {
          id: user.id,
          email: user.email || "",
          name: metadata.name || user.email?.split("@")[0] || "User",
          username: finalUsername,
          company_name: metadata.company_name || "",
          first_name: metadata.first_name || "",
          last_name: metadata.last_name || "",
          plan: "trial",
          credits: 0,
          onboarding_dismissed: 0,
          dark_mode: 0,
          phone: metadata.phone || "",
          billing_cycle_tours_used: 0,
          created_at: new Date().toISOString(),
        };

        const keys = Object.keys(defaultProfile);
        const values = Object.values(defaultProfile);
        const placeholders = keys.map(() => "?").join(", ");
        
        // Use INSERT OR IGNORE to prevent unique constraint failures from parallel self-heals
        const insertSql = `INSERT OR IGNORE INTO profiles (${keys.join(", ")}) VALUES (${placeholders})`;

        await db.prepare(insertSql).bind(...values).run();

        // Query again to get the inserted profile in correct select field format
        const queryAgain = await db.prepare(sql).bind(...params).all();
        results = queryAgain.results;
      }

      const processedResults = results.map((row: any) => {
        if ("client_name" in row) {
          const { client_name, ...rest } = row;
          return {
            ...rest,
            client: client_name ? { name: client_name } : null,
          };
        }
        return row;
      });

      // Auto-populate TSRHELP promo for referred users if not yet redeemed
      if (table === "profiles") {
        for (const row of processedResults) {
          if ((!row.applied_promo || row.applied_promo === "") && !row.promo_discount_redeemed) {
            const is360 = row.email && row.email.toLowerCase() === "360digitalsstudio@gmail.com";
            let isReferredByTsr = is360;
            if (!isReferredByTsr && row.id) {
              try {
                const attrCheck: any = await db.prepare(`
                  SELECT id FROM referral_attributions
                  WHERE referred_user_id = ?
                    AND (
                      UPPER(attributed_code) = 'TSRHELP'
                      OR referrer_user_id IN (SELECT user_id FROM referral_codes WHERE UPPER(code) = 'TSRHELP')
                      OR referrer_user_id IN (SELECT id FROM profiles WHERE LOWER(email) = 'tsrhelp7@gmail.com' OR LOWER(name) LIKE '%tsr help%')
                    )
                  LIMIT 1
                `).bind(row.id).first();
                if (attrCheck) isReferredByTsr = true;
              } catch (_) {}
            }
            if (isReferredByTsr) {
              row.applied_promo = "TSRHELP";
              db.prepare("UPDATE profiles SET applied_promo = 'TSRHELP' WHERE id = ?")
                .bind(row.id)
                .run()
                .catch(() => {});
            }
          }
        }
      }

      if (payload.isSingle || payload.isMaybeSingle) {
        if (processedResults.length === 0) {
          if (payload.isSingle) {
            return { data: null, count, error: { message: "No rows found" } };
          }
          return { data: null, count, error: null };
        }
        return { data: processedResults[0], count, error: null };
      }

      return { data: processedResults, count, error: null };
    }

    if (action === "upsert") {
      const data = payload.data;
      const rows = Array.isArray(data) ? data : [data];
      const upsertedRows: any[] = [];

      for (const row of rows) {
        const rowCopy = { ...row };
        if (!rowCopy.id) {
          rowCopy.id = crypto.randomUUID();
        }
        const tablesWithUserId = ["clients", "tours", "islands", "photos", "subscriptions", "google_tokens", "constellations"];
        if (tablesWithUserId.includes(table) && !rowCopy.user_id) {
          rowCopy.user_id = userId;
        }

        const cleanedRow: any = {};
        for (const [k, v] of Object.entries(rowCopy)) {
          if (v !== undefined) {
            cleanedRow[k] = v;
          }
        }

        let exists = false;
        if (cleanedRow.id) {
          const checkSql = `SELECT 1 FROM ${table} WHERE id = ?`;
          const existingRow = await db.prepare(checkSql).bind(cleanedRow.id).first();
          if (existingRow) {
            exists = true;
          }
        }

        if (exists) {
          const dataToUpdate = { ...cleanedRow };
          delete dataToUpdate.id;
          delete dataToUpdate.user_id;

          const cleanedData: any = {};
          for (const [k, v] of Object.entries(dataToUpdate)) {
            if (v !== undefined) {
              cleanedData[k] = v;
            }
          }

          const keys = Object.keys(cleanedData);
          const values = Object.values(cleanedData);
          const setClause = keys.map((k) => `${k} = ?`).join(", ");

          let updateSql = `UPDATE ${table} SET ${setClause}`;
          const updateParams = [...values];

          const isAdmin = checkIsAdmin(user);
          if (isAdmin) {
            updateSql += ` WHERE id = ?`;
            updateParams.push(cleanedRow.id);
          } else {
            if (table === "profiles") {
              updateSql += ` WHERE id = ?`;
              updateParams.push(cleanedRow.id);
            } else {
              updateSql += ` WHERE id = ? AND user_id = ?`;
              updateParams.push(cleanedRow.id, userId);
            }
          }

          await db.prepare(updateSql).bind(...updateParams).run();
        } else {
          const keys = Object.keys(cleanedRow);
          const values = Object.values(cleanedRow);
          const placeholders = keys.map(() => "?").join(", ");

          const insertSql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
          await db.prepare(insertSql).bind(...values).run();
        }
        upsertedRows.push(cleanedRow);
      }

      const returnData = Array.isArray(data) ? upsertedRows : upsertedRows[0];
      return { data: returnData, error: null };
    }

    if (action === "insert") {
      const data = payload.data;
      const rows = Array.isArray(data) ? data : [data];
      const insertedRows: any[] = [];

      for (const row of rows) {
        // Copy the row to avoid mutating frozen/read-only input objects
        const rowCopy = { ...row };
        if (!rowCopy.id) {
          rowCopy.id = crypto.randomUUID();
        }
        // Only inject user_id for tables that have that column
        const tablesWithUserId = ["clients", "tours", "islands", "photos", "subscriptions", "google_tokens", "constellations"];
        if (tablesWithUserId.includes(table)) {
          rowCopy.user_id = userId;
        }

        // Clean up undefined properties to avoid D1 binding errors
        const cleanedRow: any = {};
        for (const [k, v] of Object.entries(rowCopy)) {
          if (v !== undefined) {
            cleanedRow[k] = v;
          }
        }

        const keys = Object.keys(cleanedRow);
        const values = Object.values(cleanedRow);
        const placeholders = keys.map(() => "?").join(", ");

        sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
        try {
          await db
            .prepare(sql)
            .bind(...values)
            .run();
        } catch (insertErr: any) {
          if (insertErr?.message?.includes("no such table")) {
            await ensureReferralSchema(db);
            await db.prepare(sql).bind(...values).run();
          } else if (insertErr?.message?.includes("no column named")) {
            // Attempt auto-migration and fallback by removing non-existent columns
            if (table === "photos") {
              await db.prepare("ALTER TABLE photos ADD COLUMN thumbnail_url TEXT").run().catch(() => {});
              await db.prepare("ALTER TABLE photos ADD COLUMN thumbnail_path TEXT").run().catch(() => {});
            }
            // Retry once after migration
            try {
              await db.prepare(sql).bind(...values).run();
            } catch {
              // Strip thumbnail fields and retry as last resort to never break upload
              delete cleanedRow.thumbnail_url;
              delete cleanedRow.thumbnail_path;
              const fallbackKeys = Object.keys(cleanedRow);
              const fallbackValues = Object.values(cleanedRow);
              const fallbackPlaceholders = fallbackKeys.map(() => "?").join(", ");
              const fallbackSql = `INSERT INTO ${table} (${fallbackKeys.join(", ")}) VALUES (${fallbackPlaceholders})`;
              await db.prepare(fallbackSql).bind(...fallbackValues).run();
            }
          } else {
            throw insertErr;
          }
        }
        insertedRows.push(cleanedRow);
      }

      const returnData = Array.isArray(data) ? insertedRows : insertedRows[0];
      return { data: returnData, error: null };
    }

    if (action === "update") {
      const data = { ...payload.data };
      delete data.id;
      delete data.user_id;

      // Clean up undefined properties to avoid D1 binding errors
      const cleanedData: any = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) {
          cleanedData[k] = v;
        }
      }

      const keys = Object.keys(cleanedData);
      const values = Object.values(cleanedData);
      const setClause = keys.map((k) => `${k} = ?`).join(", ");

      sql = `UPDATE ${table} SET ${setClause}`;
      params.push(...values);
      sql += buildWhereClause();

      await db
        .prepare(sql)
        .bind(...params)
        .run();

      return { data: cleanedData, error: null };
    }

    if (action === "delete") {
      sql = `DELETE FROM ${table}`;
      sql += buildWhereClause();

      await db
        .prepare(sql)
        .bind(...params)
        .run();

      return { data: null, error: null };
    }

    return { data: null, error: { message: `Unknown action: ${action}` } };
  } catch (err: any) {
    console.error("D1 Server Function error:", err);
    return { data: null, error: { message: err.message || "Unknown database error" } };
  }
});

export const adminAddUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token, email, password, name, companyName, plan } = ctx.data;

      // 1. Verify caller is admin
      const caller = await getUserFromToken(token);
      if (!checkIsAdmin(caller)) {
        throw new Error("Access denied. Admin access only.");
      }

      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      // Check if user already exists
      const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) {
        return { error: { message: "User already exists with this email" } };
      }

      const id = crypto.randomUUID();
      const salt = crypto.randomUUID();
      const password_hash = await hashPassword(password, salt);

      // Insert into users
      await db.prepare("INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)")
        .bind(id, email, password_hash, salt)
        .run();

      // Insert profile
      const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const username = `${baseUsername}_${id.slice(0, 4)}`;
      const displayName = name || email.split("@")[0];

      await db.prepare(`
        INSERT INTO profiles (id, email, name, username, company_name, plan, trial_ends_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        email,
        displayName,
        username,
        companyName || "",
        plan || "trial",
        (plan && plan !== "trial") ? new Date(Date.now() + 30 * 86400000).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString()
      ).run();

      return { data: { success: true, id }, error: null };
    } catch (err: any) {
      console.error("adminAddUser error:", err);
      return { error: { message: err.message || "Failed to add user" } };
    }
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token, userId } = ctx.data;

      // 1. Verify caller is admin
      const caller = await getUserFromToken(token);
      if (!checkIsAdmin(caller)) {
        throw new Error("Access denied. Admin access only.");
      }

      if (userId === caller.id) {
        throw new Error("Cannot delete your own admin account.");
      }

      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      // Cascade delete user and all their records from related tables
      const queries = [
        db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
        db.prepare("DELETE FROM profiles WHERE id = ?").bind(userId),
        db.prepare("DELETE FROM clients WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM tours WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM islands WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM photos WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM subscriptions WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM google_tokens WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM constellations WHERE user_id = ?").bind(userId),
      ];

      await db.batch(queries);

      return { data: { success: true }, error: null };
    } catch (err: any) {
      console.error("adminDeleteUser error:", err);
      return { error: { message: err.message || "Failed to delete user" } };
    }
  });

export const adminImpersonateUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token, targetUserId } = ctx.data;

      // 1. Verify caller is admin
      const caller = await getUserFromToken(token);
      if (!checkIsAdmin(caller)) {
        throw new Error("Access denied. Admin access only.");
      }

      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      // 2. Fetch target user from users table or fallback to profiles table
      let targetUser: any = await db
        .prepare("SELECT id, email FROM users WHERE id = ?")
        .bind(targetUserId)
        .first();

      if (!targetUser) {
        const targetProfile: any = await db
          .prepare("SELECT id, email, username FROM profiles WHERE id = ?")
          .bind(targetUserId)
          .first();

        if (targetProfile) {
          targetUser = {
            id: targetProfile.id,
            email: targetProfile.email || `${targetProfile.username || "user"}@panopublish.com`,
          };
        }
      }

      if (!targetUser) {
        return { error: { message: "Target user account not found" } };
      }

      // 3. Issue JWT token for the target user (30 days validity)
      const jwtSecret = getEnv("JWT_SECRET") || "secret";
      const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
      const accessToken = await signJWT(
        { sub: targetUser.id, email: targetUser.email, exp },
        jwtSecret
      );

      return {
        data: {
          session: {
            access_token: accessToken,
            expires_at: exp,
            user: {
              id: targetUser.id,
              email: targetUser.email,
            },
          },
        },
        error: null,
      };
    } catch (err: any) {
      console.error("adminImpersonateUser error:", err);
      return { error: { message: err.message || "Failed to impersonate user" } };
    }
  });

export const adminCleanOrphanedStorage = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token } = ctx.data;

      // 1. Verify caller is admin
      const caller = await getUserFromToken(token);
      if (!checkIsAdmin(caller)) {
        throw new Error("Access denied. Admin access only.");
      }

      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const bucket = getBinding("BUCKET");
      if (!bucket) throw new Error("Cloudflare R2 Bucket binding missing");

      // 2. Fetch all active tour IDs, photo file paths, and active user IDs
      const toursRes: any = await db.prepare("SELECT id, user_id FROM tours").all();
      const activeTourIds = new Set((toursRes?.results || []).map((t: any) => t.id));
      const tourUserIds = (toursRes?.results || []).map((t: any) => t.user_id);

      const profilesRes: any = await db.prepare("SELECT id FROM profiles").all();
      const usersRes: any = await db.prepare("SELECT id FROM users").all();
      const photosRes: any = await db.prepare("SELECT file_path FROM photos").all();

      const activeUserIds = new Set([
        ...(profilesRes?.results || []).map((p: any) => p.id),
        ...(usersRes?.results || []).map((u: any) => u.id),
        ...tourUserIds,
      ]);

      const activePhotoPaths = new Set(
        (photosRes?.results || []).map((p: any) => p.file_path).filter(Boolean)
      );

      let scannedCount = 0;
      let deletedCount = 0;
      let deletedBytes = 0;
      let truncated = true;
      let cursor: string | undefined = undefined;

      while (truncated) {
        const list: any = await bucket.list({ cursor });
        const objects = list?.objects || [];
        scannedCount += objects.length;

        const toDelete: string[] = [];
        for (const obj of objects) {
          const key: string = obj.key;
          const parts = key.split("/");

          // Format is typically: userId/tourId/...
          if (parts.length >= 2) {
            const userId = parts[0];
            const tourId = parts[1];

            // Never delete if the tour exists in DB or the photo path exists in DB
            if (activeTourIds.has(tourId) || activePhotoPaths.has(key)) {
              continue; // Safe!
            }

            // Only delete if the tour does not exist in active tours AND user doesn't exist
            if (!activeTourIds.has(tourId) || !activeUserIds.has(userId)) {
              toDelete.push(key);
              deletedBytes += obj.size || 0;
            }
          }
        }

        if (toDelete.length > 0) {
          await Promise.all(toDelete.map((k: string) => bucket.delete(k)));
          deletedCount += toDelete.length;
        }

        truncated = list?.truncated ?? false;
        cursor = list?.cursor;
      }

      return {
        data: {
          success: true,
          scannedCount,
          deletedCount,
          deletedBytes,
          deletedMb: (deletedBytes / (1024 * 1024)).toFixed(2),
        },
        error: null,
      };
    } catch (err: any) {
      console.error("adminCleanOrphanedStorage error:", err);
      return { error: { message: err.message || "Failed to clean orphaned storage" } };
    }
  });

export const adminPurgeUserTourStorage = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token, targetUserId } = ctx.data;

      // 1. Verify caller is admin
      const caller = await getUserFromToken(token);
      if (!checkIsAdmin(caller)) {
        throw new Error("Access denied. Admin access only.");
      }

      if (!targetUserId) {
        throw new Error("Target user ID is required");
      }

      const db = getBinding("DB");
      if (!db) throw new Error("Database binding missing");

      const bucket = getBinding("BUCKET");
      if (!bucket) throw new Error("Cloudflare R2 Bucket binding missing");

      // 2. Clear all R2 image objects for this user
      // All user assets are uploaded under prefix: `${targetUserId}/`
      let deletedFilesCount = 0;
      let deletedBytes = 0;
      let truncated = true;
      let cursor: string | undefined = undefined;

      while (truncated) {
        const list: any = await bucket.list({ prefix: `${targetUserId}/`, cursor });
        const objects = list?.objects || [];
        if (objects.length > 0) {
          await Promise.all(
            objects.map((obj: any) => {
              deletedBytes += obj.size || 0;
              return bucket.delete(obj.key);
            })
          );
          deletedFilesCount += objects.length;
        }
        truncated = list?.truncated ?? false;
        cursor = list?.cursor;
      }

      // 3. Capture the first published photo URL for each tour before removing photos
      const photosRes: any = await db
        .prepare(
          "SELECT tour_id, streetview_share_link, streetview_photo_id, streetview_status, order_index, uploaded_at FROM photos WHERE user_id = ? ORDER BY order_index ASC, uploaded_at ASC"
        )
        .bind(targetUserId)
        .all();

      const tourPhotoMap = new Map<string, string>();
      for (const p of photosRes?.results || []) {
        if (!tourPhotoMap.has(p.tour_id)) {
          const link =
            p.streetview_share_link ||
            (p.streetview_photo_id
              ? `https://www.google.com/maps/@?api=1&map_action=pano&pano=${p.streetview_photo_id}`
              : null);
          if (link) {
            tourPhotoMap.set(p.tour_id, link);
          }
        }
      }

      // 4. Mark all tours for this user as storage_cleared = 1 and store first_published_photo_url (preserve status and client_id)
      const userTours: any = await db
        .prepare("SELECT id FROM tours WHERE user_id = ?")
        .bind(targetUserId)
        .all();

      let toursUpdated = 0;
      for (const t of userTours?.results || []) {
        const firstPhotoUrl = tourPhotoMap.get(t.id) || null;
        if (firstPhotoUrl) {
          await db
            .prepare(
              "UPDATE tours SET storage_cleared = 1, first_published_photo_url = ? WHERE id = ?"
            )
            .bind(firstPhotoUrl, t.id)
            .run();
        } else {
          await db
            .prepare("UPDATE tours SET storage_cleared = 1 WHERE id = ?")
            .bind(t.id)
            .run();
        }
        toursUpdated++;
      }

      // 5. Remove all connections for this user's tours
      await db
        .prepare("DELETE FROM connections WHERE tour_id IN (SELECT id FROM tours WHERE user_id = ?)")
        .bind(targetUserId)
        .run();

      // 6. Delete all photo rows for this user from the photos table to reclaim database space
      const deletePhotosRes: any = await db
        .prepare("DELETE FROM photos WHERE user_id = ?")
        .bind(targetUserId)
        .run();

      return {
        data: {
          success: true,
          deletedFilesCount,
          deletedBytes,
          deletedMb: (deletedBytes / (1024 * 1024)).toFixed(2),
          toursUpdated,
        },
        error: null,
      };
    } catch (err: any) {
      console.error("adminPurgeUserTourStorage error:", err);
      return { error: { message: err.message || "Failed to purge user storage" } };
    }
  });

export const adminSendMarketingEmail = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const {
        token,
        recipients, // Array<{ email: string; name?: string }>
        subject,
        headline,
        bodyText,
        ctaText,
        ctaUrl,
        fromName,
        fromEmail,
        isColdOutreach,
      } = ctx.data;

      // 1. Verify caller is admin
      const caller = await getUserFromToken(token);
      if (!checkIsAdmin(caller)) {
        throw new Error("Access denied. Admin access only.");
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new Error("No recipients specified");
      }

      if (!subject || !subject.trim()) {
        throw new Error("Subject line is required");
      }

      const resendKey = getEnv("RESEND_API_KEY");
      if (!resendKey) {
        throw new Error("RESEND_API_KEY is not configured on the server");
      }

      const senderDisplayName = (fromName || "PanoPublish").trim();
      const senderAddress = (fromEmail || "noreply@panopublish.com").trim();
      const fromHeader = `${senderDisplayName} <${senderAddress}>`;

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let totalSent = 0;
      let totalFailed = 0;
      const failedEmails: { email: string; reason: string }[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const item = recipients[i];
        const email = (item?.email || "").trim().toLowerCase();
        const rawName = (item?.name || "").trim();
        // If business/client name like "Grand Palace Hotel", retain full name; if person name, use first name
        const isLikelyBusiness = rawName && /(hotel|resort|hospital|clinic|showroom|store|restaurant|cafe|studio|properties|realty|academy|school|college|motors|infra|villas)/i.test(rawName);
        const firstName = !isLikelyBusiness && rawName.includes(" ") ? rawName.split(" ")[0] : rawName;
        const displayName = firstName || "there";

        if (!email || !email.includes("@")) {
          totalFailed++;
          failedEmails.push({ email: email || "(empty)", reason: "Invalid email" });
          continue;
        }

        // Interpolate variables
        const personalSubject = subject
          .replace(/\{\{name\}\}/gi, displayName)
          .replace(/\{\{email\}\}/gi, email);

        const personalHeadline = parseInlineMarkdown(
          (headline || "")
            .replace(/\{\{name\}\}/gi, displayName)
            .replace(/\{\{email\}\}/gi, email)
        );

        // Convert body text markdown / plain text to styled email HTML
        const formattedBody = formatEmailMarkdownToHtml(
          (bodyText || "")
            .replace(/\{\{name\}\}/gi, displayName)
            .replace(/\{\{email\}\}/gi, email)
        );

        const ctaButtonHtml = ctaText && ctaUrl
          ? `
            <div style="margin: 28px 0; text-align: center;">
              <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0277bd; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(2, 119, 189, 0.25);">
                ${ctaText}
              </a>
            </div>
          `
          : "";

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${personalSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                      Pano<span style="color: #38bdf8;">Publish</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Virtual Tours for Google Street View
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              ${personalHeadline ? `<h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">${personalHeadline}</h1>` : ""}
              
              <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                ${formattedBody}
              </div>

              ${ctaButtonHtml}

              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">
                Best regards,<br>
                <strong style="color: #0f172a;">The PanoPublish Team</strong><br>
                <a href="https://panopublish.com" style="color: #0277bd; text-decoration: none; font-weight: 600;">panopublish.com</a>
              </div>
            </td>
          </tr>

          <!-- Footer with Unsubscribe notice -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.6; text-align: center;">
              ${
                isColdOutreach
                  ? `<p style="margin: 0 0 8px 0;">
                      You received this email regarding Google Street View & 360° virtual tour solutions for your business.
                    </p>
                    <p style="margin: 0;">
                      Questions or inquiries? Reply directly to this email or visit <a href="https://panopublish.com" style="color: #0277bd; text-decoration: underline;">panopublish.com</a> &bull; 
                      To opt out, reply with "Unsubscribe".
                    </p>`
                  : `<p style="margin: 0 0 8px 0;">
                      You received this update because you are a registered user of PanoPublish.
                    </p>
                    <p style="margin: 0;">
                      Need help? Contact us at <a href="mailto:support@panopublish.com" style="color: #64748b; text-decoration: underline;">support@panopublish.com</a> &bull; 
                      To unsubscribe from updates, reply to this email with "Unsubscribe".
                    </p>`
              }
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim();

        // Throttle 500ms between calls to respect Resend's 2 req/sec rate limit
        if (i > 0) {
          await sleep(500);
        }

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromHeader,
              to: [email],
              subject: personalSubject,
              html: emailHtml,
            }),
          });

          if (res.ok || res.status === 200 || res.status === 201) {
            totalSent++;
          } else {
            const errText = await res.text();
            console.error(`[BROADCAST EMAIL] Failed for ${email}: ${res.status} ${errText}`);
            totalFailed++;
            failedEmails.push({ email, reason: `${res.status}: ${errText.slice(0, 100)}` });
          }
        } catch (err: any) {
          console.error(`[BROADCAST EMAIL] Exception for ${email}:`, err);
          totalFailed++;
          failedEmails.push({ email, reason: err.message || "Network error" });
        }
      }

      return {
        data: {
          success: true,
          totalSent,
          totalFailed,
          failedEmails,
        },
        error: null,
      };
    } catch (err: any) {
      console.error("adminSendMarketingEmail error:", err);
      return { error: { message: err.message || "Failed to send marketing emails" } };
    }
  });

export const recordHeartbeat = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string; path?: string; device?: string }) => data)
  .handler(async ({ data }: any) => {
    try {
      const token = data?.token;
      if (!token) return { success: false, error: "No token" };

      const user = await getUserFromToken(token);
      if (!user?.id) return { success: false, error: "Invalid user" };

      const db = getBinding("DB");
      if (!db) return { success: false, error: "DB binding missing" };

      if (!schemaEnsured) {
        await ensureSchema(db);
      }

      const path = typeof data?.path === "string" ? data.path.slice(0, 200) : "";
      const device = typeof data?.device === "string" ? data.device.slice(0, 50) : "";

      await db
        .prepare(
          `UPDATE profiles 
           SET last_seen_at = datetime('now'),
               last_active_path = ?,
               last_active_device = ?
           WHERE id = ?`
        )
        .bind(path, device, user.id)
        .run();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

export const adminEnsureReferralTables = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const { token } = ctx.data || {};
      const user = await getUserFromToken(token);
      if (!checkIsAdmin(user)) {
        throw new Error("Unauthorized: Admin privileges required");
      }
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding DB is missing");
      await ensureReferralSchema(db);

      // Auto-heal: Ensure Vinod Bharti is linked to TSR HELP if not yet attributed
      try {
        const tsrProfile: any = await db.prepare(
          "SELECT id, email, name FROM profiles WHERE LOWER(email) = 'tsrhelp7@gmail.com' OR LOWER(name) LIKE '%tsr help%' LIMIT 1"
        ).first();

        const vinodProfile: any = await db.prepare(
          "SELECT id, email, name FROM profiles WHERE LOWER(email) = 'bhartiv418@gmail.com' OR LOWER(name) LIKE '%vinod%bharti%' LIMIT 1"
        ).first();

        if (tsrProfile && vinodProfile) {
          const tsrCodeRow: any = await db.prepare(
            "SELECT id, code FROM referral_codes WHERE user_id = ? LIMIT 1"
          ).bind(tsrProfile.id).first();

          const existingAttr: any = await db.prepare(
            "SELECT id FROM referral_attributions WHERE referred_user_id = ? LIMIT 1"
          ).bind(vinodProfile.id).first();

          if (!existingAttr) {
            const codeToUse = tsrCodeRow?.code || "TSRHELP";
            await db.prepare(`
              INSERT INTO referral_attributions (id, referred_user_id, referrer_user_id, referral_code_id, attributed_code, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              crypto.randomUUID(),
              vinodProfile.id,
              tsrProfile.id,
              tsrCodeRow?.id || null,
              codeToUse
            ).run();
            console.log(`[REFERRAL AUTO-HEAL] Linked Vinod Bharti (${vinodProfile.email}) to TSR HELP (${tsrProfile.email}) code=${codeToUse}`);
          }
        }
      } catch (autoErr) {
        console.warn("[REFERRAL AUTO-HEAL] Warning:", autoErr);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

export const adminSetUserReferrer = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string; referredUserId: string; referrerCodeOrUserId: string }) => data)
  .handler(async ({ data }: any) => {
    try {
      const { token, referredUserId, referrerCodeOrUserId } = data || {};
      const adminUser = await getUserFromToken(token);
      if (!checkIsAdmin(adminUser)) {
        throw new Error("Unauthorized: Admin privileges required");
      }
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding DB is missing");
      await ensureReferralSchema(db);

      if (!referredUserId || !referrerCodeOrUserId) {
        throw new Error("Both referred user and referrer code are required");
      }

      // Find target referred user
      const targetUser: any = await db.prepare(
        "SELECT id, email, name FROM profiles WHERE id = ? OR LOWER(email) = ? LIMIT 1"
      ).bind(referredUserId, referredUserId.toLowerCase()).first();

      if (!targetUser) throw new Error("Referred user not found");

      // Find referrer by code, user_id, or email
      const cleanRefInput = referrerCodeOrUserId.trim().toUpperCase().replace(/[\s\-_]/g, "");

      let refCodeRow: any = await db.prepare(`
        SELECT id, user_id, code, commission_percent
        FROM referral_codes
        WHERE (
          UPPER(code) = ?
          OR REPLACE(REPLACE(REPLACE(UPPER(code), ' ', ''), '-', ''), '_', '') = ?
          OR user_id = ?
        )
        LIMIT 1
      `).bind(referrerCodeOrUserId.trim().toUpperCase(), cleanRefInput, referrerCodeOrUserId).first();

      let referrerUserId = refCodeRow?.user_id;
      let attributedCode = refCodeRow?.code || cleanRefInput;
      let referralCodeId = refCodeRow?.id || null;

      if (!referrerUserId) {
        // Try finding partner profile directly
        const partnerProf: any = await db.prepare(`
          SELECT id, email, name, referral_code
          FROM profiles
          WHERE id = ? OR LOWER(email) = ? OR UPPER(referral_code) = ?
          LIMIT 1
        `).bind(referrerCodeOrUserId, referrerCodeOrUserId.toLowerCase(), cleanRefInput).first();

        if (partnerProf) {
          referrerUserId = partnerProf.id;
          attributedCode = partnerProf.referral_code || cleanRefInput;
          const pCode: any = await db.prepare(
            "SELECT id, code FROM referral_codes WHERE user_id = ? LIMIT 1"
          ).bind(referrerUserId).first();
          if (pCode) {
            referralCodeId = pCode.id;
            attributedCode = pCode.code;
          }
        }
      }

      if (!referrerUserId) {
        throw new Error(`Referral partner not found for "${referrerCodeOrUserId}"`);
      }

      if (referrerUserId === targetUser.id) {
        throw new Error("A user cannot refer themselves");
      }

      // Upsert attribution record
      const existing: any = await db.prepare(
        "SELECT id FROM referral_attributions WHERE referred_user_id = ? LIMIT 1"
      ).bind(targetUser.id).first();

      if (existing) {
        await db.prepare(`
          UPDATE referral_attributions
          SET referrer_user_id = ?, referral_code_id = ?, attributed_code = ?
          WHERE id = ?
        `).bind(referrerUserId, referralCodeId, attributedCode, existing.id).run();
      } else {
        await db.prepare(`
          INSERT INTO referral_attributions (id, referred_user_id, referrer_user_id, referral_code_id, attributed_code, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).bind(crypto.randomUUID(), targetUser.id, referrerUserId, referralCodeId, attributedCode).run();
      }

      if (attributedCode.toUpperCase() === "TSRHELP") {
        try {
          await db.prepare(`
            UPDATE profiles SET applied_promo = 'TSRHELP'
            WHERE id = ? AND (promo_discount_redeemed = 0 OR promo_discount_redeemed IS NULL)
          `).bind(targetUser.id).run();
        } catch (_) {}
      }

      return {
        data: {
          success: true,
          referredUserId: targetUser.id,
          referrerUserId,
          attributedCode,
        },
        error: null,
      };
    } catch (err: any) {
      console.error("adminSetUserReferrer error:", err);
      return { error: { message: err.message || "Failed to set referrer" } };
    }
  });

export const adminRemoveUserReferrer = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string; referredUserId: string }) => data)
  .handler(async ({ data }: any) => {
    try {
      const { token, referredUserId } = data || {};
      const adminUser = await getUserFromToken(token);
      if (!checkIsAdmin(adminUser)) {
        throw new Error("Unauthorized: Admin privileges required");
      }
      const db = getBinding("DB");
      if (!db) throw new Error("Database binding DB is missing");
      await db.prepare("DELETE FROM referral_attributions WHERE referred_user_id = ?").bind(referredUserId).run();
      return { data: { success: true }, error: null };
    } catch (err: any) {
      return { error: { message: err.message || "Failed to remove referrer" } };
    }
  });



