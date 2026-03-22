# PanelSync — Design Principles & Architecture
*Established across two design sessions, March 2026. This document captures foundational decisions made before Sprint 6. It supersedes any conflicting assumptions in earlier documents or code.*

---

## The Foundational Principle

**The data just exists. PanelSync's job is to provide the best possible tools for creating, organizing, and viewing that data — so the person using it can think clearly about their story and realize their vision.**

The app does not impose a workflow. It does not decide that you must write before you draw, or build characters before you start writing. It makes all data accessible and editable from whatever angle is most useful at any given moment.

**No tool owns the data it works with.** The script editor does not own the page. The binder does not own the series list. The timeline tool does not own the events. Every tool is a view into shared underlying data. Any tool can create, edit, or reference any piece of that data.

---

## The Workspace Model

PanelSync is a **workspace**, not a file browser.

**File browser model (wrong):** The app is a series of screens. Tapping an entity pushes a new screen. The binder disappears when you go deeper. You use the back button to go up. Each screen is independent and owns its own data.

**Workspace model (correct):** There is one persistent universe workspace. The binder is always present. Tapping an entity opens it in the content area — nothing navigates away, nothing disappears. Multiple entities can be active simultaneously. Context accumulates rather than gets replaced.

This distinction affects routing, state management, the editor architecture, and how the binder works. Every implementation decision should be evaluated against this model.

---

## The Entity Framework

Before designing any feature, ask these four questions about the data it works with:

1. **Where does it live in the hierarchy?** What contains it, what does it belong to?
2. **What does it contain or reference?** What data is part of it, what does it point to?
3. **What can reference it?** What other entities point back at it?
4. **How can it be rendered?** What lenses exist for viewing it?

These questions surface edge cases and reveal connections that fixed-schema thinking misses. Use them whenever a new entity or feature is being designed.

---

## Data Types and What We Know About Them

### The Universal Pattern

Every entity in PanelSync shares the same underlying pattern:
- It is a **container for all data relevant to one thing**
- It can be viewed through **multiple lenses** — different tools reveal different aspects of the same data
- It has a **dossier** (see below)
- It can have **comments** attached to it
- Its data is **lightweight and renderer-agnostic** — display logic lives in the tools, not the data

Every piece of data exists at the universe level. Context narrows the lens. The user decides how deep to go. A fact with no context is visible everywhere. Scoped to a series, it narrows. Scoped further, it narrows again. The merge happens at read time based on where you are in the project.

### Page

A page is a container for all data relevant to one unit of the final comic. It does not "belong" to any single tool.

**What it contains:**
- Script blocks — an ordered list of typed content blocks (see Script Block Format below)
- Storyboard data — sketch data, reference images, reference opacity (stored as dossier attachments)
- Panel structure — derived from script block size tags at render time, never stored
- Status — draft / in review / locked / complete
- Revision metadata — updated_at, updated_by

**Lenses:**
- Script editor — text-based, block-structured, continuous scroll across all pages of an issue
- Storyboard canvas — spatial, visual, drawing-based, one page at a time
- Issue Map thumbnail — small visual representation of page status
- Reader view — immersive, no chrome, storyboard art in sequence (see Issue lenses)
- Printer view — two-page spreads (see Issue lenses)
- PDF export — rendered output

### Script Block Format

Script blocks are rows in the `script_blocks` table — not a jsonb array on the page. Each block is a first-class entity with a stable ID. This enables: dossier attachments per block, comments per block, moving blocks between pages, clipboard state, and event log tracking.

**Table fields:**
```
script_blocks
- id
- page_id       (nullable — null if block is in clipboard/draft state)
- draft_id      (nullable — if block belongs to a loose draft)
- type          (panel, scene, description, dialogue, caption, sfx)
- content       (jsonb — ProseMirror document fragment)
- speaker       (nullable text — dialogue only, plain text, queryable)
- size_tag      (nullable text — panel only: full, half, third, quarter, custom)
- position      (float — allows inserting between blocks without reindexing)
- created_by
- created_at
- updated_at
- updated_by
```

