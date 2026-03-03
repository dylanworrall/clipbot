"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ThreadContextValue {
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
  chatThreadId: string;
  setChatThreadId: (id: string) => void;
  newChat: () => void;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [activeThreadId, setActiveThread] = useState<string | null>(null);
  const [chatThreadId, setChatThreadId] = useState(() => crypto.randomUUID());

  const newChat = useCallback(() => {
    setActiveThread(null);
    setChatThreadId(crypto.randomUUID());
  }, []);

  return (
    <ThreadContext value={{ activeThreadId, setActiveThread, chatThreadId, setChatThreadId, newChat }}>
      {children}
    </ThreadContext>
  );
}

export function useThread(): ThreadContextValue {
  const ctx = useContext(ThreadContext);
  if (!ctx) throw new Error("useThread must be used within ThreadProvider");
  return ctx;
}
