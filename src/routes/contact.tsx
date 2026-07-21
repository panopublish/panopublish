import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mail, MapPin, Clock, ArrowLeft, Send } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { useState } from "react";
import { toast } from "sonner";
import { waLink } from "@/lib/format";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — PanoPublish" },
      {
        name: "description",
        content:
          "Have questions? Get in touch with the PanoPublish team for support, custom enterprise pricing, or API integrations.",
      },
    ],
  }),
  component: ContactUs,
});

function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Thank you for your message! Our team will respond shortly.");
      setName("");
      setEmail("");
      setMessage("");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <SEO
        title="Contact Us — PanoPublish"
        description="Have questions? Get in touch with the PanoPublish team for support, custom enterprise pricing, or API integrations."
        breadcrumbs={[
          { name: "Home", url: "https://app.panopublish.com/" },
          { name: "Contact", url: "https://app.panopublish.com/contact" },
        ]}
      />
      <PublicHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Us</h1>
          <p className="text-muted-foreground leading-relaxed">
            Have questions about our plans, features, or need support? We'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-stretch">
          {/* Contact Details Card */}
          <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-lg font-bold font-serif">Get in touch directly</h3>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</h4>
                  <p className="text-sm font-semibold mt-0.5">contact@panopublish.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#8bc34a]/15 text-[#689f38] flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 fill-[#8bc34a]/20" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</h4>
                  <a
                    href={waLink("Hi, I need help with PanoPublish")}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary hover:underline mt-0.5 block"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Support Hours</h4>
                  <p className="text-sm mt-0.5 text-foreground font-medium">Monday – Saturday: 10 AM to 7 PM IST</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Office</h4>
                  <p className="text-sm mt-0.5 text-foreground leading-relaxed">
                    <strong>PanoPublish Solutions</strong><br />
                    5, Jay Ambe Nagar, Hatkeshwar,<br />
                    Ahmedabad, Gujarat, 380026<br />
                    India
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-4">
              Registered business inquiries will be acknowledged within 24 business hours.
            </div>
          </div>

          {/* Contact Form Card */}
          <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold font-serif mb-4">Send a message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-bold text-gray-700">Name</Label>
                <Input
                  id="name"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-bold text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="message" className="text-xs font-bold text-gray-700">Message</Label>
                <Textarea
                  id="message"
                  placeholder="How can we help you?"
                  className="min-h-[120px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={sending} className="w-full font-bold flex items-center justify-center gap-2">
                {sending ? "Sending..." : "Send Message"}
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
