import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig, saveSettings } from "@/lib/settings-store";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

// Keys that are internal infrastructure — never sent to the client
const INTERNAL_KEYS = [
  "claudeApiKey",
  "lateApiKey",
  "googleApiKey",
  "accounts",
];

function stripInternalKeys(config: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...config };
  for (const key of INTERNAL_KEYS) {
    if (key in safe) {
      safe[key] = safe[key] ? "configured" : "";
    }
  }
  return safe;
}

export async function GET() {
  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const settings = await convex.query(api.settings.get, {});
    return NextResponse.json(stripInternalKeys(settings as Record<string, unknown>));
  }

  const config = await getEffectiveConfig();
  return NextResponse.json(stripInternalKeys(config as Record<string, unknown>));
}

// User-safe settings that can be changed from the UI
const ALLOWED_SETTINGS = new Set([
  "niche",
  "defaultMaxClips",
  "defaultMinScore",
  "defaultMaxDuration",
  "defaultPlatforms",
  "subtitles",
  "padBefore",
  "padAfter",
  "backgroundFillStyle",
  "captionMode",
  "captionStyle",
  "scoringWeights",
]);

export async function PUT(req: NextRequest) {
  const body = await req.json();

  // Only allow user-safe settings to be changed — never API keys
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_SETTINGS.has(key)) {
      filtered[key] = value;
    }
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
  }

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    await convex.mutation(api.settings.update, { updates: filtered });
    return NextResponse.json({ ok: true });
  }

  await saveSettings(filtered);
  return NextResponse.json({ ok: true });
}
