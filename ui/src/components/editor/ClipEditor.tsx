"use client";

import { useState, useCallback, useRef, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { type PlayerRef } from "@remotion/player";
import { type CaptionStyleState } from "./StyleControls";
import { PropertiesPanel } from "./PropertiesPanel";
import { TransportBar } from "./TransportBar";
import { Timeline } from "./Timeline";
import {
  Loader2,
  X,
  Type,
  MessageSquareQuote,
  Layers,
  Video as VideoIcon,
  Music,
  Undo2,
  Redo2,
} from "lucide-react";
import type { Track, Item } from "./remotion/types";

const RemotionPreview = lazy(() =>
  import("./RemotionPreview").then((mod) => ({
    default: mod.RemotionPreview,
  }))
);

class EditorErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ClipEditor error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-2 text-sm text-red-400 p-4 text-center">
          <p className="font-medium">Editor failed to load</p>
          <p className="text-xs text-muted">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

interface ClipEditorProps {
  runId: string;
  clipIndex: number;
  clipTitle: string;
  videoSrc: string;
  durationSec: number;
  words: WordTiming[];
  hookText?: string;
  hookDurationSeconds?: number;
  captionMode?: "overlay" | "burn-in";
  initialBgStyle?: string;
  initialCaptionStyle?: Partial<CaptionStyleState>;
  onClose: () => void;
  onChooseMedia?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_STYLE: CaptionStyleState = {
  fontFamily: "Arial",
  fontSize: 72,
  activeColor: "#FFD700",
  inactiveColor: "#FFFFFF99",
  outlineColor: "#000000",
  position: "bottom",
  maxWordsPerLine: 5,
  animationPreset: "typewriter",
  hookFontSize: 56,
  hookColor: "#FFFFFF",
  hookBgColor: "rgba(0,0,0,0.7)",
  hookPosition: "top",
};

/* ------------------------------------------------------------------ */
/*  Build tracks                                                       */
/* ------------------------------------------------------------------ */

function buildTracks(
  videoSrc: string,
  durationInFrames: number,
  fps: number,
  bgStyle: string,
  captionStyle: CaptionStyleState,
  words: WordTiming[],
  hookText: string | undefined,
  hookDurationSeconds: number,
  showCaptions: boolean
): Track[] {
  const fillStyle = bgStyle as
    | "blurred-zoom"
    | "mirror-reflection"
    | "split-fill"
    | "center-crop";
  const hookDurationFrames = Math.round(hookDurationSeconds * fps);

  const tracks: Track[] = [
    {
      name: "Background",
      items: [
        {
          id: "bg-fill",
          type: "background",
          from: 0,
          durationInFrames,
          src: videoSrc,
          fillStyle,
        },
      ],
    },
    {
      name: "Video",
      items: [
        {
          id: "main-video",
          type: "video",
          from: 0,
          durationInFrames,
          src: videoSrc,
          fillStyle,
        },
      ],
    },
  ];

  if (showCaptions && hookText) {
    tracks.push({
      name: "Hook",
      items: [
        {
          id: "hook-text",
          type: "hook",
          from: 0,
          durationInFrames: hookDurationFrames,
          text: hookText,
          color: captionStyle.hookColor,
          bgColor: captionStyle.hookBgColor,
          fontSize: captionStyle.hookFontSize,
          position: captionStyle.hookPosition,
        },
      ],
    });
  }

  if (showCaptions && words.length > 0) {
    tracks.push({
      name: "Captions",
      items: [
        {
          id: "captions",
          type: "caption",
          from: 0,
          durationInFrames,
          words,
          fontSize: captionStyle.fontSize,
          fontFamily: captionStyle.fontFamily,
          position: captionStyle.position,
          activeColor: captionStyle.activeColor,
          inactiveColor: captionStyle.inactiveColor,
          animationPreset: captionStyle.animationPreset,
          maxWordsPerLine: captionStyle.maxWordsPerLine,
        },
      ],
    });
  }

  return tracks;
}

/* ------------------------------------------------------------------ */
/*  Left sidebar tool button                                           */
/* ------------------------------------------------------------------ */

function SidebarTool({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
        active
          ? "bg-accent/15 text-accent"
          : "text-muted hover:text-foreground hover:bg-surface-2"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="absolute left-full ml-2 px-2 py-0.5 text-[10px] bg-surface-3 text-foreground rounded shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30">
        {label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main editor                                                        */
/* ------------------------------------------------------------------ */

export function ClipEditor({
  runId,
  clipIndex,
  clipTitle,
  videoSrc,
  durationSec,
  words,
  hookText,
  hookDurationSeconds = 3,
  captionMode = "overlay",
  initialBgStyle = "blurred-zoom",
  initialCaptionStyle,
  onClose,
  onChooseMedia,
}: ClipEditorProps) {
  // Style state
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleState>({
    ...DEFAULT_STYLE,
    ...initialCaptionStyle,
  });
  const [bgStyle, setBgStyle] = useState(initialBgStyle);

  // Playback state
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Editor state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rerendering, setRerendering] = useState(false);
  const [rerenderResult, setRerenderResult] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const fps = 30;
  const durationInFrames = Math.round(durationSec * fps);
  const showCaptions = captionMode === "overlay";

  // Tracks
  const [tracks, setTracks] = useState<Track[]>(() =>
    buildTracks(
      videoSrc,
      durationInFrames,
      fps,
      bgStyle,
      { ...DEFAULT_STYLE, ...initialCaptionStyle },
      words,
      hookText,
      hookDurationSeconds,
      showCaptions
    )
  );

  // Find selected item across all tracks
  const selectedItem: Item | null = (() => {
    if (!selectedItemId) return null;
    for (const track of tracks) {
      const found = track.items.find((it) => it.id === selectedItemId);
      if (found) return found;
    }
    return null;
  })();

  /* ---- Style handlers ---- */

  const handleStyleChange = useCallback(
    (style: CaptionStyleState) => {
      setCaptionStyle(style);
      setTracks(
        buildTracks(
          videoSrc, durationInFrames, fps, bgStyle, style,
          words, hookText, hookDurationSeconds, showCaptions
        )
      );
    },
    [videoSrc, durationInFrames, fps, bgStyle, words, hookText, hookDurationSeconds, showCaptions]
  );

  const handleBgStyleChange = useCallback(
    (newBg: string) => {
      setBgStyle(newBg);
      setTracks(
        buildTracks(
          videoSrc, durationInFrames, fps, newBg, captionStyle,
          words, hookText, hookDurationSeconds, showCaptions
        )
      );
    },
    [videoSrc, durationInFrames, fps, captionStyle, words, hookText, hookDurationSeconds, showCaptions]
  );

  /* ---- Playback handlers ---- */

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }, []);

  const handleSkipBack = useCallback(() => {
    const frame = Math.max(0, currentFrame - fps);
    handleSeek(frame);
  }, [currentFrame, fps, handleSeek]);

  const handleSkipForward = useCallback(() => {
    const frame = Math.min(durationInFrames - 1, currentFrame + fps);
    handleSeek(frame);
  }, [currentFrame, durationInFrames, fps, handleSeek]);

  /* ---- Edit handlers ---- */

  const handleSplit = useCallback(() => {
    if (!selectedItemId) return;
    setTracks((prev) =>
      prev.map((track) => {
        const idx = track.items.findIndex((it) => it.id === selectedItemId);
        if (idx === -1) return track;

        const item = track.items[idx];
        if (currentFrame <= item.from || currentFrame >= item.from + item.durationInFrames)
          return track;

        const framesA = currentFrame - item.from;
        const framesB = item.durationInFrames - framesA;

        let itemA: Item;
        let itemB: Item;

        if (item.type === "caption") {
          const splitTimeMs = (currentFrame / fps) * 1000;
          const wordsA = item.words.filter((w) => w.startMs < splitTimeMs);
          const wordsB = item.words.filter((w) => w.startMs >= splitTimeMs);
          itemA = { ...item, id: `${item.id}-a`, durationInFrames: framesA, words: wordsA };
          itemB = { ...item, id: `${item.id}-b`, from: currentFrame, durationInFrames: framesB, words: wordsB };
        } else {
          itemA = { ...item, id: `${item.id}-a`, durationInFrames: framesA } as Item;
          itemB = { ...item, id: `${item.id}-b`, from: currentFrame, durationInFrames: framesB } as Item;
        }

        const newItems = [...track.items];
        newItems.splice(idx, 1, itemA, itemB);
        return { ...track, items: newItems };
      })
    );
    setSelectedItemId(null);
  }, [selectedItemId, currentFrame, fps]);

  const handleDelete = useCallback(() => {
    if (!selectedItemId) return;
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        items: track.items.filter((it) => it.id !== selectedItemId),
      }))
    );
    setSelectedItemId(null);
  }, [selectedItemId]);

  const handleClone = useCallback(() => {
    if (!selectedItemId) return;
    setTracks((prev) =>
      prev.map((track) => {
        const item = track.items.find((it) => it.id === selectedItemId);
        if (!item) return track;
        const clone = {
          ...item,
          id: `${item.id}-clone-${Date.now()}`,
          from: item.from + item.durationInFrames,
        } as Item;
        // Don't exceed total duration
        if (clone.from + clone.durationInFrames > durationInFrames) {
          clone.durationInFrames = Math.max(1, durationInFrames - clone.from);
        }
        if (clone.from >= durationInFrames) return track;
        return { ...track, items: [...track.items, clone] };
      })
    );
  }, [selectedItemId, durationInFrames]);

  const handleReset = useCallback(() => {
    const resetStyle = { ...DEFAULT_STYLE, ...initialCaptionStyle };
    setCaptionStyle(resetStyle);
    setBgStyle(initialBgStyle);
    setSelectedItemId(null);
    setTracks(
      buildTracks(
        videoSrc, durationInFrames, fps, initialBgStyle, resetStyle,
        words, hookText, hookDurationSeconds, showCaptions
      )
    );
  }, [videoSrc, durationInFrames, fps, initialBgStyle, initialCaptionStyle, words, hookText, hookDurationSeconds, showCaptions]);

  const handleRerender = async () => {
    setRerendering(true);
    setRerenderResult(null);
    try {
      const res = await fetch(`/api/runs/${runId}/rerender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipIndex,
          backgroundFillStyle: bgStyle,
          captionStyle,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRerenderResult("Re-render started!");
      } else {
        setRerenderResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setRerenderResult(
        `Error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    }
    setRerendering(false);
  };

  /* ---- Computed ---- */

  const canSplit = (() => {
    if (!selectedItemId) return false;
    for (const track of tracks) {
      const item = track.items.find((it) => it.id === selectedItemId);
      if (item) {
        return currentFrame > item.from && currentFrame < item.from + item.durationInFrames;
      }
    }
    return false;
  })();

  const canDelete = selectedItemId !== null;
  const canClone = selectedItemId !== null;

  /* ---- Render ---- */

  return (
    <div className="bg-[#2A2A2C] rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col h-full">
      {/* ═══════ Header ═══════ */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer">
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="text-xs font-semibold truncate">
            {clipTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {rerenderResult && (
            <span className={`text-[10px] ${rerenderResult.startsWith("Error") ? "text-red-400" : "text-accent"}`}>
              {rerenderResult}
            </span>
          )}
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ═══════ Main area: sidebar + player + properties ═══════ */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — tools */}
        <div className="w-12 border-r border-border/50 bg-surface-1 flex flex-col items-center py-3 gap-1 flex-shrink-0">
          <SidebarTool icon={Type} label="Captions" active={false} onClick={() => {}} />
          <SidebarTool icon={MessageSquareQuote} label="Hook Text" active={false} onClick={() => {}} />
          <SidebarTool icon={Layers} label="Background" active={false} onClick={() => {}} />
          <SidebarTool icon={VideoIcon} label="Video" active={false} onClick={() => {}} />
          <SidebarTool icon={Music} label="Audio" active={false} onClick={() => {}} />
        </div>

        {/* Center — player */}
        <div className="flex-1 flex items-center justify-center bg-black/40 p-4 min-w-0">
          {videoSrc ? (
            <EditorErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading editor...
                  </div>
                }
              >
                <RemotionPreview
                  tracks={tracks}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  onFrameChange={setCurrentFrame}
                  onPlayingChange={setIsPlaying}
                  playerRef={playerRef}
                />
              </Suspense>
            </EditorErrorBoundary>
          ) : onChooseMedia ? (
            <button
              onClick={onChooseMedia}
              className="px-5 py-2.5 bg-[#0A84FF] text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
            >
              Choose Media
            </button>
          ) : (
            <p className="text-[13px] text-white/30">No media loaded</p>
          )}
        </div>

        {/* Right — properties panel */}
        <div className="w-64 border-l border-border/50 bg-surface-1 flex-shrink-0 overflow-hidden">
          <PropertiesPanel
            selectedItem={selectedItem}
            captionStyle={captionStyle}
            bgStyle={bgStyle}
            onStyleChange={handleStyleChange}
            onBgStyleChange={handleBgStyleChange}
          />
        </div>
      </div>

      {/* ═══════ Transport bar ═══════ */}
      <TransportBar
        isPlaying={isPlaying}
        currentFrame={currentFrame}
        durationInFrames={durationInFrames}
        fps={fps}
        onToggle={handleToggle}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onSplit={handleSplit}
        onDelete={handleDelete}
        onClone={handleClone}
        canSplit={canSplit}
        canDelete={canDelete}
        canClone={canClone}
        zoom={zoom}
        onZoomChange={setZoom}
        onRerender={handleRerender}
        rerendering={rerendering}
      />

      {/* ═══════ Timeline ═══════ */}
      <Timeline
        tracks={tracks}
        setTracks={setTracks}
        durationInFrames={durationInFrames}
        fps={fps}
        currentFrame={currentFrame}
        onSeek={handleSeek}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        zoom={zoom}
      />
    </div>
  );
}
