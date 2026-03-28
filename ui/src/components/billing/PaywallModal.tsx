"use client";

import { useState } from "react";
import { Crown, X, Zap, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import dynamic from "next/dynamic";

const WhopCheckoutEmbed = dynamic(
  () => import("@whop/checkout/react").then((m) => m.WhopCheckoutEmbed),
  { ssr: false, loading: () => <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div> }
);

interface PaywallModalProps {
  onClose: () => void;
  onSubscribed?: () => void;
}

export function PaywallModal({ onClose, onSubscribed }: PaywallModalProps) {
  const session = authClient.useSession();
  const email = session.data?.user?.email;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const startCheckout = async (plan: "pro" | "business") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
      } else if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
      } else {
        window.open("https://whop.com/socials/", "_blank");
      }
    } catch {
      window.open("https://whop.com/socials/", "_blank");
    }
    setLoading(null);
  };

  if (sessionId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface-1 border border-border rounded-2xl shadow-elevation-3 w-full max-w-md mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Complete Payment</h3>
            <button onClick={() => setSessionId(null)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><X size={16} /></button>
          </div>
          <div className="p-2 min-h-[400px]">
            <WhopCheckoutEmbed
              sessionId={sessionId}
              returnUrl={typeof window !== "undefined" ? `${window.location.origin}/settings?tab=billing&status=success` : "/settings?tab=billing"}
              onComplete={() => { setSessionId(null); onSubscribed?.(); onClose(); }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (checkoutUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface-1 border border-border rounded-2xl shadow-elevation-3 w-full max-w-md mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Complete Payment</h3>
            <button onClick={() => setCheckoutUrl(null)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><X size={16} /></button>
          </div>
          <iframe src={checkoutUrl} className="w-full h-[500px] border-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-border rounded-2xl shadow-elevation-3 w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Zap size={24} className="text-accent" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Free limit reached</h2>
          <p className="text-[13px] text-muted-foreground">You&apos;ve used your 3 free actions. Upgrade to keep creating.</p>
        </div>
        <div className="px-6 pb-6 space-y-3">
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
                <div key={f} className="flex items-center gap-2 text-[12px]"><Check size={12} className="text-accent shrink-0" /><span className="text-muted-foreground">{f}</span></div>
              ))}
            </div>
            <Button className="w-full" onClick={() => startCheckout("pro")} disabled={!!loading}>
              {loading === "pro" ? <Loader2 size={14} className="animate-spin" /> : null} Upgrade to Pro
            </Button>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Business</span>
              <span className="text-sm font-bold text-foreground">$100<span className="text-muted-foreground font-normal">/mo</span></span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">5,000 actions/month, bulk operations</p>
            <Button variant="outline" className="w-full" size="sm" onClick={() => startCheckout("business")} disabled={!!loading}>
              {loading === "business" ? <Loader2 size={14} className="animate-spin" /> : null} Upgrade to Business
            </Button>
          </div>
        </div>
        <div className="px-6 pb-4">
          <button onClick={onClose} className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
