"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Play,
  Loader2,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";

interface AutopilotConfig {
  enabled: boolean;
  postsPerDay: number;
  preferredTime: string;
  platforms: string[];
  lastRunAt?: string;
  lastRunStatus?: string;
}

const AVAILABLE_PLATFORMS = [
  "twitter",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
  "facebook",
  "threads",
  "bluesky",
];

export function AutopilotTab() {
  const [config, setConfig] = useState<AutopilotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/autopilot");
      if (res.ok) setConfig(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = async (patch: Partial<AutopilotConfig>) => {
    const res = await fetch("/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_config", config: patch }),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
    }
  };

  const toggleEnabled = () => {
    if (!config) return;
    updateConfig({ enabled: !config.enabled });
  };

  const togglePlatform = (platform: string) => {
    if (!config) return;
    const platforms = config.platforms.includes(platform)
      ? config.platforms.filter((p) => p !== platform)
      : [...config.platforms, platform];
    updateConfig({ platforms });
  };

  const runNow = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: config?.postsPerDay || 3 }),
      });
      const data = await res.json();
      if (data.error) {
        setLastResult(`Error: ${data.error}`);
      } else {
        const topicCount = data.trendingTopics?.length || 0;
        const postCount = data.topPerforming?.length || 0;
        setLastResult(
          `Research complete: ${topicCount} trending topics, ${postCount} posts analyzed. Use chat to generate drafts from this data.`
        );
      }
      await loadConfig();
    } catch {
      setLastResult("Failed to run autopilot");
    }
    setRunning(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground py-12 justify-center">
        <Loader2 size={16} className="animate-spin" />
        Loading Autopilot...
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header Card -- Enable + Config */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#30D158]/10">
              <Zap size={18} className="text-[#30D158]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                Content Autopilot
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#30D158]/10 text-[#30D158] uppercase tracking-wider">
                  Beta
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Automatically research trends and generate draft posts daily
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={toggleEnabled}
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              config.enabled ? "bg-[#30D158]" : "bg-white/10"
            }`}
          >
            <div
              className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm absolute top-[3px] transition-transform ${
                config.enabled ? "translate-x-[19px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>

        {config.enabled && (
          <>
            <div className="border-t border-border" />

            {/* Posts per day */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">
                Posts per day:{" "}
                <span className="text-foreground">{config.postsPerDay}</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={config.postsPerDay}
                onChange={(e) =>
                  updateConfig({ postsPerDay: Number(e.target.value) })
                }
                className="w-full accent-[#30D158]"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            {/* Preferred time */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock size={12} />
                Preferred posting time
              </label>
              <input
                type="time"
                value={config.preferredTime}
                onChange={(e) =>
                  updateConfig({ preferredTime: e.target.value })
                }
                className="w-full bg-surface-2/40 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:border-[#0A84FF]/50 focus:outline-none transition-colors [color-scheme:dark]"
              />
              <p className="text-[10px] text-muted-foreground/60">
                Drafts will be scheduled around this time each day.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Platforms */}
      {config.enabled && (
        <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">
            Target Platforms
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_PLATFORMS.map((platform) => {
              const isSelected = config.platforms.includes(platform);
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    isSelected
                      ? "bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20"
                      : "bg-surface-2/40 text-muted-foreground border border-border hover:text-foreground/70 hover:border-border"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-[#30D158] text-white"
                        : "bg-white/5"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="capitalize">{platform}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Run Now */}
      {config.enabled && (
        <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">
                Run Autopilot Now
              </h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Research trends and prepare draft content immediately
              </p>
            </div>
            <Button
              variant="green"
              size="sm"
              onClick={runNow}
              disabled={running}
            >
              {running ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {running ? "Running..." : "Run Now"}
            </Button>
          </div>

          {lastResult && (
            <div
              className={`text-[12px] font-medium px-3 py-2 rounded-lg ${
                lastResult.startsWith("Error")
                  ? "bg-[#FF453A]/10 text-[#FF453A]"
                  : "bg-[#30D158]/10 text-[#30D158]"
              }`}
            >
              {lastResult}
            </div>
          )}
        </div>
      )}

      {/* Last Run Status */}
      {config.enabled && config.lastRunAt && (
        <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">
            Last Run
          </h3>
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                config.lastRunStatus === "success"
                  ? "bg-[#30D158]/10 text-[#30D158]"
                  : "bg-[#FF453A]/10 text-[#FF453A]"
              }`}
            >
              {config.lastRunStatus === "success" ? (
                <Check size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground/70 capitalize">
                {config.lastRunStatus || "Unknown"}
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                {new Date(config.lastRunAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
