import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig, saveSettings } from "@/lib/settings-store";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function GET() {
  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const settings = await convex.query(api.settings.get, {});
    return NextResponse.json(settings);
  }

  const config = await getEffectiveConfig();
  // Mask API keys for display
  return NextResponse.json({
    ...config,
    claudeApiKey: config.claudeApiKey ? "sk-...configured" : "",
    lateApiKey: config.lateApiKey ? "...configured" : "",
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    await convex.mutation(api.settings.update, { updates: body });
    return NextResponse.json({ ok: true });
  }

  await saveSettings(body);
  return NextResponse.json({ ok: true });
}
