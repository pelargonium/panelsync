# PanelSync — Design Principles & Architecture
*Established in design session, March 2026. This document captures foundational decisions made before Sprint 6. It supersedes any conflicting assumptions in earlier documents or code.*

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

### Page

A page is a container for all data relevant to one unit of the final comic. It does not "belong" to any single tool.

**What it contains:**
- Script blocks — an ordered list of typed content blocks (see Block Format below)
- Storyboard data — sketch data, reference images, reference opacity
- Panel structure — derived from script block size tags, used by storyboard overlay and export
- Status — draft / in review / locked / complete
- Revision metadata — updated_at, updated_by

**Lenses:**
- Script editor — text-based, block-structured, continuous scroll across all pages of an issue
- Storyboard canvas — spatial, visual, drawing-based, one page at a time
- Issue Map thumbnail — small visual representation of page status
- Reader view — immersive, no chrome, storyboard art in sequence (see Issue lenses)
- Printer view — two-page spreads (see Issue lenses)
- PDF export — rendered output

**Key fact:** The script and storyboard are two fields on the same record, not two separate entities. They are always created together. They are different aspects of the same page data, rendered by different engines.

### Script Block Format

Each page's script content is stored as a JSON array of blocks. The format is intentionally minimal — rendering logic lives in the tools, not the data.

```json
[
  { "id": "b1", "type": "panel", "sizeTag": null },
  { "id": "b2", "type": "scene", "content": "INT. FOREST — DUSK" },
  { "id": "b3", "type": "description", "content": "Mara crouches low." },
  { "id": "b4", "type": "dialogue", "speaker": "MARA", "content": "Three seconds." },
  { "id": "b5", "type": "caption", "content": "Six months earlier." },
  { "id": "b6", "type": "sfx", "content": "CRACK" }
]
```

**Rules:**
- `id` is stable and unique within a page — used for cursor tracking, comments, undo history
- `panel` has `sizeTag` (Full / ½ / ⅓ / ⅙ / ⅛ / Remainder / null) instead of `content` — panels don't have text
- `dialogue` has `speaker` as a separate field — exporters, autocomplete, and storyboard all need speaker identity independently of dialogue text
- Panel numbers (Panel 1, Panel 2...) are **derived at render time** by counting panel blocks in order — never stored
- Bold and italic are inline marks within `content` strings — exact format TBD when editor is built

### Character

A character is a **living dossier** — not a static record with fixed fields.

**Lifecycle phases:**
- **Discovery** — freeform, generative, messy by design. The author is figuring out who this person is. Notes, contradictions, half-formed ideas, visual references.
- **Active story** — the character is being written. The page accumulates script references, dialogue, visual references, outfit references for specific pages, annotations. It is a living record of the character as they are being realized.
- **Handoff** — a run ends, a new author comes on. An editor condenses and locks what is canonical: what is true, what has happened, what has not been revealed yet, what the new author can and cannot change. This is an authoritative document, not a generative one.

**Waypoints:** A character can have author-defined waypoints — moments where something fundamental changed about them. "Before the war." "After losing her brother." "Series 3 onwards." Each waypoint creates a context in which certain facts are true, others no longer apply, new ones are added. The character page rendered in the context of a specific issue shows the appropriate version.

Waypoints can be connected to timeline events but do not have to be. They are character-native.

**Series overlays:** Additional notes that apply only within a specific series. Layered on top of the universe-level record without overwriting it. Visible when the character is viewed in the context of that series.

**What a character contains:** Name, aliases, role, physical facts, story facts, images, sketches (drawn in-app), custom fields, waypoints, series overlays, script references (auto-populated), timeline connections.

**Key fact:** A character page IS a dossier — it is the primary interface for that entity. There is no separate "character screen."

### Location

Same data structure as Character — a living dossier with lifecycle phases, waypoints, series overlays, images, sketches, and custom fields.

A location has its own lifecycle: a place can exist in ruins in one series and as a thriving city in a prequel. The same waypoint and overlay system applies.

Location-specific tools (maps, spatial tools, etc.) are not yet designed — flagged for future design work once the dossier system is built and used.

**Key fact:** Locations and characters are the same kind of entity at the data level. Their default fields and eventual specialized tools differ, but the underlying pattern is identical.

### Timeline

A timeline is simultaneously:
- **A lens** — surfaces connections between facts that already exist. Characters, locations, pages arranged across time so you can see the shape of an arc.
- **A creative tool** — generates new facts. A writer planning a story lays out events before writing a single page. Those events are real creative decisions, not derived data.

Both modes coexist on the same timeline. Some events are derived from existing content. Others are planned future content. The timeline holds both without distinguishing between them.

**Timeline event:** A node that connects multiple entities at a moment in time. An event can reference characters, locations, pages, other events. It is an entity in its own right with its own dossier. It can be the waypoint that defines a before/after state on a character.

**Range:** A named span between two events. "The War Years." "Mara's Arc." Not just a visual bracket — a meaningful grouping that is itself an entity with its own dossier. Ranges can overlap. A range is a named perspective on a portion of the timeline, not a strict container.

**Multiple timelines:** There is no single authoritative timeline. A universe can have unlimited timelines. A character can have unlimited timelines attached to them. A location can have its own timeline. Timelines are tools for thinking, not structural containers.

**Pinning:** A selected group of timeline events or a range can be pinned as a living reference into any other entity's dossier. The pinned view stays connected to the underlying data — if events change, the reference updates.

### Issue

A container for all data relevant to one unit of the published work.

