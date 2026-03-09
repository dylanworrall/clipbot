"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, TrendingDown, ShoppingCart, RefreshCw, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function BillingTab() {
  const session = authClient.useSession();
  const email = session.data?.user?.email;

  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/credits?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setCredits(data.credits ?? 0);
    } catch {
      setCredits(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  if (!email) {
    return (
      <div className="space-y-6">
        <Card className="flex flex-col items-center justify-center py-16 px-6 space-y-4">
          <div className="rounded-full bg-surface-2 p-4">
            <Coins className="h-8 w-8 text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Sign in to view billing
          </h2>
          <p className="text-sm text-muted text-center max-w-md">
            Sign in to see your credit balance and purchase more credits.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Credit Balance
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent/10 p-3">
              <Coins className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="text-3xl font-semibold text-foreground tabular-nums">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-muted" />
                ) : credits !== null ? (
                  credits.toLocaleString()
                ) : (
                  "—"
                )}
              </div>
              <p className="text-sm text-muted">credits remaining</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCredits}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </Card>

      {/* Usage Info */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Usage
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-surface-2/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-4 w-4 text-muted" />
              <span className="text-sm text-foreground">Chat messages</span>
            </div>
            <span className="text-sm font-medium text-muted">1 credit each</span>
          </div>
        </div>
        <p className="text-xs text-muted">
          Each AI chat message deducts 1 credit. New accounts receive 50 free credits.
        </p>
      </Card>

      {/* Purchase Credits */}
      <Card className="space-y-5 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Purchase Credits
        </h2>
        <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
          <ShoppingCart className="h-4 w-4 text-accent shrink-0" />
          <p className="text-sm text-foreground">
            Credit packs via Polar are coming soon. For now, new accounts get 50 free credits.
          </p>
        </div>
      </Card>
    </div>
  );
}
