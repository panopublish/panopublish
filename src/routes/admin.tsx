import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  adminAddUser,
  adminDeleteUser,
  adminImpersonateUser,
  adminCleanOrphanedStorage,
  adminSendMarketingEmail,
} from "@/lib/d1-server";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Ticket,
  LogIn,
  HardDrive,
  Loader2,
  Mail,
  Send,
  Eye,
  Monitor,
  Smartphone,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateIN } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — PanoPublish" },
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
  const { session, user, loading: authLoading, startImpersonation } = useAuth();
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
  const [activeTab, setActiveTab] = useState<"users" | "subscriptions" | "coupons" | "broadcast">("users");

  // Broadcast / Marketing Email State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [broadcastSearchTerm, setBroadcastSearchTerm] = useState("");
  const [broadcastPlanFilter, setBroadcastPlanFilter] = useState("all");
  const [broadcastForm, setBroadcastForm] = useState({
    subject: "Special Update from PanoPublish: New Virtual Tour Features & Offers",
    headline: "Supercharge Your 360° Tours on Google Street View",
    bodyText: `Hi {{name}},\n\nWe are excited to share some powerful new enhancements on PanoPublish!\n\nWhether you are publishing panoramas for local businesses, real estate, or automotive clients, you can now customize, connect, and publish high-resolution Google Street View tours faster than ever.\n\nLog in today to explore new features, check your tour stats, or claim special offers waiting in your account.`,
    ctaText: "Open PanoPublish Dashboard",
    ctaUrl: "https://panopublish.com/dashboard",
    fromName: "PanoPublish",
    fromEmail: "noreply@panopublish.com",
  });
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    totalSent: number;
    totalFailed: number;
    failedEmails: { email: string; reason: string }[];
  } | null>(null);

  // Impersonation State
  const [impersonateTarget, setImpersonateTarget] = useState<Profile | null>(null);
  const [impersonating, setImpersonating] = useState(false);

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

  const [couponType, setCouponType] = useState<"specific" | "generic">("specific");

  // Form State: Add User Modal
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    email: "",
    password: "",
    name: "",
    companyName: "",
    plan: "trial",
  });

  // Storage Cleanup State
  const [cleaningStorage, setCleaningStorage] = useState(false);
  const [storageCleanResult, setStorageCleanResult] = useState<{
    scannedCount: number;
    deletedCount: number;
    deletedBytes: number;
    deletedMb: string;
  } | null>(null);

  const handleCleanStorage = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to scan and purge all orphaned storage files from Cloudflare R2? This will delete files from tours or users that no longer exist in the database, freeing up your storage quota."
    );
    if (!confirmed) return;

    setCleaningStorage(true);
    const tid = toast.loading("Scanning and purging orphaned R2 files...");
    try {
      let token = session?.access_token || "";
      if (!token && typeof window !== "undefined") {
        try {
          const s = JSON.parse(localStorage.getItem("panopublish_session") || "{}");
          token = s?.access_token || "";
        } catch {}
      }

      if (!token) {
        throw new Error("No active session found. Please log in again.");
      }

      const res = await adminCleanOrphanedStorage({ data: { token } });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setStorageCleanResult(res.data);
      toast.success(
        `Cleaned ${res.data.deletedCount} orphaned files (${res.data.deletedMb} MB freed)!`,
        { id: tid }
      );
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to clean storage: " + err.message, { id: tid });
    } finally {
      setCleaningStorage(false);
    }
  };

  // Verify Admin Access
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({ to: "/login/" });
      } else if (user.email !== "vista360gtp@gmail.com" && user.email !== "er.prashantyadav37@gmail.com") {
        toast.error("Access denied. Admin access only.");
        navigate({ to: "/dashboard/" });
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

      const profs = (profRes.data as Profile[]) ?? [];
      setProfiles(profs);
      // Auto-select all users with valid email for broadcast
      setSelectedUserIds((prev) => {
        if (prev.length === 0) {
          return profs.filter((p) => p.email && p.email.includes("@")).map((p) => p.id);
        }
        return prev;
      });
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
    if (
      user &&
      (user.email === "vista360gtp@gmail.com" || user.email === "er.prashantyadav37@gmail.com")
    ) {
      loadData();
    }
  }, [user]);

  // Broadcast Preset Templates
  const handleApplyPreset = (preset: "features" | "promo" | "tips") => {
    if (preset === "features") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "New on PanoPublish: Faster Google Street View Publishing & Tools",
        headline: "Create and Publish 360° Tours Faster than Ever",
        bodyText: `Hi {{name}},\n\nWe're excited to announce major performance updates and new features on PanoPublish!\n\nYou can now customize panorama connections, optimize Street View blue lines, and organize virtual tours with increased speed and reliability.\n\nLog in to your account today to test the new features on your existing tours or upload a new 360° panorama.`,
        ctaText: "Explore New Features",
        ctaUrl: "https://panopublish.com/dashboard",
      }));
      toast.success("Applied 'Feature Update' template");
    } else if (preset === "promo") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "Exclusive 30% Off Upgrade on PanoPublish",
        headline: "Unlock Unlimited Google Street View Publishing",
        bodyText: `Hi {{name}},\n\nAs one of our early creators, we'd love to offer you an exclusive discount to upgrade your PanoPublish account.\n\nUpgrade your plan today and receive 30% off your subscription. Enjoy higher panorama limits, client white-labeling, and priority Google Street View synchronization.\n\nClaim your savings now before this limited-time creator offer expires.`,
        ctaText: "Claim 30% Off Upgrade",
        ctaUrl: "https://panopublish.com/pricing",
      }));
      toast.success("Applied '30% Off Promo' template");
    } else if (preset === "tips") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "3 Tips for Higher Visibility on Google Street View",
        headline: "Maximize Impressions for Your Local Clients",
        bodyText: `Hi {{name}},\n\nDid you know businesses with verified Google Street View tours get over 2x more search visits and customer inquiries?\n\nHere are 3 quick tips to make the most of your 360° tours:\n1. Space panorama nodes 3 to 5 meters apart for smooth walkthroughs.\n2. Align north bearings accurately before publishing to Google Maps.\n3. Share interactive tour links directly on client websites and social media.\n\nHead over to your dashboard to inspect your tour impressions and keep creating!`,
        ctaText: "Check Tour Performance",
        ctaUrl: "https://panopublish.com/dashboard",
      }));
      toast.success("Applied '360 Tips' template");
    }
  };

  // Broadcast Recipient Controls
  const handleSelectAllRecipients = () => {
    const allValid = profiles.filter((p) => p.email && p.email.includes("@")).map((p) => p.id);
    setSelectedUserIds(allValid);
    toast.info(`Selected all ${allValid.length} users`);
  };

  const handleDeselectAllRecipients = () => {
    setSelectedUserIds([]);
    toast.info("Cleared all recipients");
  };

  const handleExcludeAdmins = () => {
    const nonAdminIds = profiles
      .filter(
        (p) =>
          p.email &&
          p.email.includes("@") &&
          p.email !== "vista360gtp@gmail.com" &&
          p.email !== "er.prashantyadav37@gmail.com"
      )
      .map((p) => p.id);
    setSelectedUserIds(nonAdminIds);
    toast.info(`Excluded admin accounts (${nonAdminIds.length} users remaining)`);
  };

  const handleToggleRecipient = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleRemoveRecipient = (id: string, nameOrEmail: string) => {
    setSelectedUserIds((prev) => prev.filter((uid) => uid !== id));
    toast.success(`Removed ${nameOrEmail} from broadcast`);
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) {
      toast.error("Admin user email not found");
      return;
    }
    if (!broadcastForm.subject.trim()) {
      toast.error("Please enter an email subject");
      return;
    }

    setSendingTest(true);
    const tid = toast.loading(`Sending test email to ${user.email}...`);

    try {
      let token = session?.access_token || "";
      if (!token && typeof window !== "undefined") {
        try {
          const s = JSON.parse(localStorage.getItem("panopublish_session") || "{}");
          token = s?.access_token || "";
        } catch {}
      }

      const res = await adminSendMarketingEmail({
        data: {
          token,
          recipients: [{ email: user.email, name: user.email.split("@")[0] }],
          subject: `[TEST] ${broadcastForm.subject}`,
          headline: broadcastForm.headline,
          bodyText: broadcastForm.bodyText,
          ctaText: broadcastForm.ctaText,
          ctaUrl: broadcastForm.ctaUrl,
          fromName: broadcastForm.fromName,
          fromEmail: broadcastForm.fromEmail,
        },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      if (res.data?.totalFailed && res.data.totalFailed > 0) {
        const reason = res.data.failedEmails?.[0]?.reason || "Failed to deliver";
        throw new Error(reason);
      }

      toast.success(`Test email delivered to ${user.email}! Please check your inbox.`, { id: tid });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to send test email: " + err.message, { id: tid });
    } finally {
      setSendingTest(false);
    }
  };

  const handleConfirmBroadcastSend = async () => {
    const targetRecipients = profiles
      .filter((p) => selectedUserIds.includes(p.id) && p.email && p.email.includes("@"))
      .map((p) => ({
        email: p.email!,
        name: p.name || p.username || "",
      }));

    if (targetRecipients.length === 0) {
      toast.error("No recipients selected");
      return;
    }

    setSendingBroadcast(true);
    const tid = toast.loading(`Sending broadcast to ${targetRecipients.length} recipients...`);

    try {
      let token = session?.access_token || "";
      if (!token && typeof window !== "undefined") {
        try {
          const s = JSON.parse(localStorage.getItem("panopublish_session") || "{}");
          token = s?.access_token || "";
        } catch {}
      }

      const res = await adminSendMarketingEmail({
        data: {
          token,
          recipients: targetRecipients,
          subject: broadcastForm.subject,
          headline: broadcastForm.headline,
          bodyText: broadcastForm.bodyText,
          ctaText: broadcastForm.ctaText,
          ctaUrl: broadcastForm.ctaUrl,
          fromName: broadcastForm.fromName,
          fromEmail: broadcastForm.fromEmail,
        },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setBroadcastResult(res.data);
      setConfirmSendOpen(false);

      if (res.data?.totalSent > 0) {
        toast.success(
          `Broadcast complete! Sent ${res.data.totalSent} of ${targetRecipients.length} emails.`,
          { id: tid, duration: 6000 }
        );
      } else {
        toast.error(`Broadcast failed: 0 emails delivered.`, { id: tid });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to broadcast email: " + err.message, { id: tid });
    } finally {
      setSendingBroadcast(false);
    }
  };

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
    
    let targetEmail = couponForm.email.trim().toLowerCase();
    if (couponType === "specific") {
      if (!targetEmail) return toast.error("Target email is required");
    } else {
      targetEmail = "*"; // generic
    }

    const expiresAt = couponForm.expiresInDays
      ? new Date(Date.now() + couponForm.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      const { error } = await supabase.from("coupons").insert({
        code: couponForm.code.trim().toUpperCase(),
        email: targetEmail,
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

  // Add User handler
  const handleAddUser = async () => {
    if (!addUserForm.email.trim()) return toast.error("Email is required");
    if (!addUserForm.password.trim()) return toast.error("Password is required");

    try {
      const res = await adminAddUser({
        data: {
          token: session?.access_token || "",
          email: addUserForm.email.trim().toLowerCase(),
          password: addUserForm.password.trim(),
          name: addUserForm.name.trim(),
          companyName: addUserForm.companyName.trim(),
          plan: addUserForm.plan,
        },
      });

      if (res?.error) {
        toast.error("Failed to add user: " + res.error.message);
      } else {
        toast.success("User added successfully!");
        setAddUserOpen(false);
        setAddUserForm({
          email: "",
          password: "",
          name: "",
          companyName: "",
          plan: "trial",
        });
        loadData();
      }
    } catch (err: any) {
      toast.error("Add user error: " + err.message);
    }
  };

  // Delete User handler
  const handleDeleteUser = async (targetUser: Profile) => {
    if (targetUser.id === user?.id) {
      return toast.error("You cannot delete your own admin account.");
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete user "${targetUser.name || targetUser.email}"?\n\nThis will cascade delete all their tours, photos, and clients. This action CANNOT be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await adminDeleteUser({
        data: {
          token: session?.access_token || "",
          userId: targetUser.id,
        },
      });

      if (res?.error) {
        toast.error("Failed to delete user: " + res.error.message);
      } else {
        toast.success("User and all their data deleted successfully.");
        loadData();
      }
    } catch (err: any) {
      toast.error("Delete user error: " + err.message);
    }
  };

  // Impersonate User handler
  const handleConfirmImpersonate = async () => {
    if (!impersonateTarget) return;
    setImpersonating(true);
    try {
      const res = await adminImpersonateUser({
        data: {
          token: session?.access_token || "",
          targetUserId: impersonateTarget.id,
        },
      });

      if (res?.error) {
        toast.error("Failed to impersonate user: " + res.error.message);
        setImpersonating(false);
        return;
      }

      if (res?.data?.session) {
        toast.success(`Logged in as ${impersonateTarget.name || impersonateTarget.email}`);
        startImpersonation(res.data.session);
        setImpersonateTarget(null);
        navigate({ to: "/dashboard/" });
      } else {
        toast.error("Failed to establish session for this user");
        setImpersonating(false);
      }
    } catch (err: any) {
      console.error("Impersonate error:", err);
      toast.error("Impersonate error: " + err.message);
      setImpersonating(false);
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

  const planLimits: Record<string, number> = {
    trial: 1,
    basic: 5,
    pro: 20,
    agency: 50,
  };

  // Open Edit Profile Dialog
  const handleOpenEditProfile = (p: Profile) => {
    const isAdminUser =
      p.email === "er.prashantyadav37@gmail.com" || p.email === "vista360gtp@gmail.com";
    const isTrialUser = (p.plan ?? "trial") === "trial";
    const isTrialExpired =
      isTrialUser &&
      ((p.trial_ends_at && new Date(p.trial_ends_at).getTime() < Date.now()) ||
        (p.created_at && Date.now() - new Date(p.created_at).getTime() > 7 * 86400000));
    const isPaidPlanExpired =
      !isTrialUser &&
      !!p.trial_ends_at &&
      new Date(p.trial_ends_at).getTime() < Date.now();
    const isPlanExpired = isTrialExpired || isPaidPlanExpired;

    const cycleUsed = p.billing_cycle_tours_used ?? 0;
    const totalLimit = isAdminUser ? 9999 : isPlanExpired ? 0 : (planLimits[p.plan] ?? 1);
    const totalAllowance = isPlanExpired ? 0 : Math.max(p.credits ?? 0, totalLimit);
    const activeCredits =
      isAdminUser
        ? 9999
        : Math.max(0, totalAllowance - cycleUsed);

    setEditingProfile(p);
    setProfileForm({
      plan: p.plan,
      credits: activeCredits,
      billing_cycle_tours_used: cycleUsed,
    });
  };

  // Save User Profile changes
  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    try {
      const isPaidPlan = profileForm.plan !== "trial";
      const nowIso = new Date().toISOString();
      const periodEndIso = new Date(Date.now() + 30 * 86400000).toISOString();

      const updateData: any = {
        plan: profileForm.plan,
        credits: Number(profileForm.credits),
        billing_cycle_tours_used: Number(profileForm.billing_cycle_tours_used),
      };

      if (
        isPaidPlan &&
        (!editingProfile.trial_ends_at ||
          new Date(editingProfile.trial_ends_at).getTime() < Date.now() ||
          editingProfile.plan === "trial")
      ) {
        updateData.trial_ends_at = periodEndIso;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", editingProfile.id);

      if (error) {
        toast.error("Failed to update profile: " + error.message);
      } else {
        // Record subscription in subscriptions table if plan changed to paid
        if (profileForm.plan !== editingProfile.plan && profileForm.plan !== "trial") {
          const planPrices: Record<string, number> = { basic: 499, pro: 1499, agency: 2999 };
          await supabase
            .from("subscriptions")
            .insert({
              id: crypto.randomUUID(),
              user_id: editingProfile.id,
              plan: profileForm.plan,
              status: "active",
              razorpay_subscription_id: `admin_grant_${editingProfile.id.slice(0, 8)}`,
              start_date: nowIso,
              end_date: periodEndIso,
              amount_inr: planPrices[profileForm.plan] || 0,
            })
            .catch(() => {});
        }

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
  const activeSubs = profiles.filter((p) => p.plan !== "trial").length;

  // Helper to check if a tour is published
  const isTourPublished = (t: any) => {
    if (t.status === "published") return true;
    const tPhotos = photos.filter((p) => p.tour_id === t.id);
    return tPhotos.length > 0 && tPhotos.every((p) => p.streetview_status === "PUBLISHED");
  };

  const totalPublishedTours = tours.filter(isTourPublished).length;

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

  const filteredBroadcastProfiles = profiles.filter((p) => {
    if (!p.email) return false;
    const matchesSearch =
      (p.email || "").toLowerCase().includes(broadcastSearchTerm.toLowerCase()) ||
      (p.name || "").toLowerCase().includes(broadcastSearchTerm.toLowerCase()) ||
      (p.username || "").toLowerCase().includes(broadcastSearchTerm.toLowerCase()) ||
      (p.company_name || "").toLowerCase().includes(broadcastSearchTerm.toLowerCase());
    const matchesPlan = broadcastPlanFilter === "all" || p.plan === broadcastPlanFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <AppShell
      title="Admin Dashboard"
      breadcrumbs={[{ label: "Dashboard", to: "/dashboard/" }, { label: "Admin" }]}
    >
      <SEO
        title="Admin Console"
        description="Administrative console for PanoPublish."
        noIndex={true}
      />
      <div className="bg-[#f8fafc] min-h-[calc(100vh-64px)] pb-12">
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-8">
          {/* Header section */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-[#0277bd]" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Internal Use Only
                </span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                Company Console
              </h1>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setAddUserOpen(true)}
                className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="h-4.5 w-4.5" />
                Add User
              </Button>
              <Button
                onClick={loadData}
                disabled={loading}
                variant="outline"
                className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Premium Dashboard Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              icon={Users}
              label="Total Users"
              value={loading ? undefined : profiles.length}
              subtext="Registered accounts"
            />
            <StatCard
              icon={CreditCard}
              label="Active Subscriptions"
              value={loading ? undefined : activeSubs}
              subtext="Paid plans active"
              accent="success"
            />
            <StatCard
              icon={Map}
              label="Published Tours"
              value={loading ? undefined : `${totalPublishedTours} / ${tours.length}`}
              subtext="Published / Total Tours"
              accent="success"
            />
            <StatCard
              icon={Image}
              label="Photos Uploaded"
              value={loading ? undefined : photos.length}
              subtext="Panorama images"
            />
            <StatCard
              icon={TrendingUp}
              label="Total View Count"
              value={loading ? undefined : totalViews.toLocaleString("en-US")}
              subtext="Maps Impressions"
              accent="warning"
            />
            <StatCard
              icon={Ticket}
              label="Offers/Coupons"
              value={loading ? undefined : coupons.length}
              subtext="Discount codes"
            />
          </div>

          <div
            className={`grid ${
              activeTab === "broadcast" ? "grid-cols-1" : "lg:grid-cols-3"
            } gap-8 items-start`}
          >
            {/* Left Columns: Users, Subscriptions, Coupons Tables, or Broadcast Suite */}
            <div
              className={`${
                activeTab === "broadcast" ? "col-span-1" : "lg:col-span-2"
              } space-y-6`}
            >
              {/* Tab Navigation */}
              <div className="border bg-white rounded-2xl p-1.5 flex flex-wrap gap-2 shadow-sm">
                <button
                  onClick={() => setActiveTab("users")}
                  className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-300 ${
                    activeTab === "users"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Active Users ({loading ? "..." : profiles.length})
                </button>
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-300 ${
                    activeTab === "subscriptions"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Active Subs ({loading ? "..." : subscriptions.length})
                </button>
                <button
                  onClick={() => setActiveTab("coupons")}
                  className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-300 ${
                    activeTab === "coupons"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Coupons ({loading ? "..." : coupons.length})
                </button>
                <button
                  onClick={() => setActiveTab("broadcast")}
                  className={`flex-1 min-w-[140px] py-3 px-3 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === "broadcast"
                      ? "bg-[#0277bd] text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>Marketing Email ({loading ? "..." : selectedUserIds.length})</span>
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
                      <Button
                        onClick={() => {
                          const allValid = profiles
                            .filter((p) => p.email && p.email.includes("@"))
                            .map((p) => p.id);
                          setSelectedUserIds(allValid);
                          setActiveTab("broadcast");
                        }}
                        className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm px-3 py-1.5 h-9 cursor-pointer"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Marketing Email ({profiles.length})
                      </Button>
                      <Filter className="h-4 w-4 text-slate-400" />
                      <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-[130px] bg-white border-slate-200 rounded-xl text-xs font-bold">
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
                    <div className="p-12 text-center text-slate-400">No matching users found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <tr>
                            <th className="p-4 pl-6">User details</th>
                            <th className="p-4">Plan / Limits</th>
                            <th className="p-4">Tours Published</th>
                            <th className="p-4">Joined Date</th>
                            <th className="p-4 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredProfiles.map((p) => {
                            const userTours = tours.filter((t) => t.user_id === p.id);
                            const userPublishedCount = userTours.filter(isTourPublished).length;
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
                                  <div className="font-bold text-slate-800">
                                    {p.name || "Unnamed User"}
                                  </div>
                                  <div
                                    className="text-xs text-slate-400 truncate max-w-[200px]"
                                    title={p.email || ""}
                                  >
                                    {p.email}
                                  </div>
                                  {p.company_name && (
                                    <div className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 inline-block mt-1 font-semibold">
                                      💼 {p.company_name}
                                    </div>
                                  )}
                                </td>

                                <td className="p-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-black border uppercase ${planLabelClass}`}
                                  >
                                    {p.plan}
                                  </span>
                                  {(() => {
                                    const isAdminUser =
                                      p.email === "er.prashantyadav37@gmail.com" ||
                                      p.email === "vista360gtp@gmail.com";
                                    const isTrialUser = (p.plan ?? "trial") === "trial";
                                    const isTrialExpired =
                                      isTrialUser &&
                                      ((p.trial_ends_at && new Date(p.trial_ends_at).getTime() < Date.now()) ||
                                        (p.created_at && Date.now() - new Date(p.created_at).getTime() > 7 * 86400000));
                                    const isPaidPlanExpired =
                                      !isTrialUser &&
                                      !!p.trial_ends_at &&
                                      new Date(p.trial_ends_at).getTime() < Date.now();
                                    const isPlanExpired = isTrialExpired || isPaidPlanExpired;

                                    const totalLimit = isAdminUser ? 9999 : isPlanExpired ? 0 : (planLimits[p.plan] ?? 1);
                                    const totalAllowance = isPlanExpired ? 0 : Math.max(p.credits ?? 0, totalLimit);
                                    const cycleUsed = p.billing_cycle_tours_used ?? 0;
                                    const remainingCredits =
                                      isAdminUser
                                        ? 9999
                                        : Math.max(0, totalAllowance - cycleUsed);
                                    return (
                                      <div className="text-[11px] mt-1.5 font-bold">
                                        {isAdminUser ? (
                                          <span className="text-emerald-600 font-extrabold">Credits: 9999 (Admin)</span>
                                        ) : isPlanExpired ? (
                                          <span className="text-red-500 font-extrabold">Credits: 0 left ({isTrialUser ? "Trial Expired" : "Plan Expired"})</span>
                                        ) : (
                                          <span className="text-slate-500">
                                            Credits:{" "}
                                            <strong
                                              className={
                                                remainingCredits > 0
                                                  ? "text-emerald-600 font-extrabold"
                                                  : "text-red-500 font-extrabold"
                                              }
                                            >
                                              {remainingCredits}
                                            </strong>{" "}
                                            left
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>

                                <td className="p-4">
                                  <div className="font-black text-[#0277bd] text-sm flex items-center gap-1.5">
                                    <span className="bg-blue-50 border border-blue-100 text-[#0277bd] px-2 py-0.5 rounded-md">
                                      {userPublishedCount} published
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                                    Total created: {userTours.length} | Cycle limit used: {p.billing_cycle_tours_used}
                                  </div>
                                </td>

                                <td className="p-4 text-xs text-slate-400">
                                  {formatDateIN(p.created_at)}
                                </td>

                                <td className="p-4 pr-6 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      onClick={() => setImpersonateTarget(p)}
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-amber-50 text-amber-600 hover:text-amber-700 cursor-pointer rounded-xl"
                                      title={`Log in as ${p.name || p.email} (Impersonate)`}
                                    >
                                      <LogIn className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => handleOpenEditProfile(p)}
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-slate-100 text-slate-600 hover:text-slate-800 cursor-pointer rounded-xl"
                                      title="Edit User Limits & Plan"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteUser(p)}
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer rounded-xl"
                                      title="Delete User Account"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
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
                                  <div
                                    className="text-xs text-slate-400 truncate max-w-[200px]"
                                    title={subscriberProfile?.email || ""}
                                  >
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
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                      isActive
                                        ? "bg-green-50 text-green-700 border-green-100"
                                        : "bg-red-50 text-red-700 border-red-100"
                                    }`}
                                  >
                                    {isActive ? (
                                      <CheckCircle className="h-2.5 w-2.5" />
                                    ) : (
                                      <Clock className="h-2.5 w-2.5" />
                                    )}
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
                      No discount coupons created yet. Use the panel on the right to create your
                      first coupon!
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
                            const isExpired = c.expires_at
                              ? new Date(c.expires_at).getTime() < Date.now()
                              : false;

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-4 pl-6">
                                  <div className="font-mono font-black text-[#0277bd] text-sm bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1 inline-block">
                                    {c.code}
                                  </div>
                                </td>

                                <td
                                  className="p-4 text-xs font-semibold text-slate-600 truncate max-w-[150px]"
                                  title={c.email === "*" ? "Any User" : c.email}
                                >
                                  {c.email === "*" ? (
                                    <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase rounded px-2 py-0.5 inline-block">
                                      Generic / Any User
                                    </span>
                                  ) : (
                                    c.email
                                  )}
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

              {/* Tab Content: Marketing Broadcast */}
              {activeTab === "broadcast" && (
                <div className="space-y-6">
                  {/* Broadcast Top Banner / Status Overview */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-[#0f2c42] rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
                    <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-[#0277bd]/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="bg-[#0277bd] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Resend Free Tier
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Throttled (500ms Safe)
                          </span>
                          <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Quota: 100/day &bull; 3,000/mo
                          </span>
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-white">
                          1-Click Marketing Email Broadcast
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                          Deliver product updates, promotional offers, and tips directly to your registered users. Easily select or remove specific recipients before sending.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-center">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipients</div>
                          <div className="text-xl font-black text-white">
                            {selectedUserIds.length} <span className="text-xs text-slate-400 font-medium">/ {profiles.filter((p) => p.email).length}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => setConfirmSendOpen(true)}
                          disabled={selectedUserIds.length === 0 || sendingBroadcast}
                          className="bg-[#38bdf8] hover:bg-[#0284c7] text-slate-950 font-black rounded-xl px-5 py-3 shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                          {sendingBroadcast ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Broadcasting...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>Send to {selectedUserIds.length} Users</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Last Broadcast Result Alert */}
                  {broadcastResult && (
                    <div
                      className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                        broadcastResult.totalSent > 0
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                          : "bg-red-50/80 border-red-200 text-red-900"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 text-sm">
                        {broadcastResult.totalSent > 0 ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold">
                            {broadcastResult.totalSent > 0 ? "Broadcast Successfully Delivered!" : "Broadcast Delivery Failed"}
                          </div>
                          <p className="text-xs mt-0.5 opacity-90">
                            Delivered: <strong>{broadcastResult.totalSent}</strong> &bull; Failed: <strong>{broadcastResult.totalFailed}</strong>
                            {broadcastResult.failedEmails.length > 0 && (
                              <span className="block mt-1 font-mono text-[11px] text-red-700">
                                Errors: {broadcastResult.failedEmails.map((f) => `${f.email} (${f.reason})`).join(", ")}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBroadcastResult(null)}
                        className="text-xs h-7 px-2 hover:bg-black/5 cursor-pointer"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {/* 2-Column Split: Left = Recipient Selection, Right = Email Composer */}
                  <div className="grid lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column (5 cols): Recipient Selector */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-[#0277bd]" />
                              <h3 className="font-bold text-slate-800 text-sm">Select Recipients</h3>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {selectedUserIds.length} of {profiles.filter((p) => p.email).length} users selected
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSelectAllRecipients}
                              className="h-7 px-2 text-[11px] font-bold text-[#0277bd] hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDeselectAllRecipients}
                              className="h-7 px-2 text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              None
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleExcludeAdmins}
                              className="h-7 px-2 text-[11px] font-bold text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            >
                              No Admins
                            </Button>
                          </div>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Search recipient..."
                              value={broadcastSearchTerm}
                              onChange={(e) => setBroadcastSearchTerm(e.target.value)}
                              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-lg"
                            />
                          </div>
                          <Select value={broadcastPlanFilter} onValueChange={setBroadcastPlanFilter}>
                            <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-50 border-slate-200 rounded-lg">
                              <SelectValue placeholder="Plan" />
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

                        {/* Scrollable Recipient List */}
                        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
                          {filteredBroadcastProfiles.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                              No matching recipients found.
                            </div>
                          ) : (
                            filteredBroadcastProfiles.map((p) => {
                              const isSelected = selectedUserIds.includes(p.id);
                              const isAdmin =
                                p.email === "vista360gtp@gmail.com" ||
                                p.email === "er.prashantyadav37@gmail.com";
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                                    isSelected
                                      ? "bg-slate-50/80 hover:bg-slate-100/80"
                                      : "opacity-40 hover:opacity-80 bg-white"
                                  }`}
                                >
                                  <div
                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleToggleRecipient(p.id)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleRecipient(p.id)}
                                      className="cursor-pointer"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-slate-800 truncate">
                                          {p.name || p.username || "User"}
                                        </span>
                                        {isAdmin && (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1 rounded">
                                            Admin
                                          </span>
                                        )}
                                        <span className="text-[9px] uppercase font-bold text-slate-400 border border-slate-200 px-1 rounded">
                                          {p.plan}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 truncate" title={p.email || ""}>
                                        {p.email}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pl-2">
                                    {isSelected ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRecipient(p.id, p.name || p.email || "user")}
                                        className="h-6 w-6 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors"
                                        title="Remove from this email"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRecipient(p.id)}
                                        className="h-6 px-2 rounded-md bg-blue-50 text-[#0277bd] hover:bg-blue-100 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <Plus className="h-3 w-3" /> Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (7 cols): Email Composer */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                              Email Composer
                            </h3>
                            <p className="text-xs text-slate-400">
                              Craft your campaign or start with a pre-written template.
                            </p>
                          </div>

                          {/* Template presets */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 mr-1">Presets:</span>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset("features")}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer transition-colors"
                            >
                              🚀 Features
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset("promo")}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer transition-colors"
                            >
                              🏷️ 30% Promo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset("tips")}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition-colors"
                            >
                              ⭐ 360 Tips
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Sender details */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-500">Sender Name</Label>
                              <Input
                                value={broadcastForm.fromName}
                                onChange={(e) =>
                                  setBroadcastForm((prev) => ({ ...prev, fromName: e.target.value }))
                                }
                                className="bg-slate-50 border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-500">Sender Email</Label>
                              <Input
                                value={broadcastForm.fromEmail}
                                onChange={(e) =>
                                  setBroadcastForm((prev) => ({ ...prev, fromEmail: e.target.value }))
                                }
                                className="bg-slate-50 border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                          </div>

                          {/* Subject Line */}
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-500">Subject Line</Label>
                            <Input
                              placeholder="e.g. Special Update from PanoPublish"
                              value={broadcastForm.subject}
                              onChange={(e) =>
                                setBroadcastForm((prev) => ({ ...prev, subject: e.target.value }))
                              }
                              className="bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
                            />
                          </div>

                          {/* Headline */}
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-500">Headline Banner (Optional)</Label>
                            <Input
                              placeholder="e.g. Supercharge Your 360° Tours on Google Street View"
                              value={broadcastForm.headline}
                              onChange={(e) =>
                                setBroadcastForm((prev) => ({ ...prev, headline: e.target.value }))
                              }
                              className="bg-slate-50 border-slate-200 rounded-xl text-xs"
                            />
                          </div>

                          {/* Body */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-slate-500">Message Content</Label>
                              <span className="text-[10px] bg-blue-50 text-[#0277bd] font-bold px-2 py-0.5 rounded-full">
                                Use &#123;&#123;name&#125;&#125; for personalized first name
                              </span>
                            </div>
                            <Textarea
                              rows={6}
                              value={broadcastForm.bodyText}
                              onChange={(e) =>
                                setBroadcastForm((prev) => ({ ...prev, bodyText: e.target.value }))
                              }
                              placeholder="Write your email body here..."
                              className="bg-slate-50 border-slate-200 rounded-xl text-xs leading-relaxed"
                            />
                          </div>

                          {/* CTA Button */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-500">CTA Button Text (Optional)</Label>
                              <Input
                                placeholder="e.g. Open My Dashboard"
                                value={broadcastForm.ctaText}
                                onChange={(e) =>
                                  setBroadcastForm((prev) => ({ ...prev, ctaText: e.target.value }))
                                }
                                className="bg-slate-50 border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-500">CTA Button URL</Label>
                              <Input
                                placeholder="e.g. https://panopublish.com/dashboard"
                                value={broadcastForm.ctaUrl}
                                onChange={(e) =>
                                  setBroadcastForm((prev) => ({ ...prev, ctaUrl: e.target.value }))
                                }
                                className="bg-slate-50 border-slate-200 rounded-xl text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowPreviewModal(true)}
                              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" /> Preview
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendTestEmail}
                              disabled={sendingTest}
                              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                            >
                              {sendingTest ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin text-[#0277bd]" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5 mr-1 text-[#0277bd]" />
                                  Send Test to Me
                                </>
                              )}
                            </Button>
                          </div>

                          <Button
                            type="button"
                            onClick={() => setConfirmSendOpen(true)}
                            disabled={selectedUserIds.length === 0 || sendingBroadcast}
                            className="bg-[#0277bd] hover:bg-[#01579b] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all hover:shadow-lg"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send to {selectedUserIds.length} Recipients (1-Click)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Column: Create Coupon Form Panel & Storage Purge */}
            {activeTab !== "broadcast" && (
              <div className="space-y-6">
                {/* Form Container */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                    <div>
                      <h2 className="text-base font-black text-slate-800">Generate Offer Code</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Targeted Discount System
                      </p>
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
                          onChange={(e) =>
                            setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                          }
                          className="font-mono bg-slate-50 border-slate-200 rounded-xl"
                        />
                        <Button
                          onClick={handleAutoGenerateCode}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs px-4 cursor-pointer"
                        >
                          Auto
                        </Button>
                      </div>
                    </div>

                    {/* Coupon Type Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500">Coupon Type</Label>
                      <Select
                        value={couponType}
                        onValueChange={(val: "specific" | "generic") => setCouponType(val)}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="specific">User Specific</SelectItem>
                          <SelectItem value="generic">Generic (Any User)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Targeted Email */}
                    {couponType === "specific" && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <Label className="text-xs font-bold text-slate-500">Target User Email</Label>
                        <Input
                          placeholder="e.g. user@gmail.com"
                          value={couponForm.email}
                          type="email"
                          onChange={(e) =>
                            setCouponForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="bg-slate-50 border-slate-200 rounded-xl"
                        />
                      </div>
                    )}

                    {/* Discount percentage */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Discount (%)</Label>
                        <Select
                          value={String(couponForm.discountPercent)}
                          onValueChange={(val) =>
                            setCouponForm((prev) => ({ ...prev, discountPercent: Number(val) }))
                          }
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
                        onValueChange={(val) =>
                          setCouponForm((prev) => ({ ...prev, expiresInDays: Number(val) }))
                        }
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
                    className="w-full bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl shadow-md py-3 transition-all mt-4 cursor-pointer"
                  >
                    Create Targeted Offer
                  </Button>
                </div>

                {/* Cloudflare R2 Storage Management Box */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Cloudflare R2 Storage</h3>
                        <p className="text-[11px] text-slate-400">10 GB Free Tier Optimizer</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Auto-Clean
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Scan Cloudflare R2 storage and automatically purge orphaned image files left behind from previously deleted tours or removed users.
                  </p>

                  {storageCleanResult && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex justify-between font-medium text-slate-600">
                        <span>Objects Scanned:</span>
                        <span className="font-bold text-slate-800">{storageCleanResult.scannedCount}</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-600">
                        <span>Orphaned Purged:</span>
                        <span className="font-bold text-amber-600">{storageCleanResult.deletedCount} files</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-600">
                        <span>Space Reclaimed:</span>
                        <span className="font-bold text-emerald-600">{storageCleanResult.deletedMb} MB</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCleanStorage}
                    disabled={cleaningStorage}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl py-3 shadow-sm flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    {cleaningStorage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        Scanning & Purging R2 Storage...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Purge Orphaned R2 Storage (1-Click)
                      </>
                    )}
                  </Button>
                </div>

                {/* Instructions Box */}
                <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 space-y-3 shadow-md border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-widest">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    Admin Powers
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">
                    This console allows editing billing limits directly from the DB. You can update
                    user plans, increment credits, or configure user limits.
                  </p>
                  <div className="text-[10px] text-slate-500 font-bold bg-slate-900 rounded p-2.5 font-mono">
                    Admins: vista360gtp@gmail.com, er.prashantyadav37@gmail.com
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog
        open={editingProfile !== null}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      >
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
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {editingProfile.name || "Unnamed"}
                </div>
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
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, credits: Number(e.target.value) }))
                  }
                  className="rounded-xl border-slate-200"
                />
              </div>

              {/* Tours limit / used counter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Billing Cycle Tours Used</Label>
                <Input
                  type="number"
                  value={profileForm.billing_cycle_tours_used}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      billing_cycle_tours_used: Number(e.target.value),
                    }))
                  }
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

      {/* Add User Dialog */}
      <Dialog
        open={addUserOpen}
        onOpenChange={(open) => !open && setAddUserOpen(false)}
      >
        <DialogContent className="rounded-2xl max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800">
              Create New User Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Full Name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={addUserForm.name}
                onChange={(e) =>
                  setAddUserForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Email Address</Label>
              <Input
                type="email"
                placeholder="e.g. user@gmail.com"
                value={addUserForm.email}
                onChange={(e) =>
                  setAddUserForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Password</Label>
              <Input
                type="password"
                placeholder="Secure password"
                value={addUserForm.password}
                onChange={(e) =>
                  setAddUserForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Company Name</Label>
              <Input
                placeholder="e.g. Vista360"
                value={addUserForm.companyName}
                onChange={(e) =>
                  setAddUserForm((prev) => ({ ...prev, companyName: e.target.value }))
                }
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Plan selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Initial Plan</Label>
              <Select
                value={addUserForm.plan}
                onValueChange={(val) => setAddUserForm((prev) => ({ ...prev, plan: val }))}
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
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddUserOpen(false)}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl px-5"
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate User Confirmation Dialog */}
      <Dialog
        open={!!impersonateTarget}
        onOpenChange={(open) => !open && !impersonating && setImpersonateTarget(null)}
      >
        {impersonateTarget && (
          <DialogContent className="rounded-2xl max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <LogIn className="h-5 w-5" />
                </span>
                Log in as User
              </DialogTitle>
            </DialogHeader>

            <div className="py-3 space-y-3 text-sm">
              <p className="text-slate-600">
                You are about to sign into PanoPublish as{" "}
                <strong className="text-slate-900 font-bold">{impersonateTarget.name || impersonateTarget.email}</strong>.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">User Email:</span>
                  <span className="font-bold text-slate-800">{impersonateTarget.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Account Plan:</span>
                  <span className="font-bold uppercase text-slate-800">{impersonateTarget.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">User ID:</span>
                  <span className="font-mono text-[11px] text-slate-500">{impersonateTarget.id}</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-3 text-xs text-amber-800 flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <span>
                  You will be able to create and edit tours, manage clients, and configure settings directly in their account. You can return to the Admin Panel anytime using the top banner button.
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setImpersonateTarget(null)}
                disabled={impersonating}
                className="rounded-xl border-slate-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImpersonate}
                disabled={impersonating}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl px-5 flex items-center gap-2 cursor-pointer"
              >
                {impersonating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Switching Account...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Log in as {impersonateTarget.name ? impersonateTarget.name.split(" ")[0] : "User"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Broadcast Confirmation Modal */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#0277bd]" />
              Confirm 1-Click Broadcast
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Recipients:</span>
                <span className="font-bold text-slate-800">{selectedUserIds.length} users</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Sender:</span>
                <span className="font-bold text-slate-800">
                  {broadcastForm.fromName} &lt;{broadcastForm.fromEmail}&gt;
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Subject:</span>
                <span
                  className="font-bold text-slate-800 truncate max-w-[200px]"
                  title={broadcastForm.subject}
                >
                  {broadcastForm.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Estimated Time:</span>
                <span className="font-bold text-emerald-600">
                  ~{Math.max(1, Math.round(selectedUserIds.length * 0.5))}s (500ms safety throttle)
                </span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-600 mb-1.5">Sample Recipients Included:</div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {profiles
                  .filter((p) => selectedUserIds.includes(p.id))
                  .slice(0, 8)
                  .map((p) => (
                    <span
                      key={p.id}
                      className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    >
                      {p.email}
                    </span>
                  ))}
                {selectedUserIds.length > 8 && (
                  <span className="text-[10px] text-slate-400 font-bold px-1 self-center">
                    +{selectedUserIds.length - 8} more
                  </span>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-3 text-blue-900 leading-relaxed">
              💡 <strong>Resend Free Tier Safety:</strong> Emails will be delivered sequentially with 500ms intervals to guarantee zero rate-limiting errors.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmSendOpen(false)}
              disabled={sendingBroadcast}
              className="rounded-xl border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBroadcastSend}
              disabled={sendingBroadcast}
              className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl px-5 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {sendingBroadcast ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Broadcast...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Broadcast Now</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Email Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                <Eye className="h-4.5 w-4.5 text-[#0277bd]" />
                Live Email Preview
              </DialogTitle>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === "desktop"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === "mobile"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 bg-slate-100 rounded-xl p-4 flex justify-center">
            <div
              className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${
                previewMode === "desktop" ? "w-[560px]" : "w-[340px]"
              }`}
            >
              {/* Email Mockup Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white">
                <div className="font-black text-lg">
                  Pano<span className="text-sky-400">Publish</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Virtual Tours for Google Street View
                </div>
              </div>

              {/* Email Mockup Content */}
              <div className="p-6 space-y-4">
                {broadcastForm.headline && (
                  <h2 className="text-lg font-black text-slate-900 leading-snug">
                    {broadcastForm.headline.replace(/\{\{name\}\}/gi, "Alex")}
                  </h2>
                )}

                <div className="text-xs text-slate-700 leading-relaxed space-y-3">
                  {broadcastForm.bodyText
                    .replace(/\{\{name\}\}/gi, "Alex")
                    .split(/\n\s*\n/)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>

                {broadcastForm.ctaText && (
                  <div className="text-center pt-3 pb-2">
                    <span className="inline-block bg-[#0277bd] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
                      {broadcastForm.ctaText}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Best regards,<br />
                  <strong className="text-slate-800">The PanoPublish Team</strong><br />
                  panopublish.com
                </div>
              </div>

              {/* Email Mockup Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-normal">
                You received this update because you are a registered user of PanoPublish.<br />
                To unsubscribe, reply with "Unsubscribe".
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowPreviewModal(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
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
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number;
  subtext: string;
  accent?: "success" | "warning";
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
        <div
          className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${accentCls}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">
          {label}
        </div>
        {value === undefined ? (
          <Skeleton className="h-8 w-16 mt-1 rounded-lg" />
        ) : (
          <div className="text-2xl font-black text-slate-800 tracking-tight">{value}</div>
        )}
      </div>
      <div className="text-[10px] text-slate-400 font-semibold mt-3">{subtext}</div>
    </div>
  );
}