**Rules:**
- `content` stores a ProseMirror document fragment — supports rich text (bold, italic) and inline structural marks (`@character`, `#location`) that create entity connections
- `speaker` is plain text outside the ProseMirror content because it needs to be queryable without parsing jsonb
- `panel` blocks use `size_tag` — panels don't have text content
- Panel numbers (Panel 1, Panel 2...) are **derived at render time** by counting panel blocks in order — never stored
- `position` is a float — inserting between positions 1.0 and 2.0 gets 1.5, no reindexing needed
- Inline structural marks (`@character`) create entries in `dossier_attachments.entity_refs` at write time

### Character

A character is a **living dossier** — not a static record with fixed fields.

**Lifecycle phases:**
- **Discovery** — freeform, generative, messy by design. The author is figuring out who this person is. Notes, contradictions, half-formed ideas, visual references.
- **Active story** — the character is being written. The page accumulates script references, dialogue, visual references, outfit references for specific pages, annotations. It is a living record of the character as they are being realized.
- **Handoff** — a run ends, a new author comes on. An editor condenses and locks what is canonical: what is true, what has happened, what has not been revealed yet, what the new author can and cannot change. This is an authoritative document, not a generative one.

**Waypoints:** A character can have author-defined waypoints — moments where something fundamental changed about them. "Before the war." "After losing her brother." "Series 3 onwards." Each waypoint creates a context in which certain facts are true, others no longer apply, new ones are added. The character page rendered in the context of a specific issue shows the appropriate version. Waypoints are stored as dossier attachments with `type: "waypoint"`. They can optionally connect to a timeline event but do not have to.

**Series overlays:** Series-specific context stored as dossier attachments with `context: { "container_id": "..." }` scoped to the relevant series container. They layer on top of universal facts without replacing them.

**Minimum fixed fields:** Only `name`, `type`, `color`. Everything else — appearance, backstory, personality, custom fields, images, sketches, waypoints, series overlays — is a dossier attachment. There are no prescribed fields beyond the minimum. A writer making a comic of two people waiting for nobody needs to fill nothing in.

**Key fact:** A character page IS a dossier — it is the primary interface for that entity. There is no separate "character screen."

### Location

Same data structure as Character — a living dossier with lifecycle phases, waypoints, series overlays, images, sketches, and user-defined attachments.

A location has its own lifecycle: a place can exist in ruins in one series and as a thriving city in a prequel. The same waypoint and overlay system applies.

Location-specific tools (maps, spatial tools, etc.) are not yet designed — flagged for future design work once the dossier system is built and used.

**Key fact:** Locations and characters are the same kind of entity at the data level. Their default fields and eventual specialized tools differ, but the underlying pattern is identical.

### Timeline

A timeline is simultaneously:
- **A lens** — surfaces connections between facts that already exist. Characters, locations, pages arranged across time so you can see the shape of an arc.
- **A creative tool** — generates new facts. A writer planning a story lays out events before writing a single page. Those events are real creative decisions, not derived data.

Both modes coexist on the same timeline. Some events are derived from existing content. Others are planned future content. The timeline holds both without distinguishing between them.

**Timeline event:** A node that connects multiple entities at a moment in time. An event can reference characters, locations, pages, other events. It is an entity in its own right with its own dossier. It can be the waypoint that defines a before/after state on a character. Entity connections are stored as `entity_link` dossier attachments on the event.

**Range:** A named span between two events. "The War Years." "Mara's Arc." Not just a visual bracket — a meaningful grouping that is itself an entity with its own dossier. Ranges can overlap. A range is a named perspective on a portion of the timeline, not a strict container.

**Multiple timelines:** There is no single authoritative timeline. A universe can have unlimited timelines. A character can have unlimited timelines attached to them. A location can have its own timeline. Timelines are tools for thinking, not structural containers.

**Pinning:** A selected group of timeline events or a range can be pinned as a living reference into any other entity's dossier. Stored as a `timeline_pin` dossier attachment with a query descriptor in the payload — not a snapshot. If events change, the reference updates.

### Issue / Container

A container for all data relevant to one unit of the published work. The concept of "issue" is a default — the hierarchy is user-definable (see Publication Hierarchy below).

