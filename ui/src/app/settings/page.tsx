"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/PageTransition";
import { Save, Loader2, RefreshCw } from "lucide-react";

interface Account {
  id: string;
  platform: string;
  name: string;
}

const selectClass = "w-full rounded-lg bg-surface-2 border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200";

export default function SettingsPage() {
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [lateApiKey, setLateApiKey] = useState("");
  const [claudeModel, setClaudeModel] = useState("claude-sonnet-4-20250514");
  const [claudeTemperature, setClaudeTemperature] = useState(0.2);
  const [defaultQuality, setDefaultQuality] = useState("1080");
  const [defaultMaxClips, setDefaultMaxClips] = useState(5);
  const [defaultMinScore, setDefaultMinScore] = useState(7);
  const [defaultMaxDuration, setDefaultMaxDuration] = useState(59);
  const [niche, setNiche] = useState("cannabis");
  const [subtitles, setSubtitles] = useState(true);
  const [padBefore, setPadBefore] = useState(1.5);
  const [padAfter, setPadAfter] = useState(0.5);
  const [bgStyle, setBgStyle] = useState("blurred-zoom");
  const [captionMode, setCaptionMode] = useState<"overlay" | "burn-in">("overlay");
  const [captionFontFamily, setCaptionFontFamily] = useState("Arial");
  const [captionFontSize, setCaptionFontSize] = useState(72);
  const [captionActiveColor, setCaptionActiveColor] = useState("#FFD700");
  const [captionInactiveColor, setCaptionInactiveColor] = useState("#FFFFFF99");
  const [captionOutlineColor, setCaptionOutlineColor] = useState("#000000");
  const [captionPosition, setCaptionPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [captionMaxWords, setCaptionMaxWords] = useState(5);
  const [captionAnimation, setCaptionAnimation] = useState("typewriter");
  const [hookFontSize, setHookFontSize] = useState(56);
  const [hookColor, setHookColor] = useState("#FFFFFF");
  const [hookBgColor, setHookBgColor] = useState("rgba(0,0,0,0.7)");
  const [hookPosition, setHookPosition] = useState<"top" | "center">("top");
  // Scoring weights
  const [weightHook, setWeightHook] = useState(3);
  const [weightStandalone, setWeightStandalone] = useState(3);
  const [weightControversy, setWeightControversy] = useState(3);
  const [weightEducation, setWeightEducation] = useState(3);
  const [weightEmotion, setWeightEmotion] = useState(1.5);
  const [weightTwist, setWeightTwist] = useState(1.5);
  const [weightQuotable, setWeightQuotable] = useState(1);
  const [weightVisual, setWeightVisual] = useState(1);
  const [weightNicheBonus, setWeightNicheBonus] = useState(1);
  const [defaultPlatforms, setDefaultPlatforms] = useState<string[]>(["tiktok", "youtube", "instagram"]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.claudeApiKey) setClaudeApiKey(data.claudeApiKey);
        if (data.lateApiKey) setLateApiKey(data.lateApiKey);
        if (data.claudeModel) setClaudeModel(data.claudeModel);
        if (data.claudeTemperature !== undefined) setClaudeTemperature(data.claudeTemperature);
        if (data.defaultQuality) setDefaultQuality(data.defaultQuality);
        if (data.defaultMaxClips) setDefaultMaxClips(data.defaultMaxClips);
        if (data.defaultMinScore) setDefaultMinScore(data.defaultMinScore);
        if (data.defaultMaxDuration) setDefaultMaxDuration(data.defaultMaxDuration);
        if (data.niche) setNiche(data.niche);
        if (data.subtitles !== undefined) setSubtitles(data.subtitles);
        if (data.padBefore !== undefined) setPadBefore(data.padBefore);
        if (data.padAfter !== undefined) setPadAfter(data.padAfter);
        if (data.backgroundFillStyle) setBgStyle(data.backgroundFillStyle);
        if (data.defaultPlatforms) setDefaultPlatforms(data.defaultPlatforms);
        if (data.captionMode) setCaptionMode(data.captionMode);
        if (data.captionStyle) {
          const cs = data.captionStyle;
          if (cs.fontFamily) setCaptionFontFamily(cs.fontFamily);
          if (cs.fontSize) setCaptionFontSize(cs.fontSize);
          if (cs.activeColor) setCaptionActiveColor(cs.activeColor);
          if (cs.inactiveColor) setCaptionInactiveColor(cs.inactiveColor);
          if (cs.outlineColor) setCaptionOutlineColor(cs.outlineColor);
          if (cs.position) setCaptionPosition(cs.position);
          if (cs.maxWordsPerLine) setCaptionMaxWords(cs.maxWordsPerLine);
          if (cs.animationPreset) setCaptionAnimation(cs.animationPreset);
          if (cs.hookFontSize) setHookFontSize(cs.hookFontSize);
          if (cs.hookColor) setHookColor(cs.hookColor);
          if (cs.hookBgColor) setHookBgColor(cs.hookBgColor);
          if (cs.hookPosition) setHookPosition(cs.hookPosition);
        }
        if (data.scoringWeights) {
          const sw = data.scoringWeights;
          if (sw.hook !== undefined) setWeightHook(sw.hook);
          if (sw.standalone !== undefined) setWeightStandalone(sw.standalone);
          if (sw.controversy !== undefined) setWeightControversy(sw.controversy);
          if (sw.education !== undefined) setWeightEducation(sw.education);
          if (sw.emotion !== undefined) setWeightEmotion(sw.emotion);
          if (sw.twist !== undefined) setWeightTwist(sw.twist);
          if (sw.quotable !== undefined) setWeightQuotable(sw.quotable);
          if (sw.visual !== undefined) setWeightVisual(sw.visual);
          if (sw.nicheBonus !== undefined) setWeightNicheBonus(sw.nicheBonus);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(claudeApiKey && !claudeApiKey.includes("...configured") && { claudeApiKey }),
          ...(lateApiKey && !lateApiKey.includes("...configured") && { lateApiKey }),
          claudeModel,
          claudeTemperature,
          defaultQuality,
          defaultMaxClips,
          defaultMinScore,
          defaultMaxDuration,
          niche,
          subtitles,
          padBefore,
          padAfter,
          backgroundFillStyle: bgStyle,
          defaultPlatforms,
          captionMode,
          captionStyle: {
            fontFamily: captionFontFamily,
            fontSize: captionFontSize,
            activeColor: captionActiveColor,
            inactiveColor: captionInactiveColor,
            outlineColor: captionOutlineColor,
            position: captionPosition,
            maxWordsPerLine: captionMaxWords,
            animationPreset: captionAnimation,
            hookFontSize,
            hookColor,
            hookBgColor,
            hookPosition,
          },
          scoringWeights: {
            hook: weightHook,
            standalone: weightStandalone,
            controversy: weightControversy,
            education: weightEducation,
            emotion: weightEmotion,
            twist: weightTwist,
            quotable: weightQuotable,
            visual: weightVisual,
            nicheBonus: weightNicheBonus,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handling
    }
    setSaving(false);
  };

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      // Error handling
    }
    setLoadingAccounts(false);
  };

  return (
    <PageTransition>
      <div className="h-screen overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16 space-y-8">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* API Keys */}
        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            API Keys
          </h2>
          <Input
            id="claude-key"
            label="Anthropic API Key"
            type="password"
            value={claudeApiKey}
            onChange={(e) => setClaudeApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <Input
            id="late-key"
            label="Late API Key"
            type="password"
            value={lateApiKey}
            onChange={(e) => setLateApiKey(e.target.value)}
            placeholder="Enter Late API key"
          />
          <div className="space-y-1.5">
            <label className="text-sm text-muted">Claude Model</label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              className={selectClass}
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-opus-4-20250514">Claude Opus 4</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Analysis Temperature: {claudeTemperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={claudeTemperature}
              onChange={(e) => setClaudeTemperature(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <p className="text-xs text-muted">
              {claudeTemperature === 0
                ? "Deterministic — same video always produces identical clips"
                : claudeTemperature <= 0.3
                  ? "Mostly consistent — top clips stay the same, slight variation in wording"
                  : claudeTemperature <= 0.6
                    ? "Balanced — core picks consistent, lower-scored clips may vary"
                    : "Creative — more variety between runs, scores may shift 1-2 points"}
            </p>
          </div>
        </Card>

        {/* Pipeline & Style */}
        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Pipeline & Style
          </h2>

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Pipeline</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Quality</label>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value)}
                className={selectClass}
              >
                <option value="2160">4K (2160p)</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Niche</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className={selectClass}
              >
                <option value="cannabis">Cannabis</option>
                <option value="general">General</option>
                <option value="tech">Tech</option>
                <option value="fitness">Fitness</option>
                <option value="cooking">Cooking</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">
                Max Clips: {defaultMaxClips}
              </label>
              <input
                type="range"
                min={1}
                max={15}
                value={defaultMaxClips}
                onChange={(e) => setDefaultMaxClips(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">
                Min Score: {defaultMinScore}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={defaultMinScore}
                onChange={(e) => setDefaultMinScore(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">
                Max Duration: {defaultMaxDuration}s
              </label>
              <input
                type="range"
                min={15}
                max={180}
                step={5}
                value={defaultMaxDuration}
                onChange={(e) => setDefaultMaxDuration(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">
                Pad Before: {padBefore}s
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={padBefore}
                onChange={(e) => setPadBefore(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">
                Pad After: {padAfter}s
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={padAfter}
                onChange={(e) => setPadAfter(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitles}
                  onChange={(e) => setSubtitles(e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                Burn Subtitles by default
              </label>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Background Fill</h3>
          <p className="text-xs text-muted">
            How to fill the 9:16 vertical frame when the source video is wider.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "blurred-zoom", label: "Blurred Zoom", desc: "Zoomed + blurred duplicate behind" },
              { value: "mirror-reflection", label: "Mirror Reflection", desc: "Flipped + blurred, like water" },
              { value: "split-fill", label: "Split Fill", desc: "Top/bottom halves blurred" },
              { value: "center-crop", label: "Center Crop", desc: "Legacy: crops to 9:16" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col gap-1 cursor-pointer rounded-lg border p-4 text-sm transition-all duration-200 ${
                  bgStyle === opt.value
                    ? "border-accent/30 bg-accent/5 text-foreground"
                    : "border-border text-muted hover:border-foreground/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bgStyle"
                    value={opt.value}
                    checked={bgStyle === opt.value}
                    onChange={(e) => setBgStyle(e.target.value)}
                    className="accent-[var(--color-accent)]"
                  />
                  <span className="font-medium">{opt.label}</span>
                </div>
                <span className="text-xs text-muted ml-5">{opt.desc}</span>
              </label>
            ))}
          </div>

          <div className="h-px bg-border/50" />

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Caption Mode</h3>
          <p className="text-xs text-muted">
            How captions are applied to your clips.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "overlay" as const,
                label: "Overlay (Recommended)",
                desc: "Captions render as a live overlay. Edit styles instantly. Burns on export/publish.",
              },
              {
                value: "burn-in" as const,
                label: "Burn-In",
                desc: "Captions baked into video during pipeline. Requires re-render to change styles.",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col gap-1 cursor-pointer rounded-lg border p-4 text-sm transition-all duration-200 ${
                  captionMode === opt.value
                    ? "border-accent/30 bg-accent/5 text-foreground"
                    : "border-border text-muted hover:border-foreground/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="captionMode"
                    value={opt.value}
                    checked={captionMode === opt.value}
                    onChange={(e) => setCaptionMode(e.target.value as "overlay" | "burn-in")}
                    className="accent-[var(--color-accent)]"
                  />
                  <span className="font-medium">{opt.label}</span>
                </div>
                <span className="text-xs text-muted ml-5">{opt.desc}</span>
              </label>
            ))}
          </div>

          <div className="h-px bg-border/50" />

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Caption Styling</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Font Family</label>
              <select
                value={captionFontFamily}
                onChange={(e) => setCaptionFontFamily(e.target.value)}
                className={selectClass}
              >
                <option value="Arial">Arial</option>
                <option value="Impact">Impact</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Roboto">Roboto</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Font Size: {captionFontSize}</label>
              <input
                type="range"
                min={32}
                max={120}
                step={4}
                value={captionFontSize}
                onChange={(e) => setCaptionFontSize(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Active Word Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={captionActiveColor}
                  onChange={(e) => setCaptionActiveColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <span className="text-xs text-muted font-mono">{captionActiveColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Inactive Word Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={captionInactiveColor.slice(0, 7)}
                  onChange={(e) => setCaptionInactiveColor(e.target.value + "99")}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <span className="text-xs text-muted font-mono">{captionInactiveColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Outline Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={captionOutlineColor}
                  onChange={(e) => setCaptionOutlineColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <span className="text-xs text-muted font-mono">{captionOutlineColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Caption Position</label>
              <div className="flex gap-2">
                {(["top", "center", "bottom"] as const).map((pos) => (
                  <label key={pos} className="flex items-center gap-1 text-sm cursor-pointer capitalize">
                    <input
                      type="radio"
                      name="captionPos"
                      value={pos}
                      checked={captionPosition === pos}
                      onChange={() => setCaptionPosition(pos)}
                      className="accent-[var(--color-accent)]"
                    />
                    {pos}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Words Per Line: {captionMaxWords}</label>
              <input
                type="range"
                min={2}
                max={8}
                value={captionMaxWords}
                onChange={(e) => setCaptionMaxWords(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Animation Preset</label>
              <select
                value={captionAnimation}
                onChange={(e) => setCaptionAnimation(e.target.value)}
                className={selectClass}
              >
                <option value="karaoke-highlight">Karaoke Highlight</option>
                <option value="word-pop">Word Pop</option>
                <option value="typewriter">Typewriter</option>
                <option value="simple-fade">Simple Fade</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Hook Text</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Hook Font Size: {hookFontSize}</label>
              <input
                type="range"
                min={24}
                max={80}
                step={4}
                value={hookFontSize}
                onChange={(e) => setHookFontSize(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Hook Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hookColor}
                  onChange={(e) => setHookColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <span className="text-xs text-muted font-mono">{hookColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Hook Position</label>
              <div className="flex gap-2">
                {(["top", "center"] as const).map((pos) => (
                  <label key={pos} className="flex items-center gap-1 text-sm cursor-pointer capitalize">
                    <input
                      type="radio"
                      name="hookPos"
                      value={pos}
                      checked={hookPosition === pos}
                      onChange={() => setHookPosition(pos)}
                      className="accent-[var(--color-accent)]"
                    />
                    {pos}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Scoring Weights */}
        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            AI Scoring Weights
          </h2>
          <p className="text-xs text-muted">
            Control how the AI prioritizes different viral criteria. Higher weights mean that criterion matters more in the final score.
          </p>

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Primary Criteria</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Strong Hook", value: weightHook, setter: setWeightHook, desc: "First 2 seconds grab attention" },
              { label: "Standalone Value", value: weightStandalone, setter: setWeightStandalone, desc: "Makes sense without context" },
              { label: "Controversy/Debate", value: weightControversy, setter: setWeightControversy, desc: "Polarizing opinions, hot takes" },
              { label: "Educational Nuggets", value: weightEducation, setter: setWeightEducation, desc: "\"I didn't know that\" moments" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <label className="text-sm text-muted">
                  {item.label}: <span className="text-foreground font-medium">{item.value}x</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={item.value}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <p className="text-[10px] text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-border/50" />

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Secondary Criteria</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Emotional Peaks", value: weightEmotion, setter: setWeightEmotion, desc: "Genuine excitement, shock, passion" },
              { label: "Unexpected Twists", value: weightTwist, setter: setWeightTwist, desc: "Surprising reveals, counterintuitive facts" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <label className="text-sm text-muted">
                  {item.label}: <span className="text-foreground font-medium">{item.value}x</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={item.value}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <p className="text-[10px] text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-border/50" />

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Tertiary Criteria</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Quotable Lines", value: weightQuotable, setter: setWeightQuotable, desc: "Memorable one-liners people share" },
              { label: "Visual Cue Potential", value: weightVisual, setter: setWeightVisual, desc: "Visually impressive moments" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <label className="text-sm text-muted">
                  {item.label}: <span className="text-foreground font-medium">{item.value}x</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={item.value}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <p className="text-[10px] text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-border/50" />

          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Niche Bonus: <span className="text-foreground font-medium">+{weightNicheBonus}</span>
            </label>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={weightNicheBonus}
              onChange={(e) => setWeightNicheBonus(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <p className="text-[10px] text-muted">
              Bonus points added to the final score when a moment hits niche-specific criteria
            </p>
          </div>
        </Card>

        {/* Default Publish Platforms */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Default Publish Platforms
          </h2>
          <p className="text-xs text-muted">
            Select which platforms clips are published to by default.
          </p>
          <div className="flex gap-4 flex-wrap">
            {["tiktok", "youtube", "instagram", "facebook"].map((p) => (
              <label
                key={p}
                className="flex items-center gap-2 text-sm cursor-pointer capitalize"
              >
                <input
                  type="checkbox"
                  checked={defaultPlatforms.includes(p)}
                  onChange={() =>
                    setDefaultPlatforms((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                    )
                  }
                  className="accent-[var(--color-accent)]"
                />
                {p}
              </label>
            ))}
          </div>
        </Card>

        {/* Connected Accounts */}
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Connected Accounts
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchAccounts}>
              {loadingAccounts ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Fetch
            </Button>
          </div>

          {accounts.length > 0 ? (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm py-2.5 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="green" className="capitalize">
                      {a.platform}
                    </Badge>
                    <span>{a.name}</span>
                  </div>
                  <span className="text-xs text-muted font-mono">{a.id.slice(0, 8)}...</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Click &quot;Fetch&quot; to load connected accounts from Late API
            </p>
          )}
        </Card>

        {/* Save */}
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {saved && (
            <span className="text-sm text-accent">Settings saved!</span>
          )}
        </div>
      </div>
      </div>
    </PageTransition>
  );
}
