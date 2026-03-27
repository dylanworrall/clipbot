"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Clock, GripVertical, Video, FileText } from "lucide-react";

export interface ScheduledPost {
  id: string;
  type?: "clip" | "draft" | "text";
  runId?: string;
  clipIndex?: number;
  clipTitle: string;
  content?: string;
  platforms: string[];
  scheduledFor: string;
  status: string;
}

interface PostChipProps {
  post: ScheduledPost;
  compact?: boolean;
  overlay?: boolean;
  onClick?: (post: ScheduledPost) => void;
}

function getTypeStyles(type?: string) {
  switch (type) {
    case "draft":
      return {
        bg: "bg-[#0A84FF]/15 text-[#0A84FF]",
        dot: "bg-[#0A84FF]",
        Icon: FileText,
      };
    case "text":
      return {
        bg: "bg-[#BF5AF2]/15 text-[#BF5AF2]",
        dot: "bg-[#BF5AF2]",
        Icon: FileText,
      };
    default:
      // clip (default)
      return {
        bg: "bg-[#FF9F0A]/15 text-[#FF9F0A]",
        dot: "bg-[#FF9F0A]",
        Icon: Video,
      };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "published":
      return "green" as const;
    case "cancelled":
      return "red" as const;
    case "draft":
      return "blue" as const;
    default:
      return "gold" as const;
  }
}

export function PostChip({ post, compact, overlay, onClick }: PostChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: post.id,
      data: { post },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const { bg: statusColor, dot: statusDot, Icon: TypeIcon } = getTypeStyles(
    post.type
  );

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(post);
    }
  };

  if (overlay) {
    return compact ? (
      <div
        className={`text-xs truncate rounded-lg px-2 py-1 flex items-center gap-1.5 ${statusColor} shadow-xl backdrop-blur-sm`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        {post.clipTitle}
      </div>
    ) : (
      <div className="rounded-xl bg-[#2A2A2C] border border-white/5 p-3 shadow-xl min-w-[200px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TypeIcon className="h-3 w-3 shrink-0" />
            <span className="text-sm font-medium text-white/90 truncate">
              {post.clipTitle}
            </span>
          </div>
          <Badge variant={getStatusBadge(post.status)}>{post.status}</Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
          <Clock className="h-3 w-3" />
          {new Date(post.scheduledFor).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {post.platforms.map((p) => (
            <Badge key={p} variant="secondary" className="text-xs capitalize">
              {p}
            </Badge>
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
        onClick={handleClick}
        className={`text-xs truncate rounded-lg px-2 py-1 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-opacity ${statusColor} ${
          isDragging ? "opacity-30" : ""
        } ${onClick ? "hover:ring-1 hover:ring-white/10" : ""}`}
      >
        <TypeIcon className="h-3 w-3 shrink-0" />
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        {post.clipTitle}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={`rounded-xl bg-[#2A2A2C] border border-white/5 p-2.5 shadow-sm group transition-opacity ${
        isDragging ? "opacity-30" : ""
      } ${onClick ? "cursor-pointer hover:border-white/10" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-white/25 hover:text-white/50 shrink-0 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <TypeIcon className="h-3.5 w-3.5 shrink-0 text-white/40" />
              <span className="text-sm font-medium text-white/90 truncate">
                {post.clipTitle}
              </span>
            </div>
            <Badge variant={getStatusBadge(post.status)}>{post.status}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
            <Clock className="h-3 w-3" />
            {new Date(post.scheduledFor).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.platforms.map((p) => (
              <Badge
                key={p}
                variant="secondary"
                className="text-xs capitalize"
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
