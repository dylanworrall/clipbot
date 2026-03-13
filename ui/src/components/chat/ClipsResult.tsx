"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InlineClipCard } from "./InlineClipCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Film } from "lucide-react";

interface Clip {
  momentIndex: number;
  title: string;
  filePath: string;
  rawFilePath?: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  resolution: { width: number; height: number };
}

interface Moment {
  index: number;
  viralityScore: number;
}

interface Post {
  clipIndex: number;
  postId: string;
  platforms: Array<{ platform: string; status: string; url?: string }>;
}

interface ClipsResultProps {
  clips: Clip[];
  moments?: Moment[];
  posts?: Post[];
  selectedClips: Set<number>;
  onToggleClip: (idx: number) => void;
  onSelectAll: () => void;
  onClickClip: (clipIndex: number) => void;
}

export function ClipsResult({
  clips,
  moments,
  posts,
  selectedClips,
  onToggleClip,
  onSelectAll,
  onClickClip,
}: ClipsResultProps) {
  const [expanded, setExpanded] = useState(true);

  const getScore = (momentIndex: number) =>
    moments?.find((m) => m.index === momentIndex)?.viralityScore;

  const isPublished = (momentIndex: number) =>
    posts?.some(
      (p) =>
        p.clipIndex === momentIndex &&
        p.platforms?.some((pl) => pl.status === "published" || pl.status === "scheduled")
    ) ?? false;

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left cursor-pointer"
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-3 w-3 text-muted" />
        </motion.div>
        <Film className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium text-accent">
          {clips.length} clip{clips.length !== 1 ? "s" : ""} ready
        </span>
        {selectedClips.size > 0 && (
          <span className="text-[10px] text-muted ml-auto">
            {selectedClips.size} selected
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="sm" onClick={onSelectAll}>
                  Select All
                </Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {clips.map((clip) => (
                  <InlineClipCard
                    key={clip.momentIndex}
                    clip={clip}
                    viralityScore={getScore(clip.momentIndex)}
                    published={isPublished(clip.momentIndex)}
                    selected={selectedClips.has(clip.momentIndex)}
                    onToggle={() => onToggleClip(clip.momentIndex)}
                    onClick={() => onClickClip(clip.momentIndex)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
