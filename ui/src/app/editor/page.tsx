"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Film, Loader2, RefreshCw, Play, Clock, ChevronRight, ChevronLeft, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipEditor } from "@/components/editor/ClipEditor";
import { toMediaUrl } from "@/lib/utils";

interface Run {
  runId: string;
  sourceUrl: string;
  status: string;
  startedAt: string;
  manifest?: {
    clips?: Array<{
      momentIndex: number;
      title: string;
      durationSeconds: number;
      filePath: string;
      rawFilePath?: string;
    }>;
    moments?: Array<{
      index: number;
      title: string;
      viralityScore: number;
      hashtags: string[];
      category: string;
      hookText?: string;
      hookDurationSeconds?: number;
    }>;
    wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }>;
  };
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

function scoreColor(score: number): string {
  if (score >= 8) return "text-[#30D158]";
  if (score >= 6) return "text-[#FF9F0A]";
  return "text-white/40";
}

export default function EditorPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClip, setActiveClip] = useState<ActiveClip | null>(null);
  const [captionMode, setCaptionMode] = useState<"overlay" | "burn-in">("overlay");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/runs?include=manifests");
      const data = await res.json();
      setRuns(
        (Array.isArray(data) ? data : []).filter(
          (r: Run) => r.status === "complete" && r.manifest?.clips?.length
        )
      );
    } catch { setRuns([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.captionMode) setCaptionMode(d.captionMode); })
      .catch(() => {});
  }, []);

  // Build flat clip list
  const allClips = runs.flatMap((run) => {
    if (!run.manifest?.clips || !run.manifest?.moments) return [];
    return run.manifest.clips.map((clip) => {
      const moment = run.manifest!.moments!.find((m) => m.index === clip.momentIndex);
      return {
        runId: run.runId,
        momentIndex: clip.momentIndex,
        title: moment?.title ?? clip.title,
        viralityScore: moment?.viralityScore ?? 0,
        durationSeconds: clip.durationSeconds,
        hashtags: moment?.hashtags ?? [],
        category: moment?.category ?? "",
        hookText: moment?.hookText,
        hookDurationSeconds: moment?.hookDurationSeconds,
        filePath: clip.filePath,
        rawFilePath: clip.rawFilePath,
        words: run.manifest!.wordTimestamps ?? [],
      };
    });
  }).sort((a, b) => b.viralityScore - a.viralityScore);

  const openClip = (clip: typeof allClips[0]) => {
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
    setSidebarCollapsed(true);
  };

  // If a clip is active, render the editor full-page
  if (activeClip) {
    return (
      <div className="flex h-screen">
        {/* Clip list sidebar (collapsible) */}
        <div className={`${sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"} transition-all duration-200 border-r border-white/5 bg-[#1C1C1E] flex flex-col shrink-0`}>
          <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
            <span className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Clips</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setSidebarCollapsed(true)}>
              <ChevronLeft size={14} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
            {allClips.map((clip) => (
              <button
                key={`${clip.runId}-${clip.momentIndex}`}
                onClick={() => openClip(clip)}
                className={`w-full text-left rounded-lg px-3 py-2 text-[12px] transition-colors cursor-pointer ${
                  activeClip.clipIndex === clip.momentIndex && activeClip.runId === clip.runId
                    ? "bg-[#0A84FF]/10 text-[#0A84FF]"
                    : "text-white/60 hover:bg-[#2A2A2C] hover:text-white/90"
                }`}
              >
                <p className="font-medium truncate">{clip.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-white/30">{Math.round(clip.durationSeconds)}s</span>
                  <span className={`text-[10px] font-bold ${scoreColor(clip.viralityScore)}`}>{clip.viralityScore.toFixed(1)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Toggle sidebar button when collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-3 left-3 z-50 w-8 h-8 rounded-lg bg-[#2A2A2C] border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-[#3A3A3C] transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Editor fills remaining space */}
        <div className="flex-1 min-w-0">
          <ClipEditor
            runId={activeClip.runId}
            clipIndex={activeClip.clipIndex}
            clipTitle={activeClip.clipTitle}
            videoSrc={activeClip.videoSrc}
            durationSec={activeClip.durationSec}
            words={activeClip.words}
            hookText={activeClip.hookText}
            hookDurationSeconds={activeClip.hookDurationSeconds}
            captionMode={captionMode}
            onClose={() => { setActiveClip(null); setSidebarCollapsed(false); }}
          />
        </div>
      </div>
    );
  }

  // No clip selected — show clip browser
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white/90 mb-1">Editor</h1>
            <p className="text-white/50 text-[13px] font-medium">
              {allClips.length} clip{allClips.length !== 1 ? "s" : ""} — click to open in editor
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadRuns}>
            <RefreshCw size={14} />
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        )}

        {!loading && allClips.length === 0 && (
          <div className="text-center py-20">
            <Clapperboard size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-white/50">No clips to edit</p>
            <p className="text-[13px] text-white/30 mt-1">
              Process a video from chat to generate clips
            </p>
          </div>
        )}

        {!loading && allClips.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {allClips.map((clip, idx) => (
                <motion.div
                  key={`${clip.runId}-${clip.momentIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}
                >
                  <button
                    onClick={() => openClip(clip)}
                    className="w-full bg-[#2A2A2C] rounded-2xl border border-white/5 shadow-sm p-5 hover:bg-[#3A3A3C] hover:border-white/10 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0A84FF]/10 flex items-center justify-center shrink-0 group-hover:bg-[#0A84FF]/20 transition-colors">
                        <Play size={16} className="text-[#0A84FF] ml-0.5" />
                      </div>
                      <p className={`text-[20px] font-bold tabular-nums ${scoreColor(clip.viralityScore)}`}>
                        {clip.viralityScore.toFixed(1)}
                      </p>
                    </div>

                    <h3 className="text-[14px] font-medium text-white/90 mb-2 line-clamp-2">{clip.title}</h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-white/30">
                        <Clock size={10} /> {Math.round(clip.durationSeconds)}s
                      </span>
                      <Badge variant="secondary" className="text-[10px]">{clip.category}</Badge>
                      {clip.hashtags.slice(0, 2).map((h) => (
                        <span key={h} className="text-[10px] text-[#0A84FF]/40">#{h}</span>
                      ))}
                    </div>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
