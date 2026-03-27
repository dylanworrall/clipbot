import { NextRequest, NextResponse } from 'next/server';
import { handleMcpRequest, registerTools, validateBearerToken, corsHeaders } from '@/lib/mcp';
import type { JsonRpcRequest } from '@/lib/mcp';
import { allTools } from '@/lib/ai/tools';
import { tools as mcpTools } from '@/lib/ai/tools/index';

let initialized = false;

function ensureInit() {
  if (initialized) return;

  const toolMap: Record<string, { description?: string; inputSchema?: unknown; execute: (args: unknown) => Promise<unknown> }> = {};

  // Register from allTools (AI SDK tool() format — primary registry)
  if (allTools && typeof allTools === 'object') {
    for (const [name, tool] of Object.entries(allTools)) {
      const t = tool as Record<string, unknown>;
      if (typeof t.execute === 'function') {
        toolMap[name] = {
          description: t.description as string,
          inputSchema: t.parameters ?? t.inputSchema,
          execute: t.execute as (args: unknown) => Promise<unknown>,
        };
      }
    }
  }

  // Merge from MCP tools array (raw format — may have additional tools)
  if (Array.isArray(mcpTools)) {
    for (const tool of mcpTools) {
      const t = tool as Record<string, unknown>;
      const name = t.name as string;
      if (name && typeof t.execute === 'function' && !toolMap[name]) {
        toolMap[name] = {
          description: t.description as string,
          inputSchema: t.inputSchema,
          execute: t.execute as (args: unknown) => Promise<unknown>,
        };
      }
    }
  }

  registerTools(toolMap);
  initialized = true;
}

export async function POST(req: NextRequest) {
  ensureInit();
  const body = await req.json();

  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((r: JsonRpcRequest) => processRequest(r, req)));
    return NextResponse.json(results, { headers: corsHeaders() });
  }

  const result = await processRequest(body as JsonRpcRequest, req);
  return NextResponse.json(result, { headers: corsHeaders() });
}

async function processRequest(rpc: JsonRpcRequest, req: NextRequest) {
  // Auth required for tool calls, not for list/initialize
  if (rpc.method === 'tools/call') {
    const auth = await validateBearerToken(req.headers.get('authorization'));
    if (!auth.valid) {
      return { jsonrpc: '2.0', id: rpc.id, error: { code: -32000, message: auth.error || 'Unauthorized' } };
    }
  }
  return handleMcpRequest(rpc);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
