import { stat, access } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { log } from "../utils/logger.js";
import { extractVideoId } from "../utils/url.js";
import type { DownloadOptions, DownloadResult } from "../types/pipeline.js";

const execFileAsync = promisify(execFile);

/**
 * Resolve the yt-dlp binary. Prefer the standalone binary; fall back to python -m yt_dlp.
 */
async function resolveYtDlp(): Promise<{ bin: string; prefixArgs: string[] }> {
  // Try standalone binary first (much faster — no Python startup)
  for (const bin of ["yt-dlp", "yt-dlp.exe"]) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5000 });
      return { bin, prefixArgs: [] };
    } catch {
      // not found, try next
    }
  }

  // Fall back to python module
  for (const py of ["python", "python3", "py"]) {
    try {
      await execFileAsync(py, ["-m", "yt_dlp", "--version"], { timeout: 8000 });
      return { bin: py, prefixArgs: ["-m", "yt_dlp"] };
    } catch {
      // not found
    }
  }

  throw new Error(
    "yt-dlp not found. Install it with: pip install yt-dlp  or download the binary from https://github.com/yt-dlp/yt-dlp/releases"
  );
}

/**
 * Find a cookies file. Checks (in order):
 * 1. Explicit path from config
 * 2. cookies.txt in project root
 */
async function findCookiesFile(explicit?: string): Promise<string | null> {
  if (explicit) {
    const resolved = path.resolve(explicit);
    try {
      await access(resolved);
      return resolved;
    } catch {
      log.warn(`Cookies file not found at ${resolved}`);
    }
  }

  // Auto-detect cookies.txt in project root
  const autoPath = path.resolve(process.cwd(), "cookies.txt");
  try {
    await access(autoPath);
    log.debug(`Auto-detected cookies file: ${autoPath}`);
    return autoPath;
  } catch {
    // no cookies file
  }

  return null;
}

export async function downloadVideo(
  youtubeUrl: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  const videoId = extractVideoId(youtubeUrl) ?? "video";
  const outputTemplate = path.join(options.outputDir, `${videoId}.%(ext)s`);

  const { bin, prefixArgs } = await resolveYtDlp();
  const cookiesFile = await findCookiesFile(options.cookiesFile);

  log.debug(`Downloading via ${bin} ${prefixArgs.join(" ")}: ${youtubeUrl}`);
  if (cookiesFile) log.debug(`Using cookies from: ${cookiesFile}`);

  const args = [
    ...prefixArgs,
    // Prefer a single pre-muxed mp4 stream when available (avoids merge step entirely).
    // Fall back to separate video+audio only when a single stream isn't good enough.
    "-f", `best[height<=${options.quality}][ext=mp4]/bestvideo[height<=${options.quality}]+bestaudio/best`,
    "--merge-output-format", "mp4",
    "-o", outputTemplate,
    "--no-playlist",
    // Parallel fragment downloads — the single biggest speed-up for DASH streams
    "--concurrent-fragments", "4",
    // Retry fragments that fail
    "--fragment-retries", "3",
    // Buffer size for faster I/O
    "--buffer-size", "16K",
    // Cookies for age-restricted / private videos
    ...(cookiesFile ? ["--cookies", cookiesFile] : []),
    ...(typeof ffmpegPath === "string" ? ["--ffmpeg-location", ffmpegPath] : []),
    youtubeUrl,
  ];

  await execFileAsync(bin, args, {
    timeout: 600000, // 10 min timeout
    maxBuffer: 10 * 1024 * 1024, // 10 MB stdout buffer
  });

  // Find the downloaded file
  const expectedPath = path.join(options.outputDir, `${videoId}.mp4`);
  const fileStats = await stat(expectedPath);
  const filename = `${videoId}.mp4`;

  log.debug(`Downloaded ${fileStats.size} bytes to ${expectedPath}`);

  return {
    filePath: expectedPath,
    filename,
    fileSize: fileStats.size,
    quality: options.quality,
    durationSeconds: 0,
  };
}