**Lenses:**
- **Script view** — all pages as one continuously scrolling document. Tapping a page row in the binder scrolls to that page.
- **Storyboard view** — one page at a time, drawable canvas, filmstrip of all pages pinned at the bottom
- **Issue Map** — grid overview of all pages: thumbnails, status, page numbers
- **Reader view** — immersive, no chrome, no editing tools. Storyboard art in sequence, single page. Optional: dialogue from script blocks placed spatially within panels.
- **Printer view** — two-page spreads. Evaluates how the book flows as a physical object — full-page splashes, spread compositions. Optional dialogue overlay same as reader view.

Reader view and printer view are **evaluation tools** — ways of experiencing the work as an audience would. They require no special data beyond what already exists.

Has a dossier.

### Series / Higher Container

A container for all data relevant to one extended story arc. Has character and location overlays — series-specific context layered on top of universe-level Bible entries.

The series level is where arc-level thinking happens: arcs, goals, destination points, character status at the start and end, key items and McGuffins.

**Design decision:** The series-level view ships as a high-quality open canvas (dossier-first) rather than a prescribed set of tools. Real usage will tell us what to formalize.

Has a dossier.

### Universe

The top-level container. Has a dossier. Universe-level design not yet fully specified — flagged for future work.

---

## Publication Hierarchy

**The hierarchy is user-definable.** Different comics have different structures — Volume → Issue, Series → Arc → Issue, Season → Episode, Book → Chapter. PanelSync does not hardcode any of these.

**`hierarchy_levels`** — defined per universe, seeded with defaults on creation:
```
- id
- universe_id
- name          (default: "Series" at position 1, "Issue" at position 2)
- position      (depth level — 1, 2, 3...)
- created_at
```

**`containers`** — every node in the hierarchy regardless of level:
```
- id
- universe_id
- level_id      (which hierarchy level this is)
- parent_id     (nullable — null means top level)
- name
- number        (nullable)
- status        (cached, derived from pages beneath it)
- created_by
- created_at
- updated_at
- updated_by
```

Self-referential through `parent_id`. A universe with three levels is just containers pointing to containers pointing to containers. The schema does not change, the user just defines more levels.

**Default on universe creation:** Two levels — "Series" (position 1) and "Issue" (position 2). Covers the majority of western comics. Renameable, extendable, removable from universe settings.

The old hardcoded `series` and `issues` tables are replaced entirely by `hierarchy_levels` + `containers`.

---

## Drafts

**Content is decoupled from publication structure.** An issue is not a container you fill — it is a label you apply to content that already exists.

**`drafts`** — free-floating content workspaces:
```
- id
- universe_id
- name           (user-defined: "Act 2 opening", "the flashback scene")
- status         (working, filed, published)
- container_id   (nullable — set when assigned to publication structure)
- created_by
- created_at
- updated_at
- updated_by
```

Pages belong to either a `container_id` or a `draft_id` — not both simultaneously. Moving a page between drafts, or promoting a draft to a container, is a single field update. Blocks keep their IDs and all attachments when moved.

**Binder layout:** Two zones.
- **Upper zone** — publication structure. The canonical ordered view. What the comic looks like as a published artifact.
- **Lower zone** — the pool. Drafts, loose pages, unplaced content. Sortable by last modified, name, type. Types can be shown or hidden.

**Assigning to publication structure:**
- Drag from pool into upper zone in the binder
- Context menu from within the editor ("Make this draft Volume 4 Issue 3")
- Potentially command palette in future

All entry points call the same underlying operation — updating `container_id` on the draft.

---

## The Dossier System

### What a Dossier Is

A dossier is a **permanent, creative, living collection of context** attached to an entity. It is part of the work itself, not communication about it.

A dossier can contain:
- Text fields and freeform notes
- Images (imported)
- Drawings and sketches (created in-app using the Skia drawing engine)
- Handwritten notes (same drawing engine)
- Script references — links to specific blocks or pages
- Timeline connections — pinned slices of timeline data, live and connected
- Links to other entities
- Any view of any data — a filtered character list, a timeline range, an issue map — pinned as a living reference

**The Pinterest analogy:** A dossier is like Pinterest but for your own creative output. You curate pieces of your own work and arrange them in a way that gives you the context you need. The connections are live, not static.

### Two Relationships: IS and HAS

