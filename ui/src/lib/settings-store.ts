import { readFile, writeFile } from "node:fs/promises";
import { DEFAULT_CAPTION_STYLE, DEFAULT_SCORING_WEIGHTS } from "./types";
import { SETTINGS_FILE, ENV_PATH, CONFIG_PATH } from "./paths";
import type { AppSettings } from "./types";

// Re-export types and defaults so existing server imports keep working
export { DEFAULT_CAPTION_STYLE, DEFAULT_SCORING_WEIGHTS };
export type { CaptionStyle, ScoringWeights, BackgroundFillStyle, CaptionMode, AppSettings } from "./types";

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw) as AppSettings;
  } catch {
    return {};
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const existing = await getSettings();
  const merged = { ...existing, ...settings };
  await writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
}

/** Parse a .env file into key-value pairs */
function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

/** Merge UI settings with clipbot.config.json + parent .env for full config */
export async function getEffectiveConfig(): Promise<AppSettings> {
  const uiSettings = await getSettings();

  let parentEnv: Record<string, string> = {};
  try {
    const envRaw = await readFile(ENV_PATH, "utf-8");
    parentEnv = parseEnvFile(envRaw);
  } catch {
    // No .env file
  }

  const claudeApiKey = process.env.ANTHROPIC_API_KEY || parentEnv.ANTHROPIC_API_KEY;
  const lateApiKey = process.env.LATE_API_KEY || parentEnv.LATE_API_KEY;

  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parentConfig = JSON.parse(raw);

    return {
      accounts: parentConfig.accounts,
      claudeModel: parentConfig.claudeModel,
      claudeTemperature: parentConfig.claudeTemperature,
      defaultQuality: parentConfig.defaultQuality,
      defaultMaxClips: parentConfig.defaultMaxClips,
      defaultMinScore: parentConfig.defaultMinScore,
      defaultMaxDuration: parentConfig.defaultMaxDuration,
      defaultPlatforms: parentConfig.defaultPlatforms,
      niche: parentConfig.niche,
      subtitles: parentConfig.subtitles,
      padBefore: parentConfig.padBefore,
      padAfter: parentConfig.padAfter,
      backgroundFillStyle: parentConfig.backgroundFillStyle ?? "blurred-zoom",
      captionMode: parentConfig.captionMode ?? "overlay",
      captionStyle: DEFAULT_CAPTION_STYLE,
      scoringWeights: DEFAULT_SCORING_WEIGHTS,
      claudeApiKey,
      lateApiKey,
      ...uiSettings,
    };
  } catch {
    return {
      claudeApiKey,
      lateApiKey,
      claudeModel: "claude-sonnet-4-20250514",
      defaultQuality: "1080",
      defaultMaxClips: 5,
      defaultMinScore: 7,
      defaultMaxDuration: 59,
      defaultPlatforms: ["tiktok", "youtube", "instagram"],
      niche: "general",
      subtitles: true,
      padBefore: 1.5,
      padAfter: 0.5,
      backgroundFillStyle: "blurred-zoom",
      captionMode: "overlay",
      captionStyle: DEFAULT_CAPTION_STYLE,
      scoringWeights: DEFAULT_SCORING_WEIGHTS,
      ...uiSettings,
    };
  }
}
