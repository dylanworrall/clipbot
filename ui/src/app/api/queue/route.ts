import { NextRequest, NextResponse } from "next/server";
import {
  getQueueItems,
  getPendingItems,
  updateQueueItem,
  removeQueueItem,
} from "@/lib/queue-store";
import { addScheduledPost } from "@/lib/schedule-store";

/** GET /api/queue — return queue items (default: pending only) */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  if (status === "all") {
    const items = await getQueueItems();
    return NextResponse.json(items);
  }
  const pending = await getPendingItems();
  return NextResponse.json(pending);
}

/** POST /api/queue — approve or reject a queue item */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id } = body as { action: string; id: string };

    if (action === "approve" && id) {
      const item = await updateQueueItem(id, { status: "approved" });
      if (!item) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      // Add to calendar as a draft
      const calendarPost = {
        id: crypto.randomUUID(),
        type: "draft" as const,
        clipTitle: item.title || item.content.slice(0, 50),
        content: item.content,
        platforms: item.platforms,
        scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };
      await addScheduledPost(calendarPost);

      return NextResponse.json({
        success: true,
        item,
        calendarId: calendarPost.id,
      });
    }

    if (action === "reject" && id) {
      const item = await updateQueueItem(id, { status: "rejected" });
      if (!item) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, item });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'approve' or 'reject' with an id." },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/queue?id=xxx — remove a queue item */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const removed = await removeQueueItem(id);
  if (!removed) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
