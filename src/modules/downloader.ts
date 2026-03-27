import { stat, access, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { log } from "../utils/logger.js";
import { extractVideoSlug } from "../utils/url.js";
import { getCookiesPath } from "../config/paths.js";
import type { DownloadOptions, DownloadResult } from "../types/pipeline.js";

const execFileAsync = promisify(execFile);
const isDocker = process.env.CLIPBOT_PRODUCTION === "1" || process.env.NODE_ENV === "production";

// ── Cobalt download (no cookies needed, works from datacenter IPs) ──────

const COBALT_URL = process.env.COBALT_URL || "https://api.cobalt.tools";

async function downloadViaCobalt(
  videoUrl: string,
  outputDir: string,
  slug: string,
  quality: string
): Promise<string | null> {
  try {
    log.debug(`Trying Cobalt download: ${videoUrl}`);
    const res = await fetch(`${COBALT_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: videoUrl,
        videoQuality: quality,
        filenameStyle: "basic",
        downloadMode: "auto",
      }),
    });

    if (!res.ok) {
      log.debug(`Cobalt returned ${res.status}`);
      return null;
    }

    const data = await res.json() as { status?: string; url?: string };

    if (data.status === "tunnel" || data.status === "redirect") {
      // Cobalt gives us a direct download URL
      const downloadUrl = data.url;
      if (!downloadUrl) return null;

      log.debug(`Cobalt tunnel URL received, downloading...`);
      const fileRes = await fetch(downloadUrl);
      if (!fileRes.ok) return null;

      const outputPath = path.join(outputDir, `${slug}.mp4`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      await writeFile(outputPath, buffer);
      log.debug(`Cobalt download complete: ${buffer.length} bytes`);
      return outputPath;
    }

    log.debug(`Cobalt status: ${data.status}`);
    return null;
  } catch (e) {
    log.debug(`Cobalt failed: ${(e as Error).message}`);
    return null;
  }
}

// ── yt-dlp download (fallback, needs cookies on cloud) ──────────────────

async function resolveYtDlp(): Promise<{ bin: string; prefixArgs: string[] }> {
  for (const bin of ["yt-dlp", "yt-dlp.exe"]) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5000 });
      return { bin, prefixArgs: [] };
    } catch {
      // not found
    }
  }
  for (const py of ["python", "python3", "py"]) {
    try {
      await execFileAsync(py, ["-m", "yt_dlp", "--version"], { timeout: 8000 });
      return { bin: py, prefixArgs: ["-m", "yt_dlp"] };
    } catch {
      // not found
    }
  }
  throw new Error("yt-dlp not found");
}

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
  const autoPath = path.resolve(process.cwd(), "cookies.txt");
  try {
    await access(autoPath);
    return autoPath;
  } catch {}
  const homeCookies = getCookiesPath();
  try {
    await access(homeCookies);
    return homeCookies;
  } catch {}
  return null;
}

async function downloadViaYtDlp(
  videoUrl: string,
  outputDir: string,
  slug: string,
  options: DownloadOptions
): Promise<string> {
  const outputTemplate = path.join(outputDir, `${slug}.%(ext)s`);
  const { bin, prefixArgs } = await resolveYtDlp();
  const cookiesFile = await findCookiesFile(options.cookiesFile);

  log.debug(`Downloading via yt-dlp: ${videoUrl}`);
  if (cookiesFile) log.debug(`Using cookies from: ${cookiesFile}`);

  const args = [
    ...prefixArgs,
    "-f", `best[height<=${options.quality}][ext=mp4]/bestvideo[height<=${options.quality}]+bestaudio/best`,
    "--merge-output-format", "mp4",
    "-o", outputTemplate,
    "--no-playlist",
    "--concurrent-fragments", "4",
    "--fragment-retries", "3",
    "--buffer-size", "16K",
    // Use Android client to bypass bot detection on datacenter IPs
    "--extractor-args", "youtube:player_client=android,web",
    ...(cookiesFile ? ["--cookies", cookiesFile] : []),
    ...(!isDocker && typeof ffmpegPath === "string" ? ["--ffmpeg-location", ffmpegPath] : []),
    videoUrl,
  ];

  await execFileAsync(bin, args, {
    timeout: 600000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return path.join(outputDir, `${slug}.mp4`);
}

// ── Main download function ──────────────────────────────────────────────

export async function downloadVideo(
  videoUrl: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  // Local file: skip download entirely — file is already on disk
  if (videoUrl.startsWith("file://")) {
    const localPath = decodeURIComponent(videoUrl.replace("file://", ""));
    // Verify file exists
    await access(localPath);
    const fileStats = await stat(localPath);
    const filename = path.basename(localPath);

    log.success(`Using local file: ${filename} (${Math.round(fileStats.size / 1024 / 1024)}MB)`);

    return {
      filePath: localPath,
      filename,
      fileSize: fileStats.size,
      quality: options.quality,
      durationSeconds: 0,
    };
  }

  const slug = extractVideoSlug(videoUrl);

  // Try Cobalt first (works without cookies, no bot detection)
  const cobaltPath = await downloadViaCobalt(videoUrl, options.outputDir, slug, options.quality);
  let filePath: string;

  if (cobaltPath) {
    filePath = cobaltPath;
    log.debug(`Downloaded via Cobalt`);
  } else {
    // Fall back to yt-dlp
    log.debug(`Cobalt unavailable, falling back to yt-dlp`);
    filePath = await downloadViaYtDlp(videoUrl, options.outputDir, slug, options);
  }

  const fileStats = await stat(filePath);
  const filename = `${slug}.mp4`;

  log.debug(`Downloaded ${fileStats.size} bytes to ${filePath}`);

  return {
    filePath,
    filename,
    fileSize: fileStats.size,
    quality: options.quality,
    durationSeconds: 0,
  };
}
