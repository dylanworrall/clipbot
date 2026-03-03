"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { motion } from "motion/react";
import { Sparkles, Clock, Hash } from "lucide-react";

interface Moment {
  index: number;
  title: string;
  description: string;
  hookText: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  viralityScore: number;
  reasoning: string;
  hashtags: string[];
  category: string;
}

export function MomentCard({ moment }: { moment: Moment }) {
  const scoreColor =
    moment.viralityScore >= 8
      ? "text-accent"
      : moment.viralityScore >= 6
        ? "text-brand-gold"
        : "text-muted";

  const categoryVariant =
    moment.category === "humor"
      ? "gold"
      : moment.category === "education"
        ? "blue"
        : moment.category === "controversy"
          ? "red"
          : "green";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: moment.index * 0.05 }}
    >
      <Card className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-sm">{moment.title}</h3>
            <p className="text-xs text-muted mt-1 italic">
              &ldquo;{moment.hookText}&rdquo;
            </p>
          </div>
          <div className={`text-2xl font-bold ${scoreColor} flex items-center gap-1`}>
            <Sparkles className="h-4 w-4" />
            {moment.viralityScore}
          </div>
        </div>

        <p className="text-xs text-muted line-clamp-2">{moment.description}</p>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(moment.startSeconds)} -{" "}
            {formatDuration(moment.endSeconds)}
          </span>
          <Badge variant={categoryVariant as "gold" | "blue" | "red" | "green"}>
            {moment.category}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {moment.hashtags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-xs text-muted/70"
            >
              <Hash className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {moment.hashtags.length > 5 && (
            <span className="text-xs text-muted/50">
              +{moment.hashtags.length - 5}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
