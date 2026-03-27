import type { JsonRpcRequest, JsonRpcResponse, McpToolSchema, McpToolCallResult } from './types';
import { CONNECTOR } from './config';

type ToolMap = Record<string, { description?: string; inputSchema?: unknown; parameters?: unknown; execute: (args: unknown) => Promise<unknown> }>;

let registeredTools: ToolMap = {};

export function registerTools(tools: ToolMap) { registeredTools = tools; }

/**
 * Extract JSON Schema from various tool definition formats:
 * - Zod schema (AI SDK tool() wrapper) → parse _def.shape
 * - Raw inputSchema with properties → pass through
 * - AI SDK tool with parameters.jsonSchema → use that
 */
function extractSchema(tool: ToolMap[string]): McpToolSchema['inputSchema'] {
  const fallback = { type: 'object' as const, properties: {} as Record<string, unknown>, required: [] as string[] };

  try {
    // AI SDK tool() wraps zod in parameters
    const params = (tool as Record<string, unknown>).parameters as Record<string, unknown> | undefined;
    if (params?.jsonSchema) {
      return params.jsonSchema as McpToolSchema['inputSchema'];
    }

    const schema = tool.inputSchema as Record<string, unknown> | undefined;
    if (!schema) return fallback;

    // Already a valid JSON Schema object
    if (schema.type === 'object' && schema.properties) {
      return schema as McpToolSchema['inputSchema'];
    }

    // Zod schema — extract shape
    const def = (schema as Record<string, unknown>)._def as Record<string, unknown> | undefined;
    if (def) {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      if (shape && typeof shape === 'object') {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        for (const [key, val] of Object.entries(shape as Record<string, unknown>)) {
          const fieldDef = (val as Record<string, unknown>)?._def as Record<string, unknown> | undefined;
          const typeName = fieldDef?.typeName as string | undefined;
          const description = fieldDef?.description as string | undefined;

          // Detect if optional
          const isOptional = typeName === 'ZodOptional' || typeName === 'ZodDefault';
          if (!isOptional) required.push(key);

          // Unwrap optional/default to get inner type
          let innerDef = fieldDef;
          if (isOptional && innerDef?.innerType) {
            innerDef = (innerDef.innerType as Record<string, unknown>)?._def as Record<string, unknown>;
          }

          const innerTypeName = innerDef?.typeName as string | undefined;
          let jsonType = 'string';
          if (innerTypeName === 'ZodNumber') jsonType = 'number';
          else if (innerTypeName === 'ZodBoolean') jsonType = 'boolean';
          else if (innerTypeName === 'ZodArray') jsonType = 'array';
          else if (innerTypeName === 'ZodEnum') jsonType = 'string';

          const prop: Record<string, unknown> = { type: jsonType };
          if (description) prop.description = description;

          // For enums, include values
          if (innerTypeName === 'ZodEnum' && innerDef?.values) {
            prop.enum = innerDef.values;
          }

          // For arrays, add items hint
          if (jsonType === 'array') {
            prop.items = { type: 'string' };
          }

          properties[key] = prop;
        }
        return { type: 'object' as const, properties, required };
      }
    }

    // Zod shape() method directly on schema
    if (typeof (schema as Record<string, Function>).shape === 'function') {
      const shape = (schema as Record<string, Function>).shape();
      if (shape && typeof shape === 'object') {
        const properties: Record<string, unknown> = {};
        for (const key of Object.keys(shape)) {
          properties[key] = { type: 'string', description: key };
        }
        return { type: 'object' as const, properties, required: [] };
      }
    }
  } catch {
    // Schema extraction failed, return fallback
  }

  return fallback;
}

function getToolSchemas(): McpToolSchema[] {
  return Object.entries(registeredTools).map(([name, tool]) => ({
    name,
    description: tool.description || name,
    inputSchema: extractSchema(tool),
  }));
}

export async function handleMcpRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { method, id, params } = req;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-03-26',
          serverInfo: { name: CONNECTOR.name, version: '2.0.0' },
          capabilities: { tools: { listChanged: false } },
        },
      };

    case 'notifications/initialized':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: getToolSchemas() } };

    case 'tools/call': {
      const toolName = (params as Record<string, unknown>)?.name as string;
      const args = (params as Record<string, unknown>)?.arguments ?? {};
      const tool = registeredTools[toolName];

      if (!tool) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Tool "${toolName}" not found. Available: ${Object.keys(registeredTools).join(', ')}` }],
            isError: true,
          } satisfies McpToolCallResult,
        };
      }

      try {
        const result = await tool.execute(args);
        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text }] } satisfies McpToolCallResult,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
          } satisfies McpToolCallResult,
        };
      }
    }

    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}
