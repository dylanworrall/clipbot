"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { FileText, Trash2, Send, Clock, Loader2, RefreshCw, List, Layers3, Check, X, ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Draft {
  id: string;
  type?: string;
  clipTitle: string;
  content?: string;
  platforms: string[];
  scheduledFor: string;
  status: string;
  createdAt: string;
  postId?: string;
}

interface QueueItem {
  id: string;
  content: string;
  title: string;
  format: string;
  platforms: string[];
  estimatedScore: number;
  status: string;
  hashtags?: string[];
}

type ViewMode = "list" | "swipe";

const FORMAT_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  tweet: { color: "text-[#0A84FF]", bg: "bg-[#0A84FF]/10", label: "Tweet" },
  thread: { color: "text-[#BF5AF2]", bg: "bg-[#BF5AF2]/10", label: "Thread" },
  linkedin: { color: "text-[#0A84FF]", bg: "bg-[#0A84FF]/10", label: "LinkedIn" },
  caption: { color: "text-[#FF9F0A]", bg: "bg-[#FF9F0A]/10", label: "Caption" },
  script: { color: "text-[#30D158]", bg: "bg-[#30D158]/10", label: "Script" },
  meme: { color: "text-[#FF375F]", bg: "bg-[#FF375F]/10", label: "Meme" },
};

/* ── Swipe Card ── */

