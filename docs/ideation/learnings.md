# Ideation Learnings

Generalizable spec-gap and interview patterns captured from completed
ideation projects. Intake reads this file so recurring gaps inform future
questioning and spec generation. Each entry is dated and cites its
evidence; treat entries as hints, never as a substitute for gate evidence.

## 2026-09-02 — speakeasel

- **Pattern**: Specs that place publish steps (production deploy, public repo push) inside a reviewed phase collide with the review gate — builders correctly refuse to publish unreviewed, uncommitted state, so the step silently defers and the live artifact goes stale until a human notices. Seen on both Loopmate (Phase 4 deferred the repo push) and Speakeasel (Phase 4 deferred deploy AND push).
  **Evidence**: run-2026-09-02.json Phase 4 summary ("Deploy and gh repo create were deferred to the post-review/commit stages"); Loopmate implementation-notes-phase-4.html.
  **Spec/interview implication**: Assign deploy/push to a named post-commit owner — the orchestrating session or a final ship step that runs after the phase commits — never as an in-phase implementation step.
