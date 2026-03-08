# PANELSYNC — CLI Build Handoff Packet

**v3.0 · March 2026**
*Consolidated from Scope v2, MVP v2, Timeline Spec v2, and design sessions*

---

## Table of Contents

1. How to Use This Document
2. Product Vision & Core Philosophy
3. Information Hierarchy & Data Model
4. Technology Stack
5. Visual Design Language
6. Navigation System
7. Home Screen
8. Script Editor
9. Storyboard Canvas
10. Universe Bible — Characters & Locations
11. Timeline Tool
12. Notes System
13. Collaboration
14. Export & Sharing
15. MVP Feature Status & Build Order
16. Deferred Features (v2 Roadmap)
17. Risks & Mitigations
18. Open Questions
- Appendix A: Visual Mockup File Index
- Appendix B: Script Editor Keyboard Reference
- Appendix C: Timeline Gesture Reference

---

## 1. How to Use This Document

This packet consolidates everything designed and specified for PanelSync to date. It is intended as the single source of truth for bringing a CLI coding agent (Claude Code or similar) up to speed on the full project. It combines three previously separate documents — the Product Scope (v2), the MVP Build Document (v2), and the Timeline Design Spec (v2) — along with all visual mockups and interaction specifications created during design sessions.

The document is organized to match the build order: vision and architecture first, then each feature area with its specification and accompanying visual reference. HTML mockups are referenced by filename throughout and should be opened in a browser for interactive inspection.

### Included Files

- **PanelSync_Handoff_v3.md** — this document
- **panelsync-home.html** — Home screen mockup (dark + light, normal + long-press states)
- **panelsync-script-editor.html** — Script editor mockup (dark + light, full working prototype)
- **panelsync-mockup.html** — Original app mockup with sidebar, script, and storyboard
- **panelsync-v2.html** — Functional script editor v2 with live typing and keyboard flow
- **panelsync-timeline.html** — Timeline visualization mockup (horizontal, with events, ranges, arcs)
- **panelsync-tick-explore.html** — Tick/diamond style exploration for timeline notches
- **panelsync-universe-home.html** — Universe Home landing page mockup (dark + light)
- **panelsync-nav-system.html** — Full navigation system specification rendering
- **panelsync-flowchart.html** — Complete navigation flowchart from app launch to every destination

---

## 2. Product Vision & Core Philosophy

> PanelSync is a creative operating system built specifically for comic makers. It is the first tool to bring script writing, world building, character and location libraries, visual references, timelines, and story planning into a single coherent workspace — purpose-built for the way comics are actually made.

Comic creators currently stitch together a workflow from tools never built for them. Scripts live in Google Docs. Character references live in Apple Notes or scattered folders. Timelines live in spreadsheets. World-building lore lives nowhere in particular. Nothing talks to anything else.

The frustration is not just organizational — it is creative. When you cannot find what you wrote about a character three months ago, you lose the thread. When your collaborator does not know what you decided about a location, you lose continuity. When you cannot see where a scene fits in the larger story, you lose perspective.

### Core Philosophy

> The depth is always there for the people who want it. It never gets in the way of the people who don't. A writer can open PanelSync, create a Universe, and start writing without ever touching the Timeline, the Chalkboard, or the Universe Bible. Everything populates quietly in the background.

### Target Users

- Solo writer-artists who want one place to do everything
- Writer-artist pairs who need to stay organized and aligned across a shared project
- Small studio teams with editors, multiple writers, and multiple artists working in a shared universe
- Publishers and editors who need a 2000ft view across multiple series simultaneously

### The Core Insight

PanelSync is not primarily a script editor with features bolted on. It is a universe-first creative workspace. The Universe — the fictional universe the story inhabits — is the organizing principle. Everything else lives inside and refers back to the Universe.

### MVP Hypothesis

> Is PanelSync a better place to write a comic and organize a fictional world than Google Docs, Apple Notes, and a folder of reference images?

The MVP succeeds if a writer and their collaborator can move their entire comic workflow — scripts, characters, locations, and timelines — into PanelSync and feel more organized, more aligned, and less frustrated than they were before. Success is not feature completeness. Success is one workflow, end to end, that feels genuinely better than what the user had before.

### Success Metrics

- At least 10 real users complete a full working session without prompting
- At least 7 of those 10 say they would use it over their current tools
- At least one collaborating pair uses it together for a full week and reports feeling more organized
- Zero critical bugs that block core writing or organizing workflows
- Web app loads and is usable in under 3 seconds
- iPad Apple Pencil latency is imperceptible during normal sketching

---

## 3. Information Hierarchy & Data Model

### Structure

> Universes Dashboard → Universe → Series → Issues → Pages

- **Universes Dashboard** — home screen. Shows all Universes the user owns or is a member of.
- **Universe** — a fictional universe. Contains the Universe Bible, Timeline collection, Chalkboard collection, Relationship Map, Mood Board, Notes, and all Series. Universe-level content is shared across every Series.
- **Series** — a single comic series within the Universe. Has series-specific arc notes, character and location overlays, and a series-level timeline.
- **Issue** — a single issue. Contains its Script and Storyboard pages, issue notes, and status tracking.
- **Page** — a single comic page. Always has a paired script page and storyboard canvas.

### What Lives Where

| Level | Content |
|-------|---------|
| **Universe** | Universe Bible (Characters, Locations, Factions, Objects, Lore), Timeline collection, Chalkboard collection, Relationship Map, Mood Board, Notes, Collaboration settings |
| **Series** | Series arc notes, series-specific character/location overlays, series timeline, series Chalkboard canvases |
| **Issue** | Script, Storyboard, issue notes, page status tracking, Pacing View, Script Breakdown grid |
| **Page** | Script page (comic-native formatted text) paired with Storyboard page (drawable canvas, reference images, sketch layer) |

### Progressive Disclosure

