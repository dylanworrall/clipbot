import { createHash } from "node:crypto";

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
];

/** Extract YouTube video ID (11-char). Used internally for YouTube-specific subtitle fetching. */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export type VideoPlatform = "youtube" | "twitch" | "kick" | "other";

/** Detect which platform a URL belongs to. */
export function detectPlatform(url: string): VideoPlatform {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname === "youtube.com" || hostname === "youtu.be" || hostname === "m.youtube.com") return "youtube";
    if (hostname === "twitch.tv" || hostname.endsWith(".twitch.tv")) return "twitch";
    if (hostname === "kick.com" || hostname.endsWith(".kick.com")) return "kick";
    return "other";
  } catch {
    return "other";
  }
}

/** Accept any http/https URL — let yt-dlp do the real validation. */
export function isValidVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract a filesystem-safe slug from any video URL.
 * - YouTube: 11-char video ID
 * - Twitch: "twitch-{videoId}" or "twitch-clip-{slug}"
 * - Kick: slug from path
 * - Fallback: 8-char hash of the URL
 */
export function extractVideoSlug(url: string): string {
  const platform = detectPlatform(url);

  if (platform === "youtube") {
    const id = extractYouTubeId(url);
    if (id) return id;
  }

  if (platform === "twitch") {
    try {
      const { pathname } = new URL(url);
      // Twitch VODs: /videos/123456789
      const vodMatch = pathname.match(/\/videos\/(\d+)/);
      if (vodMatch) return `twitch-${vodMatch[1]}`;
      // Twitch clips: /clip/SlugName or /*/clip/SlugName
      const clipMatch = pathname.match(/\/clip\/([a-zA-Z0-9_-]+)/);
      if (clipMatch) return `twitch-clip-${clipMatch[1]}`;
      // Channel VOD fallback: /channelname/video/123
      const chanVod = pathname.match(/\/video\/(\d+)/);
      if (chanVod) return `twitch-${chanVod[1]}`;
    } catch {
      // fall through
    }
  }

  if (platform === "kick") {
    try {
      const { pathname } = new URL(url);
      // Kick clips: /*/clips/clip_xxx or /*/clip/clip_xxx
      const clipMatch = pathname.match(/\/clips?\/([a-zA-Z0-9_-]+)/);
      if (clipMatch) return `kick-${clipMatch[1]}`;
      // Kick VODs: /video/uuid
      const vodMatch = pathname.match(/\/video\/([a-zA-Z0-9_-]+)/);
      if (vodMatch) return `kick-${vodMatch[1]}`;
    } catch {
      // fall through
    }
  }

  // Fallback: 8-char hash of the URL
  return createHash("sha256").update(url).digest("hex").slice(0, 8);
}

// Legacy aliases for backwards compatibility with imports
export const extractVideoId = extractYouTubeId;
export const isYouTubeUrl = (url: string): boolean => extractYouTubeId(url) !== null;
