# Speakeasel Contract

**Created**: 2026-09-02
**Readiness**: All 5 gates ready
**Status**: Approved
**Approval**: Express — single consolidated confirmation, no per-artifact review
**Supersedes**: None

## Problem Statement

Graphical editing is the least accessible category of software: if you can't operate a mouse precisely or can't see the canvas, image editors are simply closed to you. Assistive tech stops at reading — alt text describes an image, but nothing lets a person hear what is on a canvas and then change it. The blind parent who wants to crop and caption a family photo has no path at all.

This is also a thesis entry for the WebMCP Challenge (deadline 2026-09-03 13:00 PT; judged on WebMCP Leverage, Execution, Potential Impact, Creativity): when an editor's full scene graph is exposed as readable AND writable page tools, the agent in the browser becomes the interface — 'a screen reader that can write back.' The photo also never leaves the tab: the agent operates local state through tools, which no server-side API can replicate. Second, substantially different submission alongside Loopmate (rules permit multiple entries).

## Goals

1. Submit a complete second Devpost entry — live URL, public OSS-licensed repo, <3min YouTube video with audio narration, description — before 2026-09-03 13:00 PT
2. Expose ≥14 WebMCP tools spanning read (get_canvas_state, describe_canvas) and write (load, adjust, crop, rotate, text, object ops, undo/redo, export) so a human-edit → agent-describe round-trip is demonstrable in one session
3. From a fresh page in ChatGPT desktop, one natural-language prompt ('crop it square, brighten the shadows, caption it Tahoe 2026') performs a multi-operation edit visible on canvas within one agent turn
4. Demo video under 3 minutes showing eyes-free editing: agent narrates the canvas via describe_canvas, performs edits on request, and correctly describes a change the human made by hand

## Success Criteria

- [ ] Production build succeeds — check: `cd /Users/gjtorikian/Developer/speakeasel && npm run build` → exits 0
- [ ] Tool surface is real: ≥14 tools registered with valid JSON schemas, and an apply-edit → get_canvas_state round-trip reflects the edit (vitest with a modelContext shim running the REAL scene-state layer — the suite must assert the count, ajv-valid schemas, registration of get_canvas_state AND describe_canvas by name, and round-trip equality explicitly) — check: `cd /Users/gjtorikian/Developer/speakeasel && npx vitest run test/tool-surface.test.ts` → exits 0
- [ ] Code demonstrates modelContext.registerTool (explicit Devpost rules requirement) — check: `grep -rq "registerTool(" /Users/gjtorikian/Developer/speakeasel/src` → exits 0 — matches the call shape, not a comment (grep exits 1 on no match, 2 if src/ is missing)
- [ ] Live URL is up and public on Netlify — check: `curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"` → exits 0 — anchors on the canvas element the build emits, so a placeholder or stale deploy fails (site pre-claimed, id 3d23f8c6-1483-47d1-87d4-10f91e1f7a11; team-only protection pre-disabled)
- [ ] Repo carries an OSS license (submission requirement) — check: `test -f /Users/gjtorikian/Developer/speakeasel/LICENSE` → exits 0
- [ ] One-prompt edit: 'crop it square, brighten the shadows, caption it Tahoe 2026' in ChatGPT desktop performs all three operations visibly in one agent turn — judgment call: Garen runs the prompt in ChatGPT desktop's in-app browser against the live URL and captures it on video
- [ ] Round-trip on camera: after the human drags the caption by hand, the agent's describe_canvas reply reflects the new position — judgment call: Garen performs the drag mid-conversation and confirms the agent's description; captured on video
- [ ] Demo video is under 3:00, has audio narration, and is live on YouTube — judgment call: Garen verifies duration mechanically before upload (ffprobe -v error -show_entries format=duration -of csv=p=0 speakeasel.mp4 → <180) and checks audio narration before linking it
- [ ] Devpost submission completed before 2026-09-03 13:00 PT with all four deliverables linked, as a second entry alongside Loopmate — judgment call: Garen confirms the second submission receipt on webmcp.devpost.com

## Scope Boundaries

### In Scope

