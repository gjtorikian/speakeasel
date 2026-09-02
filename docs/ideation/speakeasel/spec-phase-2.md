# Implementation Spec: Speakeasel - Phase 2 (The Editor)

**Contract**: ./contract.md
**Repo root**: `/Users/gjtorikian/Developer/speakeasel` — this project is its own git repository (NOT the outer `~/Developer` repo); `cd` here first and resolve every relative path in this spec against it.
**Estimated Effort**: L (~5h)

## Technical Approach

The credibility phase, built on the architecture the critics locked in: a **Fabric-free scene-state layer** (`src/scene/scene.ts`) is the single source of truth — pure data + mutators + history, testable in Node — and a **thin Fabric renderer** (`src/render/renderer.ts`) subscribes to it and draws. This is exactly Loopmate's store/Tone division (pattern: `/Users/gjtorikian/Developer/loopmate/src/state/store.ts` + `src/audio/engine.ts`): tools (Phase 3) and tests touch only the scene layer; Fabric exists solely to render state and to reverse-sync human gestures.

Scene state: one background image (name, natural dimensions, adjustments −100..100 for brightness/contrast/saturation, rotation in degrees, optional crop rect in **percent coordinates**) plus a list of text objects (id, text, x/y percent, size, color). Percent coordinates are deliberate — they're what an agent can reason about ("center ≈ 50,50") and they survive crops/resizes. History is a snapshot ring (cap 50) with undo/redo cursors; every mutator pushes a snapshot unless flagged `fromRenderer` mid-drag (drag pushes once on release).

