# Speakeasel — Devpost Submission Kit

Everything the human gate needs: the text description to paste into Devpost, a
shot-by-shot video script, and the submission checklist.

- **Live app**: <https://speakeasel.netlify.app> (hosted on **Netlify** — mention this on the form for the Netlify side pool)
- **Repo**: <https://github.com/gjtorikian/speakeasel>
- **Deadline**: **2026-09-03 13:00 PT**
- **Note for the form**: this is a **second entry alongside Loopmate**, and substantially different — Loopmate is an *instrument* about co-creation; Speakeasel is an *editor* about accessibility: an agent that sees a canvas for someone who can't, and writes back.

## Devpost text description (paste as-is, ~300 words)

**Speakeasel is an image easel a human and an AI agent edit together — and a
screen reader that can write back.** A Fabric.js canvas where the human
uploads a photo, drags captions, and rides adjustment sliders while the agent
adjusts, crops, rotates, and captions through WebMCP tools. Both edit the same
live scene.

**Use-case fit: the agent as eyes, not just hands.** `describe_canvas` narrates
the whole canvas in reading order — image, adjustments in words, every caption
with its position — complete enough to redraw the scene without seeing it. A
blind or low-vision user can edit a photo by conversation: ask what's there,
say what to change, hear the result. The same tool is how a sighted user asks
"what did I just do?" after a flurry of agent edits.

**UX benefit: the loop runs both ways.** Anything mechanical ("make it moodier,
crop it square, caption it") goes to the agent in one sentence; anything
tactile (dragging a caption into just the right spot) stays under the human's
pointer — and the agent reads the drag back on its next call. An on-page
activity feed lists every tool call and doubles as an `aria-live` region, so
the agent's side of the collaboration is visible, audible, and honest.

**Implementation.** Fifteen WebMCP tools registered through a tiny adapter that
binds `navigator.modelContext ?? document.modelContext` — whichever surface
the client exposes. Every tool is a thin wrapper over one observable scene
store; the Fabric renderer, the toolbar, the object list, and the canvas's own
`aria-label` subscribe to the same store, which is what makes agent edits and
human drags indistinguishable at the data layer. The photo never leaves the
tab: state reads project the image to name and dimensions, never pixels.

No LLM API keys. No chat UI. The browser brings the agent; the page brings the
easel. Built with Vite + TypeScript + Fabric.js, hosted on Netlify.

## Video script (target ≤ 2:45; hard limit 3:00)

Film at a ~1280×800 window so the toolbar, feed, and captions stay legible at
1080p. **Deploy first, film against the live prod URL.** Do one full
fresh-profile rehearsal before recording. (Fallback filming client: Chrome
149+ with `chrome://flags/#enable-webmcp-testing`, if ChatGPT desktop
misbehaves.)

| Time | Shot | Action / line |
| --- | --- | --- |
| 0:00–0:25 | **Hook.** Fresh load of the live URL: the easel with the sample scene, activity feed empty. | Voice: *"I can't see this canvas. Watch me edit a photo anyway."* Ask: *"describe what's on the canvas."* — `describe_canvas` narrates the scene, read aloud. Let the narration land before moving on. |
| 0:25–1:15 | **Leverage.** Keep the activity feed in frame. | One prompt: *"make it moodier — lower the brightness, boost the contrast, crop it square, and caption it 'DUSK' near the bottom."* Tool calls scroll in the feed; the canvas transforms. One line of voiceover: "Every edit is a WebMCP tool call — fifteen of them, announced by the page as they happen." |
| 1:15–1:50 | **The round-trip (the differentiator).** | Drag the DUSK caption by hand to a new corner. Ask: *"where's the caption now?"* — the agent answers from the scene state, correctly. Then: *"center it and make it bigger."* It builds on the human's move. |
| 1:50–2:20 | **Implementation beat.** 10-second code flash. | Cut to `src/webmcp/tools.ts`: the `registerTool` dispatch loop and the `describe()` narration builder. Voiceover: "One observable scene store; the agent, the human, and the screen reader are just three subscribers." |
| 2:20–2:45 | **Close.** | Browser showing the live URL, repo README beside it. "Speakeasel — speakeasel.netlify.app. A screen reader that can write back." |

## Submission checklist

- [ ] Final deploy done (`./scripts/deploy.sh`) and OG tags verified against the live URL
- [ ] Full rehearsal on a fresh browser profile, end to end, before recording
- [ ] Record the video; verify length: `ffprobe -v error -show_entries format=duration -of csv=p=0 speakeasel.mp4` → **< 180**
- [ ] Upload to YouTube (public or unlisted), confirm playback + audio
- [ ] Devpost form: title, tagline, text description (above), video URL, live URL, **public repo URL**, Netlify hosting mention (side pool), the **second-entry note** above
- [ ] Submit before **2026-09-03 13:00 PT** — do not wait for the deadline hour
