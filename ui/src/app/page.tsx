"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, Layers, Users, Play, AlertTriangle, Settings, Terminal } from "lucide-react";

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;
import { ChatFeed } from "@/components/chat/ChatFeed";
import { PromptInput } from "@/components/chat/PromptInput";
import { useThreads } from "@/hooks/useThreads";
import { useThread } from "@/contexts/ThreadContext";
import { useSpace } from "@/contexts/SpaceContext";
import { useAiChat } from "@/hooks/useAiChat";
import { normalizeUrl } from "@/lib/utils";

const TAGLINES = [
  "Drop a link, make it viral.",
  "Find the best moments automatically.",
  "From long-form to short-form in seconds.",
  "AI-powered clip extraction.",
];

const SUGGESTION_CHIPS = [
  { label: "Paste a YouTube URL", icon: "link" },
  { label: "List my spaces", icon: "layers" },
  { label: "Check my creators", icon: "users" },
  { label: "Show recent runs", icon: "play" },
] as const;

const CHIP_ICONS = {
  link: Link,
  layers: Layers,
  users: Users,
  play: Play,
} as const;

export default function ChatPage() {
  const { threads, loading, addRun, refetch } = useThreads();
  const { activeThreadId, setActiveThread, chatThreadId } = useThread();
  const { activeSpaceId } = useSpace();
  const { sendMessage, aiMessages, isThinking } = useAiChat(chatThreadId);

  const [taglineIndex, setTaglineIndex] = useState(0);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ connected: boolean; checked: boolean }>({
    connected: true, // optimistic default to avoid flash
    checked: false,
  });

  // Check if an API key is configured (local mode only — cloud uses middleware auth)
  useEffect(() => {
    if (isCloudMode) {
      // Cloud mode: server provides the API key, no client-side check needed
      setApiKeyStatus({ connected: true, checked: true });
      return;
    }
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data: { connected: boolean }) => {
        setApiKeyStatus({ connected: data.connected, checked: true });
      })
      .catch(() => {
        setApiKeyStatus({ connected: false, checked: true });
      });
  }, []);

  // Cycle taglines every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

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

  const handleChipClick = useCallback(
    (label: string) => {
      handleChat(label);
    },
    [handleChat]
  );

  const hasAiActivity = aiMessages.length > 0 || isThinking;
  const showHero = !activeThreadId && !loading && !hasAiActivity;

  // Show API key setup prompt if no key is configured
  if (apiKeyStatus.checked && !apiKeyStatus.connected) {
    return (
      <div className="flex flex-col h-screen overflow-hidden items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF9F0A]/10">
            <AlertTriangle size={24} className="text-[#FF9F0A]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white/90 mb-1">
              API Key Required
            </h2>
            <p className="text-[13px] text-white/50 leading-relaxed">
              No Anthropic API key is configured. Set one up to start using Socials.
            </p>
          </div>
          <div className="space-y-3">
            <a
              href="/settings"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#0A84FF] px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors shadow-sm"
            >
              <Settings size={16} />
              Configure in Settings
            </a>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#1C1C1E] px-3 text-white/30">or via terminal</span>
              </div>
            </div>
            <div className="rounded-xl bg-[#2A2A2C] border border-white/5 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] text-white/40 mb-1.5">
                <Terminal size={12} />
                Set environment variable
              </div>
              <code className="text-[12px] text-white/70 font-mono">
                ANTHROPIC_API_KEY=sk-ant-...
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {showHero ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 flex flex-col items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center mb-8"
            >
              <h1 className="text-[40px] font-bold tracking-tight text-[#0A84FF] mb-3">
                Socials
              </h1>
              <div className="h-14 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={taglineIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-[15px] text-white/50 absolute inset-x-0 line-clamp-2 font-medium"
                  >
                    {TAGLINES[taglineIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="w-full max-w-2xl"
            >
              <PromptInput onSubmit={handleSubmit} onChat={handleChat} />
            </motion.div>

            {/* Quick action suggestion chips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-2xl"
            >
              {SUGGESTION_CHIPS.map((chip) => {
                const Icon = CHIP_ICONS[chip.icon];
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipClick(chip.label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-[#2A2A2C] text-[12px] font-medium text-white/50 hover:text-white hover:border-[#0A84FF]/30 hover:bg-[#3A3A3C] transition-colors cursor-pointer shadow-sm"
                  >
                    <Icon className="h-3 w-3" />
                    {chip.label}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col flex-1 min-h-0"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