The sidebar defaults to showing only what the user needs — their series, issues, and pages. The Universe Bible, Timeline, Chalkboard, and other tools are accessible but not pushed. A writer who only wants to write scripts will never be confronted with tools they do not need.

### 3.1 Core Data Model

The MVP data model is intentionally minimal. Every entity is load-bearing for the core workflow. Nothing is added speculatively. The model is designed to accommodate v2 features — timeline lenses, continuity tracking, storyboard auto-generation — without a rewrite.

#### Entities

| Entity | Fields |
|--------|--------|
| **User** | id, email, password_hash, display_name, avatar |
| **Universe** | id, owner_id, name, cover_image, created_at |
| **UniverseMember** | universe_id, user_id, role (owner/editor/commenter/viewer) |
| **Series** | id, universe_id, name, arc_notes, cover_image |
| **Issue** | id, series_id, number, title, notes |
| **Page** | id, issue_id, page_number, script_content (JSON), status (draft/review/locked/complete), updated_at, updated_by |
| **StoryboardPage** | id, page_id, sketch_data (JSON), reference_image_url, reference_opacity |
| **Panel** | id, page_id, panel_number, size_tag, keywords[] — prepared for v2 auto-generation |
| **Character** | id, universe_id, name, role, appearance, backstory, color, knowledge_gaps (JSON) |
| **CharacterSeriesOverlay** | character_id, series_id, notes |
| **Location** | id, universe_id, name, description, time_period, color |
| **LocationSeriesOverlay** | location_id, series_id, notes |
| **Timeline** | id, universe_id, name, intent (story/reference/character_arc/production) |
| **TimelineEvent** | id, timeline_id, title, date_label, description, character_ids[], location_id, tag_type (point/range), range_start_label, range_end_label, color, sort_order |
| **TimelineRange** | id, timeline_id, name, start_event_id, end_event_id |
| **Note** | id, universe_id, series_id (nullable), issue_id (nullable), title, content (JSON), is_private, updated_at |
| **NoteFolder** | id, universe_id, name, parent_folder_id |
| **Comment** | id, target_type, target_id, user_id, content, resolved, created_at |
| **AssetTimelineTag** | id, asset_type, asset_id, timeline_event_id, tag_type (point/range) |

#### Key Design Decisions

- **StoryboardPage is separate from Page** — sketch data never overwrites script content
- **Panel entity exists in MVP even without auto-generation** — the panel_number and size_tag fields are written by the script parser and read by the v2 storyboard generator
- **knowledge_gaps on Character** is a JSON field that stores narrative knowledge gap tags — ready for the v2 Continuity Tracker to read
- **AssetTimelineTag is a polymorphic join table** — any asset type (character, location, sketch, note, page) can be tagged to any timeline event without schema changes
- **CharacterSeriesOverlay and LocationSeriesOverlay** allow series-specific notes to layer on universe-level entries without overwriting them

---

## 4. Technology Stack

### The Unified Approach

> PanelSync is one product that runs on two surfaces from a single codebase. The iPad is the full product. The web is the same product optimized for a keyboard and mouse, with drawing canvas depth reduced. Anything you can do in the script editor on web, you can do on iPad. Platform differences are drawing depth only — not feature access.

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **App framework** | Expo SDK (React Native + Expo for Web) | Single codebase runs natively on iPad and in browser. Future Android with no rewrite. |
| **Script editor** | Custom rich text engine with portable ProseMirror adapter | Same editor component on both platforms. Custom block types for all comic block types. |
| **Drawing canvas** | React Native Skia (iPad native only) | High-performance canvas with Apple Pencil pressure sensitivity. Not loaded on web in v1. |
| **Shared UI system** | NativeWind (Tailwind for React Native) | Utility-class styling across native and web from one set of class names. |
| **Navigation** | Expo Router | File-based routing, works identically on native and web. |
| **Backend API** | Node.js + Fastify | Lightweight REST API shared by both surfaces. |
| **Database** | PostgreSQL | All relational data — projects, users, pages, notes, timeline events. |
| **File storage** | Cloudflare R2 (S3-compatible) | Sketch data, reference images, exported PDFs. No egress fees. |
| **Auth** | Expo Auth + custom JWT | Email/password. OAuth (Google) as stretch goal. |
| **Sync** | REST polling on open | Loose sync — no WebSocket in MVP. Page fetches latest on open. |
| **Hosting (web)** | Vercel | Zero-config Expo web export deployment. Free tier for MVP. |
| **Hosting (backend)** | Railway or Render | Postgres + Node. Free/low-cost tier. |
| **PDF export** | Puppeteer (server-side) | Headless Chrome renders script or storyboard to PDF. |

---

## 5. Visual Design Language

PanelSync uses a restrained, warm design vocabulary across all screens. The visual language was developed across multiple design sessions and is fully represented in the accompanying HTML mockups.

### Color Tokens (Dark Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#111110` | Base background |
| `--bg-s` | `#181715` | Surface background |
| `--bg-p` | `#1d1c19` | Panel background |
| `--bd` | `#2a2724` | Border |
| `--tx` | `#dfd9ce` | Primary text |
| `--tx2` | `#7e7870` | Secondary text |
| `--tx3` | `#44413a` | Muted text |
| `--acc` | `#c8a768` | Accent (gold) |
| `--acc2` | `#6e5430` | Accent dim |
| `--sd` | `#507a5c` | Status: done (green) |
| `--sr` | `#b89048` | Status: review (amber) |
| `--sl` | `#4a6898` | Status: locked (blue) |

### Typography

- **Lora** (serif) — titles, event titles, headings. Conveys authorship and intention.
- **Geist** (sans-serif) — body text, UI labels, descriptions. Clean and modern.
- **Geist Mono** (monospace) — metadata, status labels, structural annotations. Systematic feel.
- **Courier Prime** — script editor body text. Industry-standard screenplay font.
- **Caveat** (handwritten) — timeline cluster labels (default). Informal, cartographic.

### Design Principles

