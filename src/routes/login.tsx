import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Compass } from "lucide-react";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — TourVista" },
      { name: "description", content: "Sign in to your TourVista dashboard to manage your virtual tours, map connections, custom nadir settings, and client profiles." },
    ],
  }),
  component: Login,
});

function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("rate")) toast.error("Too many attempts, please wait 5 minutes.");
      else toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <SEO
        title="Sign In"
        description="Sign in to your TourVista dashboard to manage your virtual tours, map connections, custom nadir settings, and client profiles."
        breadcrumbs={[
          { name: "Home", url: "https://app.vista360digital.com/" },
          { name: "Login", url: "https://app.vista360digital.com/login" }
        ]}
      />
      <div className="hidden md:flex gradient-hero text-primary-foreground p-10 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Compass className="h-6 w-6" /> TourVista
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Welcome back.</h2>
          <p className="mt-2 opacity-90">Manage your 360° Google Street View tours from one dashboard.</p>
        </div>
        <div className="text-xs opacity-75">Made with ❤️ in India</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Sign in to TourVista</h1>
            <p className="text-sm text-muted-foreground mt-1">New to TourVista? <Link to="/signup" className="text-primary font-medium">Create an account</Link></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}
