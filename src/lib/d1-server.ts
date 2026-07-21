import { createServerFn } from "@tanstack/react-start";
import { getEnv, getBinding } from "./env";
import { verifyJWT, hashPassword } from "./auth-server";

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

      const isPublicQuery = isUsernameCheck || isPublicCouponCheck;

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

    const { table, action } = payload;

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
        } else if (table === "coupons") {
          // coupons is public read
        } else if (table === "connections" || table === "users") {
          // connections are scoped via tour_id (no user_id column)
          // users table is for auth only, no user_id column
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
        const countRes = await db
          .prepare(countSql)
          .bind(...params)
          .first();
        count = countRes ? (countRes as any).total : 0;
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

      const stmt = db.prepare(sql);
      let { results } = await stmt.bind(...params).all();

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
        await db
          .prepare(sql)
          .bind(...values)
          .run();
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
        new Date(Date.now() + 14 * 86400000).toISOString()
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
