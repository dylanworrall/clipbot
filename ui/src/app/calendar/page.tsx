"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";

// Snap modifier — reduces jitter when dragging over small grid cells
const snapModifier: Modifier = ({ transform }) => ({
  ...transform,
  x: Math.round(transform.x),
  y: Math.round(transform.y),
});
import { WeekView } from "@/components/calendar/WeekView";
import { PostChip, type ScheduledPost } from "@/components/calendar/PostChip";
import { DraftEditModal } from "@/components/calendar/DraftEditModal";
import { PageTransition } from "@/components/ui/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats bar skeleton */}
      <Skeleton className="h-10 w-48 rounded-lg" />
      {/* Week header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
      {/* Grid skeleton */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
        <div className="grid grid-cols-8 gap-2">
          <Skeleton className="h-10" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-8 gap-2">
            <Skeleton className="h-12" />
            {Array.from({ length: 7 }).map((_, col) => (
              <Skeleton key={col} className="h-12" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [activePost, setActivePost] = useState<ScheduledPost | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const weekPostCount = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return posts.filter((p) => {
      const d = new Date(p.scheduledFor);
      return d >= weekStart && d < weekEnd;
    }).length;
  }, [posts]);

  const reschedule = async (id: string, newScheduledFor: string) => {
    await fetch(`/api/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: newScheduledFor }),
    });
    fetchPosts();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find((p) => p.id === event.active.id);
    setActivePost(post ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;

    const postId = active.id as string;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const target = over.id as string;

    if (target.startsWith("hour:")) {
      const payload = target.slice(5);
      const newDate = payload.slice(0, 10);
      const newHour = payload.slice(11, 13);
      const oldMinutes = post.scheduledFor.slice(14, 16);
      reschedule(postId, `${newDate}T${newHour}:${oldMinutes}:00.000Z`);
    }
  };

  return (
    <PageTransition>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
        <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Calendar</h1>

        {loading ? (
          <CalendarSkeleton />
        ) : (
          <>
            {/* Summary stats bar */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-1 border border-border px-4 py-2 shadow-sm">
                <CalendarDays size={14} className="text-[#0A84FF]" />
                <span className="text-[13px] font-medium text-foreground/70">
                  {weekPostCount} {weekPostCount === 1 ? "post" : "posts"} this week
                </span>
              </div>
            </div>

            {/* Empty state */}
            {posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="rounded-full bg-surface-2 p-4">
                  <CalendarDays className="h-8 w-8 text-muted" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  Nothing scheduled
                </h2>
                <p className="text-sm text-muted max-w-xs text-center">
                  Schedule clips or create drafts from the chat to see them here
                </p>
              </div>
            )}

            <DndContext
              collisionDetection={pointerWithin}
              modifiers={[snapModifier]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <WeekView posts={posts} onPostClick={setEditingPost} />
              <DragOverlay dropAnimation={null}>
                {activePost && <PostChip post={activePost} compact overlay />}
              </DragOverlay>
            </DndContext>
          </>
        )}

        {editingPost && (
          <DraftEditModal
            post={editingPost}
            onClose={() => setEditingPost(null)}
            onSaved={() => {
              setEditingPost(null);
              fetchPosts();
            }}
          />
        )}
        </div>
      </div>
    </PageTransition>
  );
}
