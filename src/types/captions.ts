export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  activeColor: string;
  inactiveColor: string;
  outlineColor: string;
  position: "top" | "center" | "bottom";
  maxWordsPerLine: number;
  animationPreset: "karaoke-highlight" | "word-pop" | "typewriter" | "simple-fade";
  hookFontSize: number;
  hookColor: string;
  hookBgColor: string;
  hookPosition: "top" | "center";
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
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
