"use client";

import { useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { PromptInput } from "@/components/chat/PromptInput";
import { useThreads } from "@/hooks/useThreads";
import { useThread } from "@/contexts/ThreadContext";
import { useSpace } from "@/contexts/SpaceContext";
import { useAiChat } from "@/hooks/useAiChat";
import { normalizeUrl } from "@/lib/utils";

export default function ChatPage() {
  const { threads, loading, addRun, refetch } = useThreads();
  const { activeThreadId, setActiveThread, chatThreadId } = useThread();
  const { activeSpaceId } = useSpace();
  const { sendMessage, aiMessages, isThinking } = useAiChat(chatThreadId);

  const threadMessages = useMemo(() => {
    if (!activeThreadId) return [];
    const thread = threads.find((t) => t.threadId === activeThreadId);
    if (!thread) return [];
    return [...thread.runs].reverse();
  }, [activeThreadId, threads]);

  const handleSubmit = useCallback(
    (runId: string, sourceUrl: string) => {
      addRun({
        runId,
        sourceUrl,
        status: "downloading",
        startedAt: new Date().toISOString(),
      });
      setActiveThread(normalizeUrl(sourceUrl));
    },
    [addRun, setActiveThread]
  );

  const handleChat = useCallback(
    (message: string) => {
      sendMessage(message, activeSpaceId);
    },
    [sendMessage, activeSpaceId]
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const hasAiActivity = aiMessages.length > 0 || isThinking;

  // Centered hero layout when no thread is active and no AI chat
  if (!activeThreadId && !loading && !hasAiActivity) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-light tracking-tight text-foreground/80 mb-3">
              ClipBot
            </h1>
            <p className="text-lg text-muted/70">
              Drop a link, make it viral.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-2xl"
          >
            <PromptInput onSubmit={handleSubmit} onChat={handleChat} />
          </motion.div>
        </div>
      </div>
    );
  }

  // Chat layout: active thread or AI conversation
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ChatFeed
        messages={threadMessages}
        aiMessages={aiMessages}
        isAiThinking={isThinking}
        loading={loading}
        onRetry={handleRetry}
      />
      <PromptInput
        onSubmit={handleSubmit}
        onChat={handleChat}
        disabled={isThinking}
      />
    </div>
  );
}
