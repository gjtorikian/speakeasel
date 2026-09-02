export interface ToolResponse {
  content: Array<{ type: 'text'; text: string }>;
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Optional MCP tool annotations (e.g. { readOnlyHint: true }); clients that reject the field get the tool re-registered without it. */
  annotations?: Record<string, unknown>;
  execute(args: unknown): Promise<ToolResponse>;
}

export interface ModelContext {
  registerTool(t: ToolDef): void;
}

/**
 * Returns whichever modelContext surface this client exposes.
 * The Devpost rules reference `document.modelContext.registerTool` while
 * Chrome's docs use `navigator.modelContext` — support both.
 */
export function getModelContext(): ModelContext | null {
  const mc =
    (navigator as any).modelContext ?? (document as any).modelContext ?? null;
  console.log(
    '[speakeasel] modelContext surface:',
    mc ? ('modelContext' in navigator ? 'navigator' : 'document') : 'none',
  );
  return mc;
}