- Warm, not cold — slate and gold, not pure gray and blue
- Minimal chrome — writing space is maximized, UI recedes
- Dark and light modes — both fully designed from the start
- iPad-first touch targets — everything works at finger scale
- Paper metaphor in the script editor — pages feel like pages

---

## 6. Navigation System

The navigation system has been fully mapped from app launch to every destination, including first-launch onboarding, the Universes shelf with its long-press interaction model, and the in-app sidebar with all its destinations.

**See:** `panelsync-flowchart.html` and `panelsync-nav-system.html`

### Universes Dashboard / Universes Shelf

- Home screen on app launch. Universe cards with cover image, name, metadata, and stacked sub-cards beneath.
- **Tap** a universe card → resumes at last open page (the default, fastest path)
- **Long-press** a universe card → reveals options: "Universe Home" or "Settings"
- First-time **peekaboo animation**: sub-cards slide down ~18px and back to teach the mechanic, then a tooltip reinforces it. Plays once, never again.

### Contextual Sidebar

- **Top section** — Universe-level tools: Universe Bible, Timeline, Chalkboard, Relationship Map, Mood Board, Notes
- **Middle section** — Series list, expandable to Issues, expandable to Pages
- **Bottom section** — current page context: quick access to script and storyboard for the active page
- Collapsible on both iPad and web to maximize working space
- Universe switcher at top — jump to another Universe without returning to the dashboard

### Split View

Any two sections can be viewed side by side. Common quick-launch pairs: Script + Storyboard, Script + Characters, Timeline + Script, Characters + Sketch canvas, Locations + Sketch canvas, Timeline + Characters.

---

## 7. Home Screen

The home screen has been fully designed in both dark and light modes, in both normal state and long-press state. It features three sections: a Resume area (showing the most recent work with a primary card and secondary cards), a Recent Activity feed, and the Universes shelf.

**See:** `panelsync-home.html`

---

## 8. Script Editor

> The script editor is a first-class writing tool built specifically for comics — not a general text editor with comic formatting added on top. It is a single shared component that runs identically on both iPad and web.

**See:** `panelsync-script-editor.html`, `panelsync-mockup.html`, `panelsync-v2.html`

### Comic-Native Block Types

| Block Type | Behavior |
|-----------|----------|
| **Panel** | Auto-numbered. Cmd/Ctrl+Enter to insert. Renumbers on deletion. |
| **Scene Heading** | INT./EXT., location, time of day. Keywords: INT., EXT., WIDE, CLOSEUP, MEDIUM, HORIZON, BIRD'S EYE, WORM'S EYE. |
| **Description** | Action lines. Inline panel sizing tags: `[page-width]`, `[half]`, `[1/3]`, `[remainder]`. |
| **Dialogue** | Character name (with Universe Bible autocomplete) + dialogue text. |
| **Caption** | Narration or caption box text. |
| **SFX** | Sound effect. Rendered large and stylized in storyboard preview. |

### Editor Modes

- **Standard** — split view: script left (60%), storyboard preview right (40%). On iPad, the right panel is the live Skia drawing canvas. On web, read-only storyboard preview in v1.
- **Distraction-free** — Cmd/Ctrl+Shift+F. Full screen, sidebar and preview hidden.
- **Outline** — all blocks collapsed to panel headings only. Toggle from view menu.

### Keyboard Flow (Final Draft Rhythm)

The script editor uses a keyboard-driven flow modeled after Final Draft — the industry standard for screenwriting. The idea is that the writer should rarely need to reach for the mouse or touch the screen while writing. Block types flow naturally from one to the next based on Enter and Tab keys.

| Current Block | Enter → | Tab → | Notes |
|--------------|---------|-------|-------|
| **Scene** | Action | Panel | |
| **Action** | Action | Character | Tab promotes to dialogue setup |
| **Character** | Dialogue | — | Empty character + Enter → new Panel + Description |
| **Dialogue** | Dialogue | New Character | Double-Tab → escape to Action |
| **Paren** | Dialogue | — | |
| **Transition** | Scene | — | |
| **Panel** | Scene | — | |
| **SFX/Caption** | Action | — | |

Backspace on an empty block deletes it and moves focus to the previous block. Shift+Enter inserts a newline within description, caption, or dialogue blocks.

### Auto-save

Debounced 1.5 seconds after last keystroke. A subtle animated save indicator appears in the toolbar. On iPad, the software keyboard auto-dismisses when the user taps the storyboard canvas side, transitioning naturally from writing to drawing mode.

---

## 9. Storyboard Canvas

Every script page has a permanently paired storyboard canvas. In MVP, canvases are blank — the artist defines the layout by drawing. Auto-generation from the script is a v2 feature, but the data model and page structure are designed for it from day one.

### Canvas Features (iPad Native)

- One blank Skia canvas per script page, always paired
- Panel grid guides as a toggleable overlay — helps the artist divide the page before sketching
- Script for the current page accessible as a collapsible reference panel on the left
- Pencil tool with Apple Pencil pressure sensitivity — pressure maps to stroke width
- Eraser, stroke weight slider, stroke color (black, dark grey, red for annotation)
- Two-finger tap: undo. Three-finger tap: redo.
- Pinch to zoom the full page. Double-tap to enter focused mode on a panel area.
- Toolbar auto-hides after 3 seconds of drawing; tap to reveal
- Page strip at bottom — thumbnail navigation between pages in the current issue
- Reference image import — import from photo library or files, set opacity, sketch over
- Auto-save sketch data every 30 seconds and on navigation away from the page

---

## 10. Universe Bible — Characters & Locations

**See:** `panelsync-universe-home.html`

### Characters

- Profile fields: name, role, appearance description, backstory, series appearances, color (for proxy markers and timeline color coding)
- Rich text notes section on every entry
- Reference image import — attach images to any entry
- Sketch layer on iPad — draw directly on the character page with Apple Pencil
- Series overlays — per-series notes that layer on top of the universe-level entry
- Knowledge gap tagging — 'this character does not know X at this point in the story' — stored as JSON, read by v2 Continuity Tracker

