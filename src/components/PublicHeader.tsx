import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ChevronRight, ChevronDown, MessageCircle } from "lucide-react";

const WA_NUMBER = "919408808438"; // WhatsApp business number
const WA_MSG = encodeURIComponent("Hi! I'd like to learn more about PanoPublish virtual tour software.");

export function PublicHeader() {
  return (
    <>
      <div className="bg-gradient-to-r from-primary to-[#38BDF8] text-white text-center text-xs font-semibold py-2 px-4 select-none animate-pulse">
        🚀 Start publishing today! Try PanoPublish free for 7 days. No credit card required.{" "}
        <a
          href="/signup/"
          className="underline hover:text-white/80 transition-colors ml-1 inline-flex items-center gap-0.5"
        >
          Sign up now <ChevronRight className="h-3 w-3" />
        </a>
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3.5 max-w-6xl">
          <a href="/">
            <Logo logoClassName="text-primary h-8 w-8" className="text-xl" />
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            {/* Product Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-primary transition-colors py-2 focus:outline-none focus:text-primary"
                aria-expanded="false"
                aria-haspopup="true"
              >
                Product <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute left-0 top-full hidden group-hover:block group-focus-within:block pt-1 z-50">
                <div className="bg-popover text-popover-foreground border rounded-lg shadow-xl py-2 w-64 ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
                  <a
                    href="/360-virtual-tour-publishing-platform/"
                    className="block px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="font-semibold text-sm text-foreground">360° Virtual Tours</div>
                    <div className="text-xs text-muted-foreground">Create, brand, and host interactive tours</div>
                  </a>
                  <a
                    href="/google-street-view-publishing/"
                    className="block px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="font-semibold text-sm text-foreground">Google Street View</div>
                    <div className="text-xs text-muted-foreground">Automated path linking & Maps publishing</div>
                  </a>
                </div>
              </div>
            </div>

            <a href="/pricing/" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="/case-studies/" className="hover:text-primary transition-colors">
              Case Studies
            </a>
            <a href="/blog/" className="hover:text-primary transition-colors">
              Blog
            </a>
            <a href="/faq/" className="hover:text-primary transition-colors">
              FAQ
            </a>
            <a href="/contact/" className="hover:text-primary transition-colors">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login/">
              <Button variant="ghost" size="sm" id="btn-nav-login">
                Sign in
              </Button>
            </a>
            <a href="/signup/">
              <Button size="sm" className="shadow-elegant" id="btn-nav-signup">
                Start Free Trial
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Mobile-only sticky bottom CTA — reinforces the 3.5x better mobile CTR surface */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3">
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          id="btn-mobile-whatsapp"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold py-3 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Chat on WhatsApp
        </a>
        <a href="/signup/" className="flex-1">
          <Button size="sm" className="w-full py-3 text-sm font-semibold" id="btn-mobile-signup">
            Start Free Trial
          </Button>
        </a>
      </div>
    </>
  );
}
