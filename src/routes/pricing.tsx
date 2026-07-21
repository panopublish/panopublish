import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing Plans — PanoPublish" },
      {
        name: "description",
        content:
          "Choose the perfect plan for virtual tour publishing. Transparent monthly plans in INR with a 7-day free trial. Start publishing to Google Maps today.",
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
      "Priority WhatsApp Support",
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

function PricingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <SEO
        title="Pricing Plans — PanoPublish"
        description="Choose the perfect plan for virtual tour publishing. Transparent monthly plans in INR with a 7-day free trial. Start publishing to Google Maps today."
        breadcrumbs={[
          { name: "Home", url: "https://panopublish.com/" },
          { name: "Pricing", url: "https://panopublish.com/pricing" },
        ]}
      />
      <PublicHeader />

      <main className="flex-1 py-16 md:py-24 bg-slate-50/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-3xl md:text-5xl font-extrabold font-serif text-foreground tracking-tight mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Every plan starts with a fully featured 7-day free trial. No credit card required. Cancel anytime.
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
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Popular
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

          {/* Secure Checkout Note */}
          <div className="max-w-xl mx-auto border bg-white p-6 rounded-2xl shadow-elegant text-center flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
              Secure Checkout via Razorpay
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We process all subscriptions securely via Razorpay. Major credit cards, debit cards, Net Banking, and instant UPI transfers (GPay, PhonePe, Paytm) are fully supported.
            </p>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
