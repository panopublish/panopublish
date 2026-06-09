import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  CreditCard, 
  Map, 
  Image, 
  Tag, 
  Plus, 
  ShieldCheck, 
  Calendar, 
  Pencil, 
  Trash2, 
  Sparkles, 
  TrendingUp, 
  Search, 
  Filter,
  CheckCircle,
  Clock,
  RefreshCw,
  Ticket
} from "lucide-react";
import { toast } from "sonner";
import { formatDateIN } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — TourVista" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  company_name: string | null;
  plan: string;
  credits: number;
  trial_ends_at: string | null;
  billing_cycle_tours_used: number;
  created_at: string;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  razorpay_subscription_id: string | null;
  start_date: string;
  end_date: string | null;
  amount_inr: number | null;
  created_at: string;
};

type Coupon = {
  id: string;
  code: string;
  email: string;
  discount_percent: number;
  plan: string | null;
  is_used: boolean;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
};

function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"users" | "subscriptions" | "coupons">("users");

  // Modal / Form State: Edit Profile
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({
    plan: "trial",
    credits: 0,
    billing_cycle_tours_used: 0,
  });

  // Form State: Coupon Code
  const [couponForm, setCouponForm] = useState({
    code: "",
    email: "",
    discountPercent: 20,
    plan: "all",
    expiresInDays: 30,
  });

  // Verify Admin Access
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (user.email !== "er.prashantyadav37@gmail.com" && user.email !== "vista360gtp@gmail.com") {
        toast.error("Access denied. Admin access only.");
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, subRes, tourRes, photoRes, clientRes, couponRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("tours").select("*").order("created_at", { ascending: false }),
        supabase.from("photos").select("id,tour_id,view_count,streetview_status"),
        supabase.from("clients").select("id"),
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      ]);

      setProfiles((profRes.data as Profile[]) ?? []);
      setSubscriptions((subRes.data as Subscription[]) ?? []);
      setTours(tourRes.data ?? []);
      setPhotos(photoRes.data ?? []);
      setClients(clientRes.data ?? []);
      setCoupons((couponRes.data as Coupon[]) ?? []);
    } catch (e: any) {
      console.error("Failed to load admin dashboard data:", e);
      toast.error("Error loading dashboard data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.email === "er.prashantyadav37@gmail.com" || user.email === "vista360gtp@gmail.com")) {
      loadData();
    }
  }, [user]);

  // Generate random coupon code
  const handleAutoGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "TV-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponForm((prev) => ({ ...prev, code }));
  };

  // Create Coupon Code
  const handleCreateCoupon = async () => {
    if (!couponForm.code.trim()) return toast.error("Coupon code is required");
    if (!couponForm.email.trim()) return toast.error("Target email is required");

    const expiresAt = couponForm.expiresInDays 
      ? new Date(Date.now() + couponForm.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      const { error } = await supabase.from("coupons").insert({
        code: couponForm.code.trim().toUpperCase(),
        email: couponForm.email.trim().toLowerCase(),
        discount_percent: Number(couponForm.discountPercent),
        plan: couponForm.plan === "all" ? null : couponForm.plan,
        expires_at: expiresAt,
        is_used: false,
      });

      if (error) {
        toast.error("Failed to create coupon: " + error.message);
      } else {
        toast.success(`Coupon code ${couponForm.code.toUpperCase()} created!`);
        setCouponForm({
          code: "",
          email: "",
          discountPercent: 20,
          plan: "all",
          expiresInDays: 30,
        });
        loadData();
      }
    } catch (err: any) {
      toast.error("Create coupon error: " + err.message);
    }
  };

  // Delete/Revoke Coupon Code
  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Delete or revoke coupon code "${code}"?`)) return;

    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete coupon: " + error.message);
      } else {
        toast.success(`Coupon ${code} deleted.`);
        loadData();
      }
    } catch (err: any) {
      toast.error("Delete coupon error: " + err.message);
    }
  };

  // Open Edit Profile Dialog
  const handleOpenEditProfile = (p: Profile) => {
    setEditingProfile(p);
    setProfileForm({
      plan: p.plan,
      credits: p.credits,
      billing_cycle_tours_used: p.billing_cycle_tours_used,
    });
  };

  // Save User Profile changes
  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          plan: profileForm.plan,
          credits: Number(profileForm.credits),
          billing_cycle_tours_used: Number(profileForm.billing_cycle_tours_used),
        })
        .eq("id", editingProfile.id);

      if (error) {
        toast.error("Failed to update profile: " + error.message);
      } else {
        toast.success("User profile updated successfully!");
        setEditingProfile(null);
        loadData();
      }
    } catch (err: any) {
      toast.error("Save profile error: " + err.message);
    }
  };

  // Calculations
  const totalViews = photos.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const activeSubs = profiles.filter(p => p.plan !== "trial").length;

  // Filtered Users List
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = 
      (p.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.company_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === "all" || p.plan === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  return (
    <AppShell 
      title="Admin Dashboard" 
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" }, 
        { label: "Admin" }
      ]}
    >
      <SEO
        title="Admin Console"
        description="Administrative console for TourVista."
        noIndex={true}
      />
      <div className="bg-[#f8fafc] min-h-[calc(100vh-64px)] pb-12">
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-8">
          
          {/* Header section */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-[#0277bd]" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Internal Use Only</span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight mt-1">Company Console</h1>
            </div>
            <Button
              onClick={loadData}
              disabled={loading}
              variant="outline"
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>

          {/* Premium Dashboard Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Total Users" value={loading ? undefined : profiles.length} subtext="Registered accounts" />
            <StatCard icon={CreditCard} label="Active Subscriptions" value={loading ? undefined : activeSubs} subtext="Paid plans active" accent="success" />
            <StatCard icon={Map} label="Total Tours" value={loading ? undefined : tours.length} subtext="Street View Tours" />
            <StatCard icon={Image} label="Photos Uploaded" value={loading ? undefined : photos.length} subtext="Panorama images" />
            <StatCard icon={TrendingUp} label="Total View Count" value={loading ? undefined : totalViews.toLocaleString("en-US")} subtext="Maps Impressions" accent="warning" />
            <StatCard icon={Ticket} label="Offers/Coupons" value={loading ? undefined : coupons.length} subtext="Discount codes" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            
            {/* Left 2 Columns: Users, Subscriptions, Coupons Tables */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Tab Navigation */}
              <div className="border bg-white rounded-2xl p-1.5 flex gap-2 shadow-sm">
                <button
                  onClick={() => setActiveTab("users")}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-center transition-all duration-300 ${
                    activeTab === "users"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Active Users ({loading ? "..." : profiles.length})
                </button>
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-center transition-all duration-300 ${
                    activeTab === "subscriptions"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Active Subscriptions ({loading ? "..." : subscriptions.length})
                </button>
                <button
                  onClick={() => setActiveTab("coupons")}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-center transition-all duration-300 ${
                    activeTab === "coupons"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Offer Coupons ({loading ? "..." : coupons.length})
                </button>
              </div>

              {/* Tab Content: Active Users */}
              {activeTab === "users" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  
                  {/* Search and Filters */}
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search users by name, email, company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white border-slate-200 focus:ring-[#0277bd] rounded-xl text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-[140px] bg-white border-slate-200 rounded-xl text-xs font-bold">
                          <SelectValue placeholder="Plan filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Plans</SelectItem>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-8 space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : filteredProfiles.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      No matching users found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <tr>
                            <th className="p-4 pl-6">User details</th>
                            <th className="p-4">Plan / Limits</th>
                            <th className="p-4">Tours Used</th>
                            <th className="p-4">Joined Date</th>
                            <th className="p-4 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredProfiles.map((p) => {
                            const userToursCount = tours.filter((t) => t.user_id === p.id).length;
                            const isTrial = p.plan === "trial";
                            const planLabelClass = 
                              p.plan === "agency" 
                                ? "bg-purple-50 text-purple-700 border-purple-100" 
                                : p.plan === "pro" 
                                ? "bg-blue-50 text-blue-700 border-blue-100" 
                                : p.plan === "basic" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-slate-100 text-slate-600 border-slate-200";

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-4 pl-6">
                                  <div className="font-bold text-slate-800">{p.name || "Unnamed User"}</div>
                                  <div className="text-xs text-slate-400 truncate max-w-[200px]" title={p.email || ""}>
                                    {p.email}
                                  </div>
                                  {p.company_name && (
                                    <div className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 inline-block mt-1 font-semibold">
                                      💼 {p.company_name}
                                    </div>
                                  )}
                                </td>
                                
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-black border uppercase ${planLabelClass}`}>
                                    {p.plan}
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                                    Credits: {p.credits}
                                  </div>
                                </td>
                                
                                <td className="p-4">
                                  <div className="font-bold text-slate-700">
                                    {p.billing_cycle_tours_used} tour{p.billing_cycle_tours_used === 1 ? "" : "s"}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                                    Total in DB: {userToursCount}
                                  </div>
                                </td>
                                
                                <td className="p-4 text-xs text-slate-400">
                                  {formatDateIN(p.created_at)}
                                </td>
                                
                                <td className="p-4 pr-6 text-right">
                                  <Button 
                                    onClick={() => handleOpenEditProfile(p)}
                                    variant="ghost" 
                                    size="icon" 
                                    className="hover:bg-slate-100 text-slate-600 hover:text-slate-800"
                                    title="Edit User Limits & Plan"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Subscriptions */}
              {activeTab === "subscriptions" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {loading ? (
                    <div className="p-8 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : subscriptions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-semibold">
                      No registered subscriptions in the database.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <tr>
                            <th className="p-4 pl-6">Subscriber</th>
                            <th className="p-4">Razorpay Sub ID</th>
                            <th className="p-4">Plan / Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 pr-6">Cycle Dates</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {subscriptions.map((sub) => {
                            const subscriberProfile = profiles.find((p) => p.id === sub.user_id);
                            const isActive = sub.status === "active";
                            
                            return (
                              <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-4 pl-6">
                                  <div className="font-bold text-slate-800">
                                    {subscriberProfile?.name || "Unknown"}
                                  </div>
                                  <div className="text-xs text-slate-400 truncate max-w-[200px]" title={subscriberProfile?.email || ""}>
                                    {subscriberProfile?.email || "No email"}
                                  </div>
                                </td>
                                
                                <td className="p-4 font-mono text-xs text-slate-500">
                                  {sub.razorpay_subscription_id || "—"}
                                </td>
                                
                                <td className="p-4">
                                  <span className="font-bold text-slate-800 uppercase text-xs">
                                    {sub.plan}
                                  </span>
                                  {sub.amount_inr !== null && (
                                    <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                      ₹{sub.amount_inr.toLocaleString("en-IN")}
                                    </div>
                                  )}
                                </td>
                                
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                    isActive
                                      ? "bg-green-50 text-green-700 border-green-100"
                                      : "bg-red-50 text-red-700 border-red-100"
                                  }`}>
                                    {isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                    {sub.status}
                                  </span>
                                </td>
                                
                                <td className="p-4 pr-6 text-xs text-slate-400">
                                  <div>Start: {formatDateIN(sub.start_date)}</div>
                                  {sub.end_date && <div>End: {formatDateIN(sub.end_date)}</div>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Offer / Discount Coupons */}
              {activeTab === "coupons" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {loading ? (
                    <div className="p-8 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-semibold">
                      No discount coupons created yet. Use the panel on the right to create your first coupon!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <tr>
                            <th className="p-4 pl-6">Coupon Code</th>
                            <th className="p-4">Recipient</th>
                            <th className="p-4">Discount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Expiry Date</th>
                            <th className="p-4 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {coupons.map((c) => {
                            const isExpired = c.expires_at ? new Date(c.expires_at).getTime() < Date.now() : false;
                            
                            return (
                              <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-4 pl-6">
                                  <div className="font-mono font-black text-[#0277bd] text-sm bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1 inline-block">
                                    {c.code}
                                  </div>
                                </td>
                                
                                <td className="p-4 text-xs font-semibold text-slate-600 truncate max-w-[150px]" title={c.email}>
                                  {c.email}
                                </td>
                                
                                <td className="p-4">
                                  <span className="font-black text-emerald-600 text-sm">
                                    {c.discount_percent}% OFF
                                  </span>
                                  {c.plan && (
                                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                      Plan: {c.plan}
                                    </div>
                                  )}
                                </td>
                                
                                <td className="p-4">
                                  {c.is_used ? (
                                    <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] font-black uppercase rounded-full px-2 py-0.5">
                                      Used
                                    </span>
                                  ) : isExpired ? (
                                    <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-black uppercase rounded-full px-2 py-0.5">
                                      Expired
                                    </span>
                                  ) : (
                                    <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase rounded-full px-2 py-0.5">
                                      Active
                                    </span>
                                  )}
                                </td>
                                
                                <td className="p-4 text-xs text-slate-400">
                                  {c.expires_at ? formatDateIN(c.expires_at) : "Never expires"}
                                </td>
                                
                                <td className="p-4 pr-6 text-right">
                                  <Button 
                                    onClick={() => handleDeleteCoupon(c.id, c.code)}
                                    variant="ghost" 
                                    size="icon" 
                                    className="hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer rounded-xl"
                                    title="Revoke / Delete Coupon"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right 1 Column: Create Coupon Form Panel */}
            <div className="space-y-6">
              
              {/* Form Container */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                  <div>
                    <h2 className="text-base font-black text-slate-800">Generate Offer Code</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Targeted Discount System</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Coupon Code Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500">Coupon / Promo Code</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. WELCOME50"
                        value={couponForm.code}
                        onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="font-mono bg-slate-50 border-slate-200 rounded-xl"
                      />
                      <Button
                        onClick={handleAutoGenerateCode}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs px-4"
                      >
                        Auto
                      </Button>
                    </div>
                  </div>

                  {/* Targeted Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500">Target User Email</Label>
                    <Input
                      placeholder="e.g. user@gmail.com"
                      value={couponForm.email}
                      type="email"
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>

                  {/* Discount percentage */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500">Discount (%)</Label>
                      <Select 
                        value={String(couponForm.discountPercent)} 
                        onValueChange={(val) => setCouponForm((prev) => ({ ...prev, discountPercent: Number(val) }))}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                          <SelectValue placeholder="Discount" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10% OFF</SelectItem>
                          <SelectItem value="20">20% OFF</SelectItem>
                          <SelectItem value="30">30% OFF</SelectItem>
                          <SelectItem value="50">50% OFF</SelectItem>
                          <SelectItem value="100">100% FREE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500">Valid For Plan</Label>
                      <Select 
                        value={couponForm.plan} 
                        onValueChange={(val) => setCouponForm((prev) => ({ ...prev, plan: val }))}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                          <SelectValue placeholder="Plan selection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Plan</SelectItem>
                          <SelectItem value="basic">Basic Only</SelectItem>
                          <SelectItem value="pro">Pro Only</SelectItem>
                          <SelectItem value="agency">Agency Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Expiration length */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500">Expires In</Label>
                    <Select 
                      value={String(couponForm.expiresInDays)} 
                      onValueChange={(val) => setCouponForm((prev) => ({ ...prev, expiresInDays: Number(val) }))}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                        <SelectValue placeholder="Expiry length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                        <SelectItem value="365">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleCreateCoupon}
                  className="w-full bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl shadow-md py-3 transition-all mt-4"
                >
                  Create Targeted Offer
                </Button>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 space-y-3 shadow-md border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-widest">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Admin Powers
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  This console allows editing billing limits directly from the DB. You can update user plans, increment credits, or configure user limits.
                </p>
                <div className="text-[10px] text-slate-500 font-bold bg-slate-900 rounded p-2.5 font-mono">
                  Admins: er.prashantyadav37@gmail.com, vista360gtp@gmail.com
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editingProfile !== null} onOpenChange={(open) => !open && setEditingProfile(null)}>
        {editingProfile && (
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-800">
                Modify Subscription Limits
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase">Target Account</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{editingProfile.name || "Unnamed"}</div>
                <div className="text-xs font-mono text-slate-500">{editingProfile.email}</div>
              </div>

              {/* Plan dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Subscription Plan</Label>
                <Select
                  value={profileForm.plan}
                  onValueChange={(val) => setProfileForm((prev) => ({ ...prev, plan: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Credits input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Available Credits</Label>
                <Input
                  type="number"
                  value={profileForm.credits}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, credits: Number(e.target.value) }))}
                  className="rounded-xl border-slate-200"
                />
              </div>

              {/* Tours limit / used counter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Billing Cycle Tours Used</Label>
                <Input
                  type="number"
                  value={profileForm.billing_cycle_tours_used}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, billing_cycle_tours_used: Number(e.target.value) }))}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingProfile(null)}
                className="rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile}
                className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl px-5"
              >
                Save Limits
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AppShell>
  );
}

// Stats Card helper component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  accent 
}: { 
  icon: React.ElementType; 
  label: string; 
  value?: string | number; 
  subtext: string;
  accent?: "success" | "warning" 
}) {
  const accentCls = 
    accent === "success" 
      ? "bg-green-50 text-green-600" 
      : accent === "warning" 
      ? "bg-amber-50 text-amber-600" 
      : "bg-blue-50 text-[#0277bd]";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${accentCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">
          {label}
        </div>
        {value === undefined ? (
          <Skeleton className="h-8 w-16 mt-1 rounded-lg" />
        ) : (
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {value}
          </div>
        )}
      </div>
      <div className="text-[10px] text-slate-400 font-semibold mt-3">
        {subtext}
      </div>
    </div>
  );
}
