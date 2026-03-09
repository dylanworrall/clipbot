"use client";

import { Card } from "@/components/ui/card";
import type { SettingsState } from "@/hooks/useSettings";

const selectClass =
  "w-full rounded-lg bg-surface-2 border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200";

interface StyleTabProps {
  state: SettingsState;
  updateField: <K extends keyof SettingsState>(field: K, value: SettingsState[K]) => void;
}

export function StyleTab({ state, updateField }: StyleTabProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline Settings */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Pipeline
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted">Quality</label>
            <select
              value={state.defaultQuality}
              onChange={(e) => updateField("defaultQuality", e.target.value)}
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
              value={state.niche}
              onChange={(e) => updateField("niche", e.target.value)}
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
              Max Clips: {state.defaultMaxClips}
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={state.defaultMaxClips}
              onChange={(e) => updateField("defaultMaxClips", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Min Score: {state.defaultMinScore}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={state.defaultMinScore}
              onChange={(e) => updateField("defaultMinScore", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Max Duration: {state.defaultMaxDuration}s
            </label>
            <input
              type="range"
              min={15}
              max={180}
              step={5}
              value={state.defaultMaxDuration}
              onChange={(e) => updateField("defaultMaxDuration", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Pad Before: {state.padBefore}s
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={state.padBefore}
              onChange={(e) => updateField("padBefore", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Pad After: {state.padAfter}s
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={state.padAfter}
              onChange={(e) => updateField("padAfter", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={state.subtitles}
                onChange={(e) => updateField("subtitles", e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              Burn Subtitles by default
            </label>
          </div>
        </div>
      </Card>

      {/* Background Fill */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Background Fill
        </h2>
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
                state.bgStyle === opt.value
                  ? "border-accent/30 bg-accent/5 text-foreground"
                  : "border-border text-muted hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="bgStyle"
                  value={opt.value}
                  checked={state.bgStyle === opt.value}
                  onChange={(e) => updateField("bgStyle", e.target.value)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="font-medium">{opt.label}</span>
              </div>
              <span className="text-xs text-muted ml-5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Caption Mode */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Caption Mode
        </h2>
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
                state.captionMode === opt.value
                  ? "border-accent/30 bg-accent/5 text-foreground"
                  : "border-border text-muted hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="captionMode"
                  value={opt.value}
                  checked={state.captionMode === opt.value}
                  onChange={(e) =>
                    updateField("captionMode", e.target.value as "overlay" | "burn-in")
                  }
                  className="accent-[var(--color-accent)]"
                />
                <span className="font-medium">{opt.label}</span>
              </div>
              <span className="text-xs text-muted ml-5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Caption Styling */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Caption Styling
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted">Font Family</label>
            <select
              value={state.captionFontFamily}
              onChange={(e) => updateField("captionFontFamily", e.target.value)}
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
            <label className="text-sm text-muted">Font Size: {state.captionFontSize}</label>
            <input
              type="range"
              min={32}
              max={120}
              step={4}
              value={state.captionFontSize}
              onChange={(e) => updateField("captionFontSize", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Active Word Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.captionActiveColor}
                onChange={(e) => updateField("captionActiveColor", e.target.value)}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-xs text-muted font-mono">{state.captionActiveColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Inactive Word Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.captionInactiveColor.slice(0, 7)}
                onChange={(e) => updateField("captionInactiveColor", e.target.value + "99")}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-xs text-muted font-mono">{state.captionInactiveColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Outline Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.captionOutlineColor}
                onChange={(e) => updateField("captionOutlineColor", e.target.value)}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-xs text-muted font-mono">{state.captionOutlineColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Caption Position</label>
            <div className="flex gap-2">
              {(["top", "center", "bottom"] as const).map((pos) => (
                <label
                  key={pos}
                  className="flex items-center gap-1 text-sm cursor-pointer capitalize"
                >
                  <input
                    type="radio"
                    name="captionPos"
                    value={pos}
                    checked={state.captionPosition === pos}
                    onChange={() => updateField("captionPosition", pos)}
                    className="accent-[var(--color-accent)]"
                  />
                  {pos}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Words Per Line: {state.captionMaxWords}
            </label>
            <input
              type="range"
              min={2}
              max={8}
              value={state.captionMaxWords}
              onChange={(e) => updateField("captionMaxWords", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Animation Preset</label>
            <select
              value={state.captionAnimation}
              onChange={(e) => updateField("captionAnimation", e.target.value)}
              className={selectClass}
            >
              <option value="karaoke-highlight">Karaoke Highlight</option>
              <option value="word-pop">Word Pop</option>
              <option value="typewriter">Typewriter</option>
              <option value="simple-fade">Simple Fade</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Hook Text */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Hook Text
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted">
              Hook Font Size: {state.hookFontSize}
            </label>
            <input
              type="range"
              min={24}
              max={80}
              step={4}
              value={state.hookFontSize}
              onChange={(e) => updateField("hookFontSize", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Hook Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.hookColor}
                onChange={(e) => updateField("hookColor", e.target.value)}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-xs text-muted font-mono">{state.hookColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Hook Position</label>
            <div className="flex gap-2">
              {(["top", "center"] as const).map((pos) => (
                <label
                  key={pos}
                  className="flex items-center gap-1 text-sm cursor-pointer capitalize"
                >
                  <input
                    type="radio"
                    name="hookPos"
                    value={pos}
                    checked={state.hookPosition === pos}
                    onChange={() => updateField("hookPosition", pos)}
                    className="accent-[var(--color-accent)]"
                  />
                  {pos}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
