"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import type { SettingsState } from "@/hooks/useSettings";

interface ConnectorsTabProps {
  state: SettingsState;
  togglePlatform: (platform: string) => void;
  fetchAccounts: () => void;
}

export function ConnectorsTab({ state, togglePlatform, fetchAccounts }: ConnectorsTabProps) {
  return (
    <div className="space-y-6">
      {/* Default Publish Platforms */}
      <Card className="space-y-4 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Default Publish Platforms
        </h2>
        <p className="text-xs text-muted">
          Select which platforms clips are published to by default.
        </p>
        <div className="flex gap-4 flex-wrap">
          {["tiktok", "youtube", "instagram", "facebook"].map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-sm cursor-pointer capitalize"
            >
              <input
                type="checkbox"
                checked={state.defaultPlatforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="accent-[var(--color-accent)]"
              />
              {p}
            </label>
          ))}
        </div>
      </Card>

      {/* Connected Accounts */}
      <Card className="space-y-5 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Connected Accounts
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchAccounts}>
            {state.loadingAccounts ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Fetch
          </Button>
        </div>

        {state.accounts.length > 0 ? (
          <div className="space-y-2">
            {state.accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm py-2.5 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="green" className="capitalize">
                    {a.platform}
                  </Badge>
                  <span>{a.name}</span>
                </div>
                <span className="text-xs text-muted font-mono">
                  {a.id.slice(0, 8)}...
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Click &quot;Fetch&quot; to load connected accounts from Late API
          </p>
        )}
      </Card>
    </div>
  );
}
