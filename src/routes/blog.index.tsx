import { createFileRoute, Link } from "@tanstack/react-router";
import { seoPages } from "@/lib/seo-pages-data";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, Clock, User, ArrowRight, BookOpen } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
});

function BlogIndex() {
  // Extract all blogs from database
  const blogs = Object.values(seoPages).filter((page) => page.type === "blog");

  // Pick one blog as a featured article (e.g. how to publish)
  const featuredBlog = blogs.find(
    (b) => b.slug === "how-to-publish-360-photos-to-google-street-view"
  ) || blogs[0];

  // Rest are normal list items
  const regularBlogs = blogs.filter((b) => b.slug !== featuredBlog?.slug);

  const breadcrumbs = [
    { name: "Home", url: "https://app.panopublish.com/" },
    { name: "Blog", url: "https://app.panopublish.com/blog" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="360° Virtual Tour & Google Street View Blog — PanoPublish"
        description="Learn how to shoot, edit, brand, and publish 360-degree panoramas to Google Maps. Tutorials, guides, and hardware reviews for Indian photographers."
        breadcrumbs={breadcrumbs}
      />
      <PublicHeader />

      {/* HEADER SECTION */}
      <section className="bg-slate-950 text-white py-16 md:py-20 select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />
        <div className="container relative mx-auto px-4 max-w-5xl text-center space-y-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-xs font-semibold text-sky-400">
            <BookOpen className="h-3.5 w-3.5" /> Educational Resources
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-serif">
            The PanoPublish Blog
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
            Your master guide to 360° photography, Google Street View optimization, and building a digital media business in India.
          </p>
        </div>
      </section>

      {/* BLOG CONTENT LIST */}
      <main className="flex-1 py-16 md:py-24 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl space-y-16">
          {/* Featured Blog */}
          {featuredBlog && (
            <div className="group rounded-3xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-primary/10 to-primary/2 flex items-center justify-center p-8 min-h-[250px] relative">
                <div className="absolute inset-0 bg-[radial-gradient(var(--primary-glow)_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                <BookOpen className="h-20 w-20 text-primary/30 group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      Featured Guide
                    </span>
                    <span className="text-xs text-muted-foreground">{featuredBlog.category}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground group-hover:text-primary transition-colors">
                    <Link to={`/blog/${featuredBlog.slug}`}>{featuredBlog.heading}</Link>
                  </h2>
                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-3">
                    {featuredBlog.introText}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-4">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {featuredBlog.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {featuredBlog.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {featuredBlog.readTime}
                    </span>
                  </div>
                  <Link to={`/blog/${featuredBlog.slug}`}>
                    <Button className="w-full md:w-auto font-bold flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
                      Read Article <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Grid of other articles */}
          <div className="space-y-8">
            <h3 className="text-lg md:text-xl font-bold font-serif text-foreground border-b pb-3">
              All Articles
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularBlogs.map((blog) => (
                <Card
                  key={blog.slug}
                  className="group hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between bg-white border"
                >
                  <CardHeader className="p-0">
                    <div className="bg-slate-50 flex items-center justify-center p-6 h-40 border-b relative">
                      <div className="absolute inset-0 bg-[radial-gradient(var(--primary-glow)_1px,transparent_1px)] [background-size:12px_12px] opacity-10" />
                      <BookOpen className="h-12 w-12 text-slate-300 group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 flex-1 space-y-3">
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {blog.category}
                    </span>
                    <h4 className="font-bold text-sm md:text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      <Link to={`/blog/${blog.slug}`}>{blog.heading}</Link>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {blog.introText}
                    </p>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 border-t flex flex-col items-start gap-4">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-3 w-full justify-between">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" /> {blog.date}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {blog.readTime}
                      </span>
                    </div>
                    <Link to={`/blog/${blog.slug}`} className="w-full">
                      <Button variant="ghost" size="sm" className="w-full text-xs font-bold justify-between group-hover:text-primary p-0">
                        Read Guide <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
