// Custom PanoPublish Client Proxy (Cloudflare D1 & R2 Backend Bridge)
import { getEnv } from "@/lib/env";
import { runD1Query } from "@/lib/d1-server";
import { handleGoogleOauthServerFn, handleStreetViewPublishServerFn } from "@/lib/functions-server";

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

async function getOrRefreshSession() {
  if (typeof window === "undefined") return null;
  const sessionStr = localStorage.getItem("panopublish_session");
  if (!sessionStr) return null;
  try {
    const session = JSON.parse(sessionStr);
    if (session && session.access_token) {
      const claims = decodeJWT(session.access_token);
      if (claims && claims.exp) {
        if (claims.exp - Date.now() / 1000 > 30) {
          return session;
        }
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}


// Interceptor for supabase.from() database operations redirected to D1 SQLite database
class D1QueryBuilder {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" = "select";
  private selects: string = "*";
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private orderCol?: string;
  private orderAsc: boolean = true;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private limitCount?: number;
  private dataToSave?: any;
  private countOption?: "exact" | "planned" | "estimated";
  private headOption: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(
    fields: string = "*",
    options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ) {
    this.selects = fields;
    if (options?.count) this.countOption = options.count;
    if (options?.head) this.headOption = !!options.head;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: "neq", column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: "in", column, value: values });
    return this;
  }

  or(filterStr: string) {
    this.filters.push({ type: "or", column: "", value: filterStr });
    return this;
  }

  order(column: string, options?: { ascending: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  insert(data: any) {
    this.action = "insert";
    this.dataToSave = data;
    return this;
  }

  update(data: any) {
    this.action = "update";
    this.dataToSave = data;
    return this;
  }

  upsert(data: any) {
    this.action = "upsert";
    this.dataToSave = data;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (value: any) => any) {
    try {
      const res = await this.execute();
      return onfulfilled ? onfulfilled(res) : res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  async execute() {
    const session = await getOrRefreshSession();
    console.log("[Supabase Proxy] Client-side final session:", session);
    
    const token = session?.access_token || "";
    console.log("[Supabase Proxy] Client-side final session token:", token ? `${token.substring(0, 10)}...` : "EMPTY");

    // If auth is required but token is empty, auto-logout
    if (!token) {
      // Determine if this query is a public query (replicate same check as server)
      const isUsernameCheck = 
        this.table === "profiles" && 
        this.action === "select" && 
        this.filters?.length === 1 && 
        this.filters[0].column === "username" && 
        this.filters[0].type === "eq" &&
        (this.selects === "id" || this.selects === "username" || this.selects === "id,username");

      const isPublicCouponCheck =
        this.table === "coupons" &&
        this.action === "select";

      const isPublicQuery = isUsernameCheck || isPublicCouponCheck;

      if (!isPublicQuery) {
        console.warn("[Supabase Proxy] Authentication required but no session token found. Redirecting to login...");
        if (typeof window !== "undefined") {
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("sb-") || key.includes("supabase")) {
              localStorage.removeItem(key);
            }
          }
          window.location.href = "/login";
        }
        return { data: null, error: { message: "Authentication required" } };
      }
    }

    const payload = {
      token,
      action: this.action,
      table: this.table,
      selects: this.selects,
      filters: this.filters,
      orderCol: this.orderCol,
      orderAsc: this.orderAsc,
      isSingle: this.isSingle,
      isMaybeSingle: this.isMaybeSingle,
      limitCount: this.limitCount,
      countOption: this.countOption,
      headOption: this.headOption,
      data: this.dataToSave,
    };

    // Wrap argument inside { data: ... } for TanStack Start's client RPC routing
    const res = await runD1Query({ data: payload });
    console.log("runD1Query response on client:", res);

    // Auto-logout ONLY for explicit auth revocation errors, not transient token failures
    if (res?.error && (
      res.error.message.includes("User from sub claim") ||
      res.error.message.includes("user_not_found")
    )) {
      console.warn("[Supabase Proxy] Session revoked on server, clearing session and logging out...");
      if (typeof window !== "undefined") {
        localStorage.removeItem("panopublish_session");
        window.location.href = "/login";
      }
    }

    return res;
  }
}

// Mock Storage client referencing R2 Upload/Download Worker Endpoints
const customStorage = {
  from(bucketName: string) {
    return {
      async upload(path: string, file: Blob | File, options?: any) {
        try {
          const url = `/api/upload?path=${encodeURIComponent(path)}`;
          const response = await fetch(url, {
            method: "POST",
            body: file,
          });
          if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
          }
          return { data: { path }, error: null };
        } catch (err: any) {
          console.error("R2 Upload error:", err);
          return { data: null, error: err };
        }
      },
      getPublicUrl(path: string) {
        const publicUrl =
          typeof window !== "undefined"
            ? window.location.origin + "/api/files/" + encodeURIComponent(path)
            : "/api/files/" + encodeURIComponent(path);
        return { data: { publicUrl } };
      },
      async remove(paths: string[]) {
        try {
          const response = await fetch("/api/remove", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ paths }),
          });
          if (!response.ok) {
            throw new Error(`Remove failed with status ${response.status}`);
          }
          return { data: true, error: null };
        } catch (err: any) {
          console.error("R2 Remove error:", err);
          return { data: null, error: err };
        }
      },
    };
  },
};

// Mock Edge Functions client referencing Server Functions
const customFunctions = {
  async invoke(functionName: string, options?: { body: any }) {
    try {
      const session = await getOrRefreshSession();
      const token = session?.access_token || "";
      const body = { ...options?.body, token };

      if (functionName === "google-oauth") {
        const res = await handleGoogleOauthServerFn({ data: body });
        return { data: res, error: null };
      }
      if (functionName === "streetview-publish") {
        const res = await handleStreetViewPublishServerFn({ data: body });
        return { data: res, error: null };
      }
      return { data: null, error: { message: `Function ${functionName} not found` } };
    } catch (err: any) {
      console.error(`Edge Function ${functionName} error:`, err);
      return { data: null, error: err };
    }
  },
};

// Main Export Client Proxy
export const supabase = new Proxy({} as any, {
  get(_, prop, receiver) {
    if (prop === "from") {
      return (table: string) => new D1QueryBuilder(table);
    }
    if (prop === "storage") {
      return customStorage;
    }
    if (prop === "functions") {
      return customFunctions;
    }
    return undefined;
  },
});
