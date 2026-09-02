# Context Map: speakeasel

**Phase**: 4 (Polish and Ship) — extends Phase 1+2+3 map
**Gates**: 5/5 ready
**Verdict**: GO

## Gates (Phase 4)

| Gate                 | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope clarity        | ready  | All 4 new + 4 spec-listed modified files mapped against current reality (index.html 41 lines — OG/meta/toolbar-ARIA largely pre-done; styles.css 207 lines of Phase 2 functional grey — full theme rewrite is real; package.json needs only `repository`); plus three files the spec's Implementation Details require but its table omits — `src/ui/activity.ts`, `src/webmcp/tools.ts` (one-line export), `src/main.ts` (aria-label sync wiring) — each with a concrete delta named below. |
| Pattern familiarity  | ready  | Every Phase 4 artifact has a Loopmate analogue, all read: README.md (65 lines), SUBMISSION.md (67 lines), LICENSE, public/og.png (1200×630 PNG verified), index.html og:image block (lines 20-29), styles.css `:root` tokens + `:focus-visible` (73-78) + `prefers-reduced-motion` gate (line 242), package.json `repository` field (lines 8-11).                                                     |
| Dependency awareness | ready  | Blast radius mapped: index.html ids consumed by main.ts/toolbar.ts/objectlist.ts queries; styles.css class hooks consumed by activity.ts (`.activity-*`), toolbar.ts (`.toolbar-group`, `.slider`); the literal static `<canvas` consumed by the curl criterion; Fabric wraps `#easel` in `.canvas-container` (renderer.ts:312 `new Canvas(el,...)`); deploy.sh consumes `npm run build` + `~/.netlify/token`; no external consumers of README/SUBMISSION/LICENSE/og.png. |
| Edge case coverage   | ready  | Concrete 12-item Phase 4 list below: feed chattiness restructure, object-list focus loss on re-render, Fabric upper-canvas label placement, roving-focus vs slider arrow keys, skip-link tabindex, og:image absolute URL + summary_large_image, default-branch-on-push, 15-not-14 tool count, aria-live-on-rebuilt-list chattiness, publicDir creation, deploy-before-film, docs/ideation commit.        |
| Test strategy        | ready  | All five contract cmd checks (contract.md:24-28) verified runnable now: `npm run build` + `npx vitest run test/tool-surface.test.ts` (bins present since Phase 3), `grep -rq "registerTool(" src` (tools.ts:405), live curl verified green this scout (`<canvas id="easel"...` served), `test -f LICENSE` passes once created; `gh auth status` verified: logged in as gjtorikian, keyring, `repo` scope — `gh repo create` will work; rest is spec-designed manual (keyboard + VoiceOver + video rehearsal). |

## Gates (Phase 3 — for reference)

| Gate                 | Status | Evidence                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope clarity        | ready  | Spec names all 5 new files and 3 modified files with a concrete 14-tool table (spec-phase-3.md:36-73); all three modified files read in current form (main.ts 92 lines, index.html 41 lines, styles.css 127 lines); note `index.html:37` already contains `<section id="activity">` — that modification is largely pre-done. |
| Pattern familiarity  | ready  | All pattern files read end-to-end: loopmate `src/webmcp/tools.ts` (372 lines), `src/webmcp/schemas.ts` (154), `src/ui/activity.ts` (69), `test/shim.ts` (18), `test/tool-surface.test.ts` (306), plus loopmate main.ts:17,48 activity wiring and styles.css:341+ feed styles.                                               |
| Dependency awareness | ready  | Tools are purely additive consumers of the frozen scene API — `src/scene/scene.ts` is not modified; `describe_page`/`registerHelloTool` exist only in main.ts (grep-verified), which is modified this phase; adapter.ts consumed by main.ts today, gains tools.ts + shim as consumers.                                       |
| Edge case coverage   | ready  | Concrete 12-item Phase 3 list below: sample-source registration in Node, annotations field gap, crop one-of, no-image crop throw, dataURL leak, HMR post-loop flag, clamp/normalize echoes, empty-id error text, export in Node, feed-throw isolation, dev deep-freeze in tests, get_canvas_state parseable layout.          |
| Test strategy        | ready  | `npx vitest run test/tool-surface.test.ts` with loopmate's tool-surface.test.ts as the direct template (shim-before-registerAll, `call()` helper, `parseGetState`); ajv ^8.20.0 installed at `node_modules/ajv`; `vitest`/`tsc`/`vite` bins verified in `node_modules/.bin`.                                                 |

## Gates (Phase 2 — for reference)

