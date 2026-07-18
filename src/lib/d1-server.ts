import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnv, getBinding } from "./env";

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
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

const ADMIN_EMAILS = ["panopublish.com@gmail.com", "panopublish@gmail.com", "vista360gtp@gmail.com"];

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
    console.log("[D1 SERVER] Returning cached user for token");
    return cached.user;
  }

  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key not set on server");
  }
  
  const claims = decodeJWT(token);
  console.log("[D1 SERVER] Decoded JWT Claims:", claims);
  console.log("[D1 SERVER] Current Supabase URL:", supabaseUrl);

  const url = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;
  console.log("[D1 SERVER] Direct fetch request to URL:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${token}`,
    },
  });

  console.log("[D1 SERVER] Direct fetch status:", res.status);
  const text = await res.text();
  console.log("[D1 SERVER] Direct fetch response:", text);

  if (!res.ok) {
    throw new Error("Invalid session token: " + (text || res.statusText));
  }

  const user = JSON.parse(text);
  
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
  .handler(async (ctx: any) => {
    try {
      const input = ctx.data;
      const payload = input?.data || input;
      console.log("[D1 SERVER] received token in payload:", payload?.token ? `${payload.token.substring(0, 15)}...` : "UNDEFINED/EMPTY");
      
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

      if (!isPublicQuery || (payload.token && payload.token !== "EMPTY")) {
        user = await getUserFromToken(payload.token);
        userId = user.id;
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
        console.log(`D1 COUNT SQL: ${countSql} with params:`, params);
        const countRes = await db
          .prepare(countSql)
          .bind(...params)
          .first();
        count = countRes ? (countRes as any).total : 0;
      }

      if (payload.headOption) {
        return { data: null, count, error: null };
      }

      const selects = payload.selects || "*";
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

      console.log(`D1 SELECT SQL: ${sql} with params:`, params);
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

        console.log(`D1 profiles Self-Heal SQL: ${insertSql} with params:`, values);
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
        if (table !== "profiles" && table !== "coupons") {
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
        console.log(`D1 INSERT SQL: ${sql} with params:`, values);

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

      console.log(`D1 UPDATE SQL: ${sql} with params:`, params);
      await db
        .prepare(sql)
        .bind(...params)
        .run();

      return { data: cleanedData, error: null };
    }

    if (action === "delete") {
      sql = `DELETE FROM ${table}`;
      sql += buildWhereClause();

      console.log(`D1 DELETE SQL: ${sql} with params:`, params);
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
