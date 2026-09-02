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

function render(mount: HTMLElement, s: SceneState): void {
  const heading = document.createElement('h2');
  heading.textContent = 'Scene objects';

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
    const label = document.createElement('span');
    label.textContent = `${t.id}: “${t.text}” at (${pct(t.x)}, ${pct(t.y)})`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${t.id}`);
    remove.addEventListener('click', () => scene.removeObject(t.id));
    row.append(label, remove);
    list.append(row);
  }

  mount.replaceChildren(heading, list);
}

/** Build the object-list panel into `mount`. Idempotent across HMR re-runs. */
export function initObjectList(mount: HTMLElement): void {
  cleanup?.();
  const onState = (s: SceneState): void => render(mount, s);
  const unsubscribe = scene.subscribe(onState);
  onState(scene.getState());
  cleanup = unsubscribe;
}
