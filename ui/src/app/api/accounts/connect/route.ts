import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/settings-store";

const ZERNIO_BASE = "https://zernio.com/api/v1";

const SUPPORTED_PLATFORMS = [
  "twitter", "instagram", "facebook", "linkedin", "tiktok", "youtube",
  "pinterest", "reddit", "bluesky", "threads", "googlebusiness", "telegram",
  "snapchat", "whatsapp",
];

interface ZernioAccount {
  _id: string;
  id?: string;
  platform: string;
  name?: string;
  profileId?: string;
}

interface ZernioProfile {
  _id?: string;
  id?: string;
}

/** List all connected accounts */
async function listAccounts(apiKey: string): Promise<ZernioAccount[]> {
  const res = await fetch(`${ZERNIO_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.accounts ?? data.data ?? [];
}

/** List all profiles */
async function listProfiles(apiKey: string): Promise<ZernioProfile[]> {
  const res = await fetch(`${ZERNIO_BASE}/profiles`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.profiles ?? data.data ?? [];
}

/** Create a new profile */
async function createProfile(apiKey: string, name: string): Promise<string> {
  const res = await fetch(`${ZERNIO_BASE}/profiles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description: `Profile for ${name}` }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create profile: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data._id ?? data.id ?? data.profile?._id ?? data.profile?.id;
}

/**
 * Find a profile that doesn't already have this platform connected,
 * or create a new one. This allows multiple accounts per platform
 * since each profile can only hold one account per platform.
 */
async function getAvailableProfile(apiKey: string, platform: string): Promise<string> {
  const [accounts, profiles] = await Promise.all([
    listAccounts(apiKey),
    listProfiles(apiKey),
  ]);

  // Find profileIds that already have this platform connected
  const profilesWithPlatform = new Set(
    accounts
      .filter((a) => a.platform === platform)
      .map((a) => a.profileId)
      .filter(Boolean)
  );

  // Find a profile that does NOT have this platform yet
  for (const p of profiles) {
    const pid = p._id ?? p.id;
    if (pid && !profilesWithPlatform.has(pid)) {
      return pid;
    }
  }

  // All existing profiles already have this platform — create a new one
  const count = profilesWithPlatform.size + 1;
  const name = count === 1 ? "Socials" : `Socials ${count}`;
  return createProfile(apiKey, name);
}

export async function POST(req: NextRequest) {
  const config = await getEffectiveConfig();

  if (!config.lateApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const { platform } = await req.json() as { platform: string };

  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Supported: ${SUPPORTED_PLATFORMS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // 1. Find or create a profile that doesn't already have this platform
    const profileId = await getAvailableProfile(config.lateApiKey, platform);

    // 2. Build redirect URL back to our settings page
    const baseUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/api\/.*$/, "") || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/settings?tab=connectors&connected=${platform}`;

    // 3. Get the OAuth connect URL from Zernio
    const params = new URLSearchParams({
      profileId,
      redirect_url: redirectUrl,
    });

    const connectRes = await fetch(`${ZERNIO_BASE}/connect/${platform}?${params}`, {
      headers: {
        Authorization: `Bearer ${config.lateApiKey}`,
      },
    });

    if (!connectRes.ok) {
      const body = await connectRes.text().catch(() => "");
      return NextResponse.json({ error: `Zernio connect error ${connectRes.status}: ${body}` }, { status: connectRes.status });
    }

    const data = await connectRes.json();

    if (!data.authUrl) {
      return NextResponse.json({ error: "No authUrl returned from Zernio" }, { status: 502 });
    }

    return NextResponse.json({ authUrl: data.authUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
