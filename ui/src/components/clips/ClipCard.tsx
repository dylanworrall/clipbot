"use client";

import { Card } from "@/components/ui/Card";
import { ClipPlayer } from "./ClipPlayer";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatFileSize, toMediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Clip {
  momentIndex: number;
  title: string;
  filePath: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  resolution: { width: number; height: number };
}

interface ClipCardProps {
  clip: Clip;
  selected?: boolean;
  onToggle?: () => void;
  runId: string;
}

export function ClipCard({ clip, selected, onToggle, runId }: ClipCardProps) {
  const videoUrl = toMediaUrl(clip.filePath);
  const thumbUrl = clip.thumbnailPath ? toMediaUrl(clip.thumbnailPath) : undefined;

  return (
    <Card
      className={cn(
        "space-y-3",
        selected && "border-accent ring-1 ring-accent/30"
      )}
    >
      <ClipPlayer
        src={videoUrl}
        poster={thumbUrl}
        className="aspect-[9/16] max-h-80"
      />

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-medium line-clamp-1">{clip.title}</h4>
          {onToggle && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              className="accent-[var(--color-accent)] mt-0.5"
            />
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <Badge>{formatDuration(clip.durationSeconds)}</Badge>
          <Badge>{formatFileSize(clip.fileSizeBytes)}</Badge>
          <Badge>
            {clip.resolution.width}x{clip.resolution.height}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
