import Ajv from 'ajv';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerSampleSource, scene } from '../src/scene/scene';
import type { ImageMeta } from '../src/types';
import type { ModelContext } from '../src/webmcp/adapter';
import { registerAll, type ActivityEntry } from '../src/webmcp/tools';
import { installShim } from './shim';

// ---------------------------------------------------------------------------
// The contract-pinned suite: shim installed BEFORE registration, then the
// surface is asserted three ways — count + pinned names, schema validity
// (ajv strict), and behavioral round-trips against the real scene store.
//
// registerAll is guarded by a module-level once-flag (HMR guard), so it runs
// exactly once for the whole file; per-test isolation comes from
// `scene.reset()` in beforeEach (the scene is a process-wide singleton).
// ---------------------------------------------------------------------------

const shim = installShim();
const activity: ActivityEntry[] = [];
let feedShouldThrow = false;

// Node has no boot path: register a fake sample source before any
// load_sample_image call (scene.loadSample throws without one). The source
// survives scene.reset(), so registering once at suite top suffices.
registerSampleSource(
  (): ImageMeta => ({
    name: 'sample.png',
    dataURL: 'data:image/png;base64,AAAA',
    width: 1600,
    height: 900,
  }),
);

const registeredCount = registerAll(
  (globalThis as { navigator?: { modelContext?: ModelContext } }).navigator!
    .modelContext!,
  scene,
  (entry) => {
    activity.push(entry);
    if (feedShouldThrow) throw new Error('feed boom');
  },
);

async function call(name: string, args: unknown = {}): Promise<string> {
  const tool = shim.tools.get(name);
  if (!tool) throw new Error(`tool not registered: ${name}`);
  const response = await tool.execute(args);
  expect(response.content[0]?.type).toBe('text');
  return response.content[0]!.text;
}

/** get_canvas_state's layout is deterministic: summary line 1, JSON after. */
function parseGetState(text: string): { summary: string; state: any } {
  const newline = text.indexOf('\n');
  expect(newline).toBeGreaterThan(0);
  return {
    summary: text.slice(0, newline),
    state: JSON.parse(text.slice(newline + 1)),
  };
}

async function currentState(): Promise<any> {
  return parseGetState(await call('get_canvas_state')).state;
}

beforeEach(() => {
  scene.reset();
  activity.length = 0;
  feedShouldThrow = false;
});

describe('registration', () => {
  it('registers at least 14 tools', () => {
    expect(shim.tools.size).toBeGreaterThanOrEqual(14);
    expect(registeredCount).toBe(shim.tools.size);
  });

  it('registers all 15 named tools — get_canvas_state and describe_canvas pinned by name', () => {
    for (const name of [
      'get_canvas_state',
      'describe_canvas',
      'load_sample_image',
      'set_adjustment',
      'crop',
      'clear_crop',
      'rotate',
      'add_text',
      'edit_text',
      'move_object',
      'remove_object',
      'undo',
      'redo',
      'export_png',
      'reset_canvas',
    ]) {
      expect(shim.tools.has(name), `missing tool: ${name}`).toBe(true);
    }
  });

  it('the two read tools carry readOnlyHint annotations', () => {
    expect(shim.tools.get('get_canvas_state')!.annotations).toEqual({
      readOnlyHint: true,
    });
    expect(shim.tools.get('describe_canvas')!.annotations).toEqual({
      readOnlyHint: true,
    });
  });

  it('a second registerAll is a guarded no-op (HMR)', () => {
    // The shim throws on duplicate names, so reaching registerTool again
    // would fail loudly — the guard must return 0 without registering.
    const again = registerAll(
      (globalThis as { navigator?: { modelContext?: ModelContext } }).navigator!
        .modelContext!,
      scene,
      () => {},
    );
    expect(again).toBe(0);
    expect(shim.tools.size).toBe(registeredCount);
  });
});

describe('schemas', () => {
  it('every tool has a non-empty description and an object schema', () => {
    for (const [name, tool] of shim.tools) {
      expect(tool.description.length, `${name} description`).toBeGreaterThan(0);
      expect(tool.inputSchema.type, `${name} schema type`).toBe('object');
      expect(
        tool.inputSchema.additionalProperties,
        `${name} additionalProperties`,
      ).toBe(false);
    }
  });

  it('every schema compiles under ajv strict mode', () => {
    const ajv = new Ajv({ strict: true });
    for (const [name, tool] of shim.tools) {
      expect(() => ajv.compile(tool.inputSchema), `${name} schema`).not.toThrow();
    }
  });
});

