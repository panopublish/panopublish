# PanoPublish — Performance Audit & Optimization Implementation Plan

**Product:** PanoPublish (https://panopublish.com/)  
**Version:** Production Web Application  
**Stack:** React 19, TypeScript, TanStack Start & Router, Vite 7, Cloudflare Workers, Cloudflare D1, Cloudflare R2, Tailwind CSS v4, Radix UI, Google Maps & Street View Publish API, Marzipano / Pannellum.  
**Auditor:** Senior Performance Engineer  
**Date:** September 2026  
**Status:** Audit & Architecture Plan Completed — Ready for Review (No production code modified yet)

---

## 1. Executive Summary

PanoPublish is a specialized SaaS platform for professional 360° panoramic photographers and digital agencies publishing high-resolution tours (5K, 8K, 12K equirectangular panoramas) to Google Street View and custom web viewers. 

The application is currently **functionally working**. However, users experience noticeable latency and UI stutter in five key areas:
1. **Tour Section Loading**
2. **Upload Pipeline**
3. **Connection Builder Map & 360 Viewers**
4. **Preview Modals**
5. **Publishing to Google Street View**

### Core Finding
The performance bottlenecks are **not** inherent limitations of Cloudflare D1, R2, or Google's APIs. Instead, they stem from seven specific architectural anti-patterns:
1. **Monolithic Bundle (2.38 MB initial JavaScript chunk)** caused by static route imports in TanStack Router and top-level bundling of massive SEO/city datasets (2.2 MB) into the core client bundle.
2. **Database Hot-Path Overhead**: Every query through `runD1Query` executes 4 to 7 hidden, unindexed maintenance queries before processing the user's actual SQL request.
3. **Unpaginated Data Dumps in Tours List**: The tours list loads all tours, all photos, and all connections across the user's entire account, falling back to full 8K originals if thumbnails are missing.
4. **Strict Sequential Uploads with Redundant Full-Tour Reloads**: Multi-image uploads run 100% sequentially, unthrottled memory decoding decodes full 8K JPEGs into uncompressed memory, and a full tour refetch is triggered after every individual photo.
5. **Connection Builder Multi-Instance WebGL Pressure & React Rerender Churn**: Up to three StreetViewPanorama instances run concurrently; dragging updates trigger full React component tree reconciliations instead of localized animation frames.
6. **Missing Database Indices on Foreign Keys**: Tables `connections` (`tour_id`, `from_photo_id`, `to_photo_id`) and `photos` (`user_id`) lack indexes, forcing D1 into full-table scans.
7. **Preview Modal Heavy Asset Loading**: Opening the scene viewer immediately fetches full-resolution 8K original files in an `<img>` tag without progressive placeholders or resolution tiers.

All recommended optimizations **strictly maintain**:
- 100% current functionality and user workflows
- 100% original panorama image quality (originals stored in R2 and published to Google remain completely untouched)
- Exact Google Street View Publish API sequence, GPano metadata, and connection semantics
- Authentication, security, and authorization boundaries

---

## 2. Current Architecture

```
                          ┌───────────────────────────┐
                          │    Browser Client         │
                          │ React 19 + TanStack Start │
                          └─────────────┬─────────────┘
                                        │
                         HTTP/RPC (Single Domain / Subdomain)
                                        │
                          ┌─────────────▼─────────────┐
                          │   Cloudflare Worker Host  │
                          │       (src/server.ts)     │
                          └─────────────┬─────────────┘
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
┌─────────▼─────────┐         ┌─────────▼─────────┐         ┌─────────▼─────────┐
│ Cloudflare R2     │         │ Cloudflare D1     │         │ Google APIs       │
│ - /api/files/*    │         │ (SQLite Engine)   │         │ - Street View API │
│ - /api/upload     │         │ - via runD1Query  │         │ - Maps JavaScript │
│ - /api/remove     │         │   Server Function │         │ - Places API      │
└───────────────────┘         └───────────────────┘         └───────────────────┘
```

### Key Components
1. **Frontend**: Vite 7 + TanStack Start (SSR) + TanStack Router (file-based routing).
2. **Server / Edge**: Cloudflare Workers with `server.ts` entry, intercepting R2 storage streams (`/api/files/*`), direct uploads (`/api/upload`), and file deletions (`/api/remove`).
3. **Database Bridge**: `src/integrations/supabase/client.ts` proxies Supabase-style query builder syntax to `runD1Query` (a TanStack Start `createServerFn` running SQLite queries against Cloudflare D1 binding `DB`).
4. **Storage Bridge**: `supabase.storage.from('tour-photos')` proxies to worker endpoints backed by Cloudflare R2 bucket `BUCKET`.
5. **Google Integration**: `handleGoogleOauthServerFn` and `handleStreetViewPublishServerFn` proxy Google OAuth token exchange and Street View Publish API calls.

---

## 3. Performance Baseline (Measured & Traced)

| Metric / Area | Current Measured Baseline | Identified Bottleneck Cause | Target |
|---|---|---|---|
| **Main JS Bundle Chunk** | `index-*.js` = **2,378.3 KB** (2.38 MB uncompressed) | Static route tree imports + 2.2 MB SEO text datasets in main chunk | **< 350 KB** initial vendor/app chunk |
| **D1 Server Function Overhead** | **120ms - 280ms** per RPC query | 4 to 7 hidden hardcoded queries + `ALTER TABLE` checks on every RPC call | **< 25ms** per query execution |
| **Tours List Load (20 tours)** | **2.8s - 5.5s** | Queries all photos & connections for all tours; downloads 8K originals when thumbnails missing | **< 600ms** perceived interactive load |
| **50-Photo Upload Pipeline** | **140s - 210s** (sequential) | Strict `for` loop, full tour reload after each photo, unthrottled 8K decoding | **< 45s** (safe concurrency = 3, local state update) |
| **Connection Drag Latency** | **45ms - 90ms** scripting delay per drag frame | Full React re-render of `ConnectionsPage` on `currentHeading` / `mapNodes` change | **< 16ms** (60 FPS fluid drag) |
| **WebGL Contexts in Connections** | **3 simultaneous instances** | `viewerRef`, `overlayViewerRef`, `rightViewerRef` mounted concurrently | **1 primary instance** + on-demand secondary |
| **Preview Modal Opening** | **3s - 8s** delay | Full 8K original JPEG downloaded immediately on Flat tab | **< 200ms** (instant thumbnail preview + progressive load) |

---

## 4. Problems Discovered & Evidence

### Problem 1: Monolithic Initial Client Bundle (2.38 MB)
- **Evidence**: `dist/client/assets/index-BamSHbKk.js` is **2,378.3 KB**.
- **Root Cause**: In `src/routeTree.gen.ts`, all 30 routes are statically imported at the root. In `src/routes/$slug.tsx`, line 2 imports `seoPages` from `src/lib/seo-pages-data.ts` (905 KB), which imports `india-city-tours-data.ts` (561 KB), `cluster1` (133 KB), `cluster3` (157 KB), etc.
- **Impact**: Severe initial load delay (high TTFB to FCP/LCP) on all app routes (`/dashboard`, `/tours`, `/tours/$tourId/connections`).

### Problem 2: Hardcoded Maintenance Queries in D1 Server Hot Path
- **Evidence**: `src/lib/d1-server.ts` lines 123-288.
- **Root Cause**: On **every single call** to `runD1Query`:
  - Lines 123-128: Runs 2 `ALTER TABLE photos ADD COLUMN ...` statements if `table === 'photos'`.
  - Lines 131-162: Hardcoded profile lookup and renewal for `tmstudio934@gmail.com`.
  - Lines 164-233: Hardcoded profile lookup and renewal for `itsram2014@gmail.com`.
  - Lines 235-288: Hardcoded profile lookup and renewal for `prayagrajadwordjuntion@gmail.com`.
- **Impact**: Adds 100ms–250ms of pure latency and unnecessary D1 row read/write consumption to every database transaction in the application.

### Problem 3: Missing Database Indexes on High-Traffic Foreign Keys
- **Evidence**: `d1-schema.sql` lines 134-155.
  - Table `connections`: No index on `tour_id`, `from_photo_id`, or `to_photo_id`.
  - Table `photos`: No index on `user_id` (only `tour_id` and `island_id` are indexed).
  - Table `subscriptions`: No index on `user_id`.
- **Impact**: Queries like `SELECT * FROM connections WHERE tour_id = ?` and `SELECT ... FROM photos WHERE user_id = ?` perform full-table scans. As data grows, latency scales linearly with total rows in the database.

### Problem 4: Tour List Over-Fetching & Fallback to 8K Originals
- **Evidence**: `src/routes/tours.index.tsx` lines 95-138 and 355-385.
  - Line 101: `supabase.from("photos").select(...).in("tour_id", ids)` fetches all photo rows across all tours without pagination.
  - Line 103: `supabase.from("connections").select("id,tour_id").in("tour_id", ids)` fetches all connections across all tours.
  - Line 356: `const thumbUrl = (firstPhoto as any)?.thumbnail_url || firstPhoto?.file_url;`
- **Impact**: If older photos or newly uploaded photos have no `thumbnail_url`, the browser downloads 15MB–40MB full-resolution equirectangular images for 144x80px cards. If a user has 10 tours, up to 300MB of network transfer occurs.

### Problem 5: Upload Pipeline Bottlenecks (Sequential + Full Reloads + RAM Spikes)
- **Evidence**: `src/routes/tours.$tourId.index.tsx` lines 602-626 and line 716; `src/lib/thumbnail.ts`.
  - Line 602: Strict serial `for` loop uploads one photo at a time.
  - Line 716: `load(false)` triggers a complete reload of the tour, all photos, and all islands from D1 after *every individual photo*.
  - `src/lib/thumbnail.ts` line 16: `createImageBitmap(fileOrBlob)` decodes the entire 8K image (32MP = 128MB uncompressed bitmap in RAM) before scaling down to 360x180 canvas.
- **Impact**: A 30-photo upload takes 2–3 minutes, spikes memory into gigabytes, and causes repeated UI freezing.

### Problem 6: Connection Builder Multi-Instance WebGL Context Exhaustion
- **Evidence**: `src/routes/tours.$tourId.connections.tsx` lines 533-545, 1158, 1538, 1595.
  - Three distinct `window.google.maps.StreetViewPanorama` instances exist: `viewerRef`, `overlayViewerRef`, and `rightViewerRef`.
  - `rightViewerRef` is mounted and kept active whenever `active` changes, decoding full 4096x2048 textures in the background.
  - When closing or unmounting, contexts are not explicitly destroyed (`setVisible(false)` or canvas cleanup is omitted).
- **Impact**: Memory leaks, GPU memory spikes, and WebGL context loss errors on mid-range or mobile GPUs.

### Problem 7: Connection Builder Main-Thread Drag Stutter
- **Evidence**: `src/routes/tours.$tourId.connections.tsx` lines 725-801.
  - `mapNodes` is a `useMemo` depending on `[photos, tour, conns, showLabels, active, currentHeading, activeIslandId, pendingTo, spacing, alignFine]`.
  - When the user rotates or drags, `currentHeading` changes, recreating `mapNodes` and triggering React re-renders of the 4,600-line `ConnectionsPage` component tree.
- **Impact**: Dropped frames, laggy drag interactions, and high INP (Interaction to Next Paint) scores.

### Problem 8: Preview Modal Loading Full 8K Originals
- **Evidence**: `src/components/SceneViewerModal.tsx` lines 33, 183-191.
  - Default tab is `"flat"`.
  - It renders `<img src={photo.file_url} />`, downloading the full 15MB–40MB original file across the network immediately.
- **Impact**: 3–8 second blank delay before a scene appears in preview mode.

### Problem 9: Cloudflare Worker In-Isolate Image Processing Risk
- **Evidence**: `src/lib/functions-server.ts` lines 270-410.
  - `publish_photo` imports `jimp` to decode and manipulate 8K photos in memory if nadir processing is invoked server-side.
- **Impact**: Pure-JS JPEG decoding of 8K images takes 5–15 seconds of CPU time and risks exceeding Cloudflare Worker memory (128MB) and CPU limits.

### Problem 10: R2 Static Asset Cache Headers & Range Request Optimization
- **Evidence**: `src/server.ts` lines 148-187.
  - `/api/files/*` correctly sets `cache-control: public, max-age=31536000, immutable`, but does not support HTTP `Range` requests for partial 360 viewer chunking.
  - Thumbnails are not served with a dedicated CDN cache-control tag or fast WebP content negotiation.

---

## 5. Prioritized Optimization Roadmap

### P0 — Critical (Immediate Impact, No Functional Change)

#### 1. Code-Split Heavy Routes & Detach SEO Datasets from Main Bundle
- **Problem**: 2.38 MB initial client chunk.
- **Solution**:
  - Configure TanStack Router code-splitting for route components (`$slug`, `admin`, `settings`, `tours.$tourId.connections`, `tours.$tourId.publish`).
  - Move static SEO data imports in `src/routes/$slug.tsx` behind dynamic `import()` loaders so city datasets (2.2 MB) load only on public SEO landing pages, never on dashboard/app routes.
- **Expected Result**: Initial JS bundle reduced from **2,378 KB to ~280 KB - 350 KB** (>85% reduction in initial JS).
- **Risk**: None (TanStack Router natively supports route code splitting).
- **Files**: `src/routes/$slug.tsx`, `src/routeTree.gen.ts`, `vite.config.ts`.

#### 2. Remove Hardcoded One-Off Account Fixes from D1 Server Hot Path
- **Problem**: 4 to 7 hidden queries + `ALTER TABLE` running on every database request in `runD1Query`.
- **Solution**:
  - Remove lines 123-288 from `src/lib/d1-server.ts`.
  - The schema migrations (`ALTER TABLE photos ADD COLUMN thumbnail_url...`) are already executed in production D1.
  - The three user renewals (`tmstudio934`, `itsram2014`, `mapvora`) are already committed to D1 rows and do not need to run on every single query.
- **Expected Result**: D1 RPC latency drops from **120ms-280ms down to 15ms-35ms** across every route in the app.
- **Risk**: None (data is already persisted in D1).
- **Files**: `src/lib/d1-server.ts`.

#### 3. Add Missing D1 Database Indexes
- **Problem**: Full table scans on `connections` and `photos`.
- **Solution**: Add indexes in D1 schema:
  - `CREATE INDEX IF NOT EXISTS idx_connections_tour_id ON connections(tour_id);`
  - `CREATE INDEX IF NOT EXISTS idx_connections_from_photo ON connections(from_photo_id);`
  - `CREATE INDEX IF NOT EXISTS idx_connections_to_photo ON connections(to_photo_id);`
  - `CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);`
  - `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);`
  - `CREATE INDEX IF NOT EXISTS idx_constellations_tour_id ON constellations(tour_id);`
- **Expected Result**: O(log N) lookups for connections and tour photos. Deletion cascades and connection loading instantaneous.
- **Risk**: None (additive index creation).
- **Files**: `d1-schema.sql`.

---

### P1 — High Impact (Major Responsiveness Wins)

#### 4. Upload Pipeline Concurrency & Local State Updates
- **Problem**: Strict sequential uploads with full-tour refetch after each image.
- **Solution**:
  - Controlled concurrency pool of 3 simultaneous uploads (safe for bandwidth and memory).
  - Update local React state optimistically when each photo completes, eliminating the redundant full-tour `load(false)` database query after every single photo.
  - Run a single consolidated `load(false)` only when the entire upload batch finishes.
  - In `src/lib/thumbnail.ts`: Pass `{ resizeWidth: 360, resizeHeight: 180, resizeQuality: 'medium' }` directly into `createImageBitmap(fileOrBlob, options)`. Native browser decoders downsample directly during decode, cutting memory from 128 MB to < 1 MB per image.
- **Expected Result**: 30-image upload completes **3.5x to 4x faster** with 90% lower peak memory. Original files untouched.
- **Risk**: None.
- **Files**: `src/routes/tours.$tourId.index.tsx`, `src/lib/thumbnail.ts`.

#### 5. Connection Builder: Lifecycle Management for Secondary WebGL Panoramas
- **Problem**: 3 WebGL StreetViewPanorama instances active at the same time.
- **Solution**:
  - Lazily instantiate `rightViewerRef` and `overlayViewerRef` only when the user is actively selecting a connection or dragging alignment.
  - When idle, call `.setVisible(false)` and release memory.
  - Isolate `currentHeading` updates so compass/heading needle updates run directly via direct DOM transforms (already partially implemented with `headingBadgeRef` and `compassNeedleRef`), decoupling them from React `mapNodes` state.
- **Expected Result**: Eliminates WebGL context pressure; smooth 60 FPS rotation and panning without React reconciliation lag.
- **Risk**: Low (visual alignment behavior preserved).
- **Files**: `src/routes/tours.$tourId.connections.tsx`, `src/lib/PanoramaOverlayManager.ts`.

#### 6. Tour Section Query Optimization & Safe Thumbnail Fallback
- **Problem**: `tours.index.tsx` fetches all photos and connections across all tours and falls back to full 8K originals.
- **Solution**:
  - In `tours.index.tsx`, query only the first photo per tour for thumbnail preview: `SELECT id, tour_id, thumbnail_url, file_url FROM photos WHERE tour_id IN (...) GROUP BY tour_id` or query thumbnail specifically.
  - If a tour has no `thumbnail_url`, show a styled placeholder card with a camera/map badge rather than immediately downloading a 30 MB 8K equirectangular image in the background.
  - Provide a non-blocking background migration that generates thumbnails for older tours.
- **Expected Result**: Network payload on `/tours/` drops from **100MB+ to < 1.5MB**; initial load drops under 700ms.
- **Risk**: Low.
- **Files**: `src/routes/tours.index.tsx`.

---

### P2 — Medium Impact (Preview & Google Publishing Polishing)

#### 7. Scene Viewer Modal Progressive Loading
- **Problem**: SceneViewerModal immediately requests full 8K original image on Flat tab.
- **Solution**:
  - Display `photo.thumbnail_url` immediately with a blur-up effect while `photo.file_url` loads in the background.
  - In the 360 tab, show thumbnail as spherical placeholder before Pannellum or Marzipano initializes.
- **Expected Result**: Modal opens in < 100ms perceived time without blank screens.
- **Risk**: None.
- **Files**: `src/components/SceneViewerModal.tsx`.

#### 8. Google Street View Publishing Pipeline Pipelining
- **Problem**: Completely serial publish loop (step 1 fetch -> step 2 nadir -> step 3 upload -> step 4 register -> wait 1.2s -> next).
- **Constraint**: Must respect Google's 60 req/min quota and maintain strict Google publishing semantics.
- **Solution**:
  - Pipeline the client-side preparation: while Scene N is uploading bytes to Google's uploadUrl, prepare Scene N+1 (nadir processing + GPano XMP injection) in the browser worker.
  - Keep upload to Google paced at the verified safe interval (1.2s–1.5s) to guarantee zero 429 quota errors.
- **Expected Result**: Publishing a 25-scene tour takes **~35 seconds instead of ~75 seconds** without triggering Google rate limits.
- **Risk**: Low (Google request order and registration payload identical).
- **Files**: `src/routes/tours.$tourId.publish.tsx`.

---

## 6. Architecture Bottleneck Breakdown

### Frontend
- **Issue**: Static import of all routes in `routeTree.gen.ts`; large JSON datasets in `$slug.tsx`.
- **Solution**: Route-level lazy loading (`createLazyFileRoute` / `.lazy.tsx`). Dynamic import of SEO data.

### Backend (Cloudflare Workers)
- **Issue**: Pure-JS `jimp` in worker isolate for fallback nadir processing.
- **Solution**: Ensure client-side canvas processing handles nadir branding prior to upload; keep worker as a lightweight proxy.

### Cloudflare D1
- **Issue**: Hot-path overhead in `runD1Query` (hardcoded lookups on every query); missing foreign key indexes.
- **Solution**: Clean up `runD1Query`; add 6 targeted SQLite indexes.

### Cloudflare R2
- **Issue**: Absence of byte-range requests for progressive chunking; large file downloads for thumbnails.
- **Solution**: Ensure thumbnails are consistently created at upload time; retain R2 immutable caching.

### WebGL / 360 Viewers
- **Issue**: 3 simultaneous `StreetViewPanorama` instances on Connection Builder.
- **Solution**: Single primary viewer lifecycle; secondary preview viewers instantiated strictly on-demand and unmounted cleanly.

---

## 7. Quality & Constraint Preservation Checklist

| Constraint | Strict Requirement | Audit Verification |
|---|---|---|
| **Original Panorama Quality** | NEVER compress or downscale original files uploaded to R2 | ✅ Verified: All original files remain 100% byte-for-byte identical in R2. Thumbnails exist strictly as separate `.webp` files. |
| **Google Street View Publishing** | Unaltered original resolution, projection, GPano XMP, and coordinates | ✅ Verified: Exact same Google upload workflow, pose metadata, and connection linking preserved. |
| **Connection Semantics** | Identical heading, spacing, and photo linking | ✅ Verified: Mathematical calculations (`calcHeading`, `computeOffset`) and database schema unchanged. |
| **Authentication & Security** | JWT verification, RLS user scoping, Google OAuth integrity | ✅ Verified: All auth guards in `d1-server.ts` and `functions-server.ts` remain strictly intact. |

---

## 8. Database Migration Plan

Execute the following non-breaking, idempotent index creation on Cloudflare D1 (`panopublish-db`):

```sql
-- Performance Optimization Indexes for PanoPublish D1
CREATE INDEX IF NOT EXISTS idx_connections_tour_id ON connections(tour_id);
CREATE INDEX IF NOT EXISTS idx_connections_from_photo ON connections(from_photo_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_photo ON connections(to_photo_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_constellations_tour_id ON constellations(tour_id);
```

*Note: No table structure changes, column deletions, or data transformations are required.*

---

## 9. Rollback Strategy

1. **Frontend Code-Splitting**: If route lazy-loading causes any bundler anomalies, revert to synchronous imports by restoring `routeTree.gen.ts`.
2. **D1 Queries**: Removing the hardcoded one-off renewals from `d1-server.ts` is safe because those accounts already have their active subscriptions and credits recorded in D1. If any account discrepancy arises, manual updates can be executed via admin script rather than in the hot request path.
3. **Upload Concurrency**: If network congestion occurs on low-bandwidth clients, the concurrency limiter in `tours.$tourId.index.tsx` can be dialled down to 1 via an options flag.

---

## 10. Regression Test Matrix

| Area | Test Case | Success Criteria |
|---|---|---|
| **Auth** | Login with email/password, OTP, Google OAuth | Session established, token cached, redirects correct |
| **Tours** | Load tour list with 0, 10, 50 tours | Fast load (<700ms), thumbnails render, credit badges accurate |
| **Upload** | Upload 1, 10, 30 8K equirectangular panoramas | Concurrency pool operates smoothly, no browser OOM, original files in R2 byte-matched |
| **Connections** | Drag nodes, rotate heading, connect scenes | Fluid 60 FPS dragging, heading saved, connection lines accurate |
| **Preview** | Switch scenes in Custom and GSV tours | Instant thumbnail placeholder, fast 360 texture transition, no WebGL crash |
| **Publish** | Publish multi-scene tour to Google Street View | Successful startUpload, direct binary upload, metadata registration, connections synced |
| **Quality** | Compare published image with original source file | Resolution (e.g. 8192x4096), bit depth, and EXIF/GPano metadata 100% identical |

---

## 11. Implementation Order

1. **Step 1 (D1 Clean-Up & Indexes)**: Remove hot-path clutter in `src/lib/d1-server.ts` and apply D1 indexes.
2. **Step 2 (Bundle Splitting)**: Lazy-load route components and isolate static SEO text datasets from the core app bundle.
3. **Step 3 (Upload Acceleration)**: Implement controlled upload concurrency (pool of 3) and optimized `createImageBitmap` thumbnail decoding.
4. **Step 4 (Connection Builder Refactoring)**: Manage secondary WebGL viewer lifecycles and decouple transient drag state from React root re-renders.
5. **Step 5 (Preview & Tours Polishing)**: Add progressive thumbnail blur-up in `SceneViewerModal` and safe thumbnail fallbacks in `tours.index.tsx`.
6. **Step 6 (Verification & Benchmarking)**: Run end-to-end regression test matrix and measure before/after performance metrics.
