"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  Loader2,
  Zap,
  BarChart3,
  FlaskConical,
} from "lucide-react";

interface FeedbackEntry {
  id: string;
  title: string;
  category: string;
  predictedScore: number;
  actualScore: number;
  engagementRate: number;
  actualMetrics: { views: number; likes: number; comments: number; shares: number };
  collectedAt: string;
}

interface WeightUpdate {
  id: string;
  timestamp: string;
  accepted: boolean;
  correlation: number;
  meanError: number;
  sampleSize: number;
  adjustments: Record<string, number>;
  oldWeights: Record<string, number>;
  newWeights: Record<string, number>;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  avgPredicted: number;
  avgActual: number;
  avgEngagement: number;
}

interface AutoScoreReport {
  config: {
    enabled: boolean;
    learningRate: number;
    minSamples: number;
    decayFactor: number;
  };
  totalFeedback: number;
  correlation: number;
  meanError: number;
  categoryBreakdown: CategoryBreakdown[];
  recentFeedback: FeedbackEntry[];
  updates: WeightUpdate[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function correlationLabel(r: number): { text: string; color: string } {
  const abs = Math.abs(r);
  if (abs >= 0.7) return { text: "Strong", color: "text-green-400" };
  if (abs >= 0.4) return { text: "Moderate", color: "text-amber-400" };
  if (abs >= 0.2) return { text: "Weak", color: "text-orange-400" };
  return { text: "None", color: "text-muted" };
}

export function AutoScoreTab() {
  const [report, setReport] = useState<AutoScoreReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch("/api/autoscore");
      if (res.ok) setReport(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleEnabled = async () => {
    if (!report) return;
    const res = await fetch("/api/autoscore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_config",
        config: { enabled: !report.config.enabled },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setReport((r) => (r ? { ...r, config: data.config } : r));
    }
  };

  const updateConfig = async (patch: Record<string, number>) => {
    const res = await fetch("/api/autoscore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_config", config: patch }),
    });
    if (res.ok) {
      const data = await res.json();
      setReport((r) => (r ? { ...r, config: data.config } : r));
    }
  };

