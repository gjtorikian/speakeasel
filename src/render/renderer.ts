import { Canvas, FabricImage, FabricText, filters, type FabricObject } from 'fabric';
import { scene } from '../scene/scene';
import { DOWNSCALE_TO, MAX_IMAGE_DIM, type SceneState } from '../types';

// ---------------------------------------------------------------------------
// Renderer: projects scene state onto Fabric — the sole owner of the #easel
// Canvas. No state of its own beyond Fabric handles; every visual is a
// function of scene.getState(). Reverse path: human drags fire
// object:moving/modified -> scene.moveObject(..., { fromRenderer: true })
// (coalesced to one history entry per drag, echo render skipped).
// Consumed by src/main.ts and src/ui/toolbar.ts (loadImageFile) only;
// never import this from the scene layer or tools.
// ---------------------------------------------------------------------------

const CANVAS_MAX_W = 800;
const CANVAS_MAX_H = 600;

type CaptionObject = FabricText & { speakeaselId?: string };

interface RendererHandles {
  canvas: Canvas;
  unsubscribe: () => void;
  image: FabricImage | null;
  /** dataURL identity of the currently loaded (or loading) Fabric image. */
  imageKey: string | null;
  texts: Map<string, CaptionObject>;
  lastExportCount: number;
}

let handles: RendererHandles | null = null;

/** Set just before a reverse-sync scene call so applyState skips its own echo. */
let suppressEcho = false;

// ---------------------------------------------------------------------------
// Layout: fit the visible region (crop rect in unrotated image space, or the
// whole image) into the 800x600 display box. Crop applies BEFORE rotation —
// rotating afterwards spins the image under the canvas-aligned crop window.
// ---------------------------------------------------------------------------

interface Layout {
  canvasW: number;
  canvasH: number;
  dispScale: number;
  cropX: number;
  cropY: number;
}

function layout(s: SceneState): Layout {
  if (!s.image) {
    return { canvasW: CANVAS_MAX_W, canvasH: CANVAS_MAX_H, dispScale: 1, cropX: 0, cropY: 0 };
  }
  const { width, height } = s.image;
  const visW = Math.max(1, s.crop ? (s.crop.width / 100) * width : width);
  const visH = Math.max(1, s.crop ? (s.crop.height / 100) * height : height);
  const cropX = s.crop ? (s.crop.x / 100) * width : 0;
  const cropY = s.crop ? (s.crop.y / 100) * height : 0;
  const dispScale = Math.min(CANVAS_MAX_W / visW, CANVAS_MAX_H / visH);
  return {
    canvasW: Math.round(visW * dispScale),
    canvasH: Math.round(visH * dispScale),
    dispScale,
    cropX,
    cropY,
  };
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

function project(s: SceneState): void {
  if (!handles) return;
  const { canvas } = handles;
  const box = layout(s);
  canvas.setDimensions({ width: box.canvasW, height: box.canvasH });

  if (handles.image && s.image) {
    const img = handles.image;
    img.set({
      originX: 'center',
      originY: 'center',
      left: (s.image.width / 2 - box.cropX) * box.dispScale,
      top: (s.image.height / 2 - box.cropY) * box.dispScale,
      scaleX: box.dispScale,
      scaleY: box.dispScale,
      angle: s.rotation,
      selectable: false,
      evented: false,
    });
    // Rebuild the filters array on EVERY image-adjacent change (never patch in
    // place — stale filters are the "UI lies about state" failure mode).
    // Scene values are -100..100; Fabric filters take -1..1: divide by 100
    // here, at the renderer boundary only.
    img.filters = [
      new filters.Brightness({ brightness: s.adjustments.brightness / 100 }),
      new filters.Contrast({ contrast: s.adjustments.contrast / 100 }),
      new filters.Saturation({ saturation: s.adjustments.saturation / 100 }),
    ];
    img.applyFilters();
    img.setCoords();
  }

  // Reconcile captions by id: add/update/remove.
  const seen = new Set<string>();
  for (const t of s.texts) {
    seen.add(t.id);
    let obj = handles.texts.get(t.id);
    if (!obj) {
      obj = new FabricText(t.text) as CaptionObject;
      obj.speakeaselId = t.id;
      obj.set({ hasControls: false, fontFamily: 'system-ui, sans-serif' });
      handles.texts.set(t.id, obj);
      canvas.add(obj);
    }
    obj.set({
      text: t.text,
      originX: 'center',
      originY: 'center',
      left: (t.x / 100) * box.canvasW,
      top: (t.y / 100) * box.canvasH,
      fontSize: t.size,
      fill: t.color,
    });
    obj.setCoords();
  }
  for (const [id, obj] of handles.texts) {
    if (!seen.has(id)) {
      canvas.remove(obj);
      handles.texts.delete(id);
    }
  }

  canvas.requestRenderAll();
}

function applyState(s: SceneState): void {
  if (!handles) return;

  // Export first: it must fire even on the echo-suppressed notify.
  if (s.exportRequests !== handles.lastExportCount) {
    const bumped = s.exportRequests > handles.lastExportCount;
    handles.lastExportCount = s.exportRequests;
    if (bumped) exportPNG(s);
  }

  if (suppressEcho) {
    // This notify is the echo of our own reverse-sync; re-projecting would
    // snap the object mid-drag. Skip exactly once.
    suppressEcho = false;
    return;
  }

  if (!s.image) {
    if (handles.image) {
      handles.canvas.remove(handles.image);
      handles.image = null;
    }
    handles.imageKey = null;
    project(s);
    return;
  }

  if (s.image.dataURL !== handles.imageKey) {
    const key = s.image.dataURL;
    handles.imageKey = key;
    FabricImage.fromURL(key)
      .then((img) => {
        // Guard the async gap: a newer image (or dispose) may have won.
        if (!handles || handles.imageKey !== key) return;
        if (handles.image) handles.canvas.remove(handles.image);
        handles.image = img;
        handles.canvas.add(img);
        handles.canvas.sendObjectToBack(img);
        project(scene.getState());
      })
      .catch((err: unknown) => {
        console.error('[speakeasel] image load failed:', err);
        showMessage('Could not load that image.');
      });
    return;
  }

  project(s);
}

// ---------------------------------------------------------------------------
// Reverse sync (human gestures -> scene)
// ---------------------------------------------------------------------------

function syncObjectPosition(target: FabricObject | undefined, final: boolean): void {
  if (!handles || !target) return;
  const id = (target as CaptionObject).speakeaselId;
  if (!id) return;
  const xPct = (target.left / handles.canvas.getWidth()) * 100;
  const yPct = (target.top / handles.canvas.getHeight()) * 100;
  suppressEcho = true;
  try {
    scene.moveObject(id, xPct, yPct, { fromRenderer: true });
  } catch (err) {
    suppressEcho = false;
    console.error('[speakeasel] reverse sync failed:', err);
  }
  if (final) scene.endGesture(); // close the coalesced history entry on release
}

// ---------------------------------------------------------------------------
// Upload / drag-drop (the photo never leaves the tab)
// ---------------------------------------------------------------------------

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

function loadHTMLImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = url;
  });
}

