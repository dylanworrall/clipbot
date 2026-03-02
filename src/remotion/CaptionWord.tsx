import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface CaptionWordProps {
  text: string;
  startFrame: number;
  active: boolean;
  activeColor?: string;
  inactiveColor?: string;
  animationPreset?: "karaoke-highlight" | "word-pop" | "typewriter" | "simple-fade";
}

export const CaptionWord: React.FC<CaptionWordProps> = ({
  text,
  startFrame,
  active,
  activeColor = "#FFD700",
  inactiveColor = "rgba(255, 255, 255, 0.6)",
  animationPreset = "karaoke-highlight",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animationDuration = Math.round(fps * 0.15);
  const progress = interpolate(
    frame,
    [startFrame, startFrame + animationDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  let scale = 1;
  let opacity = 1;

  switch (animationPreset) {
    case "word-pop":
      scale = active
        ? interpolate(progress, [0, 0.4, 1], [0.5, 1.25, 1])
        : 1;
      break;
    case "typewriter":
      opacity = active ? 1 : interpolate(progress, [0, 1], [0.3, 0.6], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      break;
    case "simple-fade":
      opacity = active ? 1 : 0.5;
      scale = 1;
      break;
    case "karaoke-highlight":
    default:
      scale = active
        ? interpolate(progress, [0, 0.6, 1], [0.8, 1.15, 1])
        : 1;
      break;
  }

  return (
    <span
      style={{
        display: "inline-block",
        color: active ? activeColor : inactiveColor,
        transform: `scale(${scale})`,
        opacity,
        textShadow: active
          ? `0 0 20px ${activeColor}80, 2px 2px 4px rgba(0, 0, 0, 0.8)`
          : "2px 2px 4px rgba(0, 0, 0, 0.8)",
        transition: "color 0.1s",
        marginRight: "0.3em",
        fontWeight: 900,
      }}
    >
      {text}
    </span>
  );
};
