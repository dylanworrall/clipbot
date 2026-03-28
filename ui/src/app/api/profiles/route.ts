import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/settings-store";

const ZERNIO_BASE = "https://zernio.com/api/v1";

export async function GET() {
  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    return NextResponse.json({ profiles: [], error: "API key not configured" });
  }

  try {
    const res = await fetch(`${ZERNIO_BASE}/profiles`, {
      headers: { Authorization: `Bearer ${config.lateApiKey}` },
    });
    if (!res.ok) {
      return NextResponse.json({ profiles: [], error: `Zernio ${res.status}` });
    }
    const data = await res.json();
    return NextResponse.json({ profiles: data.profiles ?? data.data ?? [] });
  } catch (err) {
    return NextResponse.json({ profiles: [], error: err instanceof Error ? err.message : String(err) });
  }
}

export async function POST(req: NextRequest) {
  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const { name, description, color } = await req.json() as { name: string; description?: string; color?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
  }

  try {
    const body: Record<string, string> = { name: name.trim() };
    if (description) body.description = description;
    if (color) body.color = color;

    const res = await fetch(`${ZERNIO_BASE}/profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.lateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return NextResponse.json({ error: `Zernio ${res.status}: ${errBody}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
