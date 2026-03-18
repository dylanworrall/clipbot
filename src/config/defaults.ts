import type { ClipBotConfig } from "../types/config.js";
import { getDefaultOutputDir } from "./paths.js";

export const DEFAULT_CONFIG: ClipBotConfig = {
  claudeApiKey: "",
  claudeModel: "gemini-2.5-flash",
  claudeTemperature: 0.2,
  lateApiKey: "",
  accounts: {},
  defaultQuality: "1080",
  defaultMaxClips: 5,
  defaultMinScore: 7,
  defaultMaxDuration: 59,
  outputDir: getDefaultOutputDir(),
  niche: "",
  subtitles: true,
  padBefore: 1.5,
  padAfter: 0.5,
  defaultPlatforms: ["tiktok", "youtube", "instagram"],
  backgroundFillStyle: "blurred-zoom",
  captionMode: "overlay",
};
