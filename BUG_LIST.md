# PanoPublish — Known Bugs & Issue Tracker

This document tracks identified bugs, reproduction steps, root cause analysis, and detailed implementation solutions for planned future resolutions.

---

## Issue #1: Black 360 Viewer & Missing Map Markers when Navigating from "Publish" to "Build Connections"

- **Status**: Open / Backlogged
- **Severity**: High (Degrades UX on client-side route navigation)
- **Impacted Route**: `/tours/$tourId/connections` (navigating back from `/tours/$tourId/publish`)
- **Affects**: All authenticated users (both regular users and Admin Impersonation sessions)
- **Workaround**: Hard refresh (F5 / reload) restores the correct UI.

---

### 1. Description & Symptoms

When a user on the **Publish to Google** page (`/tours/$tourId/publish`) clicks the **"Build connections"** tab in [`TourStepsNav`](file:///d:/Pano%20Publish/src/components/TourStepsNav.tsx):
1. **Center 360 Panorama Viewer is pitch black**: The green alignment line and chevron icon render, but the 360 photo fails to render.
2. **Top-Right Preview Viewer is pitch black**: Shows the `"0 (ACTIVE)"` and `"ACTIVE SCENE"` badges over an empty black box.
3. **Mini-Map Markers are missing**: The Google Roadmap base tiles load, but scene markers (red dots `0, 1, 2...`), connection lines (blue lines), and active heading rays do not render.
4. **Heading display stuck at initial value**: Heading badge shows `H: 0.00` instead of degrees (e.g. `H: 0°`).
5. **After refreshing the browser (F5)**: The page reloads and all 3 components render properly with images, markers, and compass headings.

---

### 2. Root Cause Analysis

1. **Duplicate Google Maps API Script Injections via TanStack Router `Route.head`**:
   - In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L239-L247), the Google Maps API script is declared inside `Route({ head: () => ({ scripts: [...] }) })`.
   - When switching to `/publish`, TanStack Router unmounts the script tag from `<head>`.
   - When returning to `/connections`, TanStack Router injects the script tag again while `window.google` already exists in memory.
   - Re-injecting Google Maps causes the API bootloader to log `"You have included the Google Maps JavaScript API multiple times on this page"`, corrupting newly created Street View canvas contexts and overlay projections.

