"use client";

import type { SettingsState } from "@/hooks/useSettings";

const selectClass =
  "w-full bg-surface-2/40 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:outline-none focus:border-[#0A84FF]/50 transition-colors";

interface StyleTabProps {
  state: SettingsState;
  updateField: <K extends keyof SettingsState>(field: K, value: SettingsState[K]) => void;
}

export function StyleTab({ state, updateField }: StyleTabProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline Settings */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Pipeline
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Quality</label>
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
            <label className="text-[12px] font-medium text-muted-foreground">Niche</label>
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
            <label className="text-[12px] font-medium text-muted-foreground">
              Max Clips: {state.defaultMaxClips}
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={state.defaultMaxClips}
              onChange={(e) => updateField("defaultMaxClips", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Min Score: {state.defaultMinScore}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={state.defaultMinScore}
              onChange={(e) => updateField("defaultMinScore", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Max Duration: {state.defaultMaxDuration}s
            </label>
            <input
              type="range"
              min={15}
              max={180}
              step={5}
              value={state.defaultMaxDuration}
              onChange={(e) => updateField("defaultMaxDuration", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Pad Before: {state.padBefore}s
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={state.padBefore}
              onChange={(e) => updateField("padBefore", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Pad After: {state.padAfter}s
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={state.padAfter}
              onChange={(e) => updateField("padAfter", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={state.subtitles}
                onChange={(e) => updateField("subtitles", e.target.checked)}
                className="accent-[#0A84FF]"
              />
              Burn Subtitles by default
            </label>
          </div>
        </div>
      </div>

      {/* Background Fill */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Background Fill
        </h2>
        <p className="text-[11px] text-muted-foreground/80 font-medium">
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
                  ? "border-[#0A84FF]/40 bg-[#0A84FF]/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="bgStyle"
                  value={opt.value}
                  checked={state.bgStyle === opt.value}
                  onChange={(e) => updateField("bgStyle", e.target.value)}
                  className="accent-[#0A84FF]"
                />
                <span className="font-medium">{opt.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/70 ml-5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Caption Mode */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Caption Mode
        </h2>
        <p className="text-[11px] text-muted-foreground/80 font-medium">
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
                  ? "border-[#0A84FF]/40 bg-[#0A84FF]/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-border"
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
                  className="accent-[#0A84FF]"
                />
                <span className="font-medium">{opt.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/70 ml-5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Caption Styling */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Caption Styling
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Font Family</label>
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
            <label className="text-[12px] font-medium text-muted-foreground">Font Size: {state.captionFontSize}</label>
            <input
              type="range"
              min={32}
              max={120}
              step={4}
              value={state.captionFontSize}
              onChange={(e) => updateField("captionFontSize", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Active Word Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.captionActiveColor}
                onChange={(e) => updateField("captionActiveColor", e.target.value)}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground/70 font-mono">{state.captionActiveColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Inactive Word Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.captionInactiveColor.slice(0, 7)}
                onChange={(e) => updateField("captionInactiveColor", e.target.value + "99")}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground/70 font-mono">{state.captionInactiveColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Outline Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.captionOutlineColor}
                onChange={(e) => updateField("captionOutlineColor", e.target.value)}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground/70 font-mono">{state.captionOutlineColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Caption Position</label>
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
                    className="accent-[#0A84FF]"
                  />
                  {pos}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Words Per Line: {state.captionMaxWords}
            </label>
            <input
              type="range"
              min={2}
              max={8}
              value={state.captionMaxWords}
              onChange={(e) => updateField("captionMaxWords", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Animation Preset</label>
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
      </div>

      {/* Hook Text */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Hook Text
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">
              Hook Font Size: {state.hookFontSize}
            </label>
            <input
              type="range"
              min={24}
              max={80}
              step={4}
              value={state.hookFontSize}
              onChange={(e) => updateField("hookFontSize", Number(e.target.value))}
              className="w-full accent-[#0A84FF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Hook Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.hookColor}
                onChange={(e) => updateField("hookColor", e.target.value)}
                className="h-8 w-8 rounded cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground/70 font-mono">{state.hookColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Hook Position</label>
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
                    className="accent-[#0A84FF]"
                  />
                  {pos}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
