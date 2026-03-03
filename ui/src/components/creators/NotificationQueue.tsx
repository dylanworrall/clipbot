"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, X, ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Notification {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  creatorName: string;
  publishedAt: string;
  status: string;
}

interface NotificationQueueProps {
  notifications: Notification[];
  onProcess: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function NotificationQueue({ notifications, onProcess, onDismiss }: NotificationQueueProps) {
  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <Card key={n.id} className="flex items-center justify-between">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="text-xs">{n.creatorName}</Badge>
              <span className="text-xs text-muted">{timeAgo(n.publishedAt)}</span>
            </div>
            <a
              href={n.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium hover:text-accent truncate"
            >
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              {n.videoTitle}
            </a>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <Button size="sm" onClick={() => onProcess(n.id)}>
              <Play className="h-3.5 w-3.5" />
              Process
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDismiss(n.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
