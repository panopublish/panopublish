import { createFileRoute } from "@tanstack/react-router";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { FAQBlock } from "@/components/FAQBlock";
import { Button } from "@/components/ui/button";
import { faqCategories, allFaqs } from "@/lib/faq-data";
import { Link } from "@tanstack/react-router";
import {
  HelpCircle,
  CreditCard,
  Globe2,
  Camera,
  LifeBuoy,
  Receipt,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      {
        title:
          "FAQ — Google Street View & 360° Virtual Tour Publishing | PanoPublish",
      },
      {
        name: "description",
        content:
          "Answers to the most common questions about PanoPublish — pricing plans, Google Street View publishing, 360° photo requirements, billing, and support.",
      },
    ],
  }),
  component: FAQPage,
});

const categoryIcons: Record<string, React.ReactNode> = {
  pricing: <CreditCard className="h-5 w-5" />,
  "street-view-publishing": <Globe2 className="h-5 w-5" />,
  technical: <Camera className="h-5 w-5" />,
  billing: <Receipt className="h-5 w-5" />,
  support: <LifeBuoy className="h-5 w-5" />,
};

function FAQPage() {
  const breadcrumbs = [
    { name: "Home", url: "https://panopublish.com/" },
    { name: "FAQ", url: "https://panopublish.com/faq" },
  ];

  // Full FAQPage schema for the hub page (all questions)
  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="FAQ — Google Street View & 360° Virtual Tour Publishing | PanoPublish"
        description="Answers to common questions about PanoPublish — pricing, Street View publishing, 360° photo requirements, billing, and support."
        canonical="https://panopublish.com/faq"
        schema={[faqPageSchema]}
        breadcrumbs={breadcrumbs}
      />
      <PublicHeader />

      {/* HEADER */}
      <section className="bg-slate-950 text-white py-16 md:py-20 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />
        <div className="container relative mx-auto px-4 max-w-4xl text-center space-y-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-xs font-semibold text-sky-400">
            <HelpCircle className="h-3.5 w-3.5" /> Help Centre
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-serif">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
            Everything you need to know about publishing 360° virtual tours to
            Google Maps with PanoPublish.
          </p>

          {/* Category quick-jump */}
          <div className="flex flex-wrap gap-2 justify-center pt-4">
            {faqCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors"
              >
                {categoryIcons[cat.id] ?? <HelpCircle className="h-3.5 w-3.5" />}
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ CATEGORIES */}
      <main className="flex-1 py-14 bg-slate-50/40">
        <div className="container mx-auto px-4 max-w-3xl space-y-16">
          {faqCategories.map((cat) => (
            <section key={cat.id} id={cat.id} className="scroll-mt-24 space-y-6">
              {/* Category heading */}
              <div className="flex items-center gap-3 border-b pb-3">
                <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {categoryIcons[cat.id] ?? <HelpCircle className="h-5 w-5" />}
                </span>
                <h2 className="text-lg md:text-xl font-bold font-serif text-foreground">
                  {cat.label}
                </h2>
              </div>

              {/*
                FAQBlock renders all answers in DOM via forceMount.
                Each category gets its own scoped FAQPage JSON-LD via FAQBlock internally.
                The hub-level FAQPage schema above covers all questions for crawlers.
                We suppress the block-level schema here (schemaId is omitted) to avoid
                duplicate FAQPage markup — the hub schema already covers everything.
              */}
              <FAQBlock
                faqs={cat.faqs}
                className="space-y-3"
              />
            </section>
          ))}

          {/* Still have a question? */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-8 text-center space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.08),transparent_60%)] pointer-events-none" />
            <div className="relative space-y-4">
              <h2 className="text-xl font-bold font-serif">
                Still have a question?
              </h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Our team is available on WhatsApp Monday–Saturday, 10 AM–7 PM
                IST.
              </p>
              <div className="flex flex-wrap gap-3 justify-center pt-1">
                <a
                  href="https://wa.me/919408808438"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="font-bold gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                  </Button>
                </a>
                <Link to="/contact">
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/10 font-semibold"
                  >
                    Contact Form <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
