import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepsNav } from "@/components/TourStepsNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Layers, 
  Globe, 
  Eye, 
  Layers2, 
  Compass, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  DownloadCloud,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tours/$tourId/analytics")({
  head: () => ({ meta: [{ title: "Tour Analytics — TourVista" }] }),
  component: TourAnalytics,
});

type Photo = {
  id: string;
  filename: string | null;
  file_url: string;
  file_path: string;
  streetview_status: string | null;
  streetview_photo_id: string | null;
  streetview_share_link: string | null;
  view_count: number;
  island_id: string | null;
};

type Island = {
  id: string;
  name: string;
  is_level?: boolean;
  level_number?: number;
  level_name?: string;
};

type Connection = {
  id: string;
  from_photo_id: string;
  to_photo_id: string;
};

function TourAnalytics() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [islands, setIslands] = useState<Island[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tour, setTour] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<"overview" | "scenes">("overview");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch tour details
      const { data: t } = await supabase.from("tours").select("*").eq("id", tourId).maybeSingle();
      setTour(t);

      // 2. Fetch islands
      const { data: is } = await supabase.from("islands").select("*").eq("tour_id", tourId);
      setIslands(is ?? []);

      // 3. Fetch connections
      const { data: conns } = await supabase.from("connections").select("*").eq("tour_id", tourId);
      setConnections(conns ?? []);

      // 4. Fetch photos
      const { data: ps } = await supabase
        .from("photos")
        .select("*")
        .eq("tour_id", tourId)
        .order("uploaded_at");
      setPhotos((ps as any) ?? []);

      // 5. Fetch Google Token
      const { data: tokenData } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get_valid_token", user_id: user.id }
      });
      if (tokenData?.access_token) {
        setAccessToken(tokenData.access_token);
      }
    } catch (e: any) {
      console.error("Failed to load analytics data:", e);
      toast.error("Failed to load analytics data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, tourId]);

  // Sync Google Views and Status
  const handleSyncViews = async () => {
    if (!accessToken) {
      toast.error("Please connect your Google Account in Publish tab first.");
      return;
    }

    const svPhotos = photos.filter(p => p.streetview_photo_id && (p.streetview_status === 'PUBLISHED' || p.streetview_status === 'PROCESSING'));
    if (svPhotos.length === 0) {
      toast.info("No published scenes found to sync views for.");
      return;
    }

    setSyncing(true);
    setSyncProgress({ current: 0, total: svPhotos.length });
    const tid = toast.loading(`Syncing 0 of ${svPhotos.length} scenes with Google Maps...`);

    try {
      let current = 0;
      for (const p of svPhotos) {
        if (!p.streetview_photo_id) continue;
        
        try {
          const { data, error } = await supabase.functions.invoke("streetview-publish", {
            body: { 
              action: "get_photo_status", 
              access_token: accessToken,
              streetview_photo_id: p.streetview_photo_id
            }
          });

          if (error) {
            console.error(`Sync error for ${p.filename}:`, error);
          } else if (data?.success === false) {
            console.error(`Sync api error for ${p.filename}:`, data.error);
          }
        } catch (e) {
          console.error(`Sync fetch error for ${p.filename}:`, e);
        }
        
        current++;
        setSyncProgress({ current, total: svPhotos.length });
        toast.loading(`Syncing ${current} of ${svPhotos.length} scenes with Google Maps...`, { id: tid });
      }

      toast.success("Analytics synced successfully with Google Maps!", { id: tid });
      await loadData();
    } catch (err: any) {
      toast.error("Sync failed: " + err.message, { id: tid });
    } finally {
      setSyncing(false);
    }
  };

  // Download Analytics as CSV
  const handleDownloadCSV = () => {
    try {
      const headers = ["Index", "Filename", "Island", "Level", "Connections", "Status", "Street View ID", "Share Link", "Views/Impressions"];
      const rows = sortedPhotos.map((p, idx) => {
        const island = islands.find(i => i.id === p.island_id);
        const connCount = connectionCounts.get(p.id) ?? 0;
        const levelText = island?.is_level ? `${island.level_number} (${island.level_name || 'L0'})` : '—';
        return [
          idx,
          p.filename || `scene_${idx}`,
          island?.name || '—',
          levelText,
          connCount,
          p.streetview_status || 'NOT_PUBLISHED',
          p.streetview_photo_id || '—',
          p.streetview_share_link || '—',
          p.view_count
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `analytics_${tour?.name || 'tour'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Analytics CSV report downloaded!");
    } catch (err: any) {
      toast.error("Failed to generate CSV: " + err.message);
    }
  };

  // Download Scene Panorama Image
  const handleDownloadScene = async (p: Photo) => {
    try {
      const res = await fetch(p.file_url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = p.filename || "panorama.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Scene ${p.filename || 'panorama'} downloaded!`);
    } catch (err: any) {
      toast.error("Failed to download image: " + err.message);
    }
  };

  // Calculations
  const publishedPhotos = photos.filter(p => p.streetview_photo_id && (p.streetview_status === 'PUBLISHED' || p.streetview_status === 'PROCESSING'));
  const totalViews = publishedPhotos.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const levelsCount = islands.filter(i => i.is_level).length;

  const connectionCounts = new Map<string, number>();
  connections.forEach(c => {
    connectionCounts.set(c.from_photo_id, (connectionCounts.get(c.from_photo_id) ?? 0) + 1);
    connectionCounts.set(c.to_photo_id, (connectionCounts.get(c.to_photo_id) ?? 0) + 1);
  });

  // Sort photos by view count descending
  const sortedPhotos = [...photos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  const topThree = sortedPhotos.slice(0, 3).filter(p => p.view_count > 0 || (p.streetview_photo_id && (p.streetview_status === 'PUBLISHED' || p.streetview_status === 'PROCESSING')));

  return (
    <AppShell 
      title="Tour Analytics" 
      breadcrumbs={[
        { label: "Tours", to: "/tours" }, 
        { label: tour?.name || "Tour" }, 
        { label: "Analytics" }
      ]}
    >
      <div className="bg-[#f8fafc] min-h-[calc(100vh-64px)] pb-12">
        <TourStepsNav tourId={tourId} activeTab="analytics" />

        <div className="max-w-6xl mx-auto px-4 mt-6">
          {/* Header Action Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{tour?.name || "Tour Dashboard"}</h1>
              <p className="text-sm text-slate-500 font-medium">{tour?.address || "No address assigned"}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSyncViews}
                disabled={syncing || loading || !accessToken}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95 flex items-center gap-2 px-5 py-2.5"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? `Syncing (${syncProgress.current}/${syncProgress.total})` : "Sync Google Views"}
              </Button>

              <Button
                onClick={handleDownloadCSV}
                disabled={loading || photos.length === 0}
                variant="outline"
                className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm hover:shadow transition-all duration-300 flex items-center gap-2 px-5 py-2.5 bg-white cursor-pointer"
              >
                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
                Export CSV
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
              <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold text-sm">Loading analytics statistics...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 shadow-sm flex flex-col items-center justify-center min-h-[350px] text-center">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
              <h2 className="text-lg font-bold text-slate-800">No scenes uploaded yet</h2>
              <p className="text-slate-400 text-sm max-w-sm mt-1 mb-6">
                You need to upload 360° photos and publish them to Google Maps before analytics views can be tracked.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Premium KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Views Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md duration-300 group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-blue-600 group-hover:scale-110 transition-transform">
                    <Eye className="h-16 w-16" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">Total Impressions</span>
                    <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      {totalViews.toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold mt-4">
                    Views across all Google Maps spheres
                  </div>
                </div>

                {/* Total Scenes Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md duration-300 group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Globe className="h-16 w-16" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">Scenes Uploaded</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{photos.length}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold mt-4">
                    {publishedPhotos.length} published on Google Maps
                  </div>
                </div>

                {/* Islands Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md duration-300 group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform">
                    <Layers className="h-16 w-16" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">Islands Created</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{islands.length}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold mt-4">
                    Logical grouping folders
                  </div>
                </div>

                {/* Levels Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md duration-300 group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-600 group-hover:scale-110 transition-transform">
                    <Layers2 className="h-16 w-16" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">Levels Active</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{levelsCount}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold mt-4">
                    Floor layout mapping segments
                  </div>
                </div>
              </div>

              {/* Main Custom Tabs */}
              <div className="border bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-2">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      activeTab === "overview"
                        ? "bg-white text-[#0277bd] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Tour Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("scenes")}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      activeTab === "scenes"
                        ? "bg-white text-[#0277bd] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Scene Analytics
                  </button>
                </div>

                {/* Tab Content: Tour Overview */}
                {activeTab === "overview" && (
                  <div className="p-8">
                    <div className="mb-6">
                      <h2 className="text-lg font-black text-slate-800">Top Performing Scenes</h2>
                      <p className="text-xs text-slate-400 font-medium">Ranked by overall impression share split</p>
                    </div>

                    {topThree.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center">
                        <Globe className="h-10 w-10 text-slate-300 mb-2" />
                        <span className="text-sm font-semibold">No view analytics tracked yet</span>
                        <span className="text-xs mt-0.5">Publish your tour on Google Maps and click "Sync Google Views" to load metrics.</span>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-3 gap-8">
                        {topThree.map((p, idx) => {
                          const pctShare = totalViews > 0 ? Math.round((p.view_count / totalViews) * 100) : 0;
                          
                          // Circular indicator stroke properties
                          const radius = 42;
                          const circumference = 2 * Math.PI * radius;
                          const strokeDashoffset = circumference - (pctShare / 100) * circumference;

                          // Colors for circular progress
                          const ringColor = idx === 0 ? "stroke-blue-500" : idx === 1 ? "stroke-indigo-500" : "stroke-amber-500";
                          const glowColor = idx === 0 ? "text-blue-500/10" : idx === 1 ? "text-indigo-500/10" : "text-amber-500/10";

                          return (
                            <div key={p.id} className="group flex flex-col items-center p-6 border rounded-2xl hover:border-slate-200 hover:shadow-md transition-all duration-300 relative bg-white overflow-hidden">
                              
                              {/* Position Badge */}
                              <div className="absolute top-4 left-4 h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-sm">
                                {idx + 1}
                              </div>

                              {/* Donut Impression Share Indicator */}
                              <div className="relative h-28 w-28 flex items-center justify-center mb-5">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="56"
                                    cy="56"
                                    r={radius}
                                    className="stroke-slate-100 fill-transparent"
                                    strokeWidth="8"
                                  />
                                  <circle
                                    cx="56"
                                    cy="56"
                                    r={radius}
                                    className={`${ringColor} fill-transparent transition-all duration-1000 ease-out`}
                                    strokeWidth="8"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                  <span className="text-xl font-black text-slate-800 leading-none">{pctShare}%</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">share</span>
                                </div>
                              </div>

                              {/* Impressions Stat */}
                              <div className="text-center mb-5">
                                <span className="text-2xl font-black text-slate-800 tracking-tight">
                                  {p.view_count.toLocaleString("en-US")}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mt-0.5">Impressions</span>
                              </div>

                              {/* Thumbnail preview */}
                              <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border bg-slate-100 mb-4 relative shadow-sm">
                                <img
                                  src={p.file_url}
                                  alt={p.filename || "Scene preview"}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                                  <span className="text-[10px] font-bold text-white truncate block">{p.filename}</span>
                                </div>
                              </div>

                              {/* Links */}
                              {p.streetview_share_link && (
                                <a
                                  href={p.streetview_share_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-[#0277bd] hover:text-[#01579b] flex items-center gap-1 mt-1 cursor-pointer transition-colors"
                                >
                                  view on maps
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: Scene Analytics */}
                {activeTab === "scenes" && (
                  <div className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-left font-bold text-xs uppercase tracking-wider">
                          <tr>
                            <th className="p-4 pl-6 w-24">Scene</th>
                            <th className="p-4">Details</th>
                            <th className="p-4 text-center">Connections</th>
                            <th className="p-4 text-center">Floor Level</th>
                            <th className="p-4 text-right pr-6">Views</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedPhotos.map((p, idx) => {
                            const island = islands.find(i => i.id === p.island_id);
                            const connCount = connectionCounts.get(p.id) ?? 0;
                            const isPublished = p.streetview_photo_id && (p.streetview_status === 'PUBLISHED' || p.streetview_status === 'PROCESSING');

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                {/* Thumbnail */}
                                <td className="p-4 pl-6">
                                  <div className="relative aspect-square w-16 rounded-xl border bg-slate-50 overflow-hidden shadow-sm">
                                    <img
                                      src={p.file_url}
                                      alt={p.filename || "Scene"}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute top-1 left-1 bg-black/60 text-white rounded text-[8px] px-1 font-bold">
                                      {idx}
                                    </div>
                                  </div>
                                </td>

                                {/* Details / Metadata */}
                                <td className="p-4">
                                  <div className="font-bold text-slate-800 truncate max-w-[200px] mb-1" title={p.filename || ""}>
                                    {p.filename || `scene_${idx}`}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {island && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                        {island.name}
                                      </span>
                                    )}
                                    {isPublished ? (
                                      <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-100 inline-flex items-center gap-0.5">
                                        <CheckCircle2 className="h-2.5 w-2.5" /> Published
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-50 text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                                        Draft
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Quick Actions */}
                                  <div className="flex items-center gap-3 mt-2 text-xs font-bold text-[#0277bd]">
                                    {p.streetview_share_link && (
                                      <a
                                        href={p.streetview_share_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline flex items-center gap-0.5 cursor-pointer"
                                      >
                                        view
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleDownloadScene(p)}
                                      className="hover:underline flex items-center gap-0.5 cursor-pointer text-slate-500 hover:text-slate-700"
                                    >
                                      download
                                      <Download className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Connections Count */}
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                    {connCount}
                                  </span>
                                </td>

                                {/* Floor Level */}
                                <td className="p-4 text-center">
                                  {island?.is_level ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs font-bold text-slate-800">{island.level_number}</span>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                        {island.level_name || 'L0'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-xs">—</span>
                                  )}
                                </td>

                                {/* Views / Impressions */}
                                <td className="p-4 text-right pr-6">
                                  <span className="text-base font-black text-slate-800">
                                    {p.view_count.toLocaleString("en-US")}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider leading-none mt-0.5">
                                    views
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
