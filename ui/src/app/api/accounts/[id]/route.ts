import { NextRequest, NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/settings-store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const config = await getEffectiveConfig();

  if (!config.lateApiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://zernio.com/api/v1/accounts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.lateApiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ error: `Zernio API ${res.status}: ${body}` }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
