# PanelSync — Claude Working Rules

## Read on every session start
1. This file
2. `documents/CONCEPT.md` — current build state and next step
3. `documents/DESIGN.md` — foundational design principles and architecture decisions
4. `documents/TASK.md` — if present, a task brief is active (Codex handoff in progress or pending review)

---

## Session Rhythm

### Claude-only session (planning, review, direct implementation)
1. **Orient** — read CONCEPT.md. The "Next Step" field tells you what to work on. Do not invent a new task.
2. **Confirm** — tell the user what you understand the task to be before starting.
3. **Work** — execute the task. One thing at a time.
4. **Decide together** — if something unexpected comes up mid-session, decide with the user: solve it now or add it to Deferred.
5. **Update CONCEPT.md** — before committing: update "Current Build State", set the new "Next Step", move anything resolved out of Deferred.
6. **Commit** — only after CONCEPT.md is updated. Next Step must be filled in. No empty Next Step commits.
7. **New session** — the committed Next Step becomes the new session start.

### Codex handoff session (Claude plans → Codex builds → Claude reviews)
1. **Orient** — read CONCEPT.md and TASK.md (if present).
2. **Claude writes TASK.md** — precise brief: objective, files to change, files NOT to touch, constraints, acceptance criteria, relevant context (schema, types, API shape). This is the source of truth for Codex.
3. **Codex implements** — Codex reads TASK.md and executes. Codex should stay within the brief's scope. If the brief is unclear, incomplete, or contradicted by the codebase/spec, Codex should flag it and make the minimum safe assumption rather than guessing broadly.
4. **Codex updates TASK.md** — before handing back, Codex sets status to `needs Claude review` and adds a short completion note with files changed, verification run, and any open risks/assumptions.
5. **Claude reviews the diff** — check correctness, spec alignment, schema safety, no regressions. Request fixes if needed.
6. **Claude updates CONCEPT.md** — "Current Build State" and "Next Step" updated to reflect the completed work.
7. **Claude clears TASK.md** — replace contents with `# No active task` once the work is committed.
8. **Commit** — same rules as always. Next Step must be filled in.

---

## Commit Rules

- Do not commit without updating CONCEPT.md first.
- "Next Step" must be a single, unambiguous sentence.
- Stage specific files — never `git add .` blindly.
- Commit message: concise, describes what changed and why (not what files changed).
- Never commit: `.env`, secrets, `node_modules`, `.claude/`.

---

## Where Things Live

| What | Where |
|------|-------|
| Session rhythm + rules | `CLAUDE.md` (this file) |
| Current state + next step | `documents/CONCEPT.md` |
| Active Codex task brief | `documents/TASK.md` |
| Design principles + architecture | `documents/DESIGN.md` |
| Full product spec | `documents/SPEC.md` |
| Design system reference | `documents/styles.html` |
| Screen mockups | `apps/mobile/app/mockups/` (Expo screens) |
| Mobile app | `apps/mobile/` |
| Backend API | `apps/api/` |
| Shared types (future) | `packages/types/` |
| Product docs | `documents/` |

---

## Tech Rules

- Node via nvm: `/Users/maximus/.nvm/versions/node/v24.14.0/bin/`
- Use `npm run dev --workspace=@panelsync/api` from the repo root to start the API, or `npx tsx watch src/index.ts` from `apps/api/`.
- Use `npx expo start --clear` from `apps/mobile/` to start the mobile app.
- All new mobile components use NativeWind `className` — not new StyleSheet blocks.
- All existing StyleSheet styles are valid — do not refactor them unless asked.
- API schema lives in Drizzle TypeScript files — do not write raw SQL migrations by hand.
- Never modify the Drizzle schema without flagging it to the user first.

---

## Communication Style

- Concise. No emojis. No filler.
- Lead with the action or answer, not the explanation.
- When blocked, say so and propose options — do not silently try alternatives in a loop.
- Ask before doing anything destructive or hard to reverse.
- When the data model is uncertain, implement the minimum needed and flag the assumption.
