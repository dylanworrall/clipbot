"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { ChevronRight, Sparkles, Clock } from "lucide-react";

interface Moment {
  index: number;
  title: string;
  hookText: string;
  startSeconds: number;
  endSeconds: number;
  viralityScore: number;
  category: string;
}

interface MomentsResultProps {
  moments: Moment[];
}

export function MomentsResult({ moments }: MomentsResultProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left cursor-pointer"
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-3 w-3 text-muted" />
        </motion.div>
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium text-accent">
          {moments.length} viral moment{moments.length !== 1 ? "s" : ""} found
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 space-y-1.5">
              {moments.map((m) => {
                const scoreColor =
                  m.viralityScore >= 8
                    ? "text-accent"
                    : m.viralityScore >= 6
                      ? "text-brand-gold"
                      : "text-muted";

                return (
                  <div
                    key={m.index}
                    className="flex items-center gap-2 text-xs py-1 border-t border-border/30 first:border-0"
                  >
                    <span className={`font-bold font-mono ${scoreColor}`}>
                      {m.viralityScore}
                    </span>
                    <span className="flex-1 truncate">{m.title}</span>
                    <span className="flex items-center gap-1 text-muted flex-shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(m.startSeconds)}-{formatDuration(m.endSeconds)}
                    </span>
                    <Badge
                      variant={
                        m.category === "humor"
                          ? "gold"
                          : m.category === "education"
                            ? "blue"
                            : m.category === "controversy"
                              ? "red"
                              : "green"
                      }
                    >
                      {m.category}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
