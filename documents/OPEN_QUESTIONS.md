# PanelSync — Open Design Questions
*Work through these before building. Resolved questions are kept for reference.*

---

## ✅ 1. The Dossier as a data structure — RESOLVED

**Decisions:**
- Single `dossier_attachments` table, polymorphic entity reference, jsonb payload
- Extracted `search_text`, `entity_refs`, `tags` columns for indexable search — API layer maintains these
- Search abstracted behind API endpoint from day one — client never knows what's underneath
- Drawings and handwritten notes: exported as PNG, uploaded to R2, referenced via `files` table + dossier attachment payload
- Live pinned views (timeline slices, filtered lists): stored as query/filter descriptor in payload, not a snapshot
- Dossier layout preference (vertical/horizontal scroll) stored in `dossier_canvas_state` per entity

See DESIGN.md — The Dossier System.

---

## ✅ 2. The Bible / Character / Location schema — RESOLVED

**Decisions:**
- `bible_entries` stripped to minimum: id, universe_id, type, name, color, timestamps
- No prescribed fields beyond the minimum — everything else is a dossier attachment
- Custom fields = text dossier attachments with user-defined labels
- Waypoints = dossier attachments with `type: "waypoint"`, optional timeline event connection
- Series overlays = dossier attachments with `context: { "container_id": "..." }` scoping
- `bible_entry_images` and `bible_entry_series_overlays` tables removed

See DESIGN.md — Character, Location, and Complete Schema.

---

## ✅ 3. The script block format — RESOLVED

**Decisions:**
- `script_blocks` is a real table — not a jsonb array on pages
- `content` stores a ProseMirror document fragment (supports rich text + inline structural marks)
- `speaker` is a plain text column (queryable without jsonb parsing)
- `size_tag` on panel blocks (full, half, third, quarter, custom)
- `position` is a float for insertion without reindexing
- Panel numbers derived at render time — never stored
- Inline structural marks (`@character`, `#location`) create `entity_refs` entries at write time

See DESIGN.md — Script Block Format.

---

## ✅ 4. The Timeline data structure — RESOLVED

**Decisions:**
- `asset_timeline_tags` removed — entity connections on timeline events stored as `entity_link` dossier attachments
- Multiple timelines per character: a timeline can be attached to any entity via its own dossier attachment
- Waypoints on a character connect to timeline events optionally via `entity_link` in the waypoint attachment payload — loose reference, not a foreign key

See DESIGN.md — Timeline.

---

## ✅ 5. The entity reference / connection system — RESOLVED

**Decisions:**
- No separate `connections` table needed
- Connections stored as `entity_link` dossier attachments — typed, contextualized, with dossier benefits
- `entity_refs` uuid[] column on `dossier_attachments` enables fast reverse lookups
- Inline script marks (`@character`) populate `entity_refs` at write time via the API

---

## ✅ 6. Comments — RESOLVED

**Decisions:**
- Comments survive as a separate system — ephemeral collaborative communication, not dossiers
- `target_type / target_id` pattern is sufficient — `script_block` is a valid entity_type
- Minor cleanup: renamed fields to match rest of schema, added `universe_id`

See DESIGN.md — Comments.

---

## ✅ 9. File storage — RESOLVED

**Decisions:**
- All binary files in Cloudflare R2
- `files` table: lightweight registry with storage_key, url, mime_type, dimensions, uploaded_by
- Same file can be referenced from multiple dossier attachments without duplicating storage
- In-app drawings: exported as PNG → uploaded to R2 → `files` record → dossier attachment

See DESIGN.md — File Storage.

---

## ✅ Publication Hierarchy — RESOLVED (new question, now resolved)

**Decisions:**
- Hierarchy is user-definable — not hardcoded as Series/Issue
- `hierarchy_levels` table per universe (default: "Series" pos 1, "Issue" pos 2)
- `containers` table replaces `series` and `issues` — self-referential via `parent_id`
- `series` and `issues` tables removed

See DESIGN.md — Publication Hierarchy.

---

## ✅ Drafts — RESOLVED (new question, now resolved)

**Decisions:**
- Content is decoupled from publication structure
- `drafts` table: free-floating content workspaces with nullable `container_id`
- Pages belong to either a container or a draft — not both
- Binder has two zones: publication structure (upper) and pool (lower)
- Assigning draft to publication: drag in binder OR context menu in editor

See DESIGN.md — Drafts.

---

## ✅ Event Log — RESOLVED (new question, now resolved)

**Decisions:**
- Append-only `events` table ships in v1
- One row per write operation across the whole system
- History browsing UI deferred to v2
- `updated_by` / `updated_at` fields derived from event log at write time

See DESIGN.md — The Event Log.

---

## ✅ 7. The workspace and navigation state — RESOLVED

**Decisions:**
- Navigation state persists to the database — `workspace_state` table, one row per user per universe
- Written on navigation actions (not keystrokes), debounced
- Fields: `activeEntityType`, `activeEntityId`, `depthState`, `binderOpen`, `warmContexts` (jsonb, capped ~10 entries)
- Route structure is flat: `/universe/[id]` is the only workspace route, no path segments for open entity
- Deep links via generated share tokens (`/share/[token]`), deferred to v2

---

## ✅ 8. The script editor — RESOLVED

**Decisions:**
- Auto-save is block-level, debounced 500ms after last keystroke
- Save indicator tracks dirty state per block — "All saved" when all blocks are clean
- Editor maintains a ref map of page scroll offsets — scroll to page on activation, no remount
- Page switching in the binder = scroll, not navigation. Same editor component, different scroll position.

---

## ✅ 10. Versioning and locking — RESOLVED

**Decisions:**
- Dossier attachments can be locked individually via `state` field (`draft`, `canonical`, `locked`)
- Whole-entity lock exists as a batch convenience operation that sets all attachments to locked at once
- Event log is sufficient for v1 block versioning — covers undo history and audit trail
- Formal `script_block_versions` table deferred to v2

---

## ✅ 11. The schedule — RESOLVED

**Agreed build order:**
1. ✅ Schema revision (complete)
2. Workspace shell — persistent universe screen, shared UniverseContext, `workspace_state` table
3. Inline creation in binder (replace modals)
4. Script editor — block-level, continuous scroll, auto-save
5. Bible (characters, locations) — dossier-first
6. Dossier UI — after Bible so there's real content to attach to
7. File upload / R2 integration — alongside or just before dossier UI
8. Timeline tool
9. Collaboration, comments, share links
10. Export
