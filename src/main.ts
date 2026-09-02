import './styles.css';
import { renderer } from './render/renderer';
import { SAMPLE_HEIGHT, SAMPLE_WIDTH, sampleImageDataURL } from './render/sample';
import { registerSampleSource, scene } from './scene/scene';
import { initObjectList } from './ui/objectlist';
import { initToolbar } from './ui/toolbar';
import { getModelContext } from './webmcp/adapter';
import type { ModelContext, ToolResponse } from './webmcp/adapter';

// --- Boot: scene → renderer → UI first — the page works with or without WebMCP ---

registerSampleSource(() => ({
  name: 'sample.png',
  dataURL: sampleImageDataURL(),
  width: SAMPLE_WIDTH,
  height: SAMPLE_HEIGHT,
}));

const easel = document.querySelector<HTMLCanvasElement>('#easel')!;
renderer.init(easel);
initToolbar(document.querySelector<HTMLElement>('#toolbar')!);
initObjectList(document.querySelector<HTMLElement>('#object-list')!);

// Keep the easel never blank: boot loads the generated sample through the
// same scene.loadImage path uploads take (one code path — filters and crop
// apply to the sample identically).
if (!scene.getState().image) scene.loadSample();

// Expose the store for DevTools auditioning: `scene.addText('hello')` updates
// canvas + object list without a reload — the Phase 3 agent path, by hand.
declare global {
  interface Window {
    scene: typeof scene;
  }
}
window.scene = scene;

// --- WebMCP tool registration ---

/** Module-level guard: Vite HMR re-runs main.ts; a repeat run registers 0 tools. */
let registered = false;

const text = (t: string): ToolResponse => ({
  content: [{ type: 'text', text: t }],
});

/**
 * Register the Phase 1 hello tool. `describe_page` returns one static
 * sentence about what Speakeasel is; it exists to prove registration
 * end-to-end and is replaced by the real tool surface in Phase 3.
 * Returns the number of tools registered (0 on a repeat call — HMR guard).
 */
function registerHelloTool(mc: ModelContext): number {
  if (registered) return 0;
  registered = true;

  mc.registerTool({
    name: 'describe_page',
    description:
      'Describe this page: what Speakeasel is and what an agent can do here.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async execute() {
      // Never throw across the WebMCP boundary — errors become response text.
      try {
        return text(
          'Speakeasel is an agent + human image easel: a Fabric.js canvas ' +
            'you and your AI agent edit together over WebMCP.',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return text(`Error: ${message}`);
      }
    },
  });
  return 1;
}

const banner = document.querySelector<HTMLParagraphElement>('#webmcp-banner')!;
const mc = getModelContext();

if (!mc) {
  banner.hidden = false;
} else {
  try {
    const count = registerHelloTool(mc);
    console.log('[speakeasel] registered', count, 'tools');
  } catch (err) {
    console.error('[speakeasel] tool registration failed:', err);
    banner.hidden = false;
  }
}
