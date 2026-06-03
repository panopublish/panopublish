import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useState } from "react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState("constellations");

  const tabs = [
    { id: "constellations", label: "⭐ Constellations" },
    { id: "islands", label: "🌿 Islands" },
    { id: "selection", label: "⊞ Selection Tool" },
    { id: "hotkeys", label: "⌨ Hot Keys" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white">
        <div className="flex border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium rounded-t-md ${
                  activeTab === tab.id 
                    ? "bg-white text-[#0277bd] border-t-2 border-[#0277bd] shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8 h-[60vh] overflow-y-auto">
          {activeTab === "constellations" && (
            <div className="grid grid-cols-[300px_1fr] gap-8">
              {/* Left Column - Diagram */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-4">Toolbar Tools</h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">🗺️</div> Select map type</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">🔍</div> Expand/contract map</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">❓</div> Help</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">⊞</div> Selection tool</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">↻</div> Rotate tool</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">👁</div> Toggle constellation labels</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">🔓</div> Unlock all constellations</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">🔒</div> Lock all constellations</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white border rounded flex items-center justify-center shadow-sm">📍</div> Center map to business</div>
                </div>
              </div>

              {/* Right Column - Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FDF8F0] p-4 rounded-xl shadow-sm border border-[#f5e6d3]">
                  <div className="font-bold mb-2">Right click a locked or unlocked connection to DELETE the connection</div>
                </div>
                <div className="bg-[#FDF8F0] p-4 rounded-xl shadow-sm border border-[#f5e6d3]">
                  <div className="font-bold mb-2">Left click on a constellation and drag to move it and all locked connections</div>
                </div>
                <div className="bg-[#FDF8F0] p-4 rounded-xl shadow-sm border border-[#f5e6d3]">
                  <div className="font-bold mb-2">Left click the rotate icon and drag to rotate active constellation</div>
                </div>
                <div className="bg-[#FDF8F0] p-4 rounded-xl shadow-sm border border-[#f5e6d3]">
                  <div className="font-bold mb-2">Holding shift, hover over unconnected constellation to show dotted line. Left click to make connection</div>
                </div>
                <div className="bg-[#FDF8F0] p-4 rounded-xl shadow-sm border border-[#f5e6d3]">
                  <div className="font-bold mb-2">Left click a constellation to navigate to that scene</div>
                </div>

                <div className="col-span-2 mt-4 space-y-2">
                  <h4 className="font-bold text-gray-700">Connection Types</h4>
                  <div className="bg-[#FDF8F0] p-3 rounded flex items-center gap-3">
                    <div className="w-12 h-1 bg-blue-500 relative"><div className="absolute left-0 w-2 h-2 rounded-full bg-red-500 -top-0.5"></div><div className="absolute right-0 w-2 h-2 rounded-full bg-red-500 -top-0.5"></div></div>
                    <span>Unlocked connection</span>
                  </div>
                  <div className="bg-[#FDF8F0] p-3 rounded flex items-center gap-3">
                    <div className="w-8 h-1 bg-blue-800"></div>
                    <span>Locked connection</span>
                  </div>
                  <div className="bg-[#FDF8F0] p-3 rounded flex items-center gap-3">
                    <span>Left click unlocked connection to lock</span>
                  </div>
                  <div className="bg-[#FDF8F0] p-3 rounded flex items-center gap-3">
                    <span>Left click locked connection to unlock</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== "constellations" && (
            <div className="text-gray-500 italic text-center mt-20">Content for {activeTab} coming soon...</div>
          )}
        </div>

        <div className="bg-gray-50 p-4 flex justify-center border-t">
          <button 
            onClick={onClose}
            className="bg-[#0277bd] text-white px-8 py-2 rounded-full font-bold hover:bg-[#01579b] transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
