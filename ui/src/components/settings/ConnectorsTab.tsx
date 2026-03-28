"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, ExternalLink, Plus, Trash2, FolderPlus, ChevronDown } from "lucide-react";
import type { SettingsState } from "@/hooks/useSettings";

const SOCIAL_PLATFORMS = [
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "▶️" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "pinterest", name: "Pinterest", icon: "📌" },
  { id: "reddit", name: "Reddit", icon: "🤖" },
  { id: "bluesky", name: "Bluesky", icon: "🦋" },
  { id: "threads", name: "Threads", icon: "🧵" },
  { id: "googlebusiness", name: "Google Business", icon: "🏢" },
  { id: "telegram", name: "Telegram", icon: "✈️" },
  { id: "snapchat", name: "Snapchat", icon: "👻" },
  { id: "whatsapp", name: "WhatsApp", icon: "💬" },
];

interface ZernioProfile {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
}

const PROFILE_COLORS = ["#0A84FF", "#BF5AF2", "#30D158", "#FF453A", "#FF9F0A", "#FF375F"];

interface ConnectorsTabProps {
  state: SettingsState;
  togglePlatform: (platform: string) => void;
  fetchAccounts: () => void;
}

export function ConnectorsTab({ state }: ConnectorsTabProps) {
  const [profiles, setProfiles] = useState<ZernioProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; platform: string; name: string; profileId?: string }>>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      const p = data.profiles ?? [];
      setProfiles(p);
      if (!selectedProfileId && p.length > 0) setSelectedProfileId(p[0]._id);
    } catch { setProfiles([]); }
    setLoadingProfiles(false);
  }, [selectedProfileId]);

  const fetchAccountsForProfile = useCallback(async (profileId: string | null) => {
    setLoadingAccounts(true);
    try {
      const qs = profileId ? `?profileId=${profileId}` : "";
      const res = await fetch(`/api/accounts${qs}`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch { setAccounts([]); }
    setLoadingAccounts(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { if (selectedProfileId) fetchAccountsForProfile(selectedProfileId); }, [selectedProfileId, fetchAccountsForProfile]);

  const selectedProfile = profiles.find((p) => p._id === selectedProfileId);

  const accountsByPlatform = useMemo(() => {
    const map: Record<string, typeof accounts> = {};
    for (const a of accounts) {
      if (!map[a.platform]) map[a.platform] = [];
      map[a.platform].push(a);
    }
    return map;
  }, [accounts]);

  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    setConnectError(null);
    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, profileId: selectedProfileId }),
      });
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        setConnectError(data.error || "Failed to get connect URL");
        setConnecting(null);
        return;
      }
      window.open(data.authUrl, "_blank");
      setConnecting(null);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Connection failed");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
      fetchAccountsForProfile(selectedProfileId);
    } catch { /* silent */ }
  };

  const handleCreateProfile = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription, color: newColor }),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.profile?._id ?? data._id;
        setNewName(""); setNewDescription(""); setShowCreateForm(false);
        await loadProfiles();
        if (newId) setSelectedProfileId(newId);
      }
    } catch { /* silent */ }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Selector */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Profile
          </h2>
          <Button variant="outline" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={14} /> New
          </Button>
        </div>

        {/* Profile dropdown */}
        {loadingProfiles ? (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center py-3">
            No profiles yet. Create one to organize your accounts.
          </p>
        ) : (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2/40 border border-border text-left cursor-pointer hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: selectedProfile?.color || "#0A84FF" }} />
                <div>
                  <p className="text-[14px] font-medium text-foreground">{selectedProfile?.name ?? "Select profile"}</p>
                  {selectedProfile?.description && (
                    <p className="text-[11px] text-muted-foreground truncate">{selectedProfile.description}</p>
                  )}
                </div>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {profileDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface-1 border border-border rounded-xl shadow-elevation-2 overflow-hidden py-1">
                {profiles.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => { setSelectedProfileId(p._id); setProfileDropdownOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                      p._id === selectedProfileId ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2/50 hover:text-foreground"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color || "#0A84FF" }} />
                    <span className="text-[13px] font-medium">{p.name}</span>
                    {p.isDefault && <Badge variant="blue" className="text-[9px] ml-auto">Default</Badge>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-surface-2/40 rounded-xl p-4 border border-border space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
              placeholder="Profile name"
              className="w-full bg-surface-0 rounded-xl px-3 py-2.5 text-[14px] text-white border border-border focus:outline-none focus:border-accent/50 transition-colors placeholder:text-muted-foreground"
            />
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-surface-0 rounded-xl px-3 py-2.5 text-[14px] text-white border border-border focus:outline-none focus:border-accent/50 transition-colors placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${newColor === c ? "ring-2 ring-foreground/40 scale-110" : "hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateProfile} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreateForm(false); setNewName(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Connected Accounts for selected profile */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Connected Accounts
          </h2>
          <Button variant="ghost" size="sm" onClick={() => fetchAccountsForProfile(selectedProfileId)}>
            {loadingAccounts ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </Button>
        </div>

        {connectError && (
          <div className="rounded-xl bg-destructive/10 border border-border px-4 py-3 text-[12px] font-medium text-destructive">
            {connectError}
          </div>
        )}

        <div className="space-y-1">
          {SOCIAL_PLATFORMS.map((p) => {
            const connectedAccounts = accountsByPlatform[p.id] ?? [];
            const isConnecting = connecting === p.id;
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-2/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-base">{p.icon}</span>
                    <span className="text-[13px] font-medium text-foreground">{p.name}</span>
                    {connectedAccounts.length > 0 && (
                      <Badge variant="blue" className="text-[9px]">{connectedAccounts.length}</Badge>
                    )}
                  </div>
                  <Button
                    variant={connectedAccounts.length > 0 ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => handleConnect(p.id)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {isConnecting ? "..." : connectedAccounts.length > 0 ? "Add" : "Connect"}
                  </Button>
                </div>
                {connectedAccounts.length > 0 && (
                  <div className="ml-10 space-y-1 mb-2">
                    {connectedAccounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-2/40 px-3 py-2 border border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-success" />
                          <span className="text-[12px] font-medium text-foreground/70">{a.name}</span>
                        </div>
                        <button onClick={() => handleDisconnect(a.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 cursor-pointer">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
