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
          <h1 className="text-2xl font-bold text-white/90 mb-1">Settings</h1>

          {/* Tab bar — Soshi tab switcher */}
          <div className="bg-[#2A2A2C] p-1 rounded-lg flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-[#3A3A3C] text-white shadow-sm"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
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
                fetchAccounts={fetchAccounts}
              />
            )}
            {activeTab === "billing" && <BillingTab />}
          </div>

          {/* Persistent save bar */}
          <div className="flex items-center gap-4 pt-4 border-t border-white/5">
            <Button variant="primary" onClick={handleSave} disabled={state.saving}>
              {state.saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {state.saving ? "Saving..." : "Save Settings"}
            </Button>
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
