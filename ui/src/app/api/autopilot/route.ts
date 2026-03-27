import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig, getSettings, saveSettings } from "@/lib/settings-store";
import { getCreators } from "@/lib/creator-store";
import { fetchChannelFeedWithMeta } from "@/lib/youtube-rss";
import { listPosts, getPost } from "@/lib/late-client";
import type { AutopilotConfig } from "@/lib/types";

const DEFAULT_CONFIG: AutopilotConfig = {
  enabled: false,
  postsPerDay: 3,
  preferredTime: "09:00",
  platforms: ["twitter"],
};

async function getAutopilotConfig(): Promise<AutopilotConfig> {
  const settings = await getSettings();
  return { ...DEFAULT_CONFIG, ...settings.autopilot };
}

async function saveAutopilotConfig(config: AutopilotConfig): Promise<void> {
  await saveSettings({ autopilot: config });
}

export async function GET() {
  const config = await getAutopilotConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // If this is a config update
  if (body.action === "update_config") {
    const current = await getAutopilotConfig();
    const updated = { ...current, ...body.config };
    await saveAutopilotConfig(updated);
    return NextResponse.json(updated);
  }

  // Otherwise, run the research cycle
  try {
    const config = await getEffectiveConfig();
    const niche = body.topic || config.niche || "general";
    const count = body.count || 3;

    // 1. Fetch trending topics from tracked creators
    const creators = await getCreators();
    const trendingTopics: Array<{
      creator: string;
      title: string;
      publishedAt: string;
    }> = [];

    for (const c of creators.slice(0, 5)) {
      if (!c.channelId) continue;
      try {
        const feed = await fetchChannelFeedWithMeta(c.channelId);
        for (const v of feed.videos.slice(0, 3)) {
          trendingTopics.push({
            creator: c.channelName,
            title: v.title,
            publishedAt: v.publishedAt,
          });
        }
      } catch {
        /* skip unreachable feeds */
      }
    }

    // 2. Fetch recent post analytics
    let topPerforming: Array<{
      content: string;
      analytics: unknown;
      publishedAt?: string;
    }> = [];
    try {
      const recentPosts = await listPosts({
        status: "published",
        limit: 10,
      });
      for (const p of recentPosts.slice(0, 5)) {
        try {
          const full = await getPost(p._id);
          topPerforming.push({
            content: full.content,
            analytics: full.analytics,
            publishedAt: full.publishedAt,
          });
        } catch {
          /* skip */
        }
      }
    } catch {
      /* no posts yet */
    }

    // 3. Update last run timestamp
    const autopilotConfig = await getAutopilotConfig();
    await saveAutopilotConfig({
      ...autopilotConfig,
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "success",
    });

    return NextResponse.json({
      niche,
      requestedCount: count,
      trendingTopics: trendingTopics.slice(0, 15),
      topPerforming,
      creatorsTracked: creators.length,
      platforms: autopilotConfig.platforms,
      instruction: `Based on the trending topics and top-performing posts above, generate ${count} creative social media post drafts about "${niche}". After writing each post, call create_draft for each one with platforms: ${JSON.stringify(autopilotConfig.platforms)}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Update last run status on failure
    try {
      const autopilotConfig = await getAutopilotConfig();
      await saveAutopilotConfig({
        ...autopilotConfig,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: `error: ${message}`,
      });
    } catch {
      /* ignore save failure */
    }

    return NextResponse.json(
      { error: `Autopilot failed: ${message}` },
      { status: 500 }
    );
  }
}
