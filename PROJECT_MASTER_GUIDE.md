# PanoPublish — Comprehensive Developer & AI Blueprint

> **Document Type**: Master Technical Specification, Application Directory, Feature Matrix & On-Page SEO Blueprint  
> **Repository Root**: `d:\Pano Publish`  
> **Production URL**: [https://panopublish.com](https://panopublish.com)  
> **Target Audience**: Human Developers, Technical Stakeholders, AI Assistants (ChatGPT, Claude, Cursor, Copilot, Gemini)  
> **Last Updated**: 2026-08-09  

---

## 1. Executive Summary & Product Vision

### What is PanoPublish?
**PanoPublish** is India's dedicated **Google Street View and 360° virtual tour publishing platform** (SaaS). It provides 360° photographers, digital marketing agencies, commercial real estate brokers, and hospitality businesses (hotels, resorts, restaurants, educational campuses) with a turn-key web suite to process, edit, link, brand, and publish equirectangular 360° panoramas directly to **Google Maps & Google Street View** and self-hosted websites.

### Key Differentiators & Value Proposition
1. **Flat Indian Rupee (INR) Pricing & UPI Support**:
   - Starter: **₹499/month**
   - Pro Agency: **₹1,499/month**
   - Enterprise: **₹3,999/month**
   - Direct Razorpay integration supporting UPI (Google Pay, PhonePe, Paytm), NetBanking, and Indian debit/credit cards. Eliminates the **3.5%+ credit card forex conversion markups** charged by USD-denominated competitors.
2. **Direct Google Street View Sync**:
   - Automated 360 panorama upload and node positioning via the official Google Street View Publish API.
   - Visual constellation & blue-line path builder to connect multi-photo virtual walk-throughs on Google Maps.
3. **Automated Nadir Branding**:
   - Automatically overlays custom circular 512x512px logo disks to conceal tripod footprints without requiring manual Adobe Photoshop / Affinity Photo edits.
4. **Privacy Blur Editor**:
   - Canvas-based tool allowing users to draw rectangular or circular blur masks over faces, license plates, and sensitive documents prior to Google Street View upload.
5. **EXIF GPS Metadata Engine**:
   - Extracts and injects GPS coordinates, compass headings, roll, pitch, and camera model metadata (Ricoh Theta Z1, Insta360 X4, GoPro MAX, DSLR panoramas stitched via PTGui).
6. **Unlimited Street View Uploads**:
   - Unlike Matterport (which charges $14.99 per Street View export fee), PanoPublish includes unlimited Google Street View uploads under standard subscription tiers.

---

## 2. Complete Technical Architecture & Tech Stack

### Tech Stack Matrix
| Component | Technology / Library | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript** | Modern component UI layer with strict type safety. |
| **Routing System** | **TanStack Router (`@tanstack/react-router`)** | File-based, strictly typed client/server routing (`src/routes/`). |
| **Data & Query State** | **TanStack Query (`@tanstack/react-query`)** | Client state caching, optimistic UI updates, background refetching. |
| **SSR / SSG Engine** | **TanStack Start (`@tanstack/react-start`)** | Full-stack server-side rendering and static prerendering framework. |
| **Build System** | **Vite 7 + `@lovable.dev/vite-tanstack-config`** | Ultra-fast HMR and optimized production bundles. |
| **Edge Hosting** | **Cloudflare Workers (`nodejs_compat`)** | Global edge runtime deployment with minimal latency. |
| **Database Tier** | **Cloudflare D1 (SQLite)** & **Supabase (Postgres)** | D1 handles high-throughput edge data; Supabase provides Auth & RLS. |
| **Object Storage** | **Cloudflare R2 (`panopublish-photos`)** | S3-compatible, zero-egress fee storage for high-res 360 photos. |
| **Styling & UI System** | **Tailwind CSS v4 + Radix UI + Sonner** | Design tokens, accessible UI primitives, toast notifications. |
| **360 VR Engines** | **Marzipano & Pannellum** | WebGL rendering engines for panoramic viewers and editors. |
| **Image Utilities** | **Jimp + JSZip + Exifr** | In-browser Nadir logo composition, EXIF metadata parsing, zip exports. |
| **Payments** | **Razorpay API (Live)** | Native INR billing (UPI, NetBanking, Cards). |

---

### Folder & File Structure

```
d:\Pano Publish\
├── public/                     # Static public assets (favicons, sitemap.xml, llms.txt, og-image.webp)
├── src/                        # Main application source code
│   ├── routes/                 # TanStack Router file-based routes
│   │   ├── __root.tsx          # Root shell layout, global SEO meta tags, fonts, GA/Clarity scripts
│   │   ├── index.tsx           # Homepage hero, features, pricing preview, interactive demo
│   │   ├── $slug.tsx           # Dynamic SEO landing pages dispatcher
│   │   ├── blog.index.tsx      # Blog list page
│   │   ├── blog.$slug.tsx      # Individual blog article page with JSON-LD schema
│   │   ├── pricing.tsx         # INR Subscription plans & Razorpay checkout integration
│   │   ├── admin.tsx           # Internal admin dashboard (testimonials, proof management)
│   │   ├── tours.index.tsx     # User 360 tour dashboard
│   │   ├── tours.new.tsx       # New tour creation modal & image uploader
│   │   ├── tours.$tourId.index.tsx        # 360 Panorama Editor & Hotspot manager
│   │   ├── tours.$tourId.connections.tsx  # Google Maps Constellation & Blue-Line builder
│   │   ├── tours.$tourId.publish.tsx      # Google Street View API publishing hub
│   │   └── authors.$slug.tsx   # EEAT Author profile pages
│   ├── components/             # Reusable UI components & dialogs
│   │   ├── BlurEditorModal.tsx # Privacy face/license plate blurring tool
│   │   ├── NadirEditor.tsx     # Tripod logo disk editor
│   │   ├── Header.tsx          # Top navigation menu with sticky CTA
│   │   ├── PublicFooter.tsx    # SEO internal linking footer matrix
│   │   └── SEO.tsx             # Dynamic route-specific meta tag manager
│   ├── lib/                    # Core business logic & data stores
│   │   ├── seo-pages-data.ts   # Core SEO pages taxonomy & content definitions
│   │   ├── cluster1-virtual-tour-software-data.ts  # Cluster 1: Software topics
│   │   ├── cluster2-google-street-view-data.ts       # Cluster 2: Street View topics
│   │   ├── cluster3-360-photography-data.ts          # Cluster 3: Hardware & Shooting topics
│   │   ├── cluster4-industry-solutions-data.ts        # Cluster 4: Vertical Industry solutions
│   │   ├── authors-data.ts     # Author bios & EEAT credentials (Prashant Kumar)
│   │   ├── case-studies-data.ts# Indian business success case studies
│   │   ├── supabase.ts         # Supabase client initializer
│   │   └── env.ts              # Runtime environment variable validation
│   ├── server.ts               # Cloudflare Worker SSR entrypoint & error handler
│   └── styles.css              # Tailwind CSS styles & custom utility classes
├── d1-schema.sql               # SQLite schema for Cloudflare D1 database (14 tables)
├── wrangler.jsonc              # Cloudflare Workers configuration (Bindings for DB, R2, Vars)
├── routes.config.cjs           # Central route collector for pre-building sitemap & prerendering
├── generate-sitemap.cjs        # Script executed before build to output public/sitemap.xml
├── prerender-routes.cjs        # Postbuild script that generates prerendered static HTML in dist/client/
└── package.json                # Project dependencies and script commands
```

---

## 3. Detailed Feature Breakdown

### 1. 360° Panorama Viewer & Hotspot Editor (`src/routes/tours.$tourId.index.tsx`)
- WebGL 360 rendering using Marzipano and Pannellum engines.
- Interactive hotspot placement (navigational scene links, info cards, external URLs).
- Equirectangular image metadata extraction (EXIF latitude/longitude, pitch, roll, compass heading).

### 2. Tripod Nadir Logo Disk Branding Tool (`src/components/NadirEditor.tsx`)
- Dynamic 512x512px circular canvas overlay.
- Custom logo upload (PNG/JPEG) with size scaling (10% - 25%), positioning, and opacity adjustment to obscure tripods automatically.

### 3. Face & License Plate Privacy Blur Editor (`src/components/BlurEditorModal.tsx`)
- Canvas-based image blurring tool allowing users to draw rectangular or circular blur masks over faces, license plates, and sensitive documents prior to Google Street View upload.

### 4. Google Maps Blue-Line Constellation Builder (`src/routes/tours.$tourId.connections.tsx`)
- Interactive Google Map interface showing photo marker pins.
- Direct node connection linking, heading calibration, spacing distance (`3m`, `5m`, `10m`), constellation grouping, and locked link toggles.

### 5. Google Street View API Publisher (`src/routes/tours.$tourId.publish.tsx`)
- Google OAuth 2.0 authorization state management (`auth.google.callback.tsx`).
- Batch upload of 360 photos to Google Street View servers.
- Auto-creation of Google Street View `photoSequence` objects and verified blue-line paths on Google Maps.
- Direct link generation to published Google Maps photo spheres.

### 6. Multi-Floor / Island Level Manager
- Organize multi-story buildings into floors (L0, L1, L2) or separate zones (islands) with custom scene titles.

### 7. Client Management Directory (`src/routes/clients.tsx`)
- Photographer client list (business name, client type, city, contact info). Assign tours to specific clients for branded delivery.

### 8. Tour Analytics Dashboard (`src/routes/tours.$tourId.analytics.tsx`)
- Views counter, scene engagement stats, geographical visitor distribution, client report exports.

### 9. INR Billing & Razorpay Subscription Checkout (`src/routes/pricing.tsx`, `src/routes/settings.tsx`)
- Starter (₹499/mo), Pro Agency (₹1,499/mo), Enterprise (₹3,999/mo).
- Razorpay direct checkout modal supporting UPI (Google Pay, PhonePe, Paytm), NetBanking, and credit/debit cards.

### 10. Internal Admin Dashboard (`src/routes/admin.tsx`, `src/routes/admin.testimonials.tsx`)
- Admin management of client WhatsApp proof screenshots, customer quotes, testimonials, and author profiles.

---

## 4. Complete Page Route Directory

### Public Marketing & Conversion Routes
- `/` (`src/routes/index.tsx`): Main landing page with hero banner, 360 interactive viewer demo, key feature matrix, INR pricing table, client logos, and WhatsApp CTA.
- `/pricing` (`src/routes/pricing.tsx`): Detailed plan breakdown (Starter ₹499/mo, Pro Agency ₹1,499/mo, Enterprise ₹3,999/mo), FAQ accordion, and Razorpay checkout buttons.
- `/blog` (`src/routes/blog.index.tsx`): Content hub indexing 150+ articles across 4 topic clusters with category filters and search bar.
- `/blog/$slug` (`src/routes/blog.$slug.tsx`): Individual blog article page with author byline, table of contents, contextual internal links, and JSON-LD `Article` schema.
- `/faq` (`src/routes/faq.tsx`): Categorized FAQ hub with expandable accordions and JSON-LD `FAQPage` schema.
- `/case-studies` (`src/routes/case-studies.index.tsx`): Showcase of real Indian business case studies (hotels, real estate, schools, gyms).
- `/case-studies/$slug` (`src/routes/case-studies.$slug.tsx`): In-depth case study article featuring client challenge, solution, tour embed, and performance metrics.
- `/authors/$slug` (`src/routes/authors.$slug.tsx`): Author bio and credentials page for Google EEAT compliance (`prashant-kumar`).
- `/contact` (`src/routes/contact.tsx`): Lead contact form, direct WhatsApp support link, office address, and support business hours (10am–7pm IST).
- `/signup` (`src/routes/signup.tsx`): Free trial user registration with email OTP verification (`pending_users`).
- `/login` (`src/routes/login.tsx`): User login page with Cloudflare D1/Supabase authentication.
- `/reset-password` (`src/routes/reset-password.tsx`): Password reset request and OTP verification form.
- `/auth/google/callback` (`src/routes/auth.google.callback.tsx`): Google OAuth 2.0 authorization callback handler for Street View publishing.
- `/terms`, `/privacy`, `/refund`: Legal policy pages detailing Terms of Service, Privacy Policy, and 7-day Refund Policy.

### High-Intent Competitor Comparison Pages
- `/matterport-alternative`: Comparison guide highlighting flat INR pricing vs Matterport's $14.99 export fees.
- `/cloudpano-alternative`: Comparison guide detailing zero USD forex charges vs CloudPano.
- `/gothru-alternative`: Comparison guide highlighting streamlined node connections vs GoThru.
- `/tourbuilder-alternative-india`: Comparison guide focusing on local Indian support & UPI payments.
- `/panoee-alternative`: Comparison guide detailing direct Google Maps sync vs Panoee.

### Core Service & Industry Pillar Pages
- `/google-street-view-publishing`: Hero service page for Google Maps photo sphere publishing.
- `/360-virtual-tour-publishing-platform`: WebGL 360 tour editor platform overview.
- `/real-estate-virtual-tour-software`: Real estate walk-through solution page.
- `/nadir-branding-street-view`: Tripod logo disk removal feature page.
- `/virtual-tour-client-management-software`: Agency client dashboard feature page.
- Vertical industry landing pages for Hotels (`/google-street-view-for-hotels-india`), Restaurants (`/google-street-view-restaurant-india`), Universities, and Gyms.

### Local City SEO Landing Pages
- `/google-street-view-publishing-mumbai` (Mumbai)
- `/360-virtual-tour-software-delhi` (Delhi)
- `/street-view-tour-publishing-bangalore` (Bangalore)
- `/360-tour-publishing-ahmedabad` (Ahmedabad)
- `/google-maps-360-tour-hyderabad` (Hyderabad)
- Additional landing pages for Pune, Chennai, Kolkata, Jaipur, Surat.

### Authenticated Application Routes (Protected Dashboard)
- `/dashboard` (`src/routes/dashboard.tsx`): Main user dashboard showing active tours, publish status, client summary, and storage usage.
- `/tours` (`src/routes/tours.index.tsx`): List of user's 360 virtual tours with filter controls (Draft, Published, In Progress).
- `/tours/new` (`src/routes/tours.new.tsx`): Step 1 tour creation form and multi-photo equirectangular upload dropzone.
- `/tours/$tourId` (`src/routes/tours.$tourId.index.tsx`): Interactive 360 Panorama Editor, hotspot manager, nadir logo picker, and floor organizer.
- `/tours/$tourId/connections` (`src/routes/tours.$tourId.connections.tsx`): Interactive Google Map blue-line constellation builder for linking panorama nodes.
- `/tours/$tourId/publish` (`src/routes/tours.$tourId.publish.tsx`): Google Street View API sync control center (OAuth status, batch upload, publish log, live link viewer).
- `/tours/$tourId/location` (`src/routes/tours.$tourId.location.tsx`): Tour address, Google Place ID lookup, and CID mapping.
- `/tours/$tourId/analytics` (`src/routes/tours.$tourId.analytics.tsx`): Individual tour view count metrics and performance breakdown.
- `/clients` (`src/routes/clients.tsx`): Agency client management page (add, edit, assign tours).
- `/settings` (`src/routes/settings.tsx`): Profile settings, subscription plan details, Razorpay upgrade buttons, custom branding logo upload.
- `/admin` (`src/routes/admin.tsx`): Internal admin dashboard for managing testimonials and proof images.

---

## 5. Comprehensive On-Page SEO Blueprint

PanoPublish is optimized following **Google Search Central (2026)** standards, Search Engine Optimization (SEO) best practices, and Generative Engine Optimization (GEO) principles.

### 1. Dynamic Meta Titles & Meta Descriptions (`src/components/SEO.tsx`)
- **Title Tag Pattern**: `[Primary Keyword] — PanoPublish` (e.g. `Google Street View Publishing Software in Mumbai — PanoPublish`).
- **Meta Description Pattern**: 150-160 characters incorporating intent keywords and actionable CTAs (`"Publish 360° virtual tours to Google Maps in minutes. Built for Indian agencies. Start free!"`).
- **Self-Referencing Canonical Tags**: `<link rel="canonical" href="https://panopublish.com/[path]" />` injected on 100% of public routes.

### 2. Social Meta Cards (Open Graph & Twitter)
- `og:title`, `og:description`, `og:type` (`website` / `article`), `og:site_name` (`PanoPublish`), `og:url`.
- `og:image` (`https://panopublish.com/og-image.webp` - 1200x630px webp).
- `twitter:card` (`summary_large_image`), `twitter:site` (`@PanoPublish`), `twitter:image`.

### 3. Semantic Heading Hierarchy (H1 - H3 Structure)
- **Single H1 Rule**: Strictly one `<h1>` per page containing the primary targeted topic keyword.
- **H2 & H3 Flow**: Subsections broken down into semantic `<h2>` and `<h3>` elements to optimize for Google AI Overview snippets.

### 4. Static HTML Prerendering (SSG/SSR Pipeline)
- **Problem Solved**: React SPAs normally output empty HTML tags (`<div id="root"></div>`) requiring client-side JS rendering.
- **PanoPublish Solution**: Postbuild script `prerender-routes.cjs` pre-renders all **183 public routes** into static `.html` files in `dist/client/`. Crawlers receive complete HTML content instantly.

### 5. Rich JSON-LD Structured Data (Schema.org)
- **`SoftwareApplication`**: Defines SaaS category (`MultimediaApplication`), OS compatibility, and INR pricing.
- **`Organization` / `LocalBusiness`**: Declares company entity, logo, website, and target market (India).
- **`FAQPage`**: Injected on `/faq` and key service pages for expandable Google search accordions.
- **`Article` & `Person`**: Injected on `/blog/*` articles pointing to author profile `/authors/prashant-kumar`.
- **`BreadcrumbList`**: Injected across all deep routes to render navigation paths in search engine result pages.

### 6. Content Topic Clusters & Internal Link Graph (`internal_linking_strategy.md`)
- **Wheel-and-Spoke Link Architecture**: Pillar articles link out to spoke topics; spoke articles link back to pillars, `/pricing`, and `/signup`.
- **4 Primary Topic Clusters**:
  1. Virtual Tour Software (25 articles)
  2. Google Street View Publishing (25 articles)
  3. 360 Photography & Cameras (25 articles)
  4. Industry Vertical Solutions (25 articles)
- **Crawl Depth Limit**: 100% of public routes are reachable within **2 clicks** from the homepage. Zero orphan pages.

### 7. EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) Signals
- **Author Bylines**: Every blog post features an author byline linking to `/authors/prashant-kumar` (Certified Google Street View Specialist with 500+ published photo spheres).
- **First-Party Empirical Insights**: Photography guides reference real equipment parameters (Ricoh Theta Z1 RAW bracketing, PTGui control points, 1.5m tripod height).
- **Transparent Pricing**: Detailed comparison pages demonstrating flat INR costs vs Matterport $14.99 per export fees.

### 8. Core Web Vitals & Asset Performance
- **Preconnect Hints**: `<link rel="preconnect" href="https://fonts.googleapis.com">` and `https://fonts.gstatic.com`.
- **Non-blocking Analytics**: Google Analytics (`gtag`) loaded asynchronously; Microsoft Clarity injected post-hydration.
- **Deferred WebGL Libraries**: Marzipano and Pannellum WebGL assets are strictly route-isolated to `/tours/$tourId/*` to prevent blocking landing page load speeds.

---

## 6. Key Questions & Answers for Developers & AI Models

### Q: How do I run the app locally?
```bash
npm run dev
# Starts Vite dev server with hot-module replacement
```

### Q: How does the production build and pre-rendering work?
```bash
npm run build
# Step 1: Runs generate-sitemap.cjs -> Creates public/sitemap.xml
# Step 2: Runs vite build -> Generates dist/client and dist/server bundles

npm run postbuild
# Runs prerender-routes.cjs -> Pre-renders static index.html files for all 183 public routes in dist/client/
```

### Q: Where is the database schema defined?
The database schema is defined in `d1-schema.sql` (SQLite for Cloudflare D1) and contains 14 tables.

### Q: How is payment processed?
Payments are processed via Razorpay API in Indian Rupees (INR). Frontend integration is in `src/routes/pricing.tsx` and `src/routes/settings.tsx`.

---

## 7. Summary of Links & Documentation Files
- **Master Guide (Root)**: [PROJECT_MASTER_GUIDE.md](file:///d:/Pano%20Publish/PROJECT_MASTER_GUIDE.md)
- **Master Guide (Public)**: [public/PanoPublish_Master_Guide.md](file:///d:/Pano%20Publish/public/PanoPublish_Master_Guide.md)
- **LLM Summary**: [public/llms.txt](file:///d:/Pano%20Publish/public/llms.txt)
- **Full LLM Text**: [public/llms-full.txt](file:///d:/Pano%20Publish/public/llms-full.txt)
- **Official Website**: [https://panopublish.com](https://panopublish.com)
