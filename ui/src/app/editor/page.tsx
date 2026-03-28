"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { Film, Loader2 } from "lucide-react";

const ClipEditor = lazy(() =>
  import("@/components/editor/ClipEditor").then((mod) => ({ default: mod.ClipEditor }))
);

export default function EditorPage() {
  const [captionMode, setCaptionMode] = useState<"overlay" | "burn-in">("overlay");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.captionMode) setCaptionMode(d.captionMode); })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden p-4 text-white">
      <div className="h-full">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-white/40">
              <Film size={18} />
              <span className="text-[13px] font-medium">Loading editor...</span>
            </div>
          </div>
        }>
          <ClipEditor
            runId=""
            clipIndex={0}
            clipTitle="Untitled"
            videoSrc=""
            durationSec={30}
            words={[]}
            captionMode={captionMode}
            onClose={() => {}}
          />
        </Suspense>
      </div>
    </div>
  );
}
