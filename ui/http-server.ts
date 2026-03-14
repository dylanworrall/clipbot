#!/usr/bin/env node
/**
 * Clipbot HTTP Tool Server
 *
 * Exposes all Vercel AI SDK tools over HTTP for Soshi to call.
 * Runs from ui/ so @/ path aliases and deps resolve correctly.
 * Usage: cd ui && npx tsx http-server.ts
 */

import { createServer, type IncomingMessage } from "node:http";
import { allTools } from "./src/lib/ai/tools";

const PORT = parseInt(process.env.PORT || "3101");
const NAME = "clipbot";

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const json = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.url === "/health") {
    return json(200, { status: "ok", name: NAME, tools: Object.keys(allTools).length });
  }

  if (req.url === "/tools" && req.method === "GET") {
    const list = Object.entries(allTools).map(([name, t]) => ({
      name,
      description: (t as any).description || name,
    }));
    return json(200, list);
  }

  const match = req.url?.match(/^\/tools\/([a-z_]+)$/);
  if (match && req.method === "POST") {
    const toolName = match[1];
    const tool = (allTools as Record<string, any>)[toolName];
    if (!tool) return json(404, { error: `Tool "${toolName}" not found` });

    try {
      const body = await readBody(req);
      const args = body ? JSON.parse(body) : {};

      const result = await tool.execute(args);
      return json(200, result);
    } catch (err: any) {
      return json(500, { error: err.message || String(err) });
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[${NAME}] HTTP tool server on port ${PORT} (${Object.keys(allTools).length} tools)`);
});
