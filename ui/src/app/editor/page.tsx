"use client";

import { useEffect, useState } from "react";
import { ClipEditor } from "@/components/editor/ClipEditor";

export default function EditorPage() {
  const [captionMode, setCaptionMode] = useState<"overlay" | "burn-in">("overlay");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.captionMode) setCaptionMode(d.captionMode); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 overflow-hidden p-6 text-white">
      <div className="h-full max-w-6xl mx-auto">
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
      </div>
    </div>
  );
}
