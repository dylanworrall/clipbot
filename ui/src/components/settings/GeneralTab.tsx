"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Key, Terminal, ExternalLink, Loader2, XCircle, User, Mail, LogOut } from "lucide-react";
import { authClient, useSession, signOut } from "@/lib/auth-client";
import type { SettingsState } from "@/hooks/useSettings";

const selectClass =
  "w-full bg-surface-2/40 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:outline-none focus:border-[#0A84FF]/50 transition-colors";

type AuthMethod = "api-key" | "setup-token";

function AuthSection() {
  const [method, setMethod] = useState<AuthMethod>("api-key");
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedMethod, setConnectedMethod] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  const checkAuth = useCallback(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setConnectedMethod(data.method);
        setMaskedKey(data.masked);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const body =
        method === "api-key"
          ? { method: "api-key", apiKey }
          : { method: "setup-token", token };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }
      setApiKey("");
      setToken("");
      checkAuth();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {connected ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#30D158]/10 border border-border px-4 py-3 text-[13px] font-medium">
          <CheckCircle2 size={14} className="text-[#30D158] shrink-0" />
          <span className="text-[#30D158]">
            Connected via {connectedMethod === "api-key" ? "API Key" : "Setup Token"}{" "}
            <span className="text-muted-foreground/80">({maskedKey})</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-[#FF453A]/10 border border-border px-4 py-3 text-[13px] font-medium">
          <XCircle size={14} className="text-[#FF453A] shrink-0" />
          <span className="text-[#FF453A]">Not connected</span>
        </div>
      )}

      {/* Method tabs — Soshi tab switcher */}
      <div className="bg-surface-2/40 p-1 rounded-lg flex gap-1">
        <button
          onClick={() => { setMethod("api-key"); setError(""); }}
          className={`flex-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center justify-center gap-2 ${
            method === "api-key"
              ? "bg-surface-1 text-white shadow-sm"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Key size={12} /> API Key
        </button>
        <button
          onClick={() => { setMethod("setup-token"); setError(""); }}
          className={`flex-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center justify-center gap-2 ${
            method === "setup-token"
              ? "bg-surface-1 text-white shadow-sm"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Terminal size={12} /> Setup Token
        </button>
      </div>

      {method === "api-key" && (
        <div className="space-y-3">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A84FF] hover:underline"
          >
            Get API Key <ExternalLink size={12} />
          </a>
          <Input
            id="settings-api-key"
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apiKey && handleSubmit()}
          />
          <Button
            onClick={handleSubmit}
            disabled={!apiKey.startsWith("sk-ant-") || loading}
            size="sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Verify & Save"}
          </Button>
        </div>
      )}

      {method === "setup-token" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#FF9F0A]/10 border border-border px-3 py-2 text-[11px] text-[#FF9F0A] font-medium flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>Uses your Claude Pro/Max subscription. May be restricted by Anthropic TOS.</span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 font-medium">
            Run <code className="bg-surface-2/40 px-1.5 py-0.5 rounded text-foreground/70">claude setup-token</code> in your terminal, then paste below:
          </p>
          <Input
            id="settings-setup-token"
            type="password"
            placeholder="Paste token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && token && handleSubmit()}
          />
          <Button
            onClick={handleSubmit}
            disabled={!token || loading}
            size="sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Verify & Save"}
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-[#FF453A]/10 border border-border px-3 py-2 text-[13px] font-medium text-[#FF453A]">
          {error}
        </div>
      )}
    </div>
  );
}

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;

interface GeneralTabProps {
  state: SettingsState;
  updateField: <K extends keyof SettingsState>(field: K, value: SettingsState[K]) => void;
}

function AccountSection() {
  const session = useSession();
  const user = session.data?.user;
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await authClient.updateUser({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleSignOut = () => {
    signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } });
  };

  if (!user) {
    return (
      <div className="text-center py-6">
        <User size={24} className="text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-[13px] text-muted-foreground font-medium">Not signed in</p>
        <a href="/login" className="text-[13px] text-[#0A84FF] font-medium hover:underline mt-1 inline-block">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Avatar + info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0A84FF] to-[#BF5AF2] flex items-center justify-center shrink-0">
          <span className="text-[20px] font-bold text-white">
            {(user.name || user.email || "?")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-foreground truncate">{user.name || "No name set"}</p>
          <p className="text-[12px] text-muted-foreground truncate flex items-center gap-1">
            <Mail size={10} />
            {user.email}
          </p>
        </div>
      </div>

      {/* Name edit */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-muted-foreground">Display Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
            className="flex-1 bg-surface-2/40 rounded-lg px-3 py-2.5 text-[14px] text-white border border-border focus:outline-none focus:border-[#0A84FF]/50 transition-colors placeholder:text-muted-foreground/50"
            placeholder="Your name"
          />
          <Button
            size="sm"
            onClick={handleUpdateName}
            disabled={saving || name === user.name}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : "Update"}
          </Button>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-muted-foreground">Email</label>
        <div className="bg-surface-2/40 rounded-lg px-3 py-2.5 text-[14px] text-muted-foreground border border-border">
          {user.email}
        </div>
        <p className="text-[10px] text-muted-foreground/60">Email cannot be changed</p>
      </div>

      {/* Sign out */}
      <div className="pt-2 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[13px] font-medium text-[#FF453A] hover:text-[#FF453A]/80 transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function GeneralTab({ state, updateField }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      {/* Account */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Account
        </h2>
        <AccountSection />
      </div>

      {!isCloudMode && (
        <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
          <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Claude Authentication
          </h2>
          <AuthSection />
        </div>
      )}

      {!isCloudMode && (
        <>
          <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
            <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Other API Keys
            </h2>
            <Input
              id="late-key"
              label="Zernio API Key"
              type="password"
              value={state.lateApiKey}
              onChange={(e) => updateField("lateApiKey", e.target.value)}
              placeholder="Enter Zernio API key"
            />
          </div>

          <div className="bg-surface-1 rounded-2xl p-5 border border-border shadow-sm space-y-5">
            <h2 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Claude Configuration
            </h2>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Claude Model</label>
              <select
                value={state.claudeModel}
                onChange={(e) => updateField("claudeModel", e.target.value)}
                className={selectClass}
              >
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="claude-opus-4-20250514">Claude Opus 4</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">
                Analysis Temperature:{" "}
                <span className="text-foreground">{state.claudeTemperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={state.claudeTemperature}
                onChange={(e) => updateField("claudeTemperature", Number(e.target.value))}
                className="w-full accent-[#0A84FF]"
              />
              <p className="text-[10px] text-muted-foreground/60">
                {state.claudeTemperature === 0
                  ? "Deterministic — same video always produces identical clips"
                  : state.claudeTemperature <= 0.3
                    ? "Mostly consistent — top clips stay the same, slight variation in wording"
                    : state.claudeTemperature <= 0.6
                      ? "Balanced — core picks consistent, lower-scored clips may vary"
                      : "Creative — more variety between runs, scores may shift 1-2 points"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
