import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepNav } from "@/components/TourStepNav";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { getEnv } from "@/lib/env";

import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/tours/$tourId/location")({
  head: () => ({
    meta: [
      { title: "Choose Location — PanoPublish" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LocationPage,
});

const MAPS_KEY = getEnv("VITE_GOOGLE_MAPS_API_KEY");

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.gmaps = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

function LocationPage() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [cid, setCid] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const acRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tours")
        .select("name,address,google_place_id,cid,latitude,longitude")
        .eq("id", tourId)
        .maybeSingle();
      if (data) {
        setTitle(data.name ?? "");
        setAddress(data.address ?? "");
        setPlaceId(data.google_place_id ?? null);
        setCid(data.cid ?? "");
        if (data.latitude != null && data.longitude != null) {
          setCoords({ lat: data.latitude, lng: data.longitude });
          setConfirmed(true);
        }
      }
    })();
  }, [tourId]);

  useEffect(() => {
    if (!MAPS_KEY || !acRef.current) return;
    let ac: any;
    loadGoogleMaps(MAPS_KEY)
      .then(() => {
        if (!acRef.current || !window.google) return;
        ac = new window.google.maps.places.Autocomplete(acRef.current, {
          fields: ["place_id", "geometry", "name", "formatted_address"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.geometry) return toast.error("No location for this place");
          setPlaceId(place.place_id);
          setCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
          setAddress(place.formatted_address ?? place.name ?? "");
          if (!title) setTitle(place.name ?? "");
          setConfirmed(true);
          toast.success("Location confirmed");
        });
      })
      .catch((e) => toast.error(e.message));
    return () => {
      if (ac && window.google) window.google.maps.event.clearInstanceListeners(ac);
    };
  }, [title]);

  const save = async () => {
    if (!user || !confirmed || !coords) return toast.error("Confirm a location first");
    setSaving(true);
    const { error } = await supabase
      .from("tours")
      .update({
        name: title,
        address,
        google_place_id: placeId,
        cid: cid || null,
        latitude: coords.lat,
        longitude: coords.lng,
      })
      .eq("id", tourId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Location saved");
    navigate({ to: "/tours/$tourId", params: { tourId } });
  };

  const mapsUrl = placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : coords
      ? `https://www.google.com/maps/?q=${coords.lat},${coords.lng}`
      : null;

  const embedSrc =
    MAPS_KEY && coords
      ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=place_id:${placeId ?? ""}&center=${coords.lat},${coords.lng}&zoom=17`
      : null;

  return (
    <AppShell
      title="Choose Location"
      breadcrumbs={[
        { label: "Tours", to: "/tours" },
        { label: title || "Tour" },
        { label: "Choose Location" },
      ]}
    >
      <SEO
        title="Choose Location"
        description="Confirm coordinates and select the business location for Google Maps."
        noIndex={true}
      />
      <TourStepNav tourId={tourId} current="location" />

      {!MAPS_KEY && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-semibold">Google Maps API key missing</p>
              <p className="text-muted-foreground mt-1">
                Add <code className="px-1 bg-muted rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your
                project environment to enable Places search and the live map. You can still type an
                address manually below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Business name"
            className="mt-1 text-lg h-11"
          />
        </div>

        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <Label htmlFor="search">Search business</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                ref={acRef}
                placeholder="Business Name, Address, or Google Place URL"
                className="pl-9 h-11"
                onChange={(e) => setAddress(e.target.value)}
                defaultValue={address}
              />
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground self-center pt-6">OR</div>
          <div>
            <Label htmlFor="cid">CID</Label>
            <Input
              id="cid"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              placeholder="CID# (most precise way to search)"
              className="mt-1 h-11"
            />
          </div>
        </div>

        {(placeId || coords) && (
          <div className="flex flex-wrap items-center gap-3 text-sm rounded-lg border bg-muted/40 p-3">
            {confirmed && <CheckCircle2 className="h-4 w-4 text-success" />}
            {placeId && (
              <span>
                <span className="text-muted-foreground">Place:</span>{" "}
                <code className="text-xs">{placeId}</code>
              </span>
            )}
            {cid && (
              <span>
                <span className="text-muted-foreground">CID:</span>{" "}
                <code className="text-xs">{cid}</code>
              </span>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline ml-auto"
              >
                verify on Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        <div className="aspect-[16/9] rounded-lg border bg-muted overflow-hidden">
          {embedSrc ? (
            <iframe
              src={embedSrc}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              {MAPS_KEY
                ? "Search a business to see it on the map."
                : "Map preview requires a Google Maps API key."}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/tours/$tourId", params: { tourId } })}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={!confirmed || saving}>
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
