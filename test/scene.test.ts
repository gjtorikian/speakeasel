import { beforeEach, describe, expect, it } from 'vitest';
import { registerSampleSource, scene } from '../src/scene/scene';
import { HISTORY_CAP, type ImageMeta } from '../src/types';

const image = (over: Partial<ImageMeta> = {}): ImageMeta => ({
  name: 'photo.jpg',
  dataURL: 'data:image/png;base64,AAAA',
  width: 1600,
  height: 900,
  ...over,
});

beforeEach(() => {
  scene.reset();
});

describe('scene smoke', () => {
  it('exposes the default state', () => {
    const s = scene.getState();
    expect(s.image).toBeNull();
    expect(s.adjustments).toEqual({ brightness: 0, contrast: 0, saturation: 0 });
    expect(s.rotation).toBe(0);
    expect(s.crop).toBeNull();
    expect(s.texts).toEqual([]);
    expect(s.exportRequests).toBe(0);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });
});

describe('loadImage / loadSample', () => {
  it('stores the image and resets adjustments, rotation, and crop', () => {
    scene.loadImage(image());
    scene.setAdjustment('brightness', 40);
    scene.rotate(90);
    scene.cropToAspect('square');
    scene.loadImage(image({ name: 'next.jpg', dataURL: 'data:image/png;base64,BBBB' }));
    const s = scene.getState();
    expect(s.image?.name).toBe('next.jpg');
    expect(s.adjustments).toEqual({ brightness: 0, contrast: 0, saturation: 0 });
    expect(s.rotation).toBe(0);
    expect(s.crop).toBeNull();
  });

  it('keeps captions across an image swap', () => {
    scene.loadImage(image());
    scene.addText('keep me');
    scene.loadImage(image({ name: 'next.jpg' }));
    expect(scene.getState().texts.map((t) => t.text)).toEqual(['keep me']);
  });

  it('loadSample flows through loadImage via the registered source', () => {
    registerSampleSource(() => image({ name: 'sample.png' }));
    scene.loadSample();
    expect(scene.getState().image?.name).toBe('sample.png');
    expect(scene.getState().canUndo).toBe(true);
  });
});

describe('adjustments', () => {
  it('clamps values into -100..100', () => {
    scene.setAdjustment('brightness', 250);
    expect(scene.getState().adjustments.brightness).toBe(100);
    scene.setAdjustment('brightness', -101);
    expect(scene.getState().adjustments.brightness).toBe(-100);
    scene.setAdjustment('contrast', 33);
    expect(scene.getState().adjustments.contrast).toBe(33);
  });

  it('collapses non-finite input to the clamp minimum', () => {
    scene.setAdjustment('saturation', Number.NaN);
    expect(scene.getState().adjustments.saturation).toBe(-100);
    scene.setAdjustment('saturation', Number.POSITIVE_INFINITY);
    expect(scene.getState().adjustments.saturation).toBe(-100);
  });

  it('rejects unknown kinds with the valid list', () => {
    expect(() => scene.setAdjustment('blur', 10)).toThrow(/brightness, contrast, saturation/);
    expect(() => scene.setAdjustment('blur', 10)).toThrow(/blur/);
  });
});

describe('rotation', () => {
  it('normalizes into 0..359', () => {
    scene.rotate(90);
    expect(scene.getState().rotation).toBe(90);
    scene.rotate(360);
    expect(scene.getState().rotation).toBe(0);
    scene.rotate(450);
    expect(scene.getState().rotation).toBe(90);
    scene.rotate(-90);
    expect(scene.getState().rotation).toBe(270);
  });

  it('collapses non-finite degrees to 0', () => {
    scene.rotate(Number.NaN);
    expect(scene.getState().rotation).toBe(0);
  });
});

