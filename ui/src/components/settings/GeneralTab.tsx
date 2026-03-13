"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Key, Terminal, ExternalLink, Loader2, XCircle } from "lucide-react";
import type { SettingsState } from "@/hooks/useSettings";

const selectClass =
  "w-full rounded-lg bg-surface-2 border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200";

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
      {/* Connection status */}
      {connected ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-green-400">
            Connected via {connectedMethod === "api-key" ? "API Key" : "Setup Token"}{" "}
            <span className="text-muted">({maskedKey})</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-red-400">Not connected</span>
        </div>
      )}

      {/* Method tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMethod("api-key"); setError(""); }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
            method === "api-key"
              ? "border-accent bg-accent/5 text-foreground"
              : "border-border bg-surface-1 text-muted hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Key className="h-3.5 w-3.5" />
            API Key
          </div>
        </button>
        <button
          onClick={() => { setMethod("setup-token"); setError(""); }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
            method === "setup-token"
              ? "border-accent bg-accent/5 text-foreground"
              : "border-border bg-surface-1 text-muted hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Terminal className="h-3.5 w-3.5" />
            Setup Token
          </div>
        </button>
      </div>

      {/* API Key form */}
      {method === "api-key" && (
        <div className="space-y-3">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            Get API Key <ExternalLink className="h-3.5 w-3.5" />
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Save"}
          </Button>
        </div>
      )}

      {/* Setup Token form */}
      {method === "setup-token" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-400 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Uses your Claude Pro/Max subscription. May be restricted by Anthropic TOS.</span>
          </div>
          <p className="text-xs text-muted">
            Run <code className="bg-surface-2 px-1.5 py-0.5 rounded text-foreground">claude setup-token</code> in your terminal, then paste below:
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Save"}
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
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

export function GeneralTab({ state, updateField }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      {/* Claude Authentication — hidden in cloud mode (server provides the key) */}
      {!isCloudMode && (
        <Card className="space-y-5 px-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Claude Authentication
          </h2>
          <AuthSection />
        </Card>
      )}

      {/* Other API Keys */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Other API Keys
        </h2>
        <Input
          id="late-key"
          label="Late API Key"
          type="password"
          value={state.lateApiKey}
          onChange={(e) => updateField("lateApiKey", e.target.value)}
          placeholder="Enter Late API key"
        />
      </Card>

      {/* Model & Temperature */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Claude Configuration
        </h2>
        <div className="space-y-1.5">
          <label className="text-sm text-muted">Claude Model</label>
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
          <label className="text-sm text-muted">
            Analysis Temperature: {state.claudeTemperature.toFixed(1)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={state.claudeTemperature}
            onChange={(e) => updateField("claudeTemperature", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <p className="text-xs text-muted">
            {state.claudeTemperature === 0
              ? "Deterministic — same video always produces identical clips"
              : state.claudeTemperature <= 0.3
                ? "Mostly consistent — top clips stay the same, slight variation in wording"
                : state.claudeTemperature <= 0.6
                  ? "Balanced — core picks consistent, lower-scored clips may vary"
                  : "Creative — more variety between runs, scores may shift 1-2 points"}
          </p>
        </div>
      </Card>
    </div>
  );
}
