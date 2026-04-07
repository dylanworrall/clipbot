/**
 * Timeline item and track types following Remotion's
 * timeline-based editor pattern (docs/building-a-timeline).
 *
 * Each Track overlays on top of the previous one (AbsoluteFill layers).
 * Each Item within a track is placed using <Sequence from={} durationInFrames={}>.
 */

type BaseItem = {
  from: number; // frame offset
  durationInFrames: number;
  id: string;
};

/** Background fill layer — blurred/mirrored copy of the main video */
export type BackgroundItem = BaseItem & {
  type: "background";
  src: string;
  fillStyle: "blurred-zoom" | "mirror-reflection" | "split-fill" | "center-crop";
  startFrom?: number; // frame offset in source video (used after splits)
};

/** Primary video layer */
export type VideoItem = BaseItem & {
  type: "video";
  src: string;
  fillStyle: "blurred-zoom" | "mirror-reflection" | "split-fill" | "center-crop";
  startFrom?: number; // frame offset in source video (used after splits)
};

/** Hook text overlay shown at the start of the clip */
export type HookItem = BaseItem & {
  type: "hook";
  text: string;
  color: string;
  bgColor: string;
  fontSize: number;
  position: "top" | "center";
};

/** Caption overlay with word-by-word timing */
export type CaptionItem = BaseItem & {
  type: "caption";
  words: Array<{ word: string; startMs: number; endMs: number }>;
  fontSize: number;
  fontFamily: string;
  position: "top" | "center" | "bottom";
  activeColor: string;
  inactiveColor: string;
  animationPreset: "karaoke-highlight" | "word-pop" | "typewriter" | "simple-fade";
  maxWordsPerLine: number;
};

export type Item = BackgroundItem | VideoItem | HookItem | CaptionItem;

export type Track = {
  name: string;
  items: Item[];
};
