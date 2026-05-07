import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageCircle, Download, FileText } from "lucide-react";
import { waLink, formatINR, formatDateIN } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TourVista" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name: string | null; plan: string; trial_ends_at: string | null; dark_mode: boolean } | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,plan,trial_ends_at,dark_mode").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data as any); setName(data?.name ?? "");
      if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", !!data?.dark_mode);
    });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const toggleDark = async (val: boolean) => {
    if (!user) return;
    document.documentElement.classList.toggle("dark", val);
    setProfile((p) => p ? { ...p, dark_mode: val } : p);
    await supabase.from("profiles").update({ dark_mode: val }).eq("id", user.id);
  };

  return (
    <AppShell title="Settings" breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]}>
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Account</h2>
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="flex justify-between items-center pt-2">
            <Button onClick={saveName}>Save changes</Button>
            <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>Sign out</Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Current plan</div>
              <div className="text-xl font-semibold capitalize">{profile?.plan ?? "trial"}</div>
              {profile?.trial_ends_at && profile.plan === "trial" && (
                <div className="text-xs text-muted-foreground mt-0.5">Trial ends {formatDateIN(profile.trial_ends_at)}</div>
              )}
            </div>
            <span className="rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">Active</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => toast.info("Razorpay checkout opens here.")}>Upgrade Plan</Button>
            <Button variant="outline" onClick={() => toast.info("Cancellation form opens here.")}>Cancel Subscription</Button>
          </div>
          <p className="text-xs text-muted-foreground">Payments secured by Razorpay • UPI • Cards • Net Banking • EMI</p>
        </section>

        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Billing history</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr><th className="p-2">Date</th><th className="p-2">Invoice</th><th className="p-2">Plan</th><th className="p-2">Amount</th><th></th></tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-2 text-muted-foreground" colSpan={5}>No invoices yet. Your first invoice will appear here after upgrade.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> GST invoices auto-generated at 18% with your GSTIN.</p>
        </section>

        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Support</h2>
          <p className="text-sm text-muted-foreground">Talk to a human on WhatsApp, Mon–Sat 10am–7pm IST.</p>
          <a href={waLink(`Hi, I need help with TourVista — my account email is ${user?.email}`)} target="_blank" rel="noreferrer">
            <Button className="bg-whatsapp text-white hover:bg-whatsapp/90"><MessageCircle className="h-4 w-4 mr-1" /> Chat on WhatsApp</Button>
          </a>
        </section>

        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Dark mode</div>
              <div className="text-xs text-muted-foreground">Easier on the eyes at night.</div>
            </div>
            <Switch checked={!!profile?.dark_mode} onCheckedChange={toggleDark} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
