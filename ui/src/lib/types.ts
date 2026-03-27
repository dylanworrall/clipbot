/** Shared types and defaults — safe to import from client components */

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

export interface ScoringWeights {
  hook: number;
  standalone: number;
  controversy: number;
  education: number;
  emotion: number;
  twist: number;
  quotable: number;
  visual: number;
  nicheBonus: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  hook: 3,
  standalone: 3,
  controversy: 3,
  education: 3,
  emotion: 1.5,
  twist: 1.5,
  quotable: 1,
  visual: 1,
  nicheBonus: 1,
};

export type BackgroundFillStyle = "center-crop" | "blurred-zoom" | "mirror-reflection" | "split-fill";

export type CaptionMode = "overlay" | "burn-in";

export interface AutopilotConfig {
  enabled: boolean;
  postsPerDay: number;
  preferredTime: string;
  platforms: string[];
  lastRunAt?: string;
  lastRunStatus?: string;
}

export interface AppSettings {
  claudeApiKey?: string;
  lateApiKey?: string;
  claudeModel?: string;
  claudeTemperature?: number;
  accounts?: Record<string, string>;
  defaultQuality?: string;
  defaultMaxClips?: number;
  defaultMinScore?: number;
  defaultMaxDuration?: number;
  defaultPlatforms?: string[];
  niche?: string;
  subtitles?: boolean;
  padBefore?: number;
  padAfter?: number;
  backgroundFillStyle?: BackgroundFillStyle;
  captionMode?: CaptionMode;
  captionStyle?: CaptionStyle;
  scoringWeights?: ScoringWeights;
  autopilot?: AutopilotConfig;
  [key: string]: unknown;
}

export interface SpaceSettings {
  // Pipeline
  niche?: string;
  defaultQuality?: string;
  defaultMaxClips?: number;
  defaultMinScore?: number;
  defaultMaxDuration?: number;
  subtitles?: boolean;
  padBefore?: number;
  padAfter?: number;
  // Style
  backgroundFillStyle?: BackgroundFillStyle;
  captionMode?: CaptionMode;
  captionStyle?: Partial<CaptionStyle>;
  // Scoring
  scoringWeights?: Partial<ScoringWeights>;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: SpaceSettings;
  accounts: string[];
  creators: string[];
  createdAt: string;
  updatedAt: string;
}
