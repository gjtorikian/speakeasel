# Implementation Spec: Speakeasel - Phase 1 (Walking Skeleton)

**Contract**: ./contract.md
**Repo root**: `/Users/gjtorikian/Developer/speakeasel` — this project is its own git repository (NOT the outer `~/Developer` repo); `cd` here first and resolve every relative path in this spec against it.
**Estimated Effort**: S (~1.5h)

## Technical Approach

Prove the full pipeline for entry #2 in one pass: Vite + TypeScript scaffold, Fabric.js v7 rendering a generated sample scene onto a `<canvas>`, the dual-surface WebMCP adapter registering one hello tool, and a REST deploy to the **pre-claimed** site `speakeasel.netlify.app`. Nearly every pattern is a verified copy from the sibling Loopmate repo (`/Users/gjtorikian/Developer/loopmate` — reviewed and green yesterday); the only genuinely new element is Fabric itself, and that is **pre-probed**: fabric 7.4.0 installs through the WorkOS Socket firewall and imports (probe ran in scratchpad; target the v7 API — named exports like `Canvas`, `Rect`, `FabricText`, `filters`).

The hello tool is `describe_page` — returns one static sentence about what Speakeasel is. It exists to prove registration end-to-end and is replaced by the real surface in Phase 3.

## Decisions Considered and Rejected

_Carried from the contract; consult before making gap decisions._

- **Second entry alongside Loopmate** — rejected: deepening/replacing Loopmate. Rules allow multiple submissions; doubles top-10 shots.
- **A11y-framed image editor** — rejected: DuckDB data workbench, form filler. User chose the manifesto play with Execution risk (5/10 in 24h) explicitly stated.
- **Fabric.js as canvas engine** — rejected: from-scratch, Konva, hosted editor. Object model + filters + serialization under MIT.
- **Generated sample scene, no stock photos** — rejected: CC0 assets. Zero licensing; uploads supply real photos at demo time.
- **Scene-state/renderer split** — rejected: behavioral fake manager; tools importing Fabric. Node tests run the REAL scene layer (Loopmate's store/Tone division).
- **Static undo in MVP; AbortSignal lifecycle is stretch** — rejected: dynamic undo in MVP. Critic-flagged unproven machinery.
- **Blur/grayscale/sepia in Full tier (the cut line)** — rejected: six adjustments in MVP.
- **Netlify site pre-claimed, protection pre-disabled** — rejected: claiming during Phase 1. Loopmate learning applied; hostname pinned in the curl criterion.
- **Reuse Loopmate's proven patterns** — rejected: fresh approaches. Adapter, deploy script, shim suite, activity feed all reviewed green.

## Feedback Strategy

**Inner-loop command**: `npm run dev` + flagged Chrome (`chrome://flags/#enable-webmcp-testing`) with the Model Context Tool Inspector.

**Playground**: Vite dev server; the Inspector lists/invokes `describe_page`.

**Why this approach**: The phase exists to prove plumbing (Fabric render + tool registration + deploy); a browser is the only honest check for all three.

## File Changes

### New Files

| File Path               | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `package.json`          | Deps: `fabric`; dev: `vite`, `typescript`, `vitest`, `ajv`. Scripts: dev/build/preview/test |
| `tsconfig.json`         | Strict TS, browser target (copy Loopmate's)                              |
| `vite.config.ts`        | Default static build                                                     |
| `index.html`            | Shell: `<canvas id="easel">`, toolbar/object-list/activity mounts, WebMCP banner slot |
| `src/main.ts`           | Boot: adapter + hello tool, Fabric canvas, sample scene                  |
| `src/webmcp/adapter.ts` | Copy of `/Users/gjtorikian/Developer/loopmate/src/webmcp/adapter.ts` (dual-surface getModelContext) |
| `src/render/sample.ts`  | `drawSampleScene()` — gradient sky, sun circle, hills, so the canvas is never blank |
| `.gitignore`            | `node_modules/`, `dist/`                                                 |
| `netlify.toml`          | build → `dist`                                                           |

### Modified Files

None (greenfield; `scripts/deploy.sh` already exists in the root commit — do not rewrite it).

## Implementation Details

### Scaffold + Fabric render + hello tool

**Pattern to follow**: `/Users/gjtorikian/Developer/loopmate/src/main.ts` (boot order, banner, HMR-safe registration), `/Users/gjtorikian/Developer/loopmate/index.html`.

**Implementation steps**:

1. Write config files; `npm install` (fabric pre-probed green through the firewall).
2. `src/render/sample.ts`: Fabric `Canvas` on `#easel` (~800×600), draw the generated scene (Rect gradient + Circle + two Ellipse hills + a FabricText title). This is the Fabric v7 smoke test.
3. Adapter copy + register `describe_page`; unflagged browsers get the "WebMCP not available" banner, no crash.
4. `npm run build` green; `./scripts/deploy.sh`; `curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"` exits 0.

**Feedback loop**:

- **Playground**: dev server + Inspector.
- **Experiment**: sample scene visibly renders; `describe_page` invokes from the Inspector; unflagged Safari shows banner without console errors.
- **Check command**: `npm run build`

## Data Model / API Design

None this phase.

## Testing Requirements

### Unit Tests

None this phase (vitest installed; suites land with the scene layer in Phase 2/3).

### Manual Testing

- [ ] Sample scene renders in dev and on the live URL
- [ ] Inspector lists and invokes `describe_page` against the live URL
- [ ] Unflagged browser: banner, no crash

## Error Handling

| Error Scenario           | Handling Strategy                                          |
| ------------------------ | ----------------------------------------------------------- |
| `modelContext` absent    | Banner, skip registration, page still works                 |
| Deploy/poll failure      | `scripts/deploy.sh` tolerates transient polls; escalate to the human only if the script exits non-zero twice |

## Failure Modes

| Component | Failure Mode                        | Trigger                      | Impact              | Mitigation                                        |
| --------- | ------------------------------------ | ----------------------------- | -------------------- | -------------------------------------------------- |
| Fabric    | v7 API drift from pre-trained assumptions | Named-export changes      | Build errors         | Probe already confirmed imports; consult node_modules/fabric types when unsure |
| Deploy    | Stale placeholder serves 200        | Deploy silently no-ops        | False confidence     | Criterion greps for `<canvas` in the live HTML     |

## Validation Commands

```bash
npm run build                                              # exits 0
grep -rq "registerTool(" src                                # exits 0
curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"   # exits 0
```

## Rollout Considerations

- Netlify deploy history is the rollback. Prereq already in place: `~/.netlify/token`.

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