| Gate                 | Status | Evidence                                                                                                                                                                                     |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope clarity        | ready  | Spec named all 7 new + 3 modified files with per-file changes and a full `SceneState`/store API sketch; all modified files read pre-change.                                                    |
| Pattern familiarity  | ready  | loopmate `src/state/store.ts` (262 lines) and `src/audio/engine.ts` (165 lines) read end-to-end.                                                                                              |
| Dependency awareness | ready  | `drawSampleScene` consumed only by main.ts (both in the phase's modified set); 3-file src tree verified.                                                                                       |
| Edge case coverage   | ready  | 12-item list (see "Edge Cases for the Builder (Phase 2)").                                                                                                                                    |
| Test strategy        | ready  | `npx vitest run test/scene.test.ts`, `npx tsc --noEmit`, `npm run build`; loopmate `test/store.test.ts` as style analogue.                                                                    |

## Gates (Phase 1 — for reference)

| Gate                 | Status | Evidence                                                                                          |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Scope clarity        | ready  | Spec enumerated all 9 new files; greenfield repo confirmed at the time.                             |
| Pattern familiarity  | ready  | Loopmate adapter/main/index/tsconfig/package/vite/netlify + tools.ts registration shape all read.   |
| Dependency awareness | ready  | Only pre-existing consumer was `scripts/deploy.sh` → `dist/` + `~/.netlify/token`.                  |
| Edge case coverage   | ready  | Absent modelContext, registerTool throw, HMR double-registration, static `<canvas>` curl criterion. |
| Test strategy        | ready  | No unit tests by design; build + grep + curl criteria plus manual Inspector checklist.              |

## Key Patterns

### Phase 4

- `/Users/gjtorikian/Developer/loopmate/README.md` — the README blueprint, replicate section-for-section with speakeasel content: og.png banner image (line 3), thesis paragraph (5), "Try it" with live URL + ChatGPT desktop / Chrome 149+ flag line + numbered 90-second script (9-15), adapter explanation with deep GitHub links `src/webmcp/adapter.ts#L21-L29` style (17-21), full tool table with per-tool source links (27-41), "One store, both players" architecture section (43-47) — speakeasel's version becomes the scene/renderer split + "the photo never leaves the tab" privacy note, "Run locally" (49-56), "Built with a spec-first workflow" docs/ideation note (58-60), MIT license footer (62-64). The spec adds one section loopmate lacks: an honest a11y statement (chrome keyboard-operable + aria-live feed = done; canvas-object arrow keys = stretch, per contract.md:42,47).
- `/Users/gjtorikian/Developer/loopmate/SUBMISSION.md` — the submission-kit blueprint: header links block with the Netlify side-pool mention (lines 5-8), ~300-word Devpost description in bold-lede paragraphs (10-42), shot-by-shot video table with time codes and a "Deploy first, film against prod" warning (44-57), checklist with the exact ffprobe command and "do not wait for the deadline hour" (59-66). Speakeasel's script beats are already specified in spec-phase-4.md:70 — map them into this table format; add the "second entry alongside Loopmate, substantially different" note the decision log requires.
- `/Users/gjtorikian/Developer/loopmate/LICENSE` — copy verbatim (MIT, "Copyright (c) 2026 Garen J. Torikian" — exact match for the spec's © line).
- `/Users/gjtorikian/Developer/loopmate/index.html:20-29` — the OG image block to replicate: `og:image` as an ABSOLUTE prod URL (`https://speakeasel.netlify.app/og.png`), `og:image:width/height` 1200/630, upgrade `twitter:card` from `summary` (speakeasel index.html:20 today) to `summary_large_image`, add `twitter:image`. og.png is 1200×630 (verified via `file` on loopmate's).
- `/Users/gjtorikian/Developer/loopmate/src/styles.css` — the theme blueprint: `:root` custom-property token block (lines 3-17: bg/panel/border/text/muted-text/one accent + accent-ink/ok/invalid), every rule consumes tokens, `:is(button, input, select):focus-visible { outline: 2px solid var(--accent) }` (73-78) — the visible focus-ring pattern, `accent-color: var(--accent)` for range inputs (80), animations gated behind `@media (prefers-reduced-motion: no-preference)` (242) — the progressive pattern: motion is opt-in, not opted-out. Speakeasel's palette differs per spec (charcoal surface, warm paper-white canvas mat, teal accent) but the token architecture is the pattern.
- `/Users/gjtorikian/Developer/loopmate/package.json:8-11` — `repository` field shape: `{"type": "git", "url": "git+https://github.com/gjtorikian/{name}.git"}`. Speakeasel already has `license` and `homepage` (package.json:6-7) — only `repository` is missing.
- `/Users/gjtorikian/Developer/speakeasel/src/webmcp/tools.ts:79-131` — `summarize()` (one-line state summary) and `describe()` (full narration, "built from the SAME getState() the JSON tool reads") — the spec's canvas `aria-label` one-source-of-truth. Both are currently module-private; export `summarize` (or `describe`) and wire `scene.subscribe` in main.ts to set the label. Fabric-free, so importing it into UI code is safe.
- No loopmate analogue exists for the skip link (grep-verified: no "skip" anywhere in loopmate index.html/src) — standard pattern: visually-hidden-until-focused anchor to `#toolbar` with `tabindex="-1"` on the target.

### Phase 3

- `/Users/gjtorikian/Developer/loopmate/src/webmcp/tools.ts` — the tool-surface blueprint. Replicate: header comment "handlers parse args, call one store mutator, return LLM-legible text; no [domain] logic lives here" (lines 14-20); `ActivityEntry` interface `{at, tool, args, ok, summary}` (22-28); local `text()` helper (30-32); `emitState()` compact JSON projection with a comment pinning the format the suite targets (34-69); `summarize()` one-liner + `describe()` prose builder (77-106); `toolDefs(store, ...)` returning `ToolDef[]` with rich descriptions carrying domain conventions (116-322); clamp echoes "(Requested X; clamped to Y range.)" (174-183); `registerAll(mc, store, onActivity)` single dispatch point (338-372): spread `...def`, wrapped `execute` with best-effort `report()` in try/catch, thrown errors → `text('Error: ' + message)` — never a throw across the boundary. **CRITICAL DEVIATION**: loopmate sets `registered = true` BEFORE the loop (lines 344-345); the spec's Error Handling table requires the post-loop flag fix — set it only after the `for` loop completes. Do not copy lines 344-345 verbatim. _(Implemented: speakeasel tools.ts:413 sets the flag post-loop.)_
- `/Users/gjtorikian/Developer/loopmate/src/webmcp/schemas.ts` — schema conventions: draft-07 vocabulary only (ajv strict rejects unknown keywords); every schema `type: 'object'` + `additionalProperties: false`; shared `EMPTY` const for no-arg tools (lines 14-18); enums spread from the const arrays in types.ts (`enum: [...DRUMS]` → speakeasel `[...ADJUSTMENTS]`, `[...ASPECTS]`); numeric min/max document ranges while runtime still clamps (header comment lines 9-12). Speakeasel's `crop` one-of (aspect XOR rect) is enforced in the handler with error text naming both options — not with schema `oneOf` — keeping the additionalProperties:false convention testable per tool.
- `/Users/gjtorikian/Developer/loopmate/src/ui/activity.ts` — copy nearly verbatim (spec says "copy Loopmate's"): `MAX_ENTRIES = 50`, newest-first `list.prepend` + trim loop (63-64), `compactArgs` 80-char truncation (17-26), textContent-never-innerHTML because args come from the agent (header comment), `aria-live="polite"`, returns `{push}`. Feed styles live at loopmate `src/styles.css:341-395` (`.activity`, `.activity-title`, `.activity-empty`, `.activity-list`, `.activity-entry`) — the source for speakeasel's styles.css addition.
- `/Users/gjtorikian/Developer/loopmate/test/shim.ts` — copy verbatim (18 lines): `installShim()` returns `{tools: Map<string, ToolDef>}`, installs on `globalThis.navigator.modelContext`, throws on duplicate names so a broken HMR guard fails loudly.
- `/Users/gjtorikian/Developer/loopmate/test/tool-surface.test.ts` — the suite template: shim installed at module top BEFORE `registerAll` (lines 18-31); `call(name, args)` helper asserting `content[0].type === 'text'` (33-39); `parseGetState` splits summary line from JSON (41-49) — speakeasel's `get_canvas_state` must keep the summary-line-then-JSON layout so this parser works; `beforeEach` resets store + activity array (55-59); describe blocks: registration (count ≥ N, all names, second registerAll returns 0), schemas (non-empty description, object type, additionalProperties false, ajv `new Ajv({strict: true})` compile), round trips (multi-call then deep-include), error paths (`expect(store.getState()).toEqual(before)` unmutated), activity feed (ok entry, failed entry, throwing feed never fails the call — lines 300-305).
- `/Users/gjtorikian/Developer/loopmate/src/main.ts:17,48` — activity wiring pattern: `const activity = mountActivity(document.querySelector('#activity')!)` before registration; `(entry) => activity.push(entry)` as the onActivity arg.
- `/Users/gjtorikian/Developer/speakeasel/src/scene/scene.ts` (387 lines, frozen contract) — what the tools consume. The exported `scene` object (204-387): `getState/subscribe/loadImage/loadSample/setAdjustment/cropToAspect/cropRect/clearCrop/rotate/addText/editText/moveObject/endGesture/removeObject/undo/redo/requestExport/reset`; `export type Scene = typeof scene` (389). `addText` returns the assigned id (302-322); `undo()`/`redo()` return `false` on empty — the tools phrase it politely (355-373); `requestExport()` bumps `exportRequests`, not undoable (375-378); errors already list valid values (assertAdjustment 34-40, assertAspect 42-46, assertTextId 48-57 including the "(none — no text objects exist)" empty case); `cropToAspect` throws "No image loaded..." without an image (257-259). Fabric-free by design — tools import this and `../types` only, never fabric.
- `/Users/gjtorikian/Developer/speakeasel/src/types.ts` — enums/limits the schemas mirror: `ASPECTS` (line 8), `ADJUSTMENTS` (19), `ADJUSTMENT_LIMIT` 100 (23), `TEXT_SIZE_MIN/MAX` 8/200 (32-33), `DEFAULT_TEXT_SIZE` 32, `DEFAULT_TEXT_COLOR` '#ffffff' (34-35); `ImageMeta` includes `dataURL` (62-67) — get_canvas_state must project image to `{name, width, height}` only.
- `/Users/gjtorikian/Developer/speakeasel/src/render/sample.ts:8-16` — the sample depicts "gradient sky, sun, two hills, a title" (header comment) — the `load_sample_image` response text source. tools.ts must NOT import sample.ts (it imports fabric); the depiction sentence is hardcoded in the tool or carried via the sample-source metadata.

### Phase 2

- `/Users/gjtorikian/Developer/loopmate/src/state/store.ts` — the scene-store blueprint (commit/notify, clamp/throw rule, dev deep-freeze; details in prior map — now implemented in `src/scene/scene.ts`).
- `/Users/gjtorikian/Developer/loopmate/src/audio/engine.ts` — the renderer blueprint (subscriber-projection module — now implemented in `src/render/renderer.ts`).
- `/Users/gjtorikian/Developer/loopmate/test/store.test.ts` — test-suite style (beforeEach reset, describe-per-concern — replicated in `test/scene.test.ts`).
- Fabric 7.4.0 verified in local node_modules: `filters.Brightness/Contrast/Saturation` (−1..1 scale), `FabricImage.fromURL`, `'object:modified'` event, `toDataURL` on StaticCanvas (citations in prior map).

### Phase 1

- `/Users/gjtorikian/Developer/loopmate/src/webmcp/adapter.ts` — copied to `src/webmcp/adapter.ts` (done; `[speakeasel]` prefix applied).
- `/Users/gjtorikian/Developer/loopmate/src/main.ts` — boot-order + banner-fallback pattern (implemented in speakeasel main.ts).
- Loopmate `index.html` / `tsconfig.json` / `package.json` / `vite.config.ts` / `netlify.toml` / `.gitignore` — all replicated; speakeasel builds with `tsc && vite build`.

## Dependencies

### Phase 4

- `index.html` ids — consumed by → `src/main.ts:20-24,44` (`#easel`, `#toolbar`, `#object-list`, `#activity`, `#webmcp-banner`), `src/ui/toolbar.ts:40,52` (`#editor-message`, `#file-input`). Any markup restructuring for the theme/skip-link must preserve every id, plus the literal static `<canvas id="easel"` (index.html:35) that the contract's curl criterion greps for.
- `src/styles.css` class hooks — consumed by → `src/ui/activity.ts:29-58` (`.activity`, `.activity-title`, `.activity-empty`, `.activity-list`, `.activity-entry`, `.activity-status`, `.activity-tool`, `.activity-args`, `.activity-time`, `.ok`/`.failed`), `src/ui/toolbar.ts:32,69` (`.toolbar-group`, `.slider`). The theme rewrite must keep these class names (or change them in both places).
- `#easel` (index.html:35) — consumed by → `renderer.init` at `src/render/renderer.ts:310-312` (`new Canvas(el, ...)` — interactive Fabric Canvas). Fabric WRAPS the element in a `div.canvas-container` with an added `.upper-canvas` at runtime; `role="img"`/`aria-label` set on `#easel` land on the lower canvas. Theme CSS for the "canvas mat" should target `.canvas-container`; VoiceOver check must confirm where the label is actually read (see Risks).
- `src/ui/activity.ts` (needs modifying — spec table omits it) — the `aria-live="polite"` region is here (line 33), not in toolbar/objectlist; the spec's "feed announces summary line only, not args JSON" fix means rendering `entry.summary` (currently buried in `title`, line 60) as announced text and demoting `compactArgs` JSON (currently textContent, line 53) to visual-only/`aria-hidden`. `ActivityEntry.summary` is already populated by the dispatch wrapper (tools.ts:395: first line of the response).
- `src/webmcp/tools.ts:79-91` `summarize()` (needs a one-line `export` — spec table omits it) — gains consumer → main.ts canvas aria-label sync. tools.ts is Fabric-free; safe import into UI/main.
- `src/main.ts` (needs a small addition — spec table omits it) — the only place to wire `scene.subscribe((s) => easel.setAttribute('aria-label', summarize(s)))`; existing boot order (scene → renderer → UI → WebMCP, lines 11-57) must be preserved.
- `src/ui/objectlist.ts:52` `mount.replaceChildren(...)` on every scene change — any focus placed inside the list (spec wants focusable rows) is destroyed on each re-render; focus restoration is new logic in this file.
- `package.json` — consumed by → `scripts/deploy.sh` (`npm run build`), CI-less; adding `repository` is inert to all consumers.
- New `LICENSE` / `README.md` / `SUBMISSION.md` / `public/og.png` — no code consumers; `public/` does not exist yet (verified) but Vite's default `publicDir` copies it into `dist/` with zero config (vite.config.ts sets only `outDir`); og.png is then served at `/og.png`, which the og:image absolute URL and README banner reference.
- Ship mechanics — `gh` authenticated (gjtorikian, keyring, scopes include `repo`; verified this scout); NO git remote exists yet (verified — repo creation is genuinely this phase's work); current branch `ideation/speakeasel` with 4 commits; live URL currently serves `<canvas id="easel"` (curl verified green this scout); `~/.netlify/token` consumed by deploy.sh; `.gitignore` covers node_modules/dist/.netlify — no secrets in the tree to leak on the public push.

### Phase 3

- `src/scene/scene.ts` (NOT modified) — consumed by → `src/main.ts:4`, `src/render/renderer.ts:2`, `src/ui/toolbar.ts:2`, `src/ui/objectlist.ts:1`, `test/scene.test.ts:2`, `src/webmcp/tools.ts` + `test/tool-surface.test.ts`. Tools call the frozen mutators; existing subscribers (renderer, object list, toolbar) react automatically — that is the design, no interface change.
- `src/main.ts` — consumed by → `index.html:39` script tag only. Boot order preserved: scene → renderer → UI → WebMCP; `registerSampleSource` (13-18), `window.scene` DevTools exposure (38), banner fallback try/catch (47-57).
- `src/webmcp/adapter.ts` — consumed by → `src/main.ts:8`, `src/webmcp/tools.ts` (ModelContext/ToolDef/ToolResponse types), `test/shim.ts` (ToolDef type). `annotations` field landed on ToolDef during Phase 3 (tools.ts:143,154 use it; build green).
- `index.html:37` (`<section id="activity">`) — consumed by main.ts `mountActivity` query. `index.html:35` static `<canvas id="easel">` — still consumed by the live-URL curl criterion; keep literal.
- `src/styles.css` — consumed by → `src/main.ts:1` import.
- `src/webmcp/schemas.ts` — consumed by → tools.ts only. `src/ui/activity.ts` — consumed by → main.ts only. `test/shim.ts` — consumed by → test/tool-surface.test.ts only.
- `scene.requestExport()` (scene.ts:375-378) → `exportRequests` diffed by the renderer in the browser (download anchor at renderer.ts:298-301); in the Node suite no renderer subscribes — the counter bumps harmlessly.

### Phase 2

- `src/render/sample.ts` (`sampleImageDataURL`, `SAMPLE_WIDTH/HEIGHT`) — consumed by → `src/main.ts:3,13-18` only (via `registerSampleSource`).
- `src/main.ts` — consumed by → `index.html:39`; queries `#easel`, `#toolbar`, `#object-list`, `#webmcp-banner` (all mounts exist).
- Scene layer — consumers as listed under Phase 3 above; the store API is the frozen forward contract — do not rename mutators.

### Phase 1

- `scripts/deploy.sh` (committed; DO NOT rewrite) — consumes → `dist/` (runs `npm run build` itself), `~/.netlify/token`, pinned site `https://speakeasel.netlify.app` (SITE_ID 3d23f8c6-1483-47d1-87d4-10f91e1f7a11, matches contract.md:27).

## Conventions

- **Naming**: lowercase single-word module files; DOM ids kebab/plain (`#easel`, `#activity`, `#webmcp-banner`); console logs prefixed `[speakeasel]`; text-object ids `text-1`, `text-2`, ...; tool names snake_case (`get_canvas_state`).
- **Imports**: relative paths without extension; `import type` for type-only imports; named exports only; tools.ts imports the scene layer and types only — NEVER fabric, never renderer/sample (Node testability is the point of the split).
- **Error handling**: clamp out-of-range numerics silently and echo "(clamped)" in tool response text; throw `Error` listing valid values for unknown identifiers — the dispatch wrapper converts throws to `Error: {message}` text; never throw across the WebMCP boundary; activity reporting is best-effort. Toolbar surfaces scene throws in `#editor-message` (`role="status"` `aria-live="polite"`, toolbar.ts:39-44) — an existing live region, distinct from the feed's.
- **Types**: `interface` for object shapes in `src/types.ts`; const arrays + derived union types for enums; `export type Scene = typeof scene`.
- **Testing**: vitest 3, `test/` at repo root, `*.test.ts`; tsconfig `include: ["src"]` — `tsc --noEmit` does NOT typecheck `test/`, vitest is the type gate; no vitest config file — default Node environment; UI modules (toolbar/objectlist/activity) have NO automated coverage — a11y changes are verified by build + hands.
- **Schemas**: draft-07 vocabulary only (ajv `{strict: true}`); every schema `type: 'object'` + `additionalProperties: false`.
- **DOM safety**: activity entries and object-list rows built with `textContent`, never innerHTML interpolation — args and caption text come from the agent.
- **Styling (Phase 4 target)**: loopmate token architecture — `:root` custom properties, one accent color, `:is(button, input, select):focus-visible` outline, `accent-color` on range inputs, motion inside `@media (prefers-reduced-motion: no-preference)`. Speakeasel palette per spec: charcoal surface, warm paper-white canvas mat, one teal accent; canvas is the hero, chrome recedes.
- **Docs/prose**: README/SUBMISSION follow loopmate's exact section order and voice; deep GitHub links use `path#L10-L20` fragments; MIT footer "© 2026 Garen J. Torikian"; `docs/ideation/` is committed to the public repo on purpose (loopmate README:58-60 precedent).
- **Git**: branch `ideation/speakeasel`; Phase 1 = 8c7f765, Phase 2 = a8e5c9f, Phase 3 = 48004cc; working tree at scout time has only untracked docs/ideation artifacts (context-map.md, implementation-notes-phase-{1,2,3}.html).

## Risks

### Phase 4

- **Spec's File Changes table is incomplete — three omissions its own Implementation Details require.** (1) The `aria-live` region the spec says to fix lives in `src/ui/activity.ts:33`, not toolbar/objectlist; the "summary line only, not args JSON" error-handling row means restructuring that file's entry rendering (summary is currently a hover `title`, activity.ts:60, while raw args JSON is the announced textContent, line 53). (2) The canvas `role="img"` label "kept in sync from the same summarizer" requires exporting `summarize` from `src/webmcp/tools.ts:79` (currently module-private). (3) The subscribe-and-set wiring for that label belongs in `src/main.ts`. All three are small, defensible scope additions in the spirit of the spec — but the builder must not try to satisfy the aria-label sync from index.html alone (static HTML cannot track state).
- **Spec-vs-reality: "the 14-tool table" is stale — the surface is 15 tools.** tools.ts:13 says "15 thin tools" and `toolDefs` returns 15 (get_canvas_state, describe_canvas, load_sample_image, set_adjustment, crop, clear_crop, rotate, add_text, edit_text, move_object, remove_object, undo, redo, export_png, reset_canvas). The contract requires ≥14 (contract.md:25) so reality over-delivers; the README table and SUBMISSION description must say 15 (or "15 tools"), not copy the spec's 14. Decision-log check: no other contradictions — no canvas keyboard editing exists (decision intact), deploy.sh matches the pre-claimed site decision, readOnlyHint annotations already shipped in Phase 3 (tools.ts:143,154), static undo intact.
- **Fabric wraps `#easel` at runtime** (`new Canvas(el, ...)`, renderer.ts:312) — the page's `<canvas id="easel">` becomes the lower canvas inside `div.canvas-container` with an added interactive `.upper-canvas` that has no role/label. `role="img"` + aria-label on `#easel` may not be what VoiceOver encounters first; the VoiceOver spot-check must confirm, and the builder may need `aria-hidden` on the upper canvas or the label on the container. Also style the "paper-white canvas mat" via `.canvas-container`, not only `#easel`.
- **Object list re-renders wholesale on every scene change** (objectlist.ts:52 `replaceChildren`) — making rows focusable (spec's "roving focus where apt") collides with re-rendering: activating Remove, or any agent edit mid-walkthrough, destroys the focused node and drops focus to `<body>` — a keyboard trap in effect. Builder needs focus restoration (track focused row id, re-focus after render) or must scope focus to the persistent section. Same mechanism makes `aria-live` on the object list re-announce the ENTIRE list per change — prefer the feed (which announces per-entry) as the live channel and keep the list politely labeled, or use a separate one-line visually-hidden status.
- **Roving focus vs slider arrow keys**: the toolbar's `role="toolbar"` (index.html:34) implies APG arrow-key navigation, but three of its children are `input[type=range]` whose arrow keys must keep adjusting the value. Native `<button>`s already handle Enter/Space. Cheapest honest path: keep natural tab order (skip roving), or rove only between groups — and say what was done in the README a11y statement rather than over-claiming.
- **`gh repo create speakeasel --public --source . --push` pushes the CURRENT branch** — `ideation/speakeasel` becomes the new repo's default branch (no remote exists yet, verified). Judges land on that branch name; either accept it (harmless) or also push `main` — but all commits belong on `ideation/speakeasel` per the goal wrapper, so do NOT rebase/rewrite. Also: the untracked `docs/ideation/` artifacts (context map, implementation notes) must be committed before the push if the README's "spec-first workflow" section is to point at anything (loopmate precedent commits them).
- **og.png has no scripted path** — no playwright/puppeteer in node_modules (verified); loopmate's is a hand-made 1200×630 screenshot. Budget a manual step: macOS `screencapture`/browser screenshot of the LIVE site at ~1280×800, cropped/resized to 1200×630. The og:image URL must be absolute (`https://speakeasel.netlify.app/og.png`) and the current `twitter:card` "summary" (index.html:20) upgraded to `summary_large_image`, mirroring loopmate index.html:20-29. og.png must exist before the FINAL deploy or the live OG check fails.
- **Filmed build ≠ deployed build** (spec Failure Modes) — order is: finish code → `./scripts/deploy.sh` → screenshot og.png from prod → (og.png lands in a follow-up deploy if taken after) → rehearse against prod. Practical fix: take the screenshot from the first prod deploy, add og.png, deploy again, THEN rehearse — deploy.sh is idempotent and takes ~1 min.
- **Theme rewrite can silently break class hooks** — activity.ts and toolbar.ts construct elements with the class names listed under Dependencies; `tsc` will not catch a CSS/TS class-name mismatch. Keep the names; restyle the rules.
- **index.html is already half-done** — title/description/OG basics and toolbar/list/feed ARIA labels exist (lines 6-25, 32-37); the real deltas are: skip link, `og:image` block, `twitter:card` upgrade, canvas `role="img"` + label. Don't duplicate existing meta.
- **`#editor-message` is styled as an error box** (styles.css:28-34, red) but carries neutral messages too ("Nothing to undo.", toolbar.ts:110) — theme pass should make it status-neutral or the demo shows red flashes for non-errors.
- **Blur/grayscale/sepia are build-ONLY-if-time-remains** (spec:11; contract Full tier) — if built, the tool count, README table, tool-surface count assertion (`>= 14` still passes), and SUBMISSION prose all shift again; default is skip.

### Phase 3 (resolved during Phase 3 implementation — verified this scout)

- **HMR flag trap** — RESOLVED: flag set post-loop (tools.ts:413 with the "post-loop, so a partial failure allows a clean retry" comment); main.ts's old guard removed (registration now guarded only in tools.ts).
- **`annotations` field vs the adapter interface** — RESOLVED: ToolDef carries annotations (used at tools.ts:143,154); registerAll re-registers without annotations on throw (tools.ts:404-410).
- **dataURL leak into get_canvas_state** — RESOLVED: emitState projects image to `{name, width, height}` with the "dataURL payload NEVER leaves the tab" comment (tools.ts:58-77).
- **get_canvas_state layout** — RESOLVED: summary line + `\n` + pretty JSON (tools.ts:146).
- **`crop` one-of enforcement** — RESOLVED: handler-level XOR with error text naming both options (tools.ts:193-197).
- **describe_canvas narration drift** — RESOLVED: `describe()` built from the same getState, documented (tools.ts:93-98) — and now doubles as the Phase 4 aria-label source.
- **Strict tsconfig fails on unused code** (still live for Phase 4) — `noUnusedLocals`/`noUnusedParameters` + `tsc` in `build`; a dangling import or an exported-but-unused helper fails `npm run build`.

## Edge Cases for the Builder (Phase 4)

1. Feed announcement content: render `entry.summary` as the announced text (it's already the response's first line via tools.ts:395); demote args JSON to visual-only (`aria-hidden="true"` on `.activity-args`) — the spec's "too chatty" mitigation. Keep textContent-only construction.
2. `aria-live` regions announce ADDED nodes: `list.prepend` works, but the initial "No tool calls yet." → hidden flip and the 50-entry trim removals should not announce — verify with VoiceOver; add `aria-atomic="false"` if needed.
3. Skip link target: give `#toolbar` `tabindex="-1"` so `href="#toolbar"` actually moves focus in all browsers; style the link visually-hidden until `:focus-visible`.
4. Canvas label sync: subscribe AFTER `renderer.init` so the element Fabric leaves in place is the one labeled; cap the label at the `summarize()` one-liner (the full `describe()` prose is too long for an aria-label).
5. Focus restoration in the object list: after `replaceChildren`, if the previously-focused element was a row/Remove button, re-focus its successor by text id; removing the last caption should send focus to the list heading, not `<body>`.
6. Focus ring visibility on dark theme: `:focus-visible` outline needs `outline-offset` against dark buttons; test on the teal accent for ≥3:1 contrast against both charcoal chrome and the paper-white mat.
7. `prefers-reduced-motion`: gate any new transition/animation behind `no-preference` (loopmate styles.css:242 pattern); the canvas itself never animates — nothing to disable there.
8. Disabled undo/redo buttons (toolbar.ts:126-127) are skipped by Tab — that is correct; do not add tabindex to disabled controls; verify the walkthrough doesn't count them as a "trap".
9. og:image must be the absolute prod URL; relative `/og.png` breaks scrapers. Dimensions 1200×630; `twitter:card` → `summary_large_image`; README banner uses the relative `public/og.png` path (loopmate README:3) which renders on GitHub.
10. `gh repo create` failure mode: the ONLY escalation is auth (`! gh auth login` per spec) — auth verified green this scout, so a failure means name collision (`gjtorikian/speakeasel` may exist) — check with `gh repo view gjtorikian/speakeasel` before creating.
11. README deep links (`src/webmcp/tools.ts#L139` style) reference the default branch — write them AFTER the push, verify one link resolves; line numbers shift if tools.ts is edited later (e.g., the summarize export) — write README after code freeze.
12. Final validation order: code freeze → `npm run build` + `npx vitest run` → deploy → og.png → redeploy → all five contract checks (`npm run build`; `npx vitest run test/tool-surface.test.ts`; `grep -rq "registerTool(" src`; `curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"`; `test -f LICENSE`) → keyboard/VoiceOver pass → video-script rehearsal against prod.

## Edge Cases for the Builder (Phase 3 — implemented, kept for reference)

1. `undo`/`redo` on empty history: `scene.undo()` returns `false` — tool returns "Nothing to undo yet." (never an error, never a ✗ feed entry).
2. Node suite must call `registerSampleSource` with a fake ImageMeta before any `load_sample_image` test; scene.reset() does not clear the registered source.
3. `set_adjustment` with kind 'blur' → scene throws listing brightness/contrast/saturation → wrapper converts to error text; suite asserts state deep-equal before/after.
4. `edit_text`/`move_object`/`remove_object` unknown id → error text lists current ids; with zero texts the message reads "(none — no text objects exist)".
5. `crop` with neither aspect nor rect (or both) → handler error naming both options; with rect, scene clamps — echo the resulting rect.
6. `rotate` normalizes (−90 → 270, 450 → 90, non-finite → 0) — echo the normalized value.
7. `set_adjustment` clamps at ±100 — echo applied value with "(clamped)" note when it differs.
8. `add_text` defaults: centered (50,50), size 32, color #ffffff — echo the assigned id and position words.
9. `export_png` in Node: `exportRequests` just increments; not undoable.
10. Activity feed: bounded at 50 newest-first; a throwing `onActivity` must never fail the tool call; entries use textContent only.
11. `annotations` try/catch fallback: re-register without annotations on throw.
12. HMR: second `registerAll` returns 0; flag set post-loop; exactly one guard.

## Edge Cases for the Builder (Phase 2 — implemented, kept for reference)

1. `undo()` on empty history returns `false` — no throw.
2. Redo stack cleared by any new mutation after undo; `canUndo`/`canRedo` flip correctly.
3. History ring caps at 50; snapshots share `dataURL` string references.
4. Adjustments clamp ±100 (non-finite → min); `moveObject` clamps 0..100; `rotate` normalizes 0..359.
5. `cropToAspect('square')` on 1600×900 → centered 56.25%-wide rect; portrait shrinks the other axis.
6. Unknown text id / adjustment kind / aspect name throws listing valid values.
7. `{fromRenderer: true}` coalesces drags to one history entry; `endGesture()` closes it.
8. Non-image file rejected visibly, no state change.
9. Images >4096px downscale to ≤2048px at load.
10. Crop applies in unrotated image space.
11. Sample load flows through `scene.loadImage` — one code path.
12. HMR: renderer subscribe/DOM listeners don't double-attach.

## Edge Cases (Phase 1 — for reference)

1. `modelContext` absent: banner shows, page works, zero console errors.
2. Dual-surface `navigator ?? document` adapter chain — don't simplify.
3. `registerTool` throw → banner fallback.
4. HMR guard returns 0 tools on re-run.
5. Deploy poll transients — deploy.sh retries; escalate only after two non-zero exits.
6. Curl criterion needs the static `<canvas>` in index.html — keep it literal.

## Phase 4 Validation (exact commands)

```bash
cd /Users/gjtorikian/Developer/speakeasel
npm run build                                                    # tsc + vite; catches ARIA-wiring type errors and unused exports
npx vitest run                                                   # full suite stays green (scene + tool-surface; UI untested by design)
./scripts/deploy.sh                                              # deploy FIRST, then og.png, then redeploy, then rehearse
# The five contract cmd checks (contract.md:24-28) — all must be green:
npm run build
npx vitest run test/tool-surface.test.ts
grep -rq "registerTool(" src
curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"
test -f LICENSE
# Ship:
gh repo view gjtorikian/speakeasel || gh repo create speakeasel --public --source . --push
```

Manual (spec Testing Requirements): keyboard-only full chrome walkthrough (Tab from top → skip link → toolbar → object list → feed, no traps); VoiceOver (`Cmd+F5`) — feed announces tool summaries (not JSON), object rows read sensibly, canvas label updates after an edit; README renders on GitHub with live links; one full SUBMISSION.md video-script rehearsal against the live URL before calling the phase done.

## Phase 3 Validation (for reference — all passed; Phase 3 committed as 48004cc)

```bash
cd /Users/gjtorikian/Developer/speakeasel
npx tsc --noEmit
npx vitest run test/tool-surface.test.ts
npx vitest run
npm run build
grep -rq "registerTool(" src
./scripts/deploy.sh
```

Suite pins (contract criterion — do not weaken): `tools.size >= 14` (actual: 15); `get_canvas_state` and `describe_canvas` by name; every schema compiles under `new Ajv({strict: true})`; round-trip deep-includes; error paths leave state deep-equal; reset → defaults.

## Phase 2 Validation (for reference — all passed; Phase 2 committed as a8e5c9f)

```bash
cd /Users/gjtorikian/Developer/speakeasel
npx tsc --noEmit
npx vitest run test/scene.test.ts
npm run build
./scripts/deploy.sh
```

## Phase 1 Validation (for reference — all passed; live URL re-verified serving `<canvas id="easel"` at Phase 4 scout time, 2026-09-02)

```bash
cd /Users/gjtorikian/Developer/speakeasel
npm run build
grep -rq "registerTool(" src
./scripts/deploy.sh
curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"
```