describe('round trips', () => {
  it('the demo sequence: load, crop square, brighten, caption — get_canvas_state deep-includes all three edits', async () => {
    const loaded = await call('load_sample_image');
    expect(loaded).toMatch(/gradient sky/);
    await call('crop', { aspect: 'square' });
    await call('set_adjustment', { kind: 'brightness', value: 25 });
    const added = await call('add_text', { text: 'Tahoe 2026' });
    expect(added).toMatch(/text-1/);

    const { summary, state } = parseGetState(await call('get_canvas_state'));
    expect(state.image).toEqual({ name: 'sample.png', width: 1600, height: 900 });
    expect(state.adjustments).toEqual({ brightness: 25, contrast: 0, saturation: 0 });
    // 1600×900 center-cropped to square: 56.25% wide, centered at x 21.875.
    expect(state.crop).toEqual({ x: 21.875, y: 0, width: 56.25, height: 100 });
    expect(state.texts).toEqual([
      { id: 'text-1', text: 'Tahoe 2026', x: 50, y: 50, size: 32, color: '#ffffff' },
    ]);
    expect(summary).toMatch(/sample\.png/);
    expect(summary).toMatch(/1 caption/);
  });

  it('get_canvas_state never leaks the dataURL payload', async () => {
    await call('load_sample_image');
    const text = await call('get_canvas_state');
    expect(text).not.toMatch(/dataURL/);
    expect(text).not.toMatch(/base64/);
    const { state } = parseGetState(text);
    expect(state.image).toEqual({ name: 'sample.png', width: 1600, height: 900 });
  });

  it('crop with a rect echoes the RESULTING (clamped) rect, not the requested one', async () => {
    await call('load_sample_image');
    const text = await call('crop', {
      rect: { x: 90, y: 0, width: 50, height: 100 },
    });
    expect(text).toMatch(/width 10%/); // 50 clamped to the 10% left of frame
    const state = await currentState();
    expect(state.crop).toEqual({ x: 90, y: 0, width: 10, height: 100 });
  });

  it('clear_crop removes the crop', async () => {
    await call('load_sample_image');
    await call('crop', { aspect: '16:9' });
    expect((await currentState()).crop).not.toBeNull();
    const text = await call('clear_crop');
    expect(text).toMatch(/full image/i);
    expect((await currentState()).crop).toBeNull();
  });

  it('rotate normalizes and echoes the normalized value', async () => {
    const text = await call('rotate', { degrees: -90 });
    expect(text).toMatch(/270/);
    expect(text).toMatch(/normalized/i);
    expect((await currentState()).rotation).toBe(270);
  });

  it('set_adjustment clamps out-of-range values and says so', async () => {
    const text = await call('set_adjustment', { kind: 'contrast', value: 250 });
    expect(text).toMatch(/\+100/);
    expect(text).toMatch(/clamp/i);
    expect((await currentState()).adjustments.contrast).toBe(100);
  });

  it('add_text defaults to a centered white 32px caption and echoes the id', async () => {
    const text = await call('add_text', { text: 'hello' });
    expect(text).toMatch(/text-1/);
    expect(text).toMatch(/near the center/);
    const state = await currentState();
    expect(state.texts).toEqual([
      { id: 'text-1', text: 'hello', x: 50, y: 50, size: 32, color: '#ffffff' },
    ]);
  });

  it('edit_text and move_object round-trip through get_canvas_state', async () => {
    await call('add_text', { text: 'hello' });
    await call('edit_text', { id: 'text-1', text: 'goodbye', size: 48, color: '#ffdd00' });
    const moved = await call('move_object', { id: 'text-1', x: 10, y: 8 });
    expect(moved).toMatch(/near the top-left/);
    expect(moved).toMatch(/10% across and 8% down/);
    const state = await currentState();
    expect(state.texts).toEqual([
      { id: 'text-1', text: 'goodbye', x: 10, y: 8, size: 48, color: '#ffdd00' },
    ]);
  });

  it('remove_object deletes the caption', async () => {
    await call('add_text', { text: 'a' });
    await call('add_text', { text: 'b' });
    const text = await call('remove_object', { id: 'text-1' });
    expect(text).toMatch(/Removed text-1/);
    const state = await currentState();
    expect(state.texts.map((t: { id: string }) => t.id)).toEqual(['text-2']);
  });
});

describe('describe_canvas (the thesis tool)', () => {
  it('narrates the caption text and its position words after a move', async () => {
    await call('load_sample_image');
    await call('add_text', { text: 'Tahoe 2026' });
    await call('move_object', { id: 'text-1', x: 10, y: 8 });
    const prose = await call('describe_canvas');
    expect(prose).toMatch(/Tahoe 2026/);
    expect(prose).toMatch(/near the top-left/);
    expect(prose).toMatch(/10% across and 8% down/);
    expect(prose).toMatch(/text-1/); // id included for addressing
  });

  it('narrates image, rotation, crop, and adjustments in words', async () => {
    await call('load_sample_image');
    await call('rotate', { degrees: 90 });
    await call('crop', { aspect: 'square' });
    await call('set_adjustment', { kind: 'brightness', value: 40 });
    const prose = await call('describe_canvas');
    expect(prose).toMatch(/sample\.png/);
    expect(prose).toMatch(/1600×900/);
    expect(prose).toMatch(/rotated 90 degrees/);
    expect(prose).toMatch(/cropped to a region 56.25% wide/);
    expect(prose).toMatch(/brightness raised moderately \(\+40\)/);
    expect(prose).toMatch(/no captions/i);
  });

  it('describes the empty canvas without erroring', async () => {
    const prose = await call('describe_canvas');
    expect(prose).toMatch(/no image is loaded/i);
    expect(prose).toMatch(/no captions/i);
  });
});

