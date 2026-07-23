import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { seoPages } from "@/lib/seo-pages-data";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import {
  Check,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  MapPin,
  Building2,
  Camera,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  BadgeAlert,
  ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { waLink } from "@/lib/format";

export const Route = createFileRoute("/$slug")({
  loader: ({ params }) => {
    const slug = params.slug;
    const page = seoPages[slug];
    if (!page) {
      throw notFound();
    }
    return page;
  },
  component: SeoPage,
});

function SeoPage() {
  const page = Route.useLoaderData();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Generate breadcrumbs for SEO
  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: page.heading, url: `https://panopublish.com/${page.slug}` },
  ];

  // Helper to generate dynamic schema
  const getPageSchema = () => {
    if (page.type === "service") {
      return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": page.heading,
        "operatingSystem": "Web",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Virtual Tour Software",
        "description": page.description,
        "inLanguage": "en-IN",
        "offers": {
          "@type": "Offer",
          "price": "499.00",
          "priceCurrency": "INR",
          "billingIncrement": "P1M"
        }
      };
    } else if (page.type === "city") {
      return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": `PanoPublish ${page.cityName}`,
        "description": page.description,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": page.cityName,
          "addressCountry": "IN"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "20.5937",
          "longitude": "78.9629" // Broad India coordinates, default for local fallback
        }
      };
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={page.title}
        description={page.description}
        breadcrumbs={breadcrumbs}
        schema={getPageSchema()}
      />
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 bg-slate-950 text-white select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

        <div className="container relative mx-auto px-4 max-w-5xl">
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-xs font-semibold text-sky-400">
              <Sparkles className="h-3 w-3" /> {page.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-serif leading-tight">
              {page.heading}
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl font-light">
              {page.subheading}
            </p>
            <p className="mt-2 text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed">
              {page.introText}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white font-bold px-8 shadow-lg shadow-primary/25 transition-all hover:translate-y-[-1px]">
                  Start Free 7-Day Trial
                </Button>
              </Link>
              <a
                href={waLink(`Hi, I'm interested in PanoPublish: ${page.heading}`)}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="lg" className="border-slate-800 text-white hover:bg-slate-900 font-semibold px-6 flex items-center gap-2">
                  <svg className="h-5 w-5 fill-[#25D366] shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.012 2c-5.506 0-9.97 4.463-9.97 9.97 0 1.954.563 3.778 1.533 5.326L2 22l4.863-1.277c1.492.812 3.197 1.277 5.013 1.277 5.506 0 9.97-4.462 9.97-9.97 0-5.506-4.464-9.97-9.97-9.97zm5.556 14.133c-.244.688-1.22 1.25-1.676 1.302-.38.043-.876.086-2.457-.544-2.022-.806-3.327-2.868-3.432-3.007-.105-.138-.857-1.14-.857-2.176 0-1.036.541-1.545.733-1.754.192-.209.418-.261.558-.261.14 0 .28 0 .401.006.126.006.297-.047.464.356.172.417.587 1.433.637 1.538.05.105.084.227.013.367-.07.14-.15.304-.253.424-.105.12-.22.268-.314.372-.105.115-.213.24-.092.449.122.209.544.897 1.164 1.448.799.71 1.472.93 1.68.102.209.116.33.105.452.122.122.017.525-.61.666-.818.14-.209.28-.174.47-.105.193.07 1.22.575 1.43.68.209.105.349.157.401.247.052.09.052.525-.192 1.213z" />
                  </svg>
                  Book WhatsApp Demo
                </Button>
              </a>
            </div>

            {page.image && (
              <div className="mt-10 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl max-h-[400px] w-full relative">
                <img
                  src={page.image}
                  alt={`${page.heading} — ${page.primaryKeyword}`}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT SECTION */}
      <main className="flex-1">
        {/* Dynamic sections */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid gap-16">
              {page.sections.map((section, idx) => (
                <div key={idx} className="grid md:grid-cols-[1fr_1.5fr] gap-8 items-start border-b pb-12 last:border-0 last:pb-0">
                  <div className="space-y-3">
                    <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground">
                      {section.title}
                    </h2>
                    <div className="h-1 w-12 bg-primary rounded" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                    {section.listItems && (
                      <ul className="grid gap-3 pt-2">
                        {section.listItems.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2.5 text-xs md:text-sm text-foreground">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="h-3 w-3" />
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON SPECIFIC TABLE */}
        {page.type === "comparison" && page.comparisonTable && (
          <section className="py-16 bg-slate-50 border-y">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold font-serif text-foreground">
                  Feature Comparison
                </h2>
                <p className="text-muted-foreground text-sm mt-2">
                  See how PanoPublish compares to {page.comparisonTable.competitorName}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-100/50">
                      {page.comparisonTable.headers.map((h, i) => (
                        <th key={i} className={`p-4 text-xs md:text-sm font-bold text-foreground ${i === 1 ? "text-primary" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.comparisonTable.rows.map((row, idx) => (
                      <tr key={idx} className={`border-b last:border-b-0 hover:bg-slate-50/50 transition-colors ${row.isHighlight ? "bg-primary/5 font-semibold" : ""}`}>
                        <td className="p-4 text-xs md:text-sm text-foreground font-medium">
                          {row.feature}
                        </td>
                        <td className={`p-4 text-xs md:text-sm text-foreground ${row.isHighlight ? "text-primary font-bold" : ""}`}>
                          {row.panopublish}
                        </td>
                        <td className="p-4 text-xs md:text-sm text-muted-foreground">
                          {row.competitor}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* CITY SPECIFIC EXTRA CONTEXT */}
        {page.type === "city" && (
          <section className="py-16 bg-blue-50/40 border-y">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    <MapPin className="h-3 w-3 animate-bounce" /> Local SEO Focus
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold font-serif text-foreground">
                    Growing Your Business in {page.cityName}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Local Map citations and 360° virtual tours help businesses in {page.cityName} attract tech-savvy clients. Listings with virtual walks see double the user engagement. Connect showrooms, restaurants, and offices in {page.cityName} with our easy-to-use publishing editor.
                  </p>
                  <ul className="space-y-2 text-xs md:text-sm text-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" /> Target active customers on Google Maps
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" /> Local support operating in Indian Standard Time (IST)
                    </li>

                  </ul>
                </div>
                {/* Visual Placeholder representing Maps Embed */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-primary/10 shadow-xl bg-white p-6 space-y-4 flex flex-col justify-center min-h-[300px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Local Business Listing</h4>
                      <p className="text-xs text-muted-foreground">{page.cityName}, India</p>
                    </div>
                  </div>
                  <div className="h-32 rounded-lg overflow-hidden border relative group bg-slate-100">
                    <img
                      src="/city-maps-showcase.png"
                      alt={`360 Virtual Tour Showcase in ${page.cityName}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs border-t pt-3">
                    <span className="text-muted-foreground">POIs Coordinates Loaded</span>
                    <span className="font-bold text-primary flex items-center gap-0.5">
                      Live on Street View <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PRICING PLANS IN INR */}
        <section className="py-16 md:py-24 bg-slate-50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl md:text-4xl font-bold font-serif text-foreground">
                Affordable Local Pricing in INR
              </h2>
              <p className="mt-3 text-muted-foreground text-sm md:text-base">
                Try PanoPublish free for 7 days. No credit card required. Cancel anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Basic Plan */}
              <div className="border rounded-2xl bg-white p-6 shadow-sm flex flex-col transition-all hover:shadow-md">
                <div className="mb-6">
                  <h3 className="text-lg font-bold font-serif text-foreground">Basic Plan</h3>
                  <p className="text-xs text-muted-foreground mt-1">For independent photographers</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">₹499</span>
                    <span className="text-muted-foreground text-xs">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs md:text-sm text-muted-foreground mb-8 flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Up to 5 Active Tours
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 50 Photos Per Tour
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Standard Nadir Blur Editor
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Direct Street View Publish
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Email Support
                  </li>
                </ul>
                <Link to="/signup">
                  <Button variant="outline" className="w-full font-bold">Start Free Trial</Button>
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="border-2 border-primary rounded-2xl bg-white p-6 shadow-md flex flex-col relative scale-[1.03]">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Popular
                </div>
                <div className="mb-6">
                  <h3 className="text-lg font-bold font-serif text-foreground">Pro Plan</h3>
                  <p className="text-xs text-muted-foreground mt-1">For active agencies & freelancers</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">₹1,499</span>
                    <span className="text-muted-foreground text-xs">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs md:text-sm text-muted-foreground mb-8 flex-1 font-medium">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Up to 25 Active Tours
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 200 Photos Per Tour
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Custom Logo Nadir Brand
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Proximity Auto-linking
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Priority WhatsApp Support
                  </li>
                </ul>
                <Link to="/signup">
                  <Button className="w-full font-bold shadow-lg shadow-primary/20">Start Free Trial</Button>
                </Link>
              </div>

              {/* Agency Plan */}
              <div className="border rounded-2xl bg-white p-6 shadow-sm flex flex-col transition-all hover:shadow-md">
                <div className="mb-6">
                  <h3 className="text-lg font-bold font-serif text-foreground">Agency Plan</h3>
                  <p className="text-xs text-muted-foreground mt-1">For large marketing companies</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">₹2,999</span>
                    <span className="text-muted-foreground text-xs">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs md:text-sm text-muted-foreground mb-8 flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Tours
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Photos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Custom Nadir Branding
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Auto-linking Paths
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Dedicated Account Manager
                  </li>
                </ul>
                <Link to="/signup">
                  <Button variant="outline" className="w-full font-bold">Start Free Trial</Button>
                </Link>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 text-center max-w-xl mx-auto border bg-white p-4 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-foreground">
                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                Secure Payments via Razorpay
              </div>
              <p className="text-xs text-muted-foreground">
                Pay via UPI, Net Banking, credit/debit cards, or EMI — processed securely via Razorpay in INR.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs ACCORDION SECTION */}
        <section className="py-16 md:py-24 border-t">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="flex items-center gap-2 justify-center mb-10 text-center">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold font-serif text-foreground">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y border-y">
              {page.faqs.map((faq, i) => (
                <div key={i} className="py-2.5">
                  <h3>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex flex-1 items-center justify-between py-4 font-semibold text-left text-sm md:text-base text-foreground hover:text-primary transition-colors cursor-pointer w-full"
                      aria-expanded={openFaq === i}
                    >
                      <span className="font-serif pr-4">{faq.question}</span>
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
                      <p className="text-muted-foreground text-xs md:text-sm leading-relaxed pb-4 pr-4">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LOCAL CITIES INDEX (For Service Pages Crawler Support) */}
        {page.type === "service" && (
          <section className="py-12 bg-white border-t">
            <div className="container mx-auto px-4 max-w-5xl text-center space-y-6">
              <h2 className="text-xl font-bold font-serif text-foreground">
                Available in Top Indian Cities
              </h2>
              <div className="flex flex-wrap gap-2.5 justify-center max-w-3xl mx-auto">
                {Object.values(seoPages)
                  .filter((p) => p.type === "city")
                  .map((city) => (
                    <Link
                      key={city.slug}
                      to="/$slug"
                      params={{ slug: city.slug }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border hover:border-primary/20 text-xs font-semibold text-muted-foreground hover:text-primary transition-all bg-slate-50/50"
                    >
                      <MapPin className="h-3 w-3 text-primary" /> {city.cityName}
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* FINAL CTA DRAWER */}
        <section className="bg-gradient-to-br from-primary to-[#38BDF8] text-white py-16 text-center select-none">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight font-serif">
              Publish your first virtual tour today
            </h2>
            <p className="mt-4 text-sm md:text-base text-white/80 max-w-lg mx-auto">
              Ready to claim your local market advantage? Try PanoPublish free for 7 days. No credit card required.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="shadow-lg h-12 px-8 font-bold text-primary transition-transform hover:scale-105 bg-white text-primary"
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
