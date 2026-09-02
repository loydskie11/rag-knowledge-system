import React from "react";
import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF4E5] border border-[#FFE0B2] flex items-center justify-center shadow-xs">
          <Loader2 className="w-6 h-6 text-[#DD7230] animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-gray-800">Loading module...</p>
        <p className="text-xs text-gray-400">CTU Argao Knowledge System</p>
      </div>
    </div>
  );
}

export default PageLoader;
