import { createFileRoute, Link } from "@tanstack/react-router";
import { seoPages } from "@/lib/seo-pages-data";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, ArrowRight, BookOpen, MapPin, Search } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "360° Virtual Tour & Google Street View Blog — PanoPublish" },
      {
        name: "description",
        content:
          "Learn how to shoot, edit, brand, and publish 360-degree panoramas to Google Maps. Tutorials, guides, and hardware reviews for Indian photographers and agencies.",
      },
    ],
  }),
  component: BlogIndex,
});

const CATEGORIES = [
  "All",
  "Google Street View",
  "360° Photography",
  "Virtual Tour Software",
  "Industry Solutions",
  "Business & Marketing",
];

function parseBlogDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const timestamp = Date.parse(dateStr);
  return isNaN(timestamp) ? 0 : timestamp;
}

function matchesCategory(blogCategory: string | undefined, blogTitle: string, selectedCategory: string): boolean {
  if (selectedCategory === "All") return true;
  const cat = (blogCategory || "").toLowerCase();
  const title = blogTitle.toLowerCase();

  switch (selectedCategory) {
    case "Google Street View":
      return cat.includes("street view") || cat.includes("google") || title.includes("street view") || title.includes("google maps");
    case "360° Photography":
      return cat.includes("photography") || cat.includes("camera") || cat.includes("gear") || title.includes("photography") || title.includes("stitching") || title.includes("camera");
    case "Virtual Tour Software":
      return cat.includes("software") || cat.includes("virtual tour") || cat.includes("platform") || title.includes("software") || title.includes("builder");
    case "Industry Solutions":
      return cat.includes("industry") || cat.includes("solutions") || title.includes("real estate") || title.includes("hotel") || title.includes("school") || title.includes("restaurant");
    case "Business & Marketing":
      return cat.includes("business") || cat.includes("agency") || cat.includes("pricing") || title.includes("business") || title.includes("client") || title.includes("monetiz");
    default:
      return true;
  }
}

function BlogIndex() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Extract all blogs from database and sort by date (Recently published first)
  const allBlogsSorted = useMemo(() => {
    const rawBlogs = Object.values(seoPages).filter((page) => page.type === "blog");
    return rawBlogs.sort((a, b) => parseBlogDate(b.date) - parseBlogDate(a.date));
  }, []);

  // Pick one blog as a featured article (e.g. how to publish or most recent)
  const featuredBlog = useMemo(() => {
    return (
      allBlogsSorted.find((b) => b.slug === "how-to-publish-360-photos-to-google-street-view") ||
      allBlogsSorted[0]
    );
  }, [allBlogsSorted]);

  // Filter regular blogs by selected category and search query
  const filteredBlogs = useMemo(() => {
    return allBlogsSorted.filter((b) => {
      const matchesCat = matchesCategory(b.category, b.heading, selectedCategory);
      const matchesSearch =
        searchQuery.trim() === "" ||
        b.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.introText.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [allBlogsSorted, selectedCategory, searchQuery]);

  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "Blog", url: "https://panopublish.com/blog" },
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
      <main className="flex-1 py-12 md:py-20 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl space-y-12">
          {/* Featured Blog */}
          {featuredBlog && selectedCategory === "All" && searchQuery === "" && (
            <div className="group rounded-3xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 grid md:grid-cols-2">
              <div className="flex items-center justify-center min-h-[250px] relative overflow-hidden bg-slate-100 w-full">
                {featuredBlog.image ? (
                  <img
                    src={featuredBlog.image}
                    alt={featuredBlog.heading}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/2" />
                    <div className="absolute inset-0 bg-[radial-gradient(var(--primary-glow)_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                    <BookOpen className="h-20 w-20 text-primary/30 group-hover:scale-105 transition-transform duration-300 z-10" />
                  </>
                )}
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
                    <Link to="/blog/$slug" params={{ slug: featuredBlog.slug }}>
                      {featuredBlog.heading}
                    </Link>
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
                  <Link to="/blog/$slug" params={{ slug: featuredBlog.slug }}>
                    <Button className="w-full md:w-auto font-bold flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
                      Read Article <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* SEARCH & CATEGORY FILTER TABS */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-white border text-muted-foreground hover:text-foreground hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-full bg-white border"
                />
              </div>
            </div>

            {/* Articles Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold font-serif text-foreground">
                {selectedCategory === "All" ? "All Articles (Recently Published First)" : `${selectedCategory} Articles`}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                Showing {filteredBlogs.length} articles
              </span>
            </div>

            {/* Grid of articles */}
            {filteredBlogs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border space-y-3">
                <p className="text-muted-foreground text-sm font-medium">No articles found matching your criteria.</p>
                <Button variant="outline" size="sm" onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBlogs.map((blog) => (
                  <Card
                    key={blog.slug}
                    className="group hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between bg-white border"
                  >
                    <CardHeader className="p-0">
                      <div className="h-44 border-b relative overflow-hidden bg-slate-50 flex items-center justify-center">
                        {blog.image ? (
                          <img
                            src={blog.image}
                            alt={blog.heading}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-slate-50" />
                            <div className="absolute inset-0 bg-[radial-gradient(var(--primary-glow)_1px,transparent_1px)] [background-size:12px_12px] opacity-10" />
                            <BookOpen className="h-12 w-12 text-slate-300 group-hover:scale-105 transition-transform duration-300 z-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 flex-1 space-y-3">
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {blog.category}
                      </span>
                      <h4 className="font-bold text-sm md:text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        <Link to="/blog/$slug" params={{ slug: blog.slug }}>
                          {blog.heading}
                        </Link>
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
                      <Link to="/blog/$slug" params={{ slug: blog.slug }} className="w-full">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs font-bold justify-between group-hover:text-primary p-0"
                        >
                          Read Guide <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* City Coverage Index (Local SEO Links) */}
            <div className="border-t pt-16 space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h3 className="text-xl md:text-2xl font-bold font-serif text-foreground">
                  Virtual Tour Services in India
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Explore our local 360° publishing and maps optimization services in top business hubs.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center max-w-4xl mx-auto pt-4">
                {Object.values(seoPages)
                  .filter((p) => p.type === "city")
                  .map((city) => (
                    <Link
                      key={city.slug}
                      to="/$slug"
                      params={{ slug: city.slug }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border bg-white text-xs md:text-sm font-semibold text-foreground hover:text-primary hover:border-primary/30 hover:shadow-xs transition-all"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {city.cityName}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
