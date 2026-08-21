# PanoPublish — Brand Fact Sheet

> **Purpose:** Single copy-paste source for every directory listing, PR pitch, and GEO submission.
> All facts below are extracted from the live codebase. Fields marked **[CONFIRM]** are inferred and need your verification. Fields marked **[NEEDS INPUT]** do not exist on the site and must be supplied by you.

---

## 1. Business Identity

| Field | Value | Source |
|---|---|---|
| **Display Name** | PanoPublish | `company.ts` → `name` |
| **Legal Entity Name** | **[NEEDS INPUT]** — not published on site | — |
| **Website** | https://panopublish.com/ | `company.ts` → `url` |
| **Logo URL** | https://panopublish.com/logo.svg | `company.ts` → `logo` |
| **Support Email** | contact@panopublish.com | `company.ts` → `email`, footer |
| **Phone** | +91 6394611967 | `company.ts` → `telephone`, `format.ts` → `SUPPORT_PHONE` |
| **WhatsApp** | +91 6394611967 (Mon–Sat, 10 AM–7 PM IST) | Footer component |
| **Physical Address** | **[NEEDS INPUT]** — not published; schema uses `areaServed: "Worldwide"` | `company.ts` |
| **Service Area** | Worldwide (primary focus: India) | `company.ts` → `areaServed` |
| **Industry Category** | BusinessApplication / Virtual Tour Software | Homepage schema.org `SoftwareApplication` |
| **Language** | English | `company.ts` → `availableLanguage` |
| **Copyright Year** | 2026 | Footer: "© 2026 PanoPublish" |
| **Founding Year** | **[NEEDS INPUT]** — not published on site | — |
| **Team Size** | **[NEEDS INPUT]** — not published on site | — |
| **GSTIN** | **[NEEDS INPUT]** — not published on site | — |
| **Press Contact Email** | **[NEEDS INPUT]** — not published on site | — |

### Social Profiles (from `company.ts` → `sameAs`)

| Platform | URL |
|---|---|
| Instagram | https://www.instagram.com/panopublish |
| X (Twitter) | https://x.com/panopublish |
| YouTube | https://www.youtube.com/@panopublish |
| Facebook | https://www.facebook.com/panopublish/ |
| LinkedIn | **[NEEDS INPUT]** — not in `sameAs` array |

---

## 2. Canonical Descriptions

> Derived from existing homepage copy, meta tags, and schema.org JSON-LD.

### One-Line (≈12 words)
> India's dedicated 360° virtual tour and Google Street View publishing platform.

*Source: Footer copy + homepage hero subheading*

### 25-Word Version
> PanoPublish is India's dedicated SaaS platform for publishing 360° virtual tours to Google Maps & Street View — built for photographers, agencies, hotels, and real estate professionals.

*Source: Homepage schema.org `WebSite.description` + footer copy*

### 50-Word Version
> PanoPublish is a cloud-based SaaS platform that lets photographers, marketing agencies, hotels, and real estate professionals in India publish 360° virtual tours directly to Google Street View and Google Maps. Upload panoramas, connect scenes, brand your nadir, and go live — starting at ₹499/month with flat INR pricing, UPI payments, and WhatsApp support.

*Source: Homepage hero copy, pricing page meta, footer*

### 100-Word Version
> PanoPublish is India's dedicated Google Street View and 360° virtual tour publishing platform, purpose-built for photographers, digital marketing agencies, hotels, restaurants, gyms, schools, and real estate professionals. The platform manages the entire workflow: upload equirectangular 360° photos (up to 75 MB), auto-parse EXIF GPS metadata, connect panoramic scenes into walkable paths, apply custom nadir branding or tripod blur, and publish directly to Google Maps via API — all from a browser. Pricing starts at ₹499/month (Basic) with plans up to ₹2,999/month (Agency), billed in INR through Razorpay with UPI, cards, and net banking support. A 7-day free trial requires no credit card. PanoPublish serves clients across Ahmedabad, Rajkot, Bhavnagar, Junagadh, Surat, Mumbai, Delhi, Bangalore, and other Indian cities.

*Source: Composite of homepage copy, pricing page, schema.org SoftwareApplication, case studies cities*

---

## 3. Founder / Author

