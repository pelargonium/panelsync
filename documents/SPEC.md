# PanelSync — Product Specification
*Last updated: March 2026 — consolidated from Handoff v3*

---

## Table of Contents
1. [Information Hierarchy](#1-information-hierarchy)
2. [Data Model](#2-data-model)
3. [Navigation System](#3-navigation-system)
4. [Universes Dashboard](#4-universes-dashboard)
5. [Universe Home](#5-universe-home)
6. [Series / Issue View](#6-series--issue-view)
7. [Script Editor](#7-script-editor)
8. [Storyboard Canvas](#8-storyboard-canvas)
9. [Universe Bible](#9-universe-bible)
10. [Timeline Tool](#10-timeline-tool)
11. [Notes System](#11-notes-system)
12. [Collaboration](#12-collaboration)
13. [Export & Sharing](#13-export--sharing)
14. [MVP Feature Status](#14-mvp-feature-status)
15. [Deferred (v2+)](#15-deferred-v2)
16. [Open Questions](#16-open-questions)

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
- **Long-press** → reveals options including Universe Settings
- First-launch peekaboo animation: sub-cards slide 18px down and back, tooltip appears once, never again
- Universe switching always happens from this screen — you never switch universes mid-session

### The Binder (Persistent Sidebar)
The binder is the default home for all navigation panels in the universe. It is composed of discrete sections — each section can live inside the binder or be torn off and docked as its own column anywhere in the workspace.

**Collapse behavior:**
- Persistent and visible by default
- Resizable by dragging the edge
- Collapses fully (slides off screen) via a button or 4-finger swipe from the left edge
- No icon rail in collapsed state — fully hidden, content expands to fill

**Search bar:**
- Pinned at the top of the binder, above all sections
- Hides on scroll up, reappears on scroll down
- Searches all content within the universe

**Binder sections — default:**

| Section | Contents |
|---------|----------|
| **Series/Issue/Page** | Expandable hierarchy accordion. Issues expand to show pages; each page row has Script and Storyboard quick-open icons. |
| **Arc Notes** | Series-level notes and context for the current series. |
| **Characters** | Universe characters, filterable to those relevant to the current series. |
| **Timeline** | Quick reference view of the universe timeline. |
| **Notes** | Universe, series, and issue-level notes. |

**Binder sections — custom:**
- Users can create their own sections containing any combination of items from the universe
- Custom sections behave identically to default sections — they can be reordered within the binder or torn off as columns
- Name, contents, and icon are user-defined

**Section tear-off:**
- Long press a section header + drag → detaches the section from the binder
- Detached sections snap to fixed column positions in the workspace (left edge, right edge, between binder and editor)
- Drag a detached column back onto the binder → re-docks it
- Layout persists per-universe per-user

**Item interactions:**
- **Long press** → context menu (items include: Open, Open in Split, Rename, Delete, Select, Pin)
- **"Select" from context menu** → enters selection mode. Single taps accumulate selection. Bulk action toolbar appears at the bottom of the binder.
- Selection mode exited by tapping Done or deselecting all items

**Binder tap behavior by item type:**

| Item | Tap target | Result |
|------|-----------|--------|
| Series row | Triangle/chevron | Expands/collapses accordion in place |
| Series row | Name | Opens Series Map in main content area |
| Issue row | Triangle/chevron | Expands/collapses accordion in place |
| Issue row | Name | Opens Issue Map in main content area |
| Page row | Script icon | Opens Script editor |
| Page row | Storyboard icon | Opens Storyboard canvas |
| Character | Name | Opens Character detail view |
| Location | Name | Opens Location detail view |
| Timeline | Name | Opens Timeline editor |
| Note | Name | Opens Note editor |
| Type-tag icon (footer) | Icon | Opens filtered list of all items with that tag |

**Series Map / Issue Map** *(earmarked for expansion in v2+)*
- Series Map: a grid/overview of all issues in the series — issue number, title, page count, status. Starting point for future arc planning tools.
- Issue Map: a grid/overview of all pages in the issue — page thumbnail or status tile. Starting point for future pacing and layout tools.
- In v1 these are read-only overview screens. Future: annotations, arc overlays, drag-to-reorder.

**Footer — type-tag icons:**
- A compact row of icons for each default type: Character, Location, Timeline, Notes
- Tapping an icon opens a filtered view of all items in the universe with that tag
- Always visible at the bottom of the binder, even when sections are scrolled

### Global Chrome (Top Bar)
A minimal persistent top bar present on every screen inside a universe.

| Position | Elements |
|----------|----------|
| Left | Undo / Redo |
| Center | Save/sync status indicator |
| Right | View · Share · Collaborator avatars · Account avatar |

**Save/sync indicator:**
- Single small icon showing current state: editing, saving, saved, syncing, synced, offline, error
- Tap → popover with plain-language description of current state ("All changes saved", "Offline — changes will sync when reconnected")
- Offline and error states escalate the icon color (amber / red); no banner unless critical

**Share button:**
- If one editor pane is focused (active pane has a subtle highlight border): opens quick export options for that content
- If two editors are open with no clear focus: modal asks which editor's content to export
- Leads to the **Share Center** — a full export studio screen with search, output configuration, page order editing, and layer control

**Collaborator avatars:**
- Shows who has access to the universe
- Tap → collaboration panel (manage roles, recent activity)
- v2: becomes live presence with named cursors

**View button:**
- Opens a contextual panel showing view options relevant to what is currently on screen
- Content changes based on context — binder focused: sort order, tree/column mode; Universe Home: section visibility and order; editor focused: editor-specific display options
- Single consistent location for all "how do I change how this looks" actions
- Replaces scattered per-screen view controls (sort dropdown and view toggle moved out of binder header)

**Account avatar:**
- Tap → account and app-level settings (profile, email, password, theme, notifications, keyboard shortcuts, sign out)
- Universe-level settings (name, cover, collaborators, delete) live on the Universe card on the dashboard, not here

### Editor Panes and Floating Toolbars
- The main content area can show one or two editor panes side by side (split view)
- Each editor (script, storyboard, timeline, notes) has its own discrete floating toolbar
- **Default position**: top-center of its pane
- **Reposition**: long press the toolbar + drag. Snaps to the four edges of its pane. Does not float freely (prevents collisions in split view).
- The **active pane** is indicated by a subtle highlight border. Global actions (undo/redo, share) target the active pane.
- Clicking into a pane makes it active.

### Split View
Any two editors can be placed side by side. Each pane is independent with its own toolbar and active state. Common pairs: Script + Storyboard, Script + Characters, Timeline + Script, Characters + Sketch, Locations + Sketch, Timeline + Characters.

### Route Structure (Expo Router)
```
/                                                           Universes Dashboard
/universe/[id]                                              Universe Home
/universe/[id]/series/[sid]                                 Series view
/universe/[id]/series/[sid]/issue/[iid]                     Issue view
/universe/[id]/series/[sid]/issue/[iid]/page/[pid]          Script + Storyboard
```

---

## 4. Universes Dashboard

The dashboard is the home screen and the only place universe switching happens. No binder, no top bar chrome — those live inside a universe.

### Layout
- **Default**: 2-column card grid
- **List view**: toggled via a view control in the dashboard header (same icon pattern as the binder)
- **"+" button**: always present in the dashboard header. Creates a new universe.

### Universe Cards
- Content: universe name (prominent), cover image if one exists, last edited timestamp (subtle)
- If no cover image has been set, the card renders as styled text on a plain background — no placeholder imagery
- **Tap** → opens the universe, resuming at the last open item
- **Long press** → context menu: Open, Universe Settings, Duplicate, Delete

### Empty and Ghost States
- **0 universes**: full empty state — background prompt text ("Create your first universe"), large centered CTA button
- **0 or 1 universes**: a ghost card (dashed border, no content) appears at the end of the grid as a visual affordance for creating a new universe. Disappears once 2 universes exist.

### Create Universe Modal
Triggered by tapping "+" or the ghost card. A tabbed modal with a persistent Create Universe / Cancel footer visible on every tab.

| Tab | Fields |
|-----|--------|
| **Basics** | Universe name (required), cover image (optional), Series label (default: "Series"), Issue label (default: "Issue") |
| **Timeline** | Timescale setting: Pure Sequence / Standard Earth Time / Custom |
| **Collaborators** | Invite by email, assign role (Editor / Viewer) |

- Only the name is required. All other tabs are optional.
- On Create → modal dismisses, universe is created and opened automatically.

### First Open of a New Universe
- Binder opens on the left, empty.
- Main content area shows a **Get Started page**: shortcut actions (Create a character, Create a timeline, Start writing a script).
- "Don't show this again" checkbox at the bottom. Once checked and dismissed, subsequent opens resume at the last open item instead.

---

## 5. Universe Home

A persistent screen always navigable to within a universe. Not just a fallback — a real overview destination. Accessible from the binder (tap the universe name at the top) or by navigating to `/universe/[id]` directly.

### Sections
The Universe Home is composed of toggleable, reorderable sections. All four are on by default.

| Section | Contents |
|---------|----------|
| **Series Overview** | Cards for each series: name, issue count, page count, last edited. Tap → opens that series. |
| **Recent Activity** | Feed of changes across the universe: who edited what, when. Each item tappable to jump directly to it. |
| **Universe Stats** | Read-only counters: total pages, characters, locations, timeline events. |
| **Pinned Items** | Items explicitly pinned by the user from the binder context menu. Any type — character, page, note, etc. Tap → opens it. |

### Customization
- A **Customize** button on the Universe Home enters edit mode
- In edit mode: sections can be dragged to reorder, and toggled off with a remove control
- Section visibility and order are also accessible via the global View button when Universe Home is open
- Settings persist per-universe per-user

### Navigation to Universe Home
- Tap the universe name at the top of the binder
- Available as a route: `/universe/[id]`

---

## 6. Series / Issue View

### Hierarchy Label Customization
The two structural levels below Universe are user-labeled. Defaults are "Series" and "Issue." Examples: Volume/Chapter, Season/Episode, Arc/Issue. Labels are set in the Create Universe modal and editable in Universe Settings. All UI copy throughout the universe respects the custom labels.

### Series/Issue/Page Accordion (Binder Section)
The primary navigation structure for story content. Lives in the binder by default; can be torn off as a standalone column.

```
Series 1 — Title                    [status]
  Issue 1 — Title         [Script] [Storyboard]  [status]
    Page 1                [Script] [Storyboard]
    Page 2                [Script] [Storyboard]
  Issue 2 — Title         [Script] [Storyboard]  [status]
    (collapsed)
Series 2 — Title                    [status]
  (collapsed)
```

- Tap the **triangle/chevron** on a series row → expands/collapses to show issues
- Tap the **series name** → opens the Series Map in the main content area
- Tap the **triangle/chevron** on an issue row → expands/collapses to show pages
- Tap the **issue name** → opens the Issue Map in the main content area
- Tap a **Script or Storyboard icon** on any row → opens that editor in the main content area
- Long press any row → context menu (Open, Rename, Delete, Add Issue, Add Page, etc.)
- "+" at the bottom of each level → creates a new series, issue, or page

### Arc Notes Section
- Series-level notes and context
- Lives in the binder by default; can be torn off as a column
- Editable rich text

### Characters Section
- Shows universe characters
- Can be filtered to show only characters relevant to the current series (via series overlays)
- Lives in the binder by default; can be torn off as a column

### Working Layout Examples
Default (everything in binder):
> **Binder** | Script editor

Power user (arc notes and hierarchy torn off):
> **Binder** | **Arc Notes column** | **Series/Issue/Page column** | Script editor

---

## 7. Script Editor

> Single shared component. Runs identically on iPad and web.

### Document Model
- One script editor session = all pages of an issue in a single continuously scrollable document
- Pages are visually delimited by a "Page N" header/divider but there is no pagination — it scrolls like a word processor
- Quick navigation: tapping a page row in the binder accordion scrolls the editor to that page instantly
- Opening the script from a specific page row in the binder opens the editor scrolled to that page

### Block Selector Bar
The block selector bar is the script editor's persistent toolbar. It is not floating or repositionable — its position is determined by keyboard state:
- **On-screen keyboard active**: bar appears as a keyboard accessory (fixed strip above the keyboard)
- **Physical keyboard connected**: bar is pinned to the bottom edge of the editor pane

**Bar contents (left to right):**

| Group | Items |
|-------|-------|
| Block types | Panel · Scene · Description · Dialogue · Caption · SFX |
| Inline formatting | Bold · Italic |
| Overflow | `···` |

- Tapping a block type button converts the current block to that type
- Bold and Italic apply to selected text within Description, Dialogue, and Caption blocks only
- `···` overflow contains: Find/Replace, and future editor-specific options
- All actions also have keyboard shortcuts (see below)

### Block Types

| Block | Behavior |
|-------|----------|
| **Panel** | Auto-numbered. Renumbers on delete. Carries an optional size tag (see Panel Size Tags below). |
| **Scene Heading** | INT./EXT., location, time of day. Keywords: INT., EXT., WIDE, CLOSEUP, MEDIUM, HORIZON, BIRD'S EYE, WORM'S EYE |
| **Description** | Action lines. Supports bold/italic. |
| **Dialogue** | Character name (with Universe Bible autocomplete) + dialogue text. Supports bold/italic. |
| **Caption** | Narration or caption box text. Supports bold/italic. |
| **SFX** | Sound effect. Rendered large and stylized in storyboard preview. |

### Panel Size Tags
Each Panel block carries an optional size tag controlling its vertical height on the page. The tag is displayed inline to the right of the panel label (e.g., `Panel 1  [½]`). Tapping the tag (or the empty space where it would appear) opens a small picker.

| Tag | Meaning |
|-----|---------|
| **Full** | Panel takes the full page height (splash) |
| **½** | Half the page height |
| **⅓** | One third |
| **⅙** | One sixth |
| **⅛** | One eighth |
| **Remainder** | Takes whatever vertical space is left after other panels are sized |

- Default: no tag. Untagged panels share remaining space equally.
- The storyboard canvas panel grid overlay re-generates whenever tags are added, changed, or removed.
- Horizontal panel arrangement (side-by-side panels) is not encoded in size tags in v1 — the overlay only reflects vertical sizing. Horizontal layout is drawn freehand by the artist.

### Keyboard Flow

| Current Block | Enter → | Tab → |
|--------------|---------|-------|
| Panel | Scene | — |
| Scene | Description | Panel |
| Description | Description | Character name |
| Character name | Dialogue | — (empty + Enter → new Panel + Scene) |
| Dialogue | Dialogue | New character name (Double-Tab → escape to Description) |
| Caption | Description | — |
| SFX | Description | — |

- Backspace on empty block → delete + focus previous block
- Shift+Enter → newline within Description, Caption, or Dialogue
- Cmd/Ctrl+B → Bold. Cmd/Ctrl+I → Italic.

### Distraction-Free Mode
- **Enter/exit**: 4-finger tap (toggle). Same gesture exits.
- Also exits if the user swipes from the left edge to reveal the binder, or otherwise reveals global chrome.
- In distraction-free: binder hidden, global chrome hidden, block selector bar remains visible (it's the only way to change blocks on touch).
- Full pane width used for the script.

### Outline Mode
Deferred — spec after v1 script editor ships.

### Auto-save
Debounced 1.5s after last keystroke. Save state reflected in the global chrome save/sync indicator.

### References
`panelsync-script-editor.html`, `panelsync-mockup.html`

---

## 8. Storyboard Canvas

Every Page has a permanently paired storyboard canvas. Script page and storyboard are always created together. The storyboard is iPad-only for drawing in v1; web gets a read-only preview.

### Document Model
- One page at a time — not continuous scroll
- Page strip at the bottom always shows thumbnails of all pages in the issue
- Tap a thumbnail → jump to that page
- 4-finger swipe (any direction) → next or previous page

### Panel Grid Overlay
- Auto-generated from the Panel block size tags in the script for this page
- Visual reference only — it does not constrain where the artist can draw
- Toggled on/off via the drawing toolbar
- Reflects vertical panel sizing only (Full · ½ · ⅓ · ⅙ · ⅛ · Remainder)
- Horizontal panel divisions are drawn freehand — the grid does not encode them in v1
- Overlay updates live when size tags change in the script

### Drawing Toolbar (iPad)
- Snaps to the edges of the canvas pane. Default position: left edge (keeps Pencil hand clear).
- Auto-hides 3 seconds after the last drawing stroke. Reappears on any tap that is not a drawing stroke.

| Group | Items |
|-------|-------|
| Tools | Pencil · Eraser |
| Stroke | Weight slider |
| Color | Black · Dark grey · Red |
| Actions | Redo · Script reference panel toggle · Grid overlay toggle · Reference image import |

### Script Reference Panel
- Shows the full script text for the current page, read-only and scrollable
- Slides in from the right as a half-width overlay; the canvas dims behind it but remains visible
- Toggled by the script reference button on the drawing toolbar

### Gestures (iPad)
| Gesture | Action |
|---------|--------|
| Pencil / finger stroke | Draw |
| 2-finger tap | Undo |
| Redo button (toolbar) | Redo |
| 2-finger drag | Pan canvas |
| Pinch | Free zoom |
| 3-finger tap on a panel | Snap-zoom: panel fills screen |
| 3-finger tap (when zoomed) | Snap back to full page |
| 3-finger swipe (when zoomed) | Jump to next panel in swipe direction |
| 4-finger swipe | Next / previous page |

### Reference Image Import
- Import any image from the photo library or files
- Set opacity (slider), then sketch over the image
- Image is non-destructive — it lives on a separate layer below the drawing layer and is not exported as part of the storyboard

### Standard Mode (Script Editor Preview)
- When the script editor is open in Standard mode, the storyboard appears as a 40% preview pane
- This is a rendered image in v1 — not a live drawable canvas
- Tapping the preview pane opens the full storyboard canvas

### Auto-save
- Every 30 seconds while the canvas is open
- On navigation away from the page

### Web (v1)
- Read-only rendered preview of the storyboard, shown in split view alongside the script
- Drawing is not available on web in v1

---

## 9. Universe Bible

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

## 10. Timeline Tool

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

## 11. Notes System

- Notes at Universe, Series, or Issue level
- Folder organization with drag-and-drop
- Rich text: bold, italic, headings, bullet lists, inline code
- Quick-capture: floating button (iPad), Cmd/Ctrl+Shift+N (web)
- Full-text search across all notes in a Universe
- Private notes — visible only to creator

---

## 12. Collaboration

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

## 13. Export & Sharing

### MVP
- Script PDF — industry-standard comic script format. Background job, download notification.
- Storyboard PDF — basic server-side render (Puppeteer). No layer control.

### v2
- Series Bible PDF, Storyboard PDF (300dpi, layer compositor), image sequence per page
- Chalkboard export, Relationship Map export

### Read-Only Sharing
- Live link to any section. Password-protected or expiring. No account required.

---

## 14. MVP Feature Status

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

## 15. Deferred (v2+)

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

## 16. Open Questions

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