The renderer reconciles rather than repaints blindly: image element + filter values map to Fabric `filters` (Brightness/Contrast/Saturation, values scaled to Fabric's −1..1), crop maps to the canvas viewport, texts reconcile by id. Human drags fire Fabric's `object:modified` → `scene.moveObject(id, xPct, yPct, { fromRenderer: true })` — the renderer skips its own echo via the flag. Upload (file input + drag-drop onto the canvas) reads the file to a dataURL locally — the photo never leaves the tab — and calls `scene.loadImage`.

## Decisions Considered and Rejected

_Carried from the contract (full log in spec-phase-1.md); the load-bearing ones here:_

- **Scene-state/renderer split** — rejected: behavioral fake; tools importing Fabric. Node tests run the real scene layer.
- **Static undo in MVP** — rejected: AbortSignal lifecycle (stretch). Undo answers "nothing to undo" when history is empty.
- **Blur/grayscale/sepia are Full tier** — rejected: six adjustments in MVP. Build brightness/contrast/saturation only; the Full tier is the cut line, not the default.
- **Generated sample scene** — rejected: stock photos. `load_sample_image` re-draws it; uploads bring real photos.
- **Fabric.js v7** — rejected: from-scratch/Konva/hosted.

## Feedback Strategy

**Inner-loop command**: `npx vitest run test/scene.test.ts`

**Playground**: Scene suite (written first) for all logic; `npm run dev` + browser for renderer/gesture audition.

**Why this approach**: Every editor behavior lives in the scene layer where tests run in milliseconds; the renderer is a projection whose only honest check is looking at it.

## File Changes

### New Files

| File Path               | Purpose                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| `src/types.ts`          | `SceneState`, `TextObject`, `Adjustments`, `CropRect`, `ASPECTS` ('square', '4:3', '16:9'), limits |
| `src/scene/scene.ts`    | The scene store: getState/subscribe + mutators + snapshot history + undo/redo  |
| `src/render/renderer.ts`| Fabric projection: image/filters/crop/texts reconciliation, drag reverse-sync, PNG export, upload/drop handling |
| `src/ui/toolbar.ts`     | Buttons/sliders: upload, sample, adjustments, crop presets, rotate, add text, undo/redo, export |
| `src/ui/objectlist.ts`  | Accessible object-list panel mirroring the scene graph (the sighted twin of describe_canvas) |
| `src/styles.css`        | Functional layout (dark polish in Phase 4)                                     |
| `test/scene.test.ts`    | Scene-layer unit suite                                                         |

### Modified Files

| File Path     | Changes                                                              |
| ------------- | --------------------------------------------------------------------- |
| `src/main.ts` | Boot scene → renderer → UI; keep hello tool + banner                  |
| `index.html`  | Toolbar/object-list mounts, file input, ARIA roles on chrome          |
| `src/render/sample.ts` | Rework: sample scene becomes `sampleImageDataURL()` (render offscreen once, return dataURL) so "load sample" flows through the same `scene.loadImage` path as uploads |

## Implementation Details

### Scene store

**Pattern to follow**: `/Users/gjtorikian/Developer/loopmate/src/state/store.ts` (commit/notify shape, clamp-numerics/throw-identifiers rule, dev deep-freeze).

```typescript
export interface SceneState {
  image: { name: string; dataURL: string; width: number; height: number } | null;
  adjustments: { brightness: number; contrast: number; saturation: number }; // -100..100, clamp
  rotation: number;            // degrees, normalized 0..359
  crop: { x: number; y: number; width: number; height: number } | null; // percent 0..100
  texts: Array<{ id: string; text: string; x: number; y: number; size: number; color: string }>;
  canUndo: boolean; canRedo: boolean;
}
export const scene = {
  getState, subscribe,
  loadImage(meta), loadSample(),                    // both push history
  setAdjustment(kind, value),                       // clamp -100..100; unknown kind throws with valid list
  cropToAspect(name), cropRect(rect), clearCrop(),  // unknown aspect throws with valid list
  rotate(degrees),                                  // normalize into 0..359
  addText(text, opts?): id,                         // id 'text-1', 'text-2', ...
  editText(id, patch), moveObject(id, x, y, opts?), removeObject(id), // unknown id throws listing current ids
  undo(): boolean, redo(): boolean,                 // false = nothing to do (tool phrases it politely)
  requestExport(),                                  // bumps exportRequests counter; renderer downloads
  reset(),
};
```

**Key decisions**: ids are stable and human-readable (`text-1`) — the agent addresses objects by them; `describe_canvas` (Phase 3) reads them straight from state. History snapshots are structural clones minus `dataURL` payload duplication (share the string reference — snapshots are cheap). `moveObject` with `{fromRenderer: true}` coalesces: push one history entry on drag-release, not per pixel.

**Feedback loop**:

- **Playground**: `test/scene.test.ts` first (describe block + smoke test).
- **Experiment**: adjustment clamps at ±100; `cropToAspect('square')` on a 1600×900 image yields a centered 56.25%-wide rect; undo after addText removes it and `canUndo/canRedo` flip correctly; unknown text id throws listing `text-1`; 51 mutations cap history at 50; reset restores pristine state.
- **Check command**: `npx vitest run test/scene.test.ts`

### Renderer

**Pattern to follow**: `/Users/gjtorikian/Developer/loopmate/src/audio/engine.ts` (subscriber that projects state; browser-only module).

**Implementation steps**:

1. Image projection: FabricImage from dataURL, filters array rebuilt from adjustments (scale −100..100 → Fabric −1..1), `applyFilters()`; rotation via canvas-level rotate of the image object; crop via viewport transform + canvas dimensions.
2. Text reconciliation by id (add/update/remove FabricText objects; percent → pixel on render, pixel → percent on drag).
3. Gestures: `object:modified` → `scene.moveObject(..., {fromRenderer: true})`; drag-drop + file input → dataURL → `scene.loadImage`.
4. Export: subscribe to `exportRequests` bump → `canvas.toDataURL({format: 'png'})` → anchor download.

**Feedback loop**:

- **Playground**: `npm run dev`, browser.
- **Experiment**: upload a photo → adjust brightness slider → visible change; crop square → viewport crops; drag a caption → object list shows new percent position (proves reverse sync before Phase 3 exists); export downloads a PNG that opens.
- **Check command**: `npm run build`

### Toolbar + object list

**Key decisions**: every control is a real `<button>`/`<input>` with labels (ARIA pass completes in Phase 4, but semantic HTML starts here); the object list renders one row per text object (content, position, remove button) plus an image row — it IS the scene graph, visibly.

**Feedback loop**: dev server; from DevTools console call `scene.addText('hello')` and watch canvas + object list update without reload (proves the Phase 3 agent path).

## Data Model

`SceneState` above; defaults: no image (sample loadable), adjustments 0, rotation 0, crop null, no texts.

## Testing Requirements

### Unit Tests

| Test File            | Coverage                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `test/scene.test.ts` | Mutators, clamping, aspect math, id lifecycle, undo/redo edges, history cap, reset, subscribe/unsubscribe |

**Key test cases**: undo on empty history returns false (no throw); redo cleared by a new mutation after undo; crop percent math for 'square' on landscape and portrait; moveObject clamps x/y into 0..100; export counter increments.

### Manual Testing

- [ ] Upload → adjust → crop → caption → drag caption → export: full loop by mouse
- [ ] Sample image loads through the same path as uploads
- [ ] Object list mirrors every canvas change both directions

## Error Handling

| Error Scenario            | Handling Strategy                                             |
| ------------------------- | -------------------------------------------------------------- |
| Non-image file dropped    | Reject with visible message; scene untouched                   |
| Huge image (>4k)          | Downscale to ≤2048px on load (canvas perf + dataURL size)      |
| Unknown id/kind/aspect    | Scene throws with the valid list (Phase 3 converts to tool text) |

## Failure Modes

| Component | Failure Mode                          | Trigger                          | Impact                    | Mitigation                                            |
| --------- | -------------------------------------- | --------------------------------- | -------------------------- | ------------------------------------------------------ |
| Renderer  | Echo loop (drag → state → re-render → jump) | Reverse sync re-projecting   | Jittery drags              | `fromRenderer` flag skips the echo render              |
| Renderer  | Filter values drift from state         | applyFilters not re-run           | UI lies about state        | Rebuild filters array on every image-adjacent change   |
| Scene     | History balloons with dataURLs         | Snapshot cloning payloads         | Memory blowup on big photos | Share dataURL references across snapshots             |
| Crop      | Percent math on rotated image          | Rotate then crop                  | Wrong region cropped       | Apply crop in unrotated image space; document order in describe_canvas |

## Validation Commands

```bash
npx tsc --noEmit
npx vitest run test/scene.test.ts
npm run build
```

## Rollout Considerations

- Deploy at end of phase (`./scripts/deploy.sh`) so the live URL tracks progress.

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
