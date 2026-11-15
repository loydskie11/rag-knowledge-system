import React, { forwardRef } from "react";

interface TemplatePreviewProps {
  html: string;
  title: string;
  orientation?: "portrait" | "landscape";
}

export const TemplatePreview = forwardRef<HTMLIFrameElement, TemplatePreviewProps>(function TemplatePreview({ html, title, orientation = "portrait" }, ref) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Document preview</p>
          <p className="text-xs text-gray-500">Isolated, script-disabled rendering</p>
        </div>
        <span className="text-xs capitalize text-gray-500">{orientation}</span>
      </div>
      <div className="overflow-auto p-3 sm:p-5">
        <iframe
          ref={ref}
          title={`${title} preview`}
          srcDoc={html}
          sandbox="allow-same-origin allow-modals"
          referrerPolicy="no-referrer"
          className={`mx-auto block min-h-[720px] border-0 bg-white shadow-md ${orientation === "landscape" ? "w-[1056px]" : "w-[816px]"}`}
        />
      </div>
    </div>
  );
});
