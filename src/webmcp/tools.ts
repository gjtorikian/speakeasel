import type { Scene } from '../scene/scene';
import {
  ADJUSTMENTS,
  type AdjustmentKind,
  ASPECTS,
  type CropRect,
  type SceneState,
} from '../types';
import type { ModelContext, ToolDef, ToolResponse } from './adapter';
import { schemas } from './schemas';

// ---------------------------------------------------------------------------
// The tool surface: 15 thin tools over the Phase 2 scene store. Handlers
// parse args, call one scene mutator (or getState), and return LLM-legible
// text. No editing logic lives here — the scene validates; the dispatch
// wrapper in registerAll converts its thrown errors into instructive
// response text (never throw across the WebMCP boundary).
// ---------------------------------------------------------------------------

export interface ActivityEntry {
  at: Date;
  tool: string;
  args: unknown;
  ok: boolean;
  summary: string;
}

function text(t: string): ToolResponse {
  return { content: [{ type: 'text', text: t }] };
}

/** Format a percent/number for prose: trim float noise to 2 decimals. */
function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** 'near the top-left', 'near the center', ... from percent coordinates. */
function positionWords(x: number, y: number): string {
  const v = y < 33 ? 'top' : y > 67 ? 'bottom' : 'middle';
  const h = x < 33 ? 'left' : x > 67 ? 'right' : 'center';
  if (v === 'middle' && h === 'center') return 'near the center';
  if (v === 'middle') return `near the middle ${h}`;
  if (h === 'center') return `near the ${v} center`;
  return `near the ${v}-${h}`;
}

/** 'raised moderately (+40)' — adjustment value in words for describe_canvas. */
function intensity(value: number): string {
  const magnitude = Math.abs(value);
  const amount = magnitude <= 20 ? 'slightly' : magnitude <= 50 ? 'moderately' : 'strongly';
  return `${value > 0 ? 'raised' : 'lowered'} ${amount} (${signed(value)})`;
}

// --- Emitted state format ---------------------------------------------------
// get_canvas_state returns a summary line, then this JSON (kept compact so it
// never bloats the agent's context): the image is projected to
// {name, width, height} — the dataURL payload NEVER leaves the tab — and the
// internal exportRequests counter is omitted. The contract suite's round-trip
// assertions target THIS format.

function emitState(s: SceneState) {
  return {
    image: s.image
      ? { name: s.image.name, width: s.image.width, height: s.image.height }
      : null,
    adjustments: { ...s.adjustments },
    rotation: s.rotation,
    crop: s.crop ? { ...s.crop } : null,
    texts: s.texts.map((t) => ({ ...t })),
    canUndo: s.canUndo,
    canRedo: s.canRedo,
  };
}

/**
 * One-line state summary. Also the source of the canvas element's aria-label
 * (main.ts subscribes and re-sets it on every scene change) — the same text
 * an agent reads is the text a screen reader hears. Fabric-free on purpose.
 */
export function summarize(s: SceneState): string {
  const parts: string[] = [
    s.image ? `'${s.image.name}' ${s.image.width}×${s.image.height}` : 'no image',
  ];
  if (s.rotation !== 0) parts.push(`rotated ${s.rotation}°`);
  if (s.crop) parts.push('cropped');
  const adjusted = ADJUSTMENTS.filter((k) => s.adjustments[k] !== 0).map(
    (k) => `${k} ${signed(s.adjustments[k])}`,
  );
  if (adjusted.length > 0) parts.push(adjusted.join(', '));
  parts.push(`${s.texts.length} caption${s.texts.length === 1 ? '' : 's'}`);
  return parts.join('; ');
}

/**
 * The describe_canvas narration: reading-order prose complete enough that a
 * person who cannot see the canvas could redraw it. Built from the SAME
 * getState() the JSON tool reads, so the two surfaces cannot drift apart.
 */
