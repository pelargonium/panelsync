# PanelSync — Product Specification
*Last updated: March 2026 — consolidated from Handoff v3*

---

## Table of Contents
1. [Information Hierarchy](#1-information-hierarchy)
2. [Data Model](#2-data-model)
3. [Navigation System](#3-navigation-system)
4. [Home Screen](#4-home-screen)
5. [Script Editor](#5-script-editor)
6. [Storyboard Canvas](#6-storyboard-canvas)
7. [Universe Bible](#7-universe-bible)
8. [Timeline Tool](#8-timeline-tool)
9. [Notes System](#9-notes-system)
10. [Collaboration](#10-collaboration)
11. [Export & Sharing](#11-export--sharing)
12. [MVP Feature Status](#12-mvp-feature-status)
13. [Deferred (v2+)](#13-deferred-v2)
14. [Open Questions](#14-open-questions)

---

## 1. Information Hierarchy

```
Universes Dashboard → Universe → Series → Issue → Page
```

| Level | Contains |
|-------|----------|
| **Universe** | Universe Bible (Characters, Locations, Factions, Objects, Lore), Timeline collection, Chalkboard, Relationship Map, Mood Board, Notes, Collaboration settings |
| **Series** | Arc notes, character/location overlays, series timeline, Chalkboard canvases |
| **Issue** | Script, Storyboard, issue notes, page status tracking, Pacing View, Script Breakdown grid |
| **Page** | Script page (comic-native blocks) + paired Storyboard canvas (always together) |

**Progressive Disclosure:** Sidebar shows only what the user needs. Universe Bible, Timeline, and Chalkboard are accessible but not pushed. A writer who only wants to write scripts never sees the tools they don't need.

---

## 2. Data Model

### Entities

| Entity | Key Fields |
|--------|-----------|
| **User** | id, email, password_hash, display_name, avatar |
| **Universe** | id, owner_id, name, cover_image, created_at |
| **UniverseMember** | universe_id, user_id, role (owner/editor/viewer) |
| **Series** | id, universe_id, name, arc_notes, cover_image |
| **Issue** | id, series_id, number, title, notes |
| **Page** | id, issue_id, page_number, script_content (JSON), status (draft/review/locked/complete), updated_at, updated_by |
| **StoryboardPage** | id, page_id, sketch_data (JSON), reference_image_url, reference_opacity |
| **Panel** | id, page_id, panel_number, size_tag, keywords[] |
| **Character** | id, universe_id, name, role, appearance, backstory, color, knowledge_gaps (JSON) |
| **CharacterSeriesOverlay** | character_id, series_id, notes |
| **Location** | id, universe_id, name, description, time_period, color |
| **LocationSeriesOverlay** | location_id, series_id, notes |
| **Timeline** | id, universe_id, name, intent (story/reference/character_arc/production) |
| **TimelineEvent** | id, timeline_id, title, date_label, description, character_ids[], location_id, tag_type (point/range), range_start_label, range_end_label, color, sort_order |
| **TimelineRange** | id, timeline_id, name, start_event_id, end_event_id |
| **Note** | id, universe_id, series_id?, issue_id?, title, content (JSON), is_private, updated_at |
| **NoteFolder** | id, universe_id, name, parent_folder_id |
| **Comment** | id, target_type, target_id, user_id, content, resolved, created_at |
| **AssetTimelineTag** | id, asset_type, asset_id, timeline_event_id, tag_type (point/range) |

### Key Design Decisions
- **StoryboardPage is separate from Page** — sketch data never overwrites script content
- **Panel entity exists in MVP** — panel_number and size_tag written by script parser, read by v2 storyboard generator
- **knowledge_gaps on Character** — JSON field, ready for v2 Continuity Tracker
- **AssetTimelineTag is polymorphic** — any asset type can be tagged to any timeline event without schema changes
- **Series overlays** — per-series notes layer on universe-level entries without overwriting them

---

## 3. Navigation System

### Universes Dashboard (Home)
- All Universes shown as cards: cover image, name, last edited, stacked sub-cards
- **Tap** → resumes at last open page (fastest path)
- **Long-press** → reveals options: "Universe Home" or "Settings"
- First-launch peekaboo animation: sub-cards slide 18px down and back, tooltip appears once, never again

### Contextual Sidebar
- **Top** — Universe-level tools: Bible, Timeline, Chalkboard, Relationship Map, Mood Board, Notes
- **Middle** — Series list → expandable to Issues → expandable to Pages
- **Bottom** — current page context: quick links to script and storyboard
- Collapsible. Universe switcher at top.

### Split View
Quick-launch pairs: Script + Storyboard, Script + Characters, Timeline + Script, Characters + Sketch, Locations + Sketch, Timeline + Characters.

### Route Structure (Expo Router)
```
/                           Universes Dashboard
/universe/[id]              Universe Home
/universe/[id]/series/[id]  Series view
/universe/[id]/series/[sid]/issue/[id]        Issue view
/universe/[id]/series/[sid]/issue/[id]/page/[id]  Script + Storyboard
```

---

## 4. Home Screen

Three sections:
1. **Resume** — primary card (most recent page) + secondary cards (recent pages in other issues)
2. **Recent Activity** — feed of edits across all Universes
3. **Universes Shelf** — all Universe cards with long-press interaction

Both dark and light modes fully designed. Reference: `panelsync-home.html`

---

## 5. Script Editor

> Single shared component. Runs identically on iPad and web.

### Block Types

| Block | Trigger | Behavior |
|-------|---------|----------|
| **Panel** | Cmd/Ctrl+Enter | Auto-numbered. Renumbers on delete. |
| **Scene Heading** | Tab from Panel | INT./EXT., location, time of day. Keywords: INT., EXT., WIDE, CLOSEUP, MEDIUM, HORIZON, BIRD'S EYE, WORM'S EYE |
| **Description** | Enter from Scene | Action lines. Size tags: `[page-width]` `[half]` `[1/3]` `[remainder]` |
| **Dialogue** | Tab from Description | Character name (with Universe Bible autocomplete) + dialogue text |
| **Caption** | — | Narration or caption box text |
| **SFX** | — | Sound effect. Rendered large and stylized in storyboard preview |

### Keyboard Flow

| Current Block | Enter → | Tab → |
|--------------|---------|-------|
| Scene | Action | Panel |
| Action | Action | Character |
| Character | Dialogue | — (empty+Enter → new Panel+Description) |
| Dialogue | Dialogue | New Character (Double-Tab → escape to Action) |
| Panel | Scene | — |
| SFX/Caption | Action | — |

Backspace on empty block → delete + focus previous. Shift+Enter → newline within description/caption/dialogue.

### Editor Modes
- **Standard** — script (60%) + storyboard preview (40%). iPad right panel is live Skia canvas.
- **Distraction-free** — Cmd/Ctrl+Shift+F. Full screen.
- **Outline** — collapsed to panel headings only.

### Auto-save
Debounced 1.5s after last keystroke. Animated save indicator in toolbar.

### References
`panelsync-script-editor.html`, `panelsync-mockup.html`

---

## 6. Storyboard Canvas

Every Page has a permanently paired storyboard canvas. Script page and storyboard are always created together.

### iPad Features
- Blank Skia canvas per page
- Panel grid guides (toggleable overlay)
- Collapsible script reference panel
- Apple Pencil pressure sensitivity → stroke width
- Pencil, eraser, stroke weight slider, colors: black / dark grey / red
- 2-finger tap: undo. 3-finger tap: redo.
- Pinch to zoom. Double-tap panel area → focused mode.
- Toolbar auto-hides after 3s of drawing.
- Page strip at bottom for thumbnail navigation.
- Reference image import — set opacity, sketch over.
- Auto-save every 30s and on navigation away.

### Web (v1)
- Read-only storyboard preview in split view alongside script.
- Drawing not available in v1.

---

## 7. Universe Bible

### Characters
- Fields: name, role, appearance, backstory, series appearances, color
- Rich text notes, reference images, sketch layer (iPad)
- Series overlays (per-series notes that don't overwrite universe-level entry)
- Knowledge gap tags (JSON, read by v2 Continuity Tracker)

### Locations
- Fields: name, description, time period, series appearances, color
- Same rich text notes, reference images, sketch layer, series overlays as Characters

### Navigation
- Browse by entry type
- Global search — any entry, note, or tagged asset
- Filter by series or timeline range

### Autocomplete
- Dialogue blocks: character name autocomplete from the series character registry
- Timeline events: entity detection from Universe Bible (exact matches + aliases)

Reference: `panelsync-universe-home.html`

---

## 8. Timeline Tool

> PanelSync's most distinctive feature. No other comic tool provides this.

### Entity Types

| Entity | Description |
|--------|-------------|
| **Event** | Atomic moment. Diamond notch on spine + connected card. Can be pinned. Convertible to range. |
| **Range** | Named span. Colored bar between two diamond nodes. Multiple overlapping: alternate above/below spine. |
| **Cluster Label** | Navigational annotation. Appears on compression. Cartographic behavior (prominent when zoomed out, fades zoomed in). Fonts: Caveat (default), Lora Italic, Geist Mono. |
| **Arc** | Story arc spanning multiple events. Parabola (horizontal) or bracket (vertical). Slightly transparent. |
| **Issue Bracket** | Optional structural markers. Dotted black brackets. Labeled Issue 1, Issue 2 in Geist Mono. |

### Timeline Intent Tags
story / reference / character_arc / production

### Time System Options
- **Pure Sequence** — no time unit, ordered moments only
- **Standard Earth Time** — real calendar, seconds to millennia
- **Custom** — user-defined unit chain (unit wizard)

### Visual Design
- Spine: 1px crisp line. Always unobstructed. 35% clear zone on each side.
- Event diamonds: split color (tag color top / black bottom). Width = H÷7. Zoom-responsive.
- Event cards: white on warm slate. Expanded (date + title + description) or compact (date + title only).
- Selected card: amber left bar, amber border.
- Typography: event titles Lora 600, range labels Geist Mono, arc labels Lora Italic, cluster labels Caveat.

### Key Interactions
- 1-finger hold on spine → scrub mode
- 2-finger drag → pan. Pinch → zoom (variable rate by finger count).
- 4-finger tap → toggle minimal view (chrome off)
- Tap spine between events (vertical) → inline event creation

Reference: `panelsync-timeline.html`, `panelsync-tick-explore.html`

---

## 9. Notes System

- Notes at Universe, Series, or Issue level
- Folder organization with drag-and-drop
- Rich text: bold, italic, headings, bullet lists, inline code
- Quick-capture: floating button (iPad), Cmd/Ctrl+Shift+N (web)
- Full-text search across all notes in a Universe
- Private notes — visible only to creator

---

## 10. Collaboration

### MVP (Async)
- Invite by email → link to create account + join Universe
- Roles: Owner, Editor, Viewer
- Last-write-wins with 'last edited by [name] [time]' on every page
- Update banner when page edited since last open
- Page status: draft / in review / locked / complete
- Threaded comments on any script block
- Read-only share link (no account required to view)

### v2 (Real-time)
- Yjs CRDT sync
- Live presence indicators, named cursors
- Commenter role

---

## 11. Export & Sharing

### MVP
- Script PDF — industry-standard comic script format. Background job, download notification.
- Storyboard PDF — basic server-side render (Puppeteer). No layer control.

### v2
- Series Bible PDF, Storyboard PDF (300dpi, layer compositor), image sequence per page
- Chalkboard export, Relationship Map export

### Read-Only Sharing
- Live link to any section. Password-protected or expiring. No account required.

---

## 12. MVP Feature Status

| Feature | Status |
|---------|--------|
| Universes Dashboard | MVP |
| Universe/Series/Issue/Page hierarchy | MVP |
| Script editor — all 6 block types | MVP |
| Script editor — distraction-free, outline, auto-save | MVP |
| Storyboard — blank drawable canvas (iPad) | MVP |
| Storyboard — drawing tools, Apple Pencil | MVP |
| Storyboard — reference image import | MVP |
| Storyboard — script breakdown grid | MVP |
| Universe Bible — Characters + Locations | MVP |
| Timeline — events, ranges, named ranges, zoom, color | MVP |
| Notes — folders, rich text, quick-capture, search | MVP |
| Async collaboration — roles, status, comments | MVP |
| Script PDF export | MVP |
| Storyboard PDF export | MVP (partial — no layer control) |
| Universe Bible — Factions, Objects, Lore | v2 |
| Timeline lenses | v2 |
| Storyboard auto-generation | v2 |
| Chalkboard | v2 |
| Relationship Map | v2 |
| Real-time sync (Yjs) | v2 |
| Continuity Tracker | v2 |

**Sprint 6 Gate:** If the script editor does not feel as good as a purpose-built comic writing tool by Sprint 6, stop and redesign before proceeding.

**Earliest Testable Moment:** End of Sprint 6 — write a full multi-panel script page on iPad with all block types working and saving.

---

## 13. Deferred (v2+)

### First Wave (after MVP validation)
- Storyboard auto-generation from script parser
- Real-time collaborative sync (Yjs CRDT)
- Universe Bible — Factions, Objects/Artifacts, Lore/Concepts
- The Chalkboard — freeform notecard canvas, keyboard + Apple Pencil card modes
- Timeline lenses — reader knowledge, character knowledge, story order, reference

### Second Wave
- Relationship Map
- Pacing View (emotional beat curve)
- Mood/Tone Board
- Continuity Tracker
- Drawing tools expansion (brush, shapes, lasso, pressure eraser)

### Third Wave
- The Letterer — hand-lettering font from artist's handwriting
- Branch proposals (git-branch workflow for page changes)
- Companion Mode (phone as script reader while drawing on tablet)
- Offline mode, Android tablet, version history

---

## 14. Open Questions

*Decisions deferred pending implementation experience*

- Toggle palette node visual language for on/off state
- Arc label font — Lora Italic confirmed as option, default not locked
- Issue bracket label position in horizontal view
- Overlap rendering for 3+ ranges
- Cluster label anchor point during fade
- Hard start pin UI design
- Play mode visual design (blank timeline before playback)
- Dark mode for timeline (deferred until light mode horizontal finalized)
- Vertical timeline orientation (deferred until horizontal complete)
- `theme.ts` accent color (red `#C41E1E`) vs spec accent color (gold `#c8a768`) — reconcile when UI work begins
