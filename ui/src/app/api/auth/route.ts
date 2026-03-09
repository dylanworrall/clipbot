import { NextResponse } from "next/server";
import { loadEnv, saveEnvVar, removeEnvVar } from "@/lib/env";
import { getEffectiveConfig } from "@/lib/settings-store";

function maskKey(key: string): string {
  if (key.length <= 10) return "****";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

export async function GET() {
  loadEnv(true);

  const config = await getEffectiveConfig();

  // Check all possible sources: env vars, parent .env (via loadEnv), and settings/config
  const apiKey = process.env.ANTHROPIC_API_KEY || config.claudeApiKey;
  const oauthToken = process.env.CLAUDE_OAUTH_TOKEN;

  return NextResponse.json({
    connected: !!(apiKey || oauthToken),
    method: apiKey ? "api-key" : oauthToken ? "setup-token" : null,
    masked: apiKey ? maskKey(apiKey) : oauthToken ? maskKey(oauthToken) : null,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { method } = body as { method: string };

  if (method === "api-key") {
    const { apiKey } = body as { apiKey: string };

    if (!apiKey || !apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Invalid API key format. Must start with sk-ant-" },
        { status: 400 }
      );
    }

    // Test the key against Anthropic API
    try {
      const testRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (!testRes.ok) {
        const err = await testRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: `API key rejected: ${(err as { error?: { message?: string } }).error?.message || testRes.statusText}` },
          { status: 401 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to verify key: ${(e as Error).message}` },
        { status: 500 }
      );
    }

    // Valid — save and clear any oauth token
    saveEnvVar("ANTHROPIC_API_KEY", apiKey);
    removeEnvVar("CLAUDE_OAUTH_TOKEN");

    return NextResponse.json({ success: true, method: "api-key" });
  }

  if (method === "setup-token") {
    const { token } = body as { token: string };

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Test the token against Anthropic API
    try {
      const testRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "oauth-2025-04-20",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (!testRes.ok) {
        return NextResponse.json(
          {
            error:
              "Token rejected. Anthropic may restrict subscription tokens for non-Claude Code use. Try an API key instead.",
          },
          { status: 401 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to verify token: ${(e as Error).message}` },
        { status: 500 }
      );
    }

    // Valid — save and clear any api key
    saveEnvVar("CLAUDE_OAUTH_TOKEN", token);
    removeEnvVar("ANTHROPIC_API_KEY");

    return NextResponse.json({ success: true, method: "setup-token" });
  }

  return NextResponse.json({ error: "Unknown method" }, { status: 400 });
}
