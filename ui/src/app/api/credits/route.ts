import { NextRequest, NextResponse } from "next/server";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

// GET /api/credits?email=xxx — get subscription info
export async function GET(req: NextRequest) {
  if (!isConvexMode()) {
    return NextResponse.json({ tier: "local", messageCount: 0, limit: Infinity, credits: Infinity, mode: "local" });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ tier: "local", messageCount: 0, limit: Infinity, credits: Infinity, mode: "local" });
  }

  const sub = await convex.query(api.users.getSubscription, { email });
  return NextResponse.json({
    ...sub,
    credits: sub.limit - sub.messageCount, // backwards compat
    mode: "cloud",
  });
}

// POST /api/credits — ensure user exists (called after sign-up/sign-in)
export async function POST(req: NextRequest) {
  if (!isConvexMode()) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  const { email, name } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  const user = await convex.mutation(api.users.getOrCreate, {
    email,
    name: name || email.split("@")[0],
  });

  return NextResponse.json({ ok: true, user });
}
