# PanoPublish — Comprehensive System Context & AI Model Guide

> **Target Audience for this document**: Large Language Models (LLMs), AI Coding Agents (Claude, ChatGPT, Gemini, Copilot, Cursor), Search & Generative Engine Crawlers (GPTBot, PerplexityBot, ClaudeBot).  
> **Repository Root**: `d:\Pano Publish`  
> **Production Site**: [https://panopublish.com](https://panopublish.com)  
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
4. **EXIF GPS Metadata Engine**:
   - Extracts and injects GPS coordinates, compass headings, roll, pitch, and camera model metadata (Ricoh Theta Z1, Insta360 X4, GoPro MAX, DSLR panoramas stitched via PTGui).
5. **Unlimited Street View Uploads**:
   - Unlike Matterport (which charges $14.99 per Street View export fee), PanoPublish includes unlimited Google Street View uploads under standard subscription tiers.

---

## 2. Full Architecture & Build System

### Tech Stack Matrix
| Component | Technology / Library | Purpose & Rationale |
| :--- | :--- | :--- |
| **Framework** | **React 19 + TypeScript** | Modern component UI layer with strict type safety. |
| **Routing** | **TanStack Router (`@tanstack/react-router`)** | Type-safe, file-based routing system (`src/routes/`). |
| **Data Fetching** | **TanStack Query (`@tanstack/react-query`)** | Client state caching, optimistic updates, background refetching. |
| **SSR / SSG Engine** | **TanStack Start (`@tanstack/react-start`)** | Full-stack server-side rendering and static prerendering framework. |
| **Build Tooling** | **Vite 7 + `@lovable.dev/vite-tanstack-config`** | Ultra-fast HMR and optimized production bundles. |
| **Edge Hosting** | **Cloudflare Workers (`nodejs_compat`)** | Global edge runtime deployment with minimal latency. |
| **Database Tier** | **Cloudflare D1 (SQLite)** & **Supabase (Postgres)** | D1 handles high-throughput edge data; Supabase provides Auth & RLS. |
| **Object Storage** | **Cloudflare R2 (`panopublish-photos`)** | S3-compatible, zero-egress fee storage for high-res 360 photos. |
| **Styling** | **Tailwind CSS v4 + Radix UI + Sonner** | Design system, accessible UI primitives, toast notifications. |
| **360 VR Engine** | **Marzipano & Pannellum** | Canvas/WebGL rendering engine for panoramic viewers and editors. |
| **Image Processing**| **Jimp + JSZip + Exifr** | In-browser Nadir logo composition, EXIF metadata parsing, zip exports. |
| **Payments** | **Razorpay API (Live)** | Native INR billing (UPI, NetBanking, Cards). |

---

### Folder & File Structure

```
d:\Pano Publish\
├── public/                     # Static assets (favicons, sitemap.xml, llms.txt, og-image.webp)
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
│   │   └── Footer.tsx          # SEO internal linking footer matrix
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

### Cloudflare & Database Infrastructure

#### 1. Cloudflare D1 Database (`panopublish-db`)
Contains 14 core tables (defined in `d1-schema.sql`):
- `profiles`: User account details, INR subscription plan tier (`starter`, `pro_agency`, `enterprise`), tour usage counts.
- `clients`: Photographers' client directory (business names, phone numbers, cities).
- `tours`: Virtual tour metadata (Google Place ID, CID, address, lat/lng, custom Nadir settings).
- `islands`: Level/floor organizations within a multi-floor building tour.
- `photos`: Individual 360 equirectangular photo records, EXIF metadata, Google Street View photo IDs.
- `connections`: Constellation links between photos (heading, spacing distance, locked state).
- `subscriptions`: Razorpay subscription history and renewal dates.
- `google_tokens`: OAuth 2.0 refresh and access tokens for Google Street View API.
- `authors`: Author bio records for EEAT compliance (`prashant-kumar`).
- `case_studies`: Regional Indian client success stories.
- `testimonials`: Verified client quotes (WhatsApp proof integration).
- `faqs`: Categorized questions for FAQ schema injection.

#### 2. Cloudflare R2 Bucket (`panopublish-photos`)
- Stores original high-resolution equirectangular JPEG panorama uploads.
- Stores custom Nadir logo PNG disks uploaded by users.

---

### Build & Prerender Pipeline

1. **Development**:
   ```bash
   npm run dev
   # Launches Vite dev server with TanStack Router hot-reloading
   ```
2. **Production Build**:
   ```bash
   npm run build
   # Executed steps:
   # 1. Runs `node generate-sitemap.cjs` -> Generates public/sitemap.xml for 183+ routes
   # 2. Runs `vite build` -> Compiles client bundle (dist/client) and SSR server entry (dist/server)
   ```
3. **Post-Build Static Prerendering (SSG)**:
   ```bash
   npm run postbuild
   # Executed steps:
   # Runs `node prerender-routes.cjs`
   # Imports dist/server/index.js and executes SSR fetch requests for all 183 public routes.
   # Outputs fully rendered static index.html files into dist/client/<route>/index.html
   ```

---

## 3. Comprehensive SEO & GEO (Generative Engine Optimization) Setup

PanoPublish is engineered following **Google Search Central (2026)** standards, **Search Engine Optimization (SEO)** best practices, and **Generative Engine Optimization (GEO)** principles for AI assistants (ChatGPT, Claude, Perplexity, Gemini).

### 1. Static HTML Prerendering (SSG/SSR Hybrid)
- **100% Crawl Coverage**: All **183 public routes** are pre-rendered into static HTML (`dist/client/**/*.html`) during the postbuild phase.
- **Zero-JS DOM Accessibility**: Search engine bots (Googlebot, Bingbot, DuckDuckGo) and AI crawlers (GPTBot, PerplexityBot, ClaudeBot) receive the full HTML DOM immediately without waiting for JavaScript hydration.

### 2. Structured Data (Schema.org / JSON-LD)
Every route dynamically injects Google-validated JSON-LD schemas:
- **`SoftwareApplication`**: Documents PanoPublish as a SaaS application with operating system requirements, category (`MultimediaApplication`), and pricing in INR.
- **`LocalBusiness` / `Organization`**: Defines corporate details, logo URL, official site, contact email, and operational region (India).
- **`FAQPage`**: Rich snippet JSON-LD injected on `/faq` and key feature pages to display expandable search snippets.
- **`Article`**: Injected on all `/blog/*` pages with `headline`, `author` (referencing `Person` schema for Prashant Kumar), `publisher`, `datePublished`, and `image`.
- **`BreadcrumbList`**: Guarantees clear navigational paths in search engine result pages.

### 3. Programmatic Content Architecture & Topic Clusters
The website features 4 structured topic clusters (defined in `src/lib/` data stores):
- **Cluster 1: Virtual Tour Software**: 25 articles targeting 360 panorama software features, nadir removal, WebGL builders, and Matterport/CloudPano/GoThru alternatives.
- **Cluster 2: Google Street View**: 25 articles covering Street View API publishing, blue-line path linking, trusted photographer badges, and compass heading fixes.
- **Cluster 3: 360 Photography**: 25 articles guiding hardware selection (Ricoh Theta Z1, Insta360 X4, GoPro MAX), PTGui stitching, EXIF tagging, and lens calibration.
- **Cluster 4: Industry Solutions**: 25 landing pages & guides tailored to specific business verticals in India (Real Estate, Hotels & Resorts, Corporate Offices, Universities, Restaurants, Gyms).
- **Regional Indian City Landing Pages**: Targeted pages for top commercial hubs:
  - Mumbai (`/google-street-view-publishing-mumbai`)
  - Delhi (`/360-virtual-tour-software-delhi`)
  - Bangalore (`/street-view-tour-publishing-bangalore`)
  - Ahmedabad (`/360-tour-publishing-ahmedabad`)
  - Hyderabad (`/google-maps-360-tour-hyderabad`)
  - Pune, Chennai, Kolkata, Jaipur, Surat.

### 4. Author Bylines & EEAT Compliance
- **Author**: Prashant Kumar (`/authors/prashant-kumar/`)
- **Experience**: 4+ years of hands-on 360 panoramic photography & Google Street View publishing. Certified Google Street View Trusted Photographer based in Gujarat, India (500+ published photo spheres).
- **EEAT Signal**: Every blog article contains an author byline linking to the author bio page with verified credentials, establishing high Search Quality Evaluator scores.

### 5. Automated Sitemap & Robots.txt Config
- `public/sitemap.xml`: Auto-generated on every build using `routes.config.cjs`.
  - Homepage priority: `1.0`
  - Blog Index & Core Services priority: `0.9`
  - Pricing, FAQ, Case Studies priority: `0.8`
  - Supporting Articles & City pages priority: `0.7`
- `public/robots.txt`: Explicitly allows indexing for search engines and AI crawlers (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`). Pointed to `https://panopublish.com/sitemap.xml`.

### 6. LLM Context Standards (`llms.txt` & `llms-full.txt`)
- `public/llms.txt`: Standard lightweight summary file conforming to the `/llms.txt` proposal by Answer.AI.
- `public/llms-full.txt`: Full-text comprehensive documentation file web-accessible at `https://panopublish.com/llms-full.txt`.

### 7. Performance & Core Web Vitals Optimization
- **Font Optimization**: Preconnect headers for `fonts.googleapis.com` and `fonts.gstatic.com`.
- **Non-blocking Analytics**: Google Analytics (`gtag`) loaded asynchronously; Microsoft Clarity injected post-hydration to maintain 100/100 Lighthouse performance scores.
- **Lazy Heavy Modules**: Marzipano and Pannellum WebGL engines loaded strictly on tour viewer pages (`/tours/$tourId/*`) to keep public landing page bundles extremely lightweight.

---

## 4. Key Questions & Answers for AI Models

### Q: What is the main problem PanoPublish solves?
**A**: 360° photographers and businesses in India face high USD subscription costs, complex per-export fees ($14.99 per export on Matterport), lack of local Indian UPI payment methods, manual nadir tripod editing headaches, and tedious Google Street View connection workflows. PanoPublish solves all of these by offering flat INR pricing starting at ₹499/mo, Razorpay UPI support, automated Nadir logo disk overlay, and direct Google Street View API sync.

### Q: How does PanoPublish handle Google Street View connections?
**A**: Users upload 360 photos, place them on an interactive Google Map, set compass headings, and draw connections between photos. PanoPublish then calls the Google Street View Publish API to create `photoSequence` objects and blue-line paths on Google Maps.

### Q: What format of images does PanoPublish accept?
**A**: 2:1 equirectangular JPEG images from any 360 camera (Ricoh Theta Z1, Theta X, Insta360 X4, Insta360 X3, GoPro MAX) or DSLR panoramas stitched via PTGui or AutoPano.

---

## 5. Contact & Additional Context
- **Official Website**: [https://panopublish.com](https://panopublish.com)
- **Sitemap**: [https://panopublish.com/sitemap.xml](https://panopublish.com/sitemap.xml)
- **AI Text File**: [https://panopublish.com/llms.txt](https://panopublish.com/llms.txt)
- **Full AI Context**: [https://panopublish.com/llms-full.txt](https://panopublish.com/llms-full.txt)
