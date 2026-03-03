import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

/**
 * Centralized path resolution for ClipBot CLI.
 * All user data lives under ~/.clipbot/ when installed globally.
 */

/** Root of user data: CLIPBOT_HOME env or ~/.clipbot/ */
export function getClipbotHome(): string {
  return process.env.CLIPBOT_HOME || path.join(homedir(), ".clipbot");
}

/** ~/.clipbot/config.json */
export function getConfigPath(): string {
  return path.join(getClipbotHome(), "config.json");
}

/** ~/.clipbot/data/ */
export function getDataDir(): string {
  return path.join(getClipbotHome(), "data");
}

/** ~/.clipbot/output/ — default clip output directory */
export function getDefaultOutputDir(): string {
  return path.join(getClipbotHome(), "output");
}

/** ~/.clipbot/.env */
export function getEnvPath(): string {
  return path.join(getClipbotHome(), ".env");
}

/** Resolve the npm package root (where package.json lives) */
export function getPackageRoot(): string {
  // import.meta.dirname gives the directory of this file (src/config/ or dist/config/)
  // Walk up to the package root
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  // From src/config/ or dist/config/ → go up 2 levels
  return path.resolve(thisDir, "..", "..");
}

/** dist/cli/index.js — compiled CLI entry */
export function getCliEntrypoint(): string {
  return path.join(getPackageRoot(), "dist", "cli", "index.js");
}

/** <packageRoot>/ui-standalone/ui/ — pre-built Next.js server directory */
export function getStandaloneDir(): string {
  return path.join(getPackageRoot(), "ui-standalone", "ui");
}

/** ~/.clipbot/cookies.txt */
export function getCookiesPath(): string {
  return path.join(getClipbotHome(), "cookies.txt");
}
