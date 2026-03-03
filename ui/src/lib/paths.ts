import path from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

/**
 * Centralized path resolution for the ClipBot UI.
 * Separate from the CLI paths.ts because the UI can't import CLI source during Next.js build.
 *
 * In production (CLIPBOT_PRODUCTION=1): all data lives under ~/.clipbot/
 * In dev: falls back to process.cwd()/data/ for backward compatibility.
 */

function getClipbotHome(): string {
  return process.env.CLIPBOT_HOME || path.join(homedir(), ".clipbot");
}

const isProduction = process.env.CLIPBOT_PRODUCTION === "1";

// Resolve DATA_DIR: prefer ~/.clipbot/data/ if it exists or in production mode,
// otherwise fall back to process.cwd()/data/ for dev compatibility.
function resolveDataDir(): string {
  const homeDataDir = path.join(getClipbotHome(), "data");
  if (isProduction || existsSync(homeDataDir)) {
    return homeDataDir;
  }
  // Dev fallback
  return path.join(process.cwd(), "data");
}

export const DATA_DIR = resolveDataDir();
export const RUNS_FILE = path.join(DATA_DIR, "runs.json");
export const CHAT_FILE = path.join(DATA_DIR, "chat-messages.json");
export const CREATORS_FILE = path.join(DATA_DIR, "creators.json");
export const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
export const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
export const SCHEDULE_FILE = path.join(DATA_DIR, "scheduled.json");
export const SPACES_FILE = path.join(DATA_DIR, "spaces.json");

/** config.json path: ~/.clipbot/config.json in production, ../clipbot.config.json in dev */
export const CONFIG_PATH = isProduction
  ? path.join(getClipbotHome(), "config.json")
  : path.resolve(process.cwd(), "..", "clipbot.config.json");

/** .env path: ~/.clipbot/.env in production, ../.env in dev */
export const ENV_PATH = isProduction
  ? path.join(getClipbotHome(), ".env")
  : path.resolve(process.cwd(), "..", ".env");

/** Output directory for clips */
export function getOutputDir(): string {
  if (process.env.CLIPBOT_OUTPUT_DIR) return process.env.CLIPBOT_OUTPUT_DIR;
  if (isProduction) return path.join(getClipbotHome(), "output");
  return path.resolve(process.cwd(), "..", "clipbot-output");
}

/** CLI root directory (where the CLI package lives) */
export function getCliRoot(): string {
  if (process.env.CLIPBOT_CLI_ROOT) return process.env.CLIPBOT_CLI_ROOT;
  // Dev fallback: UI is in <root>/ui/, CLI root is <root>/
  return path.resolve(process.cwd(), "..");
}

/** Path to the CLI entrypoint */
export function getCliEntrypoint(): string {
  if (isProduction) {
    return path.join(getCliRoot(), "dist", "cli", "index.js");
  }
  // Dev: use TypeScript source
  return path.join(getCliRoot(), "src", "cli", "index.ts");
}

/** Path to the rerender-clip script */
export function getRerenderScript(): string {
  if (isProduction) {
    return path.join(getCliRoot(), "dist", "cli", "rerender-clip.js");
  }
  return path.join(getCliRoot(), "src", "cli", "rerender-clip.ts");
}