/** Downscale images over MAX_IMAGE_DIM on either axis to DOWNSCALE_TO (canvas perf + dataURL size). */
function normalizeImage(
  img: HTMLImageElement,
  rawURL: string,
): { dataURL: string; width: number; height: number } {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= MAX_IMAGE_DIM && h <= MAX_IMAGE_DIM) return { dataURL: rawURL, width: w, height: h };
  const scale = DOWNSCALE_TO / Math.max(w, h);
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);
  const el = document.createElement('canvas');
  el.width = outW;
  el.height = outH;
  el.getContext('2d')!.drawImage(img, 0, 0, outW, outH);
  return { dataURL: el.toDataURL('image/jpeg', 0.92), width: outW, height: outH };
}

/**
 * Validate + read a user-supplied file and load it into the scene. Non-image
 * files are rejected with a visible message and the scene stays untouched.
 * Used by the toolbar's file input and the canvas drop target.
 */
async function loadImageFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    showMessage(`"${file.name}" is not an image file — drop a photo instead.`);
    return;
  }
  try {
    const rawURL = await readFileAsDataURL(file);
    const img = await loadHTMLImage(rawURL);
    const { dataURL, width, height } = normalizeImage(img, rawURL);
    scene.loadImage({ name: file.name, dataURL, width, height });
    showMessage(null);
  } catch (err) {
    console.error('[speakeasel] upload failed:', err);
    showMessage(`Could not load "${file.name}".`);
  }
}

function showMessage(text: string | null): void {
  const el = document.querySelector<HTMLElement>('#editor-message');
  if (!el) return;
  el.textContent = text ?? '';
  el.hidden = text === null;
}

function onDragOver(event: DragEvent): void {
  event.preventDefault();
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file) void loadImageFile(file);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function exportPNG(s: SceneState): void {
  if (!handles) return;
  const box = layout(s);
  const dataURL = handles.canvas.toDataURL({
    format: 'png',
    // Scale back up to the image's natural resolution (display is downscaled to fit 800x600).
    multiplier: s.image ? 1 / box.dispScale : 1,
  });
  const anchor = document.createElement('a');
  anchor.href = dataURL;
  anchor.download = 'speakeasel.png';
  anchor.click();
}

// ---------------------------------------------------------------------------
// Engine surface
// ---------------------------------------------------------------------------

export const renderer = {
  /** Wrap #easel in a Fabric Canvas, wire gestures + drop target, subscribe to the scene. Idempotent. */
  init(el: HTMLCanvasElement): void {
    if (handles) return;
    const canvas = new Canvas(el, {
      width: CANVAS_MAX_W,
      height: CANVAS_MAX_H,
      preserveObjectStacking: true,
      selection: false,
    });
    canvas.on('object:moving', (e) => syncObjectPosition(e.target, false));
    canvas.on('object:modified', (e) => syncObjectPosition(e.target, true));
    canvas.wrapperEl.addEventListener('dragover', onDragOver);
    canvas.wrapperEl.addEventListener('drop', onDrop);
    const unsubscribe = scene.subscribe(applyState);
    handles = {
      canvas,
      unsubscribe,
      image: null,
      imageKey: null,
      texts: new Map(),
      lastExportCount: scene.getState().exportRequests,
    };
    applyState(scene.getState());
    console.log('[speakeasel] renderer initialized');
  },

  dispose(): void {
    if (!handles) return;
    handles.unsubscribe();
    handles.canvas.wrapperEl.removeEventListener('dragover', onDragOver);
    handles.canvas.wrapperEl.removeEventListener('drop', onDrop);
    void handles.canvas.dispose();
    handles = null;
    suppressEcho = false;
  },

  loadImageFile,
};

export type Renderer = typeof renderer;
