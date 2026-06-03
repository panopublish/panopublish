import { Link, useNavigate } from "@tanstack/react-router";
import { Save, Compass, Share2, LogOut, Upload, BarChart2, Star, Link as LinkIcon, MapPin, Globe } from "lucide-react";
import { useState } from "react";
import { HelpModal } from "./HelpModal";
import { toast } from "sonner";

interface TourStepsNavProps {
  tourId: string;
  activeTab: "location" | "upload" | "connections" | "publish" | "analytics" | "custom";
  onSave?: () => void | Promise<void>;
  onNadir?: () => void;
  onShare?: () => void;
  onExit?: () => void;
}

export function TourStepsNav({ tourId, activeTab, onSave, onNadir, onShare, onExit }: TourStepsNavProps) {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const tabs = [
    { id: "location", label: "Choose location", icon: MapPin, to: `/tours/${tourId}/location` },
    { id: "upload", label: "Upload photos", icon: Upload, to: `/tours/${tourId}` },
    { id: "connections", label: "Build connections", icon: LinkIcon, to: `/tours/${tourId}/connections` },
    { id: "publish", label: "Publish to Google", icon: Globe, to: `/tours/${tourId}/publish` },
    { id: "analytics", label: "Analytics", icon: BarChart2, to: `/tours/${tourId}/analytics` },
  ];

  return (
    <>
      <div className="flex flex-col items-center mt-4 mb-4">
        {/* Main Tabs */}
        <div className="bg-[#e4e9ee] rounded-b-full px-8 py-2 flex items-center shadow-inner mt-[-16px]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                to={tab.to}
                className={`flex items-center gap-2 px-6 py-2 font-medium transition-colors ${
                  isActive 
                    ? "text-[#0277bd]" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Floating Action Bar */}
        <div className="bg-[#0277bd] text-white rounded-full px-6 py-2 flex items-center gap-6 mt-4 shadow-md">
          <button 
            onClick={async () => {
              if (onSave) {
                await onSave();
              } else {
                toast.success("Tour saved successfully!");
              }
            }}
            className="hover:text-gray-200 transition-colors" 
            title="Save"
          >
            <Save className="h-5 w-5" />
          </button>
          <button 
            onClick={() => {
              if (onNadir) {
                onNadir();
              } else {
                navigate({ to: "/tours/$tourId/publish", params: { tourId } });
              }
            }}
            className="hover:text-gray-200 transition-colors" 
            title="Nadir"
          >
            <Compass className="h-5 w-5" />
          </button>
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
            className="hover:text-gray-200 transition-colors" 
            title="Share Preview"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button 
            onClick={() => {
              if (onExit) {
                onExit();
              } else {
                navigate({ to: "/tours" });
              }
            }}
            className="hover:text-gray-200 transition-colors" 
            title="Exit"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Info Bar */}
        <div className="w-full max-w-4xl bg-[#e3f2fd] text-[#0277bd] text-sm py-2 px-4 mt-4 rounded-md flex justify-center items-center gap-2">
          <span>We've updated constellations.</span>
          <button 
            onClick={() => setShowHelp(true)}
            className="font-semibold underline flex items-center gap-1 hover:text-[#01579b]"
          >
            Need help ?
          </button>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}