**Entities where the dossier IS the primary interface:**
Character, Location, Timeline Event, Range, Note. Opening the entity opens the dossier directly.

**Entities where the dossier is ATTACHED:**
Page, Script Block, Container (Issue/Series), Universe. The primary interface is something else. The dossier is supplementary context.

### Dossier Layout

The user can set layout per dossier:
- **Vertical scroll** (v1)
- **Horizontal scroll** (v1)
- **Freeform canvas** (v2 — Freeform-style, items have x/y/w/h positions)

Layout preference is stored in `dossier_canvas_state`. The data structure supports canvas positioning now (payload can carry `canvas_x`, `canvas_y`, `canvas_w`, `canvas_h`) even though the canvas renderer ships in v2.

### Dossier Navigation — The Interaction Model

**Single tap** — navigate to the entity. Resume exactly where you left it. State persists.

**Double tap** — cycle depth states:
1. Entity only
2. Entity + dossier split (uses the existing split view infrastructure)
3. Dossier only
4. Back to entity only

**State persistence:** Every entity remembers its last depth state. Navigating away does not reset it.

**Multiple warm contexts:** Several entities can be active simultaneously. The binder is a workspace manager, not a navigation stack.

### `dossier_attachments` Table

```
- id
- universe_id
- entity_type     (universe, container, page, script_block, bible_entry,
                   timeline, timeline_event, timeline_range, draft)
- entity_id
- type            (text, image, drawing, sketch, entity_link,
                   timeline_pin, script_ref, waypoint)
- payload         (jsonb — shape depends on type)
- context         (jsonb — scoping: container_id, time range, etc.)
- search_text     (extracted plain text — full-text indexed)
- entity_refs     (uuid[] — other entity IDs this attachment references, indexed)
- tags            (text[] — user-defined keywords)
- state           (draft, canonical, locked)
- position        (float — ordering within the dossier)
- created_by
- created_at
- updated_at
- updated_by
```

**Search strategy:** `search_text` is extracted from the payload at write time by the API. Full-text index on this column. `entity_refs` is indexed for fast "find all attachments referencing this entity" queries. The API is solely responsible for keeping these consistent — the client never writes to search fields directly.

### `dossier_canvas_state` Table

```
- id
- entity_type
- entity_id
- layout          (vertical, horizontal — v1; canvas in v2)
- updated_at
```

One record per entity. Created lazily on first dossier open.

---

## File Storage

All binary files live in Cloudflare R2. The database stores only a lightweight registry record.

### `files` Table

```
- id
- universe_id
- storage_key     (R2 object key)
- url             (CDN URL)
- mime_type
- size_bytes
- width           (nullable — images only)
- height          (nullable — images only)
- uploaded_by
- uploaded_at
```

Every file in the system — imported images, in-app drawings exported as PNG, cover art, reference photos — has one record here. The same file can be referenced from multiple dossier attachments without duplicating R2 storage. A dossier attachment references a file via `payload: { "file_id": "...", "caption": "..." }`.

---

## The Event Log

An append-only log of every write operation in the system. Ships in v1. History browsing UI deferred to v2.

### `events` Table

```
- id
- universe_id
- actor_id        (user who performed the action)
- action          (created, updated, deleted, moved, assigned, locked...)
- entity_type
- entity_id
- payload         (jsonb — before/after values where relevant)
- created_at      (never updated)
```

Never updated, never deleted. One row per operation across the whole system.

**Why it ships in v1:** Cheap to add now (one extra write per operation). Expensive to retrofit later. Enables: audit trail, revision history UI (v2), replay into external search index if search infrastructure is upgraded, foundation for real-time collaboration.

**`updated_by` / `updated_at` fields** on individual entities are derived from the event log at write time and kept consistent automatically.

---

## Comments

Comments are **ephemeral collaborative communication** — distinct from dossiers.

| | Dossier | Comments |
|--|---------|----------|
| **Purpose** | Creative context, part of the work | Communication about the work |
| **Lifecycle** | Permanent, grows with the work | Created, replied to, resolved, dismissed |
| **Examples** | Reference image, planning note, timeline pin | "Should this panel be larger?" |

Both can coexist on the same entity.

### `comments` Table

