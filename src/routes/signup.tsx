import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { customSignUp, customVerifyEmail, customResendVerification } from "@/lib/auth-server";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Compass,
  Eye,
  EyeOff,
  User,
  Building2,
  Mail,
  Lock,
  Check,
  AlertCircle,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

// ─── OTP state helpers ───────────────────────────────────────────────────────

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — PanoPublish" },
      {
        name: "description",
        content:
          "Create your PanoPublish account to start managing virtual tours, connections, nadir settings, and client profiles.",
      },
    ],
  }),
  component: Signup,
});

function Signup() {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );

  // Email verification state
  const [verifyState, setVerifyState] = useState<{ required: boolean; userId: string; email: string } | null>(null);
  const [otp, setOtp] = useState(["\u0000", "\u0000", "\u0000", "\u0000", "\u0000", "\u0000"].map(() => ""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  // Check username uniqueness reactively
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus("idle");
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username.trim().toLowerCase())
          .maybeSingle();

        if (error) {
          console.error("Username check error (column may not exist yet):", error);
          // Fallback to available if migration hasn't been run locally
          setUsernameStatus("available");
          return;
        }

        if (data) {
          setUsernameStatus("taken");
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        console.error("Failed to check username availability:", err);
        setUsernameStatus("available");
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (usernameStatus === "taken") {
      toast.error("Please choose a different username");
      return;
    }

    setLoading(true);

    try {
      // Small delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      // ignore
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const res = await customSignUp({
      data: {
        email,
        password,
        metadata: {
          name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
          username: username.toLowerCase().trim(),
        },
      },
    });

    setLoading(false);

    if (res?.error) {
      toast.error(res.error.message);
      return;
    }

    if (res?.data?.verificationRequired) {
      setVerifyState({
        required: true,
        userId: (res.data as any).userId,
        email: (res.data as any).email || email,
      });
      setResendCountdown(60);
      toast.success("Account created! Check your email for a verification code.");
      return;
    }

    // Legacy: direct session (should not happen now, but keep as fallback)
    const signupData = res?.data as any;
    if (signupData?.session) {
      setSession(signupData.session);
      toast.success("Account created successfully! Welcome.");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Signup failed");
    }
  };

  // OTP input handling
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const otpCode = otp.join("");

  const submitVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { toast.error("Please enter all 6 digits"); return; }
    setVerifyingOtp(true);
    const res = await customVerifyEmail({ data: { userId: verifyState!.userId, code: otpCode } });
    setVerifyingOtp(false);
    if (res?.error) { toast.error(res.error.message); return; }
    if (res?.data?.session) {
      setSession(res.data.session);
      toast.success("Email verified! Welcome to PanoPublish 🎉");
      navigate({ to: "/dashboard" });
    }
  };

  const resendVerification = async () => {
    setResendingCode(true);
    const res = await customResendVerification({ data: { userId: verifyState!.userId } });
    setResendingCode(false);
    if (res?.error) { toast.error(res.error.message); return; }
    toast.success("New code sent to " + verifyState!.email);
    setResendCountdown(60);
    setOtp(["", "", "", "", "", ""]);
    otpRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-[#f2f4f8] flex items-center justify-center p-6 bg-gradient-to-br from-[#0277bd]/5 to-[#8bc34a]/5">
      <SEO
        title="Start Free 7-Day Trial"
        description="Create your PanoPublish account today. Publish 360° virtual tours to Google Maps, generate tax invoices, and get WhatsApp support in India."
        breadcrumbs={[
          { name: "Home", url: "https://app.panopublish.com/" },
          { name: "Signup", url: "https://app.panopublish.com/signup" },
        ]}
      />

      {/* ── EMAIL VERIFICATION OTP SCREEN ── */}
      {verifyState?.required && (
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Verify your email</h1>
            <p className="text-sm text-gray-500 mt-1">
              We sent a 6-digit code to <strong>{verifyState.email}</strong>
            </p>
          </div>
          <form onSubmit={submitVerifyEmail} className="w-full space-y-5">
            <div className="flex gap-2 justify-center">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-xl font-bold border-2 rounded-xl bg-gray-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md disabled:opacity-50 transition-all"
            >
              {verifyingOtp ? "Verifying…" : "Verify & Get Started"}
            </button>
          </form>
          <div>
            {resendCountdown > 0 ? (
              <p className="text-xs text-gray-400">Resend code in <strong>{resendCountdown}s</strong></p>
            ) : (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendingCode}
                className="text-xs text-primary font-semibold hover:underline focus:outline-none disabled:opacity-50"
              >
                {resendingCode ? "Sending…" : "Resend code"}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setVerifyState(null)}
            className="text-xs text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ← Back to signup
          </button>
        </div>
      )}

      {/* ── MAIN SIGNUP FORM ── */}
      {!verifyState?.required && (
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col p-8 md:p-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold text-2xl text-[#0277bd] mb-3"
          >
            <Compass className="h-7 w-7 text-[#0277bd]" /> PanoPublish
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Sign up for free</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            To signup please fill out the form below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="firstName"
                className="text-xs font-bold uppercase tracking-wider text-gray-500"
              >
                First Name
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="firstName"
                  required
                  placeholder="John"
                  className="pl-10 h-11 bg-gray-50/50 focus-visible:ring-[#0277bd] border-gray-200 rounded-xl"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="lastName"
                className="text-xs font-bold uppercase tracking-wider text-gray-500"
              >
                Last Name
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="lastName"
                  required
                  placeholder="Doe"
                  className="pl-10 h-11 bg-gray-50/50 focus-visible:ring-[#0277bd] border-gray-200 rounded-xl"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="companyName"
              className="text-xs font-bold uppercase tracking-wider text-gray-500"
            >
              Account Name (e.g. your company name)
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="companyName"
                required
                placeholder="Apex Media Agency"
                className="pl-10 h-11 bg-gray-50/50 focus-visible:ring-[#0277bd] border-gray-200 rounded-xl"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label
              htmlFor="username"
              className="text-xs font-bold uppercase tracking-wider text-gray-500"
            >
              Username
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 select-none">
                @
              </span>
              <Input
                id="username"
                required
                placeholder="johndoe"
                className={`pl-8 pr-10 h-11 bg-gray-50/50 rounded-xl focus-visible:ring-[#0277bd] ${
                  usernameStatus === "taken"
                    ? "border-red-300 focus-visible:ring-red-400"
                    : usernameStatus === "available"
                      ? "border-green-300 focus-visible:ring-green-400"
                      : "border-gray-200"
                }`}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {usernameStatus === "checking" && (
                  <div className="h-4 w-4 border-2 border-t-transparent border-[#0277bd] rounded-full animate-spin" />
                )}
                {usernameStatus === "available" && (
                  <Check className="h-4 w-4 text-green-500 font-bold" />
                )}
                {usernameStatus === "taken" && <AlertCircle className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            {usernameStatus === "taken" && (
              <p className="text-xs text-red-500 font-medium">
                Username is already taken by another user.
              </p>
            )}
            {usernameStatus === "available" && (
              <p className="text-xs text-green-600 font-medium">Username is available!</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wider text-gray-500"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                required
                placeholder="john@example.com"
                className="pl-10 h-11 bg-gray-50/50 focus-visible:ring-[#0277bd] border-gray-200 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-bold uppercase tracking-wider text-gray-500"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-gray-50/50 focus-visible:ring-[#0277bd] border-gray-200 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-bold uppercase tracking-wider text-gray-500"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={6}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-gray-50/50 focus-visible:ring-[#0277bd] border-gray-200 rounded-xl"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#0277bd] hover:bg-[#0266a1] text-white rounded-xl font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            disabled={loading || usernameStatus === "taken"}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Creating Account…
              </>
            ) : (
              "Sign Up"
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center mt-3">
            By signing up, you agree to our{" "}
            <span className="underline cursor-pointer">Terms & Privacy Policy</span>.
          </p>
        </form>

        <div className="border-t border-gray-100 my-6"></div>

        <p className="text-sm text-center text-gray-500 font-medium">
          Already have an account?{" "}
          <Link to="/login" className="text-[#0277bd] font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      )}
    </div>
  );
}
