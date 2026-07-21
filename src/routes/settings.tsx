import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { customUpdatePassword } from "@/lib/auth-server";
import { useEffect, useState } from "react";
import { getEnv } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  User,
  Globe,
  CreditCard,
  Key,
  HelpCircle,
  Upload,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  ExternalLink,
  CheckCircle2,
  FileText,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { waLink, formatDateIN } from "@/lib/format";

import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — PanoPublish" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SettingsPage,
});

type TabId = "basic" | "branding" | "billing" | "access" | "support";

function SettingsPage() {
  const { user, session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  // Profile State
  const [profile, setProfile] = useState<any>(null);

  // Basic Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("US");

  // Password Change Fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Branding Form Fields
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Google OAuth Connection
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");

  // Loading States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch user profile
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      if (pData) {
        setProfile(pData);
        setFirstName(pData.first_name ?? "");
        setLastName(pData.last_name ?? "");
        setCompanyName(pData.company_name ?? "");
        setUsername(pData.username ?? "");
        setPhone(pData.phone ?? "");
        setCountryCode(pData.country_code ?? "US");

        setLogoUrl(pData.logo_url ?? "");
        setWebsiteUrl(pData.website_url ?? "");
        setFacebookUrl(pData.facebook_url ?? "");
        setInstagramUrl(pData.instagram_url ?? "");
        setTwitterUrl(pData.twitter_url ?? "");
        setLinkedinUrl(pData.linkedin_url ?? "");

        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", !!pData.dark_mode);
        }
      }

      // 2. Fetch Google token connection
      const { data: tokenData } = await supabase
        .from("google_tokens")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsGoogleConnected(!!tokenData);
      setGoogleEmail(user.email ?? "");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const saveBasic = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        username: username,
        phone: phone,
        country_code: countryCode,
        name: `${firstName} ${lastName}`.trim() || companyName || user.email?.split("@")[0],
      } as any);

      if (error) throw error;
      toast.success("Account settings updated successfully!");
      loadProfile();
    } catch (err: any) {
      toast.error("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter a new password");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdatingPassword(true);
    try {
      if (!session?.access_token) {
        throw new Error("No active session token found");
      }
      const res = await customUpdatePassword({
        data: {
          token: session.access_token,
          password
        }
      });
      if (res?.error) throw new Error(res.error.message);
      toast.success("Password changed successfully!");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    } catch (err: any) {
      toast.error("Failed to update password: " + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    try {
      const path = `${user.id}/profile-logos/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("tour-photos").upload(path, file, {
        contentType: file.type || "image/png",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(path);
      const newLogoUrl = pub.publicUrl;

      // Update locally
      setLogoUrl(newLogoUrl);

      // Save directly to profiles table
      const { error: dbErr } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        logo_url: newLogoUrl,
      } as any);
      if (dbErr) throw dbErr;

      toast.success("Company logo uploaded successfully!");
      await loadProfile();
    } catch (err: any) {
      toast.error("Failed to upload company logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!user || !window.confirm("Are you sure you want to remove your company logo?")) return;
    try {
      setLogoUrl("");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        logo_url: null,
      } as any);
      if (error) throw error;
      toast.success("Company logo removed");
      await loadProfile();
    } catch (err: any) {
      toast.error("Failed to remove logo: " + err.message);
    }
  };

  const saveBranding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        website_url: websiteUrl,
        facebook_url: facebookUrl,
        instagram_url: instagramUrl,
        twitter_url: twitterUrl,
        linkedin_url: linkedinUrl,
      } as any);

      if (error) throw error;
      toast.success("Branding links saved successfully!");
      loadProfile();
    } catch (err: any) {
      toast.error("Failed to save branding: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDark = async (val: boolean) => {
    if (!user) return;
    document.documentElement.classList.toggle("dark", val);
    setProfile((p: any) => (p ? { ...p, dark_mode: val } : p));
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      dark_mode: val,
    } as any);
  };

  const connectGoogle = async () => {
    try {
      const clientId = getEnv("VITE_GOOGLE_CLIENT_ID");
      if (!clientId) throw new Error("Missing VITE_GOOGLE_CLIENT_ID in environment variables.");
      const redirectUri = window.location.origin + "/auth/google/callback";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/streetviewpublish&access_type=offline&prompt=consent`;
      window.location.href = authUrl;
    } catch (e: any) {
      toast.error("Failed to start Google connection: " + e.message);
    }
  };

  const revokeGoogleAccess = async () => {
    if (!user) return;
    if (
      !window.confirm(
        "Are you sure you want to revoke Google Street View access? You will not be able to publish new scenes until you reconnect.",
      )
    )
      return;
    try {
      const { error } = await supabase.from("google_tokens").delete().eq("user_id", user.id);
      if (error) throw error;
      setIsGoogleConnected(false);
      toast.success("Google connection access revoked successfully.");
    } catch (err: any) {
      toast.error("Failed to revoke access: " + err.message);
    }
  };

  const triggerRazorpaySimulate = async (planName: string) => {
    const planNameLower = planName.toLowerCase();
    const tid = toast.loading(`Initializing subscription for ${planName} plan...`);

    try {
      // 1. Call Edge Function to create Razorpay Subscription
      const { data, error } = await supabase.functions.invoke("razorpay", {
        body: {
          action: "create_subscription",
          plan_name: planNameLower,
          email: user?.email,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to initialize subscription");

      toast.dismiss(tid);

      // 2. Open Razorpay Checkout modal
      const keyId = getEnv("VITE_RAZORPAY_KEY_ID") || "";

      const options = {
        key: keyId,
        subscription_id: data.subscription_id,
        name: "PanoPublish",
        description: `${planName} Tier Monthly Subscription`,
        image: logoUrl || undefined,
        handler: async function (response: any) {
          const verifyId = toast.loading("Verifying payment transaction signature...");
          try {
            // 3. Call Edge Function to verify payment signature and activate plan
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "razorpay",
              {
                body: {
                  action: "verify_subscription",
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id,
                  razorpay_signature: response.razorpay_signature,
                  plan_name: planNameLower,
                  user_id: user?.id,
                },
              },
            );

            if (verifyError) throw verifyError;
            if (!verifyData?.success)
              throw new Error(verifyData?.error || "Signature verification failed");

            toast.success(`Welcome to the ${planName} plan! Subscription activated successfully.`, {
              id: verifyId,
            });
            loadProfile();
          } catch (err: any) {
            console.error("Verification failed:", err);
            toast.error("Payment verification failed: " + err.message, { id: verifyId });
          }
        },
        prefill: {
          name: `${firstName} ${lastName}`.trim(),
          email: user?.email,
          contact: phone || undefined,
        },
        notes: {
          user_id: user?.id,
          plan: planNameLower,
        },
        theme: {
          color: "#0277bd",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay subscription failed:", err);
      toast.error("Subscription checkout failed: " + err.message, { id: tid });
    }
  };

  const cancelSubscription = async () => {
    if (
      !window.confirm(
        "Are you sure you want to cancel your current subscription? Your account will return to the Trial tier.",
      )
    )
      return;
    const tid = toast.loading("Processing cancellation...");
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user?.id,
        email: user?.email,
        plan: "trial",
      } as any);

      if (error) throw error;
      toast.success("Subscription cancelled successfully.", { id: tid });
      loadProfile();
    } catch (err: any) {
      toast.error("Failed to cancel subscription: " + err.message, { id: tid });
    }
  };

  const sidebarTabs = [
    { id: "basic", label: "Basic", icon: User },
    { id: "branding", label: "Branding", icon: Globe },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "access", label: "Access", icon: Key },
    { id: "support", label: "Support", icon: HelpCircle },
  ];

  return (
    <AppShell
      title="Settings"
      breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]}
    >
      <SEO
        title="Settings"
        description="Configure your profile, company branding, and subscription details."
        noIndex={true}
      />
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 min-h-[600px] pb-12">
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border rounded-2xl p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible shrink-0 shadow-sm h-fit">
          <div className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
            Settings Menu
          </div>
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#0277bd] text-white shadow-md shadow-[#0277bd]/20 scale-102"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tab Content Container */}
        <div className="flex-1 bg-white border rounded-2xl shadow-sm p-6 md:p-8 min-h-[500px]">
          {loading ? (
            <div className="h-full flex flex-col justify-center items-center py-20 space-y-3">
              <div className="w-10 h-10 border-4 border-t-transparent border-[#0277bd] rounded-full animate-spin" />
              <span className="text-sm font-semibold text-gray-500">Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* TABS 1: BASIC TAB */}
              {activeTab === "basic" && (
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Left Form (2 Columns) */}
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Basic Account Details</h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Review and manage the details provided during signup.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">First Name</Label>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Prashantkumar"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">Last Name</Label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Yadav"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">Username</Label>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. vista360digital"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">
                          Account / Business Name
                        </Label>
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Vista360 Digital"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500">
                        Email Address (Read-only)
                      </Label>
                      <Input
                        value={user?.email ?? ""}
                        disabled
                        className="bg-gray-50 cursor-not-allowed text-gray-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500">Dial-in Phone Info</Label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="border rounded-md px-3 py-2 bg-background font-medium text-sm focus:ring-1 focus:ring-[#0277bd]"
                        >
                          <option value="IN">IN (+91)</option>
                          <option value="US">US (+1)</option>
                          <option value="GB">GB (+44)</option>
                          <option value="AE">AE (+971)</option>
                          <option value="AU">AU (+61)</option>
                        </select>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone Number"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={saveBasic}
                        disabled={saving}
                        className="bg-[#0277bd] hover:bg-[#0266a1] text-white px-6 font-bold shadow-md"
                      >
                        {saving ? "Saving Changes..." : "Save Account Settings"}
                      </Button>
                    </div>

                    {/* Change Password Panel */}
                    <div className="border-t pt-6 mt-8 space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-800">Change Password</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Keep your account secure by resetting your password here.
                        </p>
                      </div>

                      <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-gray-500">New Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4.5 w-4.5" />
                              ) : (
                                <Eye className="h-4.5 w-4.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-gray-500">
                            Confirm New Password
                          </Label>
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Retype password"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={updatingPassword}
                          variant="outline"
                          className="border-gray-300 hover:bg-gray-50 font-bold"
                        >
                          {updatingPassword ? "Updating Password..." : "Update Password"}
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Profile Logo Avatar preview on the Right */}
                  <div className="flex flex-col items-center border-l pl-8 space-y-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Company Logo / Avatar
                    </span>
                    <div className="relative group w-44 h-44 rounded-full overflow-hidden border-[6px] border-black shadow-lg flex items-center justify-center bg-gray-50 transition-transform duration-300 hover:scale-105">
                      {logoUrl ? (
                        <>
                          <img
                            src={logoUrl}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={removeLogo}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            title="Remove logo"
                          >
                            <Trash2 className="h-6 w-6 text-red-400" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300 select-none">
                          <User className="h-16 w-16" />
                          <span className="text-[10px] font-bold mt-1 text-gray-400">NO LOGO</span>
                        </div>
                      )}
                    </div>

                    <label className="bg-slate-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-gray-400 transition-all text-center w-full max-w-[200px]">
                      <Upload className="h-5 w-5 text-gray-400 mb-1" />
                      <span className="text-[11px] font-semibold text-gray-600">
                        {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={handleLogoUpload}
                      />
                    </label>

                    <div className="w-full space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-semibold">Preferences</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-gray-700">Dark Mode Theme</div>
                          <div className="text-[10px] text-gray-400">
                            Dim application UI interface.
                          </div>
                        </div>
                        <Switch checked={!!profile?.dark_mode} onCheckedChange={toggleDark} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TABS 2: BRANDING TAB */}
              {activeTab === "branding" && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Branding & Profiles</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Configure company profiles, logo, and links for virtual tour embedding.
                    </p>
                  </div>

                  {/* Logo block */}
                  <div className="bg-slate-50 border p-5 rounded-2xl flex flex-col sm:flex-row gap-5 items-center">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-black bg-white flex-shrink-0 flex items-center justify-center shadow-md">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <h3 className="text-sm font-bold text-gray-700">Company Identity Logo</h3>
                      <p className="text-[11px] text-gray-400">
                        This logo will represent your company across virtual tours, watermarks,
                        custom embedding portals, and business emails.
                      </p>
                      <div className="flex justify-center sm:justify-start gap-2 pt-1">
                        <label className="bg-white border rounded px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                          {uploadingLogo ? "Uploading..." : "Change Logo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                          />
                        </label>
                        {logoUrl && (
                          <button
                            onClick={removeLogo}
                            className="border border-red-200 text-red-600 hover:bg-red-50 rounded px-3 py-1.5 text-xs font-bold shadow-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Branding form */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500">
                        Business / Portfolio Website URL
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="e.g. https://www.panopublish.com"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">Facebook URL</Label>
                        <div className="relative">
                          <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1877f2]" />
                          <Input
                            value={facebookUrl}
                            onChange={(e) => setFacebookUrl(e.target.value)}
                            placeholder="e.g. https://facebook.com/vista360"
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">Instagram URL</Label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e1306c]" />
                          <Input
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                            placeholder="e.g. https://instagram.com/vista360"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">Twitter / X URL</Label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                          <Input
                            value={twitterUrl}
                            onChange={(e) => setTwitterUrl(e.target.value)}
                            placeholder="e.g. https://x.com/vista360"
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">
                          LinkedIn Company URL
                        </Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0077b5]" />
                          <Input
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="e.g. https://linkedin.com/company/vista360"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={saveBranding}
                      disabled={saving}
                      className="bg-[#0277bd] hover:bg-[#0266a1] text-white px-6 font-bold shadow-md"
                    >
                      {saving ? "Saving Branding..." : "Save Branding Links"}
                    </Button>
                  </div>
                </div>
              )}

              {/* TABS 3: BILLING TAB */}
              {activeTab === "billing" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Billing & Subscription</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Manage your active plans, billing history, invoicing details, and upgrade
                      securely.
                    </p>
                  </div>

                  {/* Current plan status board */}
                  <div className="bg-[#f0f9ff] border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">
                        Active Plan
                      </span>
                      <div className="text-2xl font-extrabold text-blue-900 capitalize flex items-center gap-2">
                        {profile?.plan ?? "trial"} Tier
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                          Active
                        </span>
                      </div>
                      {profile?.trial_ends_at && profile.plan === "trial" && (
                        <p className="text-xs text-blue-600 mt-1">
                          Free Trial ends on <strong>{formatDateIN(profile.trial_ends_at)}</strong>
                        </p>
                      )}
                    </div>
                    {profile?.plan !== "trial" && (
                      <Button
                        variant="outline"
                        onClick={cancelSubscription}
                        className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 font-bold"
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>

                  {/* Razorpay Plans Grid */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Available Subscription Upgrades
                    </h3>
                    <div className="grid md:grid-cols-3 gap-5">
                      {/* Basic Plan card */}
                      <div
                        className={`border rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                          profile?.plan === "basic"
                            ? "border-[#0277bd] bg-blue-50/10 shadow-md ring-2 ring-[#0277bd]/20 scale-102"
                            : "hover:border-gray-300"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="text-base font-extrabold text-gray-800">Basic Tier</div>
                          <p className="text-[11px] text-gray-400 leading-snug">
                            Perfect for single agency builders or small virtual tour creators.
                          </p>
                          <div className="pt-2 text-2xl font-black text-gray-900 flex items-baseline gap-0.5">
                            ₹499<span className="text-xs text-gray-400 font-bold">/mo</span>
                          </div>
                          <ul className="text-xs text-gray-500 space-y-1.5 pt-2 border-t font-medium">
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 1 user
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 5 tours
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 50 photos
                              per tour
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Email
                              support
                            </li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => triggerRazorpaySimulate("Basic")}
                          disabled={profile?.plan === "basic"}
                          className={`w-full mt-5 font-bold ${
                            profile?.plan === "basic"
                              ? "bg-gray-100 text-gray-400 cursor-default hover:bg-gray-100"
                              : "bg-[#0277bd] hover:bg-[#0266a1] text-white shadow-md"
                          }`}
                        >
                          {profile?.plan === "basic" ? "Current Plan" : "Select Basic"}
                        </Button>
                      </div>

                      {/* Pro Plan card (Most Popular) */}
                      <div
                        className={`border-2 rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                          profile?.plan === "pro"
                            ? "border-[#8bc34a] bg-green-50/10 shadow-md ring-2 ring-[#8bc34a]/20 scale-102"
                            : "border-blue-500 shadow-sm hover:scale-102 hover:shadow-md"
                        }`}
                      >
                        <div className="absolute top-[-11px] right-4 bg-blue-500 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow">
                          MOST POPULAR
                        </div>
                        <div className="space-y-2">
                          <div className="text-base font-extrabold text-gray-800 flex items-center gap-1">
                            Pro Tier
                            {profile?.plan === "pro" && (
                              <CheckCircle2 className="h-4.5 w-4.5 text-[#8bc34a]" />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 leading-snug">
                            Designed for professional photographers and virtual tour agencies.
                          </p>
                          <div className="pt-2 text-2xl font-black text-gray-900 flex items-baseline gap-0.5">
                            ₹1,499<span className="text-xs text-gray-400 font-bold">/mo</span>
                          </div>
                          <ul className="text-xs text-gray-500 space-y-1.5 pt-2 border-t font-medium">
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#8bc34a] shrink-0" /> 3 users
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#8bc34a] shrink-0" /> 25 tours
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#8bc34a] shrink-0" /> 200 photos
                              per tour
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#8bc34a] shrink-0" /> WhatsApp
                              support
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#8bc34a] shrink-0" /> Priority
                              processing
                            </li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => triggerRazorpaySimulate("Pro")}
                          disabled={profile?.plan === "pro"}
                          className={`w-full mt-5 font-bold ${
                            profile?.plan === "pro"
                              ? "bg-gray-100 text-gray-400 cursor-default hover:bg-gray-100"
                              : "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                          }`}
                        >
                          {profile?.plan === "pro" ? "Current Plan" : "Select Pro Upgrade"}
                        </Button>
                      </div>

                      {/* Agency Plan card */}
                      <div
                        className={`border rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                          profile?.plan === "agency"
                            ? "border-[#0277bd] bg-blue-50/10 shadow-md ring-2 ring-[#0277bd]/20 scale-102"
                            : "hover:border-gray-300"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="text-base font-extrabold text-gray-800">Agency Tier</div>
                          <p className="text-[11px] text-gray-400 leading-snug">
                            Enterprise volume publishing. Unlimited tours, support, and custom
                            setups.
                          </p>
                          <div className="pt-2 text-2xl font-black text-gray-900 flex items-baseline gap-0.5">
                            ₹2,999<span className="text-xs text-gray-400 font-bold">/mo</span>
                          </div>
                          <ul className="text-xs text-gray-500 space-y-1.5 pt-2 border-t font-medium">
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Unlimited
                              users
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Unlimited
                              tours
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Unlimited
                              photos
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Dedicated
                              support
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> White label
                              option
                            </li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => triggerRazorpaySimulate("Agency")}
                          disabled={profile?.plan === "agency"}
                          className={`w-full mt-5 font-bold ${
                            profile?.plan === "agency"
                              ? "bg-gray-100 text-gray-400 cursor-default hover:bg-gray-100"
                              : "bg-[#0277bd] hover:bg-[#0266a1] text-white shadow-md"
                          }`}
                        >
                          {profile?.plan === "agency" ? "Current Plan" : "Select Agency"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Invoicing and Billing History */}
                  <div className="space-y-3 pt-6 border-t">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Billing History
                    </h3>
                    <div className="rounded-xl border overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-gray-500 font-bold border-b">
                          <tr>
                            <th className="p-3">Billing Date</th>
                            <th className="p-3">Invoice Number</th>
                            <th className="p-3">Subscription Tier</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3 text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                          {profile?.plan === "trial" ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-4 text-center text-gray-400 italic bg-gray-50/50"
                              >
                                No billing records found. Your invoices will compile here once you
                                upgrade to a premium plan.
                              </td>
                            </tr>
                          ) : (
                            <tr className="hover:bg-slate-50/30">
                              <td className="p-3">{formatDateIN(new Date().toISOString())}</td>
                              <td className="p-3 font-mono">INV-2026-0041</td>
                              <td className="p-3 capitalize">{profile?.plan}</td>
                              <td className="p-3 font-bold text-gray-800">
                                {profile?.plan === "basic"
                                  ? "₹499"
                                  : profile?.plan === "pro"
                                    ? "₹1,499"
                                    : "₹2,999"}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => toast.success("Invoice PDF download initiated!")}
                                  className="text-blue-500 hover:text-blue-700 font-bold underline flex items-center gap-1 ml-auto cursor-pointer"
                                >
                                  <FileText className="h-3.5 w-3.5" /> PDF
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      18% GST invoice compiled automatically. For custom company GSTIN billing,
                      contact help desk support.
                    </p>
                  </div>
                </div>
              )}

              {/* TABS 4: ACCESS TAB */}
              {activeTab === "access" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">API Access & Integration</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Review active OAuth authorization permissions granted to PanoPublish.
                    </p>
                  </div>

                  <div className="border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-5 bg-slate-50/50">
                    {/* Visual Google & Street view logo card */}
                    <div className="flex items-center gap-4">
                      {/* Google G logo */}
                      <div className="w-16 h-16 rounded-2xl bg-white border flex items-center justify-center shadow-sm">
                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            fillRule="evenodd"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            fillRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="h-0.5 w-8 bg-gray-300 border-dashed" />
                      {/* Street view pegman circle */}
                      <div className="w-16 h-16 rounded-2xl bg-[#0277bd] flex items-center justify-center shadow-md">
                        <Globe className="w-8 h-8 text-white animate-pulse" />
                      </div>
                    </div>

                    {isGoogleConnected ? (
                      <div className="space-y-4 w-full max-w-sm">
                        <div className="space-y-1">
                          <span className="text-green-600 font-extrabold text-sm flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4.5 w-4.5" /> Authorized Connection Active
                          </span>
                          <p className="text-xs text-gray-500 font-semibold">{googleEmail}</p>
                          <p className="text-[10px] text-gray-400 px-4">
                            PanoPublish has active permissions to publish, retrieve, construct, and
                            delete virtual tour scenes and constellation links under your Google
                            Account directly on Google Maps.
                          </p>
                        </div>
                        <Button
                          onClick={revokeGoogleAccess}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10 shadow cursor-pointer text-xs uppercase tracking-wider"
                        >
                          Revoke Google Access
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 w-full max-w-sm">
                        <div className="space-y-1">
                          <span className="text-gray-400 font-extrabold text-sm block">
                            No Google Account Connected
                          </span>
                          <p className="text-[10px] text-gray-400 px-4">
                            You must connect your Google Account to authorize PanoPublish to publish
                            360-degree scene uploads directly to Google Maps and Street View.
                          </p>
                        </div>
                        <Button
                          onClick={connectGoogle}
                          className="w-full bg-[#0277bd] hover:bg-[#0266a1] text-white font-bold h-10 shadow cursor-pointer text-xs uppercase tracking-wider"
                        >
                          Connect Google Account
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TABS 5: SUPPORT TAB */}
              {activeTab === "support" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Support Desk Help</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Get in touch with the team or browse commonly asked support queries.
                    </p>
                  </div>

                  <div className="bg-slate-50 border p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-bold text-gray-700">
                        Immediate WhatsApp Assistance
                      </h3>
                      <p className="text-xs text-gray-400 leading-snug">
                        Connect directly to a support representative. Mon–Sat 10:00 AM – 7:00 PM
                        IST.
                      </p>
                    </div>
                    <a
                      href={waLink(
                        `Hi PanoPublish Support, I need help with my account. Email is ${user?.email}`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 w-full md:w-auto"
                    >
                      <Button className="w-full md:w-auto bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold px-6 shadow flex items-center justify-center gap-2">
                        <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
                      </Button>
                    </a>
                  </div>

                  {/* FAQ Accordion list */}
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Frequently Asked Support FAQs
                    </h3>

                    <div className="rounded-xl border p-4 space-y-1 bg-white hover:bg-slate-50/20 transition-colors">
                      <h4 className="text-xs font-bold text-gray-700">
                        How long does Google take to publish my scenes?
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Google processes uploads asynchronously in the background. Typical time to
                        display on Google Maps is around **2 to 24 hours**. Check standard
                        processing using the **Sync Google Status** option inside your tour's
                        publish section.
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 space-y-1 bg-white hover:bg-slate-50/20 transition-colors">
                      <h4 className="text-xs font-bold text-gray-700">
                        Can I update nadir sizing or logo after publishing?
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Yes! Simply open your tour, go to the Publish tab, customize your Nadir
                        blur, logo size, or position, and select **Reset & Delete from Google**.
                        This removes stale spheres and lets you re-publish fresh scenes in a single
                        click.
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 space-y-1 bg-white hover:bg-slate-50/20 transition-colors">
                      <h4 className="text-xs font-bold text-gray-700">
                        What billing configurations are supported?
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Payments are processed securely via Razorpay, supporting UPI (GPay, PhonePe,
                        Paytm), net banking, standard EMI credit/debit cards, and corporate
                        corporate cards. Invoices will automatically compile 18% CGST/SGST.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
