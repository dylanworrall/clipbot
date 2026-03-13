"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Crown,
  Rocket,
  RefreshCw,
  Loader2,
  LogIn,
  X,
  Check,
} from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

import { authClient } from "@/lib/auth-client";

const PLANS = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    messages: "50",
    icon: Zap,
    features: ["50 messages/month", "Basic AI chat", "1 space"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$20",
    period: "/mo",
    messages: "1,000",
    planId: process.env.NEXT_PUBLIC_WHOP_PLAN_PRO,
    icon: Crown,
    popular: true,
    features: [
      "1,000 messages/month",
      "All AI tools",
      "Unlimited spaces",
      "Priority processing",
    ],
  },
  {
    tier: "business",
    name: "Business",
    price: "$100",
    period: "/mo",
    messages: "5,000",
    planId: process.env.NEXT_PUBLIC_WHOP_PLAN_BUSINESS,
    icon: Rocket,
    features: [
      "5,000 messages/month",
      "All AI tools",
      "Unlimited spaces",
      "Priority processing",
      "Bulk operations",
    ],
  },
];

interface SubInfo {
  tier: string;
  messageCount: number;
  limit: number;
}

export function BillingTab() {
  const session = authClient.useSession();
  const email = session.data?.user?.email;

  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  const fetchSub = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/credits?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      setSub({
        tier: data.tier ?? "free",
        messageCount: data.messageCount ?? 0,
        limit: data.limit ?? 50,
      });
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  if (!email) {
    return (
      <div className="space-y-6">
        <Card className="flex flex-col items-center justify-center py-16 px-6 space-y-4">
          <div className="rounded-full bg-surface-2 p-4">
            <Zap className="h-8 w-8 text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Sign in to view billing
          </h2>
          <p className="text-sm text-muted text-center max-w-md">
            Sign in to see your plan and usage.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/10 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </a>
        </Card>
      </div>
    );
  }

  const currentTier = sub?.tier ?? "free";
  const usagePercent = sub
    ? Math.min((sub.messageCount / sub.limit) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Whop Checkout Modal */}
      {checkoutPlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Subscribe
              </h3>
              <button
                onClick={() => setCheckoutPlanId(null)}
                className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-1">
              <WhopCheckoutEmbed
                planId={checkoutPlanId}
                theme="dark"
                prefill={{ email }}
                onComplete={() => {
                  setCheckoutPlanId(null);
                  fetchSub();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Usage */}
      <Card className="space-y-4 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Usage This Period
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSub}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted mx-auto" />
        ) : sub ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-foreground tabular-nums">
                {sub.messageCount.toLocaleString()}
              </span>
              <span className="text-sm text-muted">
                / {sub.limit.toLocaleString()} messages
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent > 90
                    ? "bg-red-500"
                    : usagePercent > 70
                      ? "bg-amber-500"
                      : "bg-accent"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              {(sub.limit - sub.messageCount).toLocaleString()} messages
              remaining this period
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">&mdash;</p>
        )}
      </Card>

      {/* Plans */}
      <Card className="space-y-4 px-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Plans
        </h2>
        <div className="grid gap-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentTier === plan.tier;
            const isUpgrade =
              plan.tier !== "free" &&
              (currentTier === "free" ||
                (currentTier === "pro" && plan.tier === "business"));

            return (
              <div
                key={plan.tier}
                className={`rounded-lg border px-4 py-4 ${
                  plan.popular
                    ? "border-accent/40 bg-accent/5"
                    : isCurrent
                      ? "border-accent/30 bg-accent/5"
                      : "border-border bg-surface-2/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        isCurrent ? "bg-accent/15" : "bg-surface-2"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${isCurrent ? "text-accent" : "text-muted"}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {plan.name}
                        </span>
                        {plan.popular && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                            Popular
                          </span>
                        )}
                        {isCurrent && (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="text-foreground font-medium">
                          {plan.price}
                        </span>
                        {plan.period}
                        {" · "}
                        {plan.messages} messages/mo
                      </p>
                    </div>
                  </div>
                  {isUpgrade && plan.planId && (
                    <Button
                      size="sm"
                      onClick={() => setCheckoutPlanId(plan.planId!)}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
                <div className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 text-accent shrink-0" />
                      <span className="text-muted">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
