import { Whop } from "@whop/sdk";

let _whopsdk: Whop | null = null;

export function getWhopSdk(): Whop {
  if (!_whopsdk) {
    _whopsdk = new Whop({
      apiKey: process.env.WHOP_API_KEY,
      webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
    });
  }
  return _whopsdk;
}
