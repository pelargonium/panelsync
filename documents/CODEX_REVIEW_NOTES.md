# PanelSync — Codex Review Notes

This note summarizes the main concerns found during Codex's initial codebase review so Claude can decide whether they should be scheduled as follow-up work.

## Summary

The repo is in solid shape overall: the API and mobile app both type-check/build cleanly, the product direction is well documented, and the universe/series/issue/page foundation is already in place. The main concerns are not broad architectural failures. They are targeted risks around access control, environment safety, placeholder endpoints, and a small documentation mismatch.

## Findings

### 1. High — page update route is missing authorization checks

- File: `apps/api/src/routes/series.ts`
- Route: `PATCH /api/series/issues/pages/:pageId`
- Concern: the handler loads the page and updates it, but does not verify that the caller has access to the page's parent universe.
- Risk: any authenticated user who learns a valid `pageId` could potentially update that page unless another layer blocks it.
- Suggested action: add the same universe-membership access check used by the surrounding issue/page routes before allowing updates.

### 2. Medium — JWT secret falls back to a known default

- File: `apps/api/src/plugins/auth.ts`
- Concern: JWT setup uses `process.env.JWT_SECRET ?? 'dev-secret-change-in-production'`.
- Risk: if a deployed environment is misconfigured, tokens could be signed with a predictable secret.
- Suggested action: keep the fallback only for explicitly local/dev modes, or fail fast when `JWT_SECRET` is missing outside development.

### 3. Medium — characters API is registered but still a stub

- Files:
  - `apps/api/src/index.ts`
  - `apps/api/src/routes/characters.ts`
- Concern: `/api/characters` is live in the server, but the handlers are placeholders returning empty/null data and are not wired to auth or DB behavior.
- Risk: future frontend work may accidentally rely on these placeholder responses and create misleading "working" behavior.
- Suggested action: either implement the route properly before using it, or disable/unregister it until real behavior is ready.

### 4. Low — series/issue/page numbering can race under concurrent creates

- File: `apps/api/src/routes/series.ts`
- Concern: numbering is assigned by reading existing rows, taking `max(number) + 1`, then inserting.
- Risk: concurrent creates can produce duplicate numbers unless the database enforces uniqueness and the app retries.
- Suggested action: decide whether duplicate numbering is acceptable for now. If not, add DB constraints and/or transactional retry logic later.

### 5. Low — project status doc has an outdated sprint line

- File: `documents/CONCEPT.md`
- Concern: the sprint section still says "Next: Sprints 4–5" even though the current build state already says schema/auth/CRUD work is done.
- Risk: mainly confusion during handoff or session startup.
- Suggested action: update the sprint-position line when the next documentation pass happens.

## Suggested Triage

Recommended to address soon:
- Finding 1: authorization gap on page updates
- Finding 2: JWT secret fallback behavior

Reasonable to schedule behind active feature work:
- Finding 3: characters route stub
- Finding 4: numbering race condition
- Finding 5: outdated sprint line in `CONCEPT.md`

## Verification Context

Checks run during the review:

- `npm run build --workspace=apps/api`
- `npx tsc --noEmit -p apps/mobile/tsconfig.json`

Both completed successfully in the reviewed checkout.
