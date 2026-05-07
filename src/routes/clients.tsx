import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDateIN } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients — TourVista" }] }),
  component: ClientsPage,
});

type Client = { id: string; name: string; business_type: string | null; phone: string | null; city: string | null; address: string | null; created_at: string; tour_count?: number };

const BUSINESS_TYPES = ["Hotel", "Restaurant", "Showroom", "Hospital", "College", "Other"];

function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", business_type: "Hotel", phone: "", city: "", address: "" });

  const load = async () => {
    if (!user) return;
    const { data: cs } = await supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: tours } = await supabase.from("tours").select("client_id").eq("user_id", user.id);
    const counts = new Map<string, number>();
    (tours ?? []).forEach((t) => { if (t.client_id) counts.set(t.client_id, (counts.get(t.client_id) ?? 0) + 1); });
    setClients((cs ?? []).map((c) => ({ ...c, tour_count: counts.get(c.id) ?? 0 })));
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", business_type: "Hotel", phone: "", city: "", address: "" }); setOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, business_type: c.business_type ?? "Other", phone: c.phone ?? "", city: c.city ?? "", address: c.address ?? "" }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) { toast.error("Name is required"); return; }
    if (editing) {
      const { error } = await supabase.from("clients").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Client updated");
    } else {
      const { error } = await supabase.from("clients").insert({ ...form, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Client added");
    }
    setOpen(false); load();
  };

  const remove = async (c: Client) => {
    if (!confirm(`Delete client "${c.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Client deleted"); load();
  };

  return (
    <AppShell title="Clients" breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Clients" }]}>
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
      </div>

      {clients === null ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : clients.length === 0 ? (
        <EmptyState icon={Users} title="No clients yet" description="Add your first client to start creating tours."
          action={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">City</th>
                <th className="p-3 font-medium">Tours</th>
                <th className="p-3 font-medium">Added</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.business_type ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.city ?? "—"}</td>
                  <td className="p-3">{c.tour_count}</td>
                  <td className="p-3 text-muted-foreground">{formatDateIN(c.created_at)}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit client" : "Add new client"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Business type</Label>
              <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Add client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
