"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Film, Loader2, RefreshCw, Play, Clock, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipEditorSlideOver } from "@/components/feed/ClipEditorSlideOver";

interface Clip {
  runId: string;
  sourceUrl: string;
  momentIndex: number;
  title: string;
  viralityScore: number;
  durationSeconds: number;
  hashtags: string[];
  category: string;
  filePath: string;
  rawFilePath?: string;
  words?: Array<{ word: string; startMs: number; endMs: number }>;
  hookText?: string;
}

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
    }>;
    wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }>;
  };
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-[#30D158]";
  if (score >= 6) return "text-[#FF9F0A]";
  return "text-white/40";
}

export default function EditorPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClip, setEditingClip] = useState<Record<string, unknown> | null>(null);
  const [captionMode, setCaptionMode] = useState<"overlay" | "burn-in">("overlay");

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/runs?include=manifests");
      const data = await res.json();
      const completed = (Array.isArray(data) ? data : []).filter(
        (r: Run) => r.status === "complete" && r.manifest?.clips?.length
      );
      setRuns(completed);
    } catch {
      setRuns([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Load caption mode from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.captionMode) setCaptionMode(d.captionMode); })
      .catch(() => {});
  }, []);

  // Build flat clip list from all runs
  const allClips = runs.flatMap((run) => {
    if (!run.manifest?.clips || !run.manifest?.moments) return [];
    return run.manifest.clips.map((clip) => {
      const moment = run.manifest!.moments!.find((m) => m.index === clip.momentIndex);
      return {
        runId: run.runId,
        sourceUrl: run.sourceUrl,
        momentIndex: clip.momentIndex,
        title: moment?.title ?? clip.title,
        viralityScore: moment?.viralityScore ?? 0,
        durationSeconds: clip.durationSeconds,
        hashtags: moment?.hashtags ?? [],
        category: moment?.category ?? "",
        hookText: moment?.hookText,
        filePath: clip.filePath,
        rawFilePath: clip.rawFilePath,
        words: run.manifest!.wordTimestamps,
      };
    });
  }).sort((a, b) => b.viralityScore - a.viralityScore);

  const openEditor = (clip: typeof allClips[0]) => {
    setEditingClip({
      runId: clip.runId,
      momentIndex: clip.momentIndex,
      title: clip.title,
      filePath: clip.filePath,
      rawFilePath: clip.rawFilePath,
      durationSeconds: clip.durationSeconds,
      viralityScore: clip.viralityScore,
      words: clip.words,
      hookText: clip.hookText,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white/90 mb-1">Editor</h1>
            <p className="text-white/50 text-[13px] font-medium">
              {allClips.length} clip{allClips.length !== 1 ? "s" : ""} ready to edit
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
            <Film size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-white/50">No clips to edit</p>
            <p className="text-[13px] text-white/30 mt-1">
              Process a video from the chat to generate clips
            </p>
          </div>
        )}

        {!loading && allClips.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence>
              {allClips.map((clip, idx) => (
                <motion.div
                  key={`${clip.runId}-${clip.momentIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}
                >
                  <button
                    onClick={() => openEditor(clip)}
                    className="w-full group flex items-center gap-4 p-4 rounded-xl hover:bg-[#2A2A2C] transition-colors border border-transparent hover:border-white/5 text-left cursor-pointer"
                  >
                    {/* Play icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#0A84FF]/10 flex items-center justify-center shrink-0 group-hover:bg-[#0A84FF]/20 transition-colors">
                      <Play size={18} className="text-[#0A84FF] ml-0.5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium text-white/90 truncate mb-1">
                        {clip.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] text-white/30">
                          <Clock size={10} />
                          {Math.round(clip.durationSeconds)}s
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {clip.category}
                        </Badge>
                        {clip.hashtags.slice(0, 2).map((h) => (
                          <span key={h} className="text-[10px] text-[#0A84FF]/50">#{h}</span>
                        ))}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-[16px] font-bold tabular-nums ${scoreColor(clip.viralityScore)}`}>
                        {clip.viralityScore.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-white/25">score</p>
                    </div>

                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Editor slide-over */}
      <ClipEditorSlideOver
        clip={editingClip as never}
        captionMode={captionMode}
        onClose={() => setEditingClip(null)}
      />
    </div>
  );
}
