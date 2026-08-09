import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ChevronRight, MessageCircle } from "lucide-react";

const WA_NUMBER = "919408808438"; // WhatsApp business number
const WA_MSG = encodeURIComponent("Hi! I'd like to learn more about PanoPublish virtual tour software.");

export function PublicHeader() {
  return (
    <>
      <div className="bg-gradient-to-r from-primary to-[#38BDF8] text-white text-center text-xs font-semibold py-2 px-4 select-none animate-pulse">
        🚀 Start publishing today! Try PanoPublish free for 7 days. No credit card required.{" "}
        <Link
          to="/signup"
          className="underline hover:text-white/80 transition-colors ml-1 inline-flex items-center gap-0.5"
        >
          Sign up now <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3.5 max-w-6xl">
          <Link to="/">
            <Logo logoClassName="text-primary h-8 w-8" className="text-xl" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="/#features" className="hover:text-primary transition-colors">
              Features
            </a>
            <a href="/#workflow" className="hover:text-primary transition-colors">
              How It Works
            </a>
            <Link to="/pricing/" className="hover:text-primary transition-colors">
              Pricing
            </Link>
            <a href="/#faq" className="hover:text-primary transition-colors">
              FAQ
            </a>
            <Link to="/blog/" className="hover:text-primary transition-colors">
              Blog
            </Link>
            <Link to="/contact/" className="hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" id="btn-nav-login">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="shadow-elegant" id="btn-nav-signup">
                Start Free Trial
              </Button>
            </Link>
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
        <Link to="/signup" className="flex-1">
          <Button size="sm" className="w-full py-3 text-sm font-semibold" id="btn-mobile-signup">
            Start Free Trial
          </Button>
        </Link>
      </div>
    </>
  );
}
