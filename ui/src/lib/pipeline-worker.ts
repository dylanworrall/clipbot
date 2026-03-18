import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getCliRoot, getCliEntrypoint, getOutputDir } from "./paths";

const isProduction = process.env.CLIPBOT_PRODUCTION === "1";

export interface PipelineOptions {
  url: string;
  runId?: string;
  quality?: string;
  maxClips?: number;
  minScore?: number;
  maxDuration?: number;
  niche?: string;
  subtitles?: boolean;
  skipPublish?: boolean;
  backgroundFillStyle?: string;
  captionStyle?: string; // base64-encoded JSON
  captionMode?: string;
  scoringWeights?: string; // base64-encoded JSON
}

/**
 * Spawns the clipbot CLI as a child process.
 * The pipeline writes progress to manifest.json which the SSE endpoint polls.
 * All output is redirected to clipbot-output/<runId>/pipeline.log.
 *
 * NOTE: detached:true breaks shell I/O redirects on Windows, so we use
 * detached:false + unref() instead. The process stays alive as long as the
 * Next.js server is running.
 */
export async function spawnPipeline(options: PipelineOptions): Promise<{
  pid: number | undefined;
}> {
  const clipbotRoot = getCliRoot();
  const cliPath = getCliEntrypoint();

  const args = isProduction
    ? [cliPath, "process", options.url, "--output-dir", getOutputDir()]
    : ["tsx", "--tsconfig", path.join(clipbotRoot, "tsconfig.json"), cliPath, "process", options.url];

  if (options.runId) {
    args.push("--run-id", options.runId);
  }
  if (options.quality) {
    args.push("--quality", options.quality);
  }
  if (options.maxClips !== undefined) {
    args.push("--max-clips", String(options.maxClips));
  }
  if (options.minScore !== undefined) {
    args.push("--min-score", String(options.minScore));
  }
  if (options.maxDuration !== undefined) {
    args.push("--max-duration", String(options.maxDuration));
  }
  if (options.niche) {
    args.push("--niche", options.niche);
  }
  if (options.subtitles === false) {
    args.push("--no-subtitles");
  }
  if (options.skipPublish !== false) {
    args.push("--no-post");
  }
  if (options.backgroundFillStyle) {
    args.push("--bg-style", options.backgroundFillStyle);
  }
  if (options.captionStyle) {
    args.push("--caption-style", options.captionStyle);
  }
  if (options.captionMode) {
    args.push("--caption-mode", options.captionMode);
  }
  if (options.scoringWeights) {
    args.push("--scoring-weights", options.scoringWeights);
  }

  // Create log directory and build shell command with output redirect
  const nullDev = process.platform === "win32" ? "NUL" : "/dev/null";
  let logRedirect = `>${nullDev} 2>&1`;
  if (options.runId) {
    const logDir = path.join(getOutputDir(), options.runId);
    try {
      await mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, "pipeline.log");
      logRedirect = `>"${logPath}" 2>&1`;
    } catch {
      // Couldn't create log dir
    }
  }

  // Quote all args to prevent shell metacharacters (& in URLs) from breaking the command
  const shellSafe = (s: string) => s.includes(" ") || s.includes("&") || s.includes(";") ? `"${s}"` : s;
  const quotedArgs = args.map(shellSafe);

  const fullCommand = isProduction
    ? `node ${quotedArgs.join(" ")} ${logRedirect}`
    : `npx ${quotedArgs.join(" ")} ${logRedirect}`;

  const child = spawn(fullCommand, [], {
    cwd: clipbotRoot,
    stdio: "ignore",
    shell: true,
    env: {
      ...process.env,
      FORCE_COLOR: "0",
    },
  });

  // Unref so the Next.js server doesn't wait for this process
  child.unref();

  return { pid: child.pid };
}