  const runCycle = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/autoscore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect_and_learn" }),
      });
      const data = await res.json();
      if (data.error) {
        setLastResult(`Error: ${data.error}`);
      } else {
        const parts: string[] = [];
        if (data.collected > 0) parts.push(`${data.collected} new clips collected`);
        if (data.update?.accepted) parts.push("weights updated");
        else if (data.update && !data.update.accepted)
          parts.push("update rejected (no improvement)");
        if (data.learnError) parts.push(data.learnError);
        setLastResult(parts.join(" · ") || "No new data to collect");
      }
      await loadReport();
    } catch {
      setLastResult("Failed to run cycle");
    }
    setRunning(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AutoScore...
      </div>
    );
  }

  if (!report) return null;

  const corr = correlationLabel(report.correlation);

  return (
    <div className="space-y-6">
      {/* Header Card — Enable + Config */}
      <Card className="px-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                AutoScore
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 uppercase tracking-wider">
                  Beta
                </span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Learns from real post analytics to improve scoring predictions over time
              </p>
            </div>
          </div>

          <button
            onClick={toggleEnabled}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              report.config.enabled ? "bg-violet-500" : "bg-surface-3"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                report.config.enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {report.config.enabled && (
          <>
            <div className="h-px bg-border/50" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted">
                  Learning Rate:{" "}
                  <span className="text-foreground font-medium">
                    {report.config.learningRate}
                  </span>
                </label>
                <input
                  type="range"
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  value={report.config.learningRate}
                  onChange={(e) =>
                    updateConfig({ learningRate: Number(e.target.value) })
                  }
                  className="w-full accent-violet-500"
                />
                <p className="text-[10px] text-muted">
                  How aggressively weights adjust. Lower = stable, higher = faster adaptation.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted">
                  Min Samples:{" "}
                  <span className="text-foreground font-medium">
                    {report.config.minSamples}
                  </span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={20}
                  step={1}
                  value={report.config.minSamples}
                  onChange={(e) =>
                    updateConfig({ minSamples: Number(e.target.value) })
                  }
                  className="w-full accent-violet-500"
                />
                <p className="text-[10px] text-muted">
                  Minimum published clips with analytics before learning starts.
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Stats Overview */}
      {report.config.enabled && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-1 border border-border/50 p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Samples
            </div>
            <div className="text-2xl font-semibold">{report.totalFeedback}</div>
            <div className="text-[10px] text-muted mt-1">published clips tracked</div>
          </div>

          <div className="rounded-xl bg-surface-1 border border-border/50 p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Correlation
            </div>
            <div className={`text-2xl font-semibold ${corr.color}`}>
              {report.totalFeedback >= 2 ? report.correlation.toFixed(2) : "—"}
            </div>
            <div className="text-[10px] text-muted mt-1">
              {report.totalFeedback >= 2
                ? `${corr.text} predicted → actual`
                : "Need 2+ samples"}
            </div>
          </div>

          <div className="rounded-xl bg-surface-1 border border-border/50 p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-2">
              <FlaskConical className="h-3.5 w-3.5" />
              Cycles
            </div>
            <div className="text-2xl font-semibold">{report.updates.length}</div>
            <div className="text-[10px] text-muted mt-1">
              {report.updates.filter((u) => u.accepted).length} accepted
            </div>
          </div>
        </div>
      )}

      {/* Run Learning Cycle */}
      {report.config.enabled && (
        <Card className="px-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Run Learning Cycle</h3>
              <p className="text-xs text-muted mt-0.5">
                Collect analytics from published clips, then adjust weights
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={runCycle}
              disabled={running}
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {running ? "Running..." : "Collect & Learn"}
            </Button>
          </div>

          {lastResult && (
            <div
              className={`text-xs px-3 py-2 rounded-lg ${
                lastResult.startsWith("Error")
                  ? "bg-red-500/10 text-red-400"
                  : "bg-violet-500/10 text-violet-300"
              }`}
            >
              {lastResult}
            </div>
          )}
        </Card>
      )}

      {/* Category Breakdown */}
      {report.config.enabled && report.categoryBreakdown.length > 0 && (
        <Card className="px-6 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Category Performance
          </h3>
          <div className="space-y-2">
            {report.categoryBreakdown.map((cat) => {
              const diff = cat.avgActual - cat.avgPredicted;
              const DiffIcon =
                diff > 0.5 ? TrendingUp : diff < -0.5 ? TrendingDown : Minus;
              const diffColor =
                diff > 0.5
                  ? "text-green-400"
                  : diff < -0.5
                    ? "text-red-400"
                    : "text-muted";

              return (
                <div
                  key={cat.category}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface-2/50"
                >
                  <span className="text-xs font-medium capitalize w-24 truncate">
                    {cat.category}
                  </span>
                  <span className="text-[10px] text-muted w-12">
                    {cat.count} clips
                  </span>
                  <div className="flex-1 flex items-center gap-3 text-xs">
                    <span className="text-muted">
                      Predicted:{" "}
                      <span className="text-foreground">{cat.avgPredicted}</span>
                    </span>
                    <span className="text-muted">
                      Actual:{" "}
                      <span className="text-foreground">{cat.avgActual}</span>
                    </span>
                    <span className="text-muted">
                      Eng:{" "}
                      <span className="text-foreground">
                        {cat.avgEngagement.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <DiffIcon className={`h-3.5 w-3.5 ${diffColor}`} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Weight Update History */}
      {report.config.enabled && report.updates.length > 0 && (
        <Card className="px-6 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Weight Update History
          </h3>
          <div className="space-y-2">
            {report.updates.map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-surface-2/50"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    update.accepted
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {update.accepted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">
                      {update.accepted ? "Accepted" : "Rejected"}
                    </span>
                    <span className="text-muted">
                      r={update.correlation.toFixed(2)}
                    </span>
                    <span className="text-muted">
                      n={update.sampleSize}
                    </span>
                    <span className="text-muted ml-auto text-[10px]">
                      {new Date(update.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {Object.keys(update.adjustments).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Object.entries(update.adjustments)
                        .filter(([, v]) => Math.abs(v) >= 0.01)
                        .map(([key, val]) => (
                          <span
                            key={key}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              val > 0
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {key} {val > 0 ? "+" : ""}
                            {val.toFixed(2)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Feedback */}
      {report.config.enabled && report.recentFeedback.length > 0 && (
        <Card className="px-6 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Recent Feedback
          </h3>
          <div className="space-y-1.5">
            {report.recentFeedback.slice(0, 10).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface-2/50 text-xs"
              >
                <span className="truncate flex-1 font-medium">{f.title}</span>
                <span className="text-muted capitalize w-20 truncate">
                  {f.category}
                </span>
                <span className="text-muted w-16 text-right">
                  {formatNumber(f.actualMetrics.views)} views
                </span>
                <div className="flex items-center gap-1.5 w-28">
                  <span className="text-amber-400">{f.predictedScore}</span>
                  <span className="text-muted">→</span>
                  <span
                    className={
                      f.actualScore > f.predictedScore
                        ? "text-green-400"
                        : f.actualScore < f.predictedScore
                          ? "text-red-400"
                          : "text-foreground"
                    }
                  >
                    {f.actualScore}
                  </span>
                  <span className="text-muted text-[10px]">
                    ({f.engagementRate.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {report.config.enabled && report.totalFeedback === 0 && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">No feedback collected yet</p>
          <p className="text-xs text-muted mt-1">
            Publish clips and wait for analytics, then run a learning cycle
          </p>
        </div>
      )}
    </div>
  );
}
