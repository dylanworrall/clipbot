"use client";

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
import type { AiChatMessage } from "@/hooks/useAiChat";

interface ChatFeedProps {
  messages: ChatMessage[];
  aiMessages?: AiChatMessage[];
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
          description="Paste a YouTube URL below to create your first viral clips, or ask ClipBot anything"
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

        {/* AI chat messages */}
        {aiMessages.map((msg) => {
          if (msg.type === "user") {
            return (
              <UserMessage
                key={msg.id}
                text={msg.content}
                startedAt={msg.timestamp}
              />
            );
          }
          if (msg.type === "tool-call" && msg.toolCall) {
            return <AiToolCall key={msg.id} toolCall={msg.toolCall} />;
          }
          if (msg.type === "assistant" && msg.content) {
            return <AiMessage key={msg.id} content={msg.content} />;
          }
          return null;
        })}

        {/* AI thinking indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-2">
            <Shimmer as="span" className="text-sm text-muted-foreground">
              ClipBot is thinking...
            </Shimmer>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
