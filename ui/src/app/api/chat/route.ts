import { createGoogleGenerativeAI } from "@ai-sdk/google";
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

// Usage is tracked per tier in Convex

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

  // Resolve provider: Gemini first, then Anthropic API key
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || config.claudeApiKey;

  if (!geminiKey && !anthropicKey) {
    return Response.json(
      { error: "No API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY." },
      { status: 400 }
    );
  }

  // Check subscription usage if in Convex mode (SaaS) — best effort, don't block chat
  const userEmail = body.userEmail as string | undefined;
  if (isConvexMode() && userEmail) {
    try {
      const convex = getConvexClient();
      if (convex) {
        const result = await convex.mutation(api.users.useMessage, { email: userEmail });
        if (!result.allowed) {
          return Response.json(
            { error: "Message limit reached. Upgrade your plan for more messages." },
            { status: 402 }
          );
        }
      }
    } catch (e) {
      // Convex check failed — allow message through, don't block the user
      console.warn("Convex usage check failed:", e);
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

  // Pick model: Gemini by default, Anthropic as fallback
  const model = geminiKey
    ? createGoogleGenerativeAI({ apiKey: geminiKey })("gemini-2.5-flash")
    : createAnthropic({ apiKey: anthropicKey! })(config.claudeModel || "claude-sonnet-4-20250514");

  // Save the latest user message for persistence (best-effort — fails silently on serverless)
  if (threadId && body.messages?.length > 0) {
    const lastMsg = body.messages[body.messages.length - 1];
    if (lastMsg?.role === "user") {
      const textContent = lastMsg.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("\n") ?? lastMsg.content ?? "";
      if (textContent) {
        try {
          await saveChatMessage(threadId, {
            id: lastMsg.id ?? crypto.randomUUID(),
            threadId,
            role: "user",
            content: textContent,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // File write fails on serverless (read-only fs) — that's OK
        }
      }
    }
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(10),
    temperature: config.claudeTemperature ?? 0.7,
    onFinish: async ({ text, toolCalls }) => {
      // Persist the assistant response (best-effort — fails silently on serverless)
      if (threadId && (text || (toolCalls && toolCalls.length > 0))) {
        try {
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
        } catch {
          // File write fails on serverless (read-only fs) — that's OK
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
