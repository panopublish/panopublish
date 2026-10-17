import { getEnv } from "./env";

export const INDEXNOW_HOST = "panopublish.com";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const DEFAULT_KEY = "cef590f8171a4411a0b0df4adb8725b7";
export const DEFAULT_KEY_LOCATION = `https://${INDEXNOW_HOST}/${DEFAULT_KEY}.txt`;

// Private or non-indexable route prefixes that MUST NEVER be submitted to IndexNow
const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/tours",
  "/clients",
  "/settings",
  "/billing",
  "/auth",
  "/reset-password",
  "/api",
];

export interface IndexNowSubmitOptions {
  key?: string;
  keyLocation?: string;
  dryRun?: boolean;
  timeoutMs?: number;
}

export interface IndexNowResult {
  success: boolean;
  submittedCount: number;
  rejectedCount: number;
  status?: number;
  statusText?: string;
  message?: string;
  submittedUrls: string[];
  rejectedUrls: { url: string; reason: string }[];
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * Validates and sanitizes a URL for IndexNow submission.
 * Returns null if the URL is invalid, external, or private.
 */
export function validateAndNormalizeUrl(rawUrl: string): { url: string | null; reason?: string } {
  try {
    const parsed = new URL(rawUrl);

    // Protocol check
    if (parsed.protocol !== "https:") {
      return { url: null, reason: "Must use https: protocol" };
    }

    // Host check - must strictly match panopublish.com
    if (parsed.hostname !== INDEXNOW_HOST) {
      return { url: null, reason: `Host must strictly be ${INDEXNOW_HOST} (got ${parsed.hostname})` };
    }

    // Private path check
    const pathname = parsed.pathname;
    const isPrivate = PRIVATE_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (isPrivate) {
      return { url: null, reason: `Matches private route prefix: ${pathname}` };
    }

    // Remove search parameters and hash fragments (canonical public URLs are clean)
    parsed.search = "";
    parsed.hash = "";

    // Normalize trailing slash for web pages (unless it has a static file extension)
    let cleanPath = parsed.pathname;
    if (!cleanPath.endsWith("/") && !/\.[a-zA-Z0-9]+$/.test(cleanPath)) {
      cleanPath = `${cleanPath}/`;
    }
    parsed.pathname = cleanPath;

    return { url: parsed.toString() };
  } catch {
    return { url: null, reason: "Malformed URL" };
  }
}

/**
 * Filter and deduplicate a list of URLs according to IndexNow policies.
 */
export function filterIndexNowUrls(urls: string[]): {
  validUrls: string[];
  rejectedUrls: { url: string; reason: string }[];
} {
  const validSet = new Set<string>();
  const rejectedUrls: { url: string; reason: string }[] = [];

  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    const { url, reason } = validateAndNormalizeUrl(raw.trim());
    if (url) {
      validSet.add(url);
    } else {
      rejectedUrls.push({ url: raw, reason: reason || "Invalid URL" });
    }
  }

  return {
    validUrls: Array.from(validSet),
    rejectedUrls,
  };
}

/**
 * Submits valid, canonical URLs to the official IndexNow endpoint.
 */
export async function submitToIndexNow(
  urls: string[],
  options: IndexNowSubmitOptions = {}
): Promise<IndexNowResult> {
  const key = options.key || getEnv("INDEXNOW_API_KEY") || DEFAULT_KEY;
  const keyLocation = options.keyLocation || `https://${INDEXNOW_HOST}/${key}.txt`;
  const timeoutMs = options.timeoutMs || 10000;

  const { validUrls, rejectedUrls } = filterIndexNowUrls(urls);

  if (validUrls.length === 0) {
    return {
      success: true,
      submittedCount: 0,
      rejectedCount: rejectedUrls.length,
      message: "No valid URLs to submit",
      submittedUrls: [],
      rejectedUrls,
    };
  }

  // Dry run mode: validate URLs and payload format without sending network request
  if (options.dryRun) {
    return {
      success: true,
      submittedCount: validUrls.length,
      rejectedCount: rejectedUrls.length,
      status: 200,
      statusText: "Dry Run OK",
      message: `[DRY-RUN] Validated ${validUrls.length} URLs for IndexNow with key ${maskApiKey(key)}`,
      submittedUrls: validUrls,
      rejectedUrls,
    };
  }

  // IndexNow allows up to 10,000 URLs per batch
  const BATCH_SIZE = 10000;
  let lastStatus = 200;
  let lastStatusText = "OK";
  let anyError = false;
  let errorMessage: string | undefined;

  for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
    const batch = validUrls.slice(i, i + BATCH_SIZE);
    const payload = {
      host: INDEXNOW_HOST,
      key,
      keyLocation,
      urlList: batch,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Host: "api.indexnow.org",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      lastStatus = response.status;
      lastStatusText = response.statusText;

      // IndexNow returns:
      // 200 OK: URL submitted successfully
      // 202 Accepted: URL received, key validation pending
      if (response.status !== 200 && response.status !== 202) {
        anyError = true;
        const bodyText = await response.text().catch(() => "");
        errorMessage = `IndexNow HTTP ${response.status} (${response.statusText}): ${bodyText || "Submission rejected"}`;
        console.error(`[IndexNow] Error with key ${maskApiKey(key)}:`, errorMessage);
        break;
      }
    } catch (err: any) {
      anyError = true;
      errorMessage = err.name === "AbortError" ? "Request timed out" : err.message;
      console.error(`[IndexNow] Network error:`, errorMessage);
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    success: !anyError,
    submittedCount: anyError ? 0 : validUrls.length,
    rejectedCount: rejectedUrls.length,
    status: lastStatus,
    statusText: lastStatusText,
    message: errorMessage || `Successfully submitted ${validUrls.length} URLs to IndexNow`,
    submittedUrls: anyError ? [] : validUrls,
    rejectedUrls,
  };
}
