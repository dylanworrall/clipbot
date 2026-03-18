import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";
const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const SCOPES = "org:create_api_key user:profile user:inference";

function getTokenStorePath() {
  const home = process.env.CLIPBOT_HOME || process.cwd();
  return path.join(home, "oauth-tokens.json");
}

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
}

function loadTokens(): OAuthTokens | null {
  const p = getTokenStorePath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function saveTokens(tokens: OAuthTokens) {
  writeFileSync(getTokenStorePath(), JSON.stringify(tokens, null, 2), "utf-8");
}

// In-memory PKCE verifier store (short-lived, one at a time)
let pendingVerifier: string | null = null;

function generatePKCE() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/**
 * GET /api/oauth — get current OAuth status or start auth flow
 * ?action=status — check if we have valid tokens
 * ?action=start — generate auth URL for PKCE flow
 * ?action=callback&code=xxx — exchange auth code for tokens
 * ?action=refresh — force refresh the access token
 */
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "status";

  if (action === "status") {
    const tokens = loadTokens();
    if (!tokens) return NextResponse.json({ connected: false });
    const expired = Date.now() >= tokens.expires_at;
    return NextResponse.json({
      connected: true,
      expired,
      expires_at: tokens.expires_at,
    });
  }

  if (action === "start") {
    const { verifier, challenge } = generatePKCE();
    pendingVerifier = verifier;

    const url = new URL("https://claude.ai/oauth/authorize");
    url.searchParams.set("code", "true");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", verifier);

    return NextResponse.json({ url: url.toString() });
  }

  if (action === "callback") {
    const code = req.nextUrl.searchParams.get("code");
    if (!code || !pendingVerifier) {
      return NextResponse.json({ error: "Missing code or no pending auth" }, { status: 400 });
    }

    const splits = code.split("#");
    const verifier = pendingVerifier;
    pendingVerifier = null;

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: splits[0],
        state: splits[1] || verifier,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Token exchange failed: ${err}` }, { status: 400 });
    }

    const json = await res.json();
    const tokens: OAuthTokens = {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + json.expires_in * 1000,
    };
    saveTokens(tokens);

    // Set in process.env so the chat route picks it up immediately
    process.env.CLAUDE_OAUTH_ACCESS_TOKEN = tokens.access_token;

    return NextResponse.json({ success: true, expires_in: json.expires_in });
  }

  if (action === "refresh") {
    const tokens = loadTokens();
    if (!tokens?.refresh_token) {
      return NextResponse.json({ error: "No refresh token" }, { status: 400 });
    }

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: CLIENT_ID,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Refresh failed: ${err}` }, { status: 400 });
    }

    const json = await res.json();
    const newTokens: OAuthTokens = {
      access_token: json.access_token,
      refresh_token: json.refresh_token || tokens.refresh_token,
      expires_at: Date.now() + json.expires_in * 1000,
    };
    saveTokens(newTokens);
    process.env.CLAUDE_OAUTH_ACCESS_TOKEN = newTokens.access_token;

    return NextResponse.json({ success: true, expires_in: json.expires_in });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
