import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/settings-store";

export async function GET(req: NextRequest) {
  const config = await getEffectiveConfig();

  if (!config.lateApiKey) {
    return NextResponse.json({ accounts: [], error: "No Zernio API key configured" });
  }

  const profileId = req.nextUrl.searchParams.get("profileId") || undefined;
  const platform = req.nextUrl.searchParams.get("platform") || undefined;

  try {
    const params = new URLSearchParams();
    if (profileId) params.set("profileId", profileId);
    if (platform) params.set("platform", platform);
    const qs = params.toString();

    const res = await fetch(`https://zernio.com/api/v1/accounts${qs ? `?${qs}` : ""}`, {
      headers: {
        Authorization: `Bearer ${config.lateApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ accounts: [], error: `Zernio API ${res.status}` });
    }

    const data = await res.json() as {
      accounts: Array<{
        _id: string;
        platform: string;
        displayName?: string;
        name?: string;
        username?: string;
        profileId?: { _id: string; name: string } | string;
      }>;
    };

    const accounts = (data.accounts ?? []).map((a) => ({
      id: a._id,
      platform: a.platform,
      name: a.displayName ?? a.name ?? a.username ?? a._id,
      profileId: typeof a.profileId === "object" ? a.profileId?._id : a.profileId,
    }));

    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json({
      accounts: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
