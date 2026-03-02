import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";
import { CaptionOverlay, type WordTiming } from "./CaptionOverlay";
import { HookText } from "./HookText";
import type { CaptionStyle } from "../types/captions.js";

export interface ClipCompositionProps {
  videoSrc: string;
  words: WordTiming[];
  hookText?: string;
  hookDurationSeconds?: number;
  captionStyle?: Partial<CaptionStyle>;
}

export const ClipComposition: React.FC<ClipCompositionProps> = ({
  videoSrc,
  words,
  hookText,
  hookDurationSeconds = 3,
  captionStyle,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo src={videoSrc} />

      {/* Hook text in first few seconds */}
      {hookText && (
        <Sequence from={0} durationInFrames={Math.round(hookDurationSeconds * fps)}>
          <HookText
            text={hookText}
            durationSeconds={hookDurationSeconds}
            hookColor={captionStyle?.hookColor}
            hookBgColor={captionStyle?.hookBgColor}
            hookFontSize={captionStyle?.hookFontSize}
            hookPosition={captionStyle?.hookPosition}
          />
        </Sequence>
      )}

      {/* Word-by-word captions */}
      <CaptionOverlay
        words={words}
        maxWordsPerLine={captionStyle?.maxWordsPerLine}
        fontSize={captionStyle?.fontSize}
        fontFamily={captionStyle?.fontFamily ? `${captionStyle.fontFamily}, sans-serif` : undefined}
        position={captionStyle?.position}
        activeColor={captionStyle?.activeColor}
        inactiveColor={captionStyle?.inactiveColor}
        animationPreset={captionStyle?.animationPreset}
      />
    </AbsoluteFill>
  );
};
