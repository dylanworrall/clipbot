"use client";

import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useSpace } from "@/contexts/SpaceContext";
import { useSession } from "@/lib/auth-client";

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;

interface StoredMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    name: string;
    result: unknown;
  }>;
  timestamp: string;
}

/** Convert persisted chat-store messages into UIMessage format for useChat */
function hydrateMessages(stored: StoredMessage[]): UIMessage[] {
  const messages: UIMessage[] = [];

  for (const msg of stored) {
    if (msg.role === "user") {
      messages.push({
        id: msg.id,
        role: "user",
        parts: [{ type: "text", text: msg.content }],
      });
    } else if (msg.role === "assistant") {
      const parts: UIMessage["parts"] = [];

      // Add tool call parts if present
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          const result = msg.toolResults?.find((r) => r.toolCallId === tc.id);
          parts.push({
            type: `tool-${tc.name}` as `tool-${string}`,
            toolCallId: tc.id,
            toolName: tc.name,
            state: result ? "output-available" : "input-available",
            input: tc.input,
            output: result?.result,
          } as UIMessage["parts"][number]);
        }
      }

      // Add text content if present
      const textContent = msg.content
        .replace(/\[Tool call: \w+\]\n?/g, "")
        .trim();
      if (textContent) {
        parts.push({ type: "text", text: textContent });
      }

      if (parts.length > 0) {
        messages.push({
          id: msg.id,
          role: "assistant",
          parts,
        });
      }
    }
  }

  return messages;
}

export function useAiChat(threadId: string | null) {
  const { activeSpaceId } = useSpace();
  const session = useSession();
  const userEmail = session.data?.user?.email ?? undefined;
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const prevThreadId = useRef<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId, spaceId: activeSpaceId, userEmail },
      }),
    [threadId, activeSpaceId, userEmail]
  );

  const {
    messages: aiMessages,
    sendMessage: chatSendMessage,
    status,
    error,
    setMessages,
  } = useChat({
    id: threadId ?? "default",
    transport,
  });

  const isThinking = status === "submitted" || status === "streaming";

  // Load persisted history when threadId changes
  useEffect(() => {
    if (threadId === prevThreadId.current) return;
    prevThreadId.current = threadId;
    setHistoryLoaded(false);

    if (!threadId) {
      setMessages([]);
      setHistoryLoaded(true);
      return;
    }

    let cancelled = false;
    fetch(`/api/chat?threadId=${encodeURIComponent(threadId)}`)
      .then((res) => res.json())
      .then((stored: StoredMessage[]) => {
        if (cancelled) return;
        if (stored.length > 0) {
          setMessages(hydrateMessages(stored));
        } else {
          setMessages([]);
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId, setMessages]);

  // In cloud mode, block sending until session is loaded (so userEmail is available)
  const sessionReady = !isCloudMode || !!userEmail;

  const sendMessage = useCallback(
    (message: string, _spaceId?: string | null) => {
      if (!threadId) return;
      if (!sessionReady) return;
      chatSendMessage({ text: message });
    },
    [threadId, chatSendMessage, sessionReady]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    sendMessage,
    aiMessages,
    isThinking,
    activeToolCall: null, // No longer tracked separately — tool state is in message parts
    clearMessages,
    historyLoaded,
    sessionReady,
    status,
    error,
  };
}