2. **StreetViewPanorama WebGL Context & Listener Leak on Route Unmount**:
   - In [`connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L1208-L1352), the main `StreetViewPanorama` effect does **not** provide a cleanup return function.
   - When navigating to `/publish`, the old `StreetViewPanorama` instance remains in memory holding WebGL contexts and window event listeners.
   - Upon returning to `/connections`, mounting a second `StreetViewPanorama` inside a fresh DOM node hits WebGL context limits and canvas detachment issues, rendering black.

3. **Map Overlay (`PanoramaOverlayManager`) Projection Race Condition**:
   - Because `tourStore` caches the tour in memory (`tourStore.get(tourId)`), returning to `/connections` renders the full UI on the very first frame.
   - When `overlayRef.current.updateNodes()` runs, the Google Map instance has just been instantiated, so `this.getProjection()` returns `null`.
   - In [`src/lib/PanoramaOverlayManager.ts`](file:///d:/Pano%20Publish/src/lib/PanoramaOverlayManager.ts#L210-L211), `draw()` exits immediately without scheduling a retry. Because the map only listens to `bounds_changed` (which doesn't fire if center/zoom are static), nodes and lines are never drawn.

---

### 3. Comprehensive Implementation Solution

#### Step 1: Remove Google Maps Script from `Route.head`
In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L239-L247):
- Remove the Google Maps API script from `Route.head.scripts`.
- Rely entirely on the single-instance script loader [`useGoogleMaps()`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L366-L416), which safely verifies `window.google?.maps?.StreetViewPanorama` and deduplicates DOM script injection.

#### Step 2: Add WebGL & Instance Cleanup for Street View Viewers
In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L1208-L1352):
- In the main viewer `useEffect`, add an unmount cleanup function:
  ```ts
  return () => {
    if (viewerRef.current) {
      try {
        viewerRef.current.setVisible(false);
      } catch {}
      viewerRef.current = null;
    }
  };
  ```
- In the top-right viewer `useEffect` (lines 1685–1755), ensure `rightViewerRef.current = null` and clear container references.
- In `triggerResize`, verify container dimensions and force a resize trigger (`window.google.maps.event.trigger(viewerRef.current, "resize")`) when the container attaches to DOM.

#### Step 3: Implement Projection Readiness Fallback in Overlay Manager
In [`src/lib/PanoramaOverlayManager.ts`](file:///d:/Pano%20Publish/src/lib/PanoramaOverlayManager.ts#L209-L215):
- Update `draw()` to schedule a retry if the projection is not yet computed:
  ```ts
  draw(): void {
    const projection = this.getProjection();
    if (!projection) {
      if (!this.projectionRetryTimer) {
        this.projectionRetryTimer = window.setTimeout(() => {
          this.projectionRetryTimer = null;
          this.draw();
        }, 100);
      }
      return;
    }
    if (this.projectionRetryTimer) {
      clearTimeout(this.projectionRetryTimer);
      this.projectionRetryTimer = null;
    }
    // ... rest of draw implementation
  }
  ```

#### Step 4: Map Lifecycle Listeners in `usePanoramaMap`
In [`src/hooks/usePanoramaMap.ts`](file:///d:/Pano%20Publish/src/hooks/usePanoramaMap.ts#L101-L105):
- Add listeners for Google Map `'idle'` and `'projection_changed'` events to trigger `overlayRef.current?.draw()`, ensuring markers are drawn as soon as the map finishes initial layout.

---

## Issue #2: Core Web Vitals LCP Degraded by Uncached R2 Media and Missing Hero Image Preloads

- **Status**: Open / Backlogged
- **Severity**: High (Impacting SEO rank and page load perception)
- **Impacted Routes**: `/blog/$slug`, `/tours`, `/dashboard`, `/settings`, `/clients`
- **Observed Metrics in Cloudflare Web Report**:
  - P50: 214 ms | P75: 799 ms | P90: 2,012 ms | **P99: 6,936 ms**
  - Worst Element: `panopublish.com/blog-real-estate.webp` (**18,912 ms**)
  - Tour Media Stream: `panopublish.com/api/files/...` (**5,300 ms**)
  - Map Tiles: `maps.googleapis.com/maps/vt` (**4,700 ms**)
  - Blog Camera Hero: `panopublish.com/blog-camera.webp` (**3,588 ms**)

---

### 1. Root Cause Analysis
1. **Uncached R2 File Streaming**:
   - In [`src/server.ts`](file:///d:/Pano%20Publish/src/server.ts#L164-L206), the `/api/files/*` endpoint reads raw blobs from Cloudflare R2 on every request via `bucket.get()`.
   - Although `Cache-Control: public, max-age=31536000` is returned, Cloudflare Workers do **not** automatically cache Worker subrequests at the edge unless explicitly saved into Cloudflare's Edge Cache API (`caches.default`). Every cache-miss round-trips to R2, taking 5+ seconds on high network loads.
2. **Missing Preload & Fetchpriority on Blog Hero Images**:
   - In [`src/routes/blog.$slug.tsx`](file:///d:/Pano%20Publish/src/routes/blog.$slug.tsx#L185-L194), the hero image uses `loading="eager"` but lacks `fetchpriority="high"` and lacks a `<link rel="preload">` in the server-rendered `<head>`. The browser discovers the image late in the waterfall.
3. **Google Map Base Tiles Registered as LCP Element**:
   - On tour management pages, Google Maps tiles load before tour previews settle, making Google's dynamic imagery the detected LCP node.

---

### 2. Comprehensive Implementation Solution

#### Step 1: Add Cloudflare Edge Cache API to `/api/files/*`
In [`src/server.ts`](file:///d:/Pano%20Publish/src/server.ts#L148-L207):
- Check `caches.default.match(request)` before querying R2.
- If cached, return the edge-cached response immediately (< 30ms).
- On cache miss, fetch from R2, construct the response, and call `ctx.waitUntil(cache.put(request, response.clone()))`.

#### Step 2: Inject Image Preload in Route Head
In [`src/routes/blog.$slug.tsx`](file:///d:/Pano%20Publish/src/routes/blog.$slug.tsx):
- Add `<link rel="preload" as="image" href={page.image} fetchpriority="high" />` inside `Route({ head: () => ... })`.
- Add `fetchpriority="high"` directly onto `<img src={page.image} ... />`.

---

## Issue #3: Core Web Vitals INP UI Freezes from Concurrent WebGL StreetView Canvases & Synchronous Handlers

- **Status**: Open / Backlogged
- **Severity**: High (Freezes browser main thread during user interaction)
- **Impacted Routes**: `/tours/$tourId/connections`, `/login`, `/dashboard`, `/settings`
- **Observed Metrics in Cloudflare Web Report**:
  - Overall: 84% Good, 13% Needs Improvement, 3% Poor
  - StreetView Canvas: `canvas.mapsImagerySceneScene_canvas.widget-scene-canvas` (**4,272 ms freeze**)
  - Auth Input: `#identifier` input field (**536 ms**)
  - Node Connection Plus Button: `svg.lucide-plus.stroke-[2.5]` (**376 ms**)

---

### 1. Root Cause Analysis
1. **Three Simultaneous Active WebGL Panorama Canvases**:
   - In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L1233-L1715), the main center viewer, the overlay viewer, and the top-right secondary preview viewer all run `new window.google.maps.StreetViewPanorama` concurrently.
   - When a user clicks or drags in the 360 viewer, Google's WebGL render loop and event handlers monopolize the JavaScript main thread for up to 4.27 seconds.
2. **Synchronous State Upgrades on Action Buttons**:
   - In [`connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L4418-L4427), clicking the "Align & Connect (+)" button triggers immediate re-renders and attaches secondary WebGL contexts without yielding execution frames.
3. **Synchronous Auth Keystroke / Enter Handlers**:
   - In [`src/routes/login.tsx`](file:///d:/Pano%20Publish/src/routes/login.tsx#L211-L219), form submission on the `#identifier` input triggers synchronous blocking validation on the main thread before painting the loading state.

---

### 2. Comprehensive Implementation Solution

#### Step 1: Defer and Lazily Mount Secondary StreetView Viewers
In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx):
- Do not instantiate `rightViewerRef` or `overlayViewerRef` on initial page mount.
- Instantiate secondary viewers strictly on-demand when the user clicks an align/preview action.
- Throttle heading / POV listener callbacks using `requestAnimationFrame`.

#### Step 2: Wrap Connection Actions in React `startTransition`
In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L4418-L4423):
- Wrap `setRightPendingTo` and `setPendingTo` inside `React.startTransition(() => { ... })` so the button click remains responsive with sub-50ms latency.

#### Step 3: Yield Main Thread in Auth Form
In [`src/routes/login.tsx`](file:///d:/Pano%20Publish/src/routes/login.tsx#L77-L82):
- Ensure `setLoading(true)` renders immediately before triggering async authentication calls, avoiding main-thread lockup on Enter keypress.

---

## Issue #4: Cumulative Layout Shift (CLS) Across Settings, Connections, and Tours

- **Status**: Open / Backlogged
- **Severity**: Medium (Visual jumping during page load)
- **Impacted Routes**: `/settings`, `/tours/$tourId/connections`, `/tours/$tourId`, `/dashboard`
- **Observed Metrics in Cloudflare Web Report**:
  - Connections 3-pane layout (`div.2xl:grid-cols-[20fr_60fr_20fr]...`): **CLS 0.322**
  - Settings outer flex wrapper (`div.flex.flex-col...min-h-[600px]...`): **CLS 0.271**
  - Tours photo grid wrapper (`div.flex-1.p-6`): **CLS 0.248**
  - Settings Tab Content Swap (`div.animate-fade-in.space-y-6 > div.gap-8.grid.md:grid-cols-3`): **CLS 0.180**

---

### 1. Root Cause Analysis
1. **Loading Spinner Replacement in Settings**:
   - In [`src/routes/settings.tsx`](file:///d:/Pano%20Publish/src/routes/settings.tsx#L840-L849), when `loading` is true, a small centered spinner (`py-20`) is displayed. Once data loads, it abruptly unmounts and renders the large 3-column form layout, producing a massive layout shift (CLS 0.271 + 0.180).
2. **Connections Grid Reflow on Google Maps Attachment**:
   - In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L3726), dynamic height calculations (`h-[calc(100vh-125px)]`) reflow when the header, step nav, and Google Map canvas finish rendering.
3. **Empty State to Photo Grid Abrupt Swap**:
   - In [`src/routes/tours.$tourId.index.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.index.tsx#L1053-L1069), when photos resolve, the container changes from an empty state placeholder to a multi-column photo grid without pre-allocated skeleton dimensions.

---

### 2. Comprehensive Implementation Solution

#### Step 1: Implement Wireframe Skeletons for Settings Page
In [`src/routes/settings.tsx`](file:///d:/Pano%20Publish/src/routes/settings.tsx#L840-L845):
- Replace the centered spinner with a skeleton wireframe replicating the 3-column layout and form fields (`h-10`, `h-24` skeleton boxes) with matching `min-h-[600px]`.

#### Step 2: Layout Containment on Connection Builder
In [`src/routes/tours.$tourId.connections.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.connections.tsx#L3726):
- Add CSS `contain: layout size` and reserve fixed dimensions for the sidebars and panorama containers before WebGL mounts.

#### Step 3: Photo Grid Skeleton on Tour Detail
In [`src/routes/tours.$tourId.index.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.index.tsx#L1053):
- Render a 3-column skeleton grid of photo cards while tour data is loading to stabilize container dimensions.

---

## Issue #5: Google Maps Autocomplete Crash on Choose Location Page (`Cannot read properties of undefined (reading 'Autocomplete')`)

- **Status**: Open / Backlogged
- **Severity**: High (Confuses users into believing business confirmation failed)
- **Impacted Route**: `/tours/$tourId/location` ([`src/routes/tours.$tourId.location.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.location.tsx))
- **Affects**: All users setting or resolving a business location via Place ID, CID, or Maps URL
- **Workaround**: Ignore the toast error; the business coordinates and details are still confirmed and can be saved by clicking "Save".

---

### 1. Description & Symptoms

1. User enters a Place ID (e.g. `ChIJY-sl1c1PXjkRbDRpaTT2-cY`), CID, or URL on the Choose Location page and clicks "Find".
2. The business resolves successfully: the green checkmark appears with Place ID & CID, the business name updates in the Title input, and the interactive Google Map preview card displays.
3. Immediately afterwards, a red error toast pops up: `"Cannot read properties of undefined (reading 'Autocomplete')"`.
4. Users believe the business selection was rejected or failed due to the alarming error notification.

---

### 2. Root Cause Analysis

1. **Unnecessary Effect Dependency on `[title]`**:
   - In [`src/routes/tours.$tourId.location.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.location.tsx#L140-L174), the `useEffect` that initializes the Google Places Autocomplete widget declares `[title]` in its dependency array.
   - When `handleResolveLocation` resolves the place, it calls `setTitle(resolved.name)`.
   - Updating `title` forces the Autocomplete `useEffect` to unmount and re-run.

2. **Async Script Loading Race Condition (`loading=async`)**:
   - Google Maps is loaded via `<script src="...&libraries=places&loading=async">`.
   - When `loadGoogleMaps` resolves its promise on `script.onload`, the core Maps library is available, but the `places` library is loaded dynamically in the background.
   - On the re-render triggered by `title`, `loadGoogleMaps` returns immediately, but `window.google.maps.places` is `undefined`.
   - The effect directly executes `ac = new window.google.maps.places.Autocomplete(acRef.current, ...)` without guarding `window.google.maps.places?.Autocomplete`.
   - This throws an unhandled `TypeError: Cannot read properties of undefined (reading 'Autocomplete')`.
   - The `.catch((e) => toast.error(e.message))` catches the exception and renders it as an alarming error toast.

---

### 3. Comprehensive Implementation Solution

#### Step 1: Remove `title` from Dependency Array
In [`src/routes/tours.$tourId.location.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.location.tsx#L174):
- Change the Autocomplete `useEffect` dependency array from `[title]` to `[]` (mount only), preventing redundant re-instantiations when title updates.

#### Step 2: Safe Initialization Guard & Polling / Dynamic Import
In [`src/routes/tours.$tourId.location.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.location.tsx#L140-L170):
- Verify `(window as any).google?.maps?.places?.Autocomplete` before calling constructor.
- Support `google.maps.importLibrary("places")` or a safe 50ms interval check (identical to the pattern in [`tours.new.tsx`](file:///d:/Pano%20Publish/src/routes/tours.new.tsx#L314-L319)).
- Wrap constructor in `try { ... } catch (err) { console.warn(...) }` instead of bubbling fatal toast errors to the user.

#### Step 3: Fix `loadGoogleMaps` for Already-Loaded Scripts
In [`src/routes/tours.$tourId.location.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.location.tsx#L37-L55):
- Check for existing `script[src*='maps.googleapis.com']`.
- If the script element is already loaded, resolve immediately instead of attaching an `addEventListener("load")` that will never trigger.

---

## Issue #6: Nadir Logo Upload Failure & Missing Drag-and-Drop in Publish Modal

- **Status**: Open / Backlogged
- **Severity**: High (Blocks users from branding or patching their 360 nadir prior to Google Street View publishing)
- **Impacted Route**: `/tours/$tourId/publish` ([`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx))
- **Affects**: Users attempting to upload custom Nadir logos in the Publish tab
- **Workaround**: Users can currently only use "Stretch Blur" or "None", as custom nadir upload fails or drops are ignored.

---

### 1. Description & Symptoms

1. In the **Publish to Google** page, user clicks to upload or change Nadir logo, opening the modal: *"Upload your Nadir by dragging and dropping it below. 2000px x 2000px PNG recommended"*.
2. **Dragging and dropping does nothing**: When the user drags an image onto the dashed circle, the file is not accepted; the browser may attempt to open the raw image file or ignore the drop entirely.
3. **Clicking the circle is finicky**: Inside Radix UI `Dialog`, clicking the icon or label text may fail to open the native OS file selection window.
4. **Nadir Type remains "None"**: Even if an image URL is saved to `nadir_logo_url`, the tour's `nadir_type` setting stays `"None"`, meaning the nadir patch is omitted during Google Street View publishing and preview.
5. **State Variable Mismatch**: The dropzone text and disabled prop check `uploadingLogo` (branding logo state) instead of `uploadingNadirLogo`.

---

### 2. Root Cause Analysis

1. **Missing Drag-and-Drop Event Listeners**:
   - In [`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx#L3691-L3704), the circular drop zone is a `<label>` containing an SVG and a hidden `<input type="file" />`.
   - There are **no `onDragOver` or `onDrop` handlers**. HTML5 drag and drop requires `e.preventDefault()` on dragover and custom drop file extraction.

2. **UI State Variable Mismatch**:
   - Lines 3694 & 3700 check `uploadingLogo`:
     ```tsx
     {uploadingLogo ? "Uploading..." : "Click or drag logo to upload"}
     disabled={uploadingLogo}
     ```
   - However, `handleNadirLogoUpload` (line 917) manages `uploadingNadirLogo`. Because of this variable mismatch, the UI never shows the "Uploading..." state or disables the button while uploading.

3. **Nadir Type Desynchronization**:
   - When a user uploads a Nadir logo, `handleNadirLogoUpload` updates `nadir_logo_url` in the database, but does **not** update `nadir_type` to `"Tour level"` or trigger `saveNadirSettings("Tour level", size, pos)`.
   - As a result, the tour remains configured with `nadir_type: "None"`, causing the nadir generator to skip the patch entirely.

4. **Storage RLS Risk on Uninitialized Auth State**:
   - In [`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx#L919), path is constructed as `${user?.id}/${tourId}/custom-nadir-logo-...`.
   - If `user?.id` is undefined during initial session restoration, the path begins with `undefined/...`, which immediately violates Supabase Storage RLS (`auth.uid()::text = (storage.foldername(name))[1]`) and causes an upload rejection.

---

### 3. Comprehensive Implementation Solution

#### Step 1: Implement Full HTML5 Drag-and-Drop & Explicit Click Ref
In [`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx#L3691-L3704):
- Add a file input ref (`nadirFileInputRef = useRef<HTMLInputElement>(null)`).
- Implement `onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}`.
- Implement `onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}`.
- Implement `onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) uploadNadirFile(file); }}`.
- Add an explicit `onClick={() => nadirFileInputRef.current?.click()}` to guarantee the file picker opens across all desktop browsers and Radix Dialog overlays.

#### Step 2: Unify Upload Function & Fix State Flags
In [`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx#L913-L945):
- Extract a unified `uploadNadirFile(file: File)` handler shared by both the input `onChange` and the dropzone `onDrop`.
- Verify `user?.id` exists before starting upload; prompt error if unauthenticated.
- Bind `uploadingNadirLogo` to both the upload text (`uploadingNadirLogo ? "Uploading..." : ...`) and `disabled={uploadingNadirLogo}`.

#### Step 3: Auto-switch `nadir_type` to "Tour level"
In [`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx#L930-L940):
- When a logo is successfully uploaded, automatically update the tour's `nadir_type` to `"Tour level"`:
  ```ts
  setNadirType("Tour level");
  await saveNadirSettings("Tour level", size, pos);
  ```
- This ensures the Nadir preview strip and publish pipeline immediately reflect and render the newly uploaded logo.

#### Step 4: Allow Replacing Logo When One Already Exists
In [`src/routes/tours.$tourId.publish.tsx`](file:///d:/Pano%20Publish/src/routes/tours.$tourId.publish.tsx#L3680-L3689):
- Add a "Change Logo" overlay button or click action on the preview circle so users can swap their nadir image without needing to click "Remove" first.

---

## Architectural Note: Cloudflare Workers Paid Plan Evaluation

- **Decision**: **DO NOT purchase Workers Paid ($5/mo) for frontend speed/CWV optimization.**
- **Rationale**:
  - Cloudflare Workers Paid only expands server compute limits (10M requests/month, 30s CPU time, build minutes).
  - The performance issues documented in the Cloudflare Web Report are 100% frontend and edge caching issues (uncompressed assets, un-cached Worker R2 responses, WebGL canvas CPU saturation, and un-skeletonized DOM layout shifts).
  - Paying for Workers Paid will not resolve any of the LCP, INP, or CLS issues documented above.
  - Workers Paid should only be considered if backend server invocations exceed 100,000 requests/day or if server SSR/API handlers encounter `Error 1102: Worker exceeded CPU time limit`.
