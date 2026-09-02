import { scene } from '../scene/scene';
import type { SceneState } from '../types';

// ---------------------------------------------------------------------------
// Object list: the accessible, always-visible mirror of the scene graph —
// the sighted twin of Phase 3's describe_canvas tool. One row for the image,
// one per caption (content, position, remove). Re-rendered wholesale on
// every scene change; both directions stay in sync because the scene store
// is the only source of truth.
// ---------------------------------------------------------------------------

let cleanup: (() => void) | null = null;

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * `replaceChildren` destroys any focused row on every scene change (agent
 * edits re-render the list mid-walkthrough). Capture where keyboard focus was
 * before the wipe so render() can restore it: the same row by id, its
 * numeric successor if the row was removed, or the heading as a last resort —
 * never drop focus to <body>.
 */
function captureFocus(mount: HTMLElement): { id: string; onRemove: boolean } | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !mount.contains(active)) return null;
  const row = active.closest<HTMLElement>('li[data-id]');
  if (!row?.dataset.id) return null;
  return { id: row.dataset.id, onRemove: active.matches('button') };
}

function restoreFocus(
  mount: HTMLElement,
  heading: HTMLElement,
  prev: { id: string; onRemove: boolean },
): void {
  const rows = Array.from(mount.querySelectorAll<HTMLElement>('li[data-id]'));
  if (rows.length === 0) {
    heading.focus();
    return;
  }
  const exact = rows.find((r) => r.dataset.id === prev.id);
  const num = (id: string): number => Number(id.replace(/^text-/, ''));
  const target =
    exact ?? rows.find((r) => num(r.dataset.id!) > num(prev.id)) ?? rows[rows.length - 1];
  const removeBtn = target.querySelector<HTMLButtonElement>('button');
  if (prev.onRemove && removeBtn) removeBtn.focus();
  else target.focus();
}

function render(mount: HTMLElement, s: SceneState): void {
  const focused = captureFocus(mount);

  const heading = document.createElement('h2');
  heading.textContent = 'Scene objects';
  heading.tabIndex = -1; // focus landing spot when the last caption is removed

  const list = document.createElement('ul');

  const imageRow = document.createElement('li');
  if (s.image) {
    const label = document.createElement('span');
    const extras: string[] = [];
    if (s.rotation !== 0) extras.push(`rotated ${s.rotation}°`);
    if (s.crop) extras.push(`cropped to ${pct(s.crop.width)}×${pct(s.crop.height)}`);
    label.textContent =
      `Image: ${s.image.name} (${s.image.width}×${s.image.height})` +
      (extras.length ? ` — ${extras.join(', ')}` : '');
    imageRow.append(label);
  } else {
    imageRow.textContent = 'No image loaded — upload a photo or load the sample.';
  }
  list.append(imageRow);

  for (const t of s.texts) {
    const row = document.createElement('li');
    // Focusable row: a keyboard/screen-reader user can walk the scene graph
    // row by row; the row text carries the full description (caption, position).
    row.tabIndex = 0;
    row.dataset.id = t.id;
    const label = document.createElement('span');
    label.textContent = `${t.id}: “${t.text}” at (${pct(t.x)} across, ${pct(t.y)} down)`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${t.id}`);
    remove.addEventListener('click', () => scene.removeObject(t.id));
    row.append(label, remove);
    list.append(row);
  }

  mount.replaceChildren(heading, list);
  if (focused) restoreFocus(mount, heading, focused);
}

/** Build the object-list panel into `mount`. Idempotent across HMR re-runs. */
export function initObjectList(mount: HTMLElement): void {
  cleanup?.();
  const onState = (s: SceneState): void => render(mount, s);
  const unsubscribe = scene.subscribe(onState);
  onState(scene.getState());
  cleanup = unsubscribe;
}
