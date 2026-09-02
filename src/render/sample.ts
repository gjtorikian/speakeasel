import { Canvas, Circle, Ellipse, FabricText, Gradient, Rect } from 'fabric';

/**
 * Mount a Fabric canvas on the given element and draw the generated sample
 * scene (gradient sky, sun, two hills, a title) so the easel is never blank.
 * All shapes are generated — no stock photos, zero licensing (per contract).
 * This doubles as the Fabric v7 smoke test for the walking skeleton.
 */
export function drawSampleScene(el: HTMLCanvasElement): Canvas {
  const width = 800;
  const height = 600;
  const canvas = new Canvas(el, { width, height });

  const sky = new Rect({
    left: 0,
    top: 0,
    width,
    height,
    selectable: false,
    evented: false,
    fill: new Gradient({
      type: 'linear',
      gradientUnits: 'pixels',
      coords: { x1: 0, y1: 0, x2: 0, y2: height },
      colorStops: [
        { offset: 0, color: '#1a365d' },
        { offset: 0.6, color: '#2b6cb0' },
        { offset: 1, color: '#f6ad55' },
      ],
    }),
  });

  const sun = new Circle({
    left: 540,
    top: 90,
    radius: 70,
    fill: '#fefcbf',
  });

  const backHill = new Ellipse({
    left: -220,
    top: 420,
    rx: 520,
    ry: 200,
    fill: '#276749',
  });

  const frontHill = new Ellipse({
    left: 220,
    top: 470,
    rx: 560,
    ry: 220,
    fill: '#2f855a',
  });

  const title = new FabricText('Speakeasel', {
    left: 40,
    top: 40,
    fontFamily: 'system-ui, sans-serif',
    fontSize: 48,
    fill: '#f7fafc',
  });

  canvas.add(sky, sun, backHill, frontHill, title);
  canvas.renderAll();
  return canvas;
}
