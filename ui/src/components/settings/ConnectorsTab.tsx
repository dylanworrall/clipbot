"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Upload, CheckCircle, AlertCircle, Cookie, ExternalLink, Plus, Trash2, FolderPlus, Palette } from "lucide-react";
import type { SettingsState } from "@/hooks/useSettings";

interface ZernioProfile {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  createdAt?: string;
}

const PROFILE_COLORS = ["#0A84FF", "#BF5AF2", "#30D158", "#FF453A", "#FF9F0A", "#FF375F"];


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

interface CookieStatus {
  exists: boolean;
  hasAuth?: boolean;
  size?: number;
  modified?: string;
}

function YouTubeCookies() {
  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/cookies")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ exists: false }));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const text = await file.text();
      if (!text.includes("youtube.com") && !text.includes(".google.com")) {
        setMessage({ type: "error", text: "This doesn't look like YouTube cookies. Export from youtube.com while logged in." });
        setUploading(false);
        return;
      }
      const res = await fetch("/api/cookies", { method: "PUT", body: text });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Cookies uploaded! YouTube downloads should work now." });
        const st = await fetch("/api/cookies").then((r) => r.json());
        setStatus(st);
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to upload cookies" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FF9F0A]/10">
          <Cookie size={14} className="text-[#FF9F0A]" />
        </div>
        <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
          YouTube Cookies
        </h2>
      </div>
      <p className="text-[12px] text-white/35 font-medium">
        YouTube blocks downloads from datacenter IPs. Upload cookies from a logged-in browser session to authenticate.
      </p>

      {status && (
        <div className="flex items-center gap-2 text-[13px] font-medium">
          {status.exists && status.hasAuth ? (
            <>
              <CheckCircle size={14} className="text-[#30D158]" />
              <span className="text-[#30D158]">Auth cookies present</span>
              {status.modified && (
                <span className="text-[11px] text-white/30 ml-auto">
                  Updated {new Date(status.modified).toLocaleDateString()}
                </span>
              )}
            </>
          ) : status.exists ? (
            <>
              <AlertCircle size={14} className="text-[#FF9F0A]" />
              <span className="text-[#FF9F0A]">Cookies exist but missing auth tokens</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} className="text-[#FF453A]" />
              <span className="text-[#FF453A]">No cookies uploaded</span>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading..." : "Upload cookies.txt"}
        </Button>
      </div>

      {message && (
        <p className={`text-[12px] font-medium ${message.type === "success" ? "text-[#30D158]" : "text-[#FF453A]"}`}>
          {message.text}
        </p>
      )}

      <details className="text-[12px] text-white/35 font-medium">
        <summary className="cursor-pointer hover:text-white transition-colors">How to export cookies</summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Install &quot;Get cookies.txt LOCALLY&quot; browser extension</li>
          <li>Go to youtube.com and sign in</li>
          <li>Click the extension icon and export cookies for youtube.com</li>
          <li>Upload the exported cookies.txt file here</li>
        </ol>
      </details>
    </div>
  );
}

interface ConnectorsTabProps {
  state: SettingsState;
  togglePlatform: (platform: string) => void;
  fetchAccounts: () => void;
}

function ProfilesSection() {
  const [profiles, setProfiles] = useState<ZernioProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROFILE_COLORS[0]);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      setProfiles(data.profiles ?? []);
    } catch { setProfiles([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, color }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        setShowForm(false);
        await loadProfiles();
      }
    } catch { /* silent */ }
    setCreating(false);
  };

  return (
    <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#BF5AF2]/10">
            <FolderPlus size={14} className="text-[#BF5AF2]" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
              Profiles
            </h2>
            <p className="text-[10px] text-white/25 mt-0.5">
              Group accounts by brand or project
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> New Profile
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/5 space-y-3">
          <div>
            <label className="text-[12px] font-medium text-white/40 block mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. My Brand, Client X"
              className="w-full bg-[#2A2A2C] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-white/40 block mb-1.5">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this profile is for"
              className="w-full bg-[#2A2A2C] rounded-lg px-3 py-2.5 text-[14px] text-white border border-white/5 focus:outline-none focus:border-[#0A84FF]/50 transition-colors placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-white/40 block mb-1.5">Color</label>
            <div className="flex gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-white/40 scale-110" : "hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setName(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Profiles list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-white/30" />
        </div>
      ) : profiles.length === 0 ? (
        <p className="text-[12px] text-white/30 text-center py-3">
          No profiles yet. Create one to organize your social accounts.
        </p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p._id}
              className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-[#3A3A3C] transition-colors border border-transparent hover:border-white/5"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: p.color || "#0A84FF" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-white/90">{p.name}</span>
                  {p.isDefault && <Badge variant="blue" className="text-[9px]">Default</Badge>}
                </div>
                {p.description && (
                  <p className="text-[11px] text-white/30 truncate">{p.description}</p>
                )}
              </div>
              <span className="text-[10px] text-white/20 font-mono">{p._id.slice(-6)}</span>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={loadProfiles} className="w-full">
        <RefreshCw size={14} /> Refresh Profiles
      </Button>
    </div>
  );
}

