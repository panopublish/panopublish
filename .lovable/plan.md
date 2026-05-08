
# TourVista — Multi-Feature Build Plan

This is a large request. I'll group it into 6 work units and ship in order. A few decisions need your confirmation before I start.

---

## Decisions I need from you

1. **Razorpay keys** — You pasted a `key_id` (`rzp_test_Sklddd7CxuK0pV`) and a `key_secret` (`IjJsZeqX1gi3H0rHMFlRR9pH`).
   - The `key_secret` is sensitive and **must not** sit in chat or in client code. I'll store both via the Cloud secrets vault as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` so only server functions read them. Please re-enter them in the secure form when prompted.
   - **Heads up:** you just shared the secret in plain chat. After this is done, rotate it in the Razorpay dashboard and re-add the new one.

2. **Google Maps / Places API key** — needed for Choose Location + Build Connections map. Do you already have one? I'll wire `VITE_GOOGLE_MAPS_API_KEY` and gracefully render a "Add your Google Maps key" placeholder until it's set.

3. **Google Street View Publish OAuth** — real publishing needs a Google Cloud OAuth client with the `streetviewpublish` scope, which you must create yourself in Google Cloud Console (not available via Lovable Cloud's managed Google auth). For now I'll build the **Publish UI + simulated/mocked publish flow** with status transitions in the DB. Confirm: ship as **mock for now**, real OAuth in a later pass? (Recommended.)

4. **Pannellum** — load via CDN `<script>` in `index.html` is fine, but TanStack Start uses `__root.tsx`'s `head()` for scripts. I'll inject it there. OK?

---

## Work units (in build order)

### 1. Razorpay secrets (5 min)
- Add `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` via secrets tool.
- Update billing UI placeholder to read `RAZORPAY_KEY_ID` (publishable) from a server function.
- No Razorpay checkout flow yet — that's a separate task.

### 2. 360° Photo Grid + Scene Viewer Modal (Flat tab only)
- Refactor `src/routes/tours.$tourId.tsx` photo grid:
  - 4-col desktop / 2-col mobile, square cards.
  - Scene-number badge (top-left), red X delete (top-right), filename below, download (bottom-left), droplet/nadir toggle (bottom-right).
  - Trailing green "+" card to upload more.
  - Hover overlay + scale.
- New `SceneViewerModal` component with tabs Flat / 360° / RAW / Google, prev/next chevrons, Esc to close, scene-number badge, label.
- Flat tab: plain `<img>`. 360°/RAW/Google: stub content (will fill in next steps).

### 3. Pannellum 360° Viewer
- Add Pannellum CSS+JS via `__root.tsx` `head()`.
- 360° tab mounts a `<div ref>`, calls `window.pannellum.viewer(...)` with the equirectangular config, shows loading spinner, destroys on tab change / scene change / modal close.
- RAW tab: filename, size, GPS, upload date overlay.
- Google tab: copy-only message.
- Tab selection persists across prev/next.

### 4. Choose Location page
- New route `src/routes/tours.$tourId.location.tsx` (or step inside existing wizard — I'll add a new dedicated route and link from the wizard).
- Title input, search bar with Google Places Autocomplete, OR + CID input.
- Result line with Place ID, CID, "verify on Google Maps" link.
- Google Maps embed (`@vis.gl/react-google-maps` or raw iframe — I'll use the JS API loader for autocomplete).
- Saves `google_place_id`, `cid`, `latitude`, `longitude`, `name` to `tours`.
- Migration: add `latitude double precision`, `longitude double precision` to `tours` (cid + place_id already exist).
- Graceful fallback when `VITE_GOOGLE_MAPS_API_KEY` is missing (shows setup instructions).

### 5. Build Connections page
- New route `src/routes/tours.$tourId.connections.tsx`.
- Migration: create `connections` table (`id`, `user_id`, `tour_id`, `from_photo_id`, `to_photo_id`, `heading`, `pitch`, `created_at`) + RLS.
- Split layout: left 35% map + name input, right 65% scene list with "+", auto-align checkbox + slider, large preview of selected scene, bottom status legend.
- Top toolbar: 5-step progress nav + Save/Undo/Share/Forward icons.

### 6. Publish to Google page
- New route `src/routes/tours.$tourId.publish.tsx`.
- Top bar: owner email + Nadir Type / Size / Pos dropdowns.
- White card: heading, banner strip, big Publish button, simple CSS conveyor animation on right.
- Confirm modal → simulated per-scene progress → updates `photos.status` (`uploaded` → `processing` → `published`).
- "Connect Google Account" button is a stub that toasts "Real OAuth coming soon."
- Status legend strip at bottom.

---

## Technical notes
- All new routes wrapped in `AppShell` with breadcrumbs.
- Design tokens only (no raw `bg-black`, etc.) — I'll add `--scene-badge`, `--scene-delete` tokens if needed.
- Two migrations total (tours columns + connections table).
- No edge functions needed yet (Razorpay checkout / real OAuth are deferred).

---

**Please confirm:**
1. Mock the Publish-to-Google flow for now? (Y/N)
2. Do you have a Google Maps API key ready, or should I ship with the placeholder/setup instructions? (Have key / Placeholder)
3. Approve plan and proceed?
