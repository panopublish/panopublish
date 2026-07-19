import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { customSignIn, customResetPasswordRequest } from "@/lib/auth-server";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — PanoPublish" },
      {
        name: "description",
        content:
          "Sign in to your PanoPublish dashboard to manage your virtual tours, map connections, custom nadir settings, and client profiles.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [step, setStep] = useState<"login" | "forgot">("login");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await customSignIn({ data: { email, password } });
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
      toast.error("Signin failed");
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingReset(true);
    const res = await customResetPasswordRequest({ data: { email: email.trim() } });
    setSendingReset(false);
    
    if (res?.error) {
      toast.error(res.error.message);
      return;
    }
    
    toast.success("A password reset token has been printed to the server logs! (Custom Auth reset is active)");
    setStep("login");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <SEO
        title={step === "login" ? "Sign In" : "Reset Password"}
        description="Sign in to your PanoPublish dashboard to manage your virtual tours, map connections, custom nadir settings, and client profiles."
        breadcrumbs={[
          { name: "Home", url: "https://app.panopublish.com/" },
          { name: "Login", url: "https://app.panopublish.com/login" },
        ]}
      />
      <div className="hidden md:flex gradient-hero text-primary-foreground p-10 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo logoClassName="h-8 w-8" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold font-serif">Welcome back.</h2>
          <p className="mt-2 opacity-90">
            Manage your 360° Google Street View tours from one dashboard.
          </p>
        </div>
        <div className="text-xs opacity-75">Made with ❤️ in India</div>
      </div>
      <div className="flex items-center justify-center p-6">
        {step === "login" ? (
          <form onSubmit={submit} className="w-full max-w-sm space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">Sign in to PanoPublish</h1>
              <p className="text-sm text-muted-foreground mt-1">
                New to PanoPublish?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                className="h-11 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setStep("forgot")}
                  className="text-xs text-primary hover:underline font-semibold focus:outline-none cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                required
                className="h-11 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-md mt-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="w-full max-w-sm space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">Reset password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                required
                className="h-11 bg-gray-50/50 rounded-xl focus-visible:ring-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-md mt-2 cursor-pointer"
              disabled={sendingReset}
            >
              {sendingReset ? "Sending link…" : "Send Reset Link"}
            </Button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep("login")}
                className="text-sm text-muted-foreground hover:text-foreground font-semibold focus:outline-none cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
