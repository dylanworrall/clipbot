"use client";

import { useEffect, useState, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "motion/react";
import {
  Layers3,
  Check,
  X,
  Loader2,
  Zap,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/page-transition";

interface QueueItem {
  id: string;
  content: string;
  title: string;
  format: "tweet" | "thread" | "linkedin" | "caption" | "script" | "meme";
  platforms: string[];
  estimatedScore: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  topic?: string;
  hashtags?: string[];
}

const FORMAT_STYLES: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  tweet: { color: "text-[#0A84FF]", bg: "bg-[#0A84FF]/10", label: "Tweet" },
  thread: {
    color: "text-[#BF5AF2]",
    bg: "bg-[#BF5AF2]/10",
    label: "Thread",
  },
  linkedin: {
    color: "text-[#0A84FF]",
    bg: "bg-[#0A84FF]/10",
    label: "LinkedIn",
  },
  caption: {
    color: "text-[#FF9F0A]",
    bg: "bg-[#FF9F0A]/10",
    label: "Caption",
  },
  script: {
    color: "text-[#30D158]",
    bg: "bg-[#30D158]/10",
    label: "Script",
  },
  meme: { color: "text-[#FF375F]", bg: "bg-[#FF375F]/10", label: "Meme" },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "text-[#30D158]"
      : score >= 6
        ? "text-[#FF9F0A]"
        : "text-white/40";
  return (
    <span className={`text-[13px] font-bold tabular-nums ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function SwipeCard({
  item,
  onApprove,
  onReject,
  isTop,
}: {
  item: QueueItem;
  onApprove: () => void;
  onReject: () => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const opacity = useTransform(
    x,
    [-250, -120, 0, 120, 250],
    [0.6, 1, 1, 1, 0.6]
  );

  // Glow indicators
  const approveOpacity = useTransform(x, [0, 80, 200], [0, 0.3, 0.8]);
  const rejectOpacity = useTransform(x, [-200, -80, 0], [0.8, 0.3, 0]);

  const format = FORMAT_STYLES[item.format] || FORMAT_STYLES.tweet;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: isTop ? 10 : 1 }}
    >
      {/* Glow effects */}
      {isTop && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              opacity: approveOpacity,
              boxShadow: "inset 0 0 60px rgba(48, 209, 88, 0.3)",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              opacity: rejectOpacity,
              boxShadow: "inset 0 0 60px rgba(255, 69, 58, 0.3)",
            }}
          />
        </>
      )}

      <motion.div
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        style={isTop ? { x, rotate, opacity } : { opacity: 0.5, scale: 0.95 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 120) {
            onApprove();
          } else if (info.offset.x < -120) {
            onReject();
          }
        }}
        initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
        animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
        exit={{
          x: 300,
          opacity: 0,
          rotate: 15,
          transition: { duration: 0.3 },
        }}
        className="w-full max-w-lg bg-[#2A2A2C] rounded-2xl border border-white/5 shadow-2xl cursor-grab active:cursor-grabbing select-none"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${format.bg} ${format.color} text-[12px] font-semibold`}
            >
              {format.label}
            </span>
            {item.platforms.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[10px] font-medium capitalize"
              >
                {p}
              </span>
            ))}
          </div>
          <ScoreBadge score={item.estimatedScore} />
        </div>

        {/* Card Content */}
        <div className="p-6 pt-4">
          {item.title && item.title !== item.content.slice(0, 50) && (
            <h3 className="text-[15px] font-semibold text-white/90 mb-2">
              {item.title}
            </h3>
          )}
          <p className="text-[18px] leading-relaxed text-white/90 whitespace-pre-wrap">
            {item.content}
          </p>
        </div>

        {/* Hashtags */}
        {item.hashtags && item.hashtags.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {item.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-[12px] text-[#0A84FF]/60 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Swipe Hints */}
        {isTop && (
          <div className="flex items-center justify-between px-6 pb-4 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[11px] text-white/20">
              <ArrowLeft size={10} />
              <span>Swipe to reject</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/20">
              <span>Swipe to approve</span>
              <ArrowRight size={10} />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0 });

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleAction = async (action: "approve" | "reject") => {
    if (items.length === 0 || actioning) return;
    setActioning(true);
    const current = items[0]!;

    try {
      await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: current.id }),
      });
      setStats((prev) => ({
        ...prev,
        [action === "approve" ? "approved" : "rejected"]:
          prev[action === "approve" ? "approved" : "rejected"] + 1,
      }));
    } catch {
      /* fail silently */
    }

    // Remove the top card
    setItems((prev) => prev.slice(1));
    setActioning(false);
  };

  const pendingCount = items.length;

  return (
    <PageTransition>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-6 text-white">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white/90 mb-1">Queue</h1>
              <p className="text-white/50 text-[13px] font-medium">
                {pendingCount > 0
                  ? `${pendingCount} item${pendingCount !== 1 ? "s" : ""} to review`
                  : "Swipe through AI-generated content"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadQueue}>
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          {(stats.approved > 0 || stats.rejected > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="flex items-center gap-2 rounded-lg bg-[#30D158]/5 border border-[#30D158]/10 px-3.5 py-2">
                <Check size={12} className="text-[#30D158]" />
                <span className="text-[13px] font-semibold text-[#30D158]">
                  {stats.approved}
                </span>
                <span className="text-[11px] text-[#30D158]/60">approved</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#FF453A]/5 border border-[#FF453A]/10 px-3.5 py-2">
                <X size={12} className="text-[#FF453A]" />
                <span className="text-[13px] font-semibold text-[#FF453A]">
                  {stats.rejected}
                </span>
                <span className="text-[11px] text-[#FF453A]/60">rejected</span>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={20} className="animate-spin text-white/40" />
            </div>
          )}

          {/* Empty State */}
          {!loading && pendingCount === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#BF5AF2]/10 flex items-center justify-center mx-auto mb-4">
                <Layers3 size={28} className="text-[#BF5AF2]" />
              </div>
              <p className="text-[16px] font-semibold text-white/60 mb-1">
                Queue is empty
              </p>
              <p className="text-[13px] text-white/30 max-w-sm mx-auto mb-6">
                Generate content from chat to fill the queue. Ask Socials to
                &quot;generate 5 tweets for the queue&quot; or use the autopilot.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/")}
              >
                <Sparkles size={14} /> Go to Chat
              </Button>
            </motion.div>
          )}

          {/* Swipe Cards */}
          {!loading && pendingCount > 0 && (
            <div className="flex flex-col items-center">
              {/* Stack counter */}
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="secondary">
                  <Zap size={10} className="text-[#FF9F0A]" />
                  {pendingCount} remaining
                </Badge>
              </div>

              {/* Card Stack */}
              <div className="relative w-full max-w-lg mx-auto" style={{ height: 420 }}>
                <AnimatePresence>
                  {items.slice(0, 3).map((item, i) => (
                    <SwipeCard
                      key={item.id}
                      item={item}
                      isTop={i === 0}
                      onApprove={() => handleAction("approve")}
                      onReject={() => handleAction("reject")}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-6 mt-8">
                <button
                  onClick={() => handleAction("reject")}
                  disabled={actioning || pendingCount === 0}
                  className="w-14 h-14 rounded-full bg-[#FF453A]/10 border border-[#FF453A]/20 flex items-center justify-center text-[#FF453A] hover:bg-[#FF453A]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={24} />
                </button>

                <button
                  onClick={() => handleAction("approve")}
                  disabled={actioning || pendingCount === 0}
                  className="w-14 h-14 rounded-full bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158] hover:bg-[#30D158]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={24} />
                </button>
              </div>

              {/* Keyboard hints */}
              <p className="text-[11px] text-white/15 mt-4">
                Drag card or use buttons to approve/reject
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
