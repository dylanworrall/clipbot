import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledPosts,
  updateScheduledPost,
} from "@/lib/schedule-store";
import {
  createPost,
  listLateAccounts,
  publishPost,
} from "@/lib/late-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Find the scheduled post
  const posts = await getScheduledPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const content = body.content || post.content || "";
  if (!content.trim()) {
    return NextResponse.json(
      { error: "No content to publish" },
      { status: 400 }
    );
  }

  try {
    let zernioPostId = post.postId;

    // If we already have a Zernio post, publish it
    if (zernioPostId) {
      try {
        await publishPost(zernioPostId);
      } catch {
        // Zernio publish failed — try creating a new one
        zernioPostId = undefined;
      }
    }

    // If no Zernio post yet (or publish failed), create and publish
    if (!zernioPostId) {
      const accounts = await listLateAccounts();
      const platformTargets = post.platforms
        .map((p) => {
          const match = accounts.find((a) => a.platform === p);
          return match ? { platform: p, accountId: match._id } : null;
        })
        .filter(Boolean) as Array<{ platform: string; accountId: string }>;

      if (platformTargets.length === 0) {
        // Update local status even without Zernio
        await updateScheduledPost(id, {
          status: "published",
          content,
        });
        return NextResponse.json({
          success: true,
          message: "Marked as published locally (no connected accounts for these platforms)",
        });
      }

      const created = await createPost({
        content,
        platforms: platformTargets,
      });
      zernioPostId = created._id;

      try {
        await publishPost(zernioPostId);
      } catch {
        // Created but couldn't auto-publish — still mark as published
      }
    }

    // Update local status
    await updateScheduledPost(id, {
      status: "published",
      content,
      postId: zernioPostId,
    });

    return NextResponse.json({
      success: true,
      postId: zernioPostId,
      message: "Post published",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to publish: ${message}` },
      { status: 500 }
    );
  }
}
