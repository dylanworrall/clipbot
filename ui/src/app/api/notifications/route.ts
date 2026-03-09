import { NextRequest, NextResponse } from "next/server";
import { getNotifications, updateNotification, getPendingCount } from "@/lib/notification-store";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

export async function GET(req: NextRequest) {
  const countOnly = req.nextUrl.searchParams.get("count");

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    if (countOnly === "true") {
      const count = await convex.query(api.notifications.pendingCount, {});
      return NextResponse.json({ count });
    }
    const notifications = await convex.query(api.notifications.list, {});
    return NextResponse.json(notifications);
  }

  if (countOnly === "true") {
    const count = await getPendingCount();
    return NextResponse.json({ count });
  }
  const notifications = await getNotifications();
  return NextResponse.json(notifications);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  if (isConvexMode()) {
    const convex = getConvexClient()!;
    const updated = await convex.mutation(api.notifications.update, { id: id as any, status });
    return NextResponse.json(updated);
  }

  const updated = await updateNotification(id, { status });
  if (!updated) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
