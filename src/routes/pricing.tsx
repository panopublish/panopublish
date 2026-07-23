import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "PanoPublish Pricing — Free Trial & INR Monthly Plans" },
      {
        name: "description",
        content:
          "Transparent PanoPublish pricing starting at ₹499/mo. 7-day free trial, zero per-publish fees, direct Google Maps API publishing, and UPI payment support.",
      },
    ],
  }),
  component: PricingPage,
});

const pricingPlans = [
  {
    name: "Basic Plan",
    price: "499",
    description: "Ideal for independent photographers starting with Google Street View.",
    features: [
      "Up to 5 Active Tours",
      "50 Photos Per Tour",
      "Standard Nadir Blur Editor",
      "Direct Street View Publishing",
      "Email Support",
    ],
    ctaText: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro Plan",
    price: "1,499",
    description: "Perfect for active agencies, local guides, and freelance publishers.",
    features: [
      "Up to 25 Active Tours",
      "200 Photos Per Tour",
      "Custom Logo Nadir Branding",
      "Proximity Auto-linking",
      "Priority WhatsApp Support (IST)",
    ],
    ctaText: "Start Free Trial",
    popular: true,
  },
  {
    name: "Agency Plan",
    price: "2,999",
    description: "Designed for large media networks, real estate groups, and hotels.",
    features: [
      "Unlimited Tours",
      "Unlimited Photos",
      "Custom Nadir Branding",
      "Auto-linking Paths",
      "Dedicated Account Manager",
    ],
    ctaText: "Start Free Trial",
    popular: false,
  },
];

const faqs = [
  {
    question: "How does the 7-day free trial work for free virtual tour software evaluation?",
    answer: "You get full access to PanoPublish for 7 days without entering credit card or payment details. Test photo uploads, EXIF GPS parsing, nadir tripod blurring, and visual path connection tools before deciding on a subscription.",
  },
  {
    question: "Does PanoPublish charge per-tour publishing fees to Google Maps?",
    answer: "No. Unlike legacy platforms or Matterport which charge $14.99 add-on fees per export [VERIFY], direct Google Street View publishing is 100% included in all PanoPublish plans with zero extra charges.",
  },
  {
    question: "What payment methods are accepted for PanoPublish subscriptions?",
    answer: "We support instant UPI transfers (GPay, PhonePe, Paytm), NetBanking across all major Indian banks, local credit/debit cards via Razorpay, and official GST tax invoices for business input tax credit.",
  },
];

function PricingPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PanoPublish",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    offers: pricingPlans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.price.replace(",", ""),
      priceCurrency: "INR",
      priceValidUntil: "2026-12-31",
      description: plan.description,
      url: "https://panopublish.com/pricing",
    })),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <SEO
        title="PanoPublish Pricing — Free Trial & INR Monthly Plans"
        description="Transparent PanoPublish pricing starting at ₹499/mo. 7-day free trial, zero per-publish fees, direct Google Maps API publishing, and UPI payment support."
        breadcrumbs={[
          { name: "Home", url: "https://panopublish.com/" },
          { name: "Pricing", url: "https://panopublish.com/pricing" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PublicHeader />

      <main className="flex-1 py-16 md:py-24 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> 7-Day Free Trial • No Credit Card Required
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground tracking-tight">
              PanoPublish Pricing & Free Trial Evaluation
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Transparent Indian Rupee (INR) monthly plans designed for 360° photographers, realtors, and digital agencies. Zero per-publish fees to Google Maps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch mb-16">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-2xl bg-white p-6 shadow-sm flex flex-col relative transition-all hover:shadow-md ${
                  plan.popular ? "border-2 border-primary scale-[1.03]" : "border-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold font-serif text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">₹{plan.price}</span>
                    <span className="text-muted-foreground text-xs">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs md:text-sm text-muted-foreground mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className={`w-full font-bold ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`}
                  >
                    {plan.ctaText}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Detailed Content & Free Virtual Tour Software Evaluation Section */}
          <section className="bg-white border rounded-2xl p-8 md:p-12 mb-16 shadow-sm space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold font-serif text-foreground">
                Evaluating Free Virtual Tour Software vs PanoPublish Plans
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you are looking for free virtual tour software to test 360° photo publishing, free tools often come with severe restrictions—such as low-resolution exports, heavy third-party watermarks, or hidden fees ($14.99 per publish) when exporting to Google Maps [VERIFY]. PanoPublish provides a full-featured 7-day free trial that allows photographers and agencies to evaluate professional Google Street View publishing without upfront credit card requirements.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-4 border-t">
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground font-serif">
                  What You Get During Your Free Evaluation
                </h3>
                <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Upload 360° equirectangular JPEG files up to 75MB.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Automatic EXIF GPS parsing & visual yaw heading alignment.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Browser-based nadir tripod blurring and logo disk placement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Test node path linking for multi-room walkthroughs.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground font-serif">
                  Relevant Product & Comparison Guides
                </h3>
                <ul className="space-y-2.5 text-xs md:text-sm">
                  <li>
                    <Link
                      to="/$slug"
                      params={{ slug: "google-street-view-publishing" }}
                      className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Google Street View Publishing Software <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/$slug"
                      params={{ slug: "cloudpano-alternative" }}
                      className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      CloudPano Alternative & Pricing Comparison <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/$slug"
                      params={{ slug: "matterport-alternative" }}
                      className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Matterport Alternative Guide (2026) <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/$slug"
                      params={{ slug: "real-estate-virtual-tour-software" }}
                      className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Real Estate Virtual Tour Software for Realtors <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-bold text-lg font-serif text-foreground mb-4">
                Pricing Frequently Asked Questions
              </h3>
              <div className="grid gap-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl space-y-1">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                      {faq.question}
                    </h4>
                    <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Secure Checkout Note */}
          <div className="max-w-xl mx-auto border bg-white p-6 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
              Secure Checkout via Razorpay
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We process all subscriptions securely via Razorpay. Major credit cards, debit cards, Net Banking, and instant UPI transfers (GPay, PhonePe, Paytm) are fully supported with GST tax invoices.
            </p>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
