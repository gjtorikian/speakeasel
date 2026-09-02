# Implementation Spec: Speakeasel - Phase 3 (Tool Surface)

**Contract**: ./contract.md
**Repo root**: `/Users/gjtorikian/Developer/speakeasel` — this project is its own git repository (NOT the outer `~/Developer` repo); `cd` here first and resolve every relative path in this spec against it.
**Estimated Effort**: M (~3h)

## Technical Approach

The Leverage criterion made concrete: 14 WebMCP tools over the Phase 2 scene layer, registered through the dual-surface adapter with the same single-dispatch-point wrapper that passed review on Loopmate (**pattern: `/Users/gjtorikian/Developer/loopmate/src/webmcp/tools.ts`** — throw-to-text conversion, best-effort activity reporting, HMR guard with the post-loop flag fix from that review). Tools import the scene layer only — never Fabric — so the contract-pinned suite runs the real product logic in Node.

`describe_canvas` is the thesis tool and gets design attention beyond the rest: it narrates the scene graph in reading order — image (name, dimensions, rotation, crop as "cropped to a square region centered …", non-zero adjustments in words: "brightness raised moderately (+40)") then each text object with position translated to natural language ("near the top-left, at 12% across and 8% down") and its id for addressing. The narration must be complete enough that a person who cannot see the canvas could redraw it.

Tool descriptions carry the editing conventions (percent coordinates, id addressing, aspect names, adjustment ranges) exactly as Loopmate's carried music theory — that's what makes the one-prompt multi-edit work.

## Decisions Considered and Rejected

_Carried from the contract (full log in spec-phase-1.md); load-bearing here:_

- **Scene/renderer split; tools never import Fabric** — Node suite runs the real scene layer.
- **Static undo in MVP** — `undo` always registered; returns "Nothing to undo yet." on empty history. Dynamic AbortSignal lifecycle is stretch — do NOT build it in this phase.
- **Suite must pin get_canvas_state and describe_canvas by name** — contract criterion; a surface without the manifesto tool must fail mechanically, not on camera.
- **Reuse Loopmate patterns** — dispatch wrapper, shim, ajv strict validation, activity feed.

## Feedback Strategy

**Inner-loop command**: `npx vitest run test/tool-surface.test.ts`

**Playground**: The shim-backed suite (created first, running the real scene layer); flagged Chrome + Inspector for end-of-phase live confirmation.

**Why this approach**: Tools are request/response over pure state — millisecond tests; the browser only re-confirms registration plumbing Phase 1 already proved.

## File Changes

### New Files