describe('error paths', () => {
  it('unknown adjustment kind lists the valid kinds and does not mutate', async () => {
    await call('load_sample_image');
    const before = scene.getState();
    const text = await call('set_adjustment', { kind: 'blur', value: 10 });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/brightness, contrast, saturation/);
    expect(scene.getState()).toEqual(before);
  });

  it('unknown text id lists current ids and does not mutate', async () => {
    await call('add_text', { text: 'a' });
    const before = scene.getState();
    const text = await call('move_object', { id: 'text-9', x: 1, y: 1 });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/text-1/);
    expect(scene.getState()).toEqual(before);
  });

  it('unknown text id with zero captions still returns instructive text', async () => {
    const text = await call('edit_text', { id: 'text-9', text: 'x' });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/none — no text objects exist/);
  });

  it('edit_text with no editable field names the options and does not mutate', async () => {
    await call('add_text', { text: 'a' });
    const before = scene.getState();
    const text = await call('edit_text', { id: 'text-1' });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/'text', 'size', or 'color'/);
    expect(text).toMatch(/move_object/);
    expect(scene.getState()).toEqual(before);
  });

  it('crop with neither aspect nor rect names both options and does not mutate', async () => {
    await call('load_sample_image');
    const before = scene.getState();
    const text = await call('crop', {});
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/aspect/);
    expect(text).toMatch(/rect/);
    expect(scene.getState()).toEqual(before);
  });

  it('crop with BOTH aspect and rect also errors', async () => {
    await call('load_sample_image');
    const before = scene.getState();
    const text = await call('crop', {
      aspect: 'square',
      rect: { x: 0, y: 0, width: 50, height: 50 },
    });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/exactly one/i);
    expect(scene.getState()).toEqual(before);
  });

  it('crop to an aspect without an image errors instructively', async () => {
    const text = await call('crop', { aspect: 'square' });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/No image loaded/);
  });

  it('unknown aspect name lists the valid aspects', async () => {
    await call('load_sample_image');
    const text = await call('crop', { aspect: 'panorama' });
    expect(text).toMatch(/^Error:/);
    expect(text).toMatch(/square, 4:3, 16:9/);
  });
});

describe('undo / redo / export / reset', () => {
  it('undo on empty history is polite, never an error, never a failed feed entry', async () => {
    const text = await call('undo');
    expect(text).toBe('Nothing to undo yet.');
    expect(activity).toHaveLength(1);
    expect(activity[0]!.ok).toBe(true);
  });

  it('redo on empty history is polite too', async () => {
    const text = await call('redo');
    expect(text).toBe('Nothing to redo yet.');
    expect(activity[0]!.ok).toBe(true);
  });

  it('undo and redo round-trip an adjustment', async () => {
    await call('load_sample_image');
    await call('set_adjustment', { kind: 'contrast', value: 30 });
    const undone = await call('undo');
    expect(undone).toMatch(/Undid/);
    expect(scene.getState().adjustments.contrast).toBe(0);
    const redone = await call('redo');
    expect(redone).toMatch(/Redid/);
    expect(scene.getState().adjustments.contrast).toBe(30);
  });

  it('export_png bumps the counter, tells the agent about the download, and is not undoable', async () => {
    const text = await call('export_png');
    expect(text).toMatch(/download/i);
    expect(scene.getState().exportRequests).toBe(1);
    expect(scene.getState().canUndo).toBe(false); // no history entry
  });

  it('reset_canvas then get_canvas_state deep-equals the defaults', async () => {
    const defaults = await currentState();
    await call('load_sample_image');
    await call('rotate', { degrees: 45 });
    await call('add_text', { text: 'x' });
    await call('reset_canvas');
    expect(await currentState()).toEqual(defaults);
  });
});

describe('activity feed dispatch', () => {
  it('reports ok entries with tool name and args', async () => {
    await call('rotate', { degrees: 45 });
    expect(activity).toHaveLength(1);
    const entry = activity[0]!;
    expect(entry.ok).toBe(true);
    expect(entry.tool).toBe('rotate');
    expect(entry.args).toEqual({ degrees: 45 });
    expect(entry.summary.length).toBeGreaterThan(0);
    expect(entry.at).toBeInstanceOf(Date);
  });

  it('reports failed entries with ok: false', async () => {
    await call('set_adjustment', { kind: 'blur', value: 10 });
    expect(activity).toHaveLength(1);
    expect(activity[0]!.ok).toBe(false);
    expect(activity[0]!.summary).toMatch(/Valid adjustments/i);
  });

  it('a throwing feed never fails the tool call (best-effort)', async () => {
    feedShouldThrow = true;
    const text = await call('rotate', { degrees: 45 });
    expect(text).toMatch(/45/);
    expect(scene.getState().rotation).toBe(45);
  });
});
