import { Link, useNavigate } from "@tanstack/react-router";
import {
  Save,
  Compass,
  Share2,
  LogOut,
  Upload,
  BarChart2,
  Star,
  Link as LinkIcon,
  MapPin,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { HelpModal } from "./HelpModal";
import { toast } from "sonner";

interface TourStepsNavProps {
  tourId: string;
  activeTab: "location" | "upload" | "connections" | "publish" | "analytics" | "custom";
  tourType?: string;
  onSave?: () => void | Promise<void>;
  onNadir?: () => void;
  onShare?: () => void;
  onExit?: () => void;
}

export function TourStepsNav({
  tourId,
  activeTab,
  tourType,
  onSave,
  onNadir,
  onShare,
  onExit,
}: TourStepsNavProps) {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  if (typeof window !== "undefined" && tourId && tourType) {
    try {
      sessionStorage.setItem(`tour_type_${tourId}`, tourType);
    } catch (_) {}
  }

  const cachedType =
    typeof window !== "undefined" && tourId
      ? sessionStorage.getItem(`tour_type_${tourId}`)
      : null;

  const effectiveTourType = tourType || cachedType || undefined;

  const tabs = effectiveTourType === "custom"
    ? [
        { id: "upload", label: "Upload photos", icon: Upload, to: `/tours/${tourId}` },
        {
          id: "connections",
          label: "Build connections",
          icon: LinkIcon,
          to: `/tours/${tourId}/connections`,
        },
        { id: "publish", label: "Settings & Export", icon: Globe, to: `/tours/${tourId}/publish` },
      ]
    : [
        { id: "location", label: "Choose location", icon: MapPin, to: `/tours/${tourId}/location` },
        { id: "upload", label: "Upload photos", icon: Upload, to: `/tours/${tourId}` },
        {
          id: "connections",
          label: "Build connections",
          icon: LinkIcon,
          to: `/tours/${tourId}/connections`,
        },
        { id: "publish", label: "Publish to Google", icon: Globe, to: `/tours/${tourId}/publish` },
        { id: "analytics", label: "Analytics", icon: BarChart2, to: `/tours/${tourId}/analytics` },
      ];

  return (
    <>
      <div className="flex flex-col items-center mt-[-8px] mb-1.5 shrink-0">
        {/* Main Tabs */}
        <div className="bg-[#e4e9ee] rounded-b-2xl px-5 py-1 flex items-center shadow-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                to={tab.to}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition-colors ${
                  isActive ? "text-[#0277bd]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Floating Action Bar */}
        <div className="bg-[#0277bd] text-white rounded-full px-4 py-1 flex items-center gap-4 mt-1 shadow-sm">
          <button
            onClick={async () => {
              if (onSave) {
                await onSave();
              } else {
                toast.success("Tour saved successfully!");
              }
            }}
            className="hover:text-gray-200 transition-colors cursor-pointer p-0.5"
            title="Save"
          >
            <Save className="h-4 w-4" />
          </button>
          {effectiveTourType !== "custom" && (
            <button
              onClick={() => {
                if (onNadir) {
                  onNadir();
                } else {
                  navigate({ to: "/tours/$tourId/publish/", params: { tourId } });
                }
              }}
              className="hover:text-gray-200 transition-colors cursor-pointer p-0.5"
              title="Nadir"
            >
              <Compass className="h-4 w-4" />
            </button>
          )}
          {effectiveTourType !== "custom" && (
            <button
              onClick={() => {
                if (onShare) {
                  onShare();
                } else {
                  const url = `/tours/${tourId}/connections?preview=true`;
                  window.open(url, "_blank");
                  toast.success("Opening preview in a new tab!");
                }
              }}
              className="hover:text-gray-200 transition-colors cursor-pointer p-0.5"
              title="Share Preview"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (onExit) {
                onExit();
              } else {
                navigate({ to: "/tours/" });
              }
            }}
            className="hover:text-gray-200 transition-colors cursor-pointer p-0.5"
            title="Exit"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Info Bar - Google Maps/Constellation help (only for gmaps tours) */}
        {effectiveTourType !== "custom" && (
          <div className="w-full max-w-2xl bg-[#e3f2fd] text-[#0277bd] text-[11px] py-1 px-3 mt-1 rounded-md flex justify-center items-center gap-1.5 shadow-xs">
            <span>We've updated constellations.</span>
            <button
              onClick={() => setShowHelp(true)}
              className="font-bold underline flex items-center gap-1 hover:text-[#01579b]"
            >
              Need help ?
            </button>
          </div>
        )}
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
