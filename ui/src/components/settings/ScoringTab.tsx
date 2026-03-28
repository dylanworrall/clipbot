"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { SettingsState } from "@/hooks/useSettings";

interface ScoringTabProps {
  state: SettingsState;
  updateField: <K extends keyof SettingsState>(field: K, value: SettingsState[K]) => void;
  resetScoring: () => void;
}

interface WeightSlider {
  label: string;
  field: keyof SettingsState;
  value: number;
  desc: string;
  min?: number;
  max?: number;
  step?: number;
}

export function ScoringTab({ state, updateField, resetScoring }: ScoringTabProps) {
  const primaryWeights: WeightSlider[] = [
    { label: "Strong Hook", field: "weightHook", value: state.weightHook, desc: "First 2 seconds grab attention" },
    { label: "Standalone Value", field: "weightStandalone", value: state.weightStandalone, desc: "Makes sense without context" },
    { label: "Controversy/Debate", field: "weightControversy", value: state.weightControversy, desc: "Polarizing opinions, hot takes" },
    { label: "Educational Nuggets", field: "weightEducation", value: state.weightEducation, desc: '"I didn\'t know that" moments' },
  ];

  const secondaryWeights: WeightSlider[] = [
    { label: "Emotional Peaks", field: "weightEmotion", value: state.weightEmotion, desc: "Genuine excitement, shock, passion" },
    { label: "Unexpected Twists", field: "weightTwist", value: state.weightTwist, desc: "Surprising reveals, counterintuitive facts" },
  ];

  const tertiaryWeights: WeightSlider[] = [
    { label: "Quotable Lines", field: "weightQuotable", value: state.weightQuotable, desc: "Memorable one-liners people share" },
    { label: "Visual Cue Potential", field: "weightVisual", value: state.weightVisual, desc: "Visually impressive moments" },
  ];

  const renderSliderGrid = (items: WeightSlider[]) => (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <label className="text-[12px] font-medium text-muted-foreground">
            {item.label}:{" "}
            <span className="text-foreground">{item.value}x</span>
          </label>
          <input
            type="range"
            min={item.min ?? 0}
            max={item.max ?? 5}
            step={item.step ?? 0.5}
            value={item.value}
            onChange={(e) =>
              updateField(
                item.field as keyof SettingsState,
                Number(e.target.value) as never
              )
            }
            className="w-full accent-[#0A84FF]"
          />
          <p className="text-[10px] text-muted-foreground/60">{item.desc}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              AI Scoring Weights
            </h2>
            <p className="text-[11px] text-muted-foreground/80 font-medium mt-1">
              Control how the AI prioritizes different viral criteria. Higher weights
              mean that criterion matters more in the final score.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetScoring}>
            <RotateCcw size={14} />
            Reset Defaults
          </Button>
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">
          Primary Criteria
        </h3>
        {renderSliderGrid(primaryWeights)}

        <div className="border-t border-border" />

        <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">
          Secondary Criteria
        </h3>
        {renderSliderGrid(secondaryWeights)}

        <div className="border-t border-border" />

        <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-4">
          Tertiary Criteria
        </h3>
        {renderSliderGrid(tertiaryWeights)}

        <div className="border-t border-border" />

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-muted-foreground">
            Niche Bonus:{" "}
            <span className="text-foreground">
              +{state.weightNicheBonus}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={0.5}
            value={state.weightNicheBonus}
            onChange={(e) => updateField("weightNicheBonus", Number(e.target.value))}
            className="w-full accent-[#FF9F0A]"
          />
          <p className="text-[10px] text-muted-foreground/60">
            Bonus points added to the final score when a moment hits niche-specific criteria
          </p>
        </div>
      </div>
    </div>
  );
}
