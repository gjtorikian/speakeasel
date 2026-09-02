import {
  ADJUSTMENT_LIMIT,
  ADJUSTMENTS,
  ASPECT_RATIOS,
  ASPECTS,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SIZE,
  HISTORY_CAP,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  type AdjustmentKind,
  type AspectName,
  type CropRect,
  type ImageMeta,
  type SceneState,
  type TextObject,
} from '../types';

// ---------------------------------------------------------------------------
// Scene store: the single source of truth for the easel. Pure data + mutators
// + snapshot history — Fabric-free by design so the whole layer runs in Node
// (this module must never import fabric or touch the DOM). The renderer is a
// subscriber that projects this state; Phase 3's WebMCP tools call these
// exact mutators (frozen forward contract — do not rename or change
// signatures). Numeric out-of-range input clamps silently; invalid
// identifiers (unknown text id, adjustment kind, aspect name) throw an Error
// whose message lists the valid values.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function assertAdjustment(kind: string): asserts kind is AdjustmentKind {
  if (!(ADJUSTMENTS as readonly string[]).includes(kind)) {
    throw new Error(
      `Unknown adjustment '${kind}'. Valid adjustments: ${ADJUSTMENTS.join(', ')}.`,
    );
  }
}

function assertAspect(name: string): asserts name is AspectName {
  if (!(ASPECTS as readonly string[]).includes(name)) {
    throw new Error(`Unknown aspect '${name}'. Valid aspects: ${ASPECTS.join(', ')}.`);
  }
}

function assertTextId(id: string): TextObject {
  const found = state.texts.find((t) => t.id === id);
  if (!found) {
    const ids = state.texts.map((t) => t.id).join(', ');
    throw new Error(
      `Unknown text id '${id}'. Valid ids: ${ids || '(none — no text objects exist)'}.`,
    );
  }
  return found;
}

/** Clamp a number into [min, max]; non-finite input collapses to min. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampPercent(value: number): number {
  return clamp(value, 0, 100);
}

/** Normalize degrees into 0..359 (wraps negatives and >=360; non-finite -> 0). */
function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------
// State + snapshot history
// ---------------------------------------------------------------------------

function createInitialState(): SceneState {
  return {
    image: null,
    adjustments: { brightness: 0, contrast: 0, saturation: 0 },
    rotation: 0,
    crop: null,
    texts: [],
    exportRequests: 0,
    canUndo: false,
    canRedo: false,
  };
}

const IS_DEV: boolean = import.meta.env?.DEV ?? false;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * A history snapshot: the undoable fields plus the text-id counter, sharing
 * references with the live state (mutators never mutate in place, so shared
 * references — including the image dataURL string — are safe and cheap).
 * exportRequests is deliberately excluded: exporting is not undoable.
 */
interface Snapshot {
  image: ImageMeta | null;
  adjustments: SceneState['adjustments'];
  rotation: number;
  crop: CropRect | null;
  texts: TextObject[];
  nextTextId: number;
}

type Listener = (s: SceneState) => void;

let state: SceneState = IS_DEV ? deepFreeze(createInitialState()) : createInitialState();
const listeners = new Set<Listener>();
let nextTextId = 1;
const undoStack: Snapshot[] = [];
const redoStack: Snapshot[] = [];

/**
 * Coalescing key for renderer-originated gestures: while consecutive
 * mutations share a key (e.g. 'move:text-1' during a drag), only the first
 * pushes a history snapshot — undo then reverts the whole drag in one step.
 * Cleared by any keyless mutation, undo/redo, endGesture(), or reset().
 */
let coalesceKey: string | null = null;

/** Sample-image source, injected at boot (browser draws it; the scene layer stays Fabric-free). */
let sampleSource: (() => ImageMeta) | null = null;

export function registerSampleSource(source: () => ImageMeta): void {
  sampleSource = source;
}

function snapshot(): Snapshot {
  return {
    image: state.image,
    adjustments: state.adjustments,
    rotation: state.rotation,
    crop: state.crop,
    texts: state.texts,
    nextTextId,
  };
}

function commit(next: SceneState): void {
  state = IS_DEV ? deepFreeze(next) : next;
  for (const listener of [...listeners]) listener(state);
}

type UndoablePatch = Partial<
  Pick<SceneState, 'image' | 'adjustments' | 'rotation' | 'crop' | 'texts'>
>;

/**
 * Commit an undoable patch. Pushes a history snapshot (evicting the oldest
 * past HISTORY_CAP and clearing the redo stack) unless `coalesce` matches the
 * previous mutation's key.
 */
function apply(patch: UndoablePatch, opts: { coalesce?: string } = {}): void {
  const key = opts.coalesce ?? null;
  if (key === null || key !== coalesceKey) {
    undoStack.push(snapshot());
    if (undoStack.length > HISTORY_CAP) undoStack.shift();
    redoStack.length = 0;
  }
  coalesceKey = key;
  commit({ ...state, ...patch, canUndo: true, canRedo: false });
}

function restore(snap: Snapshot): void {
  nextTextId = snap.nextTextId;
  commit({
    ...state, // carries exportRequests — exporting is not undoable
    image: snap.image,
    adjustments: snap.adjustments,
    rotation: snap.rotation,
    crop: snap.crop,
    texts: snap.texts,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  });
}

