export type Platform = "tiktok" | "youtube" | "instagram" | "facebook";

export type BackgroundFillStyle = "center-crop" | "blurred-zoom" | "mirror-reflection" | "split-fill";

export type CaptionMode = "overlay" | "burn-in";

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

export interface ClipBotConfig {
  cookiesFile?: string;
  claudeApiKey: string;
  claudeModel: string;
  claudeTemperature: number;
  lateApiKey: string;
  accounts: Record<string, string>;
  defaultQuality: string;
  defaultMaxClips: number;
  defaultMinScore: number;
  defaultMaxDuration: number;
  outputDir: string;
  niche: string;
  subtitles: boolean;
  padBefore: number;
  padAfter: number;
  defaultPlatforms: Platform[];
  backgroundFillStyle: BackgroundFillStyle;
  captionMode?: CaptionMode;
  scoringWeights?: ScoringWeights;
}
