# PanelSync — Claude Working Rules

## Read on every session start
1. This file
2. `documents/CONCEPT.md` — current build state and next step

---

## Session Rhythm

1. **Orient** — read CONCEPT.md. The "Next Step" field tells you what to work on. Do not invent a new task.
2. **Confirm** — tell the user what you understand the task to be before starting.
3. **Work** — execute the task. One thing at a time.
4. **Decide together** — if something unexpected comes up mid-session, decide with the user: solve it now or add it to Deferred.
5. **Update CONCEPT.md** — before committing: update "Current Build State", set the new "Next Step", move anything resolved out of Deferred.
6. **Commit** — only after CONCEPT.md is updated. Next Step must be filled in. No empty Next Step commits.
7. **New session** — the committed Next Step becomes the new session start.

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
- Use `npm run dev --workspace=apps/api` to start the API.
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
