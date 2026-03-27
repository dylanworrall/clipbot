import { NextRequest, NextResponse } from "next/server";
import { getRun, getManifest } from "@/lib/run-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { getCliRoot, getRerenderScript } from "@/lib/paths";
import path from "node:path";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const isProduction = process.env.CLIPBOT_PRODUCTION === "1";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const manifest = await getManifest(run.outputDir);
  if (!manifest?.clips?.length) {
    return NextResponse.json({ error: "No clips to publish" }, { status: 400 });
  }

  const body = await req.json();
  const { clipIndices, platforms, scheduledFor } = body as {
    clipIndices: number[];
    platforms: string[];
    scheduledFor?: string;
  };

  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    return NextResponse.json({ error: "Late API key not configured" }, { status: 400 });
  }

  // Fetch connected accounts from Zernio (supports multiple per platform)
  let zernioAccounts: Array<{ _id: string; platform: string }> = [];
  try {
    const acctRes = await fetch("https://zernio.com/api/v1/accounts", {
      headers: { Authorization: `Bearer ${config.lateApiKey}` },
    });
    if (acctRes.ok) {
      const acctData = await acctRes.json();
      zernioAccounts = acctData.accounts ?? [];
    }
  } catch {
    // Fall back to config if Zernio is unreachable
  }

  // Legacy fallback: static config map
  const legacyAccounts = config.accounts ?? {};

  try {
    const results: Array<{ clipIndex: number; success: boolean; error?: string }> = [];

    const captionMode = config.captionMode ?? "overlay";

    for (const idx of clipIndices) {
      const clip = manifest.clips.find((c) => c.momentIndex === idx);
      const moment = manifest.moments?.find((m) => m.index === idx);
      if (!clip || !moment) continue;

      try {
        // Auto-burn captions before publish if in overlay mode and clip isn't already captioned
        let publishFilePath = clip.filePath;
        if (
          captionMode === "overlay" &&
          config.subtitles !== false &&
          !clip.filePath.includes("_captioned")
        ) {
          const captionedPath = clip.filePath.replace(".mp4", "_captioned.mp4");
          if (existsSync(captionedPath)) {
            // Already have a captioned version from a previous re-render
            publishFilePath = captionedPath;
          } else {
            // Burn captions on-the-fly by spawning rerender-clip
            try {
              const clipbotRoot = getCliRoot();
              const rerenderScript = getRerenderScript();
              const { writeFileSync, mkdirSync } = await import("node:fs");
              const jobDir = path.join(run.outputDir, "rerender");
              mkdirSync(jobDir, { recursive: true });

              const job = {
                sourceVideo: manifest.download?.filePath ?? "",
                outputDir: run.outputDir,
                moment: {
                  index: moment.index,
                  title: moment.title,
                  startSeconds: moment.startSeconds,
                  endSeconds: moment.endSeconds,
                  durationSeconds: moment.durationSeconds,
                  hookText: moment.hookText,
                },
                wordTimestamps: manifest.wordTimestamps ?? [],
                backgroundFillStyle: config.backgroundFillStyle ?? "blurred-zoom",
                captionStyle: config.captionStyle ?? null,
                trimStart: 0,
                trimEnd: clip.durationSeconds,
                padBefore: 1.5,
                padAfter: 0.5,
              };

              const jobPath = path.join(jobDir, `publish_job_${idx}.json`);
              writeFileSync(jobPath, JSON.stringify(job, null, 2), "utf-8");

              const command = isProduction
                ? `node "${rerenderScript}" "${jobPath}"`
                : `npx tsx --tsconfig "${path.join(clipbotRoot, "tsconfig.json")}" "${rerenderScript}" "${jobPath}"`;
              execSync(command, { cwd: clipbotRoot, timeout: 120000, stdio: "pipe" });

              if (existsSync(captionedPath)) {
                publishFilePath = captionedPath;
              }
            } catch (burnErr) {
              // If burn fails, publish the raw clip anyway
              console.warn(`Auto-burn failed for clip ${idx}, publishing raw:`, burnErr);
            }
          }
        }

        // Extract filename from path (handle both / and \ separators)
        const filename = publishFilePath.split(/[\\/]/).pop() ?? "clip.mp4";

        // 1. Get presigned URL
        const presignRes = await fetch("https://zernio.com/api/v1/media/presign", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.lateApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename, contentType: "video/mp4" }),
        });

        if (!presignRes.ok) {
          const errBody = await presignRes.text().catch(() => "");
          throw new Error(`Presign failed: ${presignRes.status} ${errBody}`);
        }
        const presign = await presignRes.json() as { uploadUrl: string; publicUrl: string };

        // 2. Upload file
        const { readFile } = await import("node:fs/promises");
        const fileBuffer = await readFile(publishFilePath);
        const uploadRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "video/mp4" },
          body: fileBuffer,
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

        // 3. Create post
        const hashtags = moment.hashtags.map((h: string) => `#${h}`).join(" ");
        const shortsSuffix = platforms.includes("youtube") ? " #shorts" : "";
        // Build platform targets: use all Zernio accounts for each platform, fallback to legacy config
        const platformTargets: Array<{ platform: string; accountId: string }> = [];
        for (const p of platforms as string[]) {
          const zernioMatches = zernioAccounts.filter((a) => a.platform === p);
          if (zernioMatches.length > 0) {
            for (const a of zernioMatches) {
              platformTargets.push({ platform: p, accountId: a._id });
            }
          } else if (legacyAccounts[p]) {
            platformTargets.push({ platform: p, accountId: legacyAccounts[p] });
          }
        }

        if (platformTargets.length === 0) {
          throw new Error(`No connected accounts for platforms: ${platforms.join(", ")}. Connect accounts in Settings > Connectors.`);
        }

        const postRes = await fetch("https://zernio.com/api/v1/posts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.lateApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `${moment.title}\n\n${moment.hookText}\n\n${hashtags}${shortsSuffix}`,
            mediaItems: [{ type: "video", url: presign.publicUrl }],
            platforms: platformTargets,
            publishNow: !scheduledFor,
            ...(scheduledFor && { scheduledFor }),
          }),
        });

        if (!postRes.ok) {
          const errBody = await postRes.text().catch(() => "");
          throw new Error(`Post failed: ${postRes.status} ${errBody}`);
        }
        results.push({ clipIndex: idx, success: true });
      } catch (err) {
        results.push({
          clipIndex: idx,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
