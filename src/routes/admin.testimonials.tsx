import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { runD1Query } from "@/lib/d1-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import {
  Plus,
  Star,
  Loader2,
  Trash2,
  ShieldCheck,
  MessageSquareQuote,
} from "lucide-react";

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({
    meta: [
      { title: "Admin — Testimonials | PanoPublish" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTestimonials,
});

const ADMIN_EMAILS = ["vista360gtp@gmail.com", "er.prashantyadav37@gmail.com"];

interface TestimonialRow {
  id: string;
  client_name: string;
  client_company: string | null;
  quote: string;
  rating: number;
  source: string;
  city: string | null;
  service_used: string | null;
  is_featured: number;
  created_at: string;
}

const emptyForm = {
  client_name: "",
  client_company: "",
  quote: "",
  rating: "5",
  source: "whatsapp",
  city: "",
  service_used: "",
  is_featured: false,
};

function AdminTestimonials() {
  const { session, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !ADMIN_EMAILS.includes(user.email))) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  // Load testimonials
  const loadTestimonials = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await runD1Query({
        token: session.access_token,
        table: "testimonials",
        action: "select",
        orderCol: "created_at",
        orderAsc: false,
      });
      if (res.data) setTestimonials(res.data as TestimonialRow[]);
    } catch (err) {
      console.error("Failed to load testimonials", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) loadTestimonials();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;
    if (!form.client_name.trim() || !form.quote.trim()) {
      toast.error("Client name and quote are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await runD1Query({
        token: session.access_token,
        table: "testimonials",
        action: "insert",
        data: {
          id: crypto.randomUUID(),
          client_name: form.client_name.trim(),
          client_company: form.client_company.trim() || null,
          quote: form.quote.trim(),
          rating: Number(form.rating),
          source: form.source,
          city: form.city.trim() || null,
          service_used: form.service_used.trim() || null,
          is_featured: form.is_featured ? 1 : 0,
          created_at: new Date().toISOString(),
        },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("Testimonial added successfully.");
      setForm(emptyForm);
      loadTestimonials();
    } catch (err: any) {
      toast.error(err.message || "Failed to add testimonial.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.access_token) return;
    if (!confirm("Delete this testimonial?")) return;
    try {
      await runD1Query({
        token: session.access_token,
        table: "testimonials",
        action: "delete",
        filters: [{ column: "id", type: "eq", value: id }],
      });
      toast.success("Deleted.");
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete.");
    }
  };

  if (authLoading || !user || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Admin — Testimonials | PanoPublish"
        description="Admin panel for managing client testimonials."
        noIndex
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">
            Testimonials Manager
          </h1>
          <p className="text-xs text-muted-foreground">
            Admin only · Add and manage client testimonials
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-10">
        {/* ADD FORM */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Add New Testimonial
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name */}
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Client Name *</Label>
              <Input
                id="client_name"
                placeholder="e.g. Mehul Patel"
                value={form.client_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_name: e.target.value }))
                }
                required
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label htmlFor="client_company">Company / Business</Label>
              <Input
                id="client_company"
                placeholder="e.g. Hotel Grand, Ahmedabad"
                value={form.client_company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_company: e.target.value }))
                }
              />
            </div>

            {/* Quote */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="quote">Quote *</Label>
              <Textarea
                id="quote"
                placeholder="The client's exact testimonial quote..."
                rows={3}
                value={form.quote}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quote: e.target.value }))
                }
                required
              />
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label htmlFor="rating">Rating</Label>
              <Select
                value={form.rating}
                onValueChange={(v) => setForm((f) => ({ ...f, rating: v }))}
              >
                <SelectTrigger id="rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {"★".repeat(r)} ({r}/5)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="google">Google Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g. Ahmedabad"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </div>

            {/* Service */}
            <div className="space-y-1.5">
              <Label htmlFor="service_used">Service Used</Label>
              <Input
                id="service_used"
                placeholder="e.g. Restaurant Virtual Tour"
                value={form.service_used}
                onChange={(e) =>
                  setForm((f) => ({ ...f, service_used: e.target.value }))
                }
              />
            </div>

            {/* Featured */}
            <div className="space-y-1.5 md:col-span-2 flex items-center gap-2">
              <input
                id="is_featured"
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_featured: e.target.checked }))
                }
                className="h-4 w-4 rounded border accent-primary"
              />
              <Label htmlFor="is_featured" className="cursor-pointer">
                Feature on homepage & service pages
              </Label>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="font-bold">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Testimonial
              </Button>
            </div>
          </form>
        </div>

        {/* TESTIMONIALS TABLE */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b">
            <MessageSquareQuote className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Existing Testimonials ({testimonials.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : testimonials.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">
              No testimonials yet. Add your first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm">
                      <div>{t.client_name}</div>
                      {t.client_company && (
                        <div className="text-xs text-muted-foreground">
                          {t.client_company}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      <p className="line-clamp-2">{t.quote}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3 w-3 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.city ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          t.is_featured
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.is_featured ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
