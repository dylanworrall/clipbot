"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { StyleTab } from "@/components/settings/StyleTab";
import { ScoringTab } from "@/components/settings/ScoringTab";
import { ConnectorsTab } from "@/components/settings/ConnectorsTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { AutoScoreTab } from "@/components/settings/AutoScoreTab";
import { AutopilotTab } from "@/components/settings/AutopilotTab";
import { BrandTab } from "@/components/settings/BrandTab";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/contexts/ToastContext";
import { Save, Loader2 } from "lucide-react";

// ── Tab definitions ──────────────────────────────────────────────────────────

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;

const ALL_TABS = [
  { key: "general", label: "General" },
  { key: "brand", label: "Brand" },
  { key: "style", label: "Style" },
  { key: "scoring", label: "Scoring" },
  { key: "autoscore", label: "AutoScore" },
  { key: "autopilot", label: "Autopilot" },
  { key: "connectors", label: "Connectors" },
  { key: "billing", label: "Billing" },
] as const;

const TABS = isCloudMode
  ? ALL_TABS
  : ALL_TABS.filter((t) => t.key !== "billing");

type TabKey = (typeof TABS)[number]["key"];

function isValidTab(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value);
}

// ── Inner component (needs Suspense boundary for useSearchParams) ────────────

function SettingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isValidTab(rawTab) ? rawTab : "general";

  const {
    state,
    updateField,
    togglePlatform,
    resetScoring,
    loadSettings,
    saveSettings,
    fetchAccounts,
  } = useSettings();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setTab = (tab: TabKey) => {
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  const handleSave = async () => {
    const ok = await saveSettings();
    if (ok) {
      toast({ type: "success", message: "Settings saved successfully" });
    } else {
      toast({ type: "error", message: "Failed to save settings" });
    }
  };

  return (
    <PageTransition>
      <div className="h-screen overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-16 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <Button size="sm" onClick={handleSave} disabled={state.saving}>
              <Save className="size-3.5" />
              {state.saving ? "Saving..." : "Save"}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {TABS.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Active tab content */}
          <div className="min-h-[400px]">
            {activeTab === "general" && (
              <GeneralTab state={state} updateField={updateField} />
            )}
            {activeTab === "brand" && <BrandTab />}
            {activeTab === "style" && (
              <StyleTab state={state} updateField={updateField} />
            )}
            {activeTab === "scoring" && (
              <ScoringTab
                state={state}
                updateField={updateField}
                resetScoring={resetScoring}
              />
            )}
            {activeTab === "autoscore" && <AutoScoreTab />}
            {activeTab === "autopilot" && <AutopilotTab />}
            {activeTab === "connectors" && (
              <ConnectorsTab
                state={state}
                togglePlatform={togglePlatform}
                fetchAccounts={() => {}}
              />
            )}
            {activeTab === "billing" && <BillingTab />}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}

// ── Page export (Suspense boundary required by Next.js for useSearchParams) ──

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
