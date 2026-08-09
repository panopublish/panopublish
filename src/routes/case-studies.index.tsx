import { createFileRoute, Link } from "@tanstack/react-router";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { caseStudiesData, caseStudyTypes } from "@/lib/case-studies-data";
import { useState } from "react";
import {
  MapPin,
  ArrowRight,
  TrendingUp,
  Camera,
  Building2,
  Utensils,
  Dumbbell,
  GraduationCap,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/case-studies/")({
  loader: () => ({ caseStudies: caseStudiesData }),
  head: () => ({
    meta: [
      {
        title:
          "Virtual Tour Case Studies — Real Results for Indian Businesses | PanoPublish",
      },
      {
        name: "description",
        content:
          "See how hotels, restaurants, gyms, schools, and offices across Gujarat used PanoPublish's Google Street View publishing to grow their digital presence and drive more customers.",
      },
    ],
  }),
  component: CaseStudiesIndex,
});

const typeIcon: Record<string, React.ReactNode> = {
  office: <Building2 className="h-3.5 w-3.5" />,
  gym: <Dumbbell className="h-3.5 w-3.5" />,
  school: <GraduationCap className="h-3.5 w-3.5" />,
  restaurant: <Utensils className="h-3.5 w-3.5" />,
  spa: <Sparkles className="h-3.5 w-3.5" />,
};

function CaseStudiesIndex() {
  const { caseStudies } = Route.useLoaderData();
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered =
    activeFilter === "all"
      ? caseStudies
      : caseStudies.filter((cs) => cs.client_type === activeFilter);

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Case Studies", url: "https://panopublish.com/case-studies/" },
  ];

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "PanoPublish Virtual Tour Case Studies",
    description:
      "Real results from Indian businesses that used PanoPublish to publish Google Street View virtual tours.",
    url: "https://panopublish.com/case-studies/",
    numberOfItems: caseStudies.length,
    itemListElement: caseStudies.map((cs, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: cs.title,
      url: `https://panopublish.com/case-studies/${cs.slug}/`,
    })),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Virtual Tour Case Studies — Real Results for Indian Businesses | PanoPublish"
        description="See how hotels, restaurants, gyms, schools, and offices across Gujarat used PanoPublish to grow their Google Maps presence and drive customers."
        canonical="https://panopublish.com/case-studies/"
        schema={[collectionSchema]}
        breadcrumbs={breadcrumbs}
      />
      <PublicHeader />

      {/* HEADER */}
      <section className="bg-slate-950 text-white py-16 md:py-20 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />
        <div className="container relative mx-auto px-4 max-w-5xl text-center space-y-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-xs font-semibold text-sky-400">
            <TrendingUp className="h-3.5 w-3.5" /> Proven Results
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-serif">
            Virtual Tour Case Studies
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
            Real results from businesses across Gujarat who used PanoPublish to
            publish 360° Google Street View tours — and the difference it made.
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
            {caseStudyTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveFilter(t.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === t.value
                    ? "bg-primary text-white shadow-sm"
                    : "border text-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {typeIcon[t.value] ?? <Camera className="h-3.5 w-3.5" />}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID */}
      <main className="flex-1 py-14 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              No case studies found for this category.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((cs) => (
                <Link
                  key={cs.slug}
                  to="/case-studies/$slug"
                  params={{ slug: cs.slug }}
                  className="group block bg-white border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Tour Embed Preview (poster) */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <iframe
                      src={cs.tour_embed_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0, pointerEvents: "none" }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      title={`Virtual tour preview — ${cs.client_name}`}
                      className="absolute inset-0 scale-105"
                    />
                    {/* Overlay CTA */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-[10px] text-white/80 font-medium flex items-center gap-1">
                        <Camera className="h-3 w-3" /> View Live Tour
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {cs.industry_label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" /> {cs.city}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {cs.tagline}
                    </h2>

                    {/* Key result pill */}
                    {cs.results[1] && (
                      <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                        <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span className="text-[10px] font-semibold text-green-700">
                          {cs.results[1].value}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs font-semibold text-primary pt-1 group-hover:gap-2 transition-all">
                      Read case study <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-16 text-center border-t pt-12 space-y-4">
            <h2 className="text-xl font-bold font-serif text-foreground">
              Ready to be our next success story?
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Join businesses across Gujarat using PanoPublish to publish 360°
              virtual tours to Google Maps.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link to="/signup">
                <Button className="font-bold px-6">
                  Start Free Trial <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="font-semibold">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
