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
  adminPurgeUserTourStorage,
  adminSendMarketingEmail,
  adminEnsureReferralTables,
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
  Gift,
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
  Database,
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
  Radio,
  Activity,
  Target,
  Zap,
  Building2,
  AtSign,
  FileSpreadsheet,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateIN } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { formatEmailMarkdownToHtml, parseInlineMarkdown } from "@/lib/email-formatter";

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
  last_seen_at?: string | null;
  last_active_path?: string | null;
  last_active_device?: string | null;
  referral_code?: string | null;
  payout_upi_id?: string | null;
  payout_account_name?: string | null;
  payout_bank_account?: string | null;
  payout_ifsc?: string | null;
  created_at: string;
};

type ActivityStatus = "online" | "idle" | "recent" | "offline";

function parseLastSeen(lastSeenAt: string | null | undefined): {
  status: ActivityStatus;
  label: string;
  diffMins: number;
} {
  if (!lastSeenAt) {
    return { status: "offline", label: "Never", diffMins: Infinity };
  }
  const isoStr =
    lastSeenAt.includes("Z") || lastSeenAt.includes("+")
      ? lastSeenAt
      : lastSeenAt.replace(" ", "T") + "Z";
  const time = new Date(isoStr).getTime();
  if (isNaN(time)) {
    return { status: "offline", label: "Never", diffMins: Infinity };
  }
  const diffMs = Math.max(0, Date.now() - time);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 3) {
    return { status: "online", label: "Online Now", diffMins };
  }
  if (diffMins < 15) {
    return { status: "idle", label: `Idle (${diffMins}m ago)`, diffMins };
  }
  if (diffMins < 60) {
    return { status: "recent", label: `${diffMins}m ago`, diffMins };
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return { status: "offline", label: `${diffHours}h ago`, diffMins };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { status: "offline", label: `${diffDays}d ago`, diffMins };
}

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

type ReferralCode = {
  id: string;
  user_id: string;
  code: string;
  commission_percent: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

type ReferralAttribution = {
  id: string;
  referred_user_id: string;
  referrer_user_id: string;
  referral_code_id: string | null;
  attributed_code: string;
  created_at: string;
};

type ReferralCommission = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  payment_source: string;
  payment_reference_id: string;
  plan_name: string | null;
  payment_amount_inr: number;
  commission_percent: number;
  commission_amount_inr: number;
  status: "pending" | "approved" | "paid" | "void";
  payout_id: string | null;
  created_at: string;
};

type ReferralPayout = {
  id: string;
  referrer_user_id: string;
  amount_inr: number;
  payout_method: string;
  payout_address: string;
  transaction_reference: string;
  processed_by: string;
  notes: string | null;
  paid_at: string;
};

