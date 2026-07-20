import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  customSignIn,
  customResetPasswordRequest,
  customVerifyResetCode,
  customUpdatePassword,
} from "@/lib/auth-server";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { Eye, EyeOff, Mail, Lock, User, KeyRound, Check } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — PanoPublish" },
      { name: "description", content: "Sign in to your PanoPublish dashboard." },
    ],
  }),
  component: Login,
});

type Step = "login" | "forgot-email" | "forgot-otp" | "forgot-newpass";

function Login() {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Multi-step state
  const [step, setStep] = useState<Step>("login");
  const [pendingUserId, setPendingUserId] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  // OTP fields
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown
  const [resendCountdown, setResendCountdown] = useState(0);

  // Forgot password
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const startResendCountdown = () => setResendCountdown(60);

  // ── Login submit ─────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await customSignIn({ data: { identifier: identifier.trim(), password } });
    setLoading(false);

    if (res?.error) {
      toast.error(res.error.message);
      return;
    }

    if (res?.data?.session) {
      setSession(res.data.session);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Sign in failed. Please try again.");
    }
  };

  // ── OTP input handling ───────────────────────────────────────────────────
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



  // ── Forgot password – send OTP ────────────────────────────────────────────
  const submitForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingReset(true);
    const res = await customResetPasswordRequest({ data: { email: resetEmail.trim() } });
    setSendingReset(false);
    if (res?.error) { toast.error(res.error.message); return; }
    setPendingUserId((res.data as any)?.userId || "");
    setPendingEmail(resetEmail.trim());
    startResendCountdown();
    setOtp(["", "", "", "", "", ""]);
    setStep("forgot-otp");
    toast.success("Check your email for the reset code.");
  };

  // ── Forgot password – verify OTP ──────────────────────────────────────────
  const submitForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { toast.error("Please enter all 6 digits"); return; }
    setVerifyingOtp(true);
    const res = await customVerifyResetCode({ data: { userId: pendingUserId, code: otpCode } });
    setVerifyingOtp(false);
    if (res?.error) { toast.error(res.error.message); return; }
    setResetToken((res.data as any)?.resetToken || "");
    setStep("forgot-newpass");
  };

  // ── Forgot password – resend OTP ──────────────────────────────────────────
  const resendResetCode = async () => {
    setResendingCode(true);
    const res = await customResetPasswordRequest({ data: { email: pendingEmail } });
    setResendingCode(false);
    if (res?.error) { toast.error(res.error.message); return; }
    toast.success("New reset code sent.");
    startResendCountdown();
    setOtp(["", "", "", "", "", ""]);
    otpRefs.current[0]?.focus();
  };

  // ── Forgot password – set new password ───────────────────────────────────
  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPassword(true);
    const res = await customUpdatePassword({ data: { token: resetToken, password: newPassword } });
    setSavingPassword(false);
    if (res?.error) { toast.error(res.error.message); return; }
    toast.success("Password updated! Please sign in.");
    setStep("login");
    setNewPassword(""); setConfirmNewPassword(""); setResetToken("");
  };

  // ── OTP Box Component ─────────────────────────────────────────────────────
  const OtpBoxes = () => (
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
          className="w-11 h-13 text-center text-xl font-bold border-2 rounded-xl bg-gray-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      ))}
    </div>
  );

  const ResendButton = ({ onResend }: { onResend: () => void }) => (
    <div className="text-center">
      {resendCountdown > 0 ? (
        <p className="text-xs text-muted-foreground">Resend code in <strong>{resendCountdown}s</strong></p>
      ) : (
        <button
          type="button"
          onClick={onResend}
          disabled={resendingCode}
          className="text-xs text-primary font-semibold hover:underline focus:outline-none disabled:opacity-50"
        >
          {resendingCode ? "Sending…" : "Resend code"}
        </button>
      )}
    </div>
  );

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <SEO
        title={step === "login" ? "Sign In" : step.startsWith("forgot") ? "Reset Password" : "Verify Email"}
        description="Sign in to your PanoPublish dashboard."
        breadcrumbs={[
          { name: "Home", url: "https://app.panopublish.com/" },
          { name: "Login", url: "https://app.panopublish.com/login" },
        ]}
      />

      {/* Left panel */}
      <div className="hidden md:flex gradient-hero text-primary-foreground p-10 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo logoClassName="h-8 w-8" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold font-serif">Welcome back.</h2>
          <p className="mt-2 opacity-90">Manage your 360° Google Street View tours from one dashboard.</p>
        </div>
        <div className="text-xs opacity-75">Made with ❤️ in India</div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6">

        {/* ── SIGN IN ───────────────────────────────────────────────────── */}
        {step === "login" && (
          <form onSubmit={submit} className="w-full max-w-sm space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Sign in to PanoPublish</h1>
              <p className="text-sm text-muted-foreground mt-1">
                New here?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">Create an account</Link>
              </p>
            </div>

            {/* Email or Username */}
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="email@example.com or username"
                  className="h-11 pl-9 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Password with eye toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setStep("forgot-email")}
                  className="text-xs text-primary hover:underline font-semibold focus:outline-none cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="h-11 pl-9 pr-10 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md mt-2"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}


        {/* ── FORGOT PASSWORD – STEP 1: Enter email ────────────────────── */}
        {step === "forgot-email" && (
          <form onSubmit={submitForgotEmail} className="w-full max-w-sm space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Reset password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll send a 6-digit reset code.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="h-11 pl-9 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md"
              disabled={sendingReset}
            >
              {sendingReset ? "Sending code…" : "Send Reset Code"}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => setStep("login")} className="text-sm text-muted-foreground hover:text-foreground font-semibold focus:outline-none">
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD – STEP 2: Enter OTP ──────────────────────── */}
        {step === "forgot-otp" && (
          <form onSubmit={submitForgotOtp} className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 mb-2">
                <KeyRound className="h-7 w-7 text-orange-600" />
              </div>
              <h1 className="text-2xl font-semibold">Enter reset code</h1>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <strong>{pendingEmail}</strong>
              </p>
            </div>
            <OtpBoxes />
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md"
              disabled={verifyingOtp || otpCode.length !== 6}
            >
              {verifyingOtp ? "Verifying…" : "Verify Code"}
            </Button>
            <ResendButton onResend={resendResetCode} />
            <div className="text-center">
              <button type="button" onClick={() => setStep("forgot-email")} className="text-xs text-muted-foreground hover:text-foreground font-medium focus:outline-none">
                ← Try different email
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD – STEP 3: Set new password ───────────────── */}
        {step === "forgot-newpass" && (
          <form onSubmit={submitNewPassword} className="w-full max-w-sm space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-2">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold">Set new password</h1>
              <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="h-11 pl-9 pr-10 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  className="h-11 pl-9 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md"
              disabled={savingPassword}
            >
              {savingPassword ? "Saving…" : "Update Password"}
            </Button>
          </form>
        )}

      </div>
    </div>
  );
}
