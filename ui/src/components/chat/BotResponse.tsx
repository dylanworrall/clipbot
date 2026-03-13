"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ToolCallStep } from "./ToolCallStep";
import { MomentsResult } from "./MomentsResult";
import { ClipsResult } from "./ClipsResult";
import { ErrorResult } from "./ErrorResult";
import { ActionBar } from "./ActionBar";
import type { PipelineManifest } from "@/lib/run-store";

const ClipEditorSlideOver = dynamic(
  () => import("@/components/feed/ClipEditorSlideOver").then((m) => m.ClipEditorSlideOver),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-sm text-white">Loading editor...</div>
      </div>
    ),
  }
);
const PublishDialog = dynamic(
  () => import("@/components/clips/PublishDialog").then((m) => m.PublishDialog),
  { ssr: false }
);
import type { DownloadProgress } from "@/hooks/useRunStream";
import type { AggregatedClip } from "@/app/api/clips/route";
import { toMediaUrl } from "@/lib/utils";

const PIPELINE_STEPS = ["downloading", "transcribing", "analyzing", "clipping", "publishing"];

interface BotResponseProps {
  runId: string;
  sourceUrl: string;
  status: string;
  manifest: PipelineManifest | null;
  downloadProgress: DownloadProgress | null;
  options?: Record<string, unknown>;
  onRetry: () => void;
}

