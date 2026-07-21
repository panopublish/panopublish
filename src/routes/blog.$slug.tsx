import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { seoPages } from "@/lib/seo-pages-data";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  BookOpen,
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const slug = params.slug;
    const page = seoPages[slug];
    if (!page || page.type !== "blog") {
      throw notFound();
    }
    return page;
  },
  component: BlogPost,
});

function BlogPost() {
  const page = Route.useLoaderData();

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Blog", url: "https://panopublish.com/blog" },
    { name: page.heading, url: `https://panopublish.com/blog/${page.slug}` },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={page.title}
        description={page.description}
        breadcrumbs={breadcrumbs}
        ogType="article"
      />
      <PublicHeader />

      {/* ARTICLE HEADER */}
      <section className="bg-slate-50 border-b py-10 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-4">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-glow transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to all articles
            </Link>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">
                {page.category}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {page.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {page.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {page.readTime}
                </span>
              </div>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight font-serif text-foreground leading-tight">
              {page.heading}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-3xl">
              {page.subheading}
            </p>
          </div>
        </div>
      </section>

      {/* ARTICLE LAYOUT */}
      <div className="flex-1 bg-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-10">
          {page.image && (
            <div className="rounded-3xl overflow-hidden border shadow-sm aspect-video max-h-[380px] w-full relative">
              <img
                src={page.image}
                alt={page.heading}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="grid md:grid-cols-[220px_1fr] gap-12 items-start pt-4">
          {/* STICKY SIDEBAR (TOC) */}
          <aside className="sticky top-24 hidden md:block space-y-4 border-l pl-4 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Table of Contents
            </p>
            <nav className="flex flex-col gap-2.5 text-xs font-medium">
              {page.sections.map((section, idx) => (
                <a
                  key={idx}
                  href={`#sec-${idx}`}
                  className="text-muted-foreground hover:text-primary transition-colors block leading-relaxed"
                >
                  {idx + 1}. {section.title}
                </a>
              ))}
              {page.faqs.length > 0 && (
                <a
                  href="#sec-faqs"
                  className="text-muted-foreground hover:text-primary transition-colors block leading-relaxed"
                >
                  FAQs Section
                </a>
              )}
            </nav>
          </aside>

          {/* MAIN ARTICLE TEXT */}
          <article className="space-y-12 text-sm md:text-base leading-relaxed text-foreground/90">
            {/* Intro paragraph */}
            <p className="text-base text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4 py-1">
              {page.introText}
            </p>

            {/* Dynamic sections */}
            {page.sections.map((section, idx) => (
              <section key={idx} id={`sec-${idx}`} className="scroll-mt-24 space-y-4">
                <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground border-b pb-2">
                  {idx + 1}. {section.title}
                </h2>
                <p className="whitespace-pre-line text-muted-foreground">{section.content}</p>

                {section.listItems && (
                  <ul className="grid gap-3 pt-2 pl-2">
                    {section.listItems.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2.5 text-xs md:text-sm">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* FAQs section */}
            {page.faqs.length > 0 && (
              <section id="sec-faqs" className="scroll-mt-24 space-y-6 pt-6 border-t">
                <div className="flex items-center gap-2 font-serif text-xl md:text-2xl font-bold text-foreground">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <h3>Common Questions & Answers</h3>
                </div>
                <div className="grid gap-6">
                  {page.faqs.map((faq, i) => (
                    <div key={i} className="space-y-2 border bg-slate-50/50 p-5 rounded-2xl">
                      <h4 className="font-bold text-sm md:text-base text-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        {faq.question}
                      </h4>
                      <p className="text-xs md:text-sm text-muted-foreground pl-7 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* LEAD INLINE CTA BOX */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg select-none">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />
              <div className="relative space-y-4 max-w-xl">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  <Sparkles className="h-3 w-3 animate-pulse" /> Try PanoPublish Free
                </span>
                <h4 className="text-lg md:text-2xl font-bold font-serif leading-snug">
                  Scale your 360° virtual tour publishing on Google Maps
                </h4>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                  Join professional photographers and digital marketing agencies across India. Add nadir logos, auto-link panoramas, and publish to Google Street View starting at ₹499/month.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/signup">
                    <Button size="sm" className="bg-primary hover:bg-primary/95 text-white font-bold px-5">
                      Start 7-Day Free Trial
                    </Button>
                  </Link>
                  <Link to="/" hash="pricing">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 font-semibold flex items-center gap-1">
                      See Pricing <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

      <PublicFooter />
    </div>
  );
}
