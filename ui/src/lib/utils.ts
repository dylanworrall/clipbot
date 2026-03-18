export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match?.[1] ?? null;
}

export function youtubeThumbUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function normalizeUrl(url: string): string {
  const videoId = extractVideoId(url);
  if (videoId) return `youtube:${videoId}`;
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return url;
  }
}

export function toMediaUrl(filePath: string): string {
  const normalized = filePath.split("\\").join("/");
  // Match both local (clipbot-output/) and cloud (/data/output/) paths
  for (const marker of ["clipbot-output/", "/data/output/", "output/"]) {
    const idx = normalized.indexOf(marker);
    if (idx !== -1) {
      return `/api/media/${normalized.slice(idx + marker.length)}`;
    }
  }
  // Fallback: use last two path segments (runId/filename)
  const segments = normalized.split("/").filter(Boolean);
  const relative = segments.slice(-2).join("/");
  return `/api/media/${relative}`;
}