function describe(s: SceneState): string {
  const lines: string[] = [];
  if (!s.image) {
    lines.push('The canvas is empty — no image is loaded.');
  } else {
    lines.push(
      `The image is '${s.image.name}', ${s.image.width}×${s.image.height} pixels${
        s.rotation !== 0 ? `, rotated ${s.rotation} degrees clockwise` : ''
      }.`,
    );
    if (s.crop) {
      lines.push(
        `It is cropped to a region ${fmt(s.crop.width)}% wide and ${fmt(s.crop.height)}% tall, starting ${fmt(s.crop.x)}% from the left and ${fmt(s.crop.y)}% from the top (unrotated image space).`,
      );
    }
    const adjusted = ADJUSTMENTS.filter((k) => s.adjustments[k] !== 0);
    lines.push(
      adjusted.length > 0
        ? `${adjusted.map((k) => `${k} ${intensity(s.adjustments[k])}`).join('; ')}.`
        : 'No adjustments are applied.',
    );
  }
  if (s.texts.length === 0) {
    lines.push('There are no captions.');
  } else {
    lines.push(`${s.texts.length} caption${s.texts.length === 1 ? '' : 's'}:`);
    for (const t of s.texts) {
      lines.push(
        `${t.id}: "${t.text}" ${positionWords(t.x, t.y)}, at ${fmt(t.x)}% across and ${fmt(t.y)}% down — size ${t.size}px, color ${t.color}.`,
      );
    }
  }
  return lines.join('\n');
}

// --- Tool definitions --------------------------------------------------------

