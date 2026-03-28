"use client";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { extractVideoId, youtubeThumbUrl, timeAgo } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface UserMessageProps {
  sourceUrl?: string;
  text?: string;
  startedAt: string;
}

export function UserMessage({ sourceUrl, text, startedAt }: UserMessageProps) {
  // Plain text message (AI chat)
  if (text && !sourceUrl) {
    return (
      <Message from="user">
        <MessageContent>
          <p className="text-[15px] font-medium">{text}</p>
          <p className="text-[10px] text-foreground/60 mt-1">{timeAgo(startedAt)}</p>
        </MessageContent>
      </Message>
    );
  }

  // URL message (video pipeline)
  const videoId = sourceUrl ? extractVideoId(sourceUrl) : null;
  const thumbUrl = videoId ? youtubeThumbUrl(videoId) : null;

  return (
    <Message from="user">
      <MessageContent>
        <div className="flex items-center gap-3">
          {thumbUrl && (
            <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2">
              <img
                src={thumbUrl}
                alt="Video"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-[#0A84FF] hover:underline truncate block"
            >
              <ExternalLink className="h-3 w-3 inline mr-1" />
              {sourceUrl}
            </a>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(startedAt)}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}
