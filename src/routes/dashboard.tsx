import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { getEnv } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Map,
  Users,
  Camera,
  CheckCircle2,
  Plus,
  ListChecks,
  X,
  Compass,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Check,
  Shield,
  Lock,
  Play,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sparkles,
  Layers,
  ArrowUpRight,
  Globe,
  Clock,
  Radio,
  FileText,
  MessageCircle,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — PanoPublish" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Dashboard,
});

type Stats = {
  clients: number;
  tours: number;
  published: number;
  processing: number;
  uploaded: number;
};

type RecentTour = {
  id: string;
  name: string;
  status: string;
  type?: string;
  created_at?: string;
  cid?: string;
  google_place_id?: string;
  client?: { name: string } | null;
};

const planLimit: Record<string, number> = { trial: 1, basic: 5, pro: 20, agency: 50 };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<{
    plan: string;
    onboarding_dismissed: boolean;
    billing_cycle_tours_used: number;
    credits?: number;
    trial_ends_at?: string | null;
    created_at?: string;
  } | null>(null);

  // Recent Tours & Media State
  const [recentTours, setRecentTours] = useState<RecentTour[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [isTutorialExpanded, setIsTutorialExpanded] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Onboarding Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [loadingOauth, setLoadingOauth] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const [p, c, t, token, photosRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan,onboarding_dismissed,billing_cycle_tours_used,credits,trial_ends_at,created_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("tours")
          .select("id,name,status,type,created_at,cid,google_place_id,client:clients(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("google_tokens").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("photos").select("tour_id,streetview_status,thumbnail_url,file_url").eq("user_id", user.id),
      ]);
      if (p.error) {
        console.error("Dashboard profile error:", p.error);
        toast.error("Profile error: " + p.error.message);
      }
      if (c.error) {
        console.error("Dashboard clients error:", c.error);
        toast.error("Clients error: " + c.error.message);
      }
      if (t.error) {
        console.error("Dashboard tours error:", t.error);
        toast.error("Tours error: " + t.error.message);
      }
      if (token.error) {
        console.error("Dashboard google_tokens error:", token.error);
        toast.error("Google Tokens error: " + token.error.message);
      }
      if (photosRes.error) {
        console.error("Dashboard photos error:", photosRes.error);
        toast.error("Photos error: " + photosRes.error.message);
      }

      const userProfile = p.data ?? null;
      setProfile(userProfile);

      const hasGoogleToken = !!token.data;
      setIsGoogleConnected(hasGoogleToken);
      if (hasGoogleToken) {
        localStorage.setItem("google_connected", "true");
      } else {
        localStorage.removeItem("google_connected");
      }

      // Check onboarding query parameter
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("onboarding") === "success") {
          setStep(5);
          setShowWizard(true);
        } else if (!hasGoogleToken && userProfile && !userProfile.onboarding_dismissed) {
          setStep(1);
          setShowWizard(true);
        }
      }

      const tours = (t.data as RecentTour[]) ?? [];
      const photos = photosRes.data ?? [];

      // Self-healing check: Sync tour status based on photos
      for (const tour of tours) {
        if (tour.type === "custom") continue; // Skip custom tours
        const tPhotos = photos.filter((p: any) => p.tour_id === tour.id);
        if (tPhotos.length > 0) {
          const allSubmitted = tPhotos.every(
            (p: any) => p.streetview_status === "PUBLISHED" || p.streetview_status === "PROCESSING",
          );
          const anyFailed = tPhotos.some((p: any) => p.streetview_status === "FAILED");

          let newStatus = tour.status;
          if (allSubmitted) {
            newStatus = "published";
          } else if (anyFailed) {
            newStatus = "rejected";
          }

          if (newStatus !== tour.status) {
            await supabase.from("tours").update({ status: newStatus }).eq("id", tour.id);
            tour.status = newStatus;
          }
        }
      }

      const clientsCount = c.count ?? 0;
      const toursCount = tours.length;
      const publishedCount = tours.filter((x: any) => x.status === "published").length;
      const uploadedCount = photos.length;

      const allDone = clientsCount > 0 && toursCount > 0 && uploadedCount > 0 && publishedCount > 0;
      
      if (allDone && userProfile && !userProfile.onboarding_dismissed) {
        await supabase.from("profiles").update({ onboarding_dismissed: true }).eq("id", user.id);
        userProfile.onboarding_dismissed = true;
      }

      // Self-heal: Sync billing_cycle_tours_used with actual published tours
      if (userProfile && userProfile.billing_cycle_tours_used !== publishedCount) {
        await supabase
          .from("profiles")
          .update({ billing_cycle_tours_used: publishedCount })
          .eq("id", user.id);
        userProfile.billing_cycle_tours_used = publishedCount;
        setProfile({ ...userProfile });
      }

      // Build quick thumbnail map
      const photoMap: Record<string, string> = {};
      photos.forEach((photo: any) => {
        if (photo.tour_id && !photoMap[photo.tour_id]) {
          photoMap[photo.tour_id] = photo.thumbnail_url || photo.file_url || "";
        }
      });
      setThumbnails(photoMap);
      setRecentTours(tours.slice(0, 6));

      setStats({
        clients: clientsCount,
        tours: toursCount,
        published: publishedCount,
        processing: tours.filter((x: any) => x.status === "processing").length,
        uploaded: uploadedCount,
      });
      setLoadingData(false);
    })();
  }, [user]);

  const dismissOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_dismissed: true }).eq("id", user.id);
    localStorage.setItem("google_connected", "true");
    setProfile((p) => (p ? { ...p, onboarding_dismissed: true } : p));
    setShowWizard(false);

    // Clean up query param if present
    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const connectGoogle = async () => {
    setLoadingOauth(true);
    try {
      const clientId = getEnv("VITE_GOOGLE_CLIENT_ID");
      if (!clientId) {
        throw new Error("Missing Google Client ID in environment variables.");
      }
      const redirectUri = window.location.origin + "/auth/google/callback";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/streetviewpublish&access_type=offline&prompt=consent`;

      window.location.href = authUrl;
    } catch (e: any) {
      toast.error("Failed to start Google connection: " + e.message);
      setLoadingOauth(false);
      setStep(2);
    }
  };

  const isAdmin =
    user?.email === "vista360gtp@gmail.com" ||
    user?.email === "er.prashantyadav37@gmail.com";
  const isTrialUser = (profile?.plan ?? "trial") === "trial";
  const isTrialExpired =
    isTrialUser &&
    ((profile?.trial_ends_at && new Date(profile.trial_ends_at).getTime() < Date.now()) ||
      (profile?.created_at && Date.now() - new Date(profile.created_at).getTime() > 7 * 86400000));
  const isPaidPlanExpired =
    !isTrialUser &&
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() < Date.now();
  const isPlanExpired = isTrialExpired || isPaidPlanExpired;

  const limit = isAdmin ? 9999 : isPlanExpired ? 0 : (planLimit[profile?.plan ?? "trial"] ?? 1);
  const totalAllowance = isPlanExpired ? 0 : Math.max(profile?.credits ?? 0, limit);
  const tourCount = stats?.published ?? profile?.billing_cycle_tours_used ?? 0;
  const remainingCredits = isAdmin ? 9999 : Math.max(0, totalAllowance - tourCount);
  const hasCredits = isAdmin || remainingCredits > 0;
  const usagePct = limit > 0 ? Math.min(100, (tourCount / limit) * 100) : 100;

  const onboarding = [
    { label: "Create your first client", done: (stats?.clients ?? 0) > 0, to: "/clients" },
    { label: "Create your first tour", done: (stats?.tours ?? 0) > 0, to: "/tours/new" },
    { label: "Upload your first photo", done: (stats?.uploaded ?? 0) > 0, to: "/tours" },
    { label: "Publish to Google Maps", done: (stats?.published ?? 0) > 0, to: "/tours" },
  ];
  const doneCount = onboarding.filter((o) => o.done).length;

  const userName = user?.email ? user.email.split("@")[0] : "Creator";

  return (
    <AppShell
      title={`Welcome, ${userName}`}
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <SEO
        title="Dashboard"
        description="Manage your 360° virtual tours and publishing workflow."
        noIndex={true}
      />

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 md:p-6 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Welcome back, {userName}</span>
                <span className="text-xl">✨</span>
              </h1>
              <Badge variant="outline" className="capitalize font-semibold border-primary/30 text-primary bg-primary/5">
                {profile?.plan ?? "Trial"} Plan
              </Badge>
              {isGoogleConnected ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Google Connected</span>
                </div>
              ) : (
                <button
                  onClick={connectGoogle}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Connect Google Account</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Create, stitch, and publish 360° virtual tours to Google Street View and custom web portfolios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Watch Tutorial Button */}
            <Button
              variant="outline"
              onClick={() => setShowVideoModal(true)}
              className="bg-card hover:bg-primary/10 border-primary/30 text-primary font-semibold shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                <Play className="h-3 w-3 fill-primary text-primary translate-x-0.5" />
              </div>
              <span>Watch Tutorial</span>
            </Button>

            {hasCredits ? (
              <Link to="/tours/new/">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02]">
                  <Plus className="h-4 w-4" /> Create Tour
                </Button>
              </Link>
            ) : (
              <Link to="/settings/" search={{ tab: "billing" } as any}>
                <Button
                  variant="outline"
                  className="bg-slate-100 text-slate-400 border-slate-300 font-bold gap-1.5 cursor-pointer hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                  title="0 credits remaining. Upgrade your subscription to create more tours."
                >
                  <Lock className="h-3.5 w-3.5 mr-1" /> 0 Credits • Upgrade
                </Button>
              </Link>
            )}

            <Link to="/tours/">
              <Button variant="outline" className="font-medium">
                <Map className="h-4 w-4 mr-1.5 text-muted-foreground" /> My Tours
              </Button>
            </Link>

            {isAdmin && (
              <Link to="/admin/">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md flex items-center gap-2 px-4">
                  <Shield className="h-4 w-4 text-amber-400" /> Admin
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 mb-6">
        <Stat
          icon={Users}
          label="Total Clients"
          value={stats?.clients}
          sublabel="Active business accounts"
          accent="primary"
          linkTo="/clients"
        />
        <Stat
          icon={Compass}
          label="Total Tours"
          value={stats?.tours}
          sublabel="360° virtual spaces"
          accent="indigo"
          linkTo="/tours"
        />
        <Stat
          icon={CheckCircle2}
          label="Published Tours"
          value={stats?.published}
          sublabel="Live on Google Street View"
          accent="success"
          linkTo="/tours"
        />
        <Stat
          icon={Camera}
          label="Processing / Uploads"
          value={stats?.processing}
          sublabel={`${stats?.uploaded ?? 0} photos uploaded`}
          accent="warning"
          linkTo="/tours"
        />
      </div>

      {/* Tutorial Video Masterclass Spotlight Section */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/[0.02] p-5 md:p-6 mb-6 shadow-xs overflow-hidden relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Play className="h-4 w-4 fill-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-foreground">
                  PanoPublish Masterclass & Tutorial
                </h2>
                <Badge variant="secondary" className="text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/15 border-0">
                  Video Guide
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Learn how to upload 360° panoramas, connect navigation lines, and publish to Google Maps in under 4 minutes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVideoModal(true)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Full Theater
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTutorialExpanded(!isTutorialExpanded)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {isTutorialExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Expand Video</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {isTutorialExpanded && (
          <div className="grid lg:grid-cols-12 gap-5 items-center pt-2">
            {/* 16:9 Video Player Container */}
            <div className="lg:col-span-7">
              <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden relative shadow-lg border border-border/80 group">
                <iframe
                  className="w-full h-full border-0"
                  src="https://www.youtube-nocookie.com/embed/AxjAXSAf_u8?rel=0"
                  title="PanoPublish Tutorial — 360° Virtual Tour & Google Street View Publishing"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>

            {/* Quick Steps Guide */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Key Publishing Steps
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <strong className="text-foreground block font-semibold">Authorize Google Account</strong>
                    <span className="text-muted-foreground">Grant secure 1-click Street View Publish API access.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <strong className="text-foreground block font-semibold">Upload 360° Panoramas</strong>
                    <span className="text-muted-foreground">Stitched equirectangular photos with automatic GPS detection.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <strong className="text-foreground block font-semibold">Connect Blue Lines</strong>
                    <span className="text-muted-foreground">Position nodes & verify walking transitions between scenes.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="text-xs">
                    <strong className="text-foreground block font-semibold">1-Click Publish to Google Maps</strong>
                    <span className="text-muted-foreground">Instantly queue your tour. Google processes imagery in 24–48h.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <Link to="/tours/new/" className="font-semibold text-primary hover:underline flex items-center gap-1">
                  <span>Start Publishing Now</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-muted-foreground">•</span>
                <a
                  href="https://wa.me/919999999999?text=Hi%20PanoPublish,%20I%20need%20help%20with%20my%20virtual%20tour"
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Usage & Quick Launchpad */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Plan Usage Card */}
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm md:text-base">Subscription & Tour Quota</h3>
                  <p className="text-xs text-muted-foreground">Monthly tour publishing allowance</p>
                </div>
              </div>
              <Badge variant="outline" className="capitalize font-semibold border-border">
                {profile?.plan ?? "Trial"} Plan
              </Badge>
            </div>

            <div className="my-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-foreground">
                  {tourCount} of {limit === 9999 ? "∞" : limit} tours published
                </span>
                <span className="font-semibold text-muted-foreground">
                  {Math.round(usagePct)}% used
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden p-0.5 border border-border/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary-glow transition-all duration-500"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              {isAdmin ? (
                <span className="text-emerald-600 font-semibold">Unlimited Admin Access</span>
              ) : remainingCredits > 0 ? (
                <span>
                  <strong className="text-foreground">{remainingCredits}</strong> tour credit{remainingCredits > 1 ? "s" : ""} remaining in cycle
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">Quota exhausted — upgrade to publish more</span>
              )}
            </div>

            <Link to="/settings/" search={{ tab: "billing" } as any}>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold hover:border-primary">
                Manage Billing & Upgrades
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Launchpad */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm md:text-base">Quick Launchpad</h3>
                <p className="text-xs text-muted-foreground">Fast navigation & actions</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2">
              <Link
                to="/tours/new/"
                className="flex flex-col p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-xs font-bold text-foreground">Street View Tour</span>
                <span className="text-[11px] text-muted-foreground truncate">Publish to Maps</span>
              </Link>

              <Link
                to="/tours/new/"
                search={{ type: "custom" } as any}
                className="flex flex-col p-3 rounded-xl border border-border/70 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                </div>
                <span className="text-xs font-bold text-foreground">Custom 360 Tour</span>
                <span className="text-[11px] text-muted-foreground truncate">Hotspots & Audio</span>
              </Link>

              <Link
                to="/clients/"
                className="flex flex-col p-3 rounded-xl border border-border/70 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-xs font-bold text-foreground">Add Client</span>
                <span className="text-[11px] text-muted-foreground truncate">Portfolio organizer</span>
              </Link>

              <Link
                to="/settings/"
                className="flex flex-col p-3 rounded-xl border border-border/70 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </div>
                <span className="text-xs font-bold text-foreground">Google Status</span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {isGoogleConnected ? "Connected ✓" : "Setup Account"}
                </span>
              </Link>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link to="/faq/" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span>Need help? Read FAQs & Documentation</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Tours Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-foreground">Recent Tours</h2>
            <Badge variant="outline" className="text-xs font-medium border-border">
              {recentTours.length} Latest
            </Badge>
          </div>
          <Link to="/tours/" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>View All Tours</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : recentTours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTours.map((tour) => {
              const thumbUrl = thumbnails[tour.id];
              const isPublished = tour.status === "published";
              const isProcessing = tour.status === "processing";
              const isRejected = tour.status === "rejected";

              return (
                <div
                  key={tour.id}
                  className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col group"
                >
                  {/* Tour Thumbnail / Visual Header */}
                  <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={tour.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-400 p-4 text-center">
                        <Compass className="h-8 w-8 text-primary/60 mb-1 animate-pulse" />
                        <span className="text-[11px] font-medium text-slate-400">360° Virtual Tour</span>
                      </div>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute top-2.5 left-2.5">
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/90 text-white shadow-sm backdrop-blur-xs">
                          <CheckCircle2 className="h-3 w-3" /> Published
                        </span>
                      ) : isProcessing ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/90 text-white shadow-sm backdrop-blur-xs">
                          <Clock className="h-3 w-3 animate-spin" /> Processing
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/90 text-white shadow-sm backdrop-blur-xs">
                          <AlertCircle className="h-3 w-3" /> Attention
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 text-white shadow-sm backdrop-blur-xs">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Tour Type Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                        {tour.type === "custom" ? "Custom 360" : "Street View"}
                      </span>
                    </div>
                  </div>

                  {/* Tour Meta */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors" title={tour.name}>
                        {tour.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {tour.client?.name ? `Client: ${tour.client.name}` : "No client assigned"}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {tour.created_at ? new Date(tour.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isPublished && tour.cid && (
                          <a
                            href={`https://www.google.com/maps?cid=${tour.cid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                            title="View live on Google Maps"
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Link to="/tours/$tourId/" params={{ tourId: tour.id }}>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-semibold px-2.5">
                            Edit Tour
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 md:p-12 text-center flex flex-col items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Compass className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No virtual tours created yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
              Upload your 360° panoramas, link walking transitions, and publish directly to Google Maps with high-speed indexing.
            </p>
            <Link to="/tours/new/">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Create Your First Tour
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Getting Started Checklist (if not dismissed) */}
      {!profile?.onboarding_dismissed && doneCount < onboarding.length && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 mb-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
              <ListChecks className="h-4 w-4 text-primary" /> Getting Started Checklist
            </h3>
            <button
              onClick={dismissOnboarding}
              className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 cursor-pointer"
              aria-label="Dismiss checklist"
            >
              <span>Dismiss</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {doneCount} of {onboarding.length} steps completed
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {onboarding.map((s) => (
              <div
                key={s.label}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  s.done ? "bg-muted/30 border-border/40 text-muted-foreground" : "bg-card border-border/80 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      s.done ? "bg-emerald-500 text-white" : "border border-border"
                    }`}
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "line-through" : "font-medium"}>{s.label}</span>
                </div>
                {!s.done && (
                  <Link to={s.to} className="text-[11px] text-primary font-bold hover:underline shrink-0">
                    Start
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Masterclass Theater Dialog Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl p-4 md:p-6 bg-card border-border shadow-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Play className="h-3.5 w-3.5 fill-primary" />
              </div>
              <span>PanoPublish Masterclass: 360° Virtual Tours to Google Street View</span>
            </DialogTitle>
          </DialogHeader>

          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black border border-border/40">
            {showVideoModal && (
              <iframe
                className="w-full h-full border-0"
                src="https://www.youtube-nocookie.com/embed/AxjAXSAf_u8?autoplay=1&rel=0"
                title="PanoPublish Tutorial — 360° Virtual Tour & Google Street View Publishing"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Official 4-minute tutorial walkthrough</span>
              <span>•</span>
              <span>Google Street View Publish API & Custom Web Tours</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowVideoModal(false)} className="cursor-pointer">
              Close Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modern Onboarding Welcome Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-[#0c101c]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden relative flex flex-col my-8">
            {/* Step 1: Welcome to PanoPublish */}
            {step === 1 && (
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-extrabold text-primary tracking-tight mb-4 font-serif">
                  Welcome to PanoPublish
                </h2>
                <p className="text-base text-gray-600 font-medium leading-relaxed max-w-md mb-8">
                  <strong>Congratulations!</strong> You're now part of an elite community. With
                  PanoPublish, you'll be able to publish tours to Street View faster and easier than
                  ever before.
                </p>

                {/* Skyline & Robot Custom SVG Illustration */}
                <div className="w-full max-w-xs h-40 bg-gray-50/50 rounded-2xl flex items-center justify-center relative border border-gray-100 mb-8 overflow-hidden shadow-inner">
                  {/* Skyline Backdrop */}
                  <svg
                    width="220"
                    height="110"
                    viewBox="0 0 240 120"
                    className="absolute bottom-0 text-primary/10 opacity-70"
                  >
                    <rect x="10" y="70" width="30" height="50" fill="currentColor" rx="2" />
                    <rect x="45" y="40" width="40" height="80" fill="currentColor" rx="2" />
                    <rect x="90" y="60" width="35" height="60" fill="currentColor" rx="2" />
                    <rect x="130" y="30" width="45" height="90" fill="currentColor" rx="2" />
                    <rect x="180" y="50" width="30" height="70" fill="currentColor" rx="2" />
                    {/* Glowing Moon */}
                    <circle cx="210" cy="25" r="12" fill="#8bc34a" className="opacity-30" />
                  </svg>

                  {/* Desktop Screen mockup */}
                  <div className="relative z-10 w-44 h-28 bg-white border-4 border-gray-800 rounded-xl shadow-lg flex flex-col overflow-hidden">
                    <div className="bg-gray-800 h-2 w-full flex items-center px-1 gap-0.5">
                      <div className="w-1 h-1 bg-red-400 rounded-full" />
                      <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                      <div className="w-1 h-1 bg-green-400 rounded-full" />
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-2 bg-[#f2f4f8]">
                      {/* Curved Screen Image */}
                      <svg
                        width="100"
                        height="48"
                        viewBox="0 0 100 48"
                        className="text-primary fill-primary/10"
                      >
                        <path
                          d="M5 40 C30 45, 70 45, 95 40 L95 10 C70 5, 30 5, 5 10 Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <rect
                          x="25"
                          y="18"
                          width="50"
                          height="12"
                          rx="3"
                          fill="#8bc34a"
                          className="opacity-80 animate-pulse"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* Desktop Base */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-4 bg-gray-800 rounded-b-md" />

                  {/* Cute robot peeking on the right */}
                  <div
                    className="absolute right-6 bottom-4 z-20 animate-bounce"
                    style={{ animationDuration: "3s" }}
                  >
                    <svg width="45" height="55" viewBox="0 0 50 60">
                      {/* Robot Body */}
                      <rect
                        x="12"
                        y="24"
                        width="26"
                        height="24"
                        rx="4"
                        fill="#1D4ED8"
                        stroke="#081e36"
                        strokeWidth="2"
                      />
                      <rect x="17" y="29" width="16" height="14" rx="2" fill="#e1f5fe" />
                      {/* Robot Head */}
                      <rect
                        x="15"
                        y="6"
                        width="20"
                        height="16"
                        rx="4"
                        fill="#1D4ED8"
                        stroke="#081e36"
                        strokeWidth="2"
                      />
                      <circle cx="21" cy="14" r="2.5" fill="#8bc34a" />
                      <circle cx="29" cy="14" r="2.5" fill="#8bc34a" />
                      {/* Antennas */}
                      <line x1="25" y1="6" x2="25" y2="2" stroke="#081e36" strokeWidth="2" />
                      <circle cx="25" cy="1" r="2" fill="#8bc34a" />
                      {/* Arms */}
                      <path
                        d="M7 26 C7 26, 12 28, 12 30"
                        stroke="#081e36"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="6" cy="26" r="1.5" fill="#8bc34a" />
                    </svg>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full md:w-48 h-12 bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Connect with us */}
            {step === 2 && (
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-extrabold text-primary tracking-tight mb-4 font-serif">
                  Connect with us
                </h2>
                <p className="text-base text-gray-600 font-medium leading-relaxed max-w-md mb-8">
                  To get started, PanoPublish will need access to publish to Street View on your
                  behalf.
                </p>

                {/* Infographic Connector custom SVG */}
                <div className="w-full max-w-md h-40 bg-gray-50/50 rounded-2xl flex items-center justify-center relative border border-gray-100 mb-8 p-4 overflow-hidden shadow-inner">
                  {/* Left Label */}
                  <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm text-center z-10 w-24">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 block uppercase">
                      App
                    </span>
                    <span className="text-xs font-extrabold text-primary">PanoPublish</span>
                  </div>

                  {/* Maze & Connecting plug Line in background */}
                  <svg
                    className="absolute inset-0 w-full h-full text-gray-300 pointer-events-none"
                    viewBox="0 0 400 160"
                  >
                    {/* Connected Line paths */}
                    <path
                      d="M 96,80 L 150,80 L 150,40 L 250,40 L 250,80 L 304,80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray="5"
                      className="animate-pulse"
                    />
                    <path
                      d="M 96,80 H 130 V 120 H 270 V 80 H 304"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="3"
                    />
                  </svg>

                  {/* Cute robot in the middle connecting plugs */}
                  <div className="z-10 flex flex-col items-center mx-4">
                    <svg width="60" height="70" viewBox="0 0 50 60" className="animate-pulse">
                      {/* Body */}
                      <rect
                        x="14"
                        y="20"
                        width="22"
                        height="24"
                        rx="6"
                        fill="#8bc34a"
                        stroke="#081e36"
                        strokeWidth="2"
                      />
                      {/* Eyes */}
                      <circle cx="21" cy="12" r="3" fill="#1D4ED8" />
                      <circle cx="29" cy="12" r="3" fill="#1D4ED8" />
                      {/* Arms holding plug connectors */}
                      <path
                        d="M 14,28 Q 2,28 2,12"
                        fill="none"
                        stroke="#081e36"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 36,28 Q 48,28 48,12"
                        fill="none"
                        stroke="#081e36"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* Little plugs */}
                      <rect x="0" y="8" width="4" height="6" fill="#081e36" rx="1" />
                      <rect x="46" y="8" width="4" height="6" fill="#081e36" rx="1" />
                    </svg>
                  </div>

                  {/* Right Label */}
                  <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm text-center z-10 w-24 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      Publish
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Google G icon */}
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          fillRule="evenodd"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          fillRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-extrabold text-gray-700">Google</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setStep(4);
                    connectGoogle();
                  }}
                  className="w-full md:w-48 h-12 bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Authorize
                </Button>
              </div>
            )}

            {/* Step 4: Loading Screen (Connecting to Google Redirect) */}
            {step === 4 && (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Connecting to Google...</h3>
                <p className="text-sm text-gray-500 font-medium max-w-xs">
                  We are redirecting you to Google to securely complete authorization. Please wait a
                  moment.
                </p>
              </div>
            )}

            {/* Step 5: Thank You */}
            {step === 5 && (
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-extrabold text-primary tracking-tight mb-4 animate-bounce font-serif">
                  Thank You!
                </h2>
                <p className="text-base text-gray-600 font-medium leading-relaxed max-w-sm mb-8">
                  That's it! You're now ready to publish to Street View using PanoPublish. Thank you
                  for joining. We're excited to have you aboard!
                </p>

                {/* Cute Unicycle Robot Custom SVG */}
                <div className="w-full max-w-xs h-40 bg-gray-50/50 rounded-2xl flex items-center justify-center relative border border-gray-100 mb-8 overflow-hidden shadow-inner">
                  {/* Backdrop cloud icons */}
                  <svg
                    className="absolute inset-0 w-full h-full text-[#8bc34a]/10"
                    viewBox="0 0 100 100"
                  >
                    <circle cx="20" cy="30" r="10" fill="currentColor" />
                    <circle cx="80" cy="40" r="12" fill="currentColor" />
                    <circle cx="50" cy="20" r="8" fill="currentColor" />
                  </svg>

                  {/* Balancing unicycle robot SVG */}
                  <div className="animate-bounce" style={{ animationDuration: "4s" }}>
                    <svg width="60" height="90" viewBox="0 0 50 80">
                      {/* Head */}
                      <rect
                        x="13"
                        y="6"
                        width="24"
                        height="18"
                        rx="5"
                        fill="#1D4ED8"
                        stroke="#081e36"
                        strokeWidth="2"
                      />
                      {/* Eyes */}
                      <circle cx="21" cy="13" r="2.5" fill="#8bc34a" />
                      <circle cx="29" cy="13" r="2.5" fill="#8bc34a" />
                      {/* Smile */}
                      <path
                        d="M21 20 Q25 23, 29 20"
                        fill="none"
                        stroke="#e1f5fe"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />

                      {/* Body */}
                      <rect
                        x="16"
                        y="24"
                        width="18"
                        height="22"
                        rx="4"
                        fill="#1D4ED8"
                        stroke="#081e36"
                        strokeWidth="2"
                      />
                      <rect x="20" y="28" width="10" height="10" rx="1" fill="#e1f5fe" />

                      {/* Unicycle Single Fork */}
                      <line x1="25" y1="46" x2="25" y2="60" stroke="#081e36" strokeWidth="2" />
                      {/* Single wheel */}
                      <circle
                        cx="25"
                        cy="68"
                        r="10"
                        fill="#8bc34a"
                        stroke="#081e36"
                        strokeWidth="2"
                      />
                      <circle cx="25" cy="68" r="3" fill="#081e36" />
                    </svg>
                  </div>
                </div>

                <Button
                  onClick={dismissOnboarding}
                  className="w-full md:w-48 h-12 bg-[#8bc34a] hover:bg-[#7cb342] text-white rounded-full font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Multi-step pagination dots (except Step 4 Loading) */}
            {step !== 4 && (
              <div className="py-4 border-t border-gray-50 flex items-center justify-center gap-2 bg-gray-50/50">
                {[1, 2, 5].map((s, idx) => (
                  <div
                    key={s}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      step === s ? "w-6 bg-primary" : "w-2.5 bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
  linkTo,
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  sublabel?: string;
  accent?: "primary" | "success" | "warning" | "indigo";
  linkTo?: string;
}) {
  const accentCls =
    accent === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
      : accent === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
        : accent === "indigo"
          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
          : "bg-primary/10 text-primary border border-primary/20";

  const content = (
    <div className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between h-full group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 ${accentCls}`}>
            <Icon className="h-5 w-5" />
          </div>
          {linkTo && (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          )}
        </div>
        <div className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{label}</div>
        {value === undefined ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <div className="text-2xl md:text-3xl font-extrabold text-foreground mt-0.5 tracking-tight">{value}</div>
        )}
      </div>
      {sublabel && (
        <div className="text-[11px] text-muted-foreground mt-3 pt-2.5 border-t border-border/40 truncate">
          {sublabel}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block h-full">{content}</Link>;
  }

  return content;
}