/** The 15 tool definitions, unwrapped (no dispatch/activity plumbing). */
export function toolDefs(scene: Scene): ToolDef[] {
  return [
    {
      name: 'get_canvas_state',
      description:
        'Read the full canvas state. Returns a one-line summary, then the scene graph as JSON on the following lines: image {name, width, height} (never the pixel data), adjustments (-100..100 each), rotation (degrees 0-359), crop (percent rect of the unrotated image, or null), and texts (captions with stable ids like "text-1", percent positions). Call this before editing so you build on what is already there.',
      inputSchema: schemas.get_canvas_state,
      annotations: { readOnlyHint: true },
      async execute() {
        const s = scene.getState();
        return text(`${summarize(s)}\n${JSON.stringify(emitState(s), null, 2)}`);
      },
    },
    {
      name: 'describe_canvas',
      description:
        'Get a prose description of the canvas in reading order: the image (name, dimensions, rotation, crop, adjustments in words), then every caption with its id, text, and position in natural language. Complete enough to redraw the scene without seeing it — use it to check your work or to narrate edits the human made by hand.',
      inputSchema: schemas.describe_canvas,
      annotations: { readOnlyHint: true },
      async execute() {
        return text(describe(scene.getState()));
      },
    },
    {
      name: 'load_sample_image',
      description:
        'Load the built-in generated sample image onto the canvas (useful when the human has not uploaded a photo). Resets adjustments, rotation, and crop; existing captions are kept.',
      inputSchema: schemas.load_sample_image,
      async execute() {
        scene.loadSample();
        const img = scene.getState().image!;
        return text(
          `Loaded the sample image '${img.name}' (${img.width}×${img.height}): a generated scene with a gradient sky, a sun, two hills, and a title. Adjustments, rotation, and crop were reset; captions were kept.`,
        );
      },
    },
    {
      name: 'set_adjustment',
      description: `Set one image adjustment (${ADJUSTMENTS.join(', ')}) to an absolute value in -100..100. 0 is neutral; out-of-range values clamp. Values are absolute, not deltas — to brighten further, read the current value first.`,
      inputSchema: schemas.set_adjustment,
      async execute(args) {
        const { kind, value } = args as { kind: string; value: number };
        scene.setAdjustment(kind, value);
        const applied = scene.getState().adjustments[kind as AdjustmentKind];
        return text(
          `Set ${kind} to ${signed(applied)}.${
            applied !== value ? ` (Requested ${value}; clamped to the -100..100 range.)` : ''
          }`,
        );
      },
    },
    {
      name: 'crop',
      description: `Crop the image. Provide exactly ONE of: 'aspect' — a named centered crop (${ASPECTS.join(', ')}) — or 'rect' — an explicit {x, y, width, height} region in percent coordinates (0-100) of the unrotated image (width/height clamp to stay inside the frame). Crop applies before rotation. Requires an image; use clear_crop to remove.`,
      inputSchema: schemas.crop,
      async execute(args) {
        const { aspect, rect } = args as { aspect?: string; rect?: CropRect };
        if ((aspect === undefined) === (rect === undefined)) {
          throw new Error(
            `Provide exactly one of 'aspect' (${ASPECTS.join(', ')}) or 'rect' ({x, y, width, height} in percent of the unrotated image).`,
          );
        }
        if (aspect !== undefined) {
          scene.cropToAspect(aspect);
        } else {
          scene.cropRect(rect!);
        }
        const crop = scene.getState().crop!;
        return text(
          `Cropped to x ${fmt(crop.x)}%, y ${fmt(crop.y)}%, width ${fmt(crop.width)}%, height ${fmt(crop.height)}% of the unrotated image.`,
        );
      },
    },
    {
      name: 'clear_crop',
      description: 'Remove the crop, showing the full image again.',
      inputSchema: schemas.clear_crop,
      async execute() {
        scene.clearCrop();
        return text('Crop removed — the full image is visible again.');
      },
    },
    {
      name: 'rotate',
      description:
        'Set the absolute rotation of the image in degrees (not a delta). Any value normalizes into 0-359: -90 becomes 270, 450 becomes 90. Rotation spins the image under the crop window; it does not re-crop.',
      inputSchema: schemas.rotate,
      async execute(args) {
        const { degrees } = args as { degrees: number };
        scene.rotate(degrees);
        const applied = scene.getState().rotation;
        return text(
          `Rotation set to ${applied}°.${
            applied !== degrees ? ` (Requested ${degrees}; normalized into 0-359.)` : ''
          }`,
        );
      },
    },
    {
      name: 'add_text',
      description:
        'Add a caption. x/y are the caption CENTER in percent of the visible canvas (0-100; default 50/50 = centered); size is px (8-200, default 32); color is any CSS color (default #ffffff). Returns the assigned id (e.g. "text-1") — use it with edit_text, move_object, and remove_object.',
      inputSchema: schemas.add_text,
      async execute(args) {
        const a = args as {
          text: string;
          x?: number;
          y?: number;
          size?: number;
          color?: string;
        };
        const id = scene.addText(a.text, { x: a.x, y: a.y, size: a.size, color: a.color });
        const created = scene.getState().texts.find((t) => t.id === id)!;
        return text(
          `Added caption ${id}: "${created.text}" ${positionWords(created.x, created.y)}, at ${fmt(created.x)}% across and ${fmt(created.y)}% down (size ${created.size}px, color ${created.color}).`,
        );
      },
    },
    {
      name: 'edit_text',
      description:
        'Change a caption\'s text, size (px, 8-200, clamps), or color by id (e.g. "text-1"). At least one field besides id is required. Use move_object to reposition.',
      inputSchema: schemas.edit_text,
      async execute(args) {
        const a = args as { id: string; text?: string; size?: number; color?: string };
        if (a.text === undefined && a.size === undefined && a.color === undefined) {
          throw new Error(
            "Nothing to edit — provide at least one of 'text', 'size', or 'color'. Use move_object to reposition a caption.",
          );
        }
        scene.editText(a.id, { text: a.text, size: a.size, color: a.color });
        const updated = scene.getState().texts.find((t) => t.id === a.id)!;
        return text(
          `Updated ${a.id}: "${updated.text}" (size ${updated.size}px, color ${updated.color}).${
            a.size !== undefined && updated.size !== a.size
              ? ` (Requested size ${a.size}; clamped to 8-200.)`
              : ''
          }`,
        );
      },
    },
    {
      name: 'move_object',
      description:
        'Move a caption to (x, y) — its new CENTER in percent of the visible canvas (0 = left/top, 100 = right/bottom; out-of-range values clamp). Address captions by id (e.g. "text-1").',
      inputSchema: schemas.move_object,
      async execute(args) {
        const { id, x, y } = args as { id: string; x: number; y: number };
        scene.moveObject(id, x, y);
        const moved = scene.getState().texts.find((t) => t.id === id)!;
        return text(
          `Moved ${id} ${positionWords(moved.x, moved.y)} — now at ${fmt(moved.x)}% across and ${fmt(moved.y)}% down.${
            moved.x !== x || moved.y !== y
              ? ` (Requested ${x}, ${y}; clamped to 0-100.)`
              : ''
          }`,
        );
      },
    },
    {
      name: 'remove_object',
      description: 'Remove a caption by id (e.g. "text-1").',
      inputSchema: schemas.remove_object,
      async execute(args) {
        const { id } = args as { id: string };
        scene.removeObject(id);
        const remaining = scene.getState().texts.length;
        return text(
          `Removed ${id}. ${remaining} caption${remaining === 1 ? '' : 's'} remain${remaining === 1 ? 's' : ''}.`,
        );
      },
    },
    {
      name: 'undo',
      description:
        'Undo the last edit (image load, adjustment, crop, rotation, or caption change). Never fails: with no history it simply says so. Exports are not undoable.',
      inputSchema: schemas.undo,
      async execute() {
        if (!scene.undo()) return text('Nothing to undo yet.');
        return text(`Undid the last edit. Now: ${summarize(scene.getState())}.`);
      },
    },
    {
      name: 'redo',
      description:
        'Redo the most recently undone edit. Never fails: with nothing to redo it simply says so.',
      inputSchema: schemas.redo,
      async execute() {
        if (!scene.redo()) return text('Nothing to redo yet.');
        return text(`Redid the edit. Now: ${summarize(scene.getState())}.`);
      },
    },
    {
      name: 'export_png',
      description:
        'Export the current canvas as a PNG. The human sees a file download in their browser; nothing is returned to you. Not undoable.',
      inputSchema: schemas.export_png,
      async execute() {
        scene.requestExport();
        return text(
          'Export requested — the human sees a PNG download of the current canvas in their browser.',
        );
      },
    },
    {
      name: 'reset_canvas',
      description:
        'Reset the canvas to a fresh state: no image, all adjustments 0, no rotation, no crop, no captions, empty history.',
      inputSchema: schemas.reset_canvas,
      async execute() {
        scene.reset();
        return text(
          'Canvas reset to a fresh state: no image, all adjustments 0, no rotation, no crop, no captions.',
        );
      },
    },
  ];
}

