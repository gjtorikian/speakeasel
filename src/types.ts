// ---------------------------------------------------------------------------
// Shared types + limits for the Speakeasel scene layer. Owned here so the
// scene store (Node-testable, Fabric-free) and the renderer (browser-only)
// agree on one vocabulary without importing each other.
// ---------------------------------------------------------------------------

/** Crop presets an agent (or the toolbar) can ask for by name. */
export const ASPECTS = ['square', '4:3', '16:9'] as const;
export type AspectName = (typeof ASPECTS)[number];

/** Width/height ratio for each named aspect. */
export const ASPECT_RATIOS: Record<AspectName, number> = {
  square: 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

/** The three MVP adjustments (blur/grayscale/sepia are Full tier — do not add). */
export const ADJUSTMENTS = ['brightness', 'contrast', 'saturation'] as const;
export type AdjustmentKind = (typeof ADJUSTMENTS)[number];

/** Adjustment values live in agent-friendly -100..100; the renderer scales to Fabric's -1..1. */
export const ADJUSTMENT_LIMIT = 100;

/** Snapshot history ring size: the 51st mutation evicts the oldest snapshot. */
export const HISTORY_CAP = 50;

/** Images with either axis above MAX_IMAGE_DIM are downscaled to DOWNSCALE_TO at load. */
export const MAX_IMAGE_DIM = 4096;
export const DOWNSCALE_TO = 2048;

export const TEXT_SIZE_MIN = 8;
export const TEXT_SIZE_MAX = 200;
export const DEFAULT_TEXT_SIZE = 32;
export const DEFAULT_TEXT_COLOR = '#ffffff';

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
}

/** Crop rectangle in percent coordinates (0..100) of the unrotated image. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A caption. x/y are percent coordinates (0..100) of the text center on the visible canvas. */
export interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

/** The background image: dataURL never leaves the tab; width/height are natural pixels. */
export interface ImageMeta {
  name: string;
  dataURL: string;
  width: number;
  height: number;
}

export interface SceneState {
  image: ImageMeta | null;
  /** -100..100 each; clamped, never thrown. */
  adjustments: Adjustments;
  /** Degrees, normalized into 0..359. */
  rotation: number;
  /** Percent coords in UNROTATED image space, or null = no crop. Crop applies before rotation. */
  crop: CropRect | null;
  texts: TextObject[];
  /** Monotonic counter bumped by requestExport(); the renderer diffs it and downloads. Not undoable. */
  exportRequests: number;
  canUndo: boolean;
  canRedo: boolean;
}