describe('crop', () => {
  it('square on a 1600x900 landscape yields a centered 56.25%-wide rect', () => {
    scene.loadImage(image({ width: 1600, height: 900 }));
    scene.cropToAspect('square');
    const crop = scene.getState().crop!;
    expect(crop.width).toBeCloseTo(56.25);
    expect(crop.height).toBe(100);
    expect(crop.x).toBeCloseTo(21.875);
    expect(crop.y).toBe(0);
  });

  it('square on a 900x1600 portrait shrinks the other axis', () => {
    scene.loadImage(image({ width: 900, height: 1600 }));
    scene.cropToAspect('square');
    const crop = scene.getState().crop!;
    expect(crop.height).toBeCloseTo(56.25);
    expect(crop.width).toBe(100);
    expect(crop.y).toBeCloseTo(21.875);
    expect(crop.x).toBe(0);
  });

  it('16:9 on a 1600x900 image is the full frame', () => {
    scene.loadImage(image({ width: 1600, height: 900 }));
    scene.cropToAspect('16:9');
    expect(scene.getState().crop).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('rejects unknown aspects with the valid list', () => {
    scene.loadImage(image());
    expect(() => scene.cropToAspect('panorama')).toThrow(/square, 4:3, 16:9/);
  });

  it('throws when no image is loaded', () => {
    expect(() => scene.cropToAspect('square')).toThrow(/No image loaded/);
  });

  it('cropRect clamps into the frame', () => {
    scene.loadImage(image());
    scene.cropRect({ x: -10, y: 50, width: 200, height: 80 });
    expect(scene.getState().crop).toEqual({ x: 0, y: 50, width: 100, height: 50 });
  });

  it('clearCrop removes the rect', () => {
    scene.loadImage(image());
    scene.cropToAspect('square');
    scene.clearCrop();
    expect(scene.getState().crop).toBeNull();
  });
});

describe('text lifecycle', () => {
  it('assigns stable sequential ids with defaults', () => {
    const first = scene.addText('hello');
    const second = scene.addText('world', { x: 10, y: 90, size: 48, color: '#ff0000' });
    expect(first).toBe('text-1');
    expect(second).toBe('text-2');
    const [a, b] = scene.getState().texts;
    expect(a).toEqual({ id: 'text-1', text: 'hello', x: 50, y: 50, size: 32, color: '#ffffff' });
    expect(b).toEqual({ id: 'text-2', text: 'world', x: 10, y: 90, size: 48, color: '#ff0000' });
  });

  it('clamps addText position and size', () => {
    scene.addText('clamped', { x: 150, y: -10, size: 9000 });
    const t = scene.getState().texts[0];
    expect(t.x).toBe(100);
    expect(t.y).toBe(0);
    expect(t.size).toBe(200);
  });

  it('editText patches fields and clamps numerics', () => {
    scene.addText('hello');
    scene.editText('text-1', { text: 'edited', x: 120, size: 1 });
    const t = scene.getState().texts[0];
    expect(t.text).toBe('edited');
    expect(t.x).toBe(100);
    expect(t.size).toBe(8);
    expect(t.color).toBe('#ffffff');
  });

  it('moveObject clamps x/y into 0..100', () => {
    scene.addText('hello');
    scene.moveObject('text-1', -5, 105);
    const t = scene.getState().texts[0];
    expect(t.x).toBe(0);
    expect(t.y).toBe(100);
  });

  it('removeObject deletes the caption', () => {
    scene.addText('hello');
    scene.addText('world');
    scene.removeObject('text-1');
    expect(scene.getState().texts.map((t) => t.id)).toEqual(['text-2']);
  });

  it('rejects unknown ids listing the current ones', () => {
    scene.addText('hello');
    expect(() => scene.editText('text-9', {})).toThrow(/text-1/);
    expect(() => scene.moveObject('text-9', 0, 0)).toThrow(/text-9/);
  });

  it('gives a useful error when no texts exist', () => {
    expect(() => scene.removeObject('text-1')).toThrow(/no text objects exist/);
  });
});

describe('undo/redo', () => {
  it('undo on empty history returns false without throwing', () => {
    expect(scene.undo()).toBe(false);
    expect(scene.redo()).toBe(false);
  });

  it('undo removes an added text and flips the flags', () => {
    scene.addText('hello');
    expect(scene.getState().canUndo).toBe(true);
    expect(scene.undo()).toBe(true);
    const s = scene.getState();
    expect(s.texts).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(true);
  });

  it('redo restores the undone mutation', () => {
    scene.addText('hello');
    scene.undo();
    expect(scene.redo()).toBe(true);
    const s = scene.getState();
    expect(s.texts.map((t) => t.text)).toEqual(['hello']);
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it('a new mutation after undo clears the redo stack', () => {
    scene.addText('hello');
    scene.undo();
    scene.rotate(90);
    expect(scene.getState().canRedo).toBe(false);
    expect(scene.redo()).toBe(false);
  });

  it('undo then addText reuses the freed id', () => {
    scene.addText('hello');
    scene.undo();
    expect(scene.addText('again')).toBe('text-1');
  });

  it(`caps history at ${HISTORY_CAP} snapshots`, () => {
    for (let i = 0; i < HISTORY_CAP + 5; i += 1) scene.rotate(i);
    let undos = 0;
    while (scene.undo()) undos += 1;
    expect(undos).toBe(HISTORY_CAP);
  });
});

describe('fromRenderer coalescing', () => {
  it('coalesces a drag into one history entry', () => {
    scene.addText('hello');
    scene.moveObject('text-1', 10, 10, { fromRenderer: true });
    scene.moveObject('text-1', 20, 20, { fromRenderer: true });
    scene.moveObject('text-1', 30, 30, { fromRenderer: true });
    scene.endGesture();
    expect(scene.undo()).toBe(true);
    const t = scene.getState().texts[0];
    expect([t.x, t.y]).toEqual([50, 50]); // whole drag reverted in one step
  });

  it('separate drags of the same object get separate entries', () => {
    scene.addText('hello');
    scene.moveObject('text-1', 10, 10, { fromRenderer: true });
    scene.endGesture();
    scene.moveObject('text-1', 20, 20, { fromRenderer: true });
    scene.endGesture();
    scene.undo();
    expect(scene.getState().texts[0].x).toBe(10);
    scene.undo();
    expect(scene.getState().texts[0].x).toBe(50);
  });

  it('a plain moveObject never coalesces', () => {
    scene.addText('hello');
    scene.moveObject('text-1', 10, 10);
    scene.moveObject('text-1', 20, 20);
    scene.undo();
    expect(scene.getState().texts[0].x).toBe(10);
  });
});

describe('export requests', () => {
  it('increments the counter without touching history', () => {
    scene.requestExport();
    const s = scene.getState();
    expect(s.exportRequests).toBe(1);
    expect(s.canUndo).toBe(false);
  });

  it('survives undo (exporting is not undoable)', () => {
    scene.requestExport();
    scene.addText('hello');
    scene.undo();
    expect(scene.getState().exportRequests).toBe(1);
  });
});

describe('history snapshots share dataURL references', () => {
  it('keeps the same ImageMeta reference across mutations and undo', () => {
    scene.loadImage(image());
    const ref = scene.getState().image;
    scene.rotate(90);
    scene.addText('hello');
    expect(scene.getState().image).toBe(ref);
    scene.undo();
    expect(scene.getState().image).toBe(ref);
  });
});

describe('subscription', () => {
  it('fires once per mutation and stops after unsubscribe', () => {
    let calls = 0;
    const unsubscribe = scene.subscribe(() => {
      calls += 1;
    });
    scene.rotate(90);
    scene.addText('hello');
    expect(calls).toBe(2);
    unsubscribe();
    scene.rotate(180);
    expect(calls).toBe(2);
  });

  it('passes the new state to subscribers', () => {
    let seen: number | undefined;
    const unsubscribe = scene.subscribe((s) => {
      seen = s.rotation;
    });
    scene.rotate(45);
    expect(seen).toBe(45);
    unsubscribe();
  });
});

describe('reset', () => {
  it('returns deep-equal to the initial state and clears history', () => {
    const initial = structuredClone(scene.getState());
    scene.loadImage(image());
    scene.setAdjustment('contrast', 50);
    scene.rotate(90);
    scene.cropToAspect('square');
    scene.addText('hello');
    scene.requestExport();
    scene.reset();
    expect(scene.getState()).toEqual(initial);
    expect(scene.undo()).toBe(false);
    expect(scene.redo()).toBe(false);
  });
});

describe('immutability (dev deep-freeze)', () => {
  it('getState() is deep-frozen under vitest', () => {
    scene.addText('hello');
    const s = scene.getState();
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.texts)).toBe(true);
    expect(() => {
      (s.texts as { text: string }[])[0].text = 'mutated';
    }).toThrow();
  });
});
