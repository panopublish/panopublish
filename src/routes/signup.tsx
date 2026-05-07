import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Start free trial — TourVista" }] }),
  component: Signup,
});

function Signup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { name },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined,
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created! Check your email to confirm.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex gradient-hero text-primary-foreground p-10 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg"><Compass className="h-6 w-6" /> TourVista</Link>
        <div>
          <h2 className="text-3xl font-bold">Start your 7-day free trial</h2>
          <p className="mt-2 opacity-90">No credit card required. Cancel anytime.</p>
          <ul className="mt-6 space-y-2 text-sm opacity-95">
            <li>✓ Publish to Google Maps in minutes</li>
            <li>✓ Manage unlimited clients during trial</li>
            <li>✓ WhatsApp support included</li>
          </ul>
        </div>
        <div className="text-xs opacity-75">Made with ❤️ in India</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Already have one? <Link to="/login" className="text-primary font-medium">Sign in</Link></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Start free trial"}</Button>
          <p className="text-xs text-muted-foreground text-center">By signing up you agree to our Terms & Privacy.</p>
        </form>
      </div>
    </div>
  );
}
