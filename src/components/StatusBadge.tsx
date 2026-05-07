import { CheckCircle2, Loader2, XCircle, AlertCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type Status = "draft" | "uploaded" | "processing" | "published" | "partial" | "rejected";

const map: Record<Status, { label: string; cls: string; icon: React.ElementType; spin?: boolean }> = {
  draft:      { label: "Draft",      cls: "bg-muted text-muted-foreground", icon: AlertCircle },
  uploaded:   { label: "Uploaded",   cls: "bg-info/15 text-info",           icon: Upload },
  processing: { label: "Processing", cls: "bg-warning/20 text-warning-foreground", icon: Loader2, spin: true },
  published:  { label: "Published",  cls: "bg-success/15 text-success",     icon: CheckCircle2 },
  partial:    { label: "Partial",    cls: "bg-warning/20 text-warning-foreground", icon: AlertCircle },
  rejected:   { label: "Rejected",   cls: "bg-destructive/15 text-destructive", icon: XCircle },
};

export function StatusBadge({ status }: { status: Status }) {
  const m = map[status] ?? map.draft;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", m.cls)}>
      <Icon className={cn("h-3.5 w-3.5", m.spin && "animate-spin")} />
      {m.label}
    </span>
  );
}
