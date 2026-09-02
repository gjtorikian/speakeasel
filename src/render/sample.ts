import { Circle, Ellipse, FabricText, Gradient, Rect, StaticCanvas } from 'fabric';

export const SAMPLE_WIDTH = 800;
export const SAMPLE_HEIGHT = 600;

let cached: string | null = null;

/**
 * Render the generated sample scene (gradient sky, sun, two hills, a title)
 * ONCE on a detached offscreen canvas — never on #easel, which the renderer
 * owns (Fabric throws on re-initializing an already-wrapped element) — and
 * return it as a PNG dataURL. "Load sample" then flows through the exact
 * same scene.loadImage path as uploads: one code path, and Fabric filters
 * apply to the sample identically.
 * All shapes are generated — no stock photos, zero licensing (per contract).
 */
export function sampleImageDataURL(): string {
  if (cached) return cached;

  const width = SAMPLE_WIDTH;
  const height = SAMPLE_HEIGHT;
  const canvas = new StaticCanvas(document.createElement('canvas'), { width, height });

  const sky = new Rect({
    left: 0,
    top: 0,
    width,
    height,
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
  cached = canvas.toDataURL({ format: 'png', multiplier: 1 });
  void canvas.dispose();
  return cached;
}