- Fabric.js canvas hosting one background image + text/shape objects, with a generated sample scene (gradient + shapes) and drag-drop/file-upload image loading — Fabric's object model, filters, and JSON serialization make a credible editor buildable in hours; generated sample avoids all asset licensing; upload keeps photos local to the tab
- Edit operations: brightness/contrast/saturation adjustments (Fabric filters), crop, rotate, add/edit/move/remove text objects, undo/redo history, PNG export — The minimum operation set for a believable 'edit a photo by talking' demo, each mapping 1:1 to a tool; goal 3's demo prompt needs exactly these
- ~14 WebMCP tools including get_canvas_state (scene graph JSON), describe_canvas (prose scene narration — the a11y thesis tool), and a statically registered undo that answers 'nothing to undo' when history is empty — The judged artifact; describe_canvas is the manifesto ('a screen reader that can write back'); undo is static per critic review — dynamic lifecycle is stretch flex, not MVP machinery
- Tool-call activity feed panel (bounded, newest-first) — Carried from Loopmate where it passed review: agent actions become legible on camera, and for this entry it doubles as visible evidence for sighted viewers of what the eyes-free user hears
- Accessible page shell: keyboard-operable chrome (toolbar, object-list panel, dialogs, focus states), ARIA labels/roles; the object-list panel mirrors the scene graph — An a11y-framed entry with an inaccessible page would be judged a fraud; keyboard manipulation of canvas objects themselves is stretch — the thesis demo drives edits through the agent, not arrow keys
- Netlify deploy via REST script (site pre-claimed: speakeasel.netlify.app) + public GitHub repo with OSS license + README carrying the a11y thesis and tool walkthrough — Hard submission requirements; deploy path proven on Loopmate
- Vitest suite (test/tool-surface.test.ts): modelContext shim + the REAL Fabric-free scene-state layer, covering registration count, ajv schema validity, edit→state round-trips, error paths — Only mechanical verification path; the scene-state/renderer split means Node tests exercise the actual product logic, mirroring Loopmate's Tone-free store — never a behavioral fake
- Blur/grayscale/sepia adjustment tools — Nice adjustment range, but no goal or demo prompt uses them — this tier is the defined cut line when the 24h execution risk lands
- Dynamic tool lifecycle via AbortSignal: per-object tools appear as objects are added; undo/redo registration tracks history state — Deepest tool-lifecycle flex if hours remain after the video is filmable — the Loopmate living-registry concept, correctly tiered here per critic review
- Keyboard manipulation of canvas objects (arrow-key nudge, resize) — Rounds out keyboard a11y beyond the chrome; the agent path covers the thesis without it
- readOnlyHint annotations on read tools — Spec-literacy signal, minutes of work, ride-along with the registry
- Keyboard-shortcut overlay — Rounds out the a11y story for sighted keyboard users

### Out of Scope

- Layers UI, brushes/drawing, selection lasso — Editor-suite scope; the thesis needs operations an agent can name, not painting
- AI image generation or ML alt-text — describe_canvas is deterministic from the scene graph; generation muddies the local-first story
- Accounts, cloud save, mobile layout — Same reasoning as Loopmate: zero leverage value in the judging window
- Loopmate depth upgrades (living FX registry, declarative form, share-link) — Explicitly traded away for this second entry; the living-registry concept moved here as the dynamic undo/per-object tools

### Future Considerations

- Real screen-reader interop testing (VoiceOver/NVDA) beyond ARIA correctness
- SVG/vector export

## Decisions Considered and Rejected

