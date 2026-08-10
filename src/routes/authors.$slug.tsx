import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { getAuthor } from "@/lib/authors-data";
import { seoPages } from "@/lib/seo-pages-data";
import { caseStudiesData } from "@/lib/case-studies-data";
import {
  Linkedin,
  Calendar,
  Award,
  BookOpen,
  Briefcase,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/authors/$slug")({
  loader: ({ params }) => {
    const author = getAuthor(params.slug);
    if (!author) throw notFound();

    // Get blog posts authored by this person (match author name in seoPages)
    const authoredBlogPosts = Object.values(seoPages)
      .filter(
        (p) =>
          p.type === "blog" &&
          p.author &&
          p.author.toLowerCase().includes(author.name.split(" ")[0].toLowerCase())
      )
      .slice(0, 6);

    // Get case studies by this author
    const authoredCaseStudies = caseStudiesData.filter(
      (cs) => cs.author_slug === author.slug
    );

    return { author, authoredBlogPosts, authoredCaseStudies };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.author
      ? [
          { title: `${loaderData.author.name} — ${loaderData.author.title}` },
          {
            name: "description",
            content: `${loaderData.author.name} is a ${loaderData.author.title} at PanoPublish with ${loaderData.author.years_experience} years of experience in Google Street View publishing and 360° virtual tours.`,
          },
        ]
      : [],
  }),
  component: AuthorProfile,
});

function AuthorProfile() {
  const { author, authoredBlogPosts, authoredCaseStudies } =
    Route.useLoaderData();

  const canonicalUrl = `https://panopublish.com/authors/${author.slug}/`;

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Authors", url: "https://panopublish.com/authors/" },
    { name: author.name, url: canonicalUrl },
  ];

  // Person schema.org JSON-LD
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    url: canonicalUrl,
    ...(author.photo_url ? { image: author.photo_url } : {}),
    ...(author.linkedin_url ? { sameAs: [author.linkedin_url] } : {}),
    worksFor: {
      "@type": "Organization",
      name: "PanoPublish",
      url: "https://panopublish.com",
    },
    knowsAbout: author.specializations,
  };

  const initials = author.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`${author.name} — ${author.title}`}
        description={`${author.name} is a ${author.title} at PanoPublish with ${author.years_experience} years of experience in Google Street View publishing and 360° virtual tours.`}
        canonical={canonicalUrl}
        ogType="profile"
        schema={[personSchema]}
        breadcrumbs={breadcrumbs}
      />
      <PublicHeader />

      {/* HERO */}
      <section className="bg-slate-950 text-white py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.08),transparent_60%)] pointer-events-none" />
        <div className="container relative mx-auto px-4 max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            {/* Avatar */}
            <div className="shrink-0">
              <Avatar className="h-28 w-28 ring-4 ring-primary/30 ring-offset-2 ring-offset-slate-950">
                {author.photo_url && (
                  <AvatarImage src={author.photo_url} alt={author.name} />
                )}
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-3xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Details */}
            <div className="space-y-3 text-center sm:text-left">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
                  {author.name}
                </h1>
                <p className="text-sky-400 text-sm font-medium mt-1">
                  {author.title}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 justify-center sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {author.years_experience} years experience
                </span>
                {author.linkedin_url && (
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>

              {/* Credentials badges */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {author.credentials.map((cred: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-[10px] font-semibold text-sky-400"
                  >
                    <Award className="h-2.5 w-2.5" />
                    {cred}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BIO */}
      <section className="bg-white py-12 md:py-16 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-lg font-bold font-serif text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> About {author.name}
          </h2>
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
            {author.bio.split("\n\n").map((para: string, i: number) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Specializations */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Areas of Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {author.specializations.map((spec: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full border bg-slate-50 text-xs font-medium text-foreground"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CASE STUDIES */}
      {authoredCaseStudies.length > 0 && (
        <section className="bg-slate-50/50 py-12 border-b">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            <h2 className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Case Studies by {author.name}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {authoredCaseStudies.map((cs) => (
                <Link
                  key={cs.slug}
                  to="/case-studies/$slug/"
                  params={{ slug: cs.slug }}
                  className="group block border rounded-2xl p-5 bg-white hover:border-primary/40 hover:shadow-md transition-all space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {cs.industry_label}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {cs.city}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {cs.client_name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {cs.tagline}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                    Read case study <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BLOG POSTS */}
      {authoredBlogPosts.length > 0 && (
        <section className="bg-white py-12">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            <h2 className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Articles by {author.name}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {authoredBlogPosts.map((post) => (
                <Link
                  key={post.slug}
                  to="/blog/$slug/"
                  params={{ slug: post.slug }}
                  className="group block border rounded-2xl p-4 hover:border-primary/40 hover:bg-slate-50/60 transition-all space-y-2"
                >
                  {post.image && (
                    <div className="rounded-xl overflow-hidden aspect-video">
                      <img
                        src={post.image}
                        alt={post.heading}
                        width={320}
                        height={180}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {post.category}
                  </p>
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {post.heading}
                  </p>
                  {post.date && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {post.date}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-slate-950 text-white py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center space-y-4">
          <h2 className="text-xl md:text-2xl font-bold font-serif">
            Ready to publish your 360° virtual tour?
          </h2>
          <p className="text-slate-400 text-sm">
            Start your free trial today — no credit card required.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link to="/signup/">
              <Button className="font-bold px-6">Start Free Trial</Button>
            </Link>
            <Link to="/contact/">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 font-semibold"
              >
                Contact {author.name.split(" ")[0]}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
