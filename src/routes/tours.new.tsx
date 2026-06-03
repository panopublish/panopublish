import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, UploadCloud, Wand2, Star, UserPlus, MapPin, Rocket } from "lucide-react";
import { toast } from "sonner";

import { getEnv } from "@/lib/env";

export const Route = createFileRoute("/tours/new")({
  head: () => ({ meta: [{ title: "Create Tour — TourVista" }] }),
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
  
  const [tourInput, setTourInput] = useState("");
  const [placeDetails, setPlaceDetails] = useState<{ address?: string; url?: string; place_id?: string; name?: string; lat?: number; lng?: number }>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("clients").select("id,name,city").eq("user_id", user.id).order("name").then(({ data }) => setClients(data ?? []));
  }, [user]);

  useEffect(() => {
    if (step === 3 && !(window as any).google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${getEnv('VITE_GOOGLE_MAPS_API_KEY')}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = initAutocomplete;
    } else if (step === 3 && (window as any).google) {
      initAutocomplete();
    }
  }, [step]);

  const initAutocomplete = () => {
    if (!inputRef.current || !(window as any).google) return;
    const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, { types: ["establishment", "geocode"] });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.place_id) return;
      setTourInput(place.name || inputRef.current?.value || "");
      setPlaceDetails({
        address: place.formatted_address,
        url: place.url,
        place_id: place.place_id,
        name: place.name,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng()
      });
    });
  };

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleActionSelected = (actionType: "gmaps" | "custom") => {
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
      if (!newClientName.trim()) { toast.error("New client name is required"); setSaving(false); return; }
      const { data, error } = await supabase.from("clients").insert({ user_id: user.id, name: newClientName, business_type: "Other", city: "" }).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      finalClientId = data.id;
    } else if (clientId) {
      finalClientId = clientId;
    } else {
      toast.error("Please select or create a client");
      setSaving(false); return;
    }

    if (!tourInput.trim()) {
      toast.error("Please enter a business name or CID");
      setSaving(false); return;
    }

    // Determine if it's a CID or business name based on some simple regex
    let cid = null;
    let name = placeDetails.name || tourInput;
    if (/^[0-9]+$/.test(tourInput.trim())) {
      cid = tourInput.trim();
      name = "Tour " + cid;
    }

    const { data, error } = await supabase.from("tours").insert({
      user_id: user.id, client_id: finalClientId, name, type: type || "gmaps", status: "draft", cid,
      address: placeDetails.address, google_place_url: placeDetails.url,
      google_place_id: placeDetails.place_id, latitude: placeDetails.lat, longitude: placeDetails.lng
    }).select("id").single();
    
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tour created!");
    navigate({ to: "/tours/$tourId", params: { tourId: data.id } });
  };

  const renderStepNav = () => {
    const mainStep = Math.floor(step);
    return (
      <div className="flex items-center justify-center gap-4 mb-12">
        <div className={`flex items-center gap-2 ${mainStep === 1 ? 'text-[#0277bd]' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${mainStep === 1 ? 'bg-[#0277bd]' : 'bg-muted-foreground/50'}`}>1</div>
          <span className="text-sm font-medium">Choose what you want to do</span>
        </div>
        <div className={`flex items-center gap-2 ${mainStep === 2 ? 'text-[#0277bd]' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${mainStep === 2 ? 'bg-[#0277bd]' : 'bg-muted-foreground/50'}`}>2</div>
          <span className="text-sm font-medium">Select your client</span>
        </div>
        <div className={`flex items-center gap-2 ${mainStep === 3 ? 'text-[#0277bd]' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white ${mainStep === 3 ? 'bg-[#0277bd]' : 'bg-muted-foreground/50'}`}>3</div>
          <span className="text-sm font-medium">Get ready for take off</span>
        </div>
      </div>
    );
  };

  return (
    <AppShell title="Create Tour" breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: "Create" }]}>
      <div className="bg-[#f2f4f8] min-h-[calc(100vh-64px)] p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-12">
          {renderStepNav()}

          {step === 1 && (
            <div className="max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <h1 className="text-3xl font-medium text-[#0277bd] mb-8">What would you like to do?</h1>
              <div className="space-y-4">
                <button 
                  onClick={() => handleActionSelected("gmaps")}
                  className="w-full flex items-center gap-4 bg-[#8bc34a] hover:bg-[#7cb342] text-white px-6 py-4 rounded-full text-lg transition-colors font-medium"
                >
                  <MapPin className="h-6 w-6" /> Publish a tour to Google Maps
                </button>
                <button 
                  onClick={() => handleActionSelected("custom")}
                  className="w-full flex items-center gap-4 bg-[#0277bd] hover:bg-[#0266a1] text-white px-6 py-4 rounded-full text-lg transition-colors font-medium"
                >
                  <Wand2 className="h-6 w-6" /> Create a custom tour
                </button>
              </div>
            </div>
          )}

          {step === 1.1 && (
            <div className="max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <h1 className="text-3xl font-medium text-[#0277bd] mb-8">Cool, how should we create your Google tour?</h1>
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
                <span className="font-bold">Why do I need to do this?</span> TourBuilder organizes your tours by client name. This helps you organize your Google Street View tours, custom tours, and users in one neatly tucked away place.
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
                      onChange={(e) => { setSearch(e.target.value); setClientId(""); }} 
                    />
                  </div>
                  {search && (
                    <div className="mt-2 max-h-48 overflow-auto border rounded-md shadow-sm bg-white z-10 absolute w-full max-w-[calc(50%-2rem)]">
                      {filtered.length === 0 ? <div className="p-3 text-gray-500">No matches</div> :
                        filtered.map((c) => (
                          <div 
                            key={c.id} 
                            onClick={() => { setClientId(c.id); setSearch(c.name); }} 
                            className={`p-3 cursor-pointer hover:bg-gray-50 ${clientId === c.id ? 'bg-[#e1f5fe] text-[#0277bd] font-medium' : ''}`}
                          >
                            {c.name}
                          </div>
                        ))
                      }
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
                    onChange={(e) => { setNewClientName(e.target.value); setClientId("new"); setSearch(""); }} 
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
                className={`w-full flex items-center justify-between px-6 py-4 rounded-full text-lg font-medium transition-colors ${clientId ? 'bg-[#a5b2bc] hover:bg-[#8d9ba6] text-white' : 'bg-gray-300 text-gray-100 cursor-not-allowed'}`}
                style={clientId ? { backgroundColor: '#a1acb4' } : {}}
              >
                <div className="flex items-center gap-2"><ChevronRight className="h-5 w-5" /> Next</div>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
              <p className="text-gray-600 mb-8 font-medium">To get started, find your place page by cid, business name, address or Google place page url.</p>
              
              <div className="flex border rounded border-gray-300 overflow-hidden mb-12 bg-white">
                <div className="px-4 py-3 bg-gray-50 border-r text-gray-500 flex items-center">
                  <Search className="h-5 w-5" />
                </div>
                <Input 
                  ref={inputRef}
                  className="border-0 h-14 text-lg rounded-none focus-visible:ring-0 px-4 w-[60%]" 
                  placeholder="Business Name, Address, or Google Place URL" 
                  value={tourInput} 
                  onChange={(e) => {
                    setTourInput(e.target.value);
                    if (e.target.value === "") setPlaceDetails({});
                  }} 
                />
                <div className="px-4 py-3 bg-gray-50 border-x font-bold text-gray-400 flex items-center shrink-0">
                  OR
                </div>
                <div className="px-4 py-3 bg-gray-50 border-r text-gray-500 flex items-center text-sm shrink-0">
                  cid
                </div>
                <Input 
                  className="border-0 h-14 text-lg rounded-none focus-visible:ring-0 px-4 flex-1" 
                  placeholder="CID# (most precise)" 
                  value={/^[0-9]+$/.test(tourInput) ? tourInput : ""} 
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
                disabled={saving || !tourInput}
                className="w-full flex items-center justify-center px-6 py-4 rounded-full text-lg font-medium transition-colors bg-gray-400 hover:bg-gray-500 text-white"
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
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CheckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