- **Build a second, substantially different entry rather than replacing or deepening Loopmate** — rejected: Deepening Loopmate with the selected upgrades (living FX registry, declarative form tool, share-link); replacing Loopmate entirely. Devpost rules allow multiple submissions per entrant; Loopmate is finished and verified, so a second entry doubles top-10 shots at the cost of extra filming, while a replacement would gamble a done entry on a 24h build.
- **A11y-framed image editor ('Speakeasel')** — rejected: Ask-your-data DuckDB-WASM workbench (recommended), form-hell killer. User chose the manifesto play with the Execution risk (5/10 in a 24h window) explicitly stated; impact narrative is the strongest of the three and lands with the Chrome judge.
- **Fabric.js as the canvas engine** — rejected: From-scratch canvas editor; Konva; embedding a hosted editor. Fabric ships the object model, image filters, transforms, and JSON serialization (get_canvas_state nearly free) under MIT; from-scratch cannot reach credible in 24h, and a hosted editor breaks the local-first story.
- **Generated sample scene instead of bundled photos** — rejected: CC0/stock photo assets. Zero licensing risk and zero asset pipeline; user uploads provide real photos at demo time, which also feeds the 'your photo never leaves the tab' line.
- **Editor architecture split: a Fabric-free scene-state layer (tools + Node tests run the real thing) and a thin Fabric renderer (browser-only subscriber)** — rejected: Tools calling a canvas-manager interface backed by a behavioral fake in tests; tools importing Fabric directly. Critic review: a behavioral fake reimplements the editor and tests verify the fake, not the product. The scene/renderer split is the exact store/Tone division that passed review on Loopmate — Node tests exercise real product logic, the renderer just draws state.
- **Undo registers statically in MVP; AbortSignal dynamic lifecycle is stretch** — rejected: Dynamic undo registration in MVP. Two critics flagged it: no goal requires lifecycle machinery, it's new unproven state-sync in a 24h build, and it muddies the ≥14-count assertion. Static undo answers 'nothing to undo' when history is empty.
- **Blur/grayscale/sepia demoted to the Full tier as the defined cut line** — rejected: All six adjustments in MVP. Critic review: no goal or demo prompt uses them and the tool count survives without them — a 24h build needs a named droppable tier, not an empty one.
- **Netlify site pre-claimed and protection pre-disabled at contract time** — rejected: Claiming the site during Phase 1. Loopmate learning applied: probe external dependencies before execution — the hostname is pinned in the curl criterion from the start and the free-tier team-only 401 cannot recur.
- **Reuse Loopmate's proven patterns: dual-surface WebMCP adapter, REST zip-deploy script, shim-backed vitest suite, activity feed** — rejected: Fresh approaches per component. Every pattern was reviewed and verified green yesterday; reuse converts the 24h risk into mostly-known work.

## Execution Plan

_Added during Phase 5 handoff. Pick up this contract cold and know exactly how to execute._

### Dependency Graph

```
Walking skeleton
  └── The editor  (blocked by Walking skeleton)
        └── Tool surface  (blocked by The editor)
              └── Polish and ship  (blocked by Tool surface)
                    └── Film and submit  (blocked by Polish and ship)
```

### Execution Steps

**Run the project** (recommended) — autopilot reads this contract, plans dependency waves, runs independent phases in parallel, and gates on failure:

```bash
/ideation:autopilot docs/ideation/speakeasel/contract.md
```

**Or run it unattended** — a `/goal` is a durability wrapper around the same autopilot run: Claude re-checks the condition before it is allowed to stop, so failures get repaired and re-run. Generated by `contract-gen --print-goal`; this is the only copy of that string:

```
/goal Drive the Speakeasel contract (speakeasel) to completion with /ideation:autopilot.

1. Run `/ideation:autopilot docs/ideation/speakeasel/contract.md`. All commits belong on branch ideation/speakeasel — switch to it before any run.
2. It dispatches a BACKGROUND workflow. Wait for the completion notification — never start a second autopilot run while one is in flight.
3. Then run the ideation plugin's `scripts/verify.mjs` against `docs/ideation/speakeasel/contract-data.json` and leave its VERIFY line in the conversation. Resolve the plugin's install directory first — `${CLAUDE_PLUGIN_ROOT}/scripts/verify.mjs` is a placeholder, not a shell variable, and bash will not expand it. That line is the only evidence this goal is judged on.
4. If anything failed, fix the spec or the implementation and go back to step 1. Autopilot skips phases that already have commits.

Done when the most recent VERIFY line reads fail=0 and commits=4/4 — or when two consecutive VERIFY lines are identical and still failing, in which case name the failing checks and stop, because a contract whose checks have rotted must not trap the run.
```

**Or run phases manually** in dependency order:

**Strategy**: Sequential

1. **Phase 1** — Walking skeleton _(blocking)_

   ```bash
   /ideation:execute-spec docs/ideation/speakeasel/spec-phase-1.md
   ```

2. **Phase 2** — The editor _(blocking)_

   ```bash
   /ideation:execute-spec docs/ideation/speakeasel/spec-phase-2.md
   ```

3. **Phase 3** — Tool surface _(blocking)_

   ```bash
   /ideation:execute-spec docs/ideation/speakeasel/spec-phase-3.md
   ```

4. **Phase 4** — Polish and ship _(blocking)_

   ```bash
   /ideation:execute-spec docs/ideation/speakeasel/spec-phase-4.md
   ```

5. **Phase 5** — Film and submit _(blocked by Polish and ship)_

   ```bash
   # Review: Film and submit
   ```

---

_This contract was generated from brain dump input. Review and approve before proceeding to specification._
