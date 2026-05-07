import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, MapPin, Star, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tours/new")({
  head: () => ({ meta: [{ title: "Create Tour — TourVista" }] }),
  component: CreateTour,
});

const BUSINESS_TYPES = ["Hotel", "Restaurant", "Showroom", "Hospital", "College", "Other"];

function CreateTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"gmaps" | "custom">("gmaps");
  const [clients, setClients] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [clientId, setClientId] = useState<string | "new" | "">("");
  const [search, setSearch] = useState("");
  const [newClient, setNewClient] = useState({ name: "", business_type: "Hotel", phone: "", city: "" });
  const [tour, setTour] = useState({ name: "", address: "", google_place_url: "", cid: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("clients").select("id,name,city").eq("user_id", user.id).order("name").then(({ data }) => setClients(data ?? []));
  }, [user]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const next = () => {
    if (step === 2) {
      if (clientId === "") return toast.error("Pick a client or create a new one");
      if (clientId === "new" && !newClient.name.trim()) return toast.error("New client name is required");
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    if (!user) return;
    if (!tour.name.trim()) return toast.error("Business name is required");
    setSaving(true);
    let finalClientId: string | null = null;
    if (clientId === "new") {
      const { data, error } = await supabase.from("clients").insert({ user_id: user.id, ...newClient }).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      finalClientId = data.id;
    } else if (clientId) finalClientId = clientId;

    const { data, error } = await supabase.from("tours").insert({
      user_id: user.id, client_id: finalClientId, name: tour.name, type, status: "draft",
      address: tour.address, google_place_url: tour.google_place_url || null, cid: tour.cid || null,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tour created!");
    navigate({ to: "/tours/$tourId", params: { tourId: data.id } });
  };

  return (
    <AppShell title="Create Tour" breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Tours", to: "/tours" }, { label: "New" }]}>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-3">
              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</div>
              {n < 3 && <div className={`h-1 flex-1 rounded ${step > n ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 mt-2 text-xs text-muted-foreground">
          <span>Type</span><span className="text-center">Client</span><span className="text-right">Details</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={() => setType("gmaps")} className={`text-left rounded-2xl border-2 p-6 transition-all ${type === "gmaps" ? "border-success ring-2 ring-success/30" : "hover:border-success/40"}`}>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success"><MapPin className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold">Publish to Google Maps</h3>
              <p className="text-sm text-muted-foreground mt-1">Get your business listing on Google with 360° Street View imagery.</p>
            </button>
            <button onClick={() => setType("custom")} className={`text-left rounded-2xl border-2 p-6 transition-all ${type === "custom" ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"}`}>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary"><Star className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold">Create Custom Tour</h3>
              <p className="text-sm text-muted-foreground mt-1">Build a hosted 360° virtual tour for your client’s website.</p>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <Label className="mb-2 block">Search existing client</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Type a client name…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {search && (
                <div className="mt-3 max-h-48 overflow-auto divide-y rounded-md border">
                  {filtered.length === 0 ? <div className="p-3 text-sm text-muted-foreground">No matches</div> :
                    filtered.map((c) => (
                      <button key={c.id} onClick={() => { setClientId(c.id); setSearch(c.name); }} className={`w-full text-left p-3 text-sm hover:bg-muted ${clientId === c.id ? "bg-muted" : ""}`}>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.city}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="text-center text-xs text-muted-foreground">— OR —</div>

            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <Label>Create a new client</Label>
                <button onClick={() => setClientId("new")} className={`text-xs font-medium ${clientId === "new" ? "text-primary" : "text-muted-foreground"}`}>{clientId === "new" ? "Selected ✓" : "Use new client"}</button>
              </div>
              <div className="space-y-3">
                <Input placeholder="Client name" value={newClient.name} onChange={(e) => { setNewClient({ ...newClient, name: e.target.value }); setClientId("new"); }} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newClient.business_type} onValueChange={(v) => setNewClient({ ...newClient, business_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="City" value={newClient.city} onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} />
                </div>
                <Input placeholder="+91 98765 43210" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div><Label>Business name *</Label><Input value={tour.name} onChange={(e) => setTour({ ...tour, name: e.target.value })} /></div>
            <div><Label>Full address</Label><Input value={tour.address} onChange={(e) => setTour({ ...tour, address: e.target.value })} /></div>
            <div>
              <Label>Google Place URL</Label>
              <div className="flex gap-2">
                <Input placeholder="https://maps.google.com/..." value={tour.google_place_url} onChange={(e) => setTour({ ...tour, google_place_url: e.target.value })} />
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(tour.name + " " + tour.address)}`} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline"><ExternalLink className="h-4 w-4 mr-1" /> Find on Maps</Button>
                </a>
              </div>
            </div>
            <div><Label>CID number (optional)</Label><Input value={tour.cid} onChange={(e) => setTour({ ...tour, cid: e.target.value })} /></div>
            <div className="aspect-video rounded-xl border-2 border-dashed bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
              Map preview will appear after the tour is linked
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          {step < 3 ? (
            <Button onClick={next}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Tour"}</Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