function SwipeCard({ item, onApprove, onReject, isTop }: { item: QueueItem; onApprove: () => void; onReject: () => void; isTop: boolean }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const opacity = useTransform(x, [-250, -120, 0, 120, 250], [0.6, 1, 1, 1, 0.6]);
  const approveGlow = useTransform(x, [0, 80, 200], [0, 0.3, 0.8]);
  const rejectGlow = useTransform(x, [-200, -80, 0], [0.8, 0.3, 0]);

  const format = FORMAT_STYLES[item.format] || FORMAT_STYLES.tweet;
  const scoreColor = item.estimatedScore >= 8 ? "text-[#30D158]" : item.estimatedScore >= 6 ? "text-[#FF9F0A]" : "text-white/40";

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: isTop ? 10 : 1 }}>
      {isTop && (
        <>
          <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ opacity: approveGlow, boxShadow: "inset 0 0 60px rgba(48, 209, 88, 0.3)" }} />
          <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ opacity: rejectGlow, boxShadow: "inset 0 0 60px rgba(255, 69, 58, 0.3)" }} />
        </>
      )}
      <motion.div
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        style={isTop ? { x, rotate, opacity } : { opacity: 0.5, scale: 0.95 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 120) onApprove();
          else if (info.offset.x < -120) onReject();
        }}
        initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
        animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
        exit={{ x: 300, opacity: 0, rotate: 15, transition: { duration: 0.3 } }}
        className="w-full max-w-lg bg-[#2A2A2C] rounded-2xl border border-white/5 shadow-2xl cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${format.bg} ${format.color} text-[12px] font-semibold`}>{format.label}</span>
            {item.platforms.map((p) => (
              <span key={p} className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[10px] font-medium capitalize">{p}</span>
            ))}
          </div>
          <span className={`text-[13px] font-bold tabular-nums ${scoreColor}`}>{item.estimatedScore.toFixed(1)}</span>
        </div>
        <div className="p-6 pt-4">
          <p className="text-[18px] leading-relaxed text-white/90 whitespace-pre-wrap">{item.content}</p>
        </div>
        {item.hashtags && item.hashtags.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap gap-1.5">
            {item.hashtags.map((tag) => (
              <span key={tag} className="text-[12px] text-[#0A84FF]/60 font-medium">#{tag}</span>
            ))}
          </div>
        )}
        {isTop && (
          <div className="flex items-center justify-between px-6 pb-4 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[11px] text-white/20"><ArrowLeft size={10} /> Reject</div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/20">Approve <ArrowRight size={10} /></div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Main Page ── */

export default function DraftsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [swipeStats, setSwipeStats] = useState({ approved: 0, rejected: 0 });

  const loadAll = useCallback(async () => {
    setLoading(true);
    // Load drafts from calendar
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      const all = (data.posts ?? data ?? []) as Draft[];
      const filtered = all.filter((p) => p.type === "draft" || p.type === "text" || p.status === "draft");
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDrafts(filtered);
    } catch { setDrafts([]); }
    // Load queue items
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueueItems(Array.isArray(data) ? data.filter((i: QueueItem) => i.status === "pending") : []);
    } catch { setQueueItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handlePublish = async (draft: Draft) => {
    setPublishing(draft.id);
    try {
      await fetch(`/api/calendar/${draft.id}/publish`, { method: "POST" });
      await loadAll();
    } catch { /* silent */ }
    setPublishing(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch { /* silent */ }
  };

  const handleSave = async (id: string) => {
    try {
      await fetch(`/api/calendar/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, clipTitle: editContent.slice(0, 50) + (editContent.length > 50 ? "..." : "") }),
      });
      setEditing(null);
      await loadAll();
    } catch { /* silent */ }
  };

  const handleSwipeAction = async (action: "approve" | "reject") => {
    if (queueItems.length === 0) return;
    const current = queueItems[0];
    try {
      await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: current.id }),
      });
      setSwipeStats((prev) => ({ ...prev, [action === "approve" ? "approved" : "rejected"]: prev[action === "approve" ? "approved" : "rejected"] + 1 }));
    } catch { /* silent */ }
    setQueueItems((prev) => prev.slice(1));
    if (action === "approve") {
      // Refresh drafts since approved items become drafts
      setTimeout(() => loadAll(), 500);
    }
  };

  const statusColor = (s: string) => {
    if (s === "published") return "green";
    if (s === "cancelled") return "red";
    if (s === "scheduled") return "gold";
    return "blue";
  };

  const totalItems = drafts.length + queueItems.length;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white/90 mb-1">Drafts</h1>
            <p className="text-white/50 text-[13px] font-medium">
              {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
              {queueItems.length > 0 && ` · ${queueItems.length} in queue`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="bg-[#2A2A2C] p-1 rounded-lg flex gap-1">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === "list" ? "bg-[#3A3A3C] text-white shadow-sm" : "text-white/50 hover:text-white"
                }`}
              >
                <List size={12} /> List
              </button>
              <button
                onClick={() => setViewMode("swipe")}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === "swipe" ? "bg-[#3A3A3C] text-white shadow-sm" : "text-white/50 hover:text-white"
                }`}
              >
                <Layers3 size={12} /> Swipe
                {queueItems.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#0A84FF] text-white text-[9px] font-bold">{queueItems.length}</span>
                )}
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={loadAll}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {!loading && viewMode === "list" && (
          <>
            {drafts.length === 0 && (
              <div className="text-center py-16">
                <FileText size={32} className="text-white/20 mx-auto mb-3" />
                <p className="text-[15px] font-medium text-white/50">No drafts yet</p>
                <p className="text-[13px] text-white/30 mt-1">
                  Ask Socials to generate content or switch to Swipe mode to review queue items
                </p>
              </div>
            )}
            <div className="space-y-3">
              <AnimatePresence>
                {drafts.map((draft) => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="bg-[#2A2A2C] rounded-2xl border border-white/5 shadow-sm overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0A84FF]/10">
                            <FileText size={14} className="text-[#0A84FF]" />
                          </div>
                          <div>
                            <h3 className="text-[14px] font-semibold text-white/90">{draft.clipTitle}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant={statusColor(draft.status)}>{draft.status}</Badge>
                              <span className="text-[10px] text-white/25">{new Date(draft.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {draft.status !== "published" && (
                            <Button variant="ghost" size="icon-xs" onClick={() => handlePublish(draft)} disabled={publishing === draft.id} title="Publish now">
                              {publishing === draft.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(draft.id)} title="Delete">
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      {editing === draft.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-[#1C1C1E] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors resize-none min-h-[100px]"
                          />
                          <div className="flex gap-2">
                            <Button size="xs" onClick={() => handleSave(draft.id)}>Save</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[14px] text-white/70 leading-relaxed cursor-pointer hover:text-white/90 transition-colors" onClick={() => { setEditing(draft.id); setEditContent(draft.content || ""); }}>
                          {draft.content || draft.clipTitle}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <div className="flex flex-wrap gap-1.5">
                          {draft.platforms.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-md bg-[#BF5AF2]/10 text-[#BF5AF2] text-[10px] font-medium capitalize">{p}</span>
                          ))}
                        </div>
                        {draft.scheduledFor && (
                          <div className="flex items-center gap-1 text-[10px] text-white/25">
                            <Clock size={10} />
                            {new Date(draft.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ── SWIPE VIEW ── */}
        {!loading && viewMode === "swipe" && (
          <div className="flex flex-col items-center">
            {/* Swipe stats */}
            {(swipeStats.approved > 0 || swipeStats.rejected > 0) && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 rounded-lg bg-[#30D158]/5 border border-[#30D158]/10 px-3.5 py-2">
                  <Check size={12} className="text-[#30D158]" />
                  <span className="text-[13px] font-semibold text-[#30D158]">{swipeStats.approved}</span>
                  <span className="text-[11px] text-[#30D158]/60">approved</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[#FF453A]/5 border border-[#FF453A]/10 px-3.5 py-2">
                  <X size={12} className="text-[#FF453A]" />
                  <span className="text-[13px] font-semibold text-[#FF453A]">{swipeStats.rejected}</span>
                  <span className="text-[11px] text-[#FF453A]/60">rejected</span>
                </div>
              </div>
            )}

            {queueItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-[#BF5AF2]/10 flex items-center justify-center mx-auto mb-4">
                  <Layers3 size={28} className="text-[#BF5AF2]" />
                </div>
                <p className="text-[16px] font-semibold text-white/60 mb-1">Queue is empty</p>
                <p className="text-[13px] text-white/30 max-w-sm mx-auto mb-6">
                  Ask Socials to &quot;generate 5 tweets for the queue&quot; or run the autopilot
                </p>
                <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
                  <Zap size={14} /> Go to Chat
                </Button>
              </div>
            ) : (
              <>
                <Badge variant="secondary" className="mb-6">
                  <Zap size={10} className="text-[#FF9F0A]" /> {queueItems.length} remaining
                </Badge>

                <div className="relative w-full max-w-lg mx-auto" style={{ height: 420 }}>
                  <AnimatePresence>
                    {queueItems.slice(0, 3).map((item, i) => (
                      <SwipeCard
                        key={item.id}
                        item={item}
                        isTop={i === 0}
                        onApprove={() => handleSwipeAction("approve")}
                        onReject={() => handleSwipeAction("reject")}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-6 mt-8">
                  <button onClick={() => handleSwipeAction("reject")} className="w-14 h-14 rounded-full bg-[#FF453A]/10 border border-[#FF453A]/20 flex items-center justify-center text-[#FF453A] hover:bg-[#FF453A]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <X size={24} />
                  </button>
                  <button onClick={() => handleSwipeAction("approve")} className="w-14 h-14 rounded-full bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158] hover:bg-[#30D158]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <Check size={24} />
                  </button>
                </div>
                <p className="text-[11px] text-white/15 mt-4">Drag card or use buttons</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
