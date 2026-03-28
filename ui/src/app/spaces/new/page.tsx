"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SpacePanel } from "@/components/spaces/SpacePanel";
import { PromptInput } from "@/components/chat/PromptInput";
import { useSpace } from "@/contexts/SpaceContext";
import { Clock, FileText, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { SpaceSettings } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

interface ZernioProfile {
  _id: string;
  name: string;
  color?: string;
}

export default function NewSpacePage() {
  const router = useRouter();
  const { setActiveSpace } = useSpace();

  const [name, setName] = useState("New Space");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SpaceSettings>({});
  const [globalSettings, setGlobalSettings] = useState<AppSettings>({});
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<ZernioProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setGlobalSettings(data))
      .catch(() => {});
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profiles ?? [];
        setProfiles(p);
        if (p.length > 0) setSelectedProfile(p[0]._id);
      })
      .catch(() => {});
  }, []);

  const createSpace = useCallback(async () => {
    if (saving) return null;
    setSaving(true);
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          icon,
          niche: settings.niche || undefined,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setSpaceId(data.id);
      setActiveSpace(data.id);
      return data.id as string;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [name, description, icon, settings, saving, setActiveSpace]);

  const handleSubmit = useCallback(
    async (runId: string) => {
      let id = spaceId;
      if (!id) {
        id = await createSpace();
      }
      if (id) {
        router.push(`/spaces/${id}`);
      }
    },
    [spaceId, createSpace, router]
  );

  const handleUpdateSettings = (patch: Partial<SpaceSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete (merged as Record<string, unknown>)[key];
        } else if (key === "captionStyle" && typeof value === "object" && value !== null) {
          merged.captionStyle = value as SpaceSettings["captionStyle"];
        } else if (key === "scoringWeights" && typeof value === "object" && value !== null) {
          merged.scoringWeights = value as SpaceSettings["scoringWeights"];
        } else {
          (merged as Record<string, unknown>)[key] = value;
        }
      }
      return merged;
    });
  };

  const handleNameBlur = useCallback(async () => {
    if (spaceId || name === "New Space") return;
  }, [spaceId, name]);

  return (
    <div className="h-screen overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-xs text-muted mb-8">
            <Link href="/runs" className="hover:underline">Spaces</Link>
            <span className="mx-2">&gt;</span>
            <span className="text-foreground">New Space</span>
          </div>
        </motion.div>

        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Icon */}
              <div className="mb-4">
                <button
                  onClick={() => {
                    const newIcon = prompt("Enter an emoji:", icon);
                    if (newIcon) setIcon(newIcon);
                  }}
                  className="w-14 h-14 rounded-xl bg-surface-1 border border-border flex items-center justify-center text-2xl hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  {icon === "📁" ? <FileText className="h-7 w-7 text-muted" /> : icon}
                </button>
              </div>

              {/* Editable name */}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="New Space"
                className="w-full text-4xl font-bold bg-transparent outline-none placeholder:text-muted/40 text-foreground mb-2 leading-tight"
              />

              {/* Editable description */}
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description of what this Space is for and how to use it"
                className="w-full text-base bg-transparent outline-none placeholder:text-white/30 text-white/50"
              />

              {/* Profile selector */}
              {profiles.length > 0 && (
                <div className="mt-6">
                  <label className="text-[12px] font-medium text-white/40 block mb-2">
                    <FolderPlus size={12} className="inline mr-1" />
                    Connect to Zernio Profile
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {profiles.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => setSelectedProfile(p._id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                          selectedProfile === p._id
                            ? "bg-[#0A84FF]/10 text-[#0A84FF] border border-[#0A84FF]/30"
                            : "bg-[#2A2A2C] text-white/50 border border-white/5 hover:text-white hover:border-white/10"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || "#0A84FF" }} />
                        {p.name}
                      </button>
                    ))}
                    <a
                      href="/settings?tab=connectors"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium text-white/30 border border-dashed border-white/10 hover:text-white/50 hover:border-white/20 transition-colors"
                    >
                      <Plus size={12} /> New Profile
                    </a>
                  </div>
                </div>
              )}
            </motion.div>

            {/* PromptInput */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-10"
            >
              <PromptInput
                onSubmit={handleSubmit}
                spaceId={spaceId ?? undefined}
                fullWidth
              />
            </motion.div>

            {/* My threads tab — empty state */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-10"
            >
              <div className="border-b border-border mb-4">
                <span className="text-sm font-medium text-foreground border-b-2 border-foreground pb-2.5 inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  My threads
                </span>
              </div>

              <div className="text-center py-16">
                <p className="text-sm text-muted">
                  Your threads will appear here. Paste a URL above to get started.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right panel */}
          <div className="w-48 flex-shrink-0 pt-2">
            <div className="sticky top-8">
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <SpacePanel
                  spaceId=""
                  settings={settings}
                  globalSettings={globalSettings}
                  accounts={[]}
                  creators={[]}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateAccounts={() => {}}
                  onUpdateCreators={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
