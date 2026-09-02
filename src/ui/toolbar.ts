import { renderer } from '../render/renderer';
import { scene } from '../scene/scene';
import { ADJUSTMENT_LIMIT, ADJUSTMENTS, ASPECTS, type SceneState } from '../types';

// ---------------------------------------------------------------------------
// Toolbar: real <button>/<input> controls for every scene mutator. Pure UI —
// reads and writes scene state only; the one renderer touch is loadImageFile
// for uploads. Keyboard model: natural tab order (no roving tabindex — three
// of the children are range inputs whose arrow keys must keep adjusting the
// value); native <button>s handle Enter/Space; scene errors surface in the
// #editor-message live region.
// ---------------------------------------------------------------------------

let cleanup: (() => void) | null = null;

function button(label: string, onClick: () => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.addEventListener('click', () => {
    try {
      onClick();
    } catch (err) {
      // Scene throws on invalid input (e.g. crop before an image loads) —
      // surface it in the shared status line instead of the console only.
      const message = err instanceof Error ? err.message : String(err);
      showStatus(message);
    }
  });
  return el;
}

function group(label: string, ...children: HTMLElement[]): HTMLElement {
  const el = document.createElement('div');
  el.className = 'toolbar-group';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', label);
  el.append(...children);
  return el;
}

function showStatus(text: string | null): void {
  const el = document.querySelector<HTMLElement>('#editor-message');
  if (!el) return;
  el.textContent = text ?? '';
  el.hidden = text === null;
}

/** Build the toolbar into `mount`. Idempotent across HMR: re-running replaces DOM and re-subscribes once. */
export function initToolbar(mount: HTMLElement): void {
  cleanup?.();
  mount.replaceChildren();

  // --- Image: upload / sample ---
  const fileInput = document.querySelector<HTMLInputElement>('#file-input');
  const uploadBtn = button('Upload image', () => fileInput?.click());
  if (fileInput) {
    // Property assignment (not addEventListener) keeps HMR re-runs single-wired.
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file) void renderer.loadImageFile(file);
      fileInput.value = '';
    };
  }
  const sampleBtn = button('Load sample', () => scene.loadSample());

  // --- Adjustments: one labelled slider per kind ---
  const sliders = new Map<string, HTMLInputElement>();
  const sliderEls: HTMLElement[] = [];
  for (const kind of ADJUSTMENTS) {
    const label = document.createElement('label');
    label.className = 'slider';
    const caption = document.createElement('span');
    caption.textContent = kind;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(-ADJUSTMENT_LIMIT);
    input.max = String(ADJUSTMENT_LIMIT);
    input.step = '1';
    input.value = '0';
    // 'change' (release), not 'input': every mutation pushes a history
    // snapshot, and per-pixel slider events would flood the 50-entry cap.
    input.addEventListener('change', () => scene.setAdjustment(kind, input.valueAsNumber));
    label.append(caption, input);
    sliders.set(kind, input);
    sliderEls.push(label);
  }

  // --- Crop / rotate ---
  const cropButtons = ASPECTS.map((name) => button(name, () => scene.cropToAspect(name)));
  const clearCropBtn = button('Clear crop', () => scene.clearCrop());
  const rotateBtn = button('Rotate 90°', () =>
    scene.rotate((scene.getState().rotation + 90) % 360),
  );

  // --- Text ---
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = 'Caption text';
  textInput.setAttribute('aria-label', 'Caption text');
  const addTextBtn = button('Add text', () => {
    const value = textInput.value.trim();
    if (!value) return;
    scene.addText(value);
    textInput.value = '';
  });
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTextBtn.click();
  });

  // --- History / export ---
  const undoBtn = button('Undo', () => {
    if (!scene.undo()) showStatus('Nothing to undo.');
  });
  const redoBtn = button('Redo', () => {
    if (!scene.redo()) showStatus('Nothing to redo.');
  });
  const exportBtn = button('Export PNG', () => scene.requestExport());

  mount.append(
    group('image', uploadBtn, sampleBtn),
    group('adjustments', ...sliderEls),
    group('crop and rotate', ...cropButtons, clearCropBtn, rotateBtn),
    group('text', textInput, addTextBtn),
    group('history and export', undoBtn, redoBtn, exportBtn),
  );

  const sync = (s: SceneState): void => {
    // Disabling the focused button would silently drop keyboard focus to
    // <body> (a trap in effect: repeated Undo presses exhaust the history and
    // strand the user). Hand focus to a live neighbor first.
    if (document.activeElement === undoBtn && !s.canUndo) {
      (s.canRedo ? redoBtn : exportBtn).focus();
    } else if (document.activeElement === redoBtn && !s.canRedo) {
      (s.canUndo ? undoBtn : exportBtn).focus();
    }
    undoBtn.disabled = !s.canUndo;
    redoBtn.disabled = !s.canRedo;
    for (const kind of ADJUSTMENTS) {
      const input = sliders.get(kind)!;
      // Don't fight the user's in-flight drag.
      if (document.activeElement !== input) input.value = String(s.adjustments[kind]);
    }
  };
  const unsubscribe = scene.subscribe(sync);
  sync(scene.getState());

  cleanup = unsubscribe;
}