### Locations

- Profile fields: name, description, time period, series appearances, color
- Same rich text notes, reference images, sketch layer, and series overlays as Characters

### Navigation

- Browse by entry type (all Characters, all Locations)
- Global search — find any entry, note, or tagged asset from a single search box
- Filter by series or by timeline range

---

## 11. Timeline Tool

> One of PanelSync's most distinctive features — and the one no other comic tool provides. The timeline has been fully specified across two design sessions and has its own detailed design spec (Timeline Spec v2), fully incorporated here.

**See:** `panelsync-timeline.html` and `panelsync-tick-explore.html`

### 11.1 Entity Types

Five distinct entity types live on or around the timeline, each with a different visual register and purpose.

#### Events

- Atomic unit — a single moment or point in time
- Has: time position (absolute or relational), title, optional description, optional tag assignments
- Rendered as: diamond notch on spine + connected card depending on view
- Automatically registered in the Universe Bible on creation
- Can be **pinned** — a pinned event stays visible at all zoom levels, last to compress. Pin icon in corner of card, amber when active.
- Can be converted to a range by adding an end point in the event editor

#### Ranges

- A named span between two time positions. Has: start t, end t, name, color (via tag).
- Rendered as: solid color bar connecting two diamond nodes on the spine
- Multiple overlapping ranges: first two alternate above/below the spine. Three or more overlapping: overlapping portion divided equally between all colors across both sides.
- Togglable on/off. In vertical: ranges appear to the right of the spine.

#### Cluster Labels

- Navigational annotation — appears when events compress at far zoom
- Cartographic behavior: large and prominent zoomed out, shrinks and fades zooming in, invisible at close zoom
- Floats centered above/below its group — not tethered to the spine
- Universal fade rule applies to all cluster labels regardless of creation method
- **Creation methods:** automatic (compression threshold + badge), tap to name, or manual lasso around any group
- **Font options:** Caveat (default/handwritten), Lora Italic (editorial), Geist Mono small caps (clinical), or user custom font

#### Arcs

- Story arcs spanning multiple events — their own entity type, distinct from ranges
- Has: name, color, start point, optional end point. Registered in Universe Bible.
- Togglable — global on/off plus per-arc toggle in Arc Settings. Priority ordering for stacking.
- Slightly transparent by default — narrative and organic, not structural
- Open end: arc with no end point trails off into an ellipsis at the screen edge

**Horizontal behavior:**
- Arc rises as a parabola from its start point on the spine
- No end point: rises to apex then continues as flat horizontal line rightward, dissolving to ellipsis at screen edge
- Multiple arcs stack at different heights above the timeline
- Very zoomed in: arc name appears as colored line of text along top of screen, parabola not yet visible
- Zooming out past threshold: parabola edges emerge on either side of title, title rises to sit at apex
- Live arcs spanning current screen always labeled at top regardless of zoom

**Vertical behavior:**
- Arc appears as colored bracket running down the far left edge of the screen
- Bracket oriented rightward, spans the events the arc covers
- Arc name sits at midpoint of bracket. Open end trails to ellipsis at bottom.

#### Issue Brackets

- Optional structural markers showing which events fall within each issue
- Rendered as crisp black dotted brackets — structural, not narrative. Labeled: Issue 1, Issue 2, etc. in Geist Mono.
- Togglable — global on/off plus per-issue toggle. Live in their own dedicated band, separate from arcs.
- Dotted quality signals "container not story element" — like crop marks

**Horizontal:** dedicated band between arc layer and spine

**Vertical:** bracket column just right of arc brackets, left of spine

### 11.2 Visual Design

#### The Spine

- 1px crisp line — the visual and conceptual anchor of the entire view
- Light mode: pure black (`#1A1916`) on warm slate background (`#E8E5DF`)
- Always unobstructed — no cards, labels, or UI elements may cross it
- Minimum 35% of screen height clear on each side of the spine — no card edge may enter this zone

#### Event Notches (Diamonds)

- Default state: solid black diamond, no glow
- Colored state: split diamond — tag color top half, black bottom half, glow behind
- Color is a property of a tag, not specifically a character — any entity can have a color
- Diamond shows color of the primary tag on the event
- Width always H÷7, never set independently. Size transitions interpolated continuously, never snapping.
- Zoom-responsive sizing: H8 (farthest) → H11 (mid-far) → H14 (mid-close) → H18 (closest)

#### Typography Hierarchy

- **Event titles:** Lora 600 — considered, authored
- **Range labels:** Geist Mono — systematic, structural
- **Issue labels:** Geist Mono — structural
- **Arc labels:** Lora Italic or user choice — narrative, organic
- **Cluster labels:** Caveat (default) — informal, cartographic

#### Connector Lines

- Elbow shape: vertical leg down/up from notch, then horizontal leg to card midpoint
- Line weight: 0.6–0.75px
- Color: `#1A1916` at ~25–30% opacity
- Small dot (1.5px radius) at card attachment point

#### Event Cards

- White (`#FFFFFF`) with black text on warm slate background
- Expanded mode: date label, title (Lora 600), description (Geist), character tags
- Compact mode: date label and title only
- Selected card: amber left accent bar, title in accent color, amber border
- Free-placement algorithm places cards starting close to the spine and walks outward only as far as needed to avoid overlap

### 11.3 Layout

#### Horizontal Layout (top to bottom)

1. **Arc layer** — slightly transparent colored parabolas at varying heights
2. **Issue band** — dotted black brackets, dedicated strip
3. **Clear zone** — 35% minimum screen height, no cards or elements
4. **THE SPINE** — 1px black line, the dominant element
5. **Clear zone** — 35% minimum screen height
6. **Card space** — event cards spread freely, free-placement algorithm

#### Vertical Layout (left to right)

