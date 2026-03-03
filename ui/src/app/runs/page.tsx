"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, MoreHorizontal, Layers } from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";
import { useSpaces } from "@/hooks/useSpaces";

export default function RunsPage() {
  const { spaces } = useSpaces();
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Spaces</h1>
          <div className="flex items-center gap-2">
            <div className="relative" ref={infoRef}>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-1 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showInfo && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-surface-1 border border-border p-4 shadow-lg z-50">
                  <p className="text-xs text-muted leading-relaxed">
                    Spaces are for automations and creating presets to use for your custom video creation.
                  </p>
                </div>
              )}
            </div>
            <Link
              href="/spaces/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-1 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Space
            </Link>
          </div>
        </div>

        {/* Space cards grid */}
        {spaces.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {spaces.map((space, i) => (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <Link
                  href={`/spaces/${space.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 bg-surface-1 border border-border rounded-xl hover:bg-surface-2 hover:border-border/80 transition-all duration-200 group"
                >
                  {space.icon ? (
                    <span className="text-2xl">{space.icon}</span>
                  ) : (
                    <Layers className="h-6 w-6 text-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                      {space.name}
                    </div>
                    {space.description && (
                      <div className="text-xs text-muted truncate">{space.description}</div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* New space card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * spaces.length }}
            >
              <Link
                href="/spaces/new"
                className="flex items-center gap-3 px-4 py-3.5 border border-dashed border-border rounded-xl hover:bg-surface-1 hover:border-border/80 transition-all duration-200 group"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Plus className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />
                </div>
                <span className="text-sm text-muted group-hover:text-foreground transition-colors">
                  Create space
                </span>
              </Link>
            </motion.div>
          </div>
        ) : (
          <div>
            <Link
              href="/spaces/new"
              className="flex items-center gap-3 px-4 py-4 border border-dashed border-border rounded-xl hover:bg-surface-1 hover:border-border/80 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <Plus className="h-5 w-5 text-muted group-hover:text-accent transition-colors" />
              </div>
              <div>
                <div className="text-sm font-medium group-hover:text-foreground transition-colors">
                  Create your first space
                </div>
                <div className="text-xs text-muted">
                  Organize clips by niche with preset settings
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
