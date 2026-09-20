# PanoPublish — Comprehensive Developer, System Architecture & AI Blueprint

> **Document Type**: Master Technical Specification, Application Directory, Feature Matrix, SEO Blueprint & AI Prompt Guide  
> **Repository Root**: `d:\Pano Publish`  
> **Production URL**: [https://panopublish.com](https://panopublish.com)  
> **Target Audience**: Human Developers, Technical Stakeholders, and AI Coding Assistants (ChatGPT, Claude, Cursor, Copilot, Gemini)  
> **Primary Purpose**: Upload this single file to any LLM/AI to provide complete, authoritative context on the codebase, architecture, business logic, feature implementations, and development conventions.  
> **Last Updated**: 2026-09-20  

---

## 1. Executive Summary & Product Vision

### What is PanoPublish?
**PanoPublish** is India's dedicated **Google Street View and 360° virtual tour publishing platform** (SaaS). It provides 360° photographers, digital marketing agencies, commercial real estate firms, and hospitality businesses (hotels, resorts, restaurants, educational institutions) with an end-to-end web suite to process, edit, link, brand, and publish equirectangular 360° panoramas directly to **Google Maps / Google Street View** as well as exporting self-hosted **Custom Virtual Tours** (WebGL).

### Key Differentiators & Value Proposition
1. **Flat Indian Rupee (INR) Pricing & Native UPI**:
   - Starter: **₹499/month** (up to 5 active tours)
   - Pro Agency: **₹1,499/month** (up to 25 active tours)
   - Enterprise: **₹3,999/month** (unlimited tours)
   - Pay As You Go Extra Credits: Available directly inside Settings for additional tour publish capacity.
   - 7-Day Free Trial: Includes 1 active credit and a 15-photo limit to test the full pipeline risk-free.
   - Native Razorpay integration supporting UPI (Google Pay, PhonePe, Paytm), NetBanking, and RuPay/Visa/Mastercard debit and credit cards. Eliminates the **3.5%+ foreign exchange markups** charged by USD-denominated competitors.
2. **Direct Google Street View Sync with Browser Streaming**:
   - Official Google Street View Publish API integration with automated binary streaming upload directly from client browser to Google's upload endpoints, eliminating server memory bottlenecks and 503 gateway errors.
   - Auto-injection of official **Google Photo Sphere (GPano) XMP metadata** and strict 2:1 equirectangular aspect ratio enforcement.
   - Visual constellation & blue-line path builder with automatic heading calibration and inter-node spacing.
3. **Turn-Key Custom Virtual Tour Studio**:
   - 1-click **Push to Custom Tour** cloning engine.
   - Offline ZIP package export with self-contained HTML, CSS, JavaScript, and WebGL assets powered by Marzipano.
   - Mobile WebGL optimization with smart 1024x1024 CubeGeometry tiles to eliminate black screens on mobile GPUs while preserving 8K desktop rendering.
   - 8 custom interactive hotspot icons (Forward, Chevron, Door, Room, Lift, Stairs, Info, Website) with popovers and links.
   - Categorized scene navigation tags and ambient background audio presets.
4. **Automated Nadir Branding**:
   - Dynamically overlays circular 512x512px custom logo disks or blur patches onto the nadir (tripod footprint) during editing, export, and Google publishing.
5. **Canvas Privacy Blur Editor**:
   - In-browser canvas tool allowing users to draw rectangular or circular blur masks over faces, license plates, and sensitive documents prior to publishing.
6. **Unlimited & Predictable Publishing**:
   - Unlike Matterport (which charges $14.99 per Street View export fee) and CloudPano, PanoPublish provides predictable, cost-effective Indian pricing without hidden fees.

---

## 2. Complete Technical Architecture & Tech Stack

### Tech Stack Matrix
| Component | Technology / Library | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript** | Modern component UI layer with strict type safety. |
| **Routing System** | **TanStack Router (`@tanstack/react-router`)** | File-based, strictly typed client/server routing (`src/routes/`). |
| **Data & Query State** | **TanStack Query (`@tanstack/react-query`)** | Client state caching, optimistic UI updates, and background refetching. |
| **SSR / SSG Engine** | **TanStack Start (`@tanstack/react-start`)** | Full-stack server-side rendering and static prerendering framework. |
| **Build System** | **Vite 7 + `@cloudflare/vite-plugin`** | Ultra-fast HMR and optimized production bundles for Cloudflare Workers. |
| **Edge Hosting** | **Cloudflare Workers (`nodejs_compat`)** | Global edge runtime deployment with minimal latency and high availability. |
| **Database Tier** | **Cloudflare D1 (SQLite)** & **Supabase (Postgres)** | D1 handles high-throughput edge data; Supabase provides Auth & Edge Functions. |
| **Object Storage** | **Cloudflare R2 (`panopublish-photos`)** | S3-compatible, zero-egress fee storage for high-res 360 photos. |
| **Email Delivery** | **Resend API** | Transactional emails (OTP verification, password resets) and admin marketing broadcasts. |
| **Styling & UI System** | **Tailwind CSS v4 + Radix UI + Lucide** | Design tokens, accessible UI primitives, modern icon set, Sonner toasts. |
| **360 VR Engines** | **Marzipano & Pannellum** | WebGL rendering engines for panoramic viewers, hotspot placement, and custom tours. |
| **Image & EXIF Utilities** | **`xmp-injector.ts` + Jimp + JSZip + Exifr** | GPano XMP injection, EXIF GPS parsing, nadir logo composition, offline zip packing. |
| **Payments** | **Razorpay API (Live)** | Native INR billing (UPI, NetBanking, Cards) and subscription webhooks. |

---

## 3. Project Directory & File Structure

```
d:\Pano Publish\
├── public/                                # Static public assets
│   ├── favicon.svg & favicon.png          # Crisp blue gradient brand favicons
│   ├── panopublish-logo.svg               # Header logo with exact typography & badge
│   ├── sitemap.xml                        # Auto-generated XML sitemap (193 routes)
│   ├── llms.txt & llms-full.txt           # Standardized AI documentation feeds
│   ├── og-image.webp                      # 1200x630 Open Graph share card
│   └── PanoPublish_Master_Guide.md        # Publicly accessible master guide copy
├── src/                                   # Main application source code
│   ├── routes/                            # TanStack Router file-based routes
│   │   ├── __root.tsx                     # Root layout, meta tags, preconnects, Clarity/GA
│   │   ├── index.tsx                      # Homepage hero, demo viewer, pricing, video
│   │   ├── $slug.tsx                      # Dynamic SEO landing page dispatcher
│   │   ├── blog.index.tsx                 # Blog archive (150+ articles, search & category filters)
│   │   ├── blog.$slug.tsx                 # Blog article page with author byline & Article schema
│   │   ├── pricing.tsx                    # INR subscription pricing & Razorpay checkout
│   │   ├── contact.tsx                    # Contact form, direct WhatsApp CTA, office info
│   │   ├── faq.tsx                        # Categorized FAQ hub with FAQPage schema
│   │   ├── case-studies.index.tsx         # Real Indian business case studies
│   │   ├── case-studies.$slug.tsx         # Detailed case study breakdown
│   │   ├── authors.$slug.tsx              # EEAT Author profile pages (Prashant Kumar)
│   │   ├── dashboard.tsx                  # User dashboard (tours, status, credit quota)
│   │   ├── tours.index.tsx                # Tour list with filter controls & search
│   │   ├── tours.new.tsx                  # Tour creation wizard & multi-photo uploader
│   │   ├── tours.$tourId.index.tsx        # 360 Panorama Editor & Hotspot placement
│   │   ├── tours.$tourId.connections.tsx  # Google Maps Blue-Line Constellation Builder
│   │   ├── tours.$tourId.publish.tsx      # Google Street View API Publishing Hub
│   │   ├── tours.$tourId.location.tsx     # Google Places, Place ID & CID resolver
│   │   ├── tours.$tourId.analytics.tsx    # Tour view metrics & scene analytics
│   │   ├── clients.tsx                    # Agency client management directory
│   │   ├── settings.tsx                   # User profile, branding, billing & pay-as-you-go credits
│   │   ├── admin.tsx                      # Internal admin control center (email, storage, users)
│   │   ├── admin.testimonials.tsx         # Testimonial & WhatsApp proof screenshot manager
│   │   ├── login.tsx & signup.tsx         # Authentication & OTP verification
│   │   └── reset-password.tsx             # Forgot password and OTP reset
│   ├── components/                        # Reusable UI components & dialogs
│   │   ├── AppSidebar.tsx                 # Collapsible compact icon rail & mobile slide-over
│   │   ├── AppShell.tsx                   # Authenticated application shell layout
│   │   ├── PublicHeader.tsx               # Responsive landing header with mobile drawer
│   │   ├── PublicFooter.tsx               # Multi-column SEO internal linking matrix
│   │   ├── LazyThumbnail.tsx              # IntersectionObserver thumbnail with fallback auto-recovery
│   │   ├── BlurEditorModal.tsx            # In-browser face & license plate blurring canvas
│   │   ├── NadirEditor.tsx                # Tripod nadir logo disk branding editor
│   │   ├── SEO.tsx                        # Dynamic route-level SEO & Open Graph meta tags
│   │   ├── WhatsAppButton.tsx             # Floating WhatsApp support launcher
│   │   └── ui/                            # Radix UI primitives (dialog, dropdown, toast, tabs)
│   ├── lib/                               # Core business logic, APIs & data stores
│   │   ├── xmp-injector.ts                # Google Photo Sphere (GPano) XMP injection engine
│   │   ├── custom-tour-converter.ts       # 1-Click Push to Custom Tour cloning logic
│   │   ├── custom-tour-exporter.ts        # Standalone WebGL custom tour HTML/JS zip exporter
│   │   ├── nadir-processor.ts             # Canvas nadir logo baking & blur processor
│   │   ├── PanoramaOverlayManager.ts      # Hotspot & directional arrow overlay engine
│   │   ├── d1-server.ts                   # Cloudflare D1 SQLite database client & operations
│   │   ├── functions-server.ts            # Server-side edge functions & utilities
│   │   ├── auth-server.ts                 # Session tokens, password hashing, and OAuth
│   │   ├── google-places.ts               # Google Places Autocomplete, CID & Place ID lookup
│   │   ├── seo-pages-data.ts              # Core SEO landing pages & cluster definitions
│   │   ├── cluster1-virtual-tour-software-data.ts # Cluster 1: Software topics
│   │   ├── cluster2-google-street-view-data.ts    # Cluster 2: Street View topics
│   │   ├── cluster3-360-photography-data.ts       # Cluster 3: Photography & Camera topics
│   │   ├── cluster4-industry-solutions-data.ts     # Cluster 4: Industry vertical topics
│   │   ├── cloudpano-alternative-data.ts  # CloudPano competitor comparison data
│   │   ├── panoee-alternative-data.ts     # Panoee competitor comparison data
│   │   ├── tourbuilder-alternative-data.ts# TourBuilder competitor comparison data
│   │   └── authors-data.ts                # Author bios & EEAT credentials
│   ├── server.ts                          # Cloudflare Worker SSR entrypoint
│   └── styles.css                         # Tailwind CSS v4 styling & utility rules
├── d1-schema.sql                          # SQLite schema for Cloudflare D1 (14+ tables)
├── wrangler.jsonc                         # Cloudflare Workers configuration (D1, R2, env vars)
├── routes.config.cjs                      # Central route manifest (193 public routes)
├── generate-sitemap.cjs                   # Pre-build script outputting public/sitemap.xml
├── prerender-routes.cjs                   # Post-build script pre-rendering 193 static HTML pages
└── package.json                           # NPM dependencies and script commands
```

---

## 4. Deep-Dive on Core Systems & Features

### 1. Google Street View Publishing Pipeline (`src/routes/tours.$tourId.publish.tsx`)
The publishing pipeline delivers automated, zero-error uploads to Google Maps:
- **GPano XMP Injection (`src/lib/xmp-injector.ts`)**:
  - The Google Street View Publish API strictly enforces `GPano:UsePanoramaViewer="True"`, `GPano:ProjectionType="equirectangular"`, and exact 2:1 aspect ratios.
  - PanoPublish inspects every JPEG binary stream and automatically injects Adobe XMP APP1 packets containing valid Google Photo Sphere GPano tags and recalibrated dimensions before upload.
- **Direct Client Browser Streaming**:
  - Panoramas stream directly from the user's browser to Google's upload endpoints via binary `PUT` requests, eliminating Cloudflare Worker 503 timeouts and memory limits.
- **Real-Time Byte Progress**:
  - Displays live upload byte counters and continuous percentage completion for high-resolution images.
- **Intelligent Rate-Limit Pacing & Backoff**:
  - Protects against Google's per-minute quota limits using 25-second cooldown intervals, 1.2-second inter-scene delays, and exponential retry backoff.
  - Reliably publishes large commercial tours with 80+ scenes without dropping nodes.
- **Tour Reset & Batch Deletion**:
  - Implements `photos:batchDelete` with automatic retries to clean up published scenes on Google Maps when a tour is reset or republished.
- **Credit Enforcement & Quota Tracking**:
  - Verifies subscription plan limits and pay-as-you-go extra credits before publishing. Deducts credits upon publication and tracks lifetime published tour count even if tours are later deleted.

### 2. Google Maps Blue-Line Constellation Builder (`src/routes/tours.$tourId.connections.tsx`)
- **TourBuilder Workspace Layout**:
  - Full-screen workspace with a compact icon-rail sidebar and maximized interactive canvas.
  - Enlarged interactive mini-map occupying 54% height with satellite/roadmap toggles and marker clustering.
- **Lag-Free 360 Viewer**:
  - Rotation state updates are debounced and overlay nodes are cached to eliminate viewer stutter.
  - Direct DOM compass manipulation ensures instantaneous heading feedback.
- **Floor / Island Level Manager**:
  - Supports multi-story structures (L0, L1, L2) or distinct property zones.
  - Fully supports single-image levels and seamless cross-floor hotspot linking.
- **Batch Operations**:
  - Auto-sort photos by filename, invert connection directions, batch link nodes, and adjust distance spacing (`3m`, `5m`, `10m`).
  - Connect (+) and remove (-) node buttons remain permanently visible on scene cards for rapid editing.

### 3. Custom Virtual Tour Studio & Offline Exporter (`src/lib/custom-tour-exporter.ts` & `custom-tour-converter.ts`)
- **1-Click "Push to Custom Tour"**:
  - Clones any existing Google Maps tour into a standalone Custom Tour with duplicated photo records, converted connections, and scene tags.
- **Offline ZIP Package Generation**:
  - Exports a completely self-contained ZIP archive containing:
    - `index.html`: Responsive tour shell with fullscreen, audio, and scene selector controls.
    - `style.css`: Glassmorphic styling tokens and hotspot beacon animations.
    - `marzipano.js`: Bundled WebGL panorama viewer runtime.
    - `tiles/`: Multi-resolution spherical image tiles.
- **Mobile WebGL Optimization**:
  - Employs 1024x1024 `CubeGeometry` tile slicing and dynamic mobile canvas downscaling to guarantee 100% stable rendering on iOS Safari and Android Chrome GPUs without black screen crashes.
  - Preserves pristine, uncompressed 8K resolution on desktop screens.
- **Deep Zoom Engine**:
  - Custom Marzipano FOV controller unlocking deep zoom in (down to 5° FOV) and wide-angle zoom out (up to 140° FOV) across mouse wheel, touch pinch, and on-screen controls.
- **8 Custom Hotspot Icons**:
  - Forward, Chevron, Door, Room, Lift, Stairs, Info, and Website.
  - Includes interactive info cards, custom destination scene tooltips, and clickable external website links with new-tab redirection.
- **Ambient Background Audio**:
  - 5 copyright-free soothing ambient background tracks with live preview player and volume controls.
- **Branding & Logo Overlays**:
  - Top-left header logo with custom destination URL and bottom nadir disk branding baked into the export.

### 4. Tripod Nadir Logo & Privacy Blur Editors
- **Nadir Branding Tool (`src/components/NadirEditor.tsx`)**:
  - Dynamic 512x512px circular canvas overlay.
  - Allows custom logo upload (PNG/JPEG) with scaling (10%–25%), vertical positioning, and opacity adjustment to conceal tripod footprints.
  - Baked directly into panorama tiles during export and publish.
- **Privacy Blur Tool (`src/components/BlurEditorModal.tsx`)**:
  - Canvas-based image blurring tool allowing users to draw rectangular or circular blur masks over faces, license plates, and sensitive documents prior to Google Street View upload.

### 5. Billing, Subscription & Credit Lifecycle
- **Subscription Tiers**:
  - **Starter**: ₹499/month (up to 5 active tours)
  - **Pro Agency**: ₹1,499/month (up to 25 active tours)
  - **Enterprise**: ₹3,999/month (unlimited tours)
- **Pay As You Go Extra Credits**:
  - Users can purchase standalone tour publish credits in Settings without changing their base plan.
- **Free Trial Guardrails**:
  - 7-day trial period with 1 active credit.
  - Maximum 15 photos per trial tour. Credits automatically expire to 0 after 7 days.
- **Lifecycle Management**:
  - Accurate tracking of subscription renewal and expiration dates displayed directly under the "Cancel Subscription" section in Settings.
  - Automatic quota replenishment upon successful Razorpay recurring payment verification.

### 6. Admin Panel & Operational Tools (`src/routes/admin.tsx`)
- **1-Click Marketing Email Broadcast**:
  - Select recipient segments (All Users, Free Trial, Expired, Paid Customers) and dispatch rich HTML email announcements via Resend API.
- **Cloudflare R2 Orphaned Storage Cleanup**:
  - Scans R2 storage against active database photos to detect and purge orphaned blobs, freeing up storage while strictly preserving active tours and profiles.
- **User Impersonation**:
  - Admins can instantly log in as any user to inspect issues, troubleshoot tour configurations, or assist clients in real time.
- **Credit Overrides**:
  - Manage and adjust user credits directly (admin accounts automatically granted 9999 credits).
- **Testimonials & Social Proof Manager**:
  - Upload, edit, and categorize WhatsApp proof screenshots, ratings, and customer quotes for display on marketing pages.

### 7. Responsive UI & Navigation Systems
- **Desktop & Mobile Consistency**:
  - Authenticated layout features a compact icon rail on desktop (`src/components/AppSidebar.tsx`) and an animated slide-over drawer on mobile viewports.
  - Public marketing layout (`src/components/PublicHeader.tsx`) features a responsive mobile hamburger menu with direct navigation to features, pricing, blog, and login.
- **LazyThumbnail Component (`src/components/LazyThumbnail.tsx`)**:
  - Uses `IntersectionObserver` to defer off-screen thumbnail loading, combined with `fallbackSrc` auto-recovery to prevent grey placeholder boxes.

---

## 5. Complete Page Route Directory (193 Public Routes)

### Static Public Pages (11 Routes)
- `/` (`src/routes/index.tsx`): Main landing page with hero banner, 360 interactive viewer demo, key feature matrix, INR pricing table, client logos, and WhatsApp CTA.
- `/pricing/` (`src/routes/pricing.tsx`): Detailed plan breakdown (Starter ₹499/mo, Pro Agency ₹1,499/mo, Enterprise ₹3,999/mo), FAQ accordion, and Razorpay checkout buttons.
- `/blog/` (`src/routes/blog.index.tsx`): Content hub indexing 150+ articles across 4 topic clusters with category filters and search bar.
- `/faq/` (`src/routes/faq.tsx`): Categorized FAQ hub with expandable accordions and JSON-LD `FAQPage` schema.
- `/case-studies/` (`src/routes/case-studies.index.tsx`): Showcase of real Indian business case studies (hotels, real estate, schools, gyms).
- `/contact/` (`src/routes/contact.tsx`): Lead contact form, direct WhatsApp support link, office address, and support business hours (10am–7pm IST).
- `/signup/` (`src/routes/signup.tsx`): Free trial user registration with email OTP verification (`pending_users`).
- `/login/` (`src/routes/login.tsx`): User login page with Cloudflare D1/Supabase authentication.
- `/terms/`, `/privacy/`, `/refund/`: Legal policy pages detailing Terms of Service, Privacy Policy, and 7-day Refund Policy.

### High-Intent Competitor Comparison Pages
- `/matterport-alternative/`: Comprehensive breakdown of flat INR pricing vs Matterport's $14.99 export fees.
- `/cloudpano-alternative/`: Cost comparison detailing zero USD forex charges vs CloudPano.
- `/gothru-alternative/`: Comparison guide highlighting streamlined node connections vs GoThru.
- `/tourbuilder-alternative-india/`: Detailed comparison focusing on local Indian support, UPI, and stability.
- `/panoee-alternative/`: Feature comparison detailing direct Google Maps sync vs Panoee.

### Core Service & Industry Flagship Pages
- `/google-street-view-publishing/`: Flagship product landing page with interactive workflow and specifications.
- `/360-virtual-tour-publishing-platform/`: WebGL 360 tour editor platform overview.
- `/real-estate-virtual-tour-software/`: Real estate walk-through solution page.
- `/nadir-branding-street-view/`: Tripod logo disk removal feature page.
- `/virtual-tour-client-management-software/`: Agency client dashboard feature page.
- Vertical industry landing pages for Hotels, Restaurants, Universities, Hospitals, and Gyms.

### Local City SEO Landing Pages
- Dedicated pages for Mumbai, Delhi, Bangalore, Ahmedabad, Hyderabad, Pune, Chennai, Kolkata, Jaipur, Surat, etc.

### Dynamic Content Routes
- `/blog/$slug/` (`src/routes/blog.$slug.tsx`): 150+ long-form articles with author byline, table of contents, and JSON-LD `Article` schema.
- `/case-studies/$slug/` (`src/routes/case-studies.$slug.tsx`): In-depth business case studies with client challenge, solution, and tour embed.
- `/authors/$slug/` (`src/routes/authors.$slug.tsx`): Author bio and credentials page for Google EEAT compliance (`prashant-kumar`).

### Authenticated Application Routes (Protected Dashboard)
- `/dashboard`: User overview of active tours, publish status, client summary, and storage quota.
- `/tours`: User virtual tour listing with search and status filters (Draft, Published, In Progress).
- `/tours/new`: Step 1 tour creation wizard and multi-photo equirectangular upload dropzone.
- `/tours/$tourId`: 360 Panorama Editor, hotspot manager, nadir logo picker, and floor organizer.
- `/tours/$tourId/connections`: Google Maps blue-line constellation builder for linking panorama nodes.
- `/tours/$tourId/publish`: Google Street View API sync control center (OAuth, batch upload, logs, links).
- `/tours/$tourId/location`: Tour address, Google Place ID lookup, and CID mapping.
- `/tours/$tourId/analytics`: Individual tour view count metrics and performance breakdown.
- `/clients`: Agency client management page (add, edit, assign tours).
- `/settings`: Profile settings, subscription plan details, Razorpay upgrade buttons, custom branding logo upload.
- `/admin`: Internal admin dashboard for managing testimonials and proof images.

---

## 6. Comprehensive On-Page SEO & GEO Blueprint

PanoPublish is optimized following **Google Search Central (2026)** standards, Search Engine Optimization (SEO) best practices, and Generative Engine Optimization (GEO) principles.

1. **Dynamic Meta Titles & Descriptions (`src/components/SEO.tsx`)**:
   - Title pattern: `[Primary Keyword] — PanoPublish`.
   - Meta descriptions: 150–160 characters incorporating intent keywords and actionable CTAs.
   - Self-referencing canonical tags strictly normalized with trailing slashes across 100% of public routes.
2. **Static HTML Prerendering (SSG Pipeline)**:
   - Post-build script `prerender-routes.cjs` pre-renders all **193 public routes** into static `.html` files in `dist/client/`. Search engine bots and AI crawlers receive complete, hydrated HTML content instantly without waiting for JavaScript execution.
3. **Rich JSON-LD Structured Data (Schema.org)**:
   - `SoftwareApplication`: Defines SaaS category (`MultimediaApplication`), OS compatibility, and INR pricing.
   - `Organization` / `LocalBusiness`: Declares company entity, logo, website, and Indian market focus.
   - `FAQPage`: Injected on `/faq/` and key service pages for rich Google search snippet accordions.
   - `Article` & `Person`: Injected on `/blog/*` articles pointing to author profile `/authors/prashant-kumar/`.
   - `BreadcrumbList`: Injected across deep routes for hierarchical SERP navigation trails.
4. **Wheel-and-Spoke Topic Clusters**:
   - Cluster 1: Virtual Tour Software (25+ articles)
   - Cluster 2: Google Street View Publishing (25+ articles)
   - Cluster 3: 360 Photography & Hardware (25+ articles)
   - Cluster 4: Vertical Industry Solutions (25+ articles)
   - All public pages are reachable within **2 clicks** from the homepage. Zero orphan pages.
5. **EEAT Compliance**:
   - First-party empirical insights from founder Prashant Kumar (Certified Google Street View Specialist with 500+ published photo spheres).
   - Real hardware references (Ricoh Theta Z1 RAW bracketing, Insta360 X4, PTGui stitching, tripod nodal points).

---

## 7. Cloudflare D1 Database Schema Reference

The primary relational database is Cloudflare D1 (SQLite-compatible) defined in `d1-schema.sql`:

1. **`profiles`**: User metadata, plan (`trial`, `starter`, `pro`, `enterprise`), credits integer, trial expiration date, billing cycle tracking, dark mode preference, contact and branding URLs.
2. **`clients`**: Agency client records (name, business type, city, phone, address).
3. **`tours`**: Virtual tour records (`type`: `gmaps` or `custom`, status, address, Google Place ID, CID, nadir configuration, coordinates, published flag, custom settings JSON).
4. **`islands`**: Multi-floor / zone management (`level_number`, `level_name`, `show_scene_names`).
5. **`photos`**: Individual 360 panorama scenes (`file_url`, `file_path`, coordinates, heading, pitch, roll, capture time, `streetview_photo_id`, `streetview_status`, `thumbnail_url`, view counter).
6. **`connections`**: Inter-node links (`from_photo_id`, `to_photo_id`, heading, spacing, locked flag, constellation name, metadata JSON).
7. **`constellations`**: Named groupings of linked photo nodes.
8. **`subscriptions`**: Razorpay subscription tracking (`plan`, `status`, `razorpay_subscription_id`, `start_date`, `end_date`, `amount_inr`).
9. **`google_tokens`**: User Google OAuth 2.0 access and refresh tokens for Street View publishing.
10. **`coupons`**: Discount coupons and promotional codes.
11. **`users` & `pending_users`**: Native email/password authentication records with salt, hash, and verification status.
12. **`email_verification_tokens` & `password_reset_tokens`**: Time-limited OTP codes for account authentication.
13. **`authors`**: Team credentials and author bio profiles for EEAT schema.
14. **`case_studies`**: Client project breakdowns, challenge, solution, and results metrics.
15. **`testimonials` & `whatsapp_proofs`**: Client testimonials, star ratings, and screenshot proof assets.

---

## 8. Developer Operations & Build Commands

### Local Development Server
```bash
npm run dev
# Starts Vite dev server with hot-module replacement (HMR)
```

### Production Build & Prerendering Pipeline
```bash
npm run build
# Step 1: Runs generate-sitemap.cjs -> Generates public/sitemap.xml for 193 routes
# Step 2: Runs vite build -> Produces optimized dist/client and dist/server bundles

npm run postbuild
# Runs prerender-routes.cjs -> Prerenders all 193 public routes into static HTML in dist/client/
```

### Preview Production Build
```bash
npm run preview
# Runs local preview of the production bundle
```

---

## 9. Instructions for AI Assistants (Prompt Injection Manual)

When working on this repository or generating code based on this guide, AI models must strictly adhere to the following conventions:

1. **Tech Stack Discipline**:
   - Use **React 19**, **TypeScript**, and **Tailwind CSS v4**.
   - Use **TanStack Router** conventions for routing (`src/routes/`). Do not introduce `react-router-dom`.
   - For backend database calls, use the existing Cloudflare D1 helpers (`src/lib/d1-server.ts`) or Supabase client (`src/lib/supabase.ts`) depending on context.
2. **Google Street View Publishing Integrity**:
   - Never remove or bypass `xmp-injector.ts`. Google Street View **will reject** any equirectangular panorama lacking GPano XMP headers or deviating from a 2:1 aspect ratio.
   - Always maintain the direct browser-to-Google binary streaming architecture. Do not route heavy photo binary uploads through Cloudflare Workers.
   - Retain pacing delays (25s quota cooldown, 1.2s inter-scene pacing) when publishing 80+ scenes.
3. **Custom Tour Export Rules**:
   - When modifying `custom-tour-exporter.ts`, ensure that mobile WebGL tile slicing (1024x1024 `CubeGeometry`) and dynamic canvas downscaling remain intact. Do not feed raw 8K uncompressed textures directly to mobile WebGL contexts.
4. **URL & SEO Standards**:
   - All public routes **must end with a trailing slash** (e.g., `/blog/`, `/pricing/`, `/matterport-alternative/`). Do not strip trailing slashes, as this causes redirect loops and hurts SEO indexation.
   - Every public page must have a single `<h1>` tag and use the `<SEO />` component.
5. **No Placeholders**:
   - Avoid placeholder code, dummy buttons without handlers, or fake pricing. Use the actual INR tiers (₹499, ₹1,499, ₹3,999) and real features documented in this guide.

---

## 10. Summary of Reference Links
- **Master Guide (Root)**: [PROJECT_MASTER_GUIDE.md](file:///d:/Pano%20Publish/PROJECT_MASTER_GUIDE.md)
- **Public Master Guide**: [public/PanoPublish_Master_Guide.md](file:///d:/Pano%20Publish/public/PanoPublish_Master_Guide.md)
- **LLM Summary**: [public/llms.txt](file:///d:/Pano%20Publish/public/llms.txt)
- **Full LLM Context**: [public/llms-full.txt](file:///d:/Pano%20Publish/public/llms-full.txt)
- **Production Website**: [https://panopublish.com](https://panopublish.com)
