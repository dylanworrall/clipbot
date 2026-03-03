"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Clock, GripVertical } from "lucide-react";

export interface ScheduledPost {
  id: string;
  runId: string;
  clipIndex: number;
  clipTitle: string;
  platforms: string[];
  scheduledFor: string;
  status: string;
}

interface PostChipProps {
  post: ScheduledPost;
  compact?: boolean;
  overlay?: boolean;
}

export function PostChip({ post, compact, overlay }: PostChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: { post },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const statusColor =
    post.status === "published"
      ? "bg-accent/15 text-accent"
      : post.status === "cancelled"
        ? "bg-red-500/15 text-red-400"
        : "bg-brand-gold/15 text-brand-gold";

  const statusDot =
    post.status === "published"
      ? "bg-accent"
      : post.status === "cancelled"
        ? "bg-red-500"
        : "bg-brand-gold";

  if (overlay) {
    return compact ? (
      <div className={`text-xs truncate rounded-lg px-2 py-1 flex items-center gap-1.5 ${statusColor} shadow-xl backdrop-blur-sm`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        {post.clipTitle}
      </div>
    ) : (
      <div className="rounded-xl bg-surface-1 border border-border p-3 shadow-xl min-w-[200px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{post.clipTitle}</span>
          <Badge variant={post.status === "scheduled" ? "gold" : post.status === "published" ? "green" : "red"}>
            {post.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted mt-1">
          <Clock className="h-3 w-3" />
          {new Date(post.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {post.platforms.map((p) => (
            <Badge key={p} className="text-xs capitalize">{p}</Badge>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`text-xs truncate rounded-lg px-2 py-1 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-opacity ${statusColor} ${
          isDragging ? "opacity-30" : ""
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        {post.clipTitle}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl bg-surface-1 border border-border p-2.5 shadow-sm group transition-opacity ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted hover:text-foreground shrink-0 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{post.clipTitle}</span>
            <Badge variant={post.status === "scheduled" ? "gold" : post.status === "published" ? "green" : "red"}>
              {post.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted mt-1">
            <Clock className="h-3 w-3" />
            {new Date(post.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.platforms.map((p) => (
              <Badge key={p} className="text-xs capitalize">{p}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
