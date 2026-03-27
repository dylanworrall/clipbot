# Content Client — Fix Auth Gate + Billing (Cloud & Local)

## Context
This is the Content client at `C:\Users\worra\OneDrive\Desktop\content\ui`. It's a Next.js 16 app with BetterAuth + Convex backend, deployed on Vercel at `https://content-client-theta.vercel.app`. Unlike the Comms client, this app uses API key / `claude setup-token` auth for local mode, and BetterAuth login for cloud mode.

**Local mode** (no `NEXT_PUBLIC_CONVEX_URL`): Free, user provides their own Anthropic API key in Settings > General or uses `claude setup-token`. No login needed.
**Cloud mode** (`NEXT_PUBLIC_CONVEX_URL` set): Requires BetterAuth login. Server-side API key is used. 50 free credits on signup, buy more via Whop.

## Issues to Fix

### ISSUE 1: Cloud version never shows login page
On the deployed version, users go straight to chat without any login prompt.

**Root causes:**
- `src/app/page.tsx` lines ~42-57: The auth gate checks `/api/auth` which returns `{ connected: true }` when `ANTHROPIC_API_KEY` is set as a Vercel env var. This bypasses the login requirement entirely. The gate shows "API Key Required" with a link to `/settings`, it never redirects to `/login`.
- There is no `middleware.ts` file (it was created and then deleted).
- The `ConvexProvider` wraps the app with `ConvexBetterAuthProvider` but this only provides auth context, it doesn't enforce authentication.
- The login page exists at `src/app/login/page.tsx` but nothing routes users there.

**Fixes needed:**
1. Create `src/middleware.ts`: In cloud mode (`NEXT_PUBLIC_CONVEX_URL` set), check for BetterAuth session cookie. If missing, redirect to `/login`. Allow `/login`, `/api/auth/*`, `/_next/*`, and static assets through. In local mode, pass through everything.
2. In `src/app/page.tsx`: Split the auth gate into two modes:
   - **Local mode** (`!process.env.NEXT_PUBLIC_CONVEX_URL`): Keep the current `/api/auth` check for API key. Show "API Key Required" prompt linking to `/settings` if not configured.
   - **Cloud mode**: Use `useSession()` from `@/lib/auth-client`. If no session, the middleware will handle the redirect (no need for a client-side gate). Remove the `/api/auth` check for cloud mode.
3. In the middleware: Redirect authenticated users away from `/login` (push to `/`).
4. In `src/app/login/page.tsx`: After successful login/signup, use `window.location.href` (not `router.push`) to force a full reload so the session cookie is sent. Read `callbackUrl` from search params. Also call `POST /api/credits` with the user's email after signup to provision 50 free credits.

### ISSUE 2: Credit billing not working on cloud
Even if users could log in, credits are never properly checked or deducted.

**Root causes:**
- `src/hooks/useAiChat.ts`: Passes `userEmail` from `useSession()` in the request body, but since users are never logged in (Issue 1), `userEmail` is always undefined.
- `src/app/api/chat/route.ts` line ~49: `if (isConvexMode() && userEmail)` silently skips credit check when `userEmail` is undefined. Anyone can use the server-side API key for free.
- The login page (`src/app/login/page.tsx`) does NOT call `POST /api/credits` after signup to provision 50 free credits. The user is created in BetterAuth but not in the Convex `users` table.
- `src/components/settings/BillingTab.tsx` says "Credit packs are coming soon" — Whop checkout embed is wired but needs plan IDs.
- Whop webhook route exists at `src/app/api/webhooks/whop/route.ts`.
- `src/lib/auth-client.ts` uses Convex plugin only (billing handled via Whop embed, not BetterAuth plugin).

