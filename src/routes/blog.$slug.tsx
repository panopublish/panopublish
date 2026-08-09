import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { seoPages } from "@/lib/seo-pages-data";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { AuthorByline } from "@/components/AuthorByline";
import {
  Clock,
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
    // Build related articles from same category (exclude self, limit to 3)
    const allBlogPages = Object.values(seoPages).filter(
      (p) => p.type === "blog" && p.slug !== slug && p.category === page.category
    );
    const related = allBlogPages.slice(0, 3);
    return { page, related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.page
      ? [
          { title: loaderData.page.title },
          { name: "description", content: loaderData.page.description },
        ]
      : [],
    links: loaderData?.page?.image
      ? [{ rel: "preload" as const, as: "image", href: `https://panopublish.com${loaderData.page.image}` }]
      : [],
  }),
  component: BlogPost,
});

function BlogPost() {
  const { page, related } = Route.useLoaderData();

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Blog", url: "https://panopublish.com/blog" },
    { name: page.heading, url: `https://panopublish.com/blog/${page.slug}` },
  ];

  // Build all JSON-LD schemas for this article
  const getSchemas = () => {
    const schemas: object[] = [];

    // ImageObject schema
    if (page.image) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "url": `https://panopublish.com${page.image}`,
        "width": "800",
        "height": "450",
        "caption": page.heading,
      });
    }

    // BlogPosting / Article schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": page.heading,
      "description": page.description,
      "datePublished": page.datePublished ?? page.date ?? "2026-01-01",
      "dateModified": page.dateModified ?? page.datePublished ?? page.date ?? "2026-01-01",
      "author": {
        "@type": "Person",
        "name": page.author ?? "Prashant Kumar",
        "url": "https://panopublish.com/authors/prashant-kumar",
      },
      "publisher": {
        "@type": "Organization",
        "name": "PanoPublish",
        "url": "https://panopublish.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://panopublish.com/favicon.png",
          "width": "32",
          "height": "32",
        },
      },
      "image": page.image
        ? `https://panopublish.com${page.image}`
        : "https://panopublish.com/og-image.webp",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://panopublish.com/blog/${page.slug}`,
      },
      "inLanguage": "en-IN",
      "keywords": page.primaryKeyword,
    });

    // FAQPage schema — only when FAQs exist
    if (page.faqs && page.faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": page.faqs.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer,
          },
        })),
      });
    }

    return schemas;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={page.title}
        description={page.description}
        breadcrumbs={breadcrumbs}
        ogType="article"
        ogImage={page.image ? `https://panopublish.com${page.image}` : undefined}
        schema={getSchemas()}
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
              {page.readTime && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {page.readTime}
                </span>
              )}
            </div>

            {/* Author byline with dates */}
            <div className="pt-1">
              <AuthorByline
                authorSlug="prashant-kumar"
                authorName={page.author ?? "Prashant Kumar"}
                authorTitle="360° Virtual Tour Specialist & Founder, PanoPublish"
                datePublished={page.date}
              />
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
                alt={`${page.heading} — ${page.primaryKeyword}`}
                width={800}
                height={450}
                loading="eager"
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
              {page.faqs && page.faqs.length > 0 && (
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
                <RichTextRenderer content={section.content} />

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
            {page.faqs && page.faqs.length > 0 && (
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

            {/* RELATED ARTICLES */}
            {related.length > 0 && (
              <section className="border-t pt-8 space-y-5">
                <h3 className="text-base font-bold font-serif text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Related Articles
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      to="/blog/$slug"
                      params={{ slug: rel.slug }}
                      className="group block border rounded-2xl p-4 hover:border-primary/40 hover:bg-slate-50/60 transition-all space-y-2"
                    >
                      {rel.image && (
                        <div className="rounded-xl overflow-hidden aspect-video">
                          <img
                            src={rel.image}
                            alt={rel.heading}
                            width={320}
                            height={180}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{rel.category}</p>
                      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {rel.heading}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                        Read more <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </div>

      <PublicFooter />
    </div>
  );
}

function RichTextRenderer({ content }: { content: string }) {
  const blocks = content.split('\n\n');

  return (
    <div className="space-y-4 text-muted-foreground text-sm md:text-base leading-relaxed">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Handle blockquotes: starting with '>'
        if (trimmed.startsWith('>')) {
          const rawText = trimmed.replace(/^>\s*/, '');
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-primary pl-4 py-2.5 my-4 italic text-foreground/80 bg-slate-50/50 rounded-r-lg"
            >
              {parseInlineFormatting(rawText)}
            </blockquote>
          );
        }

        // Handle bullet lists: paragraph containing lines that start with '-' or '*'
        const lines = trimmed.split('\n');
        const isList = lines.every(line => {
          const l = line.trim();
          return l.startsWith('-') || l.startsWith('*');
        });

        if (isList && lines.length > 0) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-2 my-4 text-muted-foreground">
              {lines.map((line, lineIdx) => {
                const cleanLine = line.trim().replace(/^[-*]\s*/, '');
                return (
                  <li key={lineIdx} className="leading-relaxed">
                    {parseInlineFormatting(cleanLine)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Handle regular paragraph
        return (
          <p key={idx} className="whitespace-pre-line">
            {parseInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

