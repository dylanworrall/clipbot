import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface HookTextProps {
  text: string;
  durationSeconds: number;
  hookColor?: string;
  hookBgColor?: string;
  hookFontSize?: number;
  hookPosition?: "top" | "center";
}

export const HookText: React.FC<HookTextProps> = ({
  text,
  durationSeconds,
  hookColor = "#FFFFFF",
  hookBgColor = "rgba(0, 0, 0, 0.7)",
  hookFontSize = 48,
  hookPosition = "top",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.round(durationSeconds * fps);
  const fadeInFrames = Math.round(fps * 0.3);
  const fadeOutFrames = Math.round(fps * 0.3);

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, totalFrames - fadeOutFrames, totalFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(
    frame,
    [0, fadeInFrames],
    [0.7, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (frame > totalFrames) return null;

  const positionStyle = hookPosition === "center"
    ? { top: "50%", transform: `scale(${scale}) translateY(-50%)` }
    : { top: "12%", transform: `scale(${scale})` };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        ...positionStyle,
      }}
    >
      <div
        style={{
          background: hookBgColor,
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          padding: "16px 32px",
          maxWidth: "85%",
        }}
      >
        <span
          style={{
            color: hookColor,
            fontSize: hookFontSize,
            fontFamily: "Arial Black, sans-serif",
            fontWeight: 900,
            textAlign: "center",
            textShadow: "2px 2px 8px rgba(0, 0, 0, 0.6)",
            lineHeight: 1.3,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
