"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SpaceHeader } from "@/components/spaces/SpaceHeader";
import { SpacePanel } from "@/components/spaces/SpacePanel";
import { PromptInput } from "@/components/chat/PromptInput";
import { useSpace } from "@/contexts/SpaceContext";
import { useThreads } from "@/hooks/useThreads";
import { useThread } from "@/contexts/ThreadContext";
import { Loader2, Clock, Film, MoreHorizontal } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { SpaceSettings } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

interface SpaceData {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: SpaceSettings;
  accounts: string[];
  creators: string[];
  effectiveSettings?: Record<string, unknown>;
}

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { setActiveSpace } = useSpace();
  const { setActiveThread, setChatThreadId } = useThread();
  const { threads, addRun } = useThreads();

  const [space, setSpace] = useState<SpaceData | null>(null);
  const [globalSettings, setGlobalSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [spaceRes, settingsRes] = await Promise.all([
        fetch(`/api/spaces/${id}`),
        fetch("/api/settings"),
      ]);
      if (!spaceRes.ok) {
        routerRef.current.push("/");
        return;
      }
      const spaceData = await spaceRes.json();
      setSpace(spaceData);
      if (settingsRes.ok) {
        setGlobalSettings(await settingsRes.json());
      }
    } catch {
      routerRef.current.push("/");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setActiveSpace(id);
    fetchData();
  }, [id, setActiveSpace, fetchData]);

  const handleUpdateHeader = async (fields: { name?: string; description?: string; icon?: string }) => {
    await fetch(`/api/spaces/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    fetchData();
  };

  const handleUpdateSettings = async (patch: Partial<SpaceSettings>) => {
    if (!space) return;
    // Deep merge: handle undefined values (reset) and nested objects
    const merged = { ...space.settings };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete (merged as Record<string, unknown>)[key];
      } else if (key === "captionStyle" && typeof value === "object" && value !== null) {
        merged.captionStyle = value as SpaceSettings["captionStyle"];
      } else if (key === "scoringWeights" && typeof value === "object" && value !== null) {
        merged.scoringWeights = value as SpaceSettings["scoringWeights"];
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    await fetch(`/api/spaces/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: merged }),
    });
    fetchData();
  };

  const handleUpdateAccounts = async (accounts: string[]) => {
    await fetch(`/api/spaces/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts }),
    });
    fetchData();
  };

  const handleUpdateCreators = async (creators: string[]) => {
    await fetch(`/api/spaces/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creators }),
    });
    fetchData();
  };

  const handleSubmit = useCallback(
    (runId: string, sourceUrl: string) => {
      addRun({
        runId,
        sourceUrl,
        status: "downloading",
        startedAt: new Date().toISOString(),
        spaceId: id,
      });
    },
    [addRun, id]
  );

  const handleThreadClick = (threadId: string) => {
    setActiveThread(threadId);
    setChatThreadId(threadId);
    router.push("/");
  };

  const spaceThreads = threads.filter((t) =>
    t.runs.some((r) => r.spaceId === id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!space) return null;

  return (
    <div className="h-screen overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SpaceHeader
                name={space.name}
                description={space.description}
                icon={space.icon}
                onUpdate={handleUpdateHeader}
              />
            </motion.div>

            {/* PromptInput */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-10"
            >
              <PromptInput onSubmit={handleSubmit} spaceId={id} fullWidth />
            </motion.div>

            {/* My threads tab */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-10"
            >
              <div className="border-b border-border mb-4">
                <span className="text-sm font-medium text-foreground border-b-2 border-foreground pb-2.5 inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  My threads
                </span>
              </div>

              {spaceThreads.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-muted">
                    Your threads will appear here. Paste a URL above to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {spaceThreads.map((thread, i) => (
                    <motion.div
                      key={thread.threadId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleThreadClick(thread.threadId)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleThreadClick(thread.threadId); }}
                      className="py-4 hover:bg-surface-1/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-2/50 overflow-hidden flex-shrink-0 flex items-center justify-center mt-0.5">
                          {thread.thumbnailUrl ? (
                            <img
                              src={thread.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Film className="h-4 w-4 text-muted" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-semibold leading-snug line-clamp-1">
                            {thread.title}
                          </h3>
                          <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-2">
                            {thread.runCount} run{thread.runCount > 1 ? "s" : ""} · {thread.lastStatus}
                            {thread.completedClipCount > 0 && ` · ${thread.completedClipCount} clips`}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted/70">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo(thread.lastRunAt)}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 p-1.5 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-foreground transition-all cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right panel */}
          <div className="w-48 flex-shrink-0 pt-2">
            <div className="sticky top-8">
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <SpacePanel
                  spaceId={id}
                  settings={space.settings}
                  globalSettings={globalSettings}
                  accounts={space.accounts}
                  creators={space.creators}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateAccounts={handleUpdateAccounts}
                  onUpdateCreators={handleUpdateCreators}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
