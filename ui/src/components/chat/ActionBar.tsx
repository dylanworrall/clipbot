"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, RotateCcw, XCircle, Loader2 } from "lucide-react";

interface ActionBarProps {
  runId: string;
  sourceUrl: string;
  status: string;
  selectedCount: number;
  onPublish: () => void;
  onRetry: () => void;
  onCancel: () => void;
  options?: Record<string, unknown>;
}

export function ActionBar({
  runId,
  sourceUrl,
  status,
  selectedCount,
  onPublish,
  onRetry,
  onCancel,
  options,
}: ActionBarProps) {
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const isActive = !["complete", "failed"].includes(status);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
      onCancel();
    } catch {
      // ignore
    }
    setCancelling(false);
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sourceUrl,
          ...options,
          force: true,
        }),
      });
      if (res.ok) {
        onRetry();
      }
    } catch {
      // ignore
    }
    setRetrying(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isActive && (
        <Button
          variant="danger"
          size="sm"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          Cancel
        </Button>
      )}

      {status === "failed" && (
        <Button
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
        >
          <RotateCcw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Starting..." : "Retry"}
        </Button>
      )}

      {status === "complete" && selectedCount > 0 && (
        <Button variant="primary" size="sm" onClick={onPublish}>
          <Send className="h-3 w-3" />
          Publish ({selectedCount})
        </Button>
      )}
    </div>
  );
}
