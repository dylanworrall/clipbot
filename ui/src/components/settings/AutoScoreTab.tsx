"use client";

import { useState, useEffect, useCallback } from "react";
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
  if (abs >= 0.7) return { text: "Strong", color: "text-[#30D158]" };
  if (abs >= 0.4) return { text: "Moderate", color: "text-[#FF9F0A]" };
  if (abs >= 0.2) return { text: "Weak", color: "text-[#FF9F0A]" };
  return { text: "None", color: "text-white/40" };
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
      <div className="flex items-center gap-2 text-[13px] font-medium text-white/40 py-12 justify-center">
        <Loader2 size={16} className="animate-spin" />
        Loading AutoScore...
      </div>
    );
  }

  if (!report) return null;

  const corr = correlationLabel(report.correlation);

  return (
    <div className="space-y-6">
      {/* Header Card — Enable + Config */}
      <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#BF5AF2]/10">
              <Brain size={18} className="text-[#BF5AF2]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white/90 flex items-center gap-2">
                AutoScore
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#BF5AF2]/10 text-[#BF5AF2] uppercase tracking-wider">
                  Beta
                </span>
              </h2>
              <p className="text-[11px] text-white/35 mt-0.5">
                Learns from real post analytics to improve scoring predictions over time
              </p>
            </div>
          </div>

          {/* Toggle — Soshi pattern */}
          <button
            onClick={toggleEnabled}
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              report.config.enabled ? "bg-[#BF5AF2]" : "bg-white/10"
            }`}
          >
            <div
              className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm absolute top-[3px] transition-transform ${
                report.config.enabled ? "translate-x-[19px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>

        {report.config.enabled && (
          <>
            <div className="border-t border-white/5" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-white/40">
                  Learning Rate:{" "}
                  <span className="text-white/90">
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
                  className="w-full accent-[#BF5AF2]"
                />
                <p className="text-[10px] text-white/25">
                  How aggressively weights adjust. Lower = stable, higher = faster adaptation.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-white/40">
                  Min Samples:{" "}
                  <span className="text-white/90">
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
                  className="w-full accent-[#BF5AF2]"
                />
                <p className="text-[10px] text-white/25">
                  Minimum published clips with analytics before learning starts.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stats Overview */}
      {report.config.enabled && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm text-center">
            <div className="flex items-center justify-center gap-2 text-white/40 text-[11px] mb-2">
              <BarChart3 size={12} />
              Samples
            </div>
            <p className="text-[24px] font-bold tracking-tight text-[#0A84FF] tabular-nums">{report.totalFeedback}</p>
            <p className="text-[10px] text-white/25 mt-1">published clips tracked</p>
          </div>

          <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm text-center">
            <div className="flex items-center justify-center gap-2 text-white/40 text-[11px] mb-2">
              <TrendingUp size={12} />
              Correlation
            </div>
            <p className={`text-[24px] font-bold tracking-tight tabular-nums ${corr.color}`}>
              {report.totalFeedback >= 2 ? report.correlation.toFixed(2) : "—"}
            </p>
            <p className="text-[10px] text-white/25 mt-1">
              {report.totalFeedback >= 2
                ? `${corr.text} predicted → actual`
                : "Need 2+ samples"}
            </p>
          </div>

          <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm text-center">
            <div className="flex items-center justify-center gap-2 text-white/40 text-[11px] mb-2">
              <FlaskConical size={12} />
              Cycles
            </div>
            <p className="text-[24px] font-bold tracking-tight text-[#BF5AF2] tabular-nums">{report.updates.length}</p>
            <p className="text-[10px] text-white/25 mt-1">
              {report.updates.filter((u) => u.accepted).length} accepted
            </p>
          </div>
        </div>
      )}

      {/* Run Learning Cycle */}
      {report.config.enabled && (
        <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-white/90">Run Learning Cycle</h3>
              <p className="text-[11px] text-white/35 mt-0.5">
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
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              {running ? "Running..." : "Collect & Learn"}
            </Button>
          </div>

          {lastResult && (
            <div
              className={`text-[12px] font-medium px-3 py-2 rounded-lg ${
                lastResult.startsWith("Error")
                  ? "bg-[#FF453A]/10 text-[#FF453A]"
                  : "bg-[#BF5AF2]/10 text-[#BF5AF2]"
              }`}
            >
              {lastResult}
            </div>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      {report.config.enabled && report.categoryBreakdown.length > 0 && (
        <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-white/40 tracking-wider uppercase mb-4">
            Category Performance
          </h3>
          <div className="space-y-2">
            {report.categoryBreakdown.map((cat) => {
              const diff = cat.avgActual - cat.avgPredicted;
              const DiffIcon =
                diff > 0.5 ? TrendingUp : diff < -0.5 ? TrendingDown : Minus;
              const diffColor =
                diff > 0.5
                  ? "text-[#30D158]"
                  : diff < -0.5
                    ? "text-[#FF453A]"
                    : "text-white/40";

              return (
                <div
                  key={cat.category}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#3A3A3C] transition-colors"
                >
                  <span className="text-[12px] font-medium text-white/70 capitalize w-24 truncate">
                    {cat.category}
                  </span>
                  <span className="text-[10px] text-white/30 w-12">
                    {cat.count} clips
                  </span>
                  <div className="flex-1 flex items-center gap-3 text-[11px]">
                    <span className="text-white/35">
                      Predicted:{" "}
                      <span className="text-white/70">{cat.avgPredicted}</span>
                    </span>
                    <span className="text-white/35">
                      Actual:{" "}
                      <span className="text-white/70">{cat.avgActual}</span>
                    </span>
                    <span className="text-white/35">
                      Eng:{" "}
                      <span className="text-white/70">
                        {cat.avgEngagement.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <DiffIcon size={14} className={diffColor} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight Update History */}
      {report.config.enabled && report.updates.length > 0 && (
        <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-white/40 tracking-wider uppercase mb-4">
            Weight Update History
          </h3>
          <div className="space-y-2">
            {report.updates.map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-[#3A3A3C] transition-colors"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    update.accepted
                      ? "bg-[#30D158]/10 text-[#30D158]"
                      : "bg-[#FF453A]/10 text-[#FF453A]"
                  }`}
                >
                  {update.accepted ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <X size={12} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[12px] font-medium">
                    <span className="text-white/90">
                      {update.accepted ? "Accepted" : "Rejected"}
                    </span>
                    <span className="text-white/35">
                      r={update.correlation.toFixed(2)}
                    </span>
                    <span className="text-white/35">
                      n={update.sampleSize}
                    </span>
                    <span className="text-white/25 ml-auto text-[10px]">
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
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                              val > 0
                                ? "bg-[#30D158]/10 text-[#30D158]"
                                : "bg-[#FF453A]/10 text-[#FF453A]"
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
        </div>
      )}

      {/* Recent Feedback */}
      {report.config.enabled && report.recentFeedback.length > 0 && (
        <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-white/40 tracking-wider uppercase mb-4">
            Recent Feedback
          </h3>
          <div className="space-y-1.5">
            {report.recentFeedback.slice(0, 10).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#3A3A3C] transition-colors text-[12px]"
              >
                <span className="truncate flex-1 font-medium text-white/70">{f.title}</span>
                <span className="text-white/35 capitalize w-20 truncate">
                  {f.category}
                </span>
                <span className="text-white/35 w-16 text-right tabular-nums">
                  {formatNumber(f.actualMetrics.views)} views
                </span>
                <div className="flex items-center gap-1.5 w-28 tabular-nums">
                  <span className="text-[#FF9F0A]">{f.predictedScore}</span>
                  <span className="text-white/25">→</span>
                  <span
                    className={
                      f.actualScore > f.predictedScore
                        ? "text-[#30D158]"
                        : f.actualScore < f.predictedScore
                          ? "text-[#FF453A]"
                          : "text-white/70"
                    }
                  >
                    {f.actualScore}
                  </span>
                  <span className="text-white/25 text-[10px]">
                    ({f.engagementRate.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {report.config.enabled && report.totalFeedback === 0 && (
        <div className="text-center py-8">
          <RefreshCw size={24} className="text-white/20 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-white/50">No feedback collected yet</p>
          <p className="text-[12px] text-white/30 mt-1">
            Publish clips and wait for analytics, then run a learning cycle
          </p>
        </div>
      )}
    </div>
  );
}
