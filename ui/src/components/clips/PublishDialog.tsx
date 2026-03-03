"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, CalendarDays } from "lucide-react";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  clipIndices: number[];
  clipTitles?: Record<number, string>;
}

interface PublishResult {
  clipIndex: number;
  success: boolean;
  error?: string;
}

export function PublishDialog({
  open,
  onClose,
  runId,
  clipIndices,
  clipTitles,
}: PublishDialogProps) {
  const [tab, setTab] = useState<"now" | "schedule">("now");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "youtube", "instagram"]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/runs/${runId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipIndices, platforms }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      setResults(
        clipIndices.map((i) => ({
          clipIndex: i,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }))
      );
    }
    setPublishing(false);
  };

  const handleSchedule = async () => {
    if (!scheduledFor) return;
    setPublishing(true);
    try {
      for (const idx of clipIndices) {
        await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId,
            clipIndex: idx,
            clipTitle: clipTitles?.[idx] ?? `Clip #${idx}`,
            platforms,
            scheduledFor: new Date(scheduledFor).toISOString(),
          }),
        });
      }
      setScheduleSuccess(true);
    } catch {
      // Error handling
    }
    setPublishing(false);
  };

  const handleClose = () => {
    setResults([]);
    setScheduleSuccess(false);
    setScheduledFor("");
    setTab("now");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Publish Clips">
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          <button
            onClick={() => setTab("now")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "now" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Publish Now
          </button>
          <button
            onClick={() => setTab("schedule")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "schedule" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Schedule
          </button>
        </div>

        <p className="text-sm text-muted">
          {tab === "now" ? "Publishing" : "Scheduling"} {clipIndices.length} clip{clipIndices.length !== 1 ? "s" : ""} to:
        </p>

        <div className="flex gap-3">
          {["tiktok", "youtube", "instagram", "facebook"].map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-sm cursor-pointer capitalize"
            >
              <input
                type="checkbox"
                checked={platforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="accent-[var(--color-accent)]"
                disabled={publishing}
              />
              {p}
            </label>
          ))}
        </div>

        {/* Schedule date picker */}
        {tab === "schedule" && !scheduleSuccess && (
          <div className="space-y-1.5">
            <label className="text-sm text-muted">Schedule for</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-foreground"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        {scheduleSuccess && (
          <div className="flex items-center gap-2 text-accent text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>Successfully scheduled {clipIndices.length} clip{clipIndices.length !== 1 ? "s" : ""}!</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.clipIndex}
                className="flex items-center gap-2 text-sm"
              >
                {r.success ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span>Clip #{r.clipIndex}</span>
                {r.error && (
                  <span className="text-red-400 text-xs">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            {results.length > 0 || scheduleSuccess ? "Done" : "Cancel"}
          </Button>
          {results.length === 0 && !scheduleSuccess && (
            <Button
              onClick={tab === "now" ? handlePublish : handleSchedule}
              disabled={publishing || platforms.length === 0 || (tab === "schedule" && !scheduledFor)}
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {publishing
                ? tab === "now" ? "Publishing..." : "Scheduling..."
                : tab === "now" ? "Publish Now" : "Schedule"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
