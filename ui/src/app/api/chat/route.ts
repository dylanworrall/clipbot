import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { NextRequest } from "next/server";
import { allTools } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getEffectiveConfig } from "@/lib/settings-store";
import { getSpace } from "@/lib/space-store";
import { getChatMessages, saveChatMessage } from "@/lib/chat-store";
import { loadEnv } from "@/lib/env";
import { getConvexClient, isConvexMode } from "@/lib/convex-server";
import { api } from "@/lib/convex-api";

const CREDITS_PER_MESSAGE = 1;

/** GET /api/chat?threadId=xxx — load persisted chat history */
export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) {
    return Response.json({ error: "threadId is required" }, { status: 400 });
  }
  const messages = await getChatMessages(threadId);
  return Response.json(messages);
}

export async function POST(req: Request) {
  loadEnv(true); // force reload env every request

  const body = await req.json();
  const { threadId, spaceId } = body as {
    threadId?: string;
    spaceId?: string;
  };
  const modelMessages = await convertToModelMessages(body.messages);

  const config = await getEffectiveConfig();

  const apiKey = process.env.ANTHROPIC_API_KEY || config.claudeApiKey;
  const oauthToken = process.env.CLAUDE_OAUTH_TOKEN;

  if (!apiKey && !oauthToken) {
    return Response.json(
      { error: "No API key configured. Go to /login to set up." },
      { status: 400 }
    );
  }

  // Check credits if in Convex mode (SaaS)
  const userEmail = body.userEmail as string | undefined;
  if (isConvexMode() && userEmail) {
    const convex = getConvexClient();
    if (convex) {
      const credits = await convex.query(api.users.getCredits, { email: userEmail });
      if (credits < CREDITS_PER_MESSAGE) {
        return Response.json(
          { error: "Insufficient credits. Purchase more to continue." },
          { status: 402 }
        );
      }
      // Deduct credits
      await convex.mutation(api.users.deductCredits, {
        email: userEmail,
        amount: CREDITS_PER_MESSAGE,
      });
    }
  }

  // Build system prompt with space context
  let spaceName: string | null = null;
  if (spaceId) {
    const space = await getSpace(spaceId);
    spaceName = space?.name ?? null;
  }
  const systemPrompt = buildSystemPrompt({
    activeSpaceId: spaceId,
    spaceName,
  });

  // Support both auth methods
  const anthropic = apiKey
    ? createAnthropic({ apiKey })
    : createAnthropic({
        authToken: oauthToken!,
        headers: { "anthropic-beta": "oauth-2025-04-20" },
      });

  // Save the latest user message for persistence
  if (threadId && body.messages?.length > 0) {
    const lastMsg = body.messages[body.messages.length - 1];
    if (lastMsg?.role === "user") {
      const textContent = lastMsg.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("\n") ?? lastMsg.content ?? "";
      if (textContent) {
        await saveChatMessage(threadId, {
          id: lastMsg.id ?? crypto.randomUUID(),
          threadId,
          role: "user",
          content: textContent,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  const result = streamText({
    model: anthropic(config.claudeModel || "claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(10),
    temperature: config.claudeTemperature ?? 0.7,
    onFinish: async ({ text, toolCalls }) => {
      // Persist the assistant response
      if (threadId && (text || (toolCalls && toolCalls.length > 0))) {
        await saveChatMessage(threadId, {
          id: crypto.randomUUID(),
          threadId,
          role: "assistant",
          content: text || "",
          toolCalls: toolCalls?.map((tc) => ({
            id: tc.toolCallId,
            name: tc.toolName,
            input: (tc as { input?: unknown }).input as Record<string, unknown> ?? {},
          })),
          timestamp: new Date().toISOString(),
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
