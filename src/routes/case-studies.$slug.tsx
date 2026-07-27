import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { AuthorByline } from "@/components/AuthorByline";
import { getCaseStudy, caseStudiesData } from "@/lib/case-studies-data";
import { getAuthor } from "@/lib/authors-data";
import {
  MapPin,
  TrendingUp,
  Camera,
  Clock,
  Users,
  Star,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Quote,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/case-studies/$slug")({
  loader: ({ params }) => {
    const cs = getCaseStudy(params.slug);
    if (!cs) throw notFound();
    const author = getAuthor(cs.author_slug);
    // Related case studies (different slug, same or random)
    const related = caseStudiesData
      .filter((c) => c.slug !== cs.slug)
      .slice(0, 3);
    return { cs, author, related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${loaderData.cs.client_name} Virtual Tour Case Study | PanoPublish`,
          },
          {
            name: "description",
            content: `How ${loaderData.cs.client_name} in ${loaderData.cs.city} used PanoPublish to publish a 360° Google Street View virtual tour — results, process, and live tour embed.`,
          },
        ]
      : [],
  }),
  component: CaseStudyDetail,
});

const resultIcon: Record<string, React.ReactNode> = {
  camera: <Camera className="h-4 w-4" />,
  "trending-up": <TrendingUp className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
};

function CaseStudyDetail() {
  const { cs, author, related } = Route.useLoaderData();

  const canonicalUrl = `https://panopublish.com/case-studies/${cs.slug}`;

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Case Studies", url: "https://panopublish.com/case-studies" },
    { name: cs.client_name, url: canonicalUrl },
  ];

  // Article + Case Study schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${cs.client_name} — Google Street View Virtual Tour Case Study`,
    description: cs.tagline,
    datePublished: cs.published_at,
    dateModified: cs.published_at,
    url: canonicalUrl,
    author: author
      ? {
          "@type": "Person",
          name: author.name,
          url: `https://panopublish.com/authors/${author.slug}`,
        }
      : { "@type": "Organization", name: "PanoPublish" },
    publisher: {
      "@type": "Organization",
      name: "PanoPublish",
      url: "https://panopublish.com",
      logo: {
        "@type": "ImageObject",
        url: "https://panopublish.com/favicon.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    inLanguage: "en-IN",
    about: {
      "@type": "LocalBusiness",
      name: cs.client_name,
      address: {
        "@type": "PostalAddress",
        addressLocality: cs.city,
        addressCountry: "IN",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`${cs.client_name} Virtual Tour Case Study | PanoPublish`}
        description={cs.tagline}
        canonical={canonicalUrl}
        ogType="article"
        schema={[articleSchema]}
        breadcrumbs={breadcrumbs}
      />
      <PublicHeader />

      {/* HERO HEADER */}
      <section className="bg-slate-50 border-b py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-4xl space-y-4">
          <Link
            to="/case-studies"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to all case studies
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">
              {cs.industry_label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {cs.city}, India
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight font-serif text-foreground leading-tight">
            {cs.client_name}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-3xl">
            {cs.tagline}
          </p>

          {/* Author byline */}
          {author && (
            <div className="pt-2">
              <AuthorByline
                authorSlug={author.slug}
                authorName={author.name}
                authorTitle={author.title}
                authorPhotoUrl={author.photo_url}
                datePublished={cs.published_at}
              />
            </div>
          )}
        </div>
      </section>

      {/* RESULTS SUMMARY BAND */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 max-w-4xl py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cs.results.map((r, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border space-y-1.5"
              >
                <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  {resultIcon[r.icon ?? "trending-up"] ?? (
                    <TrendingUp className="h-4 w-4" />
                  )}
                </span>
                <p className="text-sm font-bold text-foreground leading-tight">
                  {r.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 bg-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-14">
          {/* LIVE TOUR EMBED */}
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-bold font-serif text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Live Virtual Tour
            </h2>
            <p className="text-sm text-muted-foreground">
              Explore the actual 360° virtual tour published on Google Street
              View. Use your mouse or finger to look around each scene.
            </p>
            <div className="rounded-2xl overflow-hidden border shadow-sm">
              <iframe
                src={cs.tour_embed_url}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title={`360° virtual tour — ${cs.client_name}, ${cs.city}`}
                className="w-full"
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              📍 Published on Google Maps — visible to anyone searching for this business
            </p>
          </div>

          {/* CHALLENGE */}
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground border-b pb-3">
              The Challenge
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {cs.challenge}
            </p>
          </div>

          {/* SOLUTION */}
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground border-b pb-3">
              Our Solution
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {cs.solution}
            </p>

            {/* Solution feature checklist */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {[
                "360° panoramic photo shoot",
                "Custom nadir branding applied",
                "GPS coordinates embedded",
                "Google Street View published",
                "Scene-to-scene navigation linked",
                "Google Business Profile updated",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* RESULTS DETAIL */}
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground border-b pb-3">
              The Results
            </h2>
            <div className="space-y-3">
              {cs.results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-slate-50/60"
                >
                  <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    {resultIcon[r.icon ?? "trending-up"] ?? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{r.value}</p>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TESTIMONIAL */}
          {cs.testimonial_quote && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border rounded-2xl p-6 md:p-8 relative overflow-hidden">
              <Quote className="h-8 w-8 text-primary/15 absolute top-4 right-5" />
              <blockquote className="text-base md:text-lg text-foreground/80 italic leading-relaxed max-w-2xl">
                "{cs.testimonial_quote}"
              </blockquote>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-bold text-foreground">
                  — {cs.testimonial_author}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cs.testimonial_role}
                </p>
              </div>
            </div>
          )}

          {/* INTERNAL LINKS */}
          <div className="border-t pt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-5 space-y-2 hover:border-primary/40 transition-colors">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Related Service
              </p>
              <Link
                to="/$slug"
                params={{ slug: cs.related_service_slug }}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View our {cs.industry_label} publishing services{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl border p-5 space-y-2 hover:border-primary/40 transition-colors">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Service Area
              </p>
              <Link
                to="/$slug"
                params={{ slug: cs.related_city_slug }}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Virtual tour publishing in {cs.city}{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* RELATED CASE STUDIES */}
      {related.length > 0 && (
        <section className="bg-slate-50/50 border-t py-12">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            <h2 className="text-lg font-bold font-serif text-foreground">
              More Case Studies
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  to="/case-studies/$slug"
                  params={{ slug: rel.slug }}
                  className="group block border rounded-2xl p-4 bg-white hover:border-primary/40 hover:shadow-sm transition-all space-y-2"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {rel.industry_label}
                  </span>
                  <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {rel.client_name} — {rel.city}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM CTA */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-950 text-white py-14">
        <div className="container mx-auto px-4 max-w-2xl text-center space-y-4">
          <h2 className="text-xl md:text-2xl font-bold font-serif">
            Want results like these for your business?
          </h2>
          <p className="text-slate-400 text-sm">
            Get your 360° virtual tour live on Google Street View in 24–48
            hours.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link to="/signup">
              <Button className="font-bold px-6">
                Start Free Trial <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 font-semibold"
              >
                Talk to Us on WhatsApp
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