1. **Arc brackets** — far left, transparent colored, oriented rightward
2. **Issue brackets** — dotted black, oriented rightward, just right of arcs
3. **THE SPINE** — 1px black line
4. **Ranges** — colored bars to the right of the spine
5. **Clear zone** — small buffer
6. **Event rows** — filling remaining screen width rightward

#### Card Placement (Horizontal)

- Default: free-placement algorithm places cards wherever best fit, no side preference
- Tag affinity rules: optional per-tag setting to always place events above or below the spine (defined in Timeline Settings)
- Priority: tag affinity rules honored first, free placement used when no rule applies
- Cards never overlap each other

### 11.4 Time System

#### Time Value Types

- **Absolute:** a defined position in the time system
- **Relational:** defined only as "after event A, before event B" — a first-class citizen. Displays equidistant between neighbors in all views. In scaled time mode: floats at midpoint between neighbors' absolute positions.

**Neighbor deletion rules:**
- Both new neighbors relational → silently reanchors equidistant, no prompt
- One or both new neighbors absolute → prompts user: lock in current position (converts to absolute) or stay relational equidistant
- Prompt includes "Do this every time" checkbox — saves preference to Timeline Settings

#### Time System Options

**Pure Sequence:**
- No time unit — ordered moments only
- Scaled time toggle permanently off
- Smallest unit is a moment

**Standard Earth Time:**
- Anchored to real calendar
- Smallest unit: seconds
- Display unit is zoom-determined — seconds at max zoom through millennia at min zoom

**Custom Time System:**
- User defines a unit chain in the setup wizard
- Smallest unit defined first — everything else is a multiple of it
- Each unit above defined as: 1 [this unit] = N [unit below]
- List is shuffleable and fully editable after creation
- Unit names are freeform — Heartbeat, Heart-minute, Cardiovascular Year, etc.
- Can be anchored to Earth time later via Timeline Settings — one-way conversion with warning
- Unit chain implies the granularity — no separate resolution setting needed

#### New Timeline Setup Wizard

1. Name the timeline
2. Choose time system — Pure Sequence / Standard Earth Time / Custom
3. (Custom only) Build unit chain in the unit wizard
4. Choose time display format — Relative (quantities) vs Absolute (clock/date)

All wizard settings editable later in Timeline Settings. Timeline is open-ended by default — no required start or end point.

#### Display Unit Transitions

- Ruler label changes with zoom level automatically
- At transition between units: both units shown briefly before resolving
- Exact transition behavior to be evaluated in practice once built

#### Hard Boundary Pins

- Optional — timeline is open-ended unless user deliberately sets a hard boundary in Timeline Settings
- User can set a hard start and/or end point
- Hard end combined with scaled time = fixed-length spine, acts as a story progress indicator

### 11.5 Gestures & Interaction

#### Horizontal Gestures

- **1-finger hold on spine (~0.5s)** → activates scrub mode. Scrub along spine for live time label under finger.
- **Drag up or down past clear zone boundary** → locks position, direction sets card side
- **Lift finger outside clear zone** → confirms position, opens creation modal
- **Lift finger inside clear zone** → cancels, no event created
- **2-finger drag** → pans timeline left/right
- **Pinch (2 fingers)** → standard zoom, 1x rate
- **Pinch (1 finger + 1 other)** → 1.25x zoom rate
- **Pinch (1 finger + 2 others)** → 1.5x zoom rate
- **Pinch (1 finger + 3 others)** → 1.75x zoom rate
- **4-finger tap** → toggles minimal view (chrome on/off)
- **2–3 idle taps on empty canvas** → surfaces exit prompt in minimal view

#### Vertical Keyboard Navigation

- **Cmd ↑/↓** → jump event to event
- **Shift+Cmd ↑/↓** → jump 10 events at a time
- **Cmd ←/→** (scaled time off) → jump space to space between events
- **Cmd ←/→** (scaled time on) → jump by smallest visible time increment
- **Cmd +/−** → zoom in and out (scaled time on only)
- **Cmd+Enter** on a space → creates new event inline, cursor ready
- **Cmd+Enter** again → commits the event

#### Event Creation — Horizontal Modal

- New Event placeholder in light grey at top
- Precise time display on: shows exact time rounded to nearest displayed unit
- Both display toggles off: relational placeholder, ordered between neighbors
- First line is title — larger font, character-limited
- Body: unlimited content
- Tags applied inline at any point while writing
- Auto-detection: entities in Universe Bible underlined inline as typed
- Long-press any selected text to attach as alias to a Universe Bible entity
- Option to add end point — converts event to range
- Physical keyboard: Cmd+Enter to complete. On-screen: arrow/confirm button.
- Completed event anchors to spine, loses staging appearance
- Paste from clipboard: creates floating unanchored card with dashed border until anchored

#### Event Creation — Vertical Inline

- Tap spine between two events to insert
- No modal — inline keyboard rises from bottom
- Blank event row appears in place, cursor ready
- Physical keyboard: type directly, no on-screen keyboard shown
- Bottom chrome: undo, text suggestions, standard iOS strip — always visible even in focus mode

### 11.6 Chrome & Toolbar

#### View Modes

- **Toolbar view:** standard working mode, all chrome visible
- **Minimal view:** 4-finger tap, chrome hides, spine and annotations always remain
- 4-finger tap again to return to toolbar view
- 2–3 idle taps on empty canvas surfaces gentle exit prompt in minimal view
- Vertical has no palette — keyboard and toolbar sufficient

#### Toggle Palette (Horizontal)

- Small handle in corner of canvas, user-repositionable, can be turned off
- Tap-hold or drag from handle expands radial arc palette
- **Innermost ring:** last 2–3 used toggles — dynamic, muscle memory zone
- **Middle ring:** fundamental toggles — scaled time, orientation, density
- **Outer ring:** specific toggles — ranges, descriptions, grid, cluster labels, arcs, issues
- Drag to node and release → flips that toggle
- Release without reaching node → dismisses palette, no change
- Dismiss also by: drifting back to center, or rapid left-right shake gesture
- Undo flanks palette badge on left, Redo appears on right after undo is used

