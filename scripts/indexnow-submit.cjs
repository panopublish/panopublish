const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const INDEXNOW_HOST = "panopublish.com";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_KEY = "cef590f8171a4411a0b0df4adb8725b7";
const DEFAULT_KEY_LOCATION = `https://${INDEXNOW_HOST}/${DEFAULT_KEY}.txt`;

// Private prefixes that must NEVER be submitted
const PRIVATE_PREFIXES = [
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

function maskKey(key) {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function validateAndNormalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== INDEXNOW_HOST) return null;

    const pathname = parsed.pathname;
    const isPrivate = PRIVATE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (isPrivate) return null;

    parsed.search = "";
    parsed.hash = "";

    let cleanPath = parsed.pathname;
    if (!cleanPath.endsWith("/") && !/\.[a-zA-Z0-9]+$/.test(cleanPath)) {
      cleanPath = `${cleanPath}/`;
    }
    parsed.pathname = cleanPath;

    return parsed.toString();
  } catch {
    return null;
  }
}

function getRoutesFromConfig() {
  try {
    const { allRouteObjects } = require("../routes.config.cjs");
    return allRouteObjects.map((r) => `https://${INDEXNOW_HOST}${r.path}`);
  } catch (err) {
    console.warn("Could not load routes from routes.config.cjs:", err.message);
    return [];
  }
}

function getChangedUrlsFromGit() {
  try {
    // Check git diff against HEAD~1 or uncommitted changes
    let diffFiles = "";
    try {
      diffFiles = execSync("git diff --name-only HEAD~1", { encoding: "utf8" });
    } catch {
      diffFiles = execSync("git status --porcelain", { encoding: "utf8" });
    }

    const changedFiles = diffFiles.split("\n").map((f) => f.trim()).filter(Boolean);
    const affectedUrls = new Set();

    for (const file of changedFiles) {
      if (file.includes("seo-pages-data") || file.includes("cluster")) {
        // Core SEO/blog data files changed - pull all public routes
        return getRoutesFromConfig();
      }
      if (file.includes("pricing")) affectedUrls.add(`https://${INDEXNOW_HOST}/pricing/`);
      if (file.includes("contact")) affectedUrls.add(`https://${INDEXNOW_HOST}/contact/`);
      if (file.includes("faq")) affectedUrls.add(`https://${INDEXNOW_HOST}/faq/`);
      if (file.includes("case-studies")) affectedUrls.add(`https://${INDEXNOW_HOST}/case-studies/`);
      if (file.includes("blog")) affectedUrls.add(`https://${INDEXNOW_HOST}/blog/`);
      if (file.includes("index.tsx")) affectedUrls.add(`https://${INDEXNOW_HOST}/`);
    }

    return Array.from(affectedUrls);
  } catch (err) {
    console.warn("Git diff check failed, falling back to all routes:", err.message);
    return getRoutesFromConfig();
  }
}

async function submitUrls(urls, options = {}) {
  const key = options.key || process.env.INDEXNOW_API_KEY || DEFAULT_KEY;
  const keyLocation = options.keyLocation || `https://${INDEXNOW_HOST}/${key}.txt`;
  const isDryRun = !!options.dryRun;

  const validUrls = Array.from(
    new Set(urls.map(validateAndNormalizeUrl).filter(Boolean))
  );

  console.log(`\n==================================================`);
  console.log(`PanoPublish IndexNow Submission Tool`);
  console.log(`==================================================`);
  console.log(`Host:         ${INDEXNOW_HOST}`);
  console.log(`Key:          ${maskKey(key)}`);
  console.log(`Key Location: ${keyLocation}`);
  console.log(`Total URLs:   ${validUrls.length}`);
  console.log(`Mode:         ${isDryRun ? "DRY-RUN (No HTTP requests sent)" : "LIVE SUBMISSION"}`);
  console.log(`==================================================\n`);

  if (validUrls.length === 0) {
    console.log("No valid canonical URLs to submit.");
    return { success: true, count: 0 };
  }

  // Print first 5 sample URLs
  console.log("Sample URLs to submit:");
  validUrls.slice(0, 5).forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
  if (validUrls.length > 5) {
    console.log(`  ... and ${validUrls.length - 5} more URLs.`);
  }

  if (isDryRun) {
    console.log(`\n[DRY-RUN] Success! ${validUrls.length} URLs validated against IndexNow policy.`);
    return { success: true, count: validUrls.length };
  }

  // Live submission in batches of 10,000
  const BATCH_SIZE = 10000;
  for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
    const batch = validUrls.slice(i, i + BATCH_SIZE);
    const payload = {
      host: INDEXNOW_HOST,
      key,
      keyLocation,
      urlList: batch,
    };

    console.log(`\nSubmitting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} URLs)...`);

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Host: "api.indexnow.org",
        },
        body: JSON.stringify(payload),
      });

      console.log(`HTTP Status: ${response.status} ${response.statusText}`);
      if (response.status === 200 || response.status === 202) {
        console.log(`[SUCCESS] Batch submitted successfully! (Status ${response.status})`);
      } else {
        const text = await response.text().catch(() => "");
        console.error(`[ERROR] Submission failed with status ${response.status}: ${text}`);
        return { success: false, status: response.status, error: text };
      }
    } catch (err) {
      console.error(`[NETWORK ERROR] Could not reach IndexNow endpoint:`, err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: true, count: validUrls.length };
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isAll = args.includes("--all");
  const isChanged = args.includes("--changed");

  const urlArg = args.find((a) => a.startsWith("--urls="));
  let targetUrls = [];

  if (urlArg) {
    targetUrls = urlArg.replace("--urls=", "").split(",").map((s) => s.trim());
  } else if (isChanged) {
    console.log("Detecting changed routes from recent changes...");
    targetUrls = getChangedUrlsFromGit();
  } else if (isAll || (!isChanged && !urlArg)) {
    console.log("Loading all canonical public routes...");
    targetUrls = getRoutesFromConfig();
  }

  const result = await submitUrls(targetUrls, { dryRun: isDryRun });
  if (!result.success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { submitUrls, validateAndNormalizeUrl, getRoutesFromConfig };
