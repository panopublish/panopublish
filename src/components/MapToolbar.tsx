import React from "react";
import { MapMode } from "../types/panorama";
import {
  Home,
  Lock,
  Unlock,
  Tag,
  RefreshCw,
  Crosshair,
  HelpCircle,
  Maximize2,
  MousePointer2,
  Link as LinkIcon,
  RotateCcw,
  Compass,
  Trash2,
} from "lucide-react";

interface MapToolbarProps {
  mapType: "roadmap" | "satellite" | "hybrid";
  mode: MapMode;
  onMapTypeChange: (type: "roadmap" | "satellite" | "hybrid") => void;
  onModeChange: (mode: MapMode) => void;
  onLockAll: () => void;
  onUnlockAll: () => void;
  onFitBounds: () => void;
  onCenterBusiness: () => void;
  onHelp: () => void;
  onExpand: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  autoAlign: boolean;
  onToggleAutoAlign: () => void;
  onDeleteConnection?: () => void;
  canDeleteConnection?: boolean;
}

export function MapToolbar({
  mapType,
  mode,
  onMapTypeChange,
  onModeChange,
  onLockAll,
  onUnlockAll,
  onFitBounds,
  onCenterBusiness,
  onHelp,
  onExpand,
  showLabels,
  onToggleLabels,
  autoAlign,
  onToggleAutoAlign,
  onDeleteConnection,
  canDeleteConnection = false,
}: MapToolbarProps) {
  return (
    <div className="absolute top-2 left-2 right-2 max-w-[calc(100%-16px)] flex items-center gap-0.5 bg-white/95 backdrop-blur-sm shadow-md rounded p-0.5 text-sm z-10 border overflow-x-auto scrollbar-none">
      <select
        value={mapType}
        onChange={(e) => onMapTypeChange(e.target.value as any)}
        className="bg-transparent font-bold px-1.5 py-0.5 outline-none text-[10px] border-r mr-0.5 cursor-pointer text-slate-700"
      >
        <option value="roadmap">Map</option>
        <option value="satellite">Satellite</option>
        <option value="hybrid">Hybrid</option>
      </select>

      <ToolbarBtn
        icon={<Home className="h-3.5 w-3.5" />}
        title="Center to business"
        onClick={onCenterBusiness}
      />
      <ToolbarBtn
        icon={<RefreshCw className="h-3.5 w-3.5" />}
        title="Fit bounds"
        onClick={onFitBounds}
      />

      <div className="w-px h-3 bg-gray-300 mx-0.5 flex-shrink-0"></div>

      <ToolbarBtn icon={<Lock className="h-3.5 w-3.5" />} title="Lock all" onClick={onLockAll} />
      <ToolbarBtn
        icon={<Unlock className="h-3.5 w-3.5" />}
        title="Unlock all"
        onClick={onUnlockAll}
      />
      <ToolbarBtn
        icon={<Tag className="h-3.5 w-3.5" />}
        title="Toggle Labels"
        onClick={onToggleLabels}
        active={showLabels}
      />

      <div className="w-px h-3 bg-gray-300 mx-0.5 flex-shrink-0"></div>

      <ToolbarBtn
        icon={<MousePointer2 className="h-3.5 w-3.5" />}
        title="Select & Move (V)"
        onClick={() => onModeChange("select")}
        active={mode === "select"}
      />
      <ToolbarBtn
        icon={<LinkIcon className="h-3.5 w-3.5" />}
        title="Connect Nodes (C)"
        onClick={() => onModeChange("connect")}
        active={mode === "connect"}
      />
      <ToolbarBtn
        icon={<Trash2 className="h-3.5 w-3.5" />}
        title="Delete Selected Connection"
        onClick={onDeleteConnection || (() => {})}
        disabled={!canDeleteConnection}
        className={canDeleteConnection ? "text-red-600 hover:bg-red-50" : "text-gray-300"}
      />
      <ToolbarBtn
        icon={<RotateCcw className="h-3.5 w-3.5" />}
        title="Rotate Node (R)"
        onClick={() => onModeChange("rotate")}
        active={mode === "rotate"}
      />

      <div className="w-px h-3 bg-gray-300 mx-0.5 flex-shrink-0"></div>

      <ToolbarBtn
        icon={<Compass className="h-3.5 w-3.5" />}
        title="Auto Align Connections"
        onClick={onToggleAutoAlign}
        active={autoAlign}
      />

      <ToolbarBtn icon={<HelpCircle className="h-3.5 w-3.5" />} title="Help" onClick={onHelp} />

      <button
        onClick={onExpand}
        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white p-1 rounded transition-colors flex items-center justify-center flex-shrink-0"
        title="Expand Map"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ToolbarBtn({
  icon,
  title,
  onClick,
  active = false,
  disabled = false,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1 rounded transition-colors flex items-center justify-center flex-shrink-0 ${
        disabled
          ? "text-gray-300 cursor-not-allowed opacity-50"
          : active
            ? "bg-blue-100 text-blue-700"
            : className || "hover:bg-gray-100 text-gray-700"
      }`}
    >
      {icon}
    </button>
  );
}
