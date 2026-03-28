"use client";

import { useState } from "react";
import { Crown, X, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

let WhopCheckoutEmbed: React.ComponentType<Record<string, unknown>> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WhopCheckoutEmbed = require("@whop/checkout/react").WhopCheckoutEmbed;
} catch { /* not installed */ }

interface PaywallModalProps {
  onClose: () => void;
  onSubscribed?: () => void;
}

export function PaywallModal({ onClose, onSubscribed }: PaywallModalProps) {
  const session = authClient.useSession();
  const email = session.data?.user?.email;
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  const proPlanId = process.env.NEXT_PUBLIC_WHOP_PLAN_PRO;
  const businessPlanId = process.env.NEXT_PUBLIC_WHOP_PLAN_BUSINESS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-border rounded-2xl shadow-elevation-3 w-full max-w-md mx-4 overflow-hidden">
        {checkoutPlanId && WhopCheckoutEmbed ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Subscribe</h3>
              <button onClick={() => setCheckoutPlanId(null)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-1">
              <WhopCheckoutEmbed
                planId={checkoutPlanId}
                theme="dark"
                prefill={email ? { email } : undefined}
                onComplete={() => { setCheckoutPlanId(null); onSubscribed?.(); onClose(); }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-accent" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">Free limit reached</h2>
              <p className="text-[13px] text-muted-foreground">
                You&apos;ve used your 3 free actions. Upgrade to keep creating.
              </p>
            </div>

            <div className="px-6 pb-6 space-y-3">
              {/* Pro */}
              <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown size={16} className="text-accent" />
                    <span className="text-sm font-semibold text-foreground">Pro</span>
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">Popular</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">$20<span className="text-muted-foreground font-normal">/mo</span></span>
                </div>
                <div className="space-y-1.5 mb-3">
                  {["1,000 actions/month", "All AI tools + autopilot", "Unlimited publishing", "Priority processing"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[12px]">
                      <Check size={12} className="text-accent shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                {proPlanId ? (
                  <Button className="w-full" onClick={() => setCheckoutPlanId(proPlanId)}>
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => window.open("https://whop.com", "_blank")}>
                    Upgrade to Pro
                  </Button>
                )}
              </div>

              {/* Business */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Business</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">$100<span className="text-muted-foreground font-normal">/mo</span></span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">5,000 actions/month, bulk operations</p>
                {businessPlanId ? (
                  <Button variant="outline" className="w-full" size="sm" onClick={() => setCheckoutPlanId(businessPlanId)}>
                    Upgrade to Business
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" size="sm" onClick={() => window.open("https://whop.com", "_blank")}>
                    Upgrade to Business
                  </Button>
                )}
              </div>
            </div>

            <div className="px-6 pb-4">
              <button onClick={onClose} className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
