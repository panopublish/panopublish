import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Map, Users, Camera, CheckCircle2, Plus, ListChecks, X, Compass, ArrowRight, HelpCircle, AlertCircle, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TourVista" }] }),
  component: Dashboard,
});

type Stats = { clients: number; tours: number; published: number; processing: number; uploaded: number };

const planLimit: Record<string, number> = { trial: 5, basic: 5, pro: 25, agency: 9999 };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<{ plan: string; onboarding_dismissed: boolean } | null>(null);
  
  // Onboarding Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [loadingOauth, setLoadingOauth] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c, t, token, photosRes] = await Promise.all([
        supabase.from("profiles").select("plan,onboarding_dismissed").eq("id", user.id).maybeSingle(),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tours").select("id,status").eq("user_id", user.id),
        supabase.from("google_tokens").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("photos").select("tour_id,streetview_status").eq("user_id", user.id),
      ]);
      if (t.error) {
        console.error("Dashboard tours error:", t.error);
        toast.error("Dashboard error: " + t.error.message);
      }
      
      const userProfile = p.data ?? null;
      setProfile(userProfile);

      const hasGoogleToken = !!token.data;
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
        } else if (!hasGoogleToken && (userProfile && !userProfile.onboarding_dismissed)) {
          setStep(1);
          setShowWizard(true);
        }
      }

      const tours = t.data ?? [];
      const photos = photosRes.data ?? [];

      // Self-healing check: Sync tour status based on photos
      for (const tour of tours) {
        const tPhotos = photos.filter((p) => p.tour_id === tour.id);
        if (tPhotos.length > 0) {
          const allPublished = tPhotos.every(p => p.streetview_status === 'PUBLISHED');
          const anyProcessing = tPhotos.some(p => p.streetview_status === 'PROCESSING');
          const anyFailed = tPhotos.some(p => p.streetview_status === 'FAILED');
          
          let newStatus = tour.status;
          if (allPublished) {
            newStatus = 'published';
          } else if (anyProcessing) {
            newStatus = 'processing';
          } else if (anyFailed) {
            newStatus = 'rejected';
          }

          if (newStatus !== tour.status) {
            await supabase.from("tours").update({ status: newStatus }).eq("id", tour.id);
            tour.status = newStatus;
          }
        }
      }

      setStats({
        clients: c.count ?? 0,
        tours: tours.length,
        published: tours.filter((x) => x.status === "published").length,
        processing: tours.filter((x) => x.status === "processing").length,
        uploaded: 0,
      });
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
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
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

  const limit = planLimit[profile?.plan ?? "trial"] ?? 5;
  const tourCount = stats?.tours ?? 0;
  const usagePct = Math.min(100, (tourCount / limit) * 100);

  const onboarding = [
    { label: "Create your first client", done: (stats?.clients ?? 0) > 0, to: "/clients" },
    { label: "Create your first tour", done: (stats?.tours ?? 0) > 0, to: "/tours/new" },
    { label: "Upload your first photo", done: false, to: "/tours" },
    { label: "Publish to Google Maps", done: (stats?.published ?? 0) > 0, to: "/tours" },
  ];
  const doneCount = onboarding.filter((o) => o.done).length;

  return (
    <AppShell title={`Welcome${user?.email ? `, ${user.email.split("@")[0]}` : ""}`} breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link to="/tours/new"><Button><Plus className="h-4 w-4 mr-1" /> Create Tour</Button></Link>
        <Link to="/tours"><Button variant="outline"><Map className="h-4 w-4 mr-1" /> My Tours</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total clients" value={stats?.clients} />
        <Stat icon={Map} label="Total tours" value={stats?.tours} />
        <Stat icon={CheckCircle2} label="Published tours" value={stats?.published} accent="success" />
        <Stat icon={Camera} label="Processing" value={stats?.processing} accent="warning" />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Plan usage</h3>
            <span className="text-sm text-muted-foreground">{tourCount}/{limit === 9999 ? "∞" : limit} tours used</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${usagePct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Plan: <strong className="capitalize">{profile?.plan ?? "trial"}</strong></p>
        </div>

        {!profile?.onboarding_dismissed && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Get started</h3>
              <button onClick={dismissOnboarding} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{doneCount} of {onboarding.length} steps complete</p>
            <ul className="space-y-2">
              {onboarding.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className={`flex items-center gap-2 ${s.done ? "text-muted-foreground line-through" : ""}`}>
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${s.done ? "bg-success text-white" : "border"}`}>{s.done ? "✓" : ""}</span>
                    {s.label}
                  </span>
                  {!s.done && <Link to={s.to} className="text-xs text-primary font-medium">Do this now</Link>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modern Onboarding Welcome Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-[#0c101c]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden relative flex flex-col my-8">
            
            {/* Step 1: Welcome to TourVista (Image 2 Mock) */}
            {step === 1 && (
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-extrabold text-[#0277bd] tracking-tight mb-4">Welcome to TourVista</h2>
                <p className="text-base text-gray-600 font-medium leading-relaxed max-w-md mb-8">
                  <strong>Congratulations!</strong> You're now part of an elite community. With TourVista, you'll be able to publish tours to Street View faster and easier than ever before.
                </p>

                {/* Skyline & Robot Custom SVG Illustration */}
                <div className="w-full max-w-xs h-40 bg-gray-50/50 rounded-2xl flex items-center justify-center relative border border-gray-100 mb-8 overflow-hidden shadow-inner">
                  {/* Skyline Backdrop */}
                  <svg width="220" height="110" viewBox="0 0 240 120" className="absolute bottom-0 text-[#0277bd]/10 opacity-70">
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
                      <svg width="100" height="48" viewBox="0 0 100 48" className="text-[#0277bd] fill-[#0277bd]/10">
                        <path d="M5 40 C30 45, 70 45, 95 40 L95 10 C70 5, 30 5, 5 10 Z" stroke="currentColor" strokeWidth="2" />
                        <rect x="25" y="18" width="50" height="12" rx="3" fill="#8bc34a" className="opacity-80 animate-pulse" />
                      </svg>
                    </div>
                  </div>
                  {/* Desktop Base */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-4 bg-gray-800 rounded-b-md" />
                  
                  {/* Cute robot peeking on the right */}
                  <div className="absolute right-6 bottom-4 z-20 animate-bounce" style={{ animationDuration: '3s' }}>
                    <svg width="45" height="55" viewBox="0 0 50 60">
                      {/* Robot Body */}
                      <rect x="12" y="24" width="26" height="24" rx="4" fill="#0277bd" stroke="#081e36" strokeWidth="2" />
                      <rect x="17" y="29" width="16" height="14" rx="2" fill="#e1f5fe" />
                      {/* Robot Head */}
                      <rect x="15" y="6" width="20" height="16" rx="4" fill="#0277bd" stroke="#081e36" strokeWidth="2" />
                      <circle cx="21" cy="14" r="2.5" fill="#8bc34a" />
                      <circle cx="29" cy="14" r="2.5" fill="#8bc34a" />
                      {/* Antennas */}
                      <line x1="25" y1="6" x2="25" y2="2" stroke="#081e36" strokeWidth="2" />
                      <circle cx="25" cy="1" r="2" fill="#8bc34a" />
                      {/* Arms */}
                      <path d="M7 26 C7 26, 12 28, 12 30" stroke="#081e36" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="6" cy="26" r="1.5" fill="#8bc34a" />
                    </svg>
                  </div>
                </div>

                <Button 
                  onClick={() => setStep(2)}
                  className="w-full md:w-48 h-12 bg-[#0277bd] hover:bg-[#0266a1] text-white rounded-full font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Connect with us (Image 3 Mock) */}
            {step === 2 && (
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-extrabold text-[#0277bd] tracking-tight mb-4">Connect with us</h2>
                <p className="text-base text-gray-600 font-medium leading-relaxed max-w-md mb-8">
                  To get started, TourVista will need access to publish to Street View on your behalf.
                </p>

                {/* Infographic Connector custom SVG */}
                <div className="w-full max-w-md h-40 bg-gray-50/50 rounded-2xl flex items-center justify-center relative border border-gray-100 mb-8 p-4 overflow-hidden shadow-inner">
                  
                  {/* Left Label */}
                  <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm text-center z-10 w-24">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 block uppercase">App</span>
                    <span className="text-xs font-extrabold text-[#0277bd]">TourVista</span>
                  </div>

                  {/* Maze & Connecting plug Line in background */}
                  <svg className="absolute inset-0 w-full h-full text-gray-300 pointer-events-none" viewBox="0 0 400 160">
                    {/* Connected Line paths */}
                    <path d="M 96,80 L 150,80 L 150,40 L 250,40 L 250,80 L 304,80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5" className="animate-pulse" />
                    <path d="M 96,80 H 130 V 120 H 270 V 80 H 304" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3" />
                  </svg>

                  {/* Cute robot in the middle connecting plugs */}
                  <div className="z-10 flex flex-col items-center mx-4">
                    <svg width="60" height="70" viewBox="0 0 50 60" className="animate-pulse">
                      {/* Body */}
                      <rect x="14" y="20" width="22" height="24" rx="6" fill="#8bc34a" stroke="#081e36" strokeWidth="2" />
                      {/* Eyes */}
                      <circle cx="21" cy="12" r="3" fill="#0277bd" />
                      <circle cx="29" cy="12" r="3" fill="#0277bd" />
                      {/* Arms holding plug connectors */}
                      <path d="M 14,28 Q 2,28 2,12" fill="none" stroke="#081e36" strokeWidth="2" strokeLinecap="round" />
                      <path d="M 36,28 Q 48,28 48,12" fill="none" stroke="#081e36" strokeWidth="2" strokeLinecap="round" />
                      {/* Little plugs */}
                      <rect x="0" y="8" width="4" height="6" fill="#081e36" rx="1" />
                      <rect x="46" y="8" width="4" height="6" fill="#081e36" rx="1" />
                    </svg>
                  </div>

                  {/* Right Label */}
                  <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm text-center z-10 w-24 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Publish</span>
                    <div className="flex items-center gap-1">
                      {/* Google G icon */}
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fillRule="evenodd" />
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
                  className="w-full md:w-48 h-12 bg-[#0277bd] hover:bg-[#0266a1] text-white rounded-full font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Authorize
                </Button>
              </div>
            )}

            {/* Step 4: Loading Screen (Connecting to Google Redirect) */}
            {step === 4 && (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-t-transparent border-[#0277bd] rounded-full animate-spin mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Connecting to Google...</h3>
                <p className="text-sm text-gray-500 font-medium max-w-xs">
                  We are redirecting you to Google to securely complete authorization. Please wait a moment.
                </p>
              </div>
            )}

            {/* Step 5: Thank You (Image 5 Mock) */}
            {step === 5 && (
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-extrabold text-[#0277bd] tracking-tight mb-4 animate-bounce">Thank You!</h2>
                <p className="text-base text-gray-600 font-medium leading-relaxed max-w-sm mb-8">
                  That's it! You're now ready to publish to Street View using TourVista. Thank you for joining. We're excited to have you aboard!
                </p>

                {/* Cute Unicycle Robot Custom SVG */}
                <div className="w-full max-w-xs h-40 bg-gray-50/50 rounded-2xl flex items-center justify-center relative border border-gray-100 mb-8 overflow-hidden shadow-inner">
                  {/* Backdrop cloud icons */}
                  <svg className="absolute inset-0 w-full h-full text-[#8bc34a]/10" viewBox="0 0 100 100">
                    <circle cx="20" cy="30" r="10" fill="currentColor" />
                    <circle cx="80" cy="40" r="12" fill="currentColor" />
                    <circle cx="50" cy="20" r="8" fill="currentColor" />
                  </svg>

                  {/* Balancing unicycle robot SVG */}
                  <div className="animate-bounce" style={{ animationDuration: '4s' }}>
                    <svg width="60" height="90" viewBox="0 0 50 80">
                      {/* Head */}
                      <rect x="13" y="6" width="24" height="18" rx="5" fill="#0277bd" stroke="#081e36" strokeWidth="2" />
                      {/* Eyes */}
                      <circle cx="21" cy="13" r="2.5" fill="#8bc34a" />
                      <circle cx="29" cy="13" r="2.5" fill="#8bc34a" />
                      {/* Smile */}
                      <path d="M21 20 Q25 23, 29 20" fill="none" stroke="#e1f5fe" strokeWidth="1.5" strokeLinecap="round" />
                      
                      {/* Body */}
                      <rect x="16" y="24" width="18" height="22" rx="4" fill="#0277bd" stroke="#081e36" strokeWidth="2" />
                      <rect x="20" y="28" width="10" height="10" rx="1" fill="#e1f5fe" />
                      
                      {/* Unicycle Single Fork */}
                      <line x1="25" y1="46" x2="25" y2="60" stroke="#081e36" strokeWidth="2" />
                      {/* Single wheel */}
                      <circle cx="25" cy="68" r="10" fill="#8bc34a" stroke="#081e36" strokeWidth="2" />
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
                      step === s 
                        ? "w-6 bg-[#0277bd]" 
                        : "w-2.5 bg-gray-200"
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

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value?: number; accent?: "success" | "warning" }) {
  const accentCls = accent === "success" ? "bg-success/10 text-success" : accent === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accentCls}`}><Icon className="h-4 w-4" /></div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {value === undefined ? <Skeleton className="h-7 w-12 mt-1" /> : <div className="text-2xl font-semibold">{value}</div>}
    </div>
  );
}