| Field | Value | Source |
|---|---|---|
| **Name** | Prashant Kumar | `authors-data.ts` |
| **Title** | 360° Virtual Tour Specialist & Founder, PanoPublish | `authors-data.ts` → `title` |
| **Experience** | 4 years | `authors-data.ts` → `years_experience` |
| **Credentials** | Google Street View Trusted Photographer; 360° Panoramic Photography Specialist; Google Maps Publishing Expert; Founder, PanoPublish | `authors-data.ts` → `credentials` |
| **LinkedIn** | **[NEEDS INPUT]** — `linkedin_url: null` in codebase | `authors-data.ts` |
| **Photo URL** | **[NEEDS INPUT]** — `photo_url: null` in codebase | `authors-data.ts` |
| **Specializations** | Google Street View Publishing, 360° Panoramic Photography, Nadir Branding & Tripod Removal, Virtual Tour Software Development, Google Maps Optimization, Multi-client Tour Management | `authors-data.ts` → `specializations` |

### Founder Bio (from site)
> Prashant Kumar is the founder of PanoPublish and a Google Street View specialist with 4 years of hands-on experience helping hotels, restaurants, gyms, schools, and real estate firms across Gujarat publish immersive 360° virtual tours on Google Maps. He has published panoramic photo spheres for clients across Ahmedabad, Rajkot, Surat, Bhavnagar, and Junagadh.

*Source: `authors-data.ts` → `bio` (first paragraph)*

---

## 4. Feature List (from site)

> Extracted from homepage features section, pricing page, and schema.org `featureList`.

| Feature | Description |
|---|---|
| **Direct Google Maps Integration** | Authorize Google OAuth once and push photos directly to Google Street View with accurate coordinates in one click |
| **360° Photo Manager** | Drag-and-drop upload of panoramic files up to 75 MB; automatic EXIF GPS parsing and heading alignment |
| **Multi-Client Workspace** | Organize agency by clients and tours; share private preview links before going public on Google Maps |
| **Custom Nadir Branding** | Hide tripods with spherical blurs or overlay custom company logo at the bottom pole of panoramas |
| **WhatsApp Support** | Rapid human assistance Mon–Sat, 10 AM–7 PM IST |
| **Secure Indian Payments** | UPI, Net Banking, credit/debit cards, EMI — all via Razorpay in INR with GST invoices |
| **Level & Island Organizer** | Group panoramas by floor level for multi-room projects |
| **Proximity Auto-linking** | Automatically connect neighboring scenes based on GPS proximity |
| **Dynamic Tile Loading** | Keeps GPU memory under 80 MB for mobile-friendly tours |
| **Custom Subdomain CNAME** | Map custom domain to PanoPublish hosting |
| **Unbranded MLS Links** | Generate white-label tour links for real estate portals |

*Sources: Homepage features grid, schema.org `featureList`, pricing page features, SEO page content*

---

## 5. Pricing Tiers (as currently published)

| | **Basic Plan** | **Pro Plan** ⭐ Most Popular | **Agency Plan** |
|---|---|---|---|
| **Price** | ₹499/month | ₹1,499/month | ₹2,999/month |
| **Annual** | ₹4,790/year (20% off) | ₹14,390/year (20% off) | ₹28,790/year (20% off) |
| **Users** | 1 active user | 3 team members | 10 team members |
| **Tours** | 5 active tours | 20 active tours | 50 active tours |
| **Photos/Tour** | 30 | 200 | Unlimited |
| **Custom Tours** | ❌ Not available | ✅ Custom Tours & 1-Click | ✅ Custom Tours & 1-Click |
| **Nadir** | Standard blur editor | Custom logo nadir branding | Custom nadir branding |
| **Street View** | Direct publishing (included) | Direct publishing + auto-linking | Direct publishing + auto-linking |
| **Support** | Email | Priority WhatsApp (IST) | Dedicated account manager |
| **Free Trial** | 7 days, no credit card | 7 days, no credit card | 7 days, no credit card |
| **Currency** | INR (Razorpay) | INR (Razorpay) | INR (Razorpay) |
| **Per-publish fees** | None | None | None |

*Source: `pricing.tsx` → `pricingPlans`, `index.tsx` → `plans`, schema.org offers*

---

## 6. Published Comparison Points vs. Competitors

> Extracted from comparison pages in `seo-pages-data.ts`. These are the claims PanoPublish has already published on its site.

### PanoPublish vs. CloudPano (`/cloudpano-alternative`)
| Feature | PanoPublish | CloudPano |
|---|---|---|
| Base Price | ₹499/mo (INR flat) | $20/mo (USD only) |
| Google Maps Exports | Unlimited (Included) | $14.99 add-on fee |
| Local Billing & UPI | Yes (Razorpay) | No (Stripe Forex only) |

### PanoPublish vs. Matterport (`/matterport-alternative`)
| Feature | PanoPublish | Matterport |
|---|---|---|
| Base Price | ₹499/mo (INR flat) | $20/mo (USD only) |
| Google Maps Exports | Unlimited (Included) | $14.99 add-on fee |
| Local Billing & UPI | Yes (Razorpay) | No (Stripe Forex only) |

