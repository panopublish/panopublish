import { Link } from "@tanstack/react-router";
import { MapPin, Upload, Link2, Send, BarChart3, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const steps: { key: string; label: string; to: string; icon: LucideIcon }[] = [
  { key: "location", label: "Choose location", to: "/tours/$tourId/location", icon: MapPin },
  { key: "upload", label: "Upload photos", to: "/tours/$tourId", icon: Upload },
  { key: "connections", label: "Build connections", to: "/tours/$tourId/connections", icon: Link2 },
  { key: "publish", label: "Publish to Google", to: "/tours/$tourId/publish", icon: Send },
  { key: "analytics", label: "Analytics", to: "/tours/$tourId/analytics", icon: BarChart3 },
];

export function TourStepNav({ tourId, current }: { tourId: string; current: string }) {
  return (
    <div className="mb-6 rounded-xl border bg-card p-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = s.key === current;
          return (
            <Link
              key={s.key}
              to={s.to}
              params={{ tourId }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                active ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${active ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </span>
              <Icon className="h-4 w-4" />
              {s.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