// --- Registration + dispatch --------------------------------------------------

/** Module-level guard: Vite HMR full-reloads main.ts, but belt-and-braces. */
let registered = false;

/**
 * Register every tool on the given ModelContext, wrapping each handler at
 * this single dispatch point:
 *  - scene errors (unknown text id / adjustment kind / aspect name, crop
 *    without an image) become instructive `Error: ...` response text — never
 *    a throw across the WebMCP boundary;
 *  - every call is reported to `onActivity` (best-effort: a broken feed can
 *    never fail a tool call);
 *  - clients that reject the optional `annotations` field get the tool
 *    re-registered without it (the failed attempt never landed, so no dup).
 * Returns the number of tools registered (0 on a repeat call — HMR guard).
 * The guard flag is set only AFTER the loop completes, so a mid-loop
 * registerTool throw leaves it unset and a retry can register cleanly.
 */
export function registerAll(
  mc: ModelContext,
  scene: Scene,
  onActivity: (e: ActivityEntry) => void,
): number {
  if (registered) return 0;

  const defs = toolDefs(scene);
  for (const def of defs) {
    const wrapped: ToolDef = {
      ...def,
      async execute(args) {
        const report = (ok: boolean, summary: string) => {
          try {
            onActivity({ at: new Date(), tool: def.name, args, ok, summary });
          } catch (feedErr) {
            console.error('[speakeasel] activity feed error (ignored):', feedErr);
          }
        };
        try {
          const response = await def.execute(args);
          report(true, response.content[0]?.text.split('\n')[0] ?? '');
          return response;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          report(false, message);
          return text(`Error: ${message}`);
        }
      },
    };
    try {
      mc.registerTool(wrapped);
    } catch (err) {
      if (wrapped.annotations === undefined) throw err;
      const { annotations: _annotations, ...bare } = wrapped;
      mc.registerTool(bare);
    }
  }

  registered = true; // post-loop, so a partial failure allows a clean retry
  return defs.length;
}
