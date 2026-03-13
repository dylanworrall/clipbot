"use client";

import { formatDuration, toMediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Check } from "lucide-react";

interface Clip {
  momentIndex: number;
  title: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

interface InlineClipCardProps {
  clip: Clip;
  viralityScore?: number;
  published?: boolean;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}

export function InlineClipCard({
  clip,
  viralityScore,
  published,
  selected,
  onToggle,
  onClick,
}: InlineClipCardProps) {
  const thumbSrc = toMediaUrl(clip.thumbnailPath);
  const scoreColor =
    viralityScore && viralityScore >= 8
      ? "bg-accent text-white"
      : viralityScore && viralityScore >= 6
        ? "bg-brand-gold text-black"
        : "bg-surface-2 text-muted";

  return (
    <div
      className={cn(
        "relative group rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer",
        selected
          ? "border-accent/40 ring-2 ring-accent/20"
          : published
            ? "border-green-500/30 hover:border-green-500/50"
            : "border-border/50 hover:border-accent/30"
      )}
    >
      {/* Checkbox — only for unpublished clips */}
      {!published && (
        <label
          className="absolute top-1.5 left-1.5 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="accent-[var(--color-accent)] h-3.5 w-3.5 cursor-pointer"
          />
        </label>
      )}

      {/* Published badge */}
      {published && (
        <div className="absolute top-1.5 left-1.5 z-10 bg-green-500/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Check className="h-2.5 w-2.5" />
          Live
        </div>
      )}

      {/* Score badge */}
      {viralityScore !== undefined && (
        <div
          className={cn(
            "absolute top-1.5 right-1.5 z-10 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0",
            scoreColor
          )}
        >
          {viralityScore}
        </div>
      )}

      {/* Thumbnail with hover overlay */}
      <div
        className="aspect-[9/16] bg-surface-2 relative"
        onClick={onClick}
      >
        <img
          src={thumbSrc}
          alt={clip.title}
          className="w-full h-full object-cover transition-all duration-300 group-hover:blur-[6px] group-hover:scale-105"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
          <span className="text-white text-xs font-semibold tracking-wide">
            {published ? "Preview" : "Editor"}
          </span>
        </div>

        {/* Arrow — bottom-right on hover */}
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
          <div className={cn(
            "text-white rounded-full h-5 w-5 flex items-center justify-center shadow-lg",
            published ? "bg-green-500" : "bg-accent"
          )}>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded font-mono transition-opacity duration-200 group-hover:opacity-0">
          {formatDuration(clip.durationSeconds)}
        </div>
      </div>

      {/* Title */}
      <div className="px-2 py-1.5" onClick={onClick}>
        <p className="text-[11px] font-medium line-clamp-1">{clip.title}</p>
      </div>
    </div>
  );
}