function AdminDashboard() {
  const { session, user, loading: authLoading, startImpersonation, impersonatorSession } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [referralAttributions, setReferralAttributions] = useState<ReferralAttribution[]>([]);
  const [referralCommissions, setReferralCommissions] = useState<ReferralCommission[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<ReferralPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Referral Program Admin Form States
  const [refForm, setRefForm] = useState({
    userId: "",
    code: "",
    commissionPercent: 25,
    notes: "",
  });
  const [creatingRefCode, setCreatingRefCode] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedPayoutReferrer, setSelectedPayoutReferrer] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState({
    amount: 0,
    method: "upi",
    address: "",
    reference: "",
    notes: "",
  });
  const [processingPayout, setProcessingPayout] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "online" | "idle" | "today" | "offline">("all");
  const [sortBy, setSortBy] = useState<"online_first" | "newest">("online_first");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "subscriptions" | "coupons" | "referrals" | "broadcast">("users");

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
  // Email Marketing Audience Mode & Cold Outreach State
  type ColdRecipient = {
    id: string;
    email: string;
    name?: string;
    company?: string;
  };

  const [emailAudienceMode, setEmailAudienceMode] = useState<"users" | "cold">("cold");
  const [coldRecipients, setColdRecipients] = useState<ColdRecipient[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("panopublish_cold_recipients");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: "sample-1",
        email: "contact@grandpalacehotel.com",
        name: "Grand Palace Hotel",
        company: "Hospitality & Suites",
      },
    ];
  });
  const [coldInputEmail, setColdInputEmail] = useState("");
  const [coldInputName, setColdInputName] = useState("");
  const [coldInputCompany, setColdInputCompany] = useState("");
  const [directSendingCold, setDirectSendingCold] = useState(false);
  const [showBulkColdModal, setShowBulkColdModal] = useState(false);
  const [bulkColdText, setBulkColdText] = useState("");

  const [broadcastResult, setBroadcastResult] = useState<{
    totalSent: number;
    totalFailed: number;
    failedEmails: { email: string; reason: string }[];
  } | null>(null);

  // Impersonation State
  const [impersonateTarget, setImpersonateTarget] = useState<Profile | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  // Storage Purge State
  const [purgeTarget, setPurgeTarget] = useState<Profile | null>(null);
  const [purging, setPurging] = useState(false);

  // Modal / Form State: Edit Profile
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({
    plan: "trial",
    extraCredits: 0,
    billingCycleToursUsed: 0,
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
      } else if (
        !impersonatorSession &&
        user.email !== "vista360gtp@gmail.com" &&
        user.email !== "er.prashantyadav37@gmail.com"
      ) {
        toast.error("Access denied. Admin access only.");
        navigate({ to: "/dashboard/" });
      }
    }
  }, [user, authLoading, navigate, impersonatorSession]);

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const token = session?.access_token || "";
      if (token) {
        await adminEnsureReferralTables({ data: { token } }).catch(() => {});
      }
      const [profRes, subRes, tourRes, photoRes, clientRes, couponRes, refCodeRes, refAttrRes, refCommRes, refPayRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("tours").select("*").order("created_at", { ascending: false }),
        supabase.from("photos").select("id,tour_id,view_count,streetview_status"),
        supabase.from("clients").select("id"),
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("referral_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("referral_attributions").select("*").order("created_at", { ascending: false }),
        supabase.from("referral_commissions").select("*").order("created_at", { ascending: false }),
        supabase.from("referral_payouts").select("*").order("paid_at", { ascending: false }),
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
      setReferralCodes((refCodeRes.data as ReferralCode[]) ?? []);
      setReferralAttributions((refAttrRes.data as ReferralAttribution[]) ?? []);
      setReferralCommissions((refCommRes.data as ReferralCommission[]) ?? []);
      setReferralPayouts((refPayRes.data as ReferralPayout[]) ?? []);
    } catch (e: any) {
      console.error("Failed to load admin dashboard data:", e);
      if (showSpinner) toast.error("Error loading dashboard data: " + e.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 25000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (
      user &&
      (user.email === "vista360gtp@gmail.com" || user.email === "er.prashantyadav37@gmail.com")
    ) {
      loadData();
    }
  }, [user]);

  // Save cold recipients to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("panopublish_cold_recipients", JSON.stringify(coldRecipients));
      } catch {}
    }
  }, [coldRecipients]);

  // Broadcast & Cold Outreach Preset Templates
  const handleApplyPreset = (
    preset: "features" | "promo" | "tips" | "cold_hotel" | "cold_retail" | "cold_realestate" | "cold_quick"
  ) => {
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
    } else if (preset === "cold_hotel") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "360° Google Street View Virtual Tour for {{name}}",
        headline: "Help Guests Step Inside Before They Book",
        bodyText: `Hi {{name}},\n\nI was reviewing your Google Maps listing and noticed you could attract significantly more guests with an official 360° Google Street View virtual walkthrough.\n\nOver 67% of travelers want a virtual tour before booking hotels, resorts, or event spaces. A verified Google walkthrough lets prospective guests step inside your lobby, premium suites, restaurant, and banquet halls directly from Google Search.\n\nWe provide professional 360° HDR photography with direct Google Maps publishing and no recurring monthly hosting fees.\n\nWould you be open to a quick 5-minute call or seeing a sample demo tour we created for a similar business?`,
        ctaText: "View Sample Virtual Tour",
        ctaUrl: "https://panopublish.com",
      }));
      toast.success("Applied 'Hotel & Resort Pitch' template");
    } else if (preset === "cold_retail") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "Bring more in-store customers to {{name}} from Google Search",
        headline: "Interactive 360° Walkthrough on Google Maps",
        bodyText: `Hi {{name}},\n\nWhen customers in your area search for businesses like yours on Google, their decision is often driven by photos and ambiance.\n\nWith an interactive 360° Google Street View walkthrough, customers can virtually tour your store, explore aisles, and preview your showroom floor straight from Google Maps.\n\nBusinesses with virtual tours receive up to 2x more footfall and customer inquiries. We handle complete photography, panorama alignment, and instant Google Maps publishing.\n\nCan I send you a 60-second preview of what this looks like on Google Maps?`,
        ctaText: "See Live Demo on Google Maps",
        ctaUrl: "https://panopublish.com",
      }));
      toast.success("Applied 'Retail & Showroom' template");
    } else if (preset === "cold_realestate") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "Interactive 360° Virtual Walkthrough for {{name}}",
        headline: "Close Real Estate Deals Faster with 360° Walkthroughs",
        bodyText: `Hi {{name}},\n\nHelp prospective buyers and tenants explore properties 24/7 without waiting for a physical site visit.\n\nOur immersive 360° virtual tours offer ultra-smooth walkthrough transitions, custom floorplans, and seamless integration onto your website, Google Maps, and WhatsApp brochures.\n\nSave hours of travel time and focus your efforts on qualified, high-intent buyers.\n\nWould you like to see a demo tour created for recent residential and commercial projects?`,
        ctaText: "Explore Sample Tours",
        ctaUrl: "https://panopublish.com",
      }));
      toast.success("Applied 'Real Estate Virtual Tour' template");
    } else if (preset === "cold_quick") {
      setBroadcastForm((prev) => ({
        ...prev,
        subject: "Quick question regarding Google Street View tour for {{name}}",
        headline: "Stand Out on Google Maps & Local Search",
        bodyText: `Hi {{name}},\n\nAre you looking to boost customer foot traffic to your business this month?\n\nWe specialize in setting up official high-definition 360° Google Street View virtual tours that appear directly on Google Search and Maps.\n\nIt takes under 45 minutes on-site and remains permanently on your Google profile with zero recurring subscription fees.\n\nReply to this email if you'd like to see sample tours and package pricing for your location.`,
        ctaText: "Check Portfolio & Pricing",
        ctaUrl: "https://panopublish.com/pricing",
      }));
      toast.success("Applied 'Quick Cold Pitch' template");
    }
  };

  // Cold Outreach Recipient Handlers
  const handleAddColdClient = () => {
    const email = coldInputEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Please enter a client email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address (e.g. contact@business.com)");
      return;
    }
    if (coldRecipients.some((c) => c.email.toLowerCase() === email)) {
      toast.error("This email is already in your cold recipients list");
      return;
    }

    const newRecipient: ColdRecipient = {
      id: crypto.randomUUID(),
      email,
      name: coldInputName.trim() || undefined,
      company: coldInputCompany.trim() || undefined,
    };

    setColdRecipients((prev) => [newRecipient, ...prev]);
    setColdInputEmail("");
    setColdInputName("");
    setColdInputCompany("");
    toast.success(`Added ${email} to cold outreach`);
  };

  const handleRemoveColdRecipient = (id: string, email: string) => {
    setColdRecipients((prev) => prev.filter((c) => c.id !== id));
    toast.success(`Removed ${email} from list`);
  };

  const handleClearAllColdRecipients = () => {
    if (coldRecipients.length === 0) return;
    setColdRecipients([]);
    toast.info("Cleared all cold recipients");
  };

  const handleLoadSampleColdLeads = () => {
    const samples: ColdRecipient[] = [
      {
        id: crypto.randomUUID(),
        email: "reservations@grandpalaceresort.com",
        name: "Grand Palace Resort",
        company: "Luxury Hospitality",
      },
      {
        id: crypto.randomUUID(),
        email: "sales@apexmotors-dealership.com",
        name: "Apex Motors Showroom",
        company: "Automotive",
      },
      {
        id: crypto.randomUUID(),
        email: "leasing@skylinetowerrealty.com",
        name: "Skyline Tower",
        company: "Commercial Real Estate",
      },
    ];
    setColdRecipients(samples);
    toast.success("Loaded 3 demo cold leads for testing");
  };

  const handleProcessBulkColdClients = () => {
    if (!bulkColdText.trim()) {
      toast.error("Please paste email addresses");
      return;
    }

    const lines = bulkColdText.split(/[\r\n,;]+/);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const newItems: ColdRecipient[] = [];
    const existingEmails = new Set(coldRecipients.map((c) => c.email.toLowerCase()));

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const match = line.match(emailRegex);
      if (match) {
        const email = match[0].toLowerCase();
        if (!existingEmails.has(email)) {
          existingEmails.add(email);
          let name = line.replace(email, "").replace(/[<>()"']/g, "").trim();
          if (name.startsWith("-") || name.startsWith(",")) name = name.slice(1).trim();
          newItems.push({
            id: crypto.randomUUID(),
            email,
            name: name || undefined,
          });
        }
      }
    }

    if (newItems.length === 0) {
      toast.info("No new valid email addresses found");
      return;
    }

    setColdRecipients((prev) => [...newItems, ...prev]);
    setBulkColdText("");
    setShowBulkColdModal(false);
    toast.success(`Added ${newItems.length} cold client email(s)`);
  };

  const handleDirectSendSingleCold = async () => {
    const email = coldInputEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Please enter a client email address first");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!broadcastForm.subject.trim()) {
      toast.error("Please enter an email subject");
      return;
    }

    const name = coldInputName.trim() || coldInputCompany.trim() || "";
    setDirectSendingCold(true);
    const tid = toast.loading(`Sending cold pitch email to ${email}...`);

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
          recipients: [{ email, name }],
          subject: broadcastForm.subject,
          headline: broadcastForm.headline,
          bodyText: broadcastForm.bodyText,
          ctaText: broadcastForm.ctaText,
          ctaUrl: broadcastForm.ctaUrl,
          fromName: broadcastForm.fromName,
          fromEmail: broadcastForm.fromEmail,
          isColdOutreach: true,
        },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      if (res.data?.totalFailed && res.data.totalFailed > 0) {
        const reason = res.data.failedEmails?.[0]?.reason || "Failed to deliver";
        throw new Error(reason);
      }

      if (!coldRecipients.some((c) => c.email.toLowerCase() === email)) {
        setColdRecipients((prev) => [
          {
            id: crypto.randomUUID(),
            email,
            name: name || undefined,
            company: coldInputCompany.trim() || undefined,
          },
          ...prev,
        ]);
      }

      setBroadcastResult(res.data);
      setColdInputEmail("");
      setColdInputName("");
      setColdInputCompany("");
      toast.success(`Cold pitch email delivered to ${email}!`, { id: tid });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to send cold email: " + err.message, { id: tid });
    } finally {
      setDirectSendingCold(false);
    }
  };

  // Rich Text Formatting Helper for Email Body
  const handleInsertFormatting = (type: "bold" | "italic" | "h2" | "bullet" | "number" | "link" | "name") => {
    const textarea = document.getElementById("email-body-textarea") as HTMLTextAreaElement | null;
    const current = broadcastForm.bodyText || "";
    let start = current.length;
    let end = current.length;

    if (textarea) {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
    }

    const selected = current.substring(start, end);
    const before = current.substring(0, start);
    const after = current.substring(end);
    let replacement = "";
    let newCursorPos = start;

    switch (type) {
      case "bold":
        replacement = `**${selected || "bold text"}**`;
        newCursorPos = selected ? start + replacement.length : start + 2;
        break;
      case "italic":
        replacement = `*${selected || "italic text"}*`;
        newCursorPos = selected ? start + replacement.length : start + 1;
        break;
      case "h2": {
        const prefix = before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
        replacement = `${prefix}## ${selected || "Section Heading"}\n\n`;
        newCursorPos = start + replacement.length;
        break;
      }
      case "bullet": {
        const bPrefix = before.endsWith("\n") || before === "" ? "" : "\n";
        replacement = `${bPrefix}- ${selected || "List item"}\n`;
        newCursorPos = start + replacement.length;
        break;
      }
      case "number": {
        const nPrefix = before.endsWith("\n") || before === "" ? "" : "\n";
        replacement = `${nPrefix}1. ${selected || "List item"}\n`;
        newCursorPos = start + replacement.length;
        break;
      }
      case "link":
        replacement = `[${selected || "Link text"}](https://panopublish.com)`;
        newCursorPos = start + replacement.length;
        break;
      case "name":
        replacement = "{{name}}";
        newCursorPos = start + replacement.length;
        break;
    }

    const nextText = before + replacement + after;
    setBroadcastForm((prev) => ({ ...prev, bodyText: nextText }));

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  // Broadcast Recipient Controls (Registered Users)
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

      const isCold = emailAudienceMode === "cold";
      const sampleName = isCold ? (coldRecipients[0]?.name || "Grand Palace Hotel") : user.email.split("@")[0];

      const res = await adminSendMarketingEmail({
        data: {
          token,
          recipients: [{ email: user.email, name: sampleName }],
          subject: `[TEST] ${broadcastForm.subject}`,
          headline: broadcastForm.headline,
          bodyText: broadcastForm.bodyText,
          ctaText: broadcastForm.ctaText,
          ctaUrl: broadcastForm.ctaUrl,
          fromName: broadcastForm.fromName,
          fromEmail: broadcastForm.fromEmail,
          isColdOutreach: isCold,
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
    const isCold = emailAudienceMode === "cold";

    const targetRecipients = isCold
      ? coldRecipients.map((c) => ({
          email: c.email,
          name: c.name || c.company || "",
        }))
      : profiles
          .filter((p) => selectedUserIds.includes(p.id) && p.email && p.email.includes("@"))
          .map((p) => ({
            email: p.email!,
            name: p.name || p.username || "",
          }));

    if (targetRecipients.length === 0) {
      toast.error(
        isCold
          ? "No cold client emails found. Please type a client email address first."
          : "No registered users selected"
      );
      return;
    }

    setSendingBroadcast(true);
    const tid = toast.loading(
      `Sending ${isCold ? "cold outreach" : "broadcast"} to ${targetRecipients.length} recipient${targetRecipients.length === 1 ? "" : "s"}...`
    );

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
          isColdOutreach: isCold,
        },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setBroadcastResult(res.data);
      setConfirmSendOpen(false);

      if (res.data?.totalSent > 0) {
        toast.success(
          `${isCold ? "Cold outreach campaign" : "Broadcast"} complete! Sent ${res.data.totalSent} of ${targetRecipients.length} emails.`,
          { id: tid, duration: 6000 }
        );
      } else {
        toast.error(`Delivery failed: 0 emails delivered.`, { id: tid });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to send email: " + err.message, { id: tid });
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

  // Purge User Storage handler
  const handleConfirmPurgeStorage = async () => {
    if (!purgeTarget) return;
    setPurging(true);
    const tid = toast.loading(`Purging images for ${purgeTarget.name || purgeTarget.email}...`);
    try {
      const res = await adminPurgeUserTourStorage({
        data: {
          token: session?.access_token || "",
          targetUserId: purgeTarget.id,
        },
      });

      if (res?.error) {
        toast.error("Failed to purge storage: " + res.error.message, { id: tid });
        setPurging(false);
        return;
      }

      const { deletedFilesCount, deletedMb, toursUpdated } = res.data;
      toast.success(
        `Freed ${deletedMb} MB (${deletedFilesCount} files). Marked ${toursUpdated} tours as archived/cleared.`,
        { id: tid, duration: 6000 }
      );
      setPurgeTarget(null);
      setPurging(false);
      loadData();
    } catch (err: any) {
      console.error("Purge storage error:", err);
      toast.error("Purge error: " + err.message, { id: tid });
      setPurging(false);
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

  // Referral Program Handlers
  const handleCreateReferralCode = async () => {
    if (!refForm.code.trim()) return toast.error("Referral code is required");
    if (!refForm.userId) return toast.error("Please select a user");

    setCreatingRefCode(true);
    try {
      const token = session?.access_token || "";
      if (token) {
        await adminEnsureReferralTables({ data: { token } }).catch(() => {});
      }
      const cleanCode = refForm.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const { error } = await supabase.from("referral_codes").insert({
        id: crypto.randomUUID(),
        user_id: refForm.userId,
        code: cleanCode,
        commission_percent: Number(refForm.commissionPercent) || 25,
        is_active: true,
        notes: refForm.notes.trim() || null,
      });

      if (error) throw error;

      // Update profile referral_code if not set
      await supabase
        .from("profiles")
        .update({ referral_code: cleanCode })
        .eq("id", refForm.userId)
        .is("referral_code", null);

      toast.success(`Referral code "${cleanCode}" created!`);
      setRefForm({ userId: "", code: "", commissionPercent: 25, notes: "" });
      loadData(false);
    } catch (err: any) {
      toast.error("Failed to create referral code: " + err.message);
    } finally {
      setCreatingRefCode(false);
    }
  };

  const handleToggleReferralCode = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("referral_codes")
        .update({ is_active: !current })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Referral code ${!current ? "activated" : "deactivated"}`);
      loadData(false);
    } catch (err: any) {
      toast.error("Failed to toggle referral code: " + err.message);
    }
  };

  const handleDeleteReferralCode = async (id: string, code: string) => {
    if (!confirm(`Delete referral code "${code}"? This will not affect existing historical commissions.`)) return;
    try {
      const { error } = await supabase.from("referral_codes").delete().eq("id", id);
      if (error) throw error;
      toast.success(`Referral code "${code}" deleted.`);
      loadData(false);
    } catch (err: any) {
      toast.error("Failed to delete referral code: " + err.message);
    }
  };

  const openPayoutModal = (referrer: Profile, pendingAmount: number) => {
    setSelectedPayoutReferrer(referrer);
    setPayoutForm({
      amount: pendingAmount,
      method: "upi",
      address: referrer.payout_upi_id || "",
      reference: "",
      notes: "",
    });
    setPayoutModalOpen(true);
  };

  const handleConfirmPayout = async () => {
    if (!selectedPayoutReferrer) return;
    if (!payoutForm.amount || payoutForm.amount <= 0) return toast.error("Invalid payout amount");
    if (!payoutForm.reference.trim()) return toast.error("UTR / Transaction Reference is required");

    setProcessingPayout(true);
    try {
      const { data: payoutRow, error: pErr } = await supabase
        .from("referral_payouts")
        .insert({
          referrer_user_id: selectedPayoutReferrer.id,
          amount_inr: payoutForm.amount,
          payout_method: payoutForm.method,
          payout_address: payoutForm.address.trim(),
          transaction_reference: payoutForm.reference.trim(),
          processed_by: user?.email || "admin",
          notes: payoutForm.notes.trim() || null,
        })
        .select("id")
        .single();

      if (pErr) throw pErr;

      const { error: commErr } = await supabase
        .from("referral_commissions")
        .update({
          status: "paid",
          payout_id: payoutRow?.id,
        })
        .eq("referrer_user_id", selectedPayoutReferrer.id)
        .eq("status", "approved");

      if (commErr) throw commErr;

      toast.success(`Settled ₹${payoutForm.amount} to ${selectedPayoutReferrer.name || selectedPayoutReferrer.email}`);
      setPayoutModalOpen(false);
      loadData(false);
    } catch (err: any) {
      toast.error("Failed to process payout: " + err.message);
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleVoidCommission = async (id: string) => {
    if (!confirm("Are you sure you want to void this commission row?")) return;
    try {
      const { error } = await supabase
        .from("referral_commissions")
        .update({ status: "void" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Commission marked as void");
      loadData(false);
    } catch (err: any) {
      toast.error("Failed to void commission: " + err.message);
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
    const basePlanLimit = planLimits[p.plan] ?? 1;
    const currentExtraCredits = Math.max(0, (p.credits ?? basePlanLimit) - basePlanLimit);

    setEditingProfile(p);
    setProfileForm({
      plan: p.plan,
      extraCredits: currentExtraCredits,
      billingCycleToursUsed: p.billing_cycle_tours_used ?? 0,
    });
  };

  // Save User Profile changes
  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    try {
      const isPaidPlan = profileForm.plan !== "trial";
      const nowIso = new Date().toISOString();
      const periodEndIso = new Date(Date.now() + 30 * 86400000).toISOString();
      const baseLimit = planLimits[profileForm.plan] ?? 1;
      const totalCredits = baseLimit + Math.max(0, Number(profileForm.extraCredits) || 0);

      const updateData: any = {
        plan: profileForm.plan,
        credits: totalCredits,
        billing_cycle_tours_used: Math.max(0, Number(profileForm.billingCycleToursUsed) || 0),
      };

      // Reset billing cycle usage to 0 and extend validity when upgrading or renewing paid plan
      if (profileForm.plan !== editingProfile.plan && isPaidPlan) {
        updateData.billing_cycle_tours_used = 0;
        updateData.trial_ends_at = periodEndIso;
      } else if (
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
        if (profileForm.plan !== editingProfile.plan && isPaidPlan) {
          const planPrices: Record<string, number> = { basic: 499, pro: 1499, agency: 2999 };
          try {
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
              });
          } catch (_) {}
        }

        toast.success("User plan and credits updated successfully!");
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

  const onlineUsers = profiles.filter(
    (p) => parseLastSeen(p.last_seen_at).status === "online"
  );
  const idleUsers = profiles.filter(
    (p) => parseLastSeen(p.last_seen_at).status === "idle"
  );
  const onlineUsersCount = onlineUsers.length;
  const idleUsersCount = idleUsers.length;

  // Filtered Users List
  const filteredProfiles = profiles
    .filter((p) => {
      const matchesSearch =
        (p.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.company_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlan = planFilter === "all" || p.plan === planFilter;

      const act = parseLastSeen(p.last_seen_at);
      const matchesActivity =
        activityFilter === "all"
          ? true
          : activityFilter === "online"
          ? act.status === "online"
          : activityFilter === "idle"
          ? act.status === "online" || act.status === "idle"
          : activityFilter === "today"
          ? act.diffMins < 1440
          : act.status === "offline";

      return matchesSearch && matchesPlan && matchesActivity;
    })
    .sort((a, b) => {
      if (sortBy === "online_first") {
        const order: Record<ActivityStatus, number> = { online: 0, idle: 1, recent: 2, offline: 3 };
        const statA = order[parseLastSeen(a.last_seen_at).status];
        const statB = order[parseLastSeen(b.last_seen_at).status];
        if (statA !== statB) return statA - statB;
        const timeA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const timeB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
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
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer shadow-sm hover:bg-slate-50 transition-all select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-[#0277bd] focus:ring-[#0277bd] cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    }`}
                  />
                  Live (25s)
                </span>
              </label>
              <Button
                onClick={() => loadData(true)}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <StatCard
              icon={Radio}
              label="Online Right Now"
              value={
                loading ? undefined : (
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    {onlineUsersCount}
                  </span>
                )
              }
              subtext={
                idleUsersCount > 0
                  ? `${idleUsersCount} idle (15m)`
                  : "Live active accounts"
              }
              accent="success"
            />
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
                  className={`flex-1 min-w-[140px] py-3 px-3 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === "users"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span>Users ({loading ? "..." : profiles.length})</span>
                  {onlineUsersCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {onlineUsersCount} online
                    </span>
                  )}
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
                  onClick={() => setActiveTab("referrals")}
                  className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === "referrals"
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Gift className="h-4 w-4 shrink-0" />
                  <span>Referrals ({loading ? "..." : referralCodes.length})</span>
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
                  <span>
                    Email Marketing ({emailAudienceMode === "cold" ? `${coldRecipients.length} Cold` : (loading ? "..." : selectedUserIds.length)})
                  </span>
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

                    <div className="flex flex-wrap items-center gap-2">
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

                      {/* Online Activity Filter */}
                      <Select
                        value={activityFilter}
                        onValueChange={(val: any) => setActivityFilter(val)}
                      >
                        <SelectTrigger className="w-[145px] bg-white border-slate-200 rounded-xl text-xs font-bold">
                          <SelectValue placeholder="Activity filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Activity</SelectItem>
                          <SelectItem value="online">🟢 Online Now ({onlineUsersCount})</SelectItem>
                          <SelectItem value="idle">🟡 Online & Idle ({onlineUsersCount + idleUsersCount})</SelectItem>
                          <SelectItem value="today">Active Today</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>

                      <Filter className="h-4 w-4 text-slate-400" />
                      <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-[120px] bg-white border-slate-200 rounded-xl text-xs font-bold">
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

                      {/* Sort Order Filter */}
                      <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                        <SelectTrigger className="w-[130px] bg-white border-slate-200 rounded-xl text-xs font-bold">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online_first">🟢 Online First</SelectItem>
                          <SelectItem value="newest">Newest Joined</SelectItem>
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
                            <th className="p-4">Live Status & Page</th>
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
                                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <span>{p.name || "Unnamed User"}</span>
                                    {parseLastSeen(p.last_seen_at).status === "online" && (
                                      <span
                                        className="relative flex h-2 w-2"
                                        title="Online Right Now"
                                      >
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                      </span>
                                    )}
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
                                  {(() => {
                                    const pCode = referralCodes.find((rc) => rc.user_id === p.id && rc.is_active);
                                    if (!pCode) return null;
                                    return (
                                      <div className="text-[10px] bg-blue-50 text-[#0277bd] border border-blue-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1 font-bold mt-1">
                                        🎁 Partner: <span className="font-mono">{pCode.code}</span>
                                      </div>
                                    );
                                  })()}
                                </td>

                                <td className="p-4">
                                  {(() => {
                                    const act = parseLastSeen(p.last_seen_at);
                                    if (act.status === "online") {
                                      return (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                            </span>
                                            Online Now
                                          </span>
                                          {p.last_active_path && (
                                            <span
                                              className="text-[10px] text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[160px]"
                                              title={p.last_active_path}
                                            >
                                              {p.last_active_path}
                                            </span>
                                          )}
                                          {p.last_active_device && (
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                              {p.last_active_device === "Mobile" ? (
                                                <>
                                                  <Smartphone className="h-3 w-3 text-slate-400" />
                                                  Mobile
                                                </>
                                              ) : (
                                                <>
                                                  <Monitor className="h-3 w-3 text-slate-400" />
                                                  Desktop
                                                </>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                    if (act.status === "idle") {
                                      return (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            {act.label}
                                          </span>
                                          {p.last_active_path && (
                                            <span
                                              className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]"
                                              title={p.last_active_path}
                                            >
                                              {p.last_active_path}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                    if (act.status === "recent") {
                                      return (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                          {act.label}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        {act.label}
                                      </span>
                                    );
                                  })()}
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
                                      onClick={() => setPurgeTarget(p)}
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-purple-50 text-purple-600 hover:text-purple-700 cursor-pointer rounded-xl"
                                      title={`Purge Images & Database Photos for ${p.name || p.email} (Free Storage & Archive)`}
                                    >
                                      <Database className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setActiveTab("referrals");
                                        const autoCode = (p.username || p.name?.split(" ")[0] || "VIP")
                                          .toUpperCase()
                                          .replace(/[^A-Z0-9]/g, "") + "25";
                                        setRefForm({
                                          userId: p.id,
                                          code: p.referral_code || autoCode,
                                          commissionPercent: 25,
                                          notes: `Assigned partner: ${p.name || p.email}`,
                                        });
                                      }}
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-blue-50 text-[#0277bd] hover:text-[#01579b] cursor-pointer rounded-xl"
                                      title={`Assign / Manage Referral Partner for ${p.name || p.email}`}
                                    >
                                      <Gift className="h-4 w-4" />
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

              {/* Tab Content: Referrals & Lifetime 25% Commissions Suite */}
              {activeTab === "referrals" && (() => {
                const totalLifetimeEarned = referralCommissions
                  .filter((c) => c.status !== "void")
                  .reduce((sum, c) => sum + (Number(c.commission_amount_inr) || 0), 0);

                const totalSettled = referralPayouts.reduce(
                  (sum, p) => sum + (Number(p.amount_inr) || 0),
                  0,
                );

                const totalPendingPayout = Math.max(0, totalLifetimeEarned - totalSettled);

                // Group by referrer
                const referrerSummary = profiles.map((p) => {
                  const comms = referralCommissions.filter((c) => c.referrer_user_id === p.id && c.status !== "void");
                  const earned = comms.reduce((sum, c) => sum + (Number(c.commission_amount_inr) || 0), 0);
                  const paid = referralPayouts.filter((pay) => pay.referrer_user_id === p.id).reduce((sum, pay) => sum + (Number(pay.amount_inr) || 0), 0);
                  const pending = Math.max(0, earned - paid);
                  const attrCount = referralAttributions.filter((a) => a.referrer_user_id === p.id).length;
                  return {
                    profile: p,
                    code: p.referral_code || referralCodes.find((rc) => rc.user_id === p.id)?.code || "-",
                    earned,
                    paid,
                    pending,
                    attrCount,
                  };
                }).filter((r) => r.earned > 0 || r.attrCount > 0 || r.code !== "-");

                return (
                  <div className="space-y-6">
                    {/* Referrals Top Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border rounded-2xl p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Referral Codes
                        </span>
                        <div className="text-2xl font-black text-slate-900 mt-1">
                          {referralCodes.length}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {referralCodes.filter((c) => c.is_active).length} active
                        </span>
                      </div>

                      <div className="bg-white border rounded-2xl p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Active Attributions
                        </span>
                        <div className="text-2xl font-black text-[#0277bd] mt-1">
                          {referralAttributions.length}
                        </div>
                        <span className="text-[10px] text-slate-400">Referred photographers</span>
                      </div>

                      <div className="bg-white border rounded-2xl p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Lifetime Accrued (25%)
                        </span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">
                          ₹{Math.round(totalLifetimeEarned).toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] text-slate-400">Gross commissions earned</span>
                      </div>

                      <div className="bg-white border rounded-2xl p-4 shadow-xs border-amber-200 bg-amber-50/20">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                          Pending Payouts
                        </span>
                        <div className="text-2xl font-black text-amber-700 mt-1">
                          ₹{Math.round(totalPendingPayout).toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] text-amber-600">Awaiting UPI settlement</span>
                      </div>
                    </div>

                    {/* Section 1: Referrers & Pending Settlements */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <h3 className="text-sm font-black text-slate-800">
                            Referrer Partners & Payout Balances
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Private Partner Program: Only assigned creators see the Referrals tab in Settings. Click &ldquo;Settle via UPI&rdquo; to record payment.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {referrerSummary.length} Partners
                        </span>
                      </div>

                      {referrerSummary.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                          No referrers with active codes or earnings yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              <tr>
                                <th className="p-3.5 pl-6">Partner</th>
                                <th className="p-3.5">Code</th>
                                <th className="p-3.5 text-center">Invited Users</th>
                                <th className="p-3.5">Saved UPI ID</th>
                                <th className="p-3.5 text-right">Lifetime Earned</th>
                                <th className="p-3.5 text-right">Pending Payout</th>
                                <th className="p-3.5 pr-6 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {referrerSummary.map((r) => (
                                <tr key={r.profile.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="p-3.5 pl-6">
                                    <div className="font-bold text-slate-800">{r.profile.name || "Anonymous Creator"}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{r.profile.email}</div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="font-mono font-bold text-[#0277bd] bg-blue-50 border border-blue-100 rounded px-2 py-0.5">
                                      {r.code}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center font-bold text-slate-700">
                                    {r.attrCount}
                                  </td>
                                  <td className="p-3.5">
                                    {r.profile.payout_upi_id ? (
                                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                        {r.profile.payout_upi_id}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Not entered</span>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-right font-mono text-slate-600">
                                    ₹{Math.round(r.earned).toLocaleString("en-IN")}
                                  </td>
                                  <td className="p-3.5 text-right font-mono font-bold text-amber-600">
                                    ₹{Math.round(r.pending).toLocaleString("en-IN")}
                                  </td>
                                  <td className="p-3.5 pr-6 text-right">
                                    <Button
                                      size="sm"
                                      disabled={r.pending <= 0}
                                      onClick={() => openPayoutModal(r.profile, r.pending)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-8 px-3 rounded-xl shadow-xs cursor-pointer disabled:opacity-40"
                                    >
                                      Settle via UPI
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Active Referral Codes Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <h3 className="text-sm font-black text-slate-800">Referral Codes Registry</h3>
                          <p className="text-[11px] text-slate-400">All registered referral codes and assigned commission rates.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {referralCodes.length} Codes
                        </span>
                      </div>

                      {referralCodes.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">No referral codes registered yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              <tr>
                                <th className="p-3 pl-6">Code</th>
                                <th className="p-3">Assigned Owner</th>
                                <th className="p-3 text-center">Commission %</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 pr-6 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {referralCodes.map((rc) => {
                                const owner = profiles.find((p) => p.id === rc.user_id);
                                return (
                                  <tr key={rc.id} className="hover:bg-slate-50/40">
                                    <td className="p-3 pl-6 font-mono font-black text-[#0277bd] text-sm">
                                      {rc.code}
                                    </td>
                                    <td className="p-3 text-slate-600">
                                      <div className="font-semibold">{owner?.name || "User"}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{owner?.email}</div>
                                    </td>
                                    <td className="p-3 text-center font-bold text-emerald-600">
                                      {rc.commission_percent}%
                                    </td>
                                    <td className="p-3 text-slate-400 text-[11px]">
                                      {formatDateIN(rc.created_at)}
                                    </td>
                                    <td className="p-3">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleReferralCode(rc.id, rc.is_active)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                          rc.is_active
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                        }`}
                                      >
                                        {rc.is_active ? "Active" : "Disabled"}
                                      </button>
                                    </td>
                                    <td className="p-3 pr-6 text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteReferralCode(rc.id, rc.code)}
                                        className="hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg h-7 w-7"
                                        title="Delete referral code"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
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

                    {/* Section 3: Lifetime Commissions Ledger */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <h3 className="text-sm font-black text-slate-800">Commissions Transaction Ledger</h3>
                          <p className="text-[11px] text-slate-400">All recurring 25% commission entries created on initial orders & automatic renewals.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {referralCommissions.length} Entries
                        </span>
                      </div>

                      {referralCommissions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">No commission transactions logged yet.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-[400px]">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider sticky top-0">
                              <tr>
                                <th className="p-3 pl-6">Date</th>
                                <th className="p-3">Referrer</th>
                                <th className="p-3">Subscriber</th>
                                <th className="p-3">Plan / Source</th>
                                <th className="p-3 text-right">Charge</th>
                                <th className="p-3 text-right">25% Comm.</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 pr-6 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                              {referralCommissions.map((comm) => {
                                const refUser = profiles.find((p) => p.id === comm.referrer_user_id);
                                const subUser = profiles.find((p) => p.id === comm.referred_user_id);
                                return (
                                  <tr key={comm.id} className="hover:bg-slate-50/40">
                                    <td className="p-3 pl-6 text-slate-400 whitespace-nowrap">
                                      {formatDateIN(comm.created_at)}
                                    </td>
                                    <td className="p-3">
                                      <div className="font-semibold text-slate-800">{refUser?.name || "Referrer"}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{refUser?.email}</div>
                                    </td>
                                    <td className="p-3">
                                      <div className="font-semibold text-slate-800">{subUser?.name || "Subscriber"}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{subUser?.email}</div>
                                    </td>
                                    <td className="p-3 capitalize font-medium text-slate-700">
                                      {comm.plan_name === "pay_as_you_go" ? "Credits Order" : `${comm.plan_name} Plan`}
                                    </td>
                                    <td className="p-3 text-right font-mono text-slate-500">
                                      ₹{Number(comm.payment_amount_inr).toLocaleString("en-IN")}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                      ₹{Number(comm.commission_amount_inr).toLocaleString("en-IN")}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        comm.status === "paid"
                                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                                          : comm.status === "void"
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      }`}>
                                        {comm.status}
                                      </span>
                                    </td>
                                    <td className="p-3 pr-6 text-right">
                                      {comm.status === "approved" && (
                                        <button
                                          type="button"
                                          onClick={() => handleVoidCommission(comm.id)}
                                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold underline cursor-pointer"
                                        >
                                          Void
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                        <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                          {emailAudienceMode === "cold" ? (
                            <>
                              <Target className="h-5 w-5 text-[#38bdf8]" />
                              <span>Cold Client Email Pitching & Outreach</span>
                            </>
                          ) : (
                            <>
                              <Mail className="h-5 w-5 text-[#38bdf8]" />
                              <span>1-Click Registered Users Marketing Broadcast</span>
                            </>
                          )}
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                          {emailAudienceMode === "cold"
                            ? "Type prospective client email addresses to send high-converting 360° virtual tour pitches, Google Street View proposals, and portfolio demos."
                            : "Deliver product updates, promotional offers, and tips directly to your registered users. Easily select or remove specific recipients before sending."}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Audience mode switch buttons in banner */}
                        <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEmailAudienceMode("cold")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              emailAudienceMode === "cold"
                                ? "bg-[#38bdf8] text-slate-950 shadow-md font-black"
                                : "text-slate-300 hover:text-white"
                            }`}
                          >
                            <Target className="h-3.5 w-3.5" />
                            <span>Cold Outreach ({coldRecipients.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailAudienceMode("users")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              emailAudienceMode === "users"
                                ? "bg-[#38bdf8] text-slate-950 shadow-md font-black"
                                : "text-slate-300 hover:text-white"
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Users ({selectedUserIds.length})</span>
                          </button>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {emailAudienceMode === "cold" ? "Cold Leads" : "Recipients"}
                          </div>
                          <div className="text-xl font-black text-white">
                            {emailAudienceMode === "cold" ? coldRecipients.length : selectedUserIds.length}
                            {emailAudienceMode === "users" && (
                              <span className="text-xs text-slate-400 font-medium">
                                {" "}
                                / {profiles.filter((p) => p.email).length}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => setConfirmSendOpen(true)}
                          disabled={
                            (emailAudienceMode === "cold"
                              ? coldRecipients.length === 0
                              : selectedUserIds.length === 0) || sendingBroadcast
                          }
                          className="bg-[#38bdf8] hover:bg-[#0284c7] text-slate-950 font-black rounded-xl px-5 py-3 shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                          {sendingBroadcast ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>
                                Send to {emailAudienceMode === "cold" ? coldRecipients.length : selectedUserIds.length}{" "}
                                {emailAudienceMode === "cold" ? "Cold Clients" : "Users"}
                              </span>
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
                      {/* Segment Selector Tabs */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEmailAudienceMode("cold")}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            emailAudienceMode === "cold"
                              ? "bg-[#0277bd] text-white shadow-sm font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <Target className="h-4 w-4" />
                          <span>Cold Clients ({coldRecipients.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailAudienceMode("users")}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            emailAudienceMode === "users"
                              ? "bg-[#0277bd] text-white shadow-sm font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          <span>Registered Users ({selectedUserIds.length})</span>
                        </button>
                      </div>

                      {/* COLD CLIENTS SECTION */}
                      {emailAudienceMode === "cold" && (
                        <div className="space-y-4">
                          {/* Type Email Address Box */}
                          <div className="bg-white rounded-2xl border border-sky-200/80 shadow-sm p-5 space-y-4 bg-gradient-to-b from-sky-50/40 to-white">
                            <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-[#0277bd]/10 text-[#0277bd] flex items-center justify-center font-bold">
                                  <AtSign className="h-4 w-4" />
                                </div>
                                <div>
                                  <h3 className="font-black text-slate-800 text-sm">
                                    Type Cold Client Email
                                  </h3>
                                  <p className="text-[11px] text-slate-500">
                                    Send virtual tour pitch directly to prospect
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBulkColdModal(true)}
                                className="h-7 px-2.5 text-[11px] font-bold text-[#0277bd] border-sky-200 hover:bg-sky-50 rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Bulk Paste
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {/* Email Input */}
                              <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                  <span>
                                    Client Email Address <span className="text-red-500">*</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">Press Enter to add</span>
                                </Label>
                                <div className="relative">
                                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input
                                    type="email"
                                    placeholder="client@hotelgrand.com"
                                    value={coldInputEmail}
                                    onChange={(e) => setColdInputEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddColdClient();
                                      }
                                    }}
                                    className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl font-medium focus-visible:ring-[#0277bd]"
                                  />
                                </div>
                              </div>

                              {/* Business / Client Name Input */}
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-bold text-slate-700">
                                    Client / Contact Name
                                  </Label>
                                  <div className="relative">
                                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                      placeholder="e.g. Grand Palace Hotel"
                                      value={coldInputName}
                                      onChange={(e) => setColdInputName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddColdClient();
                                        }
                                      }}
                                      className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-xl"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-bold text-slate-700">
                                    Company / Tag
                                  </Label>
                                  <div className="relative">
                                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                      placeholder="e.g. Resort / Showroom"
                                      value={coldInputCompany}
                                      onChange={(e) => setColdInputCompany(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddColdClient();
                                        }
                                      }}
                                      className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-xl"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-1 flex items-center gap-2">
                                <Button
                                  type="button"
                                  onClick={handleAddColdClient}
                                  className="flex-1 bg-[#0277bd] hover:bg-[#01579b] text-white font-bold text-xs h-9 rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add to Cold List
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleDirectSendSingleCold}
                                  disabled={directSendingCold || !coldInputEmail.trim()}
                                  title="Send the currently composed email immediately to this single address without batch queueing"
                                  className="border-sky-300 text-[#0277bd] hover:bg-sky-50 font-bold text-xs h-9 rounded-xl cursor-pointer flex items-center gap-1.5"
                                >
                                  {directSendingCold ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                      Send Directly
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Cold Clients Queue Card */}
                          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <Target className="h-4 w-4 text-[#0277bd]" />
                                  <h3 className="font-bold text-slate-800 text-sm">
                                    Cold Outreach Queue ({coldRecipients.length})
                                  </h3>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Recipients ready for 1-click delivery
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {coldRecipients.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAllColdRecipients}
                                    className="h-7 px-2 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                  >
                                    Clear All
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleLoadSampleColdLeads}
                                  className="h-7 px-2 text-[11px] font-bold text-[#0277bd] hover:bg-sky-50 rounded-lg cursor-pointer"
                                >
                                  Load Demo Leads
                                </Button>
                              </div>
                            </div>

                            {/* Scrollable list of cold recipients */}
                            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
                              {coldRecipients.length === 0 ? (
                                <div className="p-8 text-center space-y-2">
                                  <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Target className="h-5 w-5" />
                                  </div>
                                  <div className="text-xs font-bold text-slate-700">No cold clients queued yet</div>
                                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                    Type an email address above and click <strong>Add to Cold List</strong>, or click <strong>Load Demo Leads</strong> to try.
                                  </p>
                                </div>
                              ) : (
                                coldRecipients.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className="h-8 w-8 rounded-lg bg-sky-100 text-[#0277bd] flex items-center justify-center font-black text-xs shrink-0">
                                        <Building2 className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-xs text-slate-800 truncate">
                                            {c.name || "Cold Prospect"}
                                          </span>
                                          {c.company && (
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold truncate max-w-[100px]">
                                              {c.company}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-mono truncate" title={c.email}>
                                          {c.email}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveColdRecipient(c.id, c.email)}
                                      className="h-6 w-6 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors ml-2"
                                      title="Remove from cold list"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REGISTERED USERS SECTION */}
                      {emailAudienceMode === "users" && (
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
                      )}
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
                            {emailAudienceMode === "cold" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset("cold_hotel")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0277bd] cursor-pointer transition-colors"
                                >
                                  🏨 Hotel Pitch
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset("cold_retail")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition-colors"
                                >
                                  🏬 Retail/Store
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset("cold_realestate")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer transition-colors"
                                >
                                  🏢 Real Estate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset("cold_quick")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer transition-colors"
                                >
                                  ⚡ Quick Intro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset("promo")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                                >
                                  🏷️ 30% Promo
                                </button>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
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
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-slate-500">Message Content</Label>
                              <span className="text-[10px] bg-blue-50 text-[#0277bd] font-bold px-2 py-0.5 rounded-full">
                                Markdown &amp; HTML supported
                              </span>
                            </div>

                            {/* Rich Formatting Toolbar */}
                            <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100 rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("bold")}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs flex items-center gap-1 font-bold shadow-xs transition-colors"
                                title="Bold (**text**)"
                              >
                                <Bold className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Bold</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("italic")}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs flex items-center gap-1 italic shadow-xs transition-colors"
                                title="Italic (*text*)"
                              >
                                <Italic className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Italic</span>
                              </button>
                              <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("h2")}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs font-extrabold shadow-xs transition-colors"
                                title="Heading (## Section)"
                              >
                                <span className="text-[11px]">H2</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("bullet")}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs flex items-center gap-1 shadow-xs transition-colors"
                                title="Bullet List (- item)"
                              >
                                <List className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">Bullet</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("number")}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs flex items-center gap-1 shadow-xs transition-colors"
                                title="Numbered List (1. item)"
                              >
                                <ListOrdered className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">1, 2, 3</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("link")}
                                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs flex items-center gap-1 shadow-xs transition-colors"
                                title="Insert Link ([text](url))"
                              >
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">Link</span>
                              </button>
                              <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => handleInsertFormatting("name")}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0277bd] border border-blue-200 rounded text-[11px] font-bold transition-colors"
                                title="Insert personalized name tag"
                              >
                                + &#123;&#123;name&#125;&#125;
                              </button>
                            </div>

                            <Textarea
                              id="email-body-textarea"
                              rows={8}
                              value={broadcastForm.bodyText}
                              onChange={(e) =>
                                setBroadcastForm((prev) => ({ ...prev, bodyText: e.target.value }))
                              }
                              placeholder="Write your email body here... Supports **bold**, *italic*, ## headings, - lists, and [links](url)"
                              className="bg-slate-50 border-slate-200 rounded-xl text-xs leading-relaxed font-mono"
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
                            disabled={
                              (emailAudienceMode === "cold"
                                ? coldRecipients.length === 0
                                : selectedUserIds.length === 0) || sendingBroadcast
                            }
                            className="bg-[#0277bd] hover:bg-[#01579b] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all hover:shadow-lg"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send to {emailAudienceMode === "cold" ? coldRecipients.length : selectedUserIds.length}{" "}
                            {emailAudienceMode === "cold" ? "Cold Clients" : "Recipients"} (1-Click)
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
                {/* Form Container: Referral Code Generator OR Coupon Generator */}
                {activeTab === "referrals" ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Gift className="h-5 w-5 text-[#0277bd]" />
                      <div>
                        <h2 className="text-base font-black text-slate-800">Assign Referral Code</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Private Partner Program (Grants Referrals Tab Access)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Select User */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Select Creator / User</Label>
                        <Select
                          value={refForm.userId}
                          onValueChange={(val) => {
                            const u = profiles.find((p) => p.id === val);
                            const autoCode = u
                              ? (u.username || u.name?.split(" ")[0] || "VIP")
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9]/g, "") + "25"
                              : "";
                            setRefForm((prev) => ({
                              ...prev,
                              userId: val,
                              code: prev.code || autoCode,
                            }));
                          }}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs">
                            <SelectValue placeholder="Choose user..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name || p.username || "User"} ({p.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Code Input */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Referral Code</Label>
                        <Input
                          placeholder="e.g. VIP25"
                          value={refForm.code}
                          onChange={(e) =>
                            setRefForm((prev) => ({
                              ...prev,
                              code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                            }))
                          }
                          className="font-mono bg-slate-50 border-slate-200 rounded-xl text-sm uppercase tracking-wider"
                        />
                      </div>

                      {/* Commission % */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Commission Rate (%)</Label>
                        <Input
                          type="number"
                          value={refForm.commissionPercent}
                          onChange={(e) =>
                            setRefForm((prev) => ({
                              ...prev,
                              commissionPercent: Number(e.target.value),
                            }))
                          }
                          className="font-mono bg-slate-50 border-slate-200 rounded-xl text-sm"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Partner Notes (Optional)</Label>
                        <Input
                          placeholder="e.g. Top photographer partner"
                          value={refForm.notes}
                          onChange={(e) =>
                            setRefForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          className="bg-slate-50 border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <Button
                        onClick={handleCreateReferralCode}
                        disabled={creatingRefCode}
                        className="w-full bg-[#0277bd] hover:bg-[#01579b] text-white font-black text-xs py-3 rounded-xl shadow-md cursor-pointer transition-all mt-2"
                      >
                        {creatingRefCode ? "Generating..." : "Create Referral Code"}
                      </Button>
                    </div>
                  </div>
                ) : (
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
                )}

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
                Update Plan & Credits
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Account</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {editingProfile.name || "Unnamed"}
                  </div>
                  <div className="text-xs font-mono text-slate-500">{editingProfile.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current</div>
                  <span className="text-xs font-black uppercase text-[#0277bd] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mt-1 inline-block">
                    {editingProfile.plan}
                  </span>
                </div>
              </div>

              {/* Plan dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Subscription Plan</Label>
                <Select
                  value={profileForm.plan}
                  onValueChange={(val) => setProfileForm((prev) => ({ ...prev, plan: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial (1 tour quota)</SelectItem>
                    <SelectItem value="basic">Basic Plan (5 tours/mo)</SelectItem>
                    <SelectItem value="pro">Pro Plan (20 tours/mo)</SelectItem>
                    <SelectItem value="agency">Agency Plan (50 tours/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Extra Credits input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-600">Extra Credits</Label>
                  <span className="text-[11px] text-slate-400 font-medium">Bonus / Pay As You Go</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={profileForm.extraCredits}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      extraCredits: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  className="rounded-xl border-slate-200 font-semibold"
                  placeholder="0"
                />
              </div>

              {/* Billing Cycle Tours Used input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-600">Cycle Tours Used</Label>
                  <span className="text-[11px] text-slate-400 font-medium">Quota consumed in current billing cycle</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={profileForm.billingCycleToursUsed}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      billingCycleToursUsed: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  className="rounded-xl border-slate-200 font-semibold"
                  placeholder="0"
                />
              </div>

              {/* Live allowance pill */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs flex items-center justify-between">
                <span className="text-slate-600 font-medium">Total Publishing Allowance:</span>
                <span className="font-extrabold text-[#0277bd]">
                  {(planLimits[profileForm.plan] ?? 1)} base + {Number(profileForm.extraCredits) || 0} extra = {(planLimits[profileForm.plan] ?? 1) + (Number(profileForm.extraCredits) || 0)} tours
                </span>
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
                className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl px-5 cursor-pointer"
              >
                Save Plan & Credits
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

      {/* Purge User Storage Confirmation Dialog */}
      <Dialog
        open={!!purgeTarget}
        onOpenChange={(open) => !open && !purging && setPurgeTarget(null)}
      >
        {purgeTarget && (
          <DialogContent className="rounded-2xl max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Database className="h-5 w-5" />
                </span>
                Purge Image Storage & Archive Tours
              </DialogTitle>
            </DialogHeader>

            <div className="py-3 space-y-3 text-sm">
              <p className="text-slate-600">
                You are about to purge all stored 360° images and database photos for{" "}
                <strong className="text-slate-900 font-bold">{purgeTarget.name || purgeTarget.email}</strong>.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">User Email:</span>
                  <span className="font-bold text-slate-800">{purgeTarget.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Account Plan:</span>
                  <span className="font-bold uppercase text-slate-800">{purgeTarget.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">User ID:</span>
                  <span className="font-mono text-[11px] text-slate-500">{purgeTarget.id}</span>
                </div>
              </div>

              <div className="rounded-xl bg-purple-50 border border-purple-200/60 p-3 text-xs text-purple-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span> What this action does:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-800">
                  <li><strong>Frees 100% of R2 Storage:</strong> Deletes raw equirectangular panoramas and thumbnails.</li>
                  <li><strong>Cleans Database Photos:</strong> Reclaims rows from the <code>photos</code> & <code>connections</code> tables.</li>
                  <li><strong>Preserves Tour Names & Stats:</strong> All tours remain visible as greyed-out read-only records.</li>
                  <li><strong>Maintains Client Counts:</strong> All client records remain intact.</li>
                  <li><strong>Live on Street View:</strong> Published Google Street View tours remain active on Google Maps.</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setPurgeTarget(null)}
                disabled={purging}
                className="rounded-xl border-slate-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPurgeStorage}
                disabled={purging}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-1.5 cursor-pointer shadow"
              >
                {purging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Purging R2 Storage...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Confirm Purge & Archive</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Broadcast / Cold Outreach Confirmation Modal */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              {emailAudienceMode === "cold" ? (
                <>
                  <Target className="h-5 w-5 text-[#0277bd]" />
                  <span>Confirm Cold Outreach Campaign</span>
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5 text-[#0277bd]" />
                  <span>Confirm Marketing Broadcast</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Recipients:</span>
                <span className="font-bold text-slate-800">
                  {emailAudienceMode === "cold"
                    ? `${coldRecipients.length} cold client${coldRecipients.length === 1 ? "" : "s"}`
                    : `${selectedUserIds.length} users`}
                </span>
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
                  ~{Math.max(1, Math.round((emailAudienceMode === "cold" ? coldRecipients.length : selectedUserIds.length) * 0.5))}s (500ms safety throttle)
                </span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-600 mb-1.5">
                {emailAudienceMode === "cold" ? "Cold Recipients Included:" : "Sample Recipients Included:"}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {emailAudienceMode === "cold" ? (
                  <>
                    {coldRecipients.slice(0, 8).map((c) => (
                      <span
                        key={c.id}
                        className="bg-sky-50 text-[#0277bd] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-100 truncate max-w-[200px]"
                        title={c.email}
                      >
                        {c.name ? `${c.name} (${c.email})` : c.email}
                      </span>
                    ))}
                    {coldRecipients.length > 8 && (
                      <span className="text-[10px] text-slate-400 font-bold px-1 self-center">
                        +{coldRecipients.length - 8} more
                      </span>
                    )}
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-3 text-blue-900 leading-relaxed">
              💡 <strong>Delivery Safety:</strong> Emails will be delivered sequentially with 500ms intervals to guarantee 100% compliance with email delivery rate limits.
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
                  <span>Sending {emailAudienceMode === "cold" ? "Outreach" : "Broadcast"}...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send {emailAudienceMode === "cold" ? "Cold Outreach" : "Broadcast"} Now</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Paste Cold Clients Modal */}
      <Dialog open={showBulkColdModal} onOpenChange={setShowBulkColdModal}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="h-4.5 w-4.5 text-[#0277bd]" />
              Bulk Paste Cold Client Emails
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <p className="text-slate-500">
              Paste email addresses separated by commas, newlines, or semicolons. You can also include client names:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-600 space-y-1">
              <div>contact@grandhotel.com, Grand Palace Hotel</div>
              <div>sales@apexmotors.com, Apex Motors</div>
              <div>manager@seasidevilla.com</div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Paste Emails Below</Label>
              <Textarea
                rows={7}
                placeholder="Paste emails here (one per line, or comma separated)..."
                value={bulkColdText}
                onChange={(e) => setBulkColdText(e.target.value)}
                className="bg-white border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkColdModal(false)}
              className="rounded-xl border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessBulkColdClients}
              className="bg-[#0277bd] hover:bg-[#01579b] text-white font-bold rounded-xl px-5 cursor-pointer shadow-sm"
            >
              Import Cold Emails
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
                  <h2
                    className="text-lg font-black text-slate-900 leading-snug"
                    dangerouslySetInnerHTML={{
                      __html: parseInlineMarkdown(
                        broadcastForm.headline.replace(
                          /\{\{name\}\}/gi,
                          emailAudienceMode === "cold" ? (coldRecipients[0]?.name || "Grand Palace Hotel") : "Alex"
                        )
                      ),
                    }}
                  />
                )}

                <div
                  className="text-sm text-slate-700 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{
                    __html: formatEmailMarkdownToHtml(
                      broadcastForm.bodyText.replace(
                        /\{\{name\}\}/gi,
                        emailAudienceMode === "cold" ? (coldRecipients[0]?.name || "Grand Palace Hotel") : "Alex"
                      )
                    ),
                  }}
                />

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
                {emailAudienceMode === "cold" ? (
                  <>
                    You received this email regarding Google Street View & 360° virtual tour solutions for your business.<br />
                    To opt out, reply with "Unsubscribe".
                  </>
                ) : (
                  <>
                    You received this update because you are a registered user of PanoPublish.<br />
                    To unsubscribe, reply with "Unsubscribe".
                  </>
                )}
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

      {/* Settle Referral Payout Modal */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#0277bd]" />
              <span>Settle Referral Commission</span>
            </DialogTitle>
          </DialogHeader>

          {selectedPayoutReferrer && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 border rounded-xl p-3.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Referrer:</span>
                  <span className="font-bold text-slate-800">
                    {selectedPayoutReferrer.name || selectedPayoutReferrer.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Email:</span>
                  <span className="font-mono text-slate-700">{selectedPayoutReferrer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Saved UPI ID:</span>
                  <span className="font-mono font-bold text-[#0277bd]">
                    {selectedPayoutReferrer.payout_upi_id || "Not configured by user"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Settlement Amount (INR)</Label>
                <Input
                  type="number"
                  value={payoutForm.amount}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                  }
                  className="font-mono font-bold text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Recipient UPI ID / Bank</Label>
                <Input
                  value={payoutForm.address}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="e.g. user@okhdfcbank"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">
                  Transaction Reference / UTR Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={payoutForm.reference}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, reference: e.target.value }))
                  }
                  placeholder="e.g. 529301928301 (from your banking / GPay app)"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Internal Notes (Optional)</Label>
                <Input
                  value={payoutForm.notes}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="e.g. Settled via PhonePe UPI"
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPayoutModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayout}
              disabled={processingPayout}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              {processingPayout ? "Recording Settlement..." : "Mark as Paid & Settle"}
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
  value?: React.ReactNode;
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