```
- id
- universe_id
- entity_type     (any entity, including script_block)
- entity_id
- parent_id       (nullable — threaded replies)
- content         (text)
- resolved        (boolean)
- resolved_by     (nullable)
- resolved_at     (nullable)
- created_by
- created_at
- updated_at
```

---

## Workspace State

Navigation state persists to the database. One row per user per universe, updated on navigation actions.

### `workspace_state` Table

```
- id
- universeId      uuid references universes.id
- userId          uuid references users.id
- activeEntityType  text nullable
- activeEntityId    uuid nullable
- depthState        text nullable    ('entity_only', 'split', 'dossier_only')
- binderOpen        boolean notNull default true
- warmContexts      jsonb notNull default '[]'   -- array of { entityType, entityId, depthState }, capped ~10
- updatedAt         timestamp notNull defaultNow
```

Unique constraint on `(universeId, userId)`.

Written on every navigation action, not on every keystroke. The `warmContexts` array is the binder's recent history — entities the user has visited, preserved so they can resume any of them.

---

## Script Editor — Key Decisions

- **Auto-save:** block-level, debounced 500ms after last keystroke. One API write per changed block.
- **Save indicator:** tracks dirty state per block. "All saved" when all blocks are clean.
- **Scroll to page:** editor maintains a ref map of `{ [pageId]: scrollOffset }`. On page activation, scrolls to offset without remounting the editor component.
- **Page switching:** same editor component always, binder tap triggers scroll not navigation.

---

## Versioning and Locking

- **Individual attachment locking:** `dossier_attachments.state` field — `draft`, `canonical`, `locked`. Any attachment can be locked independently.
- **Whole-entity lock:** batch operation that sets all attachments on an entity to `locked` at once. Convenience wrapper over individual locking.
- **Block versioning v1:** event log is sufficient — stores before/after values per block save, covers undo history and audit trail.
- **Formal block versioning (`script_block_versions` table):** deferred to v2. Unlocks diff view, restore to point-in-time, branching.

---

## Complete Schema — Revised Table List

### New (added after initial revision)
- `workspace_state`

### Staying (simplified)
- `users`
- `universes` (adds `updated_by`)
- `universe_members`
- `member_series_access`
- `bible_entries` (stripped to: id, universe_id, type, name, color, created_by, timestamps)
- `timelines`
- `timeline_events` (entity connections move to dossier_attachments)
- `timeline_ranges`
- `comments` (minor cleanup)
- `pages` (loses storyboard columns, `issue_id` → `container_id`, adds `draft_id`)
- `script_blocks` (revised — see Script Block Format)

### New
- `hierarchy_levels`
- `containers`
- `drafts`
- `files`
- `dossier_attachments`
- `dossier_canvas_state`
- `events`

### Removed
- `series` → replaced by `containers` + `hierarchy_levels`
- `issues` → replaced by `containers`
- `panels` → derived from script_blocks at render time
- `storyboard_pages` → storyboard data lives in dossier_attachments
- `bible_entry_images` → replaced by dossier_attachments
- `bible_entry_series_overlays` → replaced by context-scoped dossier_attachments
- `note_folders` → notes are bible_entries; folder UI is a rendering concern
- `asset_timeline_tags` → replaced by entity_link dossier_attachments
- `pinned_items` → replaced by entity_link dossier_attachments

**Total: 18 tables.** Down from 20, significantly more capable and flexible.

---

## What to Build Next

The schema must be revised before any new features are built. The current schema will not support the dossier system, flexible hierarchy, or drafts.

**Order:**
1. **Schema revision** — update Drizzle schema to match this document, run migration against Neon
2. **Update API routes** — containers replace series/issues, new endpoints for drafts and hierarchy
3. **Workspace shell** — universe screen becomes persistent workspace, binder always present, shared UniverseContext
4. **Inline creation** — replace modals with in-place creation in the binder tree
5. **Script editor** — drops into content area as the first real tool

The script editor then drops into the content area of this workspace. Everything after it (storyboard, Bible, timeline) follows the same pattern.

---

*This document should be updated as decisions evolve. If something here conflicts with SPEC.md, discuss before changing either — they serve different purposes. SPEC.md describes features. This document describes principles and architecture.*
