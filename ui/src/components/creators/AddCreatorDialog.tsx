"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AddCreatorDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddCreatorDialog({ open, onClose, onAdded }: AddCreatorDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add creator");
      }

      setUrl("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Creator">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="creator-url"
          label="YouTube Channel URL"
          placeholder="https://youtube.com/@creator or channel URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <p className="text-xs text-muted">
          Supports @handle URLs, /channel/ URLs, and custom URLs.
        </p>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !url}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Resolving..." : "Add Creator"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