#### Toolbar Groups

- **Lens** — filter by any tag, character, location, or Universe Bible entity; tag-based side affinity rules
- **Timeline Display** — all toggles: scaled time, ranges, descriptions, timescale grid, cluster labels, arcs, issues, individual arc/issue toggles; time display format: relative vs absolute
- **Zoom** — controls, fit to screen, jump to specific zoom level
- **Search** — finds events, ranges, cluster labels, arcs, issues, tags, characters, locations — anything on the timeline
- **Jump To** — navigate to a known point: specific date, year, range name, event name, arc name
- **Play** — presentation/animation mode: blank timeline animates events appearing; playback order: chronological or creation order; playback speed: controllable like a slideshow; pause/play/scrub controls
- **New** — New Event, New Range, New Cluster Label, New Arc, New Issue Bracket
- **Edit** — Lasso (manual selection tool for grouping), Cut/Copy/Paste (paste creates floating unanchored card), Delete (undoable), Select All, Move To (absolute position), Move By (relative offset). Move To and Move By live in the same popover with two tabs.
- **Undo/Redo** — lives in toolbar in toolbar view; flanks palette badge in minimal view (undo left, redo right); redo only appears after undo has been used

#### Tags Dropdown

- Accessible from any selected event — in detail panel or contextual popover
- Search bar at top to find tags by name
- Results show tag name with color swatch
- Tap to apply, tap again to remove
- Applied tags show as chips on event card/row
- Typing a tag name that does not exist offers to create a stub in the Universe Bible

### 11.7 Universe Bible Integration

- Any entity that can be tagged or detected is registered in the Universe Bible
- Creating an event on the timeline auto-registers it in the Universe Bible under Events
- Auto-detection only matches entities that exist in the Universe Bible — no fuzzy guessing
- Exact matches and registered aliases both trigger detection
- Long-press any selected text anywhere in the app to attach as alias to a Universe Bible entity
- Quality of auto-detection is proportional to the user's investment in the Universe Bible
- Color is a property of a tag/entity in the Universe Bible — timeline inherits it
- Tags and colors managed in Universe Bible, not on the timeline itself

---

## 12. Notes System

- Universe-level notes organized in folders with drag-and-drop
- Rich text editor — bold, italic, headings, bullet lists, inline code
- Quick-capture — floating button on iPad, Cmd/Ctrl+Shift+N on web
- Full-text search across all notes in a Universe
- Private notes — visible only to the creator
- v2: attached notes on specific characters, locations, or timeline events

---

## 13. Collaboration

### Access Model

- Open by default — everyone with access can see and edit everything
- Individual sections lockable by the Universe owner
- Private notes and canvases — visible only to their creator

### Roles

- **Owner** — full access, manages members, locks sections, can delete the Universe
- **Editor** — can edit everything that is not locked
- **Commenter** — comments and annotations only (v2)
- **Viewer** — read-only

### MVP Sync

- Invite collaborators by email — they receive a link to create an account and join the Universe
- Last-write-wins sync with a visible 'last edited by [name] [time]' indicator on every page
- Update banner when a page has been edited since the user last opened it
- Page status tracking — draft, in review, locked, complete — set per page from the script toolbar
- Script breakdown grid — all pages as thumbnails with status color codes
- Threaded text comments on any script block — leave, reply to, and resolve comments
- Read-only share link — anyone can view the storyboard without an account

### v2 Sync

- Real-time collaborative sync using Yjs CRDT
- Live presence indicator — who is active and where
- Named cursors on shared surfaces

---

## 14. Export & Sharing

### MVP Exports

- **Script PDF** — industry-standard formatted comic script. Background job, download notification when ready.
- **Storyboard PDF** — basic server-side render (no layer control in v1)

### v2 Exports

- Series Bible PDF — characters, locations, lore, and timeline in one document
- Storyboard PDF — full pages at 300dpi with layer compositor
- Storyboard image sequence — each page as individual PNG
- Chalkboard export, Relationship Map export

### Read-Only Sharing

- Read-only live link to any section — script, storyboard, Universe Bible entry, timeline, Chalkboard canvas
- Links can be password-protected or set to expire. No PanelSync account required to view.

---

## 15. MVP Feature Status & Build Order

> **Scope Rule:** If a feature does not directly help a writer write scripts, organize their world, or collaborate with a partner — it is not in the MVP.

### Feature Status Table

| Feature | MVP? | Notes |
|---------|------|-------|
| Universes Dashboard | **YES** | Entry point for the whole product |
| Universe hierarchy (Universe/Series/Issues/Pages) | **YES** | Core structure |
| Script editor — comic-native block types | **YES** | Panel, Scene, Description, Dialogue, Caption, SFX |
| Script editor — distraction-free mode | **YES** | Full screen, everything hidden |
| Script editor — outline view | **YES** | Collapsed to panel headings only |
| Script editor — auto-save | **YES** | Debounced 1.5s |
| Storyboard — blank drawable canvas | **YES** | One canvas per page, always paired |
| Storyboard — freehand drawing (iPad) | **YES** | Pencil, eraser, pressure sensitivity, undo/redo |
| Storyboard — reference image import | **YES** | Import image, set opacity, sketch over |
| Storyboard — script breakdown grid | **YES** | All pages as thumbnails with status |
| Drawing on character/location pages | **YES** | Same Skia canvas, same tools |
| Universe Bible — Characters | **YES** | Profile, notes, images, sketch layer |
| Universe Bible — Locations | **YES** | Profile, notes, images, sketch layer |
| Timeline — create multiple timelines | **YES** | Intent tags: story, reference, character arc, production |
| Timeline — events (point/range) | **YES** | Title, date, description, character tags |
| Timeline — named ranges | **YES** | Group events into jumpable named spans |
| Timeline — zoom, density, color coding | **YES** | Full navigation toolkit |
| Timeline — jump to character/date/range | **YES** | Fast navigation |
| Timeline — pin side by side | **YES** | Compare any two timelines |
| Notes (folders, rich text, search) | **YES** | Universe-level notes |
| Async collaboration | **YES** | Editor/Viewer roles, last-write-wins |
| Page status tracking | **YES** | Draft/review/locked/complete |
| Comments on script lines | **YES** | Threaded text comments |
| Read-only share link | **YES** | No account required |
| Script PDF export | **YES** | Industry-standard format |
| Storyboard PDF export | **PARTIAL** | Basic render, no layer control |
| Universe Bible — Factions/Objects/Lore | NO | v2 |
| Timeline lenses | NO | v2 — data model ready |
| Storyboard auto-generation | NO | v2 — data model ready |
| The Chalkboard | NO | v2 |
| Relationship Map | NO | v2 |
| Real-time sync (Yjs) | NO | v2 |
| Continuity Tracker | NO | v2 — tags built in MVP |