**Fixes needed:**
1. In `src/app/api/chat/route.ts`: When `isConvexMode()` is true and `userEmail` is missing, return `401 Unauthorized` instead of silently proceeding with the server-side API key.
2. In `src/app/login/page.tsx`: After successful signup, call `POST /api/credits` with the user's email to provision 50 free credits.
3. In `src/app/page.tsx` or `src/hooks/useAiChat.ts`: Disable chat input until session is loaded in cloud mode, so `userEmail` is always available when sending messages.
4. Create `src/app/api/webhooks/polar/route.ts`: Handle Polar `checkout.completed` webhook events. Verify signature, extract email + credit amount, call `api.users.addCredits` in Convex.
5. In `src/components/settings/BillingTab.tsx`: Replace the "coming soon" text with actual Whop `<WhopCheckoutEmbed>` with plan IDs from env vars (`NEXT_PUBLIC_WHOP_PLAN_50`, `NEXT_PUBLIC_WHOP_PLAN_200`, `NEXT_PUBLIC_WHOP_PLAN_500`). Show credit balance. Show "Sign in" link if no session.

### ISSUE 3: Local mode must not break
All changes must be gated behind `isConvexMode()` or `!!process.env.NEXT_PUBLIC_CONVEX_URL`.

**Verify:**
- No middleware runs when `NEXT_PUBLIC_CONVEX_URL` is not set.
- Settings > General tab still works for API key / `claude setup-token` in local mode.
- `/api/chat` works without credits or auth in local mode (uses user's own API key).
- `/api/credits` returns `{ credits: Infinity }` in local mode.
- The chat page works without session/login in local mode.
- No BetterAuth or Convex errors when running locally without Convex env vars.
- The `/api/auth` route still handles GET (check key status) and POST (save key) in local mode.

### ISSUE 4: Hide API key settings in cloud mode
On cloud, the server provides the API key. Users should NOT see the "API Key" / "Setup Token" section in Settings > General.

**Fix:**
- In `src/components/settings/GeneralTab.tsx`: Check `isConvexMode()` (import from `@/lib/convex-server`) or check `process.env.NEXT_PUBLIC_CONVEX_URL`. If cloud mode, hide the AuthSection entirely. Users manage their account via login/billing, not API keys.
- Note: `isConvexMode()` reads `process.env` which is server-side only. For a client component, use `!!process.env.NEXT_PUBLIC_CONVEX_URL` directly (NEXT_PUBLIC_ vars are available client-side).

## Testing Plan

Run these tests to verify the fixes. If any test fails, fix the underlying issue before moving on.

### Test 1: Local mode works without auth
```bash
# Ensure NEXT_PUBLIC_CONVEX_URL is NOT set in .env.local, then:
cd ui && npm run dev
# 1. curl http://localhost:3099 — should return 200, full chat page HTML (no redirect)
# 2. curl http://localhost:3099/settings — should return 200
# 3. curl http://localhost:3099/api/credits — should return { credits: Infinity, mode: "local" }
# 4. curl http://localhost:3099/api/auth — should return { connected: true/false } based on API key
# 5. The Settings > General tab should show API Key and Setup Token sections
```

### Test 2: Cloud mode requires login
```bash
# With NEXT_PUBLIC_CONVEX_URL set in .env.local:
cd ui && npm run dev
# 1. Open incognito browser to http://localhost:3099 — should redirect to /login
# 2. The /login page should render sign-in/sign-up form
# 3. Sign up with a test email — should redirect to / after signup (not stay on /login)
# 4. After redirect, chat page should load with session active
# 5. Settings > General should NOT show the API key section
# 6. Settings > Billing should show credit balance (50) and purchase options
```

### Test 3: Credits work in cloud mode
```bash
# After signing up in Test 2:
# 1. curl http://localhost:3099/api/credits?email=<test-email> — should return { credits: 50 }
# 2. Send a chat message — credits should deduct to 49
# 3. curl credits again — should show 49
# 4. curl -X POST /api/chat without userEmail header — should return 401 in cloud mode
```

### Test 4: Build succeeds
```bash
cd ui && npx next build
# Must complete with 0 errors
```

## IMPORTANT: Human Intervention Required

You do NOT have access to Convex dashboard, Polar dashboard, or Vercel dashboard. The user has never opened Convex or Polar dashboards — all setup so far has been CLI-only. When you hit a step that requires human action, **STOP and clearly tell the user exactly what to do**. Format it as a numbered checklist they can follow. They will report back to this terminal when done.

### Things that WILL require human intervention:

**Convex environment variables** (set via `npx convex env set` OR the Convex dashboard):
- `SITE_URL` — the Vercel production URL (e.g., `https://content-client-theta.vercel.app`)
- `BETTER_AUTH_SECRET` — a random secret string for BetterAuth sessions
- Run `npx convex env list` first to see what's already set. Only ask the user to set what's missing.

**Vercel environment variables** (set via `vercel env add` CLI or Vercel dashboard):
- `NEXT_PUBLIC_CONVEX_URL` — the Convex cloud URL (should already be set, verify)
- `NEXT_PUBLIC_CONVEX_SITE_URL` — the Convex site URL
- `NEXT_PUBLIC_WHOP_PLAN_50` — Whop plan ID for 50-credit pack (plan_XXXXXXXXX)
- `NEXT_PUBLIC_WHOP_PLAN_200` — Whop plan ID for 200-credit pack (plan_XXXXXXXXX)
- `NEXT_PUBLIC_WHOP_PLAN_500` — Whop plan ID for 500-credit pack (plan_XXXXXXXXX)
- `WHOP_API_KEY` — Company API key from Whop developer dashboard
- `WHOP_WEBHOOK_SECRET` — from Whop webhook configuration
- `ANTHROPIC_API_KEY` — the server-side API key for cloud chat (should already be set, verify)

**Whop setup** (requires Whop dashboard at https://whop.com/dashboard):
- Create a company/product if not already done
- Create 3 plans: 50 credits ($5), 200 credits ($15), 500 credits ($30) — one-time purchases
- Copy the plan IDs (plan_XXXXXXXXX) for the Vercel env vars above
- Create a webhook endpoint pointing to `https://content-client-theta.vercel.app/api/webhooks/whop`
- Select event type `payment.succeeded`
- Copy the webhook secret for the Vercel env var above
- Generate a Company API key from Settings > Developer for the `WHOP_API_KEY` env var

**Convex production deployment:**
- The dev deployment (`groovy-magpie-304`) may differ from the prod deployment. Check which one Vercel is using.
- If env vars need to be set on prod: `npx convex env set <KEY> <VALUE> --prod`
- To push functions to prod: `npx convex deploy` (will prompt for confirmation)

When you need ANY of the above, stop coding and tell the user: "I need you to do X. Here's exactly how: [steps]. Report back when done."

## Key Files
- `src/app/page.tsx` — main chat page, auth gate, transport with userEmail
- `src/app/login/page.tsx` — login/signup page, redirect logic, credit provisioning
- `src/middleware.ts` — NEEDS TO BE CREATED for cloud auth enforcement
- `src/app/api/auth/route.ts` — API key check (local mode)
- `src/app/api/auth/[...all]/route.ts` — BetterAuth catch-all
- `src/app/api/chat/route.ts` — credit check/deduction
- `src/app/api/credits/route.ts` — credit provisioning
- `src/hooks/useAiChat.ts` — passes userEmail in chat requests
- `src/components/settings/GeneralTab.tsx` — API key config (hide in cloud mode)
- `src/components/settings/BillingTab.tsx` — Whop billing UI (WhopCheckoutEmbed)
- `src/lib/auth-client.ts` — BetterAuth + Convex client (no Polar)
- `src/lib/whop-sdk.ts` — Whop SDK instance (webhook verification)
- `src/app/api/webhooks/whop/route.ts` — Whop payment.succeeded webhook handler
- `src/lib/convex-server.ts` — isConvexMode()
- `src/components/providers/ConvexProvider.tsx` — conditional auth wrapper
- `convex/auth.ts` — BetterAuth server config
- `convex/users.ts` — credit mutations (getOrCreate, addCredits, deductCredits)