**Lenses:**
- **Script view** — all pages as one continuously scrolling document. Tapping a page row in the binder scrolls to that page.
- **Storyboard view** — one page at a time, drawable canvas, filmstrip of all pages pinned at the bottom
- **Issue Map** — grid overview of all pages: thumbnails, status, page numbers
- **Reader view** — immersive, no chrome, no editing tools. Storyboard art in sequence, single page. Optional: dialogue from script blocks placed spatially within panels.
- **Printer view** — two-page spreads. Evaluates how the book flows as a physical object — full-page splashes, spread compositions. Optional dialogue overlay same as reader view.

Reader view and printer view are **evaluation tools** — ways of experiencing the work as an audience would. They require no special data beyond what already exists (storyboard data + script blocks). Early in production they work with just the panel grid overlay.

Issue has a dossier.

### Series

A container for all data relevant to one extended story arc. Has character and location overlays — series-specific context layered on top of universe-level Bible entries.

The series level is where arc-level thinking happens: arcs, goals, destination points, character status at the start and end, key items and McGuffins. These are planning and directional facts, not structured fields.

**Design decision:** The series-level view ships as a high-quality open canvas (dossier-first) rather than a prescribed set of tools. Real usage will tell us what to formalize. Arc planning tools, destination point tracking, and character status views get designed after patterns emerge from actual use.

Series has a dossier.

### Universe

The top-level container. Has a dossier.

Universe-level design is not yet fully specified at this level of detail — flagged for future design work.

---

## The Dossier System

### What a Dossier Is

A dossier is a **permanent, creative, living collection of context** attached to an entity. It is part of the work itself, not communication about it.

A dossier can contain:
- Text fields and freeform notes
- Images (imported from photo library or files)
- Drawings and sketches (created in-app using the Skia drawing engine)
- Handwritten notes (same drawing engine)
- Script references — links to specific blocks or pages
- Timeline connections — pinned slices of timeline data, live and connected
- Links to other entities
- Any view of any data — a filtered character list, a timeline range, an issue map — pinned as a living reference

**The Pinterest analogy:** A dossier is like Pinterest but for your own creative output. You curate pieces of your own work — script references, character sketches, timeline slices, visual references — and arrange them in a way that gives you the context you need. The connections are live, not static. The data underneath knows what it is.

### Two Relationships: IS and HAS

**Entities where the dossier IS the primary interface:**
Character, Location, Timeline Event, Range, Note, and similar Bible entries. Opening the entity opens the dossier directly. The dossier is the thing itself.

**Entities where the dossier is ATTACHED:**
Page, Panel, Script Block, Issue, Series, Universe. The primary interface is something else (script editor, storyboard canvas, issue map). The dossier is supplementary context accessible from within that interface.

### Dossier Navigation — The Interaction Model

The binder is the navigator for both breadth (moving between entities) and depth (moving into an entity's layers).

**Single tap** — navigate to the entity. If you have been there before, resume exactly where you left it. State persists.

**Double tap** — cycle depth states:
1. Entity only (primary interface fills the content area)
2. Entity + dossier split (primary interface and dossier side by side)
3. Dossier only (dossier fills the content area)
4. Back to entity only

**State persistence:** Every entity remembers its last depth state. Navigating away does not reset it. Single tapping back to an entity resumes exactly where you left it — split view, dossier only, whatever state it was in.

**Multiple warm contexts:** Several entities can be in active states simultaneously. The binder functions as a workspace manager. The entities you have been working with are all still active, waiting where you left them.

This model uses the existing split view infrastructure. The dossier split is not a special feature — it is the general split view applied to the dossier context.

---

## Comments

Comments are **ephemeral collaborative communication** — distinct from dossiers.

| | Dossier | Comments |
|--|---------|----------|
| **Purpose** | Creative context, part of the work | Communication about the work |
| **Lifecycle** | Permanent, grows with the work | Created, replied to, resolved, dismissed |
| **Visibility** | Part of the canonical record | Cleaned up as decisions are made |
| **Examples** | Reference image for a panel, planning note, timeline pin | "Should this panel be larger?", "This dialogue feels off" |

Both can coexist on the same entity. A panel can have a reference image in its dossier and an unresolved comment thread about staging — these are separate systems attached to the same entity.

---

## What This Changes About the Current Implementation

The current implementation diverges from these principles in several ways:

1. **Routing is file-browser style** — pages push new screens. The binder disappears inside the editor. This needs to become a persistent workspace shell.

2. **State is locally owned** — series lists live in SeriesRow, page lists live in IssueRow. This needs to move to a shared context so all tools read from and write to the same data.

3. **The script editor is planned as page-by-page** — the spec and this document establish it as issue-level continuous scroll. The route carries the page as a scroll target, not as a separate document.

4. **The dossier system does not exist yet** — the current schema has a characters table with fixed columns. The living dossier model requires a more flexible data structure.

5. **The route is missing the series segment** — current: `/universe/[id]/issue/[iid]/page/[pid]`. Should be: `/universe/[id]/series/[sid]/issue/[iid]/page/[pid]`.

These are not bugs to fix immediately — they are known divergences to address in the correct order as the app is built toward the full vision.

---

## What to Build Next (Implications for Sprint 6)

Before writing the script editor, the workspace shell needs to exist:

1. **Universe screen becomes a persistent workspace** — binder always present, content area opens entities rather than navigating to new screens
2. **Shared state (UniverseContext)** — series, issues, pages fetched once and shared across all tools
3. **Inline creation** — replace modals with in-place creation in the binder tree
4. **Correct route structure** — add series segment to page routes

The script editor then drops into the content area of this workspace as the first real tool. Everything after it (storyboard, Bible, timeline) follows the same pattern.

---

*This document should be updated as decisions evolve. If something here conflicts with SPEC.md, discuss before changing either — they serve different purposes. SPEC.md describes features. This document describes principles and architecture.*
