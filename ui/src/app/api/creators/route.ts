import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCreators, addCreator } from "@/lib/creator-store";
import { extractChannelId, fetchChannelFeedWithMeta } from "@/lib/youtube-rss";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function GET() {
  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const creators = await convex.query(api.creators.list, {});
    return NextResponse.json(creators);
  }
  const creators = await getCreators();
  return NextResponse.json(creators);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, autoProcess, defaultOptions } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Resolve channel ID from URL
  const resolved = await extractChannelId(url);
  if (!resolved) {
    return NextResponse.json({ error: "Could not resolve channel ID from URL" }, { status: 400 });
  }

  // Get channel name from RSS feed if HTML scrape didn't find it
  let channelName = resolved.channelName;
  if (!channelName) {
    try {
      const feed = await fetchChannelFeedWithMeta(resolved.channelId);
      channelName = feed.channelName;
    } catch {
      // Feed fetch failed
    }
  }

  const creator = {
    id: randomUUID().slice(0, 8),
    channelId: resolved.channelId,
    channelName: channelName || "Unknown Channel",
    channelUrl: url,
    autoProcess: autoProcess ?? false,
    defaultOptions: defaultOptions ?? {},
    createdAt: new Date().toISOString(),
  };

  await addCreator(creator);
  return NextResponse.json(creator, { status: 201 });
}