| File Path                   | Purpose                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `src/webmcp/schemas.ts`     | JSON Schemas for all 14 tools (pattern: Loopmate schemas.ts)    |
| `src/webmcp/tools.ts`       | Tool defs + `registerAll(mc, scene, onActivity)` dispatch       |
| `src/ui/activity.ts`        | Bounded (50) newest-first tool-call feed (copy Loopmate's)      |
| `test/shim.ts`              | Fake `navigator.modelContext` capturing registrations (copy)    |
| `test/tool-surface.test.ts` | Contract-pinned suite                                           |

### Modified Files

| File Path     | Changes                                                       |
| ------------- | -------------------------------------------------------------- |
| `src/main.ts` | Replace hello tool with `registerAll`; wire activity feed      |
| `index.html`  | Activity feed mount                                            |
| `src/styles.css` | Feed styles (functional)                                     |

## Implementation Details

### The 14 tools

| Tool                | Input essentials                                       | Behavior / response text                                             |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `get_canvas_state`  | `{}`                                                    | Scene graph as compact JSON + one-line summary                        |
| `describe_canvas`   | `{}`                                                    | The narration described above — prose only                            |
| `load_sample_image` | `{}`                                                    | Loads the generated sample; says what it depicts                      |
| `set_adjustment`    | `{kind: enum[brightness,contrast,saturation], value: -100..100}` | Applies + echoes applied value (clamps noted)                 |
| `crop`              | `{aspect?: enum[square,4:3,16:9], rect?: {x,y,width,height}}` | One of aspect/rect required; echoes resulting crop in percent   |
| `clear_crop`        | `{}`                                                    | Removes crop                                                          |
| `rotate`            | `{degrees: number}`                                     | Normalizes into 0..359; echoes                                        |
| `add_text`          | `{text, x?, y?, size?, color?}`                         | Defaults centered; echoes assigned id ("text-1") and position         |
| `edit_text`         | `{id, text?, size?, color?}`                            | Unknown id → error text listing current ids                           |
| `move_object`       | `{id, x: 0..100, y: 0..100}`                            | Percent coords; echoes new position in words                          |
| `remove_object`     | `{id}`                                                  | Echoes removal                                                        |
| `undo` / `redo`     | `{}`                                                    | "Undid: …" from history, or "Nothing to undo yet." — never an error   |
| `export_png`        | `{}`                                                    | Triggers download via scene.requestExport(); tells agent the human sees a download |
| `reset_canvas`      | `{}`                                                    | Fresh state; says so                                                  |

(14 total counting `undo` and `redo` separately.)

**Key decisions**: `describe_canvas` and `get_canvas_state` carry `annotations: { readOnlyHint: true }` if the adapter surface accepts an annotations field (try/catch — harmless where unsupported; minutes of work riding along per the stretch note). Response texts always restate the resulting state fragment so the agent needn't re-read after every write.

**Feedback loop**:

- **Playground**: shim suite first with the three contract assertions stubbed.
- **Experiment**: full demo sequence — `load_sample_image`, `crop {aspect:'square'}`, `set_adjustment(brightness, 25)`, `add_text('Tahoe 2026')`, then `get_canvas_state` deep-includes all three edits (the round-trip criterion); `describe_canvas` mentions the caption AND its position words; error paths (`edit_text` unknown id, `set_adjustment` kind 'blur' → error listing brightness/contrast/saturation) leave state unmutated; `undo` empty-history politeness.
- **Check command**: `npx vitest run test/tool-surface.test.ts`

### Contract-pinned suite

**Pattern to follow**: `/Users/gjtorikian/Developer/loopmate/test/tool-surface.test.ts` + `test/shim.ts`.

**Required assertions (contract criterion — do not weaken):**

- `tools.size >= 14`
- `tools.has('get_canvas_state')` and `tools.has('describe_canvas')` — by name
- Every schema compiles under ajv strict mode; non-empty descriptions
- Round-trip: crop+adjust+add_text via tools → `get_canvas_state` JSON reflects all three
- describe_canvas output contains the caption text and a position phrase after a move
- Error paths return instructive text and do not mutate state (deep-equal before/after)
- reset → state deep-equals defaults

## Data Model / API Design

The tool table IS the API. No new state.

## Testing Requirements

Unit: the pinned suite above + scene suite stays green (`npx vitest run`).

### Manual Testing

- [ ] Inspector lists 14 tools; `crop square` visibly crops the live canvas
- [ ] ChatGPT desktop rehearsal against the redeployed URL: the goal-3 prompt end-to-end, then the human-drag → describe_canvas round-trip (goal 4)

## Error Handling

| Error Scenario               | Handling Strategy                                                |
| ---------------------------- | ------------------------------------------------------------------ |
| Any handler throw            | Dispatch wrapper → `Error: {message}` text + ✗ feed entry          |
| crop with neither aspect nor rect | Error text naming both options                                |
| Registration partially fails | Set the HMR `registered` flag only after the loop completes (Loopmate review fix) |

## Failure Modes

| Component      | Failure Mode                           | Trigger                     | Impact                   | Mitigation                                             |
| -------------- | --------------------------------------- | ---------------------------- | ------------------------- | -------------------------------------------------------- |
| describe_canvas| Narration drifts from state shape       | New state fields later       | The thesis tool lies      | Suite asserts narration against the same state the JSON tool emits |
| Tool responses | Context bloat from dataURL leaking into get_canvas_state | Emitting image payload | Agent truncates           | Emit image as {name, width, height} — never the dataURL |
| annotations    | Client rejects unknown field            | Strict client validation     | Registration throws       | try/catch per tool; register without annotations on failure |

## Validation Commands

```bash
npx tsc --noEmit
npx vitest run test/tool-surface.test.ts
npx vitest run
npm run build
grep -rq "registerTool(" src
```

## Rollout Considerations

- Redeploy at end of phase (`./scripts/deploy.sh`); this is the goal-3/goal-4 rehearsal point in ChatGPT desktop — the last cheap-surprise moment.

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
