"use client";

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Main } from "./remotion/PlayerComposition";
import type { Track } from "./remotion/types";

interface RemotionPreviewProps {
  tracks: Track[];
  durationInFrames: number;
  fps: number;
  onFrameChange?: (frame: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  playerRef?: React.MutableRefObject<PlayerRef | null>;
}

const RemotionPreviewInner: React.FC<RemotionPreviewProps> = ({
  tracks,
  durationInFrames,
  fps,
  onFrameChange,
  onPlayingChange,
  playerRef: externalRef,
}) => {
  const localRef = useRef<PlayerRef | null>(null);
  const lastFrameUpdate = useRef(0);

  const setRef = useCallback(
    (node: PlayerRef | null) => {
      localRef.current = node;
      if (externalRef) externalRef.current = node;
    },
    [externalRef]
  );

  // Use Remotion event listeners for frame/playing sync
  // Throttle frame updates to ~10fps to avoid re-render storms in parent
  useEffect(() => {
    const player = localRef.current;
    if (!player) return;

    const onFrame = () => {
      const now = Date.now();
      if (now - lastFrameUpdate.current < 100) return; // ~10fps throttle
      lastFrameUpdate.current = now;
      const frame = player.getCurrentFrame();
      if (frame !== undefined) onFrameChange?.(frame);
    };
    const onPlay = () => onPlayingChange?.(true);
    const onPause = () => onPlayingChange?.(false);

    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [onFrameChange, onPlayingChange]);

  // Memoize inputProps so Player doesn't see a new object on every render
  const inputProps = useMemo(() => ({ tracks }), [tracks]);

  return (
    <div className="h-full flex items-center justify-center">
      <div
        className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10"
        style={{ height: "100%", maxHeight: "100%", aspectRatio: "9/16" }}
      >
        <Player
          ref={setRef}
          component={Main as unknown as React.ComponentType<Record<string, unknown>>}
          inputProps={inputProps as unknown as Record<string, unknown>}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: "100%", height: "100%" }}
          autoPlay={false}
        />
      </div>
    </div>
  );
};

// React.memo prevents re-renders from parent frame/playing state changes
// (tracks, durationInFrames, fps are the only props that should trigger re-render)
export const RemotionPreview = React.memo(RemotionPreviewInner);
