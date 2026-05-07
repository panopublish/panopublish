import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, MapPin, Camera, Globe2, ShieldCheck, Sparkles, MessageCircle, Play, ChevronDown } from "lucide-react";
import { formatINR, waLink } from "@/lib/format";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TourVista — Publish Your Business on Google Maps in Minutes" },
      { name: "description", content: "TourVista helps Indian businesses publish 360° Google Street View tours. Manage clients, photos and publishing — starting at ₹499/month." },
      { property: "og:title", content: "TourVista — Google Street View Tours for Indian Businesses" },
      { property: "og:description", content: "Publish your business on Google Maps in minutes. Plans from ₹499/month." },
    ],
  }),
  component: Landing,
});

const plans = [
  { name: "Basic", priceMonthly: 499, popular: false, features: ["1 user", "5 tours", "50 photos per tour", "Email support"] },
  { name: "Pro", priceMonthly: 1499, popular: true, features: ["3 users", "25 tours", "200 photos per tour", "WhatsApp support", "Priority processing"] },
  { name: "Agency", priceMonthly: 2999, popular: false, features: ["Unlimited users", "Unlimited tours", "Unlimited photos", "Dedicated support", "White label option"] },
];

const faqs = [
  ["Do I need a camera to use TourVista?", "You can publish any 360° JPEG photos. Insta360, Ricoh Theta or any 360° camera works. We can also recommend a vendor if you don’t have one."],
  ["How long does it take to publish to Google Maps?", "Most tours go live on Google within 24–48 hours after upload, depending on Google’s processing queue."],
  ["Can I manage multiple clients?", "Yes. TourVista is built for agencies — Pro and Agency plans let you organise unlimited clients and tours from one dashboard."],
  ["Is my data safe?", "All photos are stored securely on encrypted cloud storage. Each user can only access their own clients, tours and photos."],
  ["How do I get support?", "Chat with us on WhatsApp from any page, Mon–Sat 10am–7pm IST. Pro and Agency plans get priority response."],
];

function Landing() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky banner */}
      <div className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-center text-sm py-2 px-4">
        🎉 <strong>Try Free for 7 Days</strong> — no credit card required.{" "}
        <Link to="/signup" className="underline font-medium">Start your trial →</Link>
      </div>

      {/* Nav */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">T</span>
            TourVista
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#pricing" className="hover:text-primary">Pricing</a>
            <a href="#faq" className="hover:text-primary">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm">Start Free Trial</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative mx-auto px-4 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Built for Indian businesses
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Publish Your Business on <span className="bg-clip-text text-transparent gradient-hero">Google Maps</span> in Minutes
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            TourVista is the easiest way to manage 360° Google Street View tours for your clients — hotels, restaurants, showrooms, hospitals and more.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup"><Button size="lg" className="shadow-elegant">Start Free 7-Day Trial</Button></Link>
            <a href="#demo"><Button size="lg" variant="outline"><Play className="h-4 w-4 mr-2" /> Watch 2-min demo</Button></a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Demo placeholder */}
      <section id="demo" className="container mx-auto px-4 pb-12">
        <div className="aspect-video max-w-4xl mx-auto rounded-2xl border-2 border-dashed bg-card flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="h-7 w-7" /></div>
            <p className="font-medium">Watch 2-minute demo</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need to publish 360° tours</h2>
          <p className="mt-3 text-muted-foreground">Designed for photographers and agencies serving businesses across India.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { i: MapPin, t: "Google Maps Publishing", d: "One-click publish to Google Street View directly from your dashboard." },
            { i: Camera, t: "360° Photo Manager", d: "Drag & drop your 360° JPEGs. We handle organising, EXIF and GPS." },
            { i: Globe2, t: "Multi-Client Workspace", d: "Manage all your clients’ tours in one place — perfect for agencies." },
            { i: ShieldCheck, t: "Secure & Private", d: "Your data is encrypted and isolated. Only you see your clients." },
            { i: MessageCircle, t: "WhatsApp Support", d: "Talk to a real person on WhatsApp, Mon–Sat 10am–7pm IST." },
            { i: Sparkles, t: "Made in India 🇮🇳", d: "Pricing in ₹, GST invoices, UPI, Net Banking — built for India." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><f.i className="h-5 w-5" /></div>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, transparent pricing</h2>
            <p className="mt-3 text-muted-foreground">All prices in INR. GST invoices included.</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card p-1">
              <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 text-sm rounded-full ${!annual ? "bg-primary text-primary-foreground" : ""}`}>Monthly</button>
              <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 text-sm rounded-full ${annual ? "bg-primary text-primary-foreground" : ""}`}>Annual <span className="ml-1 text-xs text-success">Save 20%</span></button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p) => {
              const price = annual ? Math.round(p.priceMonthly * 12 * 0.8) : p.priceMonthly;
              return (
                <div key={p.name} className={`relative rounded-2xl border bg-card p-6 ${p.popular ? "ring-2 ring-primary shadow-elegant" : ""}`}>
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Most Popular</div>
                  )}
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatINR(price)}</span>
                    <span className="text-muted-foreground text-sm">/{annual ? "year" : "month"}</span>
                  </div>
                  <ul className="mt-5 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5" />{f}</li>
                    ))}
                  </ul>
                  <Link to="/signup" className="mt-6 block">
                    <Button className="w-full" variant={p.popular ? "default" : "outline"}>Start Free 7-Day Trial</Button>
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Payments secured by <strong>Razorpay</strong> • UPI • Cards • Net Banking • EMI available
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">Trusted by photographers across India</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["I publish 8–10 hotel tours a month for clients in Goa. TourVista cut my admin time in half.", "Rahul M.", "360° Photographer, Goa"],
            ["Finally a tool with INR pricing, GST invoices and WhatsApp support. Exactly what we needed.", "Priya S.", "Marketing Agency, Bengaluru"],
            ["The island system keeps multi-floor showroom tours organised. My clients love it.", "Anil K.", "Real-estate media, Delhi"],
          ].map(([q, n, r]) => (
            <div key={n} className="rounded-xl border bg-card p-6">
              <p className="text-sm">“{q}”</p>
              <div className="mt-4">
                <div className="font-semibold text-sm">{n}</div>
                <div className="text-xs text-muted-foreground">{r}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-2">Frequently asked questions <ChevronDown className="h-6 w-6" /></h2>
          </div>
          <Accordion type="single" collapsible className="bg-card rounded-xl border">
            {faqs.map(([q, a], i) => (
              <AccordionItem key={i} value={`f${i}`} className="px-5">
                <AccordionTrigger className="text-left font-medium">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-2">
          <div>Made with ❤️ in India  |  © 2025 TourVista  |  GST: 29ABCDE1234F1Z5</div>
          <div>
            <a href={waLink("Hi, I have a question about TourVista pricing")} target="_blank" rel="noreferrer" className="text-whatsapp font-medium inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> WhatsApp Support
            </a>
            <span className="mx-2">•</span>Mon–Sat, 10am–7pm IST
          </div>
        </div>
      </footer>
    </div>
  );
}
