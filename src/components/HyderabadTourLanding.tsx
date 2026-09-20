import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import {
  Check,
  ArrowRight,
  Sparkles,
  MapPin,
  Camera,
  Compass,
  Layers,
  Shield,
  Eye,
  ExternalLink,
  ChevronDown,
  Building2,
  Hotel,
  UtensilsCrossed,
  Stethoscope,
  Dumbbell,
  ShoppingBag,
  GraduationCap,
  PartyPopper,
  Home,
  Scissors,
  HelpCircle,
  Clock,
  Coins,
  Cpu,
  Share2,
  Maximize2,
  CheckCircle2,
  ArrowUpRight,
  Users,
  Info,
  Layers2
} from "lucide-react";
import type { SeoPageData } from "@/lib/seo-pages-data";

export function HyderabadTourLanding({ page }: { page: SeoPageData }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<"L0" | "L1" | "L2">("L0");

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Google Maps 360° Virtual Tour in Hyderabad", url: "https://panopublish.com/google-maps-360-tour-hyderabad/" },
  ];

  // Verified live Street View embed from actual published tour in PanoPublish repository
  const demoTourEmbedUrl =
    "https://www.google.com/maps/embed?pb=!4v1785152624861!6m8!1m7!1sCAoSHENJQUJJaEFUaXhZa0lRWlZDMDNVdGFRZXFab08.!2m2!1d23.04305185803523!2d72.54822581434127!3f110.51!4f-7.849999999999994!5f0.7820865974627469";

  const businessCategories = [
    {
      title: "Restaurants & Cafés",
      icon: UtensilsCrossed,
      benefit: "Showcase dining ambiance, family seating, outdoor terraces, and private banquet sections to increase table reservations.",
      areas: "Jubilee Hills, Banjara Hills, Gachibowli",
    },
    {
      title: "Hotels & Resorts",
      icon: Hotel,
      benefit: "Allow guests and business travelers to inspect lobby grandeur, deluxe room interiors, banquet halls, and amenities.",
      areas: "HITEC City, Financial District, Shamshabad",
    },
    {
      title: "Clinics & Healthcare",
      icon: Stethoscope,
      benefit: "Build patient trust by presenting clean diagnostic suites, sterile waiting areas, consultation rooms, and accessibility.",
      areas: "Somajiguda, Begumpet, Jubilee Hills",
    },
    {
      title: "Gyms & Fitness Studios",
      icon: Dumbbell,
      benefit: "Display workout floors, premium cardio machines, strength zones, and locker facilities to convert fence-sitters.",
      areas: "Madhapur, Kondapur, Kukatpally",
    },
    {
      title: "Retail Showrooms & Boutiques",
      icon: ShoppingBag,
      benefit: "Guide shoppers through designer clothing aisles, jewelry counters, electronics displays, and luxury merchandise.",
      areas: "Banjara Hills, Abids, Himayatnagar",
    },
    {
      title: "Corporate Offices & Coworking",
      icon: Building2,
      benefit: "Attract enterprise tenants, tech talent, and remote recruits with modern workstation walkthroughs and meeting rooms.",
      areas: "HITEC City, Madhapur, Gachibowli",
    },
    {
      title: "Schools, Colleges & Academies",
      icon: GraduationCap,
      benefit: "Provide parents and prospective outstation students with interactive tours of classrooms, science labs, and sports arenas.",
      areas: "Gachibowli, Kompally, Secunderabad",
    },
    {
      title: "Event & Wedding Venues",
      icon: PartyPopper,
      benefit: "Give wedding planners and families a realistic sense of banquet hall dimensions, stage setup, and guest capacity.",
      areas: "Gandipet, Shamshabad, Kompally",
    },
    {
      title: "Real Estate & Commercial Units",
      icon: Home,
      benefit: "Allow NRI buyers and corporate investors to inspect floor plans, architectural finishes, and property views remotely.",
      areas: "Tellapur, Kokapet, Financial District",
    },
    {
      title: "Salons & Luxury Spas",
      icon: Scissors,
      benefit: "Convey hygienic standards, private treatment rooms, salon stations, and relaxing lounge atmosphere.",
      areas: "Jubilee Hills, Banjara Hills, Kondapur",
    },
  ];

  const processSteps = [
    {
      step: "01",
      title: "Capture",
      desc: "Mount your 360° camera (Ricoh Theta Z1, Insta360 X4, or DSLR with fisheye) on a panoramic tripod at human eye level (~1.5m). Capture bracketed HDR panoramas spaced 3–5 meters apart along natural sight lines.",
      icon: Camera,
    },
    {
      step: "02",
      title: "Prepare",
      desc: "Stitch the imagery into clean 2:1 equirectangular JPEGs. In PanoPublish, apply automated nadir tripod branding (512x512px logo disk or blur) and privacy-blur any faces or vehicle license plates.",
      icon: Shield,
    },
    {
      step: "03",
      title: "Position",
      desc: "Upload images to PanoPublish. Built-in EXIF parsing extracts GPS coordinates and compass headings automatically. Refine map pin placements against your building footprint in the visual editor.",
      icon: Compass,
    },
    {
      step: "04",
      title: "Connect",
      desc: "Draw navigational connections between adjacent scenes. The system calculates true-North yaw offsets and validates 3m–5m inter-node distances to guarantee smooth Google blue-line pathing.",
      icon: Share2,
    },
    {
      step: "05",
      title: "Review",
      desc: "Test the complete walk-through in the interactive 360° viewer. Verify transition angles, line of sight, and floor level groupings before pushing live to Google Street View.",
      icon: Eye,
    },
    {
      step: "06",
      title: "Publish",
      desc: "Click Publish. PanoPublish injects official GPano XMP headers and streams the binary data directly to Google's Street View endpoints. Google indexes and renders the tour live within 24–48 hours.",
      icon: CheckCircle2,
    },
  ];

  const costFactors = [
    {
      factor: "Property Size & Footprint",
      why: "Larger square footage requires more camera setups to maintain unbroken lines of sight between rooms.",
      example: "A 1,200 sq.ft clinic (6–10 shots) vs. a 35,000 sq.ft convention center (40–60+ shots).",
    },
    {
      factor: "Number of Viewpoints",
      why: "Each individual panorama requires physical setup, exposure bracketing, stitching, node linking, and inspection.",
      example: "Independent single-room studio vs. multi-section showroom with private offices.",
    },
    {
      factor: "Floors & Architectural Levels",
      why: "Multi-level buildings require floor-by-floor level management, staircase linking, and elevator transitions.",
      example: "Single-level restaurant vs. 3-story boutique hotel with rooftop terrace.",
    },
    {
      factor: "Lighting & HDR Complexity",
      why: "Spaces with strong contrast (e.g. bright glass windows alongside dark interior booths) require multi-bracket HDR fusion.",
      example: "Evenly lit retail supermarket vs. atmospheric fine-dining restaurant.",
    },
    {
      factor: "Nadir & Privacy Processing",
      why: "Concealing tripod legs with branded client logo disks and blurring sensitive patient records or vehicle plates.",
      example: "Basic nadir blur vs. custom circular logo disk design and extensive privacy masking.",
    },
    {
      factor: "Travel & Multi-Day Staging",
      why: "Logistics, travel across Hyderabad districts, and staging outside customer operating hours (e.g., early morning shoots).",
      example: "Central Jubilee Hills venue vs. distant suburban campus in Medchal or Shamshabad.",
    },
    {
      factor: "Publishing Platform & Software",
      why: "Legacy tools charge expensive per-export fees ($14.99 per upload). PanoPublish provides unlimited uploads under flat INR pricing.",
      example: "Saving ₹10,000+ per month on software export markups for active agency portfolios.",
    },
  ];

  const verifiedFeatures = [
    {
      title: "Direct Google Street View Publish API",
      desc: "Native OAuth 2.0 integration uploading photo spheres and path constellations directly to Google Maps.",
    },
    {
      title: "Browser Binary Streaming",
      desc: "High-resolution panoramas stream directly from browser to Google endpoints, preventing 503 timeout errors.",
    },
    {
      title: "GPano XMP Header Injection",
      desc: "Automatically injects official Google Photo Sphere XMP tags and verifies strictly 2:1 equirectangular geometry.",
    },
    {
      title: "Visual Blue-Line Constellation Builder",
      desc: "Interactive Google Maps interface for connecting photo nodes, calibrating compass yaw, and setting spacing.",
    },
    {
      title: "Multi-Floor Level Manager (Islands)",
      desc: "Organize large properties into distinct floors (L0, L1, L2) with seamless vertical staircase and elevator links.",
    },
    {
      title: "Automated Nadir Branding & Blur",
      desc: "Conceal tripod legs with 512x512px circular client logo disks or smart stretch blurs without opening Photoshop.",
    },
    {
      title: "In-Browser Privacy Blur Canvas",
      desc: "Draw rectangular or circular masks to blur customer faces, license plates, and sensitive documents before upload.",
    },
    {
      title: "Agency Client Directory",
      desc: "Organize tours into client folders, manage permissions, and generate private client preview links for sign-off.",
    },
    {
      title: "Tour View Analytics",
      desc: "Track panorama view counts, scene engagement stats, and geographical viewer distributions over time.",
    },
    {
      title: "Custom WebGL Tour Exporter",
      desc: "1-Click converter generating offline, self-hosted ZIP packages powered by Marzipano with custom hotspot icons.",
    },
    {
      title: "Google Places & Place ID Lookup",
      desc: "Search registered Hyderabad businesses by name to resolve Place IDs, CID numbers, and map coordinates instantly.",
    },
    {
      title: "Domestic INR Billing & UPI",
      desc: "Pay in Indian Rupees via Razorpay with UPI (GPay, PhonePe), NetBanking, and GST tax invoices. Zero forex fees.",
    },
  ];

  const localDistricts = [
    { name: "Banjara Hills & Jubilee Hills", desc: "Fine dining, luxury boutiques, aesthetic clinics, and art galleries." },
    { name: "HITEC City & Madhapur", desc: "Global IT campuses, tech startups, coworking spaces, and modern cafes." },
    { name: "Gachibowli & Financial District", desc: "Business hotels, financial institutions, and corporate sports complexes." },
    { name: "Kondapur & Kukatpally", desc: "Commercial showrooms, fitness studios, multi-cuisine restaurants, and retail malls." },
    { name: "Begumpet & Somajiguda", desc: "Healthcare clinics, diagnostic centers, jewelry showrooms, and office parks." },
    { name: "Secunderabad & Himayatnagar", desc: "Established heritage retail, coaching academies, banquet venues, and hotels." },
  ];

  // Comprehensive Structured Data Schemas
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      url: "https://panopublish.com/google-maps-360-tour-hyderabad.webp",
      contentUrl: "https://panopublish.com/google-maps-360-tour-hyderabad.webp",
      caption: "Google Maps 360° virtual tour in Hyderabad",
      width: 1536,
      height: 864,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://panopublish.com/google-maps-360-tour-hyderabad/#webpage",
      url: "https://panopublish.com/google-maps-360-tour-hyderabad/",
      name: "Google Maps 360° Virtual Tour in Hyderabad | PanoPublish",
      description: page.description,
      inLanguage: "en-IN",
      isPartOf: {
        "@type": "WebSite",
        "@id": "https://panopublish.com/#website",
        name: "PanoPublish",
        url: "https://panopublish.com/",
      },
      about: {
        "@type": "Service",
        name: "Google Maps 360 Virtual Tour Publishing in Hyderabad",
        serviceType: "Virtual Tour Software & Google Street View Publishing",
        areaServed: {
          "@type": "City",
          name: "Hyderabad",
          addressRegion: "Telangana",
          addressCountry: "IN",
        },
        provider: {
          "@type": "Organization",
          name: "PanoPublish",
          url: "https://panopublish.com/",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "PanoPublish",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web Browser",
      url: "https://panopublish.com/",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: "499",
        highPrice: "3999",
        offerCount: "3",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs?.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })) || [],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <SEO
        title={page.title}
        description={page.description}
        canonical="https://panopublish.com/google-maps-360-tour-hyderabad/"
        breadcrumbs={breadcrumbs}
        ogImage="https://panopublish.com/google-maps-360-tour-hyderabad.webp"
        schema={schemas}
      />

      <PublicHeader />

      <main className="flex-1">
        {/* SECTION 1: HERO */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 bg-slate-950 text-white border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.18),transparent_55%)] pointer-events-none" />
          <div className="absolute top-1/2 left-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

          <div className="container relative mx-auto px-4 max-w-5xl">
            <div className="flex flex-col items-center text-center gap-5">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 text-xs font-semibold text-sky-300">
                <MapPin className="h-3.5 w-3.5 text-sky-400" /> Hyderabad Local Business & Photographer Resource
              </span>

              {/* EXACT SINGLE H1 */}
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight font-serif leading-[1.15] max-w-4xl">
                Google Maps 360° Virtual Tour in Hyderabad
              </h1>

              <p className="text-lg md:text-2xl text-sky-200/90 font-medium max-w-2xl font-serif">
                Let customers explore your business before they visit.
              </p>

              <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                Connected 360° panoramas give potential customers an interactive way to explore restaurants, hotels, clinics, showrooms, offices, gyms, schools, event venues, and commercial properties across Hyderabad.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-4">
                <Link to="/signup/">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/95 text-white font-bold px-8 h-12 shadow-lg shadow-primary/30 transition-all hover:translate-y-[-1px]"
                  >
                    Start 7-Day Free Trial
                  </Button>
                </Link>
                <a href="#interactive-demo">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-700 text-slate-100 hover:bg-slate-900 font-semibold px-6 h-12"
                  >
                    <Eye className="h-4 w-4 mr-2 text-sky-400" /> Explore a 360° Tour
                  </Button>
                </a>
              </div>

              {/* FEATURED HERO IMAGE */}
              <div className="mt-8 w-full max-w-4xl mx-auto">
                <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-900/60 p-2 md:p-3 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-transparent to-primary/10 pointer-events-none" />
                  <picture className="block w-full aspect-[16/9] rounded-xl md:rounded-2xl overflow-hidden relative">
                    <source
                      media="(max-width: 640px)"
                      srcSet="/google-maps-360-tour-hyderabad-mobile.webp"
                      type="image/webp"
                    />
                    <img
                      src="/google-maps-360-tour-hyderabad.webp"
                      alt="Google Maps 360° virtual tour in Hyderabad"
                      width={1536}
                      height={864}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-700"
                    />
                  </picture>
                  <div className="mt-3 px-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-sky-400" />
                      360° virtual tour camera capture &amp; interactive navigation in a modern Hyderabad commercial property
                    </span>
                    <span className="text-slate-500 font-medium hidden sm:inline">PanoPublish Studio</span>
                  </div>
                </div>
              </div>

              {/* COMPACT TRUST POINTS */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs md:text-sm text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Google Maps publishing workflow
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Connected 360° panoramas
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Built for photographers &amp; agencies
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> INR pricing (UPI / Cards)
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" /> 7-day free trial
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: LIVE / INTERACTIVE TOUR DEMO */}
        <section id="interactive-demo" className="py-16 md:py-24 bg-slate-900 text-white scroll-mt-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs font-semibold text-blue-400 mb-3">
                <Eye className="h-3.5 w-3.5" /> Interactive Demonstration
              </span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif">
                Don't just read about a 360° tour. Try one.
              </h2>
              <p className="mt-3 text-slate-300 text-sm md:text-base">
                Drag to look around and explore the space. Click the on-screen navigation arrows to walk between connected viewpoints.
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 p-2 md:p-3">
              <div className="relative aspect-video md:aspect-[21/9] w-full rounded-xl overflow-hidden bg-slate-900">
                <iframe
                  src={demoTourEmbedUrl}
                  title="Live Google Street View 360° Tour Demonstration"
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="mt-4 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm text-slate-300 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Interactive Google Street View photo sphere published with connected navigation links.</span>
                </div>
                <a
                  href={demoTourEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Open Fullscreen on Google Maps
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHAT IS A GOOGLE MAPS 360° TOUR? */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-primary">Concept & Definition</span>
                <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                  What is a Google Maps 360° Virtual Tour?
                </h2>
                <p className="mt-4 text-slate-600 text-sm md:text-base leading-relaxed">
                  A Google Maps 360° virtual tour is an interactive digital walkthrough created by connecting multiple panoramic photographs so viewers can move naturally from one viewpoint to another.
                </p>
                <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
                  When prospective customers look up your business on Google Search, Google Maps, or your Google Business Profile, they do not just see a flat photo gallery. They can step inside and look up, down, and around 360 degrees.
                </p>

                {/* VISUAL WORKFLOW */}
                <div className="mt-8 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                    Natural Walking Path Flow:
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold text-slate-800">
                    <span className="px-3 py-1.5 rounded-lg bg-white border shadow-xs">Entrance</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-3 py-1.5 rounded-lg bg-white border shadow-xs">Reception</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-3 py-1.5 rounded-lg bg-white border shadow-xs">Interior</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-3 py-1.5 rounded-lg bg-white border shadow-xs">Room / Floor</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-3 py-1.5 rounded-lg bg-white border shadow-xs">Key Amenities</span>
                  </div>
                </div>
              </div>

              {/* EDITORIAL QUOTE CARD */}
              <div className="relative">
                <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-sky-50 to-white p-8 border border-primary/20 shadow-lg">
                  <div className="text-primary font-serif text-5xl leading-none select-none">“</div>
                  <blockquote className="text-base md:text-lg font-medium text-slate-800 italic leading-relaxed mt-2">
                    Instead of showing customers one photograph at a time, a connected 360° tour lets them explore the relationship between different spaces.
                  </blockquote>
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold font-serif text-sm">
                      PP
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">PanoPublish Editorial</div>
                      <div className="text-xs text-slate-500">Spatial Photography Workflow Principle</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHY HYDERABAD BUSINESSES USE 360° TOURS */}
        <section className="py-16 md:py-24 bg-slate-50 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Industry Use Cases</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Why Hyderabad Businesses Use 360° Tours
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                Different commercial sectors across Hyderabad rely on connected 360° photography to provide transparency, answer customer questions, and build credibility.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessCategories.map((cat, i) => {
                const IconComponent = cat.icon;
                return (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all hover:translate-y-[-2px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold font-serif text-slate-900 mb-2">
                        {cat.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-4">
                        {cat.benefit}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{cat.areas}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 5: HYDERABAD LOCAL CONTEXT */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary mb-3">
                  <MapPin className="h-3.5 w-3.5" /> Regional Commercial Corridors
                </span>
                <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900">
                  Supporting Businesses & Photographers Across Hyderabad
                </h2>
                <p className="mt-4 text-slate-600 text-sm md:text-base leading-relaxed">
                  Hyderabad's commercial landscape spans distinct hubs—from high-energy hospitality zones in Jubilee Hills and Banjara Hills to multinational IT parks in HITEC City and Gachibowli.
                </p>
                <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
                  PanoPublish provides local photographers and agencies with a streamlined publishing suite engineered specifically for Indian businesses—featuring native INR billing via Razorpay, UPI integration, and automated 18% GST tax invoices.
                </p>
                <div className="mt-6 space-y-2.5 text-xs md:text-sm text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Works with any verified Google Business Profile in Hyderabad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Local support operating during Indian Standard Time (IST)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Eliminates 3.5%+ credit card forex markups from USD platforms</span>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {localDistricts.map((dist, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-sm">{dist.name}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{dist.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: BEFORE VS AFTER / NORMAL PHOTO VS 360° */}
        <section className="py-16 md:py-24 bg-slate-50 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Visual Comparison</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Standard 2D Photos vs. Connected 360° Virtual Tour
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                Understand the fundamental difference between traditional still photography and interactive spatial navigation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* LEFT: Normal Photos */}
              <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-4">
                  Traditional Format
                </div>
                <h3 className="text-xl font-bold font-serif text-slate-900 mb-3">
                  Normal Business Photos
                </h3>
                <p className="text-xs md:text-sm text-slate-600 mb-6 leading-relaxed">
                  Static two-dimensional images captured from single viewpoints.
                </p>
                <ul className="space-y-3.5 text-xs md:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Individual images:</strong> Customers view isolated pictures without understanding room layout.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Limited spatial context:</strong> Difficult to gauge true room size, ceiling height, or corridor distances.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Passive experience:</strong> Viewers swipe through pictures without being able to look around corners.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Selective viewpoints:</strong> Viewers may wonder what is outside the crop of the camera lens.</span>
                  </li>
                </ul>
              </div>

              {/* RIGHT: Connected 360 Tour */}
              <div className="p-8 rounded-3xl bg-white border-2 border-primary/30 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] uppercase font-bold tracking-wider px-4 py-1 rounded-bl-xl">
                  Recommended
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
                  Spatial Format
                </div>
                <h3 className="text-xl font-bold font-serif text-slate-900 mb-3">
                  Connected 360° Virtual Tour
                </h3>
                <p className="text-xs md:text-sm text-slate-600 mb-6 leading-relaxed">
                  Full spherical photo spheres linked by directional navigation arrows.
                </p>
                <ul className="space-y-3.5 text-xs md:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Interactive navigation:</strong> Viewers click arrows to walk from the entrance through every room.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Complete 360° visibility:</strong> Look up at ceilings, down at flooring, and 360° around every angle.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Better layout understanding:</strong> Clear sense of spatial flow, seating capacity, and hygiene.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Google Maps integration:</strong> Displays directly on your official Google Business Profile.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: HOW THE PROCESS WORKS */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Technical Methodology</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                How the Process Works
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                A structured 6-step engineering workflow from raw camera capture to live Google Maps publishing.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processSteps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:shadow-md transition-all hover:translate-y-[-2px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-extrabold font-serif text-primary/40">
                          {step.step}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-primary flex items-center justify-center shadow-xs">
                          <StepIcon className="h-5 w-5" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold font-serif text-slate-900 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 8: GOOGLE 360° IMAGE REQUIREMENTS */}
        <section className="py-16 md:py-24 bg-slate-950 text-white border-b border-slate-800">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-400/20 text-xs font-semibold text-sky-400 mb-3">
                <Shield className="h-3.5 w-3.5" /> Technical Specifications
              </span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif">
                Official Google 360° Image Requirements
              </h2>
              <p className="mt-3 text-slate-300 text-sm md:text-base">
                To be accepted by the Google Street View Publish API, equirectangular panoramas must comply with Google's published ingestion standards.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Resolution</div>
                <div className="text-xl font-bold font-serif mt-1">3,840 × 1,920 px</div>
                <div className="text-xs text-slate-400 mt-2">Minimum required. 5.7K to 8K recommended for crisp zoom clarity.</div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Aspect Ratio</div>
                <div className="text-xl font-bold font-serif mt-1">Strictly 2:1</div>
                <div className="text-xs text-slate-400 mt-2">Equirectangular projection (width must be exactly double the height).</div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">File Size</div>
                <div className="text-xl font-bold font-serif mt-1">Up to 75 MB</div>
                <div className="text-xs text-slate-400 mt-2">Maximum file limit per JPEG image uploaded to Google servers.</div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Sensor & Quality</div>
                <div className="text-xl font-bold font-serif mt-1">7.5 MP Minimum</div>
                <div className="text-xs text-slate-400 mt-2">Sharp focus, gapless horizon, and seamless stitching across 360°.</div>
              </div>
            </div>

            {/* DOCUMENTATION CITATIONS */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs md:text-sm text-slate-300">
              <div className="font-bold text-white mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400" /> Official Google Technical References:
              </div>
              <p className="leading-relaxed text-slate-400 mb-3">
                These technical benchmarks are established in Google's official documentation. Note that meeting these baseline requirements is necessary for ingestion, but actual rendering and indexing remain subject to Google's automated quality filters.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold">
                <a
                  href="https://support.google.com/maps/answer/7012050"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                >
                  Google Maps Photo Spheres Guidelines <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="https://developers.google.com/streetview/publish/reference/rest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                >
                  Google Street View Publish API Reference <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="https://support.google.com/business/answer/6123536"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                >
                  Google Business Profile Photo Guidance <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: GOOGLE MAPS 360 TOUR COST IN HYDERABAD */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Commercial Economics</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Google Maps 360 Tour Cost in Hyderabad
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                There is no fixed universal price for a 360° virtual tour. Costs depend on property layout, the number of captured scenes, and photography scope.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs mb-8">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 md:px-6">Project Factor</th>
                    <th className="py-3.5 px-4 md:px-6">Why It Matters for Project Cost</th>
                    <th className="py-3.5 px-4 md:px-6 hidden sm:table-cell">Practical Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {costFactors.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 md:px-6 font-semibold text-slate-900 align-top">
                        {item.factor}
                      </td>
                      <td className="py-3.5 px-4 md:px-6 text-slate-600 leading-relaxed align-top">
                        {item.why}
                      </td>
                      <td className="py-3.5 px-4 md:px-6 text-slate-500 text-xs hidden sm:table-cell align-top">
                        {item.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs md:text-sm text-amber-900">
              <div className="font-bold flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                Buyer Advisory:
              </div>
              <p className="leading-relaxed">
                Publicly listed provider prices can vary significantly across Hyderabad, so businesses should compare what is included (such as exposure bracketing, custom nadir tripod logo branding, line-of-sight node linking, and post-publish support) rather than choosing solely by headline price.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 10: PUBLISH GOOGLE MAPS 360° TOURS WITH PANOPUBLISH */}
        <section className="py-16 md:py-24 bg-slate-50 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Software Capabilities</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Publish Google Maps 360° Tours with PanoPublish
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                Everything you need to capture, organize, brand, and publish professional virtual tours in one platform.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedFeatures.map((feat, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">
                    <Check className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold font-serif text-slate-900 text-base mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link to="/signup/">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white font-bold px-8 h-12 shadow-md">
                  Start Your 7-Day Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 11: PANOPUBLISH WORKFLOW */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Intuitive Studio</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                The PanoPublish Studio Workflow
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                A clean, sequential interface designed to eliminate technical hurdles for photographers and agencies.
              </p>
            </div>

            {/* FLOW DIAGRAM */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { step: "1", title: "Connect Google", desc: "OAuth 2.0 authorization" },
                { step: "2", title: "Create Tour", desc: "Assign client & Place ID" },
                { step: "3", title: "Upload Photos", desc: "Equirectangular 360 JPEGs" },
                { step: "4", title: "Build Links", desc: "Visual blue-line pathing" },
                { step: "5", title: "Add Nadir", desc: "Tripod logo or blur disk" },
                { step: "6", title: "Floor Levels", desc: "Islands organizer (L0, L1)" },
                { step: "7", title: "Privacy Blur", desc: "Canvas face & plate masking" },
                { step: "8", title: "Client Staging", desc: "Private review links" },
                { step: "9", title: "Publish API", desc: "Direct Street View stream" },
                { step: "10", title: "Live on Maps", desc: "Indexed within 24–48 hrs" },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-between">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mx-auto mb-2">
                    {item.step}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 12: FOR HYDERABAD 360° PHOTOGRAPHERS */}
        <section className="py-16 md:py-24 bg-slate-50 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Agency & Creator Tools</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Built for 360° Photographers Serving Hyderabad Businesses
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                Deliver turn-key virtual tours with client folders, custom branding, and white-label staging links.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Scenario 1 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Example Scenario 1</div>
                  <h3 className="text-lg font-bold font-serif text-slate-900 mb-2">
                    Restaurant in Jubilee Hills
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    12 connected panoramas covering outdoor patio, reception, main dining hall, and private dining room.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Shot with Ricoh Theta Z1 HDR</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Custom circular nadir logo branding</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Published to Google Street View</li>
                  </ul>
                </div>
                <div className="text-[11px] text-slate-400 italic border-t pt-3">
                  Illustrative commercial project configuration
                </div>
              </div>

              {/* Scenario 2 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Example Scenario 2</div>
                  <h3 className="text-lg font-bold font-serif text-slate-900 mb-2">
                    Hotel in HITEC City
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    45 panoramas organized into 3 floors (L0 Lobby, L1 Banquet Hall, L2 Executive Suites).
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Multi-floor island hierarchy</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Privacy blur on staff desks</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Google Maps + Website WebGL export</li>
                  </ul>
                </div>
                <div className="text-[11px] text-slate-400 italic border-t pt-3">
                  Illustrative commercial project configuration
                </div>
              </div>

              {/* Scenario 3 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Example Scenario 3</div>
                  <h3 className="text-lg font-bold font-serif text-slate-900 mb-2">
                    Showroom in Kondapur
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    18 panoramas spanning entrance drive, customer lounge, car display floor, and service delivery bay.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Calibrated true-North heading yaw</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Customer license plates blurred</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp shareable preview link</li>
                  </ul>
                </div>
                <div className="text-[11px] text-slate-400 italic border-t pt-3">
                  Illustrative commercial project configuration
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 13: MULTI-LEVEL PROPERTIES & ISLANDS */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary mb-3">
                  <Layers className="h-3.5 w-3.5" /> Spatial Architecture
                </span>
                <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900">
                  Multi-Floor Properties: Organizing Levels & Islands
                </h2>
                <p className="mt-4 text-slate-600 text-sm md:text-base leading-relaxed">
                  Large multi-story properties—such as shopping complexes, star hotels, medical clinics, and corporate tech parks—should not be dumped into a single disorienting list of photos.
                </p>
                <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
                  PanoPublish allows you to group panoramas into dedicated **Islands** (floors or distinct zones) such as **Ground Floor (L0)**, **First Floor (L1)**, and **Second Floor (L2)**.
                </p>
                <div className="mt-6 space-y-2.5 text-xs md:text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Cross-floor waypoint linking for staircases and elevator doors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Single-image levels supported (e.g. rooftop terrace or basement)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Prevents confusing criss-crossing blue lines on Google Maps</span>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE FLOOR SWITCHER SIMULATOR */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="text-sm font-bold flex items-center gap-2">
                    <Layers2 className="h-4 w-4 text-sky-400" /> Multi-Level Inspector
                  </div>
                  <div className="flex gap-1.5">
                    {(["L0", "L1", "L2"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setActiveFloor(lvl)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          activeFloor === lvl
                            ? "bg-primary text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="py-6 space-y-3">
                  {activeFloor === "L0" && (
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="font-bold text-sky-400">Level 0: Ground Floor (Entrance & Lobby)</div>
                      <div className="text-slate-400">6 Panoramas • Main Entrance, Reception, Waiting Lounge, Cafe Counter</div>
                      <div className="p-3 rounded-xl bg-slate-800/60 text-slate-300">
                        🔗 Waypoint: Elevator link connecting to Floor L1 and Floor L2
                      </div>
                    </div>
                  )}
                  {activeFloor === "L1" && (
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="font-bold text-sky-400">Level 1: First Floor (Meeting Rooms & Cabins)</div>
                      <div className="text-slate-400">8 Panoramas • Conference Room A, Executive Cabins, Workstation Bay</div>
                      <div className="p-3 rounded-xl bg-slate-800/60 text-slate-300">
                        🔗 Waypoint: Staircase link down to L0 Lobby and up to L2 Suites
                      </div>
                    </div>
                  )}
                  {activeFloor === "L2" && (
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="font-bold text-sky-400">Level 2: Second Floor (Suites & Terrace)</div>
                      <div className="text-slate-400">5 Panoramas • Deluxe Suite, Boardroom, Rooftop Terrace Dining</div>
                      <div className="p-3 rounded-xl bg-slate-800/60 text-slate-300">
                        🔗 Waypoint: Elevator link returning to Ground Level L0
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                  <span>Islands Architecture Engine</span>
                  <span className="text-emerald-400">✓ Fully Synced</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 14: CUSTOM VIRTUAL TOUR (STANDALONE WEBGL) */}
        <section className="py-16 md:py-24 bg-slate-50 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Dual-Publishing Flexibility</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Google Maps vs. Standalone Custom WebGL Tour
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                Publish to Google Maps for discovery, or export a standalone interactive WebGL tour to host on your own website.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 md:px-6">Feature</th>
                    <th className="py-3.5 px-4 md:px-6 text-primary">Google Maps / Street View</th>
                    <th className="py-3.5 px-4 md:px-6 text-slate-700">Standalone Custom WebGL Tour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Primary Channel</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Google Maps, Google Search, Street View App</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Self-hosted website, client portal, or offline package</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Custom Branding</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Google Street View UI + Circular Nadir Logo</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Full brand control: top-left logo, custom link, colors</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Interactive Hotspots</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Navigational directional arrows only</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">8 icons: Info cards, URL links, Door, Room, Stairs</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Background Audio</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Not supported on Google Maps</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">5 ambient royalty-free background music presets</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Offline Portability</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Cloud-hosted on Google infrastructure</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Downloadable offline ZIP bundle (HTML/CSS/JS)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Scene Navigation</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Sequential blue-line node navigation</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Categorized scene tags dropdown for instant room jumps</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 md:px-6 font-semibold text-slate-900">Mobile WebGL Performance</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">Standard Google Maps mobile rendering</td>
                    <td className="py-3 px-4 md:px-6 text-slate-700">1024x1024 CubeGeometry tiles preventing GPU crashes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 15: FAQ ACCORDION */}
        <section className="py-16 md:py-24 bg-white border-b">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Got Questions?</span>
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-slate-900 mt-2">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base">
                Factual, clear answers about Google Maps 360° virtual tours in Hyderabad and PanoPublish.
              </p>
            </div>

            <div className="space-y-4">
              {page.faqs?.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/50"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left p-5 md:p-6 flex items-center justify-between gap-4 font-serif font-bold text-slate-900 hover:text-primary transition-colors text-base md:text-lg"
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 transition-transform duration-200 text-slate-400 ${
                          isOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-6 md:px-6 md:pb-6 text-slate-600 text-sm md:text-base leading-relaxed border-t border-slate-100 pt-4 bg-white">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 16: FINAL CONVERSION CTA */}
        <section className="py-20 md:py-28 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.2),transparent_70%)] pointer-events-none" />

          <div className="container relative mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold font-serif tracking-tight leading-tight">
              Ready to turn 360° photos into an interactive tour?
            </h2>
            <p className="mt-4 text-sky-200/90 text-lg md:text-xl font-medium font-serif">
              Capture the space. Connect the views. Publish the experience.
            </p>
            <p className="mt-2 text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
              Whether you are a local Hyderabad business showcasing your venue or a commercial 360° photographer managing multiple client accounts, PanoPublish gives you a fast, reliable publishing studio.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/signup/">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white font-bold px-8 h-12 shadow-xl shadow-primary/30">
                  Start Your 7-Day Free Trial
                </Button>
              </Link>
              <Link to="/pricing/">
                <Button variant="outline" size="lg" className="border-slate-700 text-slate-100 hover:bg-slate-900 font-semibold px-6 h-12">
                  Explore PanoPublish Pricing
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              ✓ No credit card required • ✓ Cancel anytime • ✓ Built for Indian creators (₹499/mo)
            </p>
          </div>
        </section>

        {/* SECTION 17: RELATED RESOURCES & INTERNAL LINKS */}
        <section className="py-16 bg-white border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 text-center md:text-left">
              Related PanoPublish Resources & Guides
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs md:text-sm">
              <Link to="/google-street-view-publishing/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Google Street View Publishing
              </Link>
              <Link to="/360-virtual-tour-publishing-platform/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                360 Virtual Tour Platform
              </Link>
              <Link to="/pricing/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                PanoPublish INR Pricing
              </Link>
              <Link to="/case-studies/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Real Business Case Studies
              </Link>
              <Link to="/matterport-alternative/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Matterport Alternative Guide
              </Link>
              <Link to="/cloudpano-alternative/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                CloudPano Alternative Guide
              </Link>
              <Link to="/tourbuilder-alternative-india/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                TourBuilder India Alternative
              </Link>
              <Link to="/gothru-alternative/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                GoThru Alternative Guide
              </Link>
              <Link to="/faq/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Frequently Asked Questions
              </Link>
              <Link to="/contact/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Contact & WhatsApp Support
              </Link>
              <Link to="/authors/prashant-kumar/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Author: Prashant Kumar
              </Link>
              <Link to="/signup/" className="p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-colors font-medium text-slate-800">
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 18: AUTHOR & EEAT BLOCK */}
        <section className="py-12 bg-slate-50 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary font-bold font-serif text-2xl flex items-center justify-center shrink-0 border border-primary/20">
                PK
              </div>
              <div className="text-center sm:text-left space-y-1 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Author & Technical Reviewer
                </div>
                <h4 className="text-lg font-bold font-serif text-slate-900">
                  <Link to="/authors/prashant-kumar/" className="hover:text-primary transition-colors">
                    Prashant Kumar
                  </Link>
                </h4>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Founder of PanoPublish and Google Street View specialist with hands-on experience helping Indian businesses and 360° photographers publish connected virtual tours to Google Maps.
                </p>
              </div>
              <Link to="/authors/prashant-kumar/">
                <Button variant="outline" size="sm" className="shrink-0 text-xs">
                  View Author Profile <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
