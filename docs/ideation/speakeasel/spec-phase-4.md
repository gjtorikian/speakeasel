# Implementation Spec: Speakeasel - Phase 4 (Polish and Ship)

**Contract**: ./contract.md
**Repo root**: `/Users/gjtorikian/Developer/speakeasel` — this project is its own git repository (NOT the outer `~/Developer` repo); `cd` here first and resolve every relative path in this spec against it.
**Estimated Effort**: M (~2.5h)

## Technical Approach

Ship the manifesto. Three workstreams: (1) **the a11y pass this entry cannot skip** — semantic chrome with real ARIA (toolbar roles/labels, `aria-live="polite"` on the activity feed and object list so screen readers hear agent actions, focus order, visible focus rings), because an accessibility-framed entry with an inaccessible page is disqualifying hypocrisy; (2) **visual identity** — a calm gallery-dark theme (charcoal surface, warm paper-white canvas mat, one teal accent; the canvas is the hero, chrome recedes); (3) **the judged repo and submission kit** — README leading with the thesis ("a screen reader that can write back"), the 14-tool table, the scene/renderer architecture note, and `SUBMISSION.md` with the Devpost description + shot-by-shot script for an eyes-free demo video. Then final deploy, **create and push the public GitHub repo** (owned by this phase per critic review), and all five contract cmd checks green.

No new features; the Full-tier adjustments (blur/grayscale/sepia) get built ONLY if everything above is done with time to spare.

## Decisions Considered and Rejected

_Carried from the contract (full log in spec-phase-1.md); load-bearing here:_

- **Keyboard-operable chrome, not canvas-object keyboard editing** — the demo drives edits through the agent; arrow-key nudging is stretch.
- **Second entry alongside Loopmate** — SUBMISSION.md must note "substantially different" positioning (instrument vs editor, creation vs accessibility) in case Devpost reviews the pair.
- **Netlify + REST deploy; site pre-claimed** — final deploy via `./scripts/deploy.sh`.

## Feedback Strategy

**Inner-loop command**: `npm run dev` at ~1280×800 (filming resolution).

**Playground**: Browser + keyboard-only walkthrough + VoiceOver spot-check (macOS `Cmd+F5`) on the chrome.

**Why this approach**: This phase is ARIA, CSS, prose, and ship mechanics — judged by eyes, ears, and the contract's cmd checks.

## File Changes

### New Files

| File Path       | Purpose                                                            |
| --------------- | ------------------------------------------------------------------- |
| `LICENSE`       | MIT, © 2026 Garen J. Torikian                                       |
| `README.md`     | Thesis + live URL + client setup + tool table + architecture + a11y notes + run/test |
| `SUBMISSION.md` | Devpost description (~300 words), eyes-free video script ≤2:45, checklist with deadline 2026-09-03 13:00 PT |
| `public/og.png` | OG card from a live screenshot                                      |

### Modified Files

| File Path        | Changes                                                          |
| ---------------- | ------------------------------------------------------------------ |
| `src/styles.css` | Full theme pass: tokens, focus rings, reduced-motion, feed/list legibility at 1080p |
| `index.html`     | Title/meta/OG tags (optional garnish per contract); ARIA roles and labels completed; skip-to-toolbar link |
| `src/ui/toolbar.ts` / `objectlist.ts` | aria-labels, keyboard handlers (Enter/Space activation, roving focus where apt), `aria-live` regions |
| `package.json`   | repo/homepage/license fields                                       |

## Implementation Details

### A11y pass (the load-bearing one)

**Key decisions**: `aria-live="polite"` on the activity feed turns agent tool calls into screen-reader announcements — the page narrates what the agent does, closing the loop the thesis promises. Object list rows are focusable with descriptive labels ("Caption 'Tahoe 2026', 12% across, 8% down, button: remove"). Canvas gets `role="img"` with an `aria-label` kept in sync from the same summarizer `describe_canvas` uses (one source of truth).

**Implementation steps**: 1. Roles/labels/skip-link; 2. keyboard walkthrough — every chrome action reachable and operable without a mouse; 3. VoiceOver spot-check: load sample, agent-free toolbar edit, hear the feed announce.

**Feedback loop**:
- **Playground**: dev server, keyboard only, then VoiceOver.
- **Experiment**: Tab from page top → skip link → toolbar → object list → feed with no traps; trigger a tool from the Inspector and hear the live region announce it.
- **Check command**: `npm run build` (structural); the rest is ears/eyes by design.

### Theme

**Experiment**: screenshot at 50% zoom — canvas hero, chrome recedes, focus rings visible; `prefers-reduced-motion` honored on any transitions.

### README + SUBMISSION.md

README order: thesis paragraph → live URL + "works in ChatGPT desktop or Chrome 149+ flag" → 90-second try-it script → tool table (14) → architecture (scene/renderer split, why tools never touch Fabric, privacy: the photo never leaves the tab) → a11y statement (what's done, what's stretch — honest) → run/test/deploy.

SUBMISSION.md video script (≤2:45): 0:00-0:25 hook — blank editor, voice: "I can't see this canvas. Watch me edit a photo anyway." → describe_canvas narrates; 0:25-1:15 one-prompt edit (goal 3 prompt) with activity feed visible; 1:15-1:50 the round-trip — human drags the caption, agent describes the new position (goal 4); 1:50-2:20 code flash: registerTool + describe_canvas source; 2:20-2:45 thesis close + URLs. Checklist: ffprobe < 180, YouTube, Devpost form, "second entry" note.

### Final ship

1. `./scripts/deploy.sh`; confirm `<canvas` grep against live HTML.
2. `gh repo create speakeasel --public --source . --push` (escalate only if gh auth broke since yesterday).
3. Run all five contract cmd checks; all green before the human gate.

## Data Model / API Design

None.

## Testing Requirements

Full suite stays green (`npx vitest run`).

### Manual Testing

- [ ] Keyboard-only full chrome walkthrough, no traps
- [ ] VoiceOver announces feed entries and object-list rows sensibly
- [ ] README renders on GitHub; links live
- [ ] One full video-script rehearsal against the live URL before calling the phase done

## Error Handling

| Error Scenario         | Handling Strategy                                     |
| ---------------------- | ------------------------------------------------------ |
| gh unauthenticated     | Escalate for `! gh auth login`                         |
| aria-live too chatty   | Feed announces summary line only, not args JSON        |

## Failure Modes

| Component | Failure Mode                         | Trigger                    | Impact                        | Mitigation                                  |
| --------- | ------------------------------------- | --------------------------- | ------------------------------ | -------------------------------------------- |
| A11y pass | Claiming more than shipped            | README overpromises         | Judged hypocrisy on the thesis | Honest a11y statement: chrome yes, canvas-object keys stretch |
| Ship      | Filmed build ≠ deployed build         | Editing after deploy        | Judges see different behavior  | Deploy FIRST, then rehearse/film against prod |

## Validation Commands

```bash
cd /Users/gjtorikian/Developer/speakeasel && npm run build
cd /Users/gjtorikian/Developer/speakeasel && npx vitest run test/tool-surface.test.ts
grep -rq "registerTool(" /Users/gjtorikian/Developer/speakeasel/src
curl -sf https://speakeasel.netlify.app/ | grep -qi "<canvas"
test -f /Users/gjtorikian/Developer/speakeasel/LICENSE
```

## Rollout Considerations

- After this phase only the human gate remains: film per SUBMISSION.md, upload, submit as the second entry before **2026-09-03 13:00 PT**.

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
