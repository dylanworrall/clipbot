"use client";

import React from "react";
import { AbsoluteFill, Video, Sequence, useVideoConfig, useCurrentFrame } from "remotion";
import { CaptionOverlay } from "./CaptionOverlay";
import { HookText } from "./HookText";
import type { Track, Item, BackgroundItem, VideoItem, HookItem, CaptionItem } from "./types";

// ── Individual item renderers (Step 2 from Remotion docs) ────────────

const BackgroundItemComp: React.FC<{ item: BackgroundItem }> = ({ item }) => {
  if (item.fillStyle === "center-crop") return null;

  const filterStyle = (() => {
    switch (item.fillStyle) {
      case "blurred-zoom":
        return { filter: "blur(40px)", transform: "scale(2)" };
      case "mirror-reflection":
        return { filter: "blur(30px)", transform: "scale(2) scaleY(-1)" };
      case "split-fill":
        return { filter: "blur(35px)", transform: "scale(2.5)" };
      default:
        return { filter: "blur(40px)", transform: "scale(2)" };
    }
  })();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Video
        src={item.src}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...filterStyle,
        }}
      />
    </AbsoluteFill>
  );
};

const VideoItemComp: React.FC<{ item: VideoItem }> = ({ item }) => {
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Video
        src={item.src}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: item.fillStyle === "center-crop" ? "cover" : "contain",
        }}
      />
    </AbsoluteFill>
  );
};

const HookItemComp: React.FC<{ item: HookItem }> = ({ item }) => {
  return (
    <HookText
      text={item.text}
      visible
      hookColor={item.color}
      hookBgColor={item.bgColor}
      hookFontSize={item.fontSize}
      hookPosition={item.position}
    />
  );
};

const CaptionItemComp: React.FC<{ item: CaptionItem }> = ({ item }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTimeMs = (frame / fps) * 1000;

  return (
    <CaptionOverlay
      words={item.words}
      currentTimeMs={currentTimeMs}
      maxWordsPerLine={item.maxWordsPerLine}
      fontSize={item.fontSize}
      fontFamily={`${item.fontFamily}, sans-serif`}
      position={item.position}
      activeColor={item.activeColor}
      inactiveColor={item.inactiveColor}
      animationPreset={item.animationPreset}
    />
  );
};

// ── Generic item dispatcher ──────────────────────────────────────────

const ItemComp: React.FC<{ item: Item }> = ({ item }) => {
  if (item.type === "background") return <BackgroundItemComp item={item} />;
  if (item.type === "video") return <VideoItemComp item={item} />;
  if (item.type === "hook") return <HookItemComp item={item} />;
  if (item.type === "caption") return <CaptionItemComp item={item} />;
  throw new Error(`Unknown item type: ${JSON.stringify(item)}`);
};

// ── Track renderer (each track is an AbsoluteFill layer) ─────────────
// Lower in the tree = higher in the visual stack (CSS stacking)

const TrackComp: React.FC<{ track: Track }> = ({ track }) => {
  return (
    <AbsoluteFill>
      {track.items.map((item) => (
        <Sequence
          key={item.id}
          from={item.from}
          durationInFrames={item.durationInFrames}
        >
          <ItemComp item={item} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ── Main composition (Step 2: renders list of tracks) ────────────────

export const Main: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {tracks.map((track) => (
        <TrackComp track={track} key={track.name} />
      ))}
    </AbsoluteFill>
  );
};
