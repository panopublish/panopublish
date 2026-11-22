import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, X, MessageCircle, CheckCircle2 } from "lucide-react";

interface StickyTrialBannerProps {
  headline?: string;
  subheadline?: string;
  badgeText?: string;
}

const STORAGE_KEY = "panopublish_sticky_trial_dismissed_v1";
const WA_NUMBER = "919408808438";
const WA_MSG = encodeURIComponent(
  "Hi! I am interested in PanoPublish for Google Street View publishing and 360 virtual tours. Can you share a quick demo?"
);

export function StickyTrialBanner({
  headline = "Grow Your Google 360 Virtual Tour Business",
  subheadline = "Direct Google Street View API publishing • Auto GPS alignment • Flat ₹499/mo (no per-tour fees)",
  badgeText = "7-Day Free Trial",
}: StickyTrialBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed in this browser session
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
        return;
      }
    } catch {
      // In case sessionStorage is blocked
    }
    setIsDismissed(false);

    const handleScroll = () => {
      // Trigger when user has scrolled down > 220px
      if (window.scrollY > 220) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Free Trial Offer"
      className="fixed bottom-0 inset-x-0 z-50 p-2.5 sm:p-4 pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-5"
    >
      <div className="pointer-events-auto max-w-5xl mx-auto bg-background/95 dark:bg-zinc-950/95 border-2 border-primary/30 shadow-2xl backdrop-blur-md rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 relative">
        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss trial banner"
          className="absolute right-2 top-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: Value Proposition */}
        <div className="flex items-center gap-3 pr-6 sm:pr-0 w-full md:w-auto">
          <div className="hidden sm:flex h-11 w-11 shrink-0 rounded-full bg-primary/10 text-primary items-center justify-center ring-4 ring-primary/5">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                {badgeText}
              </span>
              <span className="text-xs text-muted-foreground hidden lg:inline">
                No credit card required
              </span>
            </div>

            <p className="font-bold text-sm sm:text-base text-foreground leading-snug">
              {headline}
            </p>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {subheadline}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Chat on WhatsApp</span>
          </a>

          <Link to="/signup/" className="w-full sm:w-auto">
            <Button
              size="sm"
              className="w-full sm:w-auto font-semibold gap-1.5 shadow-md hover:shadow-lg transition-all"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
