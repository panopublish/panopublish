import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnv, getBinding } from "./env";

async function getUserFromToken(token: string) {
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key not set on server");
  }
  const client = createClient(supabaseUrl, supabaseKey);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) {
    throw new Error("Invalid session token: " + (error?.message || "User not found"));
  }
  return user;
}

export const runD1Query = createServerFn("POST", async (arg: any) => {
  try {
    const payload = arg?.data || arg;
    const user = await getUserFromToken(payload.token);
    const userId = user.id;
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

      // Ensure user can only access their own data (Row-Level Security)
      if (table === "profiles") {
        clauses.push("id = ?");
        params.push(userId);
      } else if (table === "coupons") {
        // coupons is public read
      } else {
        clauses.push("user_id = ?");
        params.push(userId);
      }

      if (payload.filters && payload.filters.length > 0) {
        for (const f of payload.filters) {
          if (f.type === "eq") {
            clauses.push(`${f.column} = ?`);
            params.push(f.value);
          } else if (f.type === "neq") {
            clauses.push(`${f.column} != ?`);
            params.push(f.value);
          } else if (f.type === "in") {
            if (Array.isArray(f.value) && f.value.length > 0) {
              const placeholders = f.value.map(() => "?").join(", ");
              clauses.push(`${f.column} IN (${placeholders})`);
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
                subClauses.push(`${match[1]} = ?`);
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

      // clean up other nested fields
      selectFields = selectFields
        .split(",")
        .map((f) => f.trim())
        .filter((f) => !f.includes(":"))
        .join(", ");
      if (!selectFields) selectFields = "*";

      sql = `SELECT ${selectFields} FROM ${table}${joinClause}${whereSql}`;

      if (payload.orderCol) {
        sql += ` ORDER BY ${payload.orderCol} ${payload.orderAsc ? "ASC" : "DESC"}`;
      }

      if (payload.limitCount) {
        sql += ` LIMIT ${payload.limitCount}`;
      } else if (payload.isSingle || payload.isMaybeSingle) {
        sql += ` LIMIT 1`;
      }

      console.log(`D1 SELECT SQL: ${sql} with params:`, params);
      const stmt = db.prepare(sql);
      let { results } = await stmt.bind(...params).all();

      if (table === "profiles" && results.length === 0) {
        // Self-heal: Create profile in D1 if missing
        const metadata = user.user_metadata || {};
        const baseUsername = (metadata.username || user.email?.split("@")[0] || "user")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const finalUsername = `${baseUsername}_${user.id.slice(0, 4)}`;

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
        const insertSql = `INSERT INTO profiles (${keys.join(", ")}) VALUES (${placeholders})`;

        console.log(`D1 profiles Self-Heal SQL: ${insertSql} with params:`, values);
        await db.prepare(insertSql).bind(...values).run();

        // Query again to get the inserted profile in correct select field format
        const queryAgain = await stmt.bind(...params).all();
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
        if (!row.id) {
          row.id = crypto.randomUUID();
        }
        if (table !== "profiles" && table !== "coupons") {
          row.user_id = userId;
        }

        // Clean up undefined properties to avoid D1 binding errors
        const cleanedRow: any = {};
        for (const [k, v] of Object.entries(row)) {
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
