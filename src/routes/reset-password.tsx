import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Compass, Eye, EyeOff, Lock } from "lucide-react";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — TourVista" },
      { name: "description", content: "Reset your TourVista account password securely." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Form submission handler
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim()
      });

      if (error) {
        toast.error(error.message || "Failed to update password. Please try again.");
        return;
      }

      toast.success("Password updated successfully! Please sign in with your new password.");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f4f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-t-transparent border-[#0277bd] rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // If the user is not authenticated (meaning they didn't click a valid link or it has expired)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f2f4f8] bg-gradient-to-br from-[#0277bd]/5 to-[#8bc34a]/5">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Invalid or Expired Link</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            This password reset link is invalid, expired, or has already been used. Please request a new password reset link from the login page.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full h-11 bg-[#0277bd] hover:bg-[#0266a1] text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <SEO
        title="Reset Password"
        description="Reset your TourVista account password securely."
        breadcrumbs={[
          { name: "Home", url: "https://app.vista360digital.com/" },
          { name: "Reset Password", url: "https://app.vista360digital.com/reset-password" }
        ]}
      />
      <div className="hidden md:flex gradient-hero text-primary-foreground p-10 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Compass className="h-6 w-6" /> TourVista
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Secure your account.</h2>
          <p className="mt-2 opacity-90">Please enter a new password to recover access to your dashboard.</p>
        </div>
        <div className="text-xs opacity-75">Made with ❤️ in India</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleReset} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new secure password for your account.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#0277bd] hover:bg-[#0266a1] text-white rounded-xl font-bold transition-all shadow-md mt-2 cursor-pointer flex items-center justify-center gap-2"
            disabled={resetting}
          >
            {resetting ? (
              <>
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Updating Password…
              </>
            ) : "Save Password"}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground font-semibold"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
