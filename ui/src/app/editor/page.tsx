"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Film, Loader2, FolderOpen, Play, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toMediaUrl } from "@/lib/utils";

const ClipEditor = lazy(() =>
  import("@/components/editor/ClipEditor").then((mod) => ({ default: mod.ClipEditor }))
);

interface ClipOption {
  runId: string;
  momentIndex: number;
  title: string;
  viralityScore: number;
  durationSeconds: number;
  category: string;
  hookText?: string;
  hookDurationSeconds?: number;
  filePath: string;
  rawFilePath?: string;
  words: Array<{ word: string; startMs: number; endMs: number }>;
}

interface ActiveClip {
  runId: string;
  clipIndex: number;
  clipTitle: string;
  videoSrc: string;
  durationSec: number;
  words: Array<{ word: string; startMs: number; endMs: number }>;
  hookText?: string;
  hookDurationSeconds?: number;
}

function scoreColor(s: number) {
  return s >= 8 ? "text-[#30D158]" : s >= 6 ? "text-[#FF9F0A]" : "text-white/40";
}

export default function EditorPage() {
  const [captionMode, setCaptionMode] = useState<"overlay" | "burn-in">("overlay");
  const [mounted, setMounted] = useState(false);
  const [activeClip, setActiveClip] = useState<ActiveClip | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [clips, setClips] = useState<ClipOption[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.captionMode) setCaptionMode(d.captionMode); })
      .catch(() => {});
  }, []);

  const loadClips = useCallback(async () => {
    setLoadingClips(true);
    try {
      const res = await fetch("/api/runs?include=manifests");
      const data = await res.json();
      const runs = (Array.isArray(data) ? data : []).filter(
        (r: { status: string; manifest?: { clips?: unknown[] } }) => r.status === "complete" && r.manifest?.clips?.length
      );
      const all: ClipOption[] = runs.flatMap((run: { runId: string; manifest: { clips: Array<{ momentIndex: number; title: string; durationSeconds: number; filePath: string; rawFilePath?: string }>; moments: Array<{ index: number; title: string; viralityScore: number; category: string; hookText?: string; hookDurationSeconds?: number }>; wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }> } }) => {
        if (!run.manifest?.clips || !run.manifest?.moments) return [];
        return run.manifest.clips.map((clip) => {
          const moment = run.manifest.moments.find((m) => m.index === clip.momentIndex);
          return {
            runId: run.runId,
            momentIndex: clip.momentIndex,
            title: moment?.title ?? clip.title,
            viralityScore: moment?.viralityScore ?? 0,
            durationSeconds: clip.durationSeconds,
            category: moment?.category ?? "",
            hookText: moment?.hookText,
            hookDurationSeconds: moment?.hookDurationSeconds,
            filePath: clip.filePath,
            rawFilePath: clip.rawFilePath,
            words: run.manifest.wordTimestamps ?? [],
          };
        });
      });
      all.sort((a, b) => b.viralityScore - a.viralityScore);
      setClips(all);
    } catch { setClips([]); }
    setLoadingClips(false);
  }, []);

  const selectClip = (clip: ClipOption) => {
    const hasRaw = !!clip.rawFilePath;
    const effectiveMode = captionMode === "overlay" && !hasRaw ? "burn-in" : captionMode;
    const sourcePath = effectiveMode === "overlay" ? (clip.rawFilePath ?? clip.filePath) : clip.filePath;

    setActiveClip({
      runId: clip.runId,
      clipIndex: clip.momentIndex,
      clipTitle: clip.title,
      videoSrc: toMediaUrl(sourcePath),
      durationSec: clip.durationSeconds,
      words: clip.words,
      hookText: clip.hookText,
      hookDurationSeconds: clip.hookDurationSeconds,
    });
    setShowPicker(false);
  };

  const openPicker = () => {
    if (clips.length === 0) loadClips();
    setShowPicker(true);
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden p-4 text-white relative">

      {/* Clip picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
          <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-2xl border border-white/10 ring-1 ring-white/5 shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
              <h3 className="text-[14px] font-semibold text-white/90">Choose a clip to edit</h3>
              <button onClick={() => setShowPicker(false)} className="text-white/30 hover:text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-3 space-y-1">
              {loadingClips && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-white/40" />
                </div>
              )}
              {!loadingClips && clips.length === 0 && (
                <div className="text-center py-8">
                  <Film size={24} className="text-white/20 mx-auto mb-2" />
                  <p className="text-[13px] text-white/40">No clips available</p>
                  <p className="text-[11px] text-white/25 mt-1">Process a video from chat first</p>
                </div>
              )}
              {clips.map((clip) => (
                <button
                  key={`${clip.runId}-${clip.momentIndex}`}
                  onClick={() => selectClip(clip)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#2A2A2C] transition-colors text-left cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0A84FF]/10 flex items-center justify-center shrink-0 group-hover:bg-[#0A84FF]/20 transition-colors">
                    <Play size={14} className="text-[#0A84FF] ml-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/90 truncate">{clip.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock size={9} />{Math.round(clip.durationSeconds)}s</span>
                      <Badge variant="secondary" className="text-[9px]">{clip.category}</Badge>
                    </div>
                  </div>
                  <span className={`text-[14px] font-bold tabular-nums ${scoreColor(clip.viralityScore)}`}>
                    {clip.viralityScore.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor — always rendered, shows empty state in player area when no clip */}
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
            runId={activeClip?.runId ?? ""}
            clipIndex={activeClip?.clipIndex ?? 0}
            clipTitle={activeClip?.clipTitle ?? "Untitled"}
            videoSrc={activeClip?.videoSrc ?? ""}
            durationSec={activeClip?.durationSec ?? 30}
            words={activeClip?.words ?? []}
            hookText={activeClip?.hookText}
            hookDurationSeconds={activeClip?.hookDurationSeconds}
            captionMode={captionMode}
            onClose={() => setActiveClip(null)}
            onChooseMedia={openPicker}
          />
        </Suspense>
      </div>
    </div>
  );
}
