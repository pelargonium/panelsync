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

## 7. The workspace and navigation state — OPEN

- Where does user navigation state live — last open entity, depth state (entity only / split / dossier only), warm contexts? Persisted to DB or in-memory per session?
- Route structure: the series segment question is resolved (containers replace series/issues with a single flexible hierarchy). But the exact URL structure for the new container-based hierarchy needs to be decided before the workspace shell is built.

---

## 8. The issue-level script editor — OPEN

- The editor loads all pages of a container as one continuous document. How does auto-save work — whole container at once, or page by page as edited?
- How does the editor know which page to scroll to on open — container ID + page ID in URL as scroll target?

---

## 10. Versioning and locking — OPEN

- Pages can be locked. Can dossier attachments be locked independently of the entity they're attached to?
- Does the handoff phase of a character dossier need locked state on individual attachments, or just on the dossier as a whole?
- Block-level versioning for undo history and collaboration — does the event log cover this, or is something more needed?

---

## 11. The schedule — OPEN

**Current agreed order:**
1. Schema revision (Drizzle + Neon migration)
2. API route updates (containers, drafts, hierarchy)
3. Workspace shell (persistent universe screen, UniverseContext)
4. Inline creation in binder
5. Script editor

Questions remaining:
- At what point does the dossier UI get built — before or after the script editor?
- When does file upload / R2 integration ship?
- Bible (characters, locations) — before or after the script editor?