### Sprint Plan

Estimated at 2-week sprints for a single technical founder working part-time (~20 hours/week). The unified Expo codebase front-loads setup in Sprints 1–2 but eliminates platform duplication from Sprint 3 onward.

| Sprint | Deliverable | Success Criteria |
|--------|------------|-----------------|
| **1–2** | Foundation: Expo monorepo, NativeWind design system, Expo Router navigation, backend API skeleton, database schema, auth (email+password), Universes Dashboard | App runs on iPad and browser with same shell. Can sign up, sign in, create a Universe. |
| **3–4** | Hierarchy: Series, Issue, Page CRUD. Sidebar navigation. Contextual sidebar that shifts as you navigate deeper. Script page and storyboard page always created as a pair. | Can create Series, add Issues, add Pages, navigate with sidebar on both platforms. |
| **5–6** | Script editor: shared rich text engine, all six comic block types, auto-numbering, Tab cycling, auto-save, distraction-free mode, outline view. Same component on iPad and web. | Can write a full multi-panel script page on both iPad and web with all block types working correctly. |
| **7–8** | Character registry: character profiles, series overlays, autocomplete in DialogueBlock. Location profiles. Universe Bible browse and search. Knowledge gap tag field. | Can create characters and locations, write dialogue with autocomplete, browse Universe Bible on both platforms. |
| **9–10** | iPad drawing: Skia canvas on storyboard pages, character pages, and location pages. Apple Pencil pressure, eraser, toolbar, undo/redo, reference image import, opacity control, auto-save sketch data. | Can sketch on any drawable surface on iPad with Apple Pencil. Sketches persist across sessions. |
| **11–12** | Timeline: create timelines with intent tags, add events (point and range), named ranges, zoom, density toggle, color coding, character and range jump, pin side by side, asset tagging. Same component on iPad and web. | Can create multiple timelines, add events, navigate and filter them, and tag characters and locations to events on both platforms. |
| **13** | Notes: folder tree, rich text editor, quick-capture, full-text search, private notes. Same on iPad and web. | Can create folders, write notes, quick-capture from anywhere, and search across all notes on both platforms. |
| **14** | Collaboration: invite by email, Editor and Viewer roles, page status tracking, update banner, 'last edited by' indicator, threaded comments on script blocks. | Two users can collaborate on the same Universe. Both see page status and whose edit is current. Comments work on both platforms. |
| **15** | Script breakdown grid. Script PDF export (server-side Puppeteer, background job, download notification). Read-only share link. | Can see all pages at a glance with status indicators. Can export as industry-standard PDF. Can share a read-only link. |
| **16** | Polish, bug fixes, Apple Pencil latency tuning, web performance, cross-platform UI consistency audit, onboarding flow for new users. | Core workflow works end-to-end on both platforms with no blocking bugs. A new user can get from sign-up to writing in under 2 minutes. |

### Sprint 6 Gate

> If the script editor does not feel as good as a purpose-built comic writing tool by Sprint 6, stop and redesign before proceeding. Everything else in this document builds on that foundation.

### Earliest Testable Moment

End of Sprint 6 — when a writer can open PanelSync on an iPad, write a multi-panel script page using all the comic block types, and have it save correctly. You do not need the Timeline, the Universe Bible, or the drawing canvas to get that signal. The script editor alone, working well, is enough to validate the core premise.

---

## 16. Deferred Features (v2 Roadmap)

### First Wave — immediately after MVP validation

- **Storyboard auto-generation from script** — the parser-to-canvas pipeline. Data model is ready. This is the next highest-leverage feature after the MVP is proven.
- **Real-time collaborative sync (Yjs CRDT)** — replaces last-write-wins. Needed as team usage grows.
- **Universe Bible — Factions, Objects/Artifacts, Lore/Concepts** entry types.
- **The Chalkboard** — freeform notecard canvas for story planning. Keyboard and Apple Pencil card modes.
- **Timeline lenses** — reader knowledge, character knowledge, story order, real-world reference.

### Second Wave — after first wave is stable

- **Relationship Map** — living dynamic diagram of character relationships.
- **Pacing View** — emotional beat curve across an issue or arc.
- **Mood/Tone Board** — visual reference library per series or arc.
- **Continuity Tracker** — automatic detection of knowledge, physical state, and relationship inconsistencies.
- **Drawing tools expansion** — brush, shapes, lasso select, pressure-sensitive eraser.
- **Storyboard PDF export** — full layered export with layer compositor. Series Bible PDF export.

### Third Wave — mature product

- **The Letterer** — hand-lettering font creation from the artist's handwriting.
- **Branch proposals** — artist git-branch workflow for structural page changes.
- **Companion Mode** — phone as synchronized script reader while drawing on tablet.
- Offline mode with sync on reconnect. Android tablet support.
- Version history and named snapshots. Reading mode, Presentation mode, Print layout view.

---

