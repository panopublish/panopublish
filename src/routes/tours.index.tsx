import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2, Pencil, Share2, ListFilter, Map } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useStreetViewStatus, Photo as StatusPhoto } from "@/hooks/useStreetViewStatus";

export const Route = createFileRoute("/tours/")({
  head: () => ({ meta: [{ title: "Tours — TourVista" }] }),
  component: ToursPage,
});

type Tour = { 
  id: string; 
  name: string; 
  status: any; 
  type: string; 
  created_at: string; 
  updated_at?: string;
  cid?: string | null;
  google_place_id?: string | null;
  client?: { name: string } | null 
};

function ToursPage() {
  const { user } = useAuth();
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    if (tours === null) {
      setLoading(true);
    }
    try {
      const { data: tourData, error: tourErr } = await supabase
        .from("tours")
        .select("id,name,status,type,created_at,cid,google_place_id,client:clients(name)")
        .eq("user_id", user.id);

      if (tourErr) throw tourErr;

      const tList = (tourData as any[]) ?? [];
      setTours(tList);

      if (tList.length > 0) {
        const ids = tList.map((t) => t.id);

        const [photoRes, connRes] = await Promise.all([
          supabase.from("photos").select("id,tour_id,file_url,streetview_status").in("tour_id", ids),
          supabase.from("connections").select("id,tour_id").in("tour_id", ids)
        ]);

        const loadedPhotos = photoRes.data ?? [];
        setPhotos(loadedPhotos);
        setConnections(connRes.data ?? []);

        // Self-healing check: Sync tour status based on photos
        let hasChanges = false;
        for (const t of tList) {
          const tPhotos = loadedPhotos.filter((p) => p.tour_id === t.id);
          if (tPhotos.length > 0) {
            const allSubmitted = tPhotos.every(p => p.streetview_status === 'PUBLISHED' || p.streetview_status === 'PROCESSING');
            const anyFailed = tPhotos.some(p => p.streetview_status === 'FAILED');
            
            let newStatus = t.status;
            if (allSubmitted) {
              newStatus = 'published';
            } else if (anyFailed) {
              newStatus = 'rejected';
            }

            if (newStatus !== t.status) {
              await supabase.from("tours").update({ status: newStatus }).eq("id", t.id);
              t.status = newStatus;
              hasChanges = true;
            }
          }
        }
        if (hasChanges) {
          setTours([...tList]);
        }
      }

      // Load Google access token to check status
      try {
        const { data, error } = await supabase.functions.invoke("google-oauth", {
          body: { action: "get_valid_token", user_id: user.id }
        });
        if (!error && data?.access_token) {
          setAccessToken(data.access_token);
        }
      } catch (e) {
        console.error("Google Auth connection error:", e);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error loading tours: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useStreetViewStatus(photos as StatusPhoto[], accessToken, load);

  useEffect(() => {
    load();
  }, [user]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you absolutely sure you want to permanently delete the virtual tour "${name}"? This action cannot be undone and will delete all associated photos and connections.`
    );
    if (!confirmed) return;

    const tid = toast.loading("Deleting tour...");
    try {
      const { error } = await supabase.from("tours").delete().eq("id", id);
      if (error) throw error;

      toast.success("Tour deleted successfully!", { id: tid });
      load();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete tour: " + err.message, { id: tid });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Local matching for Title or CID
  const filteredTours = (tours ?? []).filter((t) => {
    const titleMatch = t.name?.toLowerCase().includes(search.toLowerCase()) ?? false;
    const cidMatch = t.cid?.toLowerCase().includes(search.toLowerCase()) ?? false;
    return titleMatch || cidMatch;
  });

  // Local sorting logic
  const sortedTours = [...filteredTours].sort((a, b) => {
    if (sortBy === "created_desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "created_asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === "title_asc") {
      return (a.name ?? "").localeCompare(b.name ?? "");
    }
    if (sortBy === "title_desc") {
      return (b.name ?? "").localeCompare(a.name ?? "");
    }
    return 0;
  });

  return (
    <AppShell title="Tours" breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Tours" }]}>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
        
        {/* Header Block */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold bg-gray-100 px-3 py-1 rounded-full text-xs border">
              Tours Found ({sortedTours.length})
            </span>
          </div>
          <Link to="/tours/new">
            <Button className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold gap-1 shadow">
              <Plus className="h-4 w-4" /> Create Tour
            </Button>
          </Link>
        </div>

        {/* Search & Sort Panel */}
        <div className="bg-slate-50 border p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border rounded-lg shadow-sm">
            <span className="text-xs font-black text-gray-400 flex items-center gap-1 uppercase tracking-wider">
              <ListFilter className="h-3.5 w-3.5" /> Sort
            </span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-transparent font-extrabold text-gray-700 outline-none cursor-pointer border-0 p-0 pr-6 focus:ring-0"
            >
              <option value="created_desc">Created On | DESC</option>
              <option value="created_asc">Created On | ASC</option>
              <option value="title_asc">Title | A-Z</option>
              <option value="title_desc">Title | Z-A</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search all of your tours by CID or Title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-[#0277bd]/50 focus:border-[#0277bd] transition-all font-medium shadow-sm"
            />
          </div>
        </div>

        {/* Tours Content List */}
        {tours === null || loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl border" />
            ))}
          </div>
        ) : sortedTours.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
            <Map className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-600">No tours match your criteria</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">Try refining your search terms or create a new tour to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm divide-y divide-gray-100">
            {sortedTours.map((t) => {
              const firstPhoto = photos.find((p) => p.tour_id === t.id);
              const thumbUrl = firstPhoto?.file_url;
              const hasConnections = connections.some((c) => c.tour_id === t.id);
              const tourPhotos = photos.filter((p) => p.tour_id === t.id);
              const isPublished = t.status === "published" || 
                (tourPhotos.length > 0 && tourPhotos.every((p) => p.streetview_status === 'PUBLISHED'));

              return (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between hover:bg-slate-50/50 transition-colors">
                  
                  {/* Thumbnail */}
                  <div className="w-36 h-20 rounded-lg overflow-hidden border bg-gray-50 flex-shrink-0 relative group shadow-sm">
                    {thumbUrl ? (
                      <img 
                        src={thumbUrl} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0277bd]/10 to-[#8bc34a]/10 flex items-center justify-center">
                        <Map className="h-6 w-6 text-[#0277bd]/20" />
                      </div>
                    )}
                  </div>

                  {/* Tour Meta and Buttons */}
                  <div className="flex-1 min-w-0 pr-2 text-center sm:text-left">
                    <h3 className="font-bold text-[#0277bd] text-sm truncate hover:underline">
                      <Link to="/tours/$tourId" params={{ tourId: t.id }}>
                        {t.name}
                      </Link>
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1 font-medium">
                      CID: <code className="bg-gray-100 border border-gray-200 px-1 py-0.2 rounded text-[10px] text-gray-700 font-mono">{t.cid || "—"}</code>
                    </p>
                    
                    {/* Buttons Row */}
                    <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-3">
                      <Link to="/tours/$tourId" params={{ tourId: t.id }}>
                        <Button className="bg-[#f05a28] hover:bg-[#d94e1f] text-white font-bold h-8 px-4 text-xs rounded gap-1 transition-transform active:scale-95 shadow-sm">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </Link>
                      
                      {hasConnections ? (
                        <a 
                          href={`/tours/${t.id}/connections?preview=true`} 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <Button className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold h-8 px-4 text-xs rounded gap-1 transition-transform active:scale-95 shadow-sm">
                            <Share2 className="h-3.5 w-3.5" /> Share Preview
                          </Button>
                        </a>
                      ) : (
                        <Button 
                          disabled 
                          className="bg-gray-200 text-gray-400 border border-gray-300/40 font-bold h-8 px-4 text-xs rounded cursor-not-allowed gap-1 shadow-none"
                          title="Add connections in the map editor first to enable preview"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Share Preview
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="text-[11px] text-gray-500 space-y-1 font-semibold pr-6 min-w-[130px] border-l pl-4 hidden md:block">
                    <div className="flex justify-between gap-2">
                      <span>Created:</span>
                      <span className="font-bold text-gray-700">{formatDate(t.created_at)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Updated:</span>
                      <span className="font-bold text-gray-700">{formatDate(t.updated_at || t.created_at)}</span>
                    </div>
                  </div>

                  {/* Status Indicator & Deletion */}
                  <div className="flex items-center gap-6">
                    <div 
                      className={`h-4.5 w-4.5 rounded-full shadow border-2 border-white ${
                        isPublished 
                          ? "bg-[#8bc34a] shadow-[0_0_8px_#8bc34a]" 
                          : "bg-[#f44336] shadow-[0_0_8px_#f44336]"
                      }`}
                      title={isPublished ? "Published on Google Maps" : "Unpublished / Draft"}
                    />
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(t.id, t.name)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors h-9 w-9"
                      title="Delete Tour Permanently"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