export function ConnectorsTab({ state, togglePlatform, fetchAccounts }: ConnectorsTabProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Group accounts by platform
  const accountsByPlatform = useMemo(() => {
    const map: Record<string, typeof state.accounts> = {};
    for (const a of state.accounts) {
      if (!map[a.platform]) map[a.platform] = [];
      map[a.platform].push(a);
    }
    return map;
  }, [state.accounts]);

  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    setConnectError(null);
    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
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
      fetchAccounts();
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6">
      {/* Profiles */}
      <ProfilesSection />

      <YouTubeCookies />

      {/* Default Publish Platforms */}
      <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-4">
        <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
          Default Publish Platforms
        </h2>
        <p className="text-[12px] text-white/35 font-medium">
          Select which platforms clips are published to by default.
        </p>
        <div className="flex gap-4 flex-wrap">
          {SOCIAL_PLATFORMS.map(({ id: p }) => (
            <label
              key={p}
              className="flex items-center gap-2 text-[13px] font-medium text-white/70 cursor-pointer capitalize"
            >
              <input
                type="checkbox"
                checked={state.defaultPlatforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="accent-[#0A84FF]"
              />
              {p}
            </label>
          ))}
        </div>
      </div>

      {/* Connect Social Accounts */}
      <div className="bg-[#2A2A2C] rounded-2xl p-5 border border-white/5 shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-white/40 tracking-wider uppercase">
          Connect Social Accounts
        </h2>
        <p className="text-[12px] text-white/35 font-medium">
          Connect your social media accounts to publish clips directly. Multiple accounts per platform supported.
        </p>

        {connectError && (
          <div className="rounded-xl bg-[#FF453A]/10 border border-white/5 px-4 py-3 text-[12px] font-medium text-[#FF453A]">
            {connectError}
          </div>
        )}

        <div className="grid gap-2">
          {SOCIAL_PLATFORMS.map((p) => {
            const connectedAccounts = accountsByPlatform[p.id] ?? [];
            const isConnecting = connecting === p.id;
            return (
              <div key={p.id} className="rounded-xl border border-transparent hover:border-white/5 hover:bg-[#3A3A3C] transition-colors">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{p.icon}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-white/90">{p.name}</span>
                      {connectedAccounts.length > 0 && (
                        <Badge variant="blue">{connectedAccounts.length}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleConnect(p.id)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : connectedAccounts.length > 0 ? (
                      <Plus size={14} />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    {isConnecting ? "Connecting..." : connectedAccounts.length > 0 ? "Add Account" : "Connect"}
                  </Button>
                </div>

                {/* Connected accounts list */}
                {connectedAccounts.length > 0 && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {connectedAccounts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-[#1C1C1E] px-3 py-2 border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#30D158]" />
                          <span className="text-[13px] font-medium text-white/70">{a.name}</span>
                          <span className="text-[10px] text-white/25 font-mono">{a.id.slice(-6)}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnect(a.id)}
                          className="text-white/20 hover:text-[#FF453A] transition-colors p-1"
                          title="Disconnect"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAccounts}
          className="w-full"
        >
          {state.loadingAccounts ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh Connected Accounts
        </Button>
      </div>
    </div>
  );
}
