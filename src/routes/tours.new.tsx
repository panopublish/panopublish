import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronRight,
  UploadCloud,
  Wand2,
  Star,
  UserPlus,
  MapPin,
  Rocket,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { getEnv } from "@/lib/env";
import { resolveLocationFromInput, parseMapsInput, ResolvedPlace } from "@/lib/google-places";

import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/tours/new")({
  head: () => ({
    meta: [
      { title: "Create Tour — PanoPublish" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CreateTour,
});

function CreateTour() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step can be 1, 1.1, 2, 3
  const [step, setStep] = useState<number>(1);
  const [type, setType] = useState<"gmaps" | "custom" | null>(null);
  const [method, setMethod] = useState<"new" | "import" | null>(null);

  const [clients, setClients] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [clientId, setClientId] = useState<string | "new" | "">("");
  const [search, setSearch] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [tourInput, setTourInput] = useState("");
  const [cid, setCid] = useState("");
  const [resolving, setResolving] = useState(false);

  const handleResolveInput = (rawInput: string) => {
    if (!rawInput.trim()) return;
    setResolving(true);
    resolveLocationFromInput(
      rawInput,
      (resolved: ResolvedPlace) => {
        setResolving(false);
        if (resolved.name) setTourInput(resolved.name);
        if (resolved.cid) setCid(resolved.cid);
        setPlaceDetails({
          address: resolved.address,
          url: resolved.url,
          place_id: resolved.place_id,
          name: resolved.name,
          lat: resolved.lat,
          lng: resolved.lng,
        });
        toast.success(`Found: ${resolved.name || "Location"}`);
      },
      (errMsg: string) => {
        setResolving(false);
        console.warn(errMsg);
      }
    );
  };
  const [placeDetails, setPlaceDetails] = useState<{
    address?: string;
    url?: string;
    place_id?: string;
    name?: string;
    lat?: number;
    lng?: number;
  }>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Predictions state for fallback & instant inline dropdown
  const [predictions, setPredictions] = useState<
    Array<{ place_id: string; description: string; main_text: string; secondary_text: string }>
  >([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const autocompleteInstance = useRef<any>(null);
  const debounceTimer = useRef<any>(null);

  // Subscription plan check states
  const [profile, setProfile] = useState<any>(null);
  const [tourCount, setTourCount] = useState<number | null>(null);
  const [checkingLimits, setCheckingLimits] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clients")
      .select("id,name,city")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }: any) => setClients(data ?? []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function checkLimits() {
      try {
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("plan, billing_cycle_tours_used, credits, trial_ends_at, created_at")
          .eq("id", userId)
          .single();

        if (profErr) throw profErr;

        const [{ count: totalCount, error: countErr }, { count: pubCount }] = await Promise.all([
          supabase
            .from("tours")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("tours")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "published"),
        ]);

        if (countErr) throw countErr;

        const published = pubCount ?? 0;
        if (prof && prof.billing_cycle_tours_used !== published) {
          supabase
            .from("profiles")
            .update({ billing_cycle_tours_used: published })
            .eq("id", userId);
          prof.billing_cycle_tours_used = published;
        }

        setProfile(prof);
        setTourCount(published);
      } catch (err) {
        console.error("Error checking limits:", err);
      } finally {
        setCheckingLimits(false);
      }
    }
    checkLimits();
  }, [user]);

  const initAutocomplete = () => {
    if (!inputRef.current || !(window as any).google?.maps?.places?.Autocomplete) return;
    if (autocompleteInstance.current) return; // already initialized
    try {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
        fields: ["place_id", "geometry", "name", "formatted_address", "url"],
      });
      autocompleteInstance.current = autocomplete;
      autocomplete.addListener("place_changed", () => {
        setShowPredictions(false);
        const place = autocomplete.getPlace();
        if (!place.place_id && !place.geometry) {
          const rawVal = inputRef.current?.value || "";
          if (rawVal.trim()) {
            handleResolveInput(rawVal.trim());
          }
          return;
        }

        const name = place.name || inputRef.current?.value || "";
        setTourInput(name);

        const parsed = parseMapsInput(place.url || "");
        if (parsed.cid) {
          setCid(parsed.cid);
        }

        setPlaceDetails({
          address: place.formatted_address || name,
          url: place.url,
          place_id: place.place_id,
          name,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
        });
        toast.success(`Found: ${name}`);
      });
    } catch (e) {
      console.error("Error initializing Google Places Autocomplete:", e);
    }
  };

  const fetchPlacePredictions = (query: string) => {
    if (!query || query.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }
    if ((window as any).google?.maps?.places?.AutocompleteService) {
      try {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: query }, (results: any[], status: any) => {
          if (status === (window as any).google?.maps?.places?.PlacesServiceStatus?.OK && results?.length) {
            setPredictions(
              results.slice(0, 5).map((r) => ({
                place_id: r.place_id,
                description: r.description,
                main_text: r.structured_formatting?.main_text || r.description,
                secondary_text: r.structured_formatting?.secondary_text || "",
              }))
            );
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
          }
        });
      } catch (err) {
        console.warn("AutocompleteService error:", err);
      }
    }
  };

  const handleSelectPrediction = (item: { place_id: string; description: string; main_text: string }) => {
    setShowPredictions(false);
    setTourInput(item.main_text || item.description);
    setResolving(true);

    if ((window as any).google?.maps?.places?.PlacesService) {
      try {
        const dummy = document.createElement("div");
        const service = new (window as any).google.maps.places.PlacesService(dummy);
        service.getDetails(
          {
            placeId: item.place_id,
            fields: ["name", "formatted_address", "geometry", "url", "place_id"],
          },
          (place: any, status: any) => {
            setResolving(false);
            if (status === (window as any).google?.maps?.places?.PlacesServiceStatus?.OK && place) {
              const name = place.name || item.main_text;
              setTourInput(name);
              const parsed = parseMapsInput(place.url || "");
              if (parsed.cid) setCid(parsed.cid);
              setPlaceDetails({
                address: place.formatted_address || name,
                url: place.url,
                place_id: place.place_id,
                name,
                lat: place.geometry?.location?.lat(),
                lng: place.geometry?.location?.lng(),
              });
              toast.success(`Found: ${name}`);
              return;
            }
            handleResolveInput(item.place_id);
          }
        );
        return;
      } catch (e) {
        console.warn("PlacesService details error:", e);
      }
    }
    handleResolveInput(item.place_id);
  };

  useEffect(() => {
    if (step === 3) {
      (window as any).gm_authFailure = () => {
        toast.error(
          "Google Maps API Authentication Failed. Please verify Places API is enabled and HTTP Referrers permit panopublish.com in Google Cloud Console."
        );
      };

      const key = getEnv("VITE_GOOGLE_MAPS_API_KEY");
      if (!key) {
        toast.error("Google Maps API key is missing");
        return;
      }

      if ((window as any).google?.maps?.places?.Autocomplete) {
        initAutocomplete();
      } else {
        const existingScript = document.querySelector<HTMLScriptElement>("script[data-gmaps]");
        if (existingScript) {
          const timer = setInterval(() => {
            if ((window as any).google?.maps?.places?.Autocomplete) {
              clearInterval(timer);
              initAutocomplete();
            }
          }, 50);
          existingScript.addEventListener("load", () => {
            clearInterval(timer);
            initAutocomplete();
          });
          setTimeout(() => clearInterval(timer), 3000);
        } else {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.dataset.gmaps = "1";
          script.onload = () => {
            initAutocomplete();
          };
          document.head.appendChild(script);
        }
      }
    } else {
      autocompleteInstance.current = null;
      setShowPredictions(false);
    }
  }, [step]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleActionSelected = (actionType: "gmaps" | "custom") => {
    if (actionType === "custom" && !canCreateCustomTour) {
      toast.error(
        "Custom Tours are only available on Pro and Agency plans. Please upgrade your subscription."
      );
      return;
    }
    setType(actionType);
    if (actionType === "gmaps") {
      setStep(1.1);
    } else {
      setMethod("new"); // Assuming custom tour implies new
      setStep(2);
    }
  };

  const handleMethodSelected = (methodType: "new" | "import") => {
    setMethod(methodType);
    if (methodType === "new") {
      setStep(2);
    } else {
      // Import old tour flow? For now, let's just go to 2
      setStep(2);
    }
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    let finalClientId: string | null = null;

    if (clientId === "new") {
      if (!newClientName.trim()) {
        toast.error("New client name is required");
        setSaving(false);
        return;
      }
      const { data, error } = await supabase
        .from("clients")
        .insert({ user_id: user.id, name: newClientName, business_type: "Other", city: "" })
        .select("id")
        .single();
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
      finalClientId = data.id;
    } else if (clientId) {
      finalClientId = clientId;
    } else {
      toast.error("Please select or create a client");
      setSaving(false);
      return;
    }

    if (type !== "custom" && !tourInput.trim() && !cid.trim()) {
      toast.error("Please enter a business name or CID");
      setSaving(false);
      return;
    }

    const planLimits: Record<string, number> = {
      trial: 1,
      basic: 5,
      pro: 20,
      agency: 50,
    };
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

    const totalLimit = isAdmin ? 9999 : isPlanExpired ? 0 : (planLimits[profile?.plan ?? "trial"] ?? 1);
    const totalAllowance = isPlanExpired ? 0 : Math.max(profile?.credits ?? 0, totalLimit);
    const usedPublished = profile?.billing_cycle_tours_used ?? tourCount ?? 0;
    const remainingCredits = isAdmin ? 9999 : Math.max(0, totalAllowance - usedPublished);

    if (!isAdmin && remainingCredits <= 0) {
      toast.error(
        isPlanExpired
          ? isTrialUser
            ? "Your 7-day free trial has expired. Please upgrade to a paid plan in Settings to create and publish tours."
            : "Your 30-day subscription billing cycle has expired. Please renew your plan in Settings to create and publish tours."
          : `You have 0 credits remaining on your ${profile?.plan || "trial"} plan. Please upgrade your subscription to a paid plan in Settings to create and publish more tours.`
      );
      setSaving(false);
      return;
    }

    if (type === "custom") {
      if (!canCreateCustomTour) {
        toast.error("Custom Tours are only available on Pro and Agency plans. Please upgrade in Settings.");
        setSaving(false);
        return;
      }
      if (!tourInput.trim()) {
        toast.error("Please enter a tour name");
        setSaving(false);
        return;
      }
    }

    const finalCid = cid.trim() || null;
    const name = placeDetails.name || tourInput || (finalCid ? "Tour " + finalCid : "Unnamed Tour");

    const { data, error } = await supabase
      .from("tours")
      .insert({
        user_id: user.id,
        client_id: finalClientId,
        name,
        type: type || "gmaps",
        status: "draft",
        cid: finalCid,
        address: placeDetails.address,
        google_place_url: placeDetails.url,
        google_place_id: placeDetails.place_id,
        latitude: placeDetails.lat,
        longitude: placeDetails.lng,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tour created!");
    navigate({ to: "/tours/$tourId/", params: { tourId: data.id } });
  };

  const renderStepNav = () => {
    const mainStep = Math.floor(step);
    return (
      <div className="flex items-center justify-center gap-4 mb-12">
        <div
          className={`flex items-center gap-2 ${mainStep === 1 ? "text-[#0277bd]" : "text-muted-foreground"}`}
        >
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${mainStep === 1 ? "bg-[#0277bd]" : "bg-muted-foreground/50"}`}
          >
            1
          </div>
          <span className="text-sm font-medium">Choose what you want to do</span>
        </div>
        <div
          className={`flex items-center gap-2 ${mainStep === 2 ? "text-[#0277bd]" : "text-muted-foreground"}`}
        >
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${mainStep === 2 ? "bg-[#0277bd]" : "bg-muted-foreground/50"}`}
          >
            2
          </div>
          <span className="text-sm font-medium">Select your client</span>
        </div>
        <div
          className={`flex items-center gap-2 ${mainStep === 3 ? "text-[#0277bd]" : "text-muted-foreground"}`}
        >
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${mainStep === 3 ? "bg-[#0277bd]" : "bg-muted-foreground/50"}`}
          >
            3
          </div>
          <span className="text-sm font-medium">Get ready for take off</span>
        </div>
      </div>
    );
  };

  const isAdmin =
    user?.email === "vista360gtp@gmail.com" ||
    user?.email === "er.prashantyadav37@gmail.com";

  const canCreateCustomTour =
    isAdmin || profile?.plan === "pro" || profile?.plan === "agency";

  const planLimits: Record<string, number> = {
    trial: 1,
    basic: 5,
    pro: 20,
    agency: 50,
  };
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

  const limit = isAdmin ? 9999 : isPlanExpired ? 0 : (planLimits[profile?.plan ?? "trial"] ?? 1);
  const totalAllowance = isPlanExpired ? 0 : Math.max(profile?.credits ?? 0, limit);
  const usedPublished = profile?.billing_cycle_tours_used ?? tourCount ?? 0;
  const remainingCredits = isAdmin ? 9999 : Math.max(0, totalAllowance - usedPublished);
  const isLimitReached = !isAdmin && remainingCredits <= 0;

  if (checkingLimits) {
    return (
      <AppShell
        title="Create Tour"
        breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: "Create" }]}
      >
        <div className="bg-[#f2f4f8] min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-t-transparent border-[#0277bd] rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (isLimitReached) {
    return (
      <AppShell
        title="Create Tour"
        breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: "Create" }]}
      >
        <div className="bg-[#f2f4f8] min-h-[calc(100vh-64px)] p-8 flex items-center justify-center animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <Rocket className="h-8 w-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">0 Credits Remaining</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                You have reached your limit of{" "}
                <strong className="text-slate-800 font-extrabold">
                  {limit} tour{limit > 1 ? "s" : ""}
                </strong>{" "}
                on the{" "}
                <span className="capitalize font-bold text-slate-700">
                  {profile?.plan ?? "trial"}
                </span>{" "}
                plan. Upgrade your subscription to a paid plan to get more credits and unlock advanced features.
              </p>
              <p className="text-xs text-slate-400">
                Deleted tours still count toward your billing cycle quota.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/settings/"
                search={{ tab: "billing" } as any}
                className="w-full bg-[#0277bd] hover:bg-[#0266a1] text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-wider block"
              >
                Upgrade to Paid Plan
              </Link>
              <Link
                to="/tours/"
                className="w-full bg-slate-50 hover:bg-slate-100 border text-slate-600 py-3 rounded-xl font-bold transition-all text-sm block"
              >
                Go back to Tours
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Create Tour"
      breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: "Create" }]}
    >
      <SEO title="Create Tour" description="Create a new virtual tour." noIndex={true} />
      <div className="bg-[#f2f4f8] min-h-[calc(100vh-64px)] p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-12">
          {renderStepNav()}

          {step === 1 && (
            <div className="max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <h1 className="text-3xl font-medium text-[#0277bd] mb-8">
                What would you like to do?
              </h1>
              <div className="space-y-4">
                <button
                  onClick={() => handleActionSelected("gmaps")}
                  className="w-full flex items-center justify-between bg-[#8bc34a] hover:bg-[#7cb342] text-white px-6 py-4 rounded-full text-lg transition-colors font-medium cursor-pointer shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-4">
                    <MapPin className="h-6 w-6" /> Publish a tour to Google Maps
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-70" />
                </button>

                {canCreateCustomTour ? (
                  <button
                    onClick={() => handleActionSelected("custom")}
                    className="w-full flex items-center justify-between bg-[#0277bd] hover:bg-[#0266a1] text-white px-6 py-4 rounded-full text-lg transition-colors font-medium cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="flex items-center gap-4">
                      <Wand2 className="h-6 w-6" /> Create a custom tour
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-70" />
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      type="button"
                      disabled
                      onClick={() =>
                        toast.error(
                          "Custom Tours require a Pro or Agency subscription. Please upgrade in Settings."
                        )
                      }
                      className="w-full flex items-center justify-between bg-slate-100 border border-slate-200 text-slate-400 px-6 py-4 rounded-full text-lg font-medium cursor-not-allowed transition-all opacity-80"
                    >
                      <div className="flex items-center gap-4">
                        <Wand2 className="h-6 w-6 text-slate-400" />
                        <span className="line-through decoration-slate-300">Create a custom tour</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                          Pro & Agency Only
                        </span>
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1.1 && (
            <div className="max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <h1 className="text-3xl font-medium text-[#0277bd] mb-8">
                Cool, how should we create your Google tour?
              </h1>
              <div className="space-y-4">
                <button
                  onClick={() => handleMethodSelected("new")}
                  className="w-full flex items-center gap-4 bg-[#8bc34a] hover:bg-[#7cb342] text-white px-6 py-4 rounded-full text-lg transition-colors font-medium"
                >
                  <Wand2 className="h-6 w-6" /> Create a new tour
                </button>
                <button
                  onClick={() => handleMethodSelected("import")}
                  className="w-full flex items-center gap-4 bg-[#0277bd] hover:bg-[#0266a1] text-white px-6 py-4 rounded-full text-lg transition-colors font-medium"
                >
                  <UploadCloud className="h-6 w-6" /> Import an old tour
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="text-sm text-gray-600 mb-8 font-medium">
                <span className="font-bold">Why do I need to do this?</span> TourBuilder organizes
                your tours by client name. This helps you organize your Google Street View tours,
                custom tours, and users in one neatly tucked away place.
              </div>

              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-start mb-12">
                {/* Left Side */}
                <div>
                  <h3 className="text-xl font-medium text-[#0277bd] mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5" /> Select an existing client
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      className="pl-10 h-12 text-lg focus-visible:ring-[#0277bd]"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setClientId("");
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                  </div>
                  {showDropdown && search && (
                    <div className="mt-2 max-h-48 overflow-auto border rounded-md shadow-sm bg-white z-10 absolute w-full max-w-[calc(50%-2rem)]">
                      {filtered.length === 0 ? (
                        <div className="p-3 text-gray-500">No matches</div>
                      ) : (
                        filtered.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setClientId(c.id);
                              setSearch(c.name);
                              setShowDropdown(false);
                            }}
                            className={`p-3 cursor-pointer hover:bg-gray-50 ${clientId === c.id ? "bg-[#e1f5fe] text-[#0277bd] font-medium" : ""}`}
                          >
                            {c.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Middle */}
                <div className="text-3xl font-bold text-gray-300 mt-12">OR</div>

                {/* Right Side */}
                <div>
                  <h3 className="text-xl font-medium text-[#0277bd] mb-4 flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" /> Create new client
                  </h3>
                  <Input
                    className="h-12 text-lg focus-visible:ring-[#0277bd]"
                    placeholder="Enter a new client name"
                    value={newClientName}
                    onChange={(e) => {
                      setNewClientName(e.target.value);
                      setClientId("new");
                      setSearch("");
                      setShowDropdown(false);
                    }}
                  />
                  {clientId === "new" && (
                    <div className="mt-2 text-sm text-[#8bc34a] font-medium flex items-center gap-1">
                      <CheckIcon className="h-4 w-4" /> Creating new client
                    </div>
                  )}
                </div>
              </div>

              <button
                disabled={!clientId}
                onClick={() => setStep(3)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-full text-lg font-medium transition-colors ${
                  clientId
                    ? "bg-[#a5b2bc] hover:bg-[#8bc34a] text-white cursor-pointer"
                    : "bg-gray-300 text-gray-100 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-5 w-5" /> Next
                </div>
              </button>
            </div>
          )}

          {step === 3 && type === "custom" && (
            <div className="max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <p className="text-gray-600 mb-8 font-medium">
                Give your custom virtual tour a name to get started.
              </p>

              <div className="flex border rounded border-gray-300 overflow-hidden mb-12 bg-white">
                <div className="px-4 py-3 bg-gray-50 border-r text-gray-500 flex items-center">
                  <Wand2 className="h-5 w-5" />
                </div>
                <Input
                  className="border-0 h-14 text-lg rounded-none focus-visible:ring-0 px-4 flex-1"
                  placeholder="e.g. My Premium Virtual Tour"
                  value={tourInput}
                  onChange={(e) => setTourInput(e.target.value)}
                />
              </div>

              <div className="mb-12 relative flex justify-center">
                {/* Astronaut Placeholder */}
                <div className="relative w-[500px] h-[200px] bg-gradient-to-t from-[#4a6378] to-[#1e2f42] rounded-t-full overflow-hidden flex items-end justify-center pb-4">
                  <div className="absolute inset-x-0 bottom-0 h-[40px] bg-[#668096] rounded-[100%] scale-150 transform translate-y-1/2 opacity-50" />
                  <Rocket className="h-24 w-24 text-white z-10" />
                  <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-white opacity-50" />
                  <div className="absolute top-20 right-20 w-3 h-3 rounded-full bg-white opacity-40" />
                  <div className="absolute top-8 right-1/3 w-4 h-4 rounded-full bg-white opacity-30" />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={saving || !tourInput.trim()}
                className={`w-full flex items-center justify-center px-6 py-4 rounded-full text-lg font-medium transition-colors ${
                  tourInput.trim() && !saving
                    ? "bg-[#0277bd] hover:bg-[#0266a1] text-white cursor-pointer"
                    : "bg-gray-300 text-gray-100 cursor-not-allowed"
                }`}
              >
                {saving ? "Building..." : "start building"}
              </button>
            </div>
          )}

          {step === 3 && type !== "custom" && (
            <div className="max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <p className="text-gray-600 mb-8 font-medium">
                To get started, find your place page by CID, business name, address, Place ID, or Google Maps URL.
              </p>

              <div className="flex border rounded-lg border-gray-300 overflow-hidden mb-6 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#0277bd]/50 focus-within:border-[#0277bd]">
                <div className="px-4 py-3 bg-gray-50 border-r text-gray-500 flex items-center">
                  <Search className="h-5 w-5" />
                </div>
                <Input
                  ref={inputRef}
                  className="border-0 h-14 text-base md:text-lg rounded-none focus-visible:ring-0 px-4 w-[60%]"
                  placeholder="Business Name, Address, or Google Maps URL"
                  value={tourInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTourInput(val);
                    clearTimeout(debounceTimer.current);
                    if (val === "") {
                      setPlaceDetails({});
                      setCid("");
                      setPredictions([]);
                      setShowPredictions(false);
                    } else if (
                      val.includes("google.com/maps") ||
                      val.includes("maps.app.goo.gl") ||
                      val.includes("goo.gl/maps") ||
                      val.startsWith("ChIJ")
                    ) {
                      setShowPredictions(false);
                      handleResolveInput(val.trim());
                    } else {
                      debounceTimer.current = setTimeout(() => {
                        fetchPlacePredictions(val.trim());
                      }, 200);
                    }
                  }}
                  onFocus={() => {
                    if (predictions.length > 0 && tourInput.trim().length >= 2) {
                      setShowPredictions(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setShowPredictions(false);
                      handleResolveInput(tourInput.trim());
                    }
                  }}
                />
                <div className="px-3 py-3 bg-gray-50 border-x font-bold text-gray-400 flex items-center shrink-0 text-xs">
                  OR
                </div>
                <div className="px-3 py-3 bg-gray-50 border-r text-gray-500 flex items-center text-xs font-bold shrink-0">
                  CID / Place ID
                </div>
                <Input
                  className="border-0 h-14 text-base md:text-lg rounded-none focus-visible:ring-0 px-4 flex-1 font-mono text-sm"
                  placeholder="CID# or Place ID"
                  value={cid}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCid(val);
                    if (val.trim().length >= 8) {
                      handleResolveInput(val.trim());
                    } else if (val.trim() === "") {
                      setPlaceDetails({});
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleResolveInput(cid.trim());
                    }
                  }}
                />
              </div>

              {/* Suggestions Dropdown Popup */}
              {showPredictions && predictions.length > 0 && (
                <div className="relative -mt-4 mb-6 z-50 text-left">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1">
                    {predictions.map((p) => (
                      <button
                        key={p.place_id}
                        type="button"
                        onClick={() => handleSelectPrediction(p)}
                        className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-blue-50/70 transition-colors focus:bg-blue-50 focus:outline-none cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 text-[#0277bd] shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{p.main_text}</div>
                          {p.secondary_text && (
                            <div className="text-xs text-gray-500">{p.secondary_text}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Place Resolution Feedback Card */}
              {resolving && (
                <div className="mb-8 p-4 rounded-xl border border-blue-100 bg-blue-50/70 text-blue-700 text-sm flex items-center justify-center gap-2 animate-pulse">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Looking up location details on Google Maps...</span>
                </div>
              )}

              {placeDetails.name && !resolving && (
                <div className="mb-8 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-left shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-emerald-900 text-base">{placeDetails.name}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-200/60 text-emerald-800 rounded-full">
                          Location Confirmed
                        </span>
                      </div>
                      {placeDetails.address && (
                        <p className="text-xs text-emerald-700 pl-4">{placeDetails.address}</p>
                      )}
                      {(placeDetails.lat != null && placeDetails.lng != null) && (
                        <p className="text-[11px] font-mono text-emerald-600 pl-4">
                          Coordinates: {placeDetails.lat.toFixed(6)}, {placeDetails.lng.toFixed(6)}
                          {placeDetails.place_id && ` | Place ID: ${placeDetails.place_id}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-12 relative flex justify-center">
                {/* Astronaut Placeholder */}
                <div className="relative w-[500px] h-[200px] bg-gradient-to-t from-[#4a6378] to-[#1e2f42] rounded-t-full overflow-hidden flex items-end justify-center pb-4">
                  <div className="absolute inset-x-0 bottom-0 h-[40px] bg-[#668096] rounded-[100%] scale-150 transform translate-y-1/2 opacity-50" />
                  <Rocket className="h-24 w-24 text-white z-10" />
                  <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-white opacity-50" />
                  <div className="absolute top-20 right-20 w-3 h-3 rounded-full bg-white opacity-40" />
                  <div className="absolute top-8 right-1/3 w-4 h-4 rounded-full bg-white opacity-30" />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={saving || (!tourInput.trim() && !cid.trim())}
                className={`w-full flex items-center justify-center px-6 py-4 rounded-full text-lg font-medium transition-colors ${
                  (tourInput.trim() || cid.trim()) && !saving
                    ? "bg-[#0277bd] hover:bg-[#0266a1] text-white cursor-pointer shadow-md"
                    : "bg-gray-300 text-gray-100 cursor-not-allowed"
                }`}
              >
                {saving ? "Building..." : "start building"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
