import { NextRequest, NextResponse } from "next/server";
import { checkUsage, incrementUsage } from "@/lib/usage-store";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const usage = await checkUsage(email);
  return NextResponse.json(usage);
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const usage = await checkUsage(email);
  if (!usage.allowed) {
    return NextResponse.json({ error: "limit_reached", ...usage }, { status: 402 });
  }

  await incrementUsage(email);
  return NextResponse.json({ success: true, count: usage.count + 1, limit: usage.limit });
}
