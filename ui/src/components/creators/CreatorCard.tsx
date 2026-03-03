"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  lastCheckedAt?: string;
}

interface CreatorCardProps {
  creator: Creator;
  onDelete: (id: string) => void;
}

export function CreatorCard({ creator, onDelete }: CreatorCardProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-medium">{creator.channelName}</h3>
          <a
            href={creator.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors duration-300"
          >
            <ExternalLink className="h-3 w-3" />
            {creator.channelUrl}
          </a>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onDelete(creator.id)}>
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </Button>
      </div>

      {creator.lastCheckedAt && (
        <p className="text-xs text-muted">
          Last checked: {timeAgo(creator.lastCheckedAt)}
        </p>
      )}
    </Card>
  );
}
