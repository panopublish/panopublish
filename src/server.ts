import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Expose Cloudflare environment bindings to process.env for SSR compatibility
      if (env && typeof env === "object") {
        globalThis.process = globalThis.process || {};
        globalThis.process.env = globalThis.process.env || {};
        Object.assign(globalThis.process.env, env);
        (globalThis as any).cloudflareEnv = env;
      }

      const url = new URL(request.url);

      // Intercept file downloads from R2
      if (url.pathname.startsWith("/api/files/")) {
        const bucket = (env as any).BUCKET;
        if (!bucket) {
          return new Response("Cloudflare R2 Bucket binding 'BUCKET' is missing", { status: 500 });
        }
        const filePath = decodeURIComponent(url.pathname.substring("/api/files/".length));
        const object = await bucket.get(filePath);
        if (!object) {
          return new Response("File not found", { status: 404 });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "public, max-age=3600");
        return new Response(object.body, { headers });
      }

      // Intercept file uploads to R2
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const bucket = (env as any).BUCKET;
        if (!bucket) {
          return new Response("Cloudflare R2 Bucket binding 'BUCKET' is missing", { status: 500 });
        }
        const filePath = url.searchParams.get("path");
        if (!filePath) {
          return new Response("Missing path search parameter", { status: 400 });
        }
        // Save the raw request body directly to R2
        await bucket.put(filePath, request.body);
        return new Response(JSON.stringify({ success: true, path: filePath }), {
          headers: { "content-type": "application/json" },
        });
      }

      // Intercept file removal from R2
      if (url.pathname === "/api/remove" && request.method === "POST") {
        const bucket = (env as any).BUCKET;
        if (!bucket) {
          return new Response("Cloudflare R2 Bucket binding 'BUCKET' is missing", { status: 500 });
        }
        const { paths } = (await request.json()) as { paths: string[] };
        if (!paths || !Array.isArray(paths)) {
          return new Response("Invalid paths body parameters", { status: 400 });
        }
        await Promise.all(paths.map((p) => bucket.delete(p)));
        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
