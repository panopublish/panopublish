import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Check,
  MapPin,
  Camera,
  Globe2,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Play,
  ChevronRight,
  Workflow,
  MousePointerClick,
  Info,
  ChevronDown,
} from "lucide-react";
import { formatINR, waLink } from "@/lib/format";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

const landingSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PanoPublish",
    alternateName: "PanoPublish Platform",
    url: "https://app.panopublish.com/",
    description:
      "Publish 360° virtual tours to Google Maps & Street View. Built for photographers, agencies, hotels, and real estate professionals in India.",
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://app.panopublish.com/signup",
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PanoPublish",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Virtual Tour Software",
    url: "https://app.panopublish.com/",
    description:
      "SaaS platform for publishing 360° panoramic photos to Google Street View and Google Maps. Designed for Indian photographers and marketing agencies.",
    screenshot: "https://app.panopublish.com/robot_beach_upload.png",
    featureList: [
      "Direct Google Street View publishing",
      "360° photo management",
      "Multi-client workspace",
      "Custom nadir branding",
      "Indian payment methods (UPI, cards)",
      "GST invoice generation",
      "WhatsApp support",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Basic Plan",
        price: "499",
        priceCurrency: "INR",
        billingIncrement: "P1M",
        description: "1 user, 5 tours, 50 photos per tour, email support",
        url: "https://app.panopublish.com/signup",
      },
      {
        "@type": "Offer",
        name: "Pro Plan",
        price: "1499",
        priceCurrency: "INR",
        billingIncrement: "P1M",
        description: "3 users, 25 tours, 200 photos per tour, WhatsApp support",
        url: "https://app.panopublish.com/signup",
      },
      {
        "@type": "Offer",
        name: "Agency Plan",
        price: "2999",
        priceCurrency: "INR",
        billingIncrement: "P1M",
        description: "Unlimited users, unlimited tours, dedicated manager",
        url: "https://app.panopublish.com/signup",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "3",
      bestRating: "5",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Rahul M." },
        reviewBody:
          "PanoPublish's direct publishing cut my upload time and metadata alignment in half. The support is top-notch.",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Priya S." },
        reviewBody:
          "Finally, a platform built for India with INR pricing, tax invoice generation, and real WhatsApp support.",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is PanoPublish and who is it for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PanoPublish is a SaaS platform for photographers, marketing agencies, hotels, and real estate professionals in India who want to publish 360° virtual tours directly to Google Street View and Google Maps. It manages the entire workflow from photo upload to publishing.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need a professional 360° camera to use PanoPublish?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You need a 360° camera that produces equirectangular JPEG images (like Insta360, Ricoh Theta, or similar). Consumer-grade cameras like the Insta360 ONE X2 work perfectly. We accept files up to 75MB per photo.",
        },
      },
      {
        "@type": "Question",
        name: "How long does it take for virtual tours to appear on Google Street View?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After you click Publish in PanoPublish, Google typically processes and displays your 360° photos on Google Street View and Google Maps within 24 to 48 hours. Processing time depends on Google's review queue.",
        },
      },
      {
        "@type": "Question",
        name: "Can I hide or blur my camera tripod or add my brand logo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. PanoPublish's Custom Nadir feature lets you apply a stretch blur to hide your tripod at the bottom of the panorama, or upload your company logo to brand every scene before publishing to Google Street View.",
        },
      },
      {
        "@type": "Question",
        name: "How are subscription payments and GST invoices handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Payments are processed securely and support UPI, credit/debit cards, net banking, and EMI. You can enter your GSTIN to automatically receive GST-compliant tax invoices for every transaction, suitable for input tax credit claims.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PanoPublish",
    url: "https://app.panopublish.com",
    logo: "https://app.panopublish.com/og-image.png",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
      contactOption: "TollFree",
      areaServed: "IN",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "19:00",
      },
    },
    sameAs: ["https://panopublish.com"],
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PanoPublish — Google Street View Publishing for Indian Businesses" },
      {
        name: "description",
        content:
          "Publish 360° virtual tours to Google Maps & Street View in minutes. SaaS built for photographers, agencies, hotels, and real estate in India. Start free!",
      },
      {
        property: "og:title",
        content: "PanoPublish — Google Street View Publishing for Indian Businesses",
      },
      {
        property: "og:description",
        content:
          "Manage and publish client 360° panoramas. Organize tours with levels, add custom nadir logos, and map connections. Easy and robust edge deployment.",
      },
      { property: "og:type", content: "website" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PanoPublish",
          operatingSystem: "All",
          applicationCategory: "BusinessApplication",
          description: "Google Street View Publishing platform for Indian businesses.",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: "499",
            highPrice: "2999",
          },
        }),
      },
    ],
  }),
  component: Landing,
});

