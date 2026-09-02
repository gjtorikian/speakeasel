import type { ToolDef } from '../src/webmcp/adapter';

/**
 * Fake `navigator.modelContext` for the Node test suite: captures every
 * `registerTool` call into a Map. Install BEFORE calling `registerAll`.
 * Throws on duplicate names so a broken HMR guard cannot pass silently.
 */
export function installShim(): { tools: Map<string, ToolDef> } {
  const tools = new Map<string, ToolDef>();
  (globalThis as any).navigator ??= {};
  (globalThis as any).navigator.modelContext = {
    registerTool(t: ToolDef) {
      if (tools.has(t.name)) throw new Error(`dup ${t.name}`);
      tools.set(t.name, t);
    },
  };
  return { tools };
}
