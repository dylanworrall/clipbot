import { readFile } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { config as loadEnv } from "dotenv";
import type { ClipBotConfig } from "../types/config.js";
import { ConfigFileSchema } from "./schema.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import { log } from "../utils/logger.js";

loadEnv();

async function tryLoadJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = ConfigFileSchema.parse(parsed);
    log.debug(`Loaded config from ${filePath}`);
    return validated as Record<string, unknown>;
  } catch {
    return null;
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof (result as Record<string, unknown>)[key] === "object" &&
        !Array.isArray((result as Record<string, unknown>)[key])
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          (result as Record<string, unknown>)[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
  return result;
}

export async function loadConfig(cliConfigPath?: string): Promise<ClipBotConfig> {
  let config = { ...DEFAULT_CONFIG, accounts: { ...DEFAULT_CONFIG.accounts } } as Record<string, unknown>;

  // 1. User home config
  const homeConfig = await tryLoadJson(
    path.join(homedir(), ".clipbot", "config.json")
  );
  if (homeConfig) config = deepMerge(config, homeConfig);

  // 2. Local config
  const localConfig = await tryLoadJson(
    path.join(process.cwd(), "clipbot.config.json")
  );
  if (localConfig) config = deepMerge(config, localConfig);

  // 3. Explicit CLI path
  if (cliConfigPath) {
    const cliConfig = await tryLoadJson(cliConfigPath);
    if (cliConfig) config = deepMerge(config, cliConfig);
  }

  // 4. Environment variable overrides
  if (process.env.ANTHROPIC_API_KEY) config.claudeApiKey = process.env.ANTHROPIC_API_KEY;
  if (process.env.LATE_API_KEY) config.lateApiKey = process.env.LATE_API_KEY;
  if (process.env.CLAUDE_MODEL) config.claudeModel = process.env.CLAUDE_MODEL;

  return config as unknown as ClipBotConfig;
}
