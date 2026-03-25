import { NextRequest, NextResponse } from 'next/server';
import { handleMcpRequest, registerTools, validateBearerToken, corsHeaders } from '@/lib/mcp';
import type { JsonRpcRequest } from '@/lib/mcp';
import * as toolsModule from '@/lib/ai/tools';

let initialized = false;
function ensureInit() {
  if (initialized) return;
  const toolMap: Record<string, any> = {};
  const toolsList = (toolsModule as any).tools || (toolsModule as any).allTools || Object.values(toolsModule).find(v => Array.isArray(v)) || [];
  const items = Array.isArray(toolsList) ? toolsList : Object.entries(toolsList);
  for (const item of items) {
    const [name, tool] = Array.isArray(item) && typeof item[0] === 'string' ? item : [(item as any).name || 'unknown', item];
    if (typeof (tool as any).execute === 'function') toolMap[name] = tool;
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
  if (rpc.method === 'tools/call') {
    const auth = await validateBearerToken(req.headers.get('authorization'));
    if (!auth.valid) return { jsonrpc: '2.0', id: rpc.id, error: { code: -32000, message: auth.error || 'Unauthorized' } };
  }
  return handleMcpRequest(rpc);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
