import { NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/settings-store";

export async function GET() {
  const config = await getEffectiveConfig();

  if (!config.lateApiKey) {
    return NextResponse.json({ accounts: [], error: "No Zernio API key configured" });
  }

  try {
    const res = await fetch("https://zernio.com/api/v1/accounts", {
      headers: {
        Authorization: `Bearer ${config.lateApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ accounts: [], error: `Zernio API ${res.status}` });
    }

    const data = await res.json() as {
      accounts: Array<{ _id: string; platform: string; displayName?: string; name?: string; username?: string }>;
    };

    const accounts = (data.accounts ?? []).map((a) => ({
      id: a._id,
      platform: a.platform,
      name: a.displayName ?? a.name ?? a.username ?? a._id,
    }));

    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json({
      accounts: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
