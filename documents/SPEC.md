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
- **Tap** → opens the item in the main content area
- **Long press** → context menu (items include: Open, Open in Split, Rename, Delete, Select, Pin)
- **"Select" from context menu** → enters selection mode. Single taps accumulate selection. Bulk action toolbar appears at the bottom of the binder.
- Selection mode exited by tapping Done or deselecting all items

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

- Tap a series row → expands to show issues
- Tap an issue row → expands to show pages
- Tap a Script or Storyboard icon on any row → opens that editor in the main content area
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