## 17. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Timeline feature becomes the focus at the expense of core writing workflow | **High** | Sprint plan puts script editor (5–6) and Universe Bible (7–8) before Timeline (11–12). Do not reorder. |
| Expo for Web produces a noticeably worse experience than native Next.js | **Medium** | Test web performance in Sprint 1. Fallback: thin Next.js shell that imports Expo components. |
| Apple Pencil latency on React Native Skia is perceptible during drawing | **Medium** | Test in Sprint 9. Early enough to pivot to native Skia module or PencilKit bridge if needed. |
| Shared rich text editor behaves differently on iPad vs web in subtle ways | **Medium** | Treat cross-platform parity as a first-class test requirement from Sprint 5. |
| Data model for timelines becomes too complex as lenses are added in v2 | **Medium** | AssetTimelineTag polymorphic join table and intent tag system designed specifically to accommodate lenses without schema changes. |
| Solo build pace slips and MVP takes too long | **High** | Timebox to 16 sprints. If Sprint 6 script editor does not feel right, stop and reassess before continuing. |

---

## 18. Open Questions

Collected from design sessions. These are decisions that have been deferred pending implementation experience.

- Toggle palette exact shape — radial arc confirmed, but node visual language for on/off state not yet designed
- Palette handle exact default position and behavior when orientation changes
- Arc label font — confirmed Lora Italic as an option but default not fully locked
- Issue bracket label position in horizontal — top of bracket, or alongside?
- Overlap rendering for 3+ ranges — placeholder solution, needs proper design
- Cluster label behavior for manual clusters when zoomed past — fade confirmed, but anchor point during fade not specified
- Whether fictional time minimum unit is always the named base unit or can be subdivided
- Hard start pin — locked in as a feature but UI not designed
- Play mode visual design — how events animate in, what the blank timeline looks like before playback
- Dark mode for timeline — deferred until light mode horizontal is finalized
- Vertical orientation visual design — deferred until horizontal is complete

### Future Considerations

- Multi-tag diamond: gradient blend of all tag colors across the diamond shape
- Keep handwriting display mode — v3/v4, events display the user's actual handwriting instead of recognized text
- Swimlane superimposed timelines — data model designed for this from day one
- Arc-to-Earth-time anchoring conversion UI
- Full cartographic zoom transition polish — both units visible during ruler label transition

---

## Appendix A: Visual Mockup File Index

All mockups are included as HTML files alongside this document. Open them in a browser for full interactive inspection.

| File | Description |
|------|-------------|
| `panelsync-home.html` | Home Screen — dark + light modes, normal + long-press states. Three sections: Resume, Recent Activity, Universes shelf. |
| `panelsync-script-editor.html` | Script Editor — dark + light modes, full working mockup with sidebar, script pane, and storyboard preview. |
| `panelsync-mockup.html` | Original App Mockup — sidebar navigation, script writing area, and storyboard canvas in split view. |
| `panelsync-v2.html` | Functional Script Editor v2 — live typing prototype with full keyboard flow (Enter/Tab/Backspace), all block types, pagination. |
| `panelsync-timeline.html` | Timeline — horizontal view with events, ranges, arcs, cluster labels, and navigation controls. |
| `panelsync-tick-explore.html` | Tick/Diamond Style Exploration — event notch variations tested during design (sizes, colors, split states). |
| `panelsync-universe-home.html` | Universe Home — landing page showing series list, recent activity, collaborator presence. Dark + light. |
| `panelsync-nav-system.html` | Navigation System Specification — sidebar destinations, layout descriptions, split view pair documentation. |
| `panelsync-flowchart.html` | Navigation Flowchart — complete model from app launch through every destination, including first-launch onboarding, long-press mechanics, and in-app sidebar routing. |

---

## Appendix B: Script Editor Keyboard Reference

| Key | Action |
|-----|--------|
| **Enter** | Commit current block, create next block (smart defaults based on current type) |
| **Tab** | Cycle block type on empty blocks; promote action to character; character to parenthetical |
| **Double-Tab** | In dialogue: escape to action |
| **Backspace** (empty block) | Delete block, move focus to previous |
| **Shift+Enter** | Newline within description, caption, or dialogue blocks |
| **Cmd/Ctrl+Enter** | Insert new page break / new panel block |
| **Cmd/Ctrl+Shift+F** | Toggle distraction-free mode |
| **Cmd/Ctrl+Shift+N** | Quick-capture note (web) |
| **i+Tab** (in scene) | Expand to INT. |
| **e+Tab** (in scene) | Expand to EXT. |

---

## Appendix C: Timeline Gesture Reference

| Gesture / Key | Action |
|--------------|--------|
| **1-finger hold on spine (~0.5s)** | Activate scrub mode; live time label under finger |
| **Drag up/down past clear zone** | Lock position, direction sets card side; opens creation modal on lift |
| **Lift inside clear zone** | Cancel — no event created |
| **2-finger drag** | Pan timeline left/right |
| **Pinch (2 fingers)** | Standard zoom, 1x rate |
| **Pinch (1 finger + 1 other)** | 1.25x zoom rate |
| **Pinch (1 finger + 2 others)** | 1.5x zoom rate |
| **Pinch (1 finger + 3 others)** | 1.75x zoom rate |
| **4-finger tap** | Toggle minimal view (chrome on/off) |
| **2–3 idle taps on empty canvas** | Surface exit prompt in minimal view |
| **Tap spine between events** (vertical) | Insert new event inline, cursor ready |
| **Cmd ↑/↓** | Jump event to event (vertical keyboard) |
| **Shift+Cmd ↑/↓** | Jump 10 events (vertical keyboard) |
| **Cmd ←/→** | Jump space/time increment (vertical keyboard) |
| **Cmd +/−** | Zoom in/out (vertical keyboard, scaled time on) |
| **Cmd+Enter** | Create/commit new event (vertical keyboard) |

---

*PanelSync CLI Build Handoff Packet — v3.0 — March 2026*

*This document should be treated as a living reference. Update it when scope decisions change.*
