import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/settings-store";

const ZERNIO_BASE = "https://zernio.com/api/v1";

export async function GET(req: NextRequest) {
  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  const params = req.nextUrl.searchParams;
  const fromDate = params.get("fromDate") || new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const toDate = params.get("toDate") || new Date().toISOString().split("T")[0];
  const platform = params.get("platform") || undefined;
  const sortBy = params.get("sortBy") || "date";
  const order = params.get("order") || "desc";
  const limit = params.get("limit") || "50";
  const page = params.get("page") || "1";

  try {
    // Build query params for Zernio /v1/analytics
    const qp = new URLSearchParams({ fromDate, toDate, sortBy, order, limit, page });
    if (platform && platform !== "all") qp.set("platform", platform);

    const res = await fetch(`${ZERNIO_BASE}/analytics?${qp}`, {
      headers: { Authorization: `Bearer ${config.lateApiKey}` },
    });

    if (res.status === 402) {
      return NextResponse.json({ error: "Analytics add-on required on your Zernio plan" }, { status: 402 });
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ error: `Zernio ${res.status}: ${body.slice(0, 200)}` }, { status: res.status });
    }

    const data = await res.json();

    // Pass through the full Zernio response — it includes overview, posts, pagination
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
