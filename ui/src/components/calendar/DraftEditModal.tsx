"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  Send,
  Trash2,
  Loader2,
  FileText,
  Video,
  Calendar,
} from "lucide-react";
import type { ScheduledPost } from "./PostChip";

interface DraftEditModalProps {
  post: ScheduledPost;
  onClose: () => void;
  onSaved: () => void;
}

export function DraftEditModal({ post, onClose, onSaved }: DraftEditModalProps) {
  const [content, setContent] = useState(post.content || "");
  const [title, setTitle] = useState(post.clipTitle);
  const [scheduledFor, setScheduledFor] = useState(() => {
    if (!post.scheduledFor) return "";
    // Convert ISO to datetime-local format
    const d = new Date(post.scheduledFor);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, unknown> = {
        clipTitle: title,
        content,
      };
      if (scheduledFor) {
        updates.scheduledFor = new Date(scheduledFor).toISOString();
        updates.status = "scheduled";
      }
      const res = await fetch(`/api/calendar/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/${post.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    }
    setPublishing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
    setDeleting(false);
  };

  const isClip = !post.type || post.type === "clip";
  const TypeIcon = isClip ? Video : FileText;
  const typeLabel = isClip ? "Clip" : post.type === "draft" ? "Draft" : "Text";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-0/95 backdrop-blur-2xl rounded-2xl border border-border ring-1 ring-white/5 shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0A84FF]/10">
              <TypeIcon size={16} className="text-[#0A84FF]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">
                Edit {typeLabel}
              </h2>
              <p className="text-[11px] text-muted-foreground/80">
                {post.status === "draft" ? "Draft" : "Scheduled"} post
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground/70 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-0 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:border-[#0A84FF]/50 focus:outline-none transition-colors"
              placeholder="Post title..."
            />
          </div>

          {/* Content textarea */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full bg-surface-0 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:border-[#0A84FF]/50 focus:outline-none transition-colors resize-none"
              placeholder="Write your post content..."
            />
            <p className="text-[10px] text-muted-foreground/60 text-right">
              {content.length} characters
            </p>
          </div>

          {/* Platforms */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Platforms
            </label>
            <div className="flex flex-wrap gap-1.5">
              {post.platforms.map((p) => (
                <Badge key={p} variant="blue" className="text-xs capitalize">
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar size={12} />
              Schedule
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-surface-0 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:border-[#0A84FF]/50 focus:outline-none transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-[12px] font-medium px-3 py-2 rounded-lg bg-[#FF453A]/10 text-[#FF453A]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[#FF453A] hover:text-[#FF453A] hover:bg-[#FF453A]/10"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </Button>
            {(post.type === "draft" || post.type === "text") && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                disabled={publishing || !content.trim()}
              >
                {publishing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Publish Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
