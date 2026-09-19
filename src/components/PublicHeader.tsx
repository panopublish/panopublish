import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ChevronRight, ChevronDown, MessageCircle, Menu, X, Globe, Camera } from "lucide-react";

const WA_NUMBER = "919408808438"; // WhatsApp business number
const WA_MSG = encodeURIComponent("Hi! I'd like to learn more about PanoPublish virtual tour software.");

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/95 border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3.5 max-w-6xl">
          <a href="/" onClick={() => setMobileMenuOpen(false)}>
            <Logo logoClassName="text-primary h-8 w-8" className="text-xl" />
          </a>

          {/* Desktop Navigation - Hidden on Mobile */}
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

          {/* Desktop Right Buttons - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-3">
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

          {/* Mobile Right Controls: Compact CTA + Hamburger Menu */}
          <div className="flex md:hidden items-center gap-2">
            <a href="/signup/">
              <Button size="sm" className="h-8 px-3 text-xs font-bold shadow-sm">
                Try Free
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-full bottom-0 bg-background/98 backdrop-blur-xl border-t z-50 overflow-y-auto flex flex-col justify-between px-5 pt-4 pb-24 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1 divide-y divide-slate-100">
              {/* Product Accordion */}
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => setMobileProductOpen(!mobileProductOpen)}
                  className="w-full flex items-center justify-between py-3 px-2 rounded-xl text-base font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    Product Features
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileProductOpen ? "rotate-180 text-primary" : "text-slate-400"
                    }`}
                  />
                </button>
                {mobileProductOpen && (
                  <div className="pl-3 pr-1 py-1 space-y-1 animate-in fade-in duration-150">
                    <a
                      href="/360-virtual-tour-publishing-platform/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="font-semibold text-sm text-foreground">360° Virtual Tours</div>
                      <div className="text-xs text-muted-foreground">Create, brand, and host interactive tours</div>
                    </a>
                    <a
                      href="/google-street-view-publishing/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="font-semibold text-sm text-foreground">Google Street View</div>
                      <div className="text-xs text-muted-foreground">Automated path linking & Maps publishing</div>
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-1">
                <a
                  href="/pricing/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-2 rounded-xl text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="/case-studies/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-2 rounded-xl text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  Case Studies
                </a>
                <a
                  href="/blog/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-2 rounded-xl text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  Blog & Guides
                </a>
                <a
                  href="/faq/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-2 rounded-xl text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  FAQ
                </a>
                <a
                  href="/contact/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-2 rounded-xl text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  Contact & Support
                </a>
              </div>
            </div>

            {/* Mobile Actions / Auth */}
            <div className="pt-6 border-t space-y-3">
              <a href="/login/" onClick={() => setMobileMenuOpen(false)} className="block">
                <Button variant="outline" className="w-full justify-center text-sm font-bold h-11 rounded-xl">
                  Sign in
                </Button>
              </a>
              <a href="/signup/" onClick={() => setMobileMenuOpen(false)} className="block">
                <Button className="w-full justify-center text-sm font-bold h-11 rounded-xl shadow-md">
                  Start Free 7-Day Trial
                </Button>
              </a>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Chat with Us on WhatsApp
              </a>
            </div>
          </div>
        )}
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
