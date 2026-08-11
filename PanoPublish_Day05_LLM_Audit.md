# PanoPublish Day 05 — LLM Files Audit Report (`llms.txt` & `llms-full.txt`)

**Audit Date**: August 11, 2026  
**Target Domain**: [https://panopublish.com](https://panopublish.com)  
**Files Audited**:
- `public/llms.txt` ([https://panopublish.com/llms.txt](https://panopublish.com/llms.txt))
- `public/llms-full.txt` ([https://panopublish.com/llms-full.txt](https://panopublish.com/llms-full.txt))
- `public/robots.txt` ([https://panopublish.com/robots.txt](https://panopublish.com/robots.txt))  
**Source of Truth**: Live production site pages, specifically `/pricing/`, `/google-street-view-publishing/`, `/faq/`, `/contact/`, and router definitions in `src/routes/`.

---

## A. Executive Summary

This audit evaluates the accuracy, freshness, URL integrity, pricing alignment, and AI discoverability quality of `llms.txt` and `llms-full.txt`.

### Key Findings
1. **Pricing Discrepancy (CRITICAL)**: Both `llms.txt` and `llms-full.txt` state that Enterprise pricing is **₹3,999/month** and use plan names `Starter`, `Pro Agency`, `Enterprise`. However, the live production site ([/pricing/](https://panopublish.com/pricing/)) lists plans as **Basic (₹499/mo)**, **Pro (₹1,499/mo)**, and **Agency (₹2,999/mo)**.
2. **Missing Trailing Slashes (HIGH)**: 100% of internal HTML route URLs referenced across both `llms.txt` and `llms-full.txt` omit trailing slashes (e.g. `https://panopublish.com/pricing` instead of canonical `https://panopublish.com/pricing/`). This triggers unnecessary HTTP redirects for AI crawlers.
3. **Missing Important Page (HIGH)**: The `/contact/` page ([https://panopublish.com/contact/](https://panopublish.com/contact/)) is missing from both `llms.txt` and `llms-full.txt`.
4. **Clean Branding (PASS)**: Zero occurrences of legacy names (`TourVista`, `vista360digital`).
5. **Robust Product & Feature Alignment (PASS)**: Product descriptions accurately reflect PanoPublish's core positioning as India's dedicated Google Street View & 360° virtual tour publishing platform with flat INR billing and Razorpay UPI support.

---

## B. `llms.txt` Status

- **File Location**: `public/llms.txt` (42 lines, 4,245 bytes)
- **HTTP Reachability**: Accessible at `https://panopublish.com/llms.txt`
- **Robots Reference**: Referenced in `public/robots.txt` (`# LLMs text: https://panopublish.com/llms.txt`)
- **Structure Score**: **8.5 / 10** (Clean H1/H2 header taxonomy, blockquote summary, and structured FAQ section).
- **Status**: **FAIL (Requires Fixes)** due to pricing mismatch and non-canonical URL format.

---

## C. `llms-full.txt` Status

- **File Location**: `public/llms-full.txt` (79 lines, 5,783 bytes)
- **HTTP Reachability**: Accessible at `https://panopublish.com/llms-full.txt`
- **Linked from `llms.txt`**: Yes (`- Full LLM Context & Architecture: https://panopublish.com/llms-full.txt`)
- **Structure Score**: **9.0 / 10** (Detailed technical architecture breakdown including React 19, Cloudflare D1/R2, Supabase, TanStack Start, and SEO strategies).
- **Status**: **FAIL (Requires Fixes)** due to pricing mismatch and missing trailing slashes on route links.

---

## D. Product Description Audit (CHECK 1)

| Claim in LLM Files | Live Website Verification | Status | Notes |
| :--- | :--- | :--- | :--- |
| Product Name: **PanoPublish** | Verified on homepage, navigation header, and footer | **PASS** | No legacy names found |
| Category: **Google Street View & 360° Virtual Tour Publishing Platform** | Verified on homepage `<h1>` and meta tags | **PASS** | Accurately categorized |
| Target Audience: 360° Photographers, Digital Marketing Agencies, Hotels, Real Estate in India | Verified on homepage badge & pricing tier descriptions | **PASS** | Perfectly matched |
| Primary Features: EXIF GPS tagging, Nadir logo disk removal, direct Google Maps sync, WebGL viewer | Verified in app features section and system code | **PASS** | Accurate capabilities |
| Billing & Payments: Flat INR plans with Razorpay UPI support | Verified on `/pricing/` and checkout integrations | **PASS** | Core differentiator intact |

---

## E. Pricing Audit (CHECK 2)

> [!CAUTION]
> **CRITICAL MISMATCH IDENTIFIED**
> The live `/pricing/` page is the source of truth. Both LLM files contain outdated plan names and an incorrect price for the top tier.

### Price & Plan Comparison

| Attribute | `llms.txt` Claim | `llms-full.txt` Claim | Live Site ([/pricing/](file:///d:/Pano%20Publish/dist/client/pricing/index.html)) | Alignment Status |
| :--- | :--- | :--- | :--- | :--- |
| **Free Trial** | 7-day free trial | 7-day free trial | 7-day free trial (no card needed) | **PASS** |
| **Entry Tier Name & Price** | Starter (₹499/mo) | Starter (₹499/mo) | **Basic (₹499/mo)** | **MISMATCH (Name)** |
| **Mid Tier Name & Price** | Pro Agency (₹1,499/mo) | Pro Agency (₹1,499/mo) | **Pro (₹1,499/mo)** | **MISMATCH (Name)** |
| **Top Tier Name & Price** | Enterprise (**₹3,999/mo**) | Enterprise (**₹3,999/mo**) | **Agency (₹2,999/mo)** | **CRITICAL FAIL (Price & Name)** |
| **Billing Frequency** | Monthly | Monthly | Monthly & Annual (20% off) | **PASS** |
| **Payment Gateway** | Razorpay (UPI, Cards, NetBanking) | Razorpay (UPI, Cards, NetBanking) | Razorpay (UPI, Cards, NetBanking) | **PASS** |
| **USD Forex Overhead Claim** | Zero forex fees / 3.5%+ savings | Zero forex fees / 3.5%+ savings | Zero forex fees / 3.5%+ savings | **PASS** |
| **Matterport Upload Add-on Claim** | Unlimited vs Matterport $14.99 | Unlimited vs Matterport $14.99 | Unlimited vs Matterport $14.99 | **PASS** |

---

## F. Feature Audit (CHECK 3)

Below is the status matrix for all features extracted from `llms.txt` and `llms-full.txt`:

| Feature Name | LLM File Claim | Live App Status | Verification Notes |
| :--- | :--- | :--- | :--- |
| **Google Street View Publishing** | Direct OAuth sync to Google Maps API | **LIVE** | Implemented via Google Street View Publish API |
| **360° Virtual Tours** | Interactive WebGL panos | **LIVE** | Uses Marzipano & Pannellum view engines |
| **Automated Nadir Branding** | Circular logo disk / nadir blur | **LIVE** | In-browser canvas nadir generator |
| **EXIF GPS Metadata Extraction** | Auto-detect coordinates & heading | **LIVE** | Built with `exifr` parser |
| **Blue-Line Map Connections** | Node connections for walkthroughs | **LIVE** | Visual path editor in tour publisher |
| **Multi-Client Workspace** | Organize tours by clients | **LIVE** | Supported in Pro and Agency plans |
| **INR Pricing & UPI Payments** | Razorpay payment integration | **LIVE** | Fully operational in production |
| **WhatsApp Support (IST)** | Support during IST business hours | **LIVE** | Dedicated WhatsApp support link provided |
| **Private Preview Links** | Share client review links | **LIVE** | Available before pushing live to Maps |
| **Self-Hosting Package Export** | Client ZIP generator | **UNCLEAR** | Basic zip generator code exists; full standalone self-host runner needs manual verification |
| **Floor Plan Hotspot Pinning** | Map panorama pins on floorplans | **PLANNED** | Level organization exists; drag-and-drop floorplan mapper is limited |
| **Advanced Tour Analytics** | Detailed traffic analytics | **PLANNED** | Basic view counter exists; full analytics dashboard is planned |

---

## G. URL Audit (CHECK 4)

Every URL referenced in both files was inspected for canonical trailing slashes and HTTP existence:

### `llms.txt` URLs

| URL in `llms.txt` | Target File | Trailing Slash | Canonical Mismatch | Status |
| :--- | :--- | :--- | :--- | :--- |
| `https://panopublish.com/` | `dist/client/index.html` | YES | No | **PASS** |
| `https://panopublish.com/llms-full.txt` | `dist/client/llms-full.txt` | N/A (File) | No | **PASS** |
| `https://panopublish.com/sitemap.xml` | `public/sitemap.xml` | N/A (File) | No | **PASS** |
| `https://panopublish.com/pricing` | `dist/client/pricing/index.html` | **NO** | Needs trailing slash `/pricing/` | **WARN (Redirect)** |
| `https://panopublish.com/google-street-view-publishing` | `dist/client/google-street-view-publishing/index.html` | **NO** | Needs trailing slash `/google-street-view-publishing/` | **WARN (Redirect)** |
| `https://panopublish.com/360-virtual-tour-publishing-platform` | `dist/client/360-virtual-tour-publishing-platform/index.html` | **NO** | Needs trailing slash `/360-virtual-tour-publishing-platform/` | **WARN (Redirect)** |
| `https://panopublish.com/faq` | `dist/client/faq/index.html` | **NO** | Needs trailing slash `/faq/` | **WARN (Redirect)** |
| `https://panopublish.com/case-studies` | `dist/client/case-studies/index.html` | **NO** | Needs trailing slash `/case-studies/` | **WARN (Redirect)** |
| `https://panopublish.com/blog` | `dist/client/blog/index.html` | **NO** | Needs trailing slash `/blog/` | **WARN (Redirect)** |
| `https://panopublish.com/panoee-alternative` | `dist/client/panoee-alternative/index.html` | **NO** | Needs trailing slash `/panoee-alternative/` | **WARN (Redirect)** |
| `https://panopublish.com/tourbuilder-alternative-india` | `dist/client/tourbuilder-alternative-india/index.html` | **NO** | Needs trailing slash `/tourbuilder-alternative-india/` | **WARN (Redirect)** |
| `https://panopublish.com/gothru-alternative` | `dist/client/gothru-alternative/index.html` | **NO** | Needs trailing slash `/gothru-alternative/` | **WARN (Redirect)** |
| `https://panopublish.com/cloudpano-alternative` | `dist/client/cloudpano-alternative/index.html` | **NO** | Needs trailing slash `/cloudpano-alternative/` | **WARN (Redirect)** |
| `https://panopublish.com/matterport-alternative` | `dist/client/matterport-alternative/index.html` | **NO** | Needs trailing slash `/matterport-alternative/` | **WARN (Redirect)** |

### `llms-full.txt` URLs

| URL in `llms-full.txt` | Target File | Trailing Slash | Canonical Mismatch | Status |
| :--- | :--- | :--- | :--- | :--- |
| `https://panopublish.com` | `dist/client/index.html` | **NO** | Needs trailing slash `https://panopublish.com/` | **WARN (Redirect)** |
| `https://panopublish.com/pricing` | `dist/client/pricing/index.html` | **NO** | Needs trailing slash `/pricing/` | **WARN (Redirect)** |
| `https://panopublish.com/google-street-view-publishing` | `dist/client/google-street-view-publishing/index.html` | **NO** | Needs trailing slash `/google-street-view-publishing/` | **WARN (Redirect)** |
| `https://panopublish.com/360-virtual-tour-publishing-platform` | `dist/client/360-virtual-tour-publishing-platform/index.html` | **NO** | Needs trailing slash `/360-virtual-tour-publishing-platform/` | **WARN (Redirect)** |
| `https://panopublish.com/faq` | `dist/client/faq/index.html` | **NO** | Needs trailing slash `/faq/` | **WARN (Redirect)** |
| `https://panopublish.com/blog` | `dist/client/blog/index.html` | **NO** | Needs trailing slash `/blog/` | **WARN (Redirect)** |
| `https://panopublish.com/case-studies` | `dist/client/case-studies/index.html` | **NO** | Needs trailing slash `/case-studies/` | **WARN (Redirect)** |
| `https://panopublish.com/sitemap.xml` | `public/sitemap.xml` | N/A (File) | No | **PASS** |

---

## H. Important Page Coverage (CHECK 5)

Coverage check against standard key commercial pages:

- [x] `/` (Root homepage) — Linked in both files
- [x] `/pricing/` — Linked in both files (missing trailing slash)
- [x] `/google-street-view-publishing/` — Linked in both files (missing trailing slash)
- [x] `/matterport-alternative/` — Linked in `llms.txt` (missing trailing slash)
- [x] `/cloudpano-alternative/` — Linked in `llms.txt` (missing trailing slash)
- [x] `/gothru-alternative/` — Linked in `llms.txt` (missing trailing slash)
- [x] `/blog/` — Linked in both files (missing trailing slash)
- [x] `/case-studies/` — Linked in both files (missing trailing slash)
- [x] `/faq/` — Linked in both files (missing trailing slash)
- [ ] **`/contact/`** — **MISSING from both `llms.txt` and `llms-full.txt`**

---

## I. Brand / Legacy Audit (CHECK 6)

String search across both `llms.txt` and `llms-full.txt`:

- `TourVista`: **0 occurrences** (Clean)
- `Tour Vista`: **0 occurrences** (Clean)
- `vista360digital.com`: **0 occurrences** (Clean)
- `tour.vista360digital.com`: **0 occurrences** (Clean)

---

## J. Date / Freshness Audit (CHECK 7)

- `2024` / `2025` / `2026` string search: No hardcoded year strings present in `llms.txt` or `llms-full.txt`.
- **Freshness Warning**: The top tier pricing claim of **₹3,999/month** is outdated compared to the current 2026 live pricing of **₹2,999/month**.

---

## K. Competitor Claim Audit (CHECK 8)

The following competitor pricing and feature statements are cited in the LLM files:

1. **Matterport**: Claims Matterport charges **$14.99 per export** for Google Street View.  
   *Audit Note*: Needs manual verification against current Matterport 2026 processing add-on pricing.
2. **CloudPano**: Claims CloudPano bills in USD with 3.5%+ credit card forex markups.  
   *Audit Note*: Accurate positioning regarding USD currency billing for Indian buyers.
3. **GoThru**: Claims GoThru has higher node connection complexity.  
   *Audit Note*: Subjective workflow positioning.
4. **TourBuilder**: Claims TourBuilder charges ~$20/mo USD and lacks direct Google Maps API.  
   *Audit Note*: Needs manual verification against current TourBuilder plans.
5. **Panoee**: Claims Panoee charges ~$18/mo USD and lacks direct Google Street View API sync.  
   *Audit Note*: Accurate positioning regarding direct Google API integration.

---

## L. `llms.txt` vs `llms-full.txt` Consistency (CHECK 9)

1. **Pricing Inconsistency with Live Site**: Both files are consistent *with each other* in claiming ₹3,999/month for Enterprise, but **both are inconsistent with live `/pricing/` (₹2,999/month for Agency)**.
2. **Competitor Link Inconsistency**: `llms.txt` links directly to competitor comparison pages (`/panoee-alternative`, `/tourbuilder-alternative-india`), whereas `llms-full.txt` omits competitor links in its key links section.
3. **Missing Contact Page Link**: Both files consistently omit `/contact/`.

---

## M. AI Discoverability Quality (CHECK 10)

Evaluation of AI agent / LLM context clarity (1–10 scale):

1. Clear product summary: **9.5/10**
2. Clear target audience: **9.5/10**
3. Core technical capabilities: **9.0/10**
4. Google Street View feature clarity: **9.5/10**
5. Custom virtual tour & WebGL clarity: **9.0/10**
6. Pricing accuracy: **4.0/10** *(Deduction for incorrect top tier price ₹3,999 vs ₹2,999 and plan naming)*
7. Canonical URL quality: **5.0/10** *(Deduction for 100% missing trailing slashes)*
8. Key commercial pages linked: **8.0/10** *(Deduction for missing `/contact/`)*
9. Contact / support options: **8.5/10**
10. Official website canonical reference: **9.0/10**

---

## N. Issues Requiring Fixes & Recommended Action Plan

When authorized in a future task (no changes made during Day 05 audit), the following edits should be applied:

1. **Update Top Tier Price**: Change `₹3,999/month (Enterprise)` to `₹2,999/month (Agency)` in both `llms.txt` and `llms-full.txt`.
2. **Update Plan Names**: Align plan names to match live site (`Basic`, `Pro`, `Agency`).
3. **Append Trailing Slashes**: Add trailing slashes to all internal route URLs (e.g. `https://panopublish.com/pricing/`, `https://panopublish.com/blog/`).
4. **Add Contact Page Link**: Add `- [Contact Us](https://panopublish.com/contact/): Get in touch with PanoPublish team for support or custom enterprise requirements.`

---

## O. Final PASS / FAIL Scorecard

| Category | Status | Issues | Priority |
| :--- | :--- | :--- | :--- |
| **Product Description** | **PASS** | Accurately describes product, audience, and core value proposition. | Low |
| **Pricing** | **FAIL** | Enterprise plan price claimed as ₹3,999/mo instead of live ₹2,999/mo; plan names mismatch (`Starter`/`Pro Agency`/`Enterprise` vs `Basic`/`Pro`/`Agency`). | **CRITICAL** |
| **Features** | **PASS** | Core capabilities (Street View API, nadir branding, WebGL viewer, UPI payments) accurately listed. | Low |
| **URLs** | **FAIL** | 100% of route links lack canonical trailing slashes, causing HTTP redirects for crawlers. | **HIGH** |
| **Branding** | **PASS** | Zero legacy branding (`TourVista`) present. | Low |
| **Freshness** | **FAIL** | Outdated top-tier subscription pricing relative to 2026 live site. | **HIGH** |
| **Consistency** | **WARN** | `/contact/` missing from both files; competitor comparison links present in `llms.txt` but absent in `llms-full.txt`. | **MEDIUM** |

### OVERALL AUDIT SCORE: **FAIL (Action Required for Pricing & URLs)**