### PanoPublish vs. GoThru (`/gothru-alternative`)
| Feature | PanoPublish | GoThru |
|---|---|---|
| Base Price | ₹499/mo (INR flat) | $20/mo (USD only) |
| Google Maps Exports | Unlimited (Included) | $14.99 add-on fee |
| Local Billing & UPI | Yes (Razorpay) | No (Stripe Forex only) |

### PanoPublish vs. TourBuilder (`/tourbuilder-alternative-india`)
| Feature | PanoPublish | TourBuilder |
|---|---|---|
| Base Price | ₹499/mo (INR flat) | $20/mo (USD only) |
| Google Maps Exports | Unlimited (Included) | $14.99 add-on fee |
| Local Billing & UPI | Yes (Razorpay) | No (Stripe Forex only) |

### PanoPublish vs. Panoee (`/panoee-alternative`)
| Feature | PanoPublish | Panoee |
|---|---|---|
| Base Price | ₹499/mo (INR flat) | $18/mo (USD Forex) |
| Google Street View API | Direct Automated Sync | Manual Export / Fee |
| Local Indian Payments | Yes (UPI, Razorpay) | No (Stripe Forex only) |
| Nadir Logo Overlay | Automated Nadir Disk | Manual Photoshop |
| Support Channel | WhatsApp & Email (IST) | Ticket System (US/EU) |

---

## 7. Differentiator Summary (3–5 sentences)

> Derived from the published comparison pages and homepage copy.

PanoPublish differentiates from CloudPano, Matterport, GoThru, TourBuilder, and Panoee on three key axes. **First, pricing:** PanoPublish charges flat INR monthly plans starting at ₹499/month via Razorpay (supporting UPI, cards, net banking) with zero forex surcharges, while all five competitors bill exclusively in USD through Stripe, imposing 2–4% foreign exchange markups on Indian customers. **Second, per-publish fees:** competitors like Matterport charge $14.99 per Google Street View export, whereas PanoPublish includes unlimited Google Maps publishing in every plan at no extra cost. **Third, India-specific support:** PanoPublish provides WhatsApp support during IST business hours (Mon–Sat, 10 AM–7 PM) and issues GST tax invoices — features none of the competitors offer. Additionally, PanoPublish includes browser-based automated nadir branding (tripod removal + logo overlay), which competitors like Panoee require manual Photoshop work to achieve.

---

## 8. Customer Segments & Use Cases (from published case studies and testimonials)

| Segment | Example | City | Source |
|---|---|---|---|
| Corporate Offices | Workspace tour for HR/recruiting | Ahmedabad | Case study |
| Fitness Centres / Gyms | Equipment showcase for trial sign-ups | Rajkot | Case study + testimonial |
| Universities / Schools | Campus tours for outstation admissions | Junagadh | Case study + testimonial |
| Restaurants | Dining ambience showcase for reservations | Bhavnagar | Case study + testimonial |
| Playschools | Safety & classroom showcase for parents | Ahmedabad | Case study + testimonial |
| Spas & Wellness | Premium ambience communication | Ahmedabad | Case study + testimonial |
| Hotels & Resorts | Room/lobby/pool Google Maps tours | **[CONFIRM]** — service page exists but no published case study yet | SEO page |
| Real Estate | Property listing walkthroughs for NRI buyers | **[CONFIRM]** — service page exists but no published case study yet | SEO page |
| Photography Agencies | Multi-client tour management | **[CONFIRM]** — inferred from pricing page targeting | Pricing page |

---

## 9. Cities with Published Presence

> From footer city links and case study data.

**Dedicated city landing pages:** Mumbai, Delhi, Bangalore, Ahmedabad, Hyderabad, Chennai, Pune, Jaipur, Kolkata, Surat

**Case study cities:** Ahmedabad, Rajkot, Junagadh, Bhavnagar

---

## 10. Fields You Need to Supply

| Field | Why Needed |
|---|---|
| Legal entity name | Directory submissions require it |
| Physical/registered address | Google Business Profile, Indian directories |
| Founding year | Directory profiles, press bios |
| Team size | "About" section on directories |
| GSTIN | Indian B2B directories (IndiaMART, TradeIndia) |
| Press contact email | PR pitch reply-to address |
| LinkedIn company page URL | Social profiles for directories |
| Prashant Kumar LinkedIn URL | Author/founder bio completeness |
| Prashant Kumar headshot URL | Author profile, PR, directories |
