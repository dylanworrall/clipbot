"use client";

import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatThread } from "./ChatThread";
import { AiMessage } from "./AiMessage";
import { AiToolCall } from "./AiToolCall";
import { UserMessage } from "./UserMessage";
import { Clapperboard } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChatMessages";

interface ChatFeedProps {
  messages: ChatMessage[];
  aiMessages?: UIMessage[];
  isAiThinking?: boolean;
  loading: boolean;
  onRetry: () => void;
}

export function ChatFeed({ messages, aiMessages = [], isAiThinking, loading, onRetry }: ChatFeedProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full max-w-md px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const hasContent = messages.length > 0 || aiMessages.length > 0;

  if (!hasContent && !isAiThinking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <ConversationEmptyState
          title="No clips yet"
          description="Paste a YouTube URL below to create your first viral clips, or ask Socials anything"
          icon={<Clapperboard className="h-14 w-14 float" />}
        />
      </div>
    );
  }

  return (
    <Conversation className="flex-1">
      <ConversationContent className="max-w-2xl mx-auto gap-6">
        {/* Pipeline run threads */}
        {messages.map((msg) => (
          <ChatThread key={msg.runId} message={msg} onRetry={onRetry} />
        ))}

        {/* AI chat messages — render from UIMessage parts */}
        {aiMessages.map((msg) => {
          if (msg.role === "user") {
            const text = msg.parts
              ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("\n") || "";
            return (
              <UserMessage
                key={msg.id}
                text={typeof text === "string" ? text : ""}
                startedAt={new Date().toISOString()}
              />
            );
          }

          if (msg.role === "assistant") {
            return (
              <div key={msg.id} className="flex flex-col gap-3">
                {msg.parts?.map((part, i) => {
                  if (part.type === "text" && part.text?.trim()) {
                    return <AiMessage key={`${msg.id}-text-${i}`} content={part.text} />;
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <AiToolCall
                        key={`${msg.id}-tool-${i}`}
                        part={part}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            );
          }

          return null;
        })}

        {/* AI thinking indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-2">
            <Shimmer as="span" className="text-[13px] font-medium text-white/40">
              Socials is thinking...
            </Shimmer>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