const plans = [
  {
    name: "Basic",
    priceMonthly: 499,
    popular: false,
    description: "Ideal for individual photographers and local businesses publishing occasionally.",
    features: [
      "1 active user account",
      "5 Google virtual tours",
      "Up to 50 photos per tour",
      "Email support",
      "Direct Google Maps upload",
    ],
  },
  {
    name: "Pro",
    priceMonthly: 1499,
    popular: true,
    description:
      "Designed for professional agencies and developers managing multiple client assets.",
    features: [
      "3 team member logins",
      "25 Google virtual tours",
      "Up to 200 photos per tour",
      "Priority WhatsApp support (Mon-Sat)",
      "Faster image processing",
      "Custom nadir blurs & logos",
    ],
  },
  {
    name: "Agency",
    priceMonthly: 2999,
    popular: false,
    description: "Best for enterprise networks, tourism boards, and white-label media publishers.",
    features: [
      "Unlimited team members",
      "Unlimited virtual tours",
      "Unlimited scenes and photos",
      "Dedicated relationship manager",
      "GST & custom corporate invoicing",
      "White-label client presentation mode",
    ],
  },
];

const faqs = [
  [
    "What is PanoPublish and who is it for?",
    "PanoPublish is a cloud-based SaaS platform designed for digital marketing agencies, commercial photographers, and business owners. It allows you to organize 360-degree panorama photo spheres into islands/levels, establish floor plans, connect virtual scenes, and publish them directly to Google Street View and Google Maps via the Google API.",
  ],
  [
    "Do I need a professional 360° camera to use your platform?",
    "No. Any camera capable of capturing equirectangular 360-degree JPEG panorama files is supported (such as Ricoh Theta, Insta360, GoPro Max, or a standard DSLR with a panoramic head). We process the metadata and prepare your images automatically for Google Maps compatibility.",
  ],
  [
    "How long does it take for virtual tours to appear on Google Street View?",
    "Once you connect your Google Account and submit a tour through PanoPublish, the scenes are uploaded directly. Google's internal review and indexing queues typically take between 24 to 48 hours to process and render the tour live on Google Maps and search results.",
  ],
  [
    "Can I hide or blur my camera tripod (nadir) or add my brand logo?",
    "Yes, absolutely. The Pro and Agency plans include server-side Nadir processing tools. You can apply a standard bottom blur, stretch-blur, or overlay your client's custom circular logo directly at the bottom pole of the 360° scene, hiding the tripod seamlessly.",
  ],
  [
    "How are subscription payments and GST invoices handled?",
    "Payments are processed securely, supporting UPI, credit cards, debit cards, net banking, and EMI. If you enter your GSTIN during checkout or in your Settings, a tax-compliant GST invoice is generated and emailed to you automatically for tax filing and input credit claims.",
  ],
];

