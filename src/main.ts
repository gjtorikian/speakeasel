import './styles.css';
import { renderer } from './render/renderer';
import { SAMPLE_HEIGHT, SAMPLE_WIDTH, sampleImageDataURL } from './render/sample';
import { registerSampleSource, scene } from './scene/scene';
import { mountActivity } from './ui/activity';
import { initObjectList } from './ui/objectlist';
import { initToolbar } from './ui/toolbar';
import { getModelContext } from './webmcp/adapter';
import { registerAll, summarize } from './webmcp/tools';

// --- Boot: scene → renderer → UI first — the page works with or without WebMCP ---

registerSampleSource(() => ({
  name: 'sample.png',
  dataURL: sampleImageDataURL(),
  width: SAMPLE_WIDTH,
  height: SAMPLE_HEIGHT,
}));

const easel = document.querySelector<HTMLCanvasElement>('#easel')!;
renderer.init(easel);

// a11y: keep the canvas's aria-label in sync from the SAME summarizer
// describe_canvas builds on (one source of truth) — wired after renderer.init
// so the element Fabric leaves in place (the labeled lower canvas) is the one
// updated. Fabric's added .upper-canvas is pointer-only; hide it from the
// accessibility tree so screen readers land on the labeled element instead.
const syncCanvasLabel = (): void => {
  easel.setAttribute('aria-label', `Canvas: ${summarize(scene.getState())}`);
};
scene.subscribe(syncCanvasLabel);
syncCanvasLabel();
document.querySelector('.upper-canvas')?.setAttribute('aria-hidden', 'true');

initToolbar(document.querySelector<HTMLElement>('#toolbar')!);
initObjectList(document.querySelector<HTMLElement>('#object-list')!);
const activity = mountActivity(document.querySelector<HTMLElement>('#activity')!);

// Keep the easel never blank: boot loads the generated sample through the
// same scene.loadImage path uploads take (one code path — filters and crop
// apply to the sample identically).
if (!scene.getState().image) scene.loadSample();

// Expose the store for DevTools auditioning: `scene.addText('hello')` updates
// canvas + object list without a reload — the agent path, by hand.
declare global {
  interface Window {
    scene: typeof scene;
  }
}
window.scene = scene;

// --- WebMCP tool registration ---
// The full tool surface lives in webmcp/tools.ts (single dispatch point +
// HMR guard); every call is pushed to the activity feed, best-effort.

const banner = document.querySelector<HTMLParagraphElement>('#webmcp-banner')!;
const mc = getModelContext();

if (!mc) {
  banner.hidden = false;
} else {
  try {
    const count = registerAll(mc, scene, (entry) => activity.push(entry));
    console.log('[speakeasel] registered', count, 'tools');
  } catch (err) {
    console.error('[speakeasel] tool registration failed:', err);
    banner.hidden = false;
  }
}