export function BotResponse({
  runId,
  sourceUrl,
  status,
  manifest,
  downloadProgress,
  options,
  onRetry,
}: BotResponseProps) {
  const [selectedClips, setSelectedClips] = useState<Set<number>>(new Set());
  const [showPublish, setShowPublish] = useState(false);
  const [editingClip, setEditingClip] = useState<AggregatedClip | null>(null);
  const autoOpenedRef = useRef(false);

  // Auto-open the editor for the first clip when run completes
  // and hasn't been published or scheduled
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (status !== "complete") return;
    if (!manifest?.clips || manifest.clips.length === 0) return;

    // Check if any clips have been published/scheduled
    const hasPublished = manifest.posts?.some(
      (p) => p.platforms?.some((pl) => pl.status === "published" || pl.status === "scheduled")
    );
    if (hasPublished) return;

    // Auto-open editor for the first clip
    autoOpenedRef.current = true;
    const firstClip = manifest.clips[0];
    const moment = manifest.moments?.find((m) => m.index === firstClip.momentIndex);

    const aggregated: AggregatedClip = {
      runId,
      sourceUrl,
      runStartedAt: manifest.startedAt,
      momentIndex: firstClip.momentIndex,
      title: firstClip.title,
      filePath: firstClip.filePath,
      rawFilePath: firstClip.rawFilePath,
      thumbnailPath: firstClip.thumbnailPath,
      durationSeconds: firstClip.durationSeconds,
      fileSizeBytes: firstClip.fileSizeBytes,
      resolution: firstClip.resolution,
      viralityScore: moment?.viralityScore ?? 0,
      hookText: moment?.hookText ?? "",
      hashtags: moment?.hashtags ?? [],
      category: moment?.category ?? "",
      description: moment?.description ?? "",
      wordTimestamps: (manifest.wordTimestamps ?? [])
        .filter((wt) => {
          if (!moment) return false;
          const clipStartMs = Math.max(0, moment.startSeconds - 1.5) * 1000;
          const clipEndMs = clipStartMs + firstClip.durationSeconds * 1000;
          return wt.endMs > clipStartMs && wt.startMs < clipEndMs;
        })
        .map((wt) => {
          const clipStartMs = Math.max(0, moment!.startSeconds - 1.5) * 1000;
          return {
            word: wt.word,
            startMs: Math.round(Math.max(wt.startMs, clipStartMs) - clipStartMs),
            endMs: Math.round(
              Math.min(wt.endMs, clipStartMs + firstClip.durationSeconds * 1000) - clipStartMs
            ),
          };
        }),
    };
    setEditingClip(aggregated);
  }, [status, manifest, runId, sourceUrl]);

  const toggleClip = (idx: number) => {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllClips = () => {
    if (manifest?.clips) {
      setSelectedClips(new Set(manifest.clips.map((c) => c.momentIndex)));
    }
  };

  const handleClickClip = useCallback(
    (clipIndex: number) => {
      if (!manifest?.clips) return;
      const clip = manifest.clips.find((c) => c.momentIndex === clipIndex);
      const moment = manifest.moments?.find((m) => m.index === clipIndex);
      if (!clip) return;

      // Build an AggregatedClip for the slide-over
      const aggregated: AggregatedClip = {
        runId,
        sourceUrl,
        runStartedAt: manifest.startedAt,
        momentIndex: clip.momentIndex,
        title: clip.title,
        filePath: clip.filePath,
        rawFilePath: clip.rawFilePath,
        thumbnailPath: clip.thumbnailPath,
        durationSeconds: clip.durationSeconds,
        fileSizeBytes: clip.fileSizeBytes,
        resolution: clip.resolution,
        viralityScore: moment?.viralityScore ?? 0,
        hookText: moment?.hookText ?? "",
        hashtags: moment?.hashtags ?? [],
        category: moment?.category ?? "",
        description: moment?.description ?? "",
        wordTimestamps: (manifest.wordTimestamps ?? [])
          .filter((wt) => {
            if (!moment) return false;
            const clipStartMs = Math.max(0, moment.startSeconds - 1.5) * 1000;
            const clipEndMs = clipStartMs + clip.durationSeconds * 1000;
            return wt.endMs > clipStartMs && wt.startMs < clipEndMs;
          })
          .map((wt) => {
            const moment2 = moment!;
            const clipStartMs = Math.max(0, moment2.startSeconds - 1.5) * 1000;
            return {
              word: wt.word,
              startMs: Math.round(Math.max(wt.startMs, clipStartMs) - clipStartMs),
              endMs: Math.round(
                Math.min(wt.endMs, clipStartMs + clip.durationSeconds * 1000) - clipStartMs
              ),
            };
          }),
      };
      setEditingClip(aggregated);
    },
    [manifest, runId, sourceUrl]
  );

  const clipTitles: Record<number, string> = {};
  manifest?.clips?.forEach((c) => {
    clipTitles[c.momentIndex] = c.title;
  });

  const isFailed = status === "failed";

  return (
    <div className="space-y-1.5 max-w-lg">
      {/* Pipeline steps */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((step) => (
          <ToolCallStep
            key={step}
            step={step}
            currentStatus={status}
            downloadProgress={step === "downloading" ? downloadProgress : null}
            error={manifest?.error?.step === step ? manifest.error : null}
            manifest={manifest}
            options={options as { quality?: string; maxClips?: number; minScore?: number; maxDuration?: number; niche?: string }}
          />
        ))}
      </div>

      {/* Moments */}
      {manifest?.moments && manifest.moments.length > 0 && (
        <MomentsResult moments={manifest.moments} />
      )}

      {/* Clips */}
      {manifest?.clips && manifest.clips.length > 0 && (
        <ClipsResult
          clips={manifest.clips}
          moments={manifest.moments}
          posts={manifest.posts}
          selectedClips={selectedClips}
          onToggleClip={toggleClip}
          onSelectAll={selectAllClips}
          onClickClip={handleClickClip}
        />
      )}

      {/* Error */}
      {isFailed && <ErrorResult error={manifest?.error} />}

      {/* Actions — only show after pipeline finishes */}
      {(status === "complete" || isFailed) && (
        <ActionBar
          runId={runId}
          sourceUrl={sourceUrl}
          status={status}
          selectedCount={selectedClips.size}
          onPublish={() => setShowPublish(true)}
          onRetry={onRetry}
          onCancel={() => {}}
          options={options as Record<string, unknown>}
        />
      )}

      {/* Publish Dialog */}
      <PublishDialog
        open={showPublish}
        onClose={() => setShowPublish(false)}
        runId={runId}
        clipIndices={Array.from(selectedClips)}
        clipTitles={clipTitles}
      />

      {/* Clip Editor Slide-Over */}
      <ClipEditorSlideOver
        clip={editingClip}
        captionMode="overlay"
        onClose={() => setEditingClip(null)}
      />
    </div>
  );
}