function Landing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <SEO
        title="PanoPublish — Google Street View Publishing for Indian Businesses"
        description="Publish 360° virtual tours to Google Maps & Street View in minutes. SaaS built for photographers, agencies, hotels, and real estate in India. Start free!"
        schema={landingSchemas}
      />
      <PublicHeader />

      {/* Main Container */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary-glow),transparent_50%)] opacity-10 pointer-events-none" />
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

          <div className="container relative mx-auto px-4 text-center max-w-4xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary mb-6 select-none hover:bg-primary/10 transition-colors">
              <Sparkles className="h-3.5 w-3.5" /> Built for photographers & marketing agencies in
              India
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground font-serif">
              Publish 360° Virtual Tours to Google Maps.{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
                In Minutes.
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              India's dedicated Street View publishing platform. Upload panoramas, connect scenes,
              brand your nadir, and go live on Google Maps — starting at ₹499/month.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="shadow-elegant h-12 px-8 font-semibold text-base transition-transform hover:scale-[1.03]"
                  id="hero-cta-signup"
                >
                  Start Free 7-Day Trial
                </Button>
              </Link>
              <a href="#demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 font-medium transition-colors hover:bg-accent"
                >
                  <Play className="h-4 w-4 mr-2 text-primary fill-primary" /> Watch Demo Video
                </Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <span>✓ No credit card required</span>
              <span className="text-primary/40">•</span>
              <span>✓ Instant access</span>
              <span className="text-primary/40">•</span>
              <span>✓ Cancel anytime</span>
            </p>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="container mx-auto px-4 py-16 max-w-5xl scroll-mt-20">
          <div className="relative rounded-2xl border bg-card/60 backdrop-blur-sm p-2 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center relative overflow-hidden">
              <img
                src="/robot_beach_upload.png"
                alt="PanoPublish Interactive Map Dashboard interface showing 360 degree photos and camera settings"
                className="absolute inset-0 w-full h-full object-cover opacity-30 select-none pointer-events-none"
                loading="lazy"
                decoding="async"
              />
              <div className="relative z-10 text-center p-6 max-w-md">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-elegant transition-transform group-hover:scale-110 cursor-pointer">
                  <Play className="h-6 w-6 fill-white ml-1" />
                </div>
                <h3 className="text-lg font-bold mb-1 text-foreground font-serif">
                  See PanoPublish in action
                </h3>
                <p className="text-sm text-muted-foreground">
                  Discover how to upload, blur tripod nadirs, connect rooms, and sync metadata with
                  Google Street View in under 2 minutes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Prop Banner */}
        <section className="bg-primary text-white py-8 select-none">
          <div className="container mx-auto px-4 max-w-6xl flex flex-wrap items-center justify-around gap-6 text-center md:text-left">
            <div>
              <div className="text-xl font-bold">
                Need customized media pricing or GST integration?
              </div>
              <p className="text-white/80 text-sm mt-0.5">
                We provide tax-compliant billing and prioritized processing for Indian creators.
              </p>
            </div>
            <Link to="/signup">
              <Button
                variant="secondary"
                className="font-semibold text-primary shadow-lg hover:bg-white/95"
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-20 max-w-6xl scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-serif">
              Everything you need to publish 360° tours
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Professional toolset designed to simplify your workflow when building client VR tours
              across India.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                i: MapPin,
                t: "Direct Google Maps Integration",
                d: "Authorize Google OAuth once and push photos directly to Google Street View with accurate coordinates in one click.",
              },
              {
                i: Camera,
                t: "360° Photo Manager",
                d: "Drag and drop massive 360-degree panoramic files (up to 75MB). We extract GPS coordinates and heading parameters automatically.",
              },
              {
                i: Globe2,
                t: "Multi-Client Workspace",
                d: "Organize your agency by clients and tours. Share private preview links with clients before making them public on Google Maps.",
              },
              {
                i: ShieldCheck,
                t: "Custom Nadir Branding",
                d: "Hide your tripod effortlessly. Apply spherical blurs or overlay a custom company logo at the bottom pole of your panorama.",
              },
              {
                i: MessageCircle,
                t: "WhatsApp Support",
                d: "Get rapid human assistance on WhatsApp (Mon–Sat, 10 AM to 7 PM IST) for edge functions, API credentials, and billing.",
              },
              {
                i: Sparkles,
                t: "Tax-Compliant billing",
                d: "Enter your company GSTIN to receive automatic GST tax invoices. Fully localized Indian payment methods including UPI and Net Banking.",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <f.i className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">{f.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="bg-muted/40 py-20 border-y scroll-mt-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-serif">
                How PanoPublish Works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Publishing 360 virtual tours on Google Search and Maps in 3 easy steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border hidden md:block -translate-y-12 z-0" />
              {[
                {
                  step: "01",
                  title: "Upload Panoramic Scenes",
                  desc: "Create an 'island' folder for your tour (e.g. Ground Floor, Lobby). Drag and drop your equirectangular 360-degree panorama images.",
                  icon: Camera,
                },
                {
                  step: "02",
                  title: "Build Map Connections",
                  desc: "Use our visual path designer to link neighboring scenes together. Users will be able to click arrows on Google Street View to walk between rooms.",
                  icon: Workflow,
                },
                {
                  step: "03",
                  title: "Publish to Google Maps",
                  desc: "Connect your Google Account and click publish. Your virtual tour goes live on Google Search, Maps, and Google Earth in 24–48 hours.",
                  icon: MousePointerClick,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="relative bg-card rounded-xl border p-6 shadow-sm z-10 flex flex-col items-center text-center"
                >
                  <div className="absolute -top-4 bg-primary text-white text-xs font-extrabold px-3 py-1 rounded-full shadow">
                    STEP {item.step}
                  </div>
                  <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 mt-2">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2 font-serif">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 scroll-mt-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-serif">
                Flexible plans for creators of all sizes
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start for free on our 7-day trial. Transition to a plan that fits your business
                requirements.
              </p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border bg-card p-1 shadow-sm">
                <button
                  onClick={() => setAnnual(false)}
                  className={`px-5 py-1.5 text-sm font-semibold rounded-full transition-all cursor-pointer ${!annual ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly billing
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`px-5 py-1.5 text-sm font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${annual ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Annual billing
                  <span className="bg-success text-success-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
              {plans.map((p) => {
                const basePrice = p.priceMonthly;
                const finalPrice = annual ? Math.round(basePrice * 12 * 0.8) : basePrice;
                return (
                  <div
                    key={p.name}
                    className={`relative rounded-2xl border bg-card p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl ${p.popular ? "ring-2 ring-primary shadow-elegant md:scale-[1.03]" : "shadow-sm"}`}
                  >
                    {p.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow">
                        Most Popular
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-foreground font-serif">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-h-[36px]">
                        {p.description}
                      </p>

                      <div className="mt-6 flex items-baseline gap-1 border-b pb-6">
                        <span className="text-4xl font-extrabold tracking-tight">
                          {formatINR(finalPrice)}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">
                          /{annual ? "year" : "month"}
                        </span>
                      </div>

                      <ul className="mt-6 space-y-3.5 text-sm">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <span className="text-foreground/90">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8">
                      <Link to="/signup" className="block">
                        <Button
                          className="w-full h-11 font-semibold"
                          variant={p.popular ? "default" : "outline"}
                          id={`btn-pricing-signup-${p.name.toLowerCase()}`}
                        >
                          Start Free 7-Day Trial
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center max-w-md mx-auto p-4 rounded-xl border bg-muted/20 flex gap-3 text-left">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Payments are processed securely. We support credit/debit cards, UPI auto-pay, net
                banking, and corporate invoicing. You can switch plans or cancel auto-renewals at
                any time.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-muted/30 py-20 border-y">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-serif">
                What photographers are saying about PanoPublish
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Helping professionals and local businesses succeed across India.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    "I publish 8–10 hotel virtual tours a month for hospitality clients in Goa. PanoPublish's direct publishing cut my upload time and metadata alignment in half. The support is top-notch.",
                  author: "Rahul M.",
                  role: "360° Commercial Photographer",
                  location: "Goa, India",
                },
                {
                  quote:
                    "Finally, a platform built for India with INR pricing, tax invoice generation for input credit, and real support on WhatsApp. My agency has migrated all client tours here.",
                  author: "Priya S.",
                  role: "Co-Founder, BlueMedia Agency",
                  location: "Bengaluru, India",
                },
                {
                  quote:
                    "The multi-floor island configuration makes showroom tours exceptionally organized. Being able to easily add nadir brand logos directly before sync is a game-changer.",
                  author: "Anil K.",
                  role: "Real Estate Media Specialist",
                  location: "New Delhi, India",
                },
              ].map((t, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-xl border p-6 shadow-sm flex flex-col justify-between"
                >
                  <p className="text-sm leading-relaxed italic text-foreground/90 font-medium font-sans">
                    “{t.quote}”
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t pt-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {t.author[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">{t.author}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">
                        {t.role} • {t.location}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 scroll-mt-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight font-serif">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-muted-foreground">
                Answers to common questions about PanoPublish and publishing to Google Street View.
              </p>
            </div>

            <div className="bg-card rounded-xl border shadow-sm divide-y" id="faq-accordion">
              {faqs.map(([q, a], i) => (
                <div key={i} className="px-5">
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex flex-1 items-center justify-between py-4 font-semibold text-left text-base text-foreground hover:text-primary transition-colors cursor-pointer w-full"
                      aria-expanded={openFaq === i}
                    >
                      <span className="font-serif">{q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                      />
                    </button>
                  </h3>
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
                      openFaq === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-muted-foreground text-sm leading-relaxed pb-4 pr-4">{a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-gradient-to-br from-primary to-primary-glow text-white py-16 text-center select-none">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-serif">
              Ready to publish your first virtual tour?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
              Get started now and upload your first tour in 5 minutes. No credit card required,
              cancel anytime.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="shadow-lg h-12 px-8 font-bold text-primary transition-transform hover:scale-105"
                  id="footer-cta-signup"
                >
                  Start Your Free 7-Day Trial
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