function clampText(patch: Partial<Omit<TextObject, 'id'>>): Partial<Omit<TextObject, 'id'>> {
  const next: Partial<Omit<TextObject, 'id'>> = {};
  if (patch.text !== undefined) next.text = patch.text;
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.x !== undefined) next.x = clampPercent(patch.x);
  if (patch.y !== undefined) next.y = clampPercent(patch.y);
  if (patch.size !== undefined) next.size = clamp(patch.size, TEXT_SIZE_MIN, TEXT_SIZE_MAX);
  return next;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const scene = {
  getState(): Readonly<SceneState> {
    return state;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  /**
   * Load a new background image. Resets adjustments, rotation, and crop (a
   * new photo starts fresh) but keeps captions — they are percent-positioned
   * and survive the swap. Pushes history: undo restores the previous image
   * with its adjustments.
   */
  loadImage(meta: ImageMeta): void {
    apply({
      image: meta,
      adjustments: { brightness: 0, contrast: 0, saturation: 0 },
      rotation: 0,
      crop: null,
    });
  },

  /** Load the generated sample scene through the same path uploads take. */
  loadSample(): void {
    if (!sampleSource) {
      throw new Error('No sample image source registered (boot must call registerSampleSource).');
    }
    scene.loadImage(sampleSource());
  },

  /** Set one adjustment; value clamps into -100..100 (non-finite -> -100). */
  setAdjustment(kind: string, value: number): void {
    assertAdjustment(kind);
    apply({
      adjustments: {
        ...state.adjustments,
        [kind]: clamp(value, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
      },
    });
  },

  /**
   * Center-crop to a named aspect. The rect is computed in UNROTATED image
   * space (crop applies before rotation — rotating afterwards spins the image
   * under the crop window, it does not re-crop).
   */
  cropToAspect(name: string): void {
    assertAspect(name);
    if (!state.image) {
      throw new Error('No image loaded. Load an image before cropping to an aspect.');
    }
    const target = ASPECT_RATIOS[name];
    const imageRatio = state.image.width / state.image.height;
    let widthPct = 100;
    let heightPct = 100;
    if (imageRatio > target) {
      widthPct = (target / imageRatio) * 100; // landscape-er than target: shrink width
    } else {
      heightPct = (imageRatio / target) * 100; // portrait-er than target: shrink height
    }
    apply({
      crop: {
        x: (100 - widthPct) / 2,
        y: (100 - heightPct) / 2,
        width: widthPct,
        height: heightPct,
      },
    });
  },

  /** Set an explicit crop rect (percent, unrotated image space); values clamp into 0..100 and inside the frame. */
  cropRect(rect: CropRect): void {
    const x = clampPercent(rect.x);
    const y = clampPercent(rect.y);
    apply({
      crop: {
        x,
        y,
        width: clamp(rect.width, 0, 100 - x),
        height: clamp(rect.height, 0, 100 - y),
      },
    });
  },

  clearCrop(): void {
    apply({ crop: null });
  },

  /** Set the absolute rotation in degrees, normalized into 0..359. */
  rotate(degrees: number): void {
    apply({ rotation: normalizeRotation(degrees) });
  },

  /** Add a caption; returns its stable, agent-addressable id ('text-1', 'text-2', ...). */
  addText(
    text: string,
    opts: Partial<Pick<TextObject, 'x' | 'y' | 'size' | 'color'>> = {},
  ): string {
    const id = `text-${nextTextId}`;
    const created: TextObject = {
      id,
      text,
      x: clampPercent(opts.x ?? 50),
      y: clampPercent(opts.y ?? 50),
      size: clamp(opts.size ?? DEFAULT_TEXT_SIZE, TEXT_SIZE_MIN, TEXT_SIZE_MAX),
      color: opts.color ?? DEFAULT_TEXT_COLOR,
    };
    // Bump the counter before apply() snapshots: the snapshot captures the
    // pre-mutation counter, so undo -> addText reuses the freed id.
    const texts = [...state.texts, created];
    apply({ texts });
    nextTextId += 1;
    return id;
  },

  /** Patch a caption's text/position/size/color; numerics clamp; unknown id throws. */
  editText(id: string, patch: Partial<Omit<TextObject, 'id'>>): void {
    assertTextId(id);
    const clamped = clampText(patch);
    apply({ texts: state.texts.map((t) => (t.id === id ? { ...t, ...clamped } : t)) });
  },

  /**
   * Move a caption to (x, y) percent (clamped 0..100). With
   * `{ fromRenderer: true }` (human drags reverse-synced by the renderer)
   * consecutive moves of the same object coalesce into ONE history entry —
   * the renderer calls endGesture() on drag release to close it.
   */
  moveObject(id: string, x: number, y: number, opts: { fromRenderer?: boolean } = {}): void {
    assertTextId(id);
    const texts = state.texts.map((t) =>
      t.id === id ? { ...t, x: clampPercent(x), y: clampPercent(y) } : t,
    );
    apply({ texts }, opts.fromRenderer ? { coalesce: `move:${id}` } : {});
  },

  /** Close a coalesced renderer gesture so the next drag gets its own history entry. */
  endGesture(): void {
    coalesceKey = null;
  },

  removeObject(id: string): void {
    assertTextId(id);
    apply({ texts: state.texts.filter((t) => t.id !== id) });
  },

  /** @returns false when there is nothing to undo (the Phase 3 tool phrases it politely). */
  undo(): boolean {
    const prev = undoStack.pop();
    if (!prev) return false;
    redoStack.push(snapshot());
    coalesceKey = null;
    restore(prev);
    return true;
  },

  /** @returns false when there is nothing to redo. */
  redo(): boolean {
    const next = redoStack.pop();
    if (!next) return false;
    undoStack.push(snapshot());
    coalesceKey = null;
    restore(next);
    return true;
  },

  /** Ask the renderer to download the canvas as a PNG. Not undoable, no history entry. */
  requestExport(): void {
    commit({ ...state, exportRequests: state.exportRequests + 1 });
  },

  reset(): void {
    undoStack.length = 0;
    redoStack.length = 0;
    coalesceKey = null;
    nextTextId = 1;
    commit(createInitialState());
  },
};

export type Scene = typeof scene;
