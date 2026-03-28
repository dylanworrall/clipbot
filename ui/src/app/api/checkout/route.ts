import { NextRequest, NextResponse } from "next/server";

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID;

export async function POST(req: NextRequest) {
  if (!WHOP_API_KEY || !WHOP_COMPANY_ID) {
    return NextResponse.json({ error: "Whop not configured" }, { status: 500 });
  }

  const { plan, email } = await req.json() as { plan: "pro" | "business"; email?: string };

  const prices: Record<string, number> = { pro: 20, business: 100 };
  const price = prices[plan];
  if (!price) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  try {
    // Create a checkout configuration via Whop API
    const res = await fetch("https://api.whop.com/api/v5/checkout_configurations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        plan: {
          initial_price: price,
          plan_type: "renewal",
          renewal_price: price,
          renewal_period: 30,
        },
        metadata: { plan, email },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ error: `Whop ${res.status}: ${body}` }, { status: res.status });
    }

    const data = await res.json();
    const sessionId = data.id ?? data.session_id;
    const checkoutUrl = data.purchase_url ?? data.checkout_url;

    return NextResponse.json({ sessionId, checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
