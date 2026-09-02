import {
  ADJUSTMENT_LIMIT,
  ADJUSTMENTS,
  ASPECTS,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
} from '../types';

// ---------------------------------------------------------------------------
// JSON Schemas for every tool input. Standard draft-07 vocabulary only —
// the contract suite compiles each one under ajv strict mode, which rejects
// unknown keywords. Every schema is `type: 'object'` with
// `additionalProperties: false` (the Phase 1 convention).
//
// Numeric min/max here document the editing ranges for the agent; the scene
// store still clamps out-of-range numbers at runtime, so a tool call never
// fails on a number. `crop`'s aspect-XOR-rect rule is enforced in the handler
// (not with schema oneOf) so every tool keeps the flat
// additionalProperties:false shape the suite asserts.
// ---------------------------------------------------------------------------

const EMPTY = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

const percent = (description: string) => ({
  type: 'number',
  minimum: 0,
  maximum: 100,
  description,
});

export const schemas: Record<string, Record<string, unknown>> = {
  get_canvas_state: EMPTY,
  describe_canvas: EMPTY,
  load_sample_image: EMPTY,
  clear_crop: EMPTY,
  undo: EMPTY,
  redo: EMPTY,
  export_png: EMPTY,
  reset_canvas: EMPTY,

  set_adjustment: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: [...ADJUSTMENTS],
        description: 'Which adjustment to set.',
      },
      value: {
        type: 'number',
        minimum: -ADJUSTMENT_LIMIT,
        maximum: ADJUSTMENT_LIMIT,
        description:
          'Adjustment value, -100..100 (0 is neutral; out-of-range values clamp).',
      },
    },
    required: ['kind', 'value'],
    additionalProperties: false,
  },

  crop: {
    type: 'object',
    properties: {
      aspect: {
        type: 'string',
        enum: [...ASPECTS],
        description: 'Named centered crop preset. Provide aspect OR rect, not both.',
      },
      rect: {
        type: 'object',
        properties: {
          x: percent('Left edge, percent of the unrotated image width.'),
          y: percent('Top edge, percent of the unrotated image height.'),
          width: percent('Width in percent (clamps to stay inside the frame).'),
          height: percent('Height in percent (clamps to stay inside the frame).'),
        },
        required: ['x', 'y', 'width', 'height'],
        additionalProperties: false,
        description:
          'Explicit crop region in percent coordinates (0-100) of the unrotated image. Provide rect OR aspect, not both.',
      },
    },
    additionalProperties: false,
  },

  rotate: {
    type: 'object',
    properties: {
      degrees: {
        type: 'number',
        description:
          'Absolute rotation in degrees. Any value normalizes into 0-359 (e.g. -90 becomes 270).',
      },
    },
    required: ['degrees'],
    additionalProperties: false,
  },

  add_text: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Caption text.' },
      x: percent('Horizontal center in percent (0 = left edge, 100 = right). Default 50.'),
      y: percent('Vertical center in percent (0 = top edge, 100 = bottom). Default 50.'),
      size: {
        type: 'number',
        minimum: TEXT_SIZE_MIN,
        maximum: TEXT_SIZE_MAX,
        description: `Font size in px (${TEXT_SIZE_MIN}-${TEXT_SIZE_MAX}; clamps). Default 32.`,
      },
      color: {
        type: 'string',
        description: "CSS color, e.g. '#ffffff' (the default) or 'tomato'.",
      },
    },
    required: ['text'],
    additionalProperties: false,
  },

  edit_text: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: "Caption id, e.g. 'text-1' (list ids with get_canvas_state).",
      },
      text: { type: 'string', description: 'New caption text.' },
      size: {
        type: 'number',
        minimum: TEXT_SIZE_MIN,
        maximum: TEXT_SIZE_MAX,
        description: `New font size in px (${TEXT_SIZE_MIN}-${TEXT_SIZE_MAX}; clamps).`,
      },
      color: { type: 'string', description: "New CSS color, e.g. '#ffdd00'." },
    },
    required: ['id'],
    additionalProperties: false,
  },

  move_object: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: "Caption id, e.g. 'text-1' (list ids with get_canvas_state).",
      },
      x: percent('New horizontal center in percent (0 = left, 100 = right; clamps).'),
      y: percent('New vertical center in percent (0 = top, 100 = bottom; clamps).'),
    },
    required: ['id', 'x', 'y'],
    additionalProperties: false,
  },

  remove_object: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: "Caption id to remove, e.g. 'text-1'.",
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
};
