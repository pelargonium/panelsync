# PanelSync — Interaction Inventory

## What This Document Is

This is a **review instrument**, not a spec. It catalogs every discrete behavior in the app, organized by UI region (screen, chrome section, or tool), so that gaps can be identified, decisions can be made, and nothing falls through the cracks between sessions.

It is used in two contexts:
1. **Design review** — walking through a prototype or mockup region by region, comparing what exists against what is specified or assumed
2. **Session orientation** — reading this at the start of a session to quickly understand what is settled, what is open, and what needs attention

It is intentionally less formal than SPEC.md. It can be messy. Rows can be incomplete. That is fine.

## Relationship to Other Documents

| Document | Purpose |
|----------|---------|
| `SPEC.md` | Authoritative product specification. Features, data model, UX rules. |
| `DESIGN.md` | Foundational architecture and design principles. Supersedes assumptions. |
| `CONCEPT.md` | Current build state and the single next step. Session start point. |
| `TASK.md` | Active Codex task brief when a handoff is in progress. |
| `INVENTORY.md` (this file) | Interaction-level register. Review tool. Not authoritative. |

When this document conflicts with SPEC.md or DESIGN.md, trust those. Update this file to match, and note the discrepancy.

## Status Symbols

```
✓  specced     — defined in SPEC.md or DESIGN.md
?  assumed     — implied by the design but never explicitly written down; needs confirmation
!  missing     — identified gap; a decision has not been made
~  deferred    — known, intentionally out of scope for v1
```

## How to Use This in a Session

- Read the relevant sections before working on a feature area
- Add `!` rows as you discover gaps during implementation or review
- Promote `?` rows to `✓` once confirmed, or to `!` if they reveal a real gap
- Do not delete rows — change their status and add a note if something changes
- If a section needs a design decision before implementation can proceed, flag it at the top of that section

---

## 1. Universes Dashboard (`/`)

No binder. No top chrome. Standalone screen.

✓  2-column card grid layout by default
✓  List view available via a view toggle in the dashboard header
✓  "+" button in header always present — triggers Create Universe modal
✓  Tapping a universe card navigates into that universe, resuming at last open item
✓  Long press on universe card → context menu: Open · Universe Settings · Duplicate · Delete
✓  0 universes: full empty state with background prompt text and large centered CTA button
✓  Ghost card (dashed border, no content, "+" icon) appears when fewer than 2 universes exist
✓  Ghost card disappears once 2+ universes exist
✓  Tapping ghost card triggers Create Universe modal
✓  Universe card shows: name (prominent), cover image if set, last edited timestamp (muted)
✓  If no cover image: styled text on plain dark background — no placeholder imagery
✓  Stacked sub-cards visual effect: two smaller cards peek below the main card (decorative)
✓  First-launch peekaboo animation: sub-cards slide 18px down and back, tooltip appears once only
?  What does "resume at last open item" mean if the universe has never been opened? (probably Universe Home)
?  Does list view show the same info as card view, just in a single column?
!  Universe Settings screen — contents not yet designed
!  Duplicate universe — behavior not specified (deep copy? what about collaborators?)
~  Universe cover image upload (UI affordance exists, actual upload deferred until file storage is wired)

---

## 2. Create Universe Modal

Tabbed modal. Persistent footer with Cancel + Create Universe on every tab.

✓  Tab 1 — Basics: universe name (required), cover image (optional), Series label (default "Series"), Issue label (default "Issue")
✓  Tab 2 — Page Setup: default page size (US Comic default), default issue length (22 pages default)
✓  Tab 3 — Timeline: timescale setting — Pure Sequence / Standard Earth Time / Custom
✓  Tab 4 — Collaborators: invite by email, assign role (Editor / Viewer)
✓  Only name is required; all other tabs are optional
✓  On Create: modal dismisses, universe created and opened automatically
✓  Page size and issue length are editable later in Universe Settings without reformatting existing pages
✓  Page size options: US Comic · US Full Bleed · Manga Tankōbon · European BD · Letter · A4 · Custom
?  Does the modal validate that the name is non-empty before allowing Create?
?  Custom page size — does a width/height input pair appear inline when Custom is selected?
?  Tab 4 invite flow — does sending an invite require the universe to be created first, or is it queued?
!  What happens if the user closes the modal mid-tabs without creating? (Cancel always available but behavior on swipe-dismiss unclear)
!  Timeline tab — "Custom" timescale: unit wizard not yet designed
~  Webtoon page size (requires fundamentally different document model, deferred to v2)

---

## 3. Global Chrome — Top Bar (48px, inside universe)

Persistent on every screen inside a universe. Not present on the dashboard.

✓  Left: Undo · Redo icon buttons
✓  Center: save/sync status — small icon + plain-language label
✓  Right: View button · Share button · collaborator avatar circles · account avatar
✓  Save states: editing · saving · saved · syncing · synced · offline · error
✓  Offline and error states escalate icon color (amber / red) — no banner unless critical
✓  Tapping sync indicator → popover with plain-language description of current state
✓  View button opens contextual panel — content changes based on what is currently on screen
✓  View button when binder focused: sort order, tree/column mode
✓  View button when Universe Home open: section visibility and order
✓  View button when editor focused: editor-specific display options
✓  Share button when one editor pane focused: quick export options for that content
✓  Share button when two editors open with no clear focus: modal asks which to export
✓  Collaborator avatars: tapping opens collaboration panel (manage roles, recent activity)
✓  Account avatar: tapping opens account and app-level settings (profile, theme, notifications, keyboard shortcuts, sign out)
✓  Universe-level settings (name, cover, collaborators, delete) live on the dashboard card, NOT here
?  Undo/Redo — is this per-editor (script undo vs Bible field undo) or global?
?  How many collaborator avatars show before overflow (e.g., "+2 more")?
!  Comment panel toggle button — SPEC §11 mentions it lives in chrome right side adjacent to collaborator avatars, but it's not in the chrome layout table. Needs placement decision.
~  Live presence indicators, named cursors (v2)

---

## 4. Binder — General

Persistent sidebar. 264px default width. Present on every screen inside a universe.

✓  Always visible by default
✓  Resizable by dragging the right edge
✓  Collapses fully (slides off screen) — no icon rail in collapsed state
✓  Collapse triggered by: button in binder header OR 4-finger swipe from left edge
✓  When collapsed: content area expands to fill full width
✓  Universe name in binder header (accent color) — tapping navigates to Universe Home
✓  Collapse/expand button at far right of binder header
✓  Search bar pinned below header, above all sections
✓  Search placeholder: "Search universe…"
✓  Search hides on scroll up, reappears on scroll down
✓  Search covers all content within the universe
✓  Sections are accordion-style with section headers
✓  Sections can be reordered within the binder (drag)
✓  Sections can be torn off and docked as standalone columns in the workspace
✓  Long press section header + drag → detaches section from binder
✓  Detached sections snap to fixed column positions (left edge, right edge, between binder and editor)
✓  Drag detached column back onto binder → re-docks it
✓  Layout (section order, detached columns) persists per-universe per-user
✓  Users can create custom sections (name, contents, icon user-defined)
✓  Custom sections behave identically to default sections
✓  Long press any binder item → context menu: Open · Open in Split · Rename · Delete · Select · Pin
✓  "Select" from context menu → enters selection mode, single taps accumulate selection
✓  Selection mode: bulk action toolbar appears at bottom of binder
✓  Selection mode exits via Done button or deselecting all items
?  Does search scope change when a section is active/focused? (e.g., does it search only that section, or always the whole universe?)
?  Can the search bar be dismissed without making a selection, or is it always visible?
!  What bulk actions are available in selection mode? Not yet specified.
!  "Pin" from context menu — where does a pinned item appear? (Presumably Pinned Items on Universe Home, but not confirmed)
!  Binder minimum width when resizing — no lower bound defined
!  What happens to torn-off columns on small screens or portrait orientation?

---

## 5. Binder — Series/Issue/Page Tree (Upper Zone)

The primary navigation structure for publication content. Upper zone of the Series/Issue/Page section.

✓  Expandable hierarchy accordion: Series → Issues → Pages
✓  Series row: chevron (expand/collapse) + series name + status badge
✓  Issue row: chevron (expand/collapse) + issue name + Script icon + Storyboard icon + status badge
✓  Page row: page number/name + Script icon + Storyboard icon
✓  Tap chevron on series row → expands/collapses to show issues (does NOT navigate)
✓  Tap series name → opens Series Map in main content area
✓  Tap chevron on issue row → expands/collapses to show pages
✓  Tap issue name → opens Issue Map in main content area
✓  Tap Script icon on any row → opens script editor in content area
✓  Tap Storyboard icon on any row → opens storyboard canvas in content area
✓  "+" at bottom of each level creates new series / issue / page
✓  Status values: draft · in review · locked · complete
✓  Locked pages show lock icon on the page row
?  Tap page row name (not an icon) — does this open something? Script? Issue Map scrolled to page? Nothing?
?  Does "+" for a new page at the issue level add the page at the end, or inline at a selected position?
?  When a new series/issue/page is created, does it immediately enter rename mode?
?  Does expanding a series auto-collapse others, or can multiple series be expanded simultaneously?
!  Page row — is there a status indicator on individual page rows, or only at the issue/series level?
!  Series Map — contents not fully designed (v1 is read-only overview; v2 adds annotations and drag-to-reorder)
!  Issue Map — same, v1 is read-only thumbnail grid
!  How does the tree behave when there are many series/issues (20+)? Virtualized? Scrollable?
~  Drag-to-reorder pages within an issue (v2)
~  Drag to move a page between issues (v2)

---

## 6. Binder — Pool (Lower Zone)

Below a divider labeled "POOL" within the Series/Issue/Page section. Shows drafts and loose unplaced content.

✓  Two-zone layout: upper = publication structure, lower = pool
✓  Pool contains: drafts, loose pages, unplaced content
✓  Pool sortable by: last modified · name · type
✓  Types in pool can be shown or hidden
✓  "My Drafts" private workspace section visible only to the current user
✓  Drafts show: name + Script icon + last modified timestamp
✓  Assigning draft to publication structure: drag from pool into upper zone
✓  Assigning draft: also available via context menu ("Make this draft [Series X] [Issue Y]")
✓  "New draft" affordance at bottom of pool
?  When a draft is assigned to a container, does it immediately appear in the upper zone tree?
?  Can a draft contain multiple pages, or is one draft = one page?
!  Pool divider — is it a fixed split or does the user control how much vertical space each zone gets?
!  "My Drafts" — does the owner see a collaborator's private drafts in any view? (Spec says no, even owner cannot see)
!  Sorting UI — where does the sort control live? View button? Binder section header?

---

## 7. Binder — Characters, Notes, Timeline Sections

✓  Characters section: filtered view of Bible entries with Character type tag
✓  Characters section: filterable to show only characters relevant to the current series (via series overlays)
✓  Notes section: filtered view of Bible entries with Note type tag
✓  Timeline section: Bible entries with Timeline type; tap opens Timeline editor
✓  All three sections: collapsed by default, expandable
?  Do Characters/Notes/Timeline sections show item counts in their collapsed header?
?  Quick-capture (floating button or Cmd+Shift+N) creates a new Note-type entry immediately — which section does this appear in, and does it auto-expand Notes?
!  Arc Notes section — editable rich text, series-level. Tearable. Not yet detailed beyond that.

---

## 8. Binder — Footer Type-Tag Pills

Always visible at the bottom of the binder, even when sections are scrolled.

✓  Compact row of icon pills: Character · Location · Timeline · Notes
✓  Tapping a pill opens a filtered list of all items in the universe with that tag
✓  Footer is always visible regardless of scroll position
?  Does tapping a footer pill open the filtered list in the content area, or as an overlay within the binder?
?  Are there pills for every type, or only the four default ones? (Custom types not addressed)
!  Filtered list view — layout not yet designed (grid? list? same as Bible overview?)

---

## 9. Universe Home (Content Area at `/universe/:id`)

Default content area view. Accessible by tapping the universe name in the binder header.

✓  Composed of toggleable, reorderable sections (4 default, all on by default)
✓  Section 1 — Series Overview: cards for each series (name, issue count, page count, last edited, status)
✓  Section 2 — Recent Activity: feed of changes (who edited what, when), each item tappable to jump to it
✓  Section 3 — Universe Stats: read-only counters (total pages, characters, locations, timeline events)
✓  Section 4 — Pinned Items: items pinned by the user from binder context menu, any type, tap to open
✓  Customize button enters edit mode: sections draggable to reorder, toggle off with remove control
✓  Section visibility and order also accessible via global View button when Universe Home is open
✓  Settings persist per-universe per-user
✓  First open of new universe: binder open (empty), content area shows Get Started page
✓  Get Started page: shortcut actions (Create a character · Create a timeline · Start writing a script)
✓  Get Started page: "Don't show this again" checkbox — once checked, subsequent opens resume at last item
?  What does Series Overview look like with 0 series? Ghost card? Empty state text?
?  Recent Activity feed — how many items? Is it paginated/loadable?
!  Get Started shortcut actions — where do they navigate or what do they trigger?

---

## 10. Script Editor

Single shared component. Runs identically on iPad and web.

✓  One editor session = all pages of one issue in a single continuously scrolling document
✓  No pagination — scrolls like a word processor
✓  Pages delimited by a full-width "Page N" divider/header between pages
✓  Tapping a page row in the binder scrolls the editor to that page instantly
✓  Opening from a specific page row scrolls to that page on load
✓  Auto-save: debounced 1.5s after last keystroke
✓  Save state reflected in global chrome sync indicator
✓  Distraction-free mode: 4-finger tap toggles. Binder hidden, chrome hidden, editor full width.
✓  Block selector bar remains visible in distraction-free mode
✓  Distraction-free also exits if user swipes from left edge to reveal binder
✓  "Last edited by [Name] · [time]" footer on every script page
✓  Update banner when opening a page edited since last view: "Updated by [Name] · [time ago]"
?  Does the editor open to page 1 by default, or the last page the user was on?
?  In distraction-free, can the user still access the binder via swipe-from-left, or is that gesture disabled?
?  Is there a word count or page count indicator visible in the editor?
!  Outline mode — deferred, but where will the toggle live when it ships?
!  Find/Replace — accessible via "···" overflow in block selector bar. UI not yet designed.
!  What is the maximum zoom level or font size? (Accessibility concern for vision)
~  Outline mode (v2)

---

## 11. Script Editor — Block Types

✓  Panel: auto-numbered, renumbers on delete, optional size tag
✓  Scene Heading: INT./EXT., location, time of day. Keywords: INT. EXT. WIDE CLOSEUP MEDIUM HORIZON BIRD'S EYE WORM'S EYE
✓  Description: action lines, supports bold/italic
✓  Dialogue: character name (with Bible autocomplete) + dialogue text, supports bold/italic
✓  Caption: narration/caption box text, supports bold/italic
✓  SFX: sound effect, rendered large and stylized
✓  Panel numbers are derived at render time by counting panel blocks — never stored
✓  Dialogue character name autocomplete pulls from Bible entries with Character type tag, filtered to current series
✓  Inline structural marks in content: @character, #location create entity connections in dossier_attachments
?  Scene Heading autocomplete — does it autocomplete location names from the Bible?
?  Can a Panel block have any text content, or is it purely a structural marker with a size tag?
?  SFX — is there any formatting control (font, size) or is it always rendered the same way?
!  What does an empty new block look like before the user types? Placeholder text?
!  How does the user insert a block? Enter from previous block (keyboard flow) or explicit insert action?
!  Can blocks be reordered by drag? Not specified.
!  Can a block be cut and pasted to a different page? (DESIGN.md mentions this is supported at the data level)

---

## 12. Script Editor — Block Selector Bar

✓  Not floating — position determined by keyboard state
✓  On-screen keyboard active: bar appears as keyboard accessory (fixed strip above keyboard)
✓  Physical keyboard connected: bar pinned to bottom edge of editor pane
✓  Contents left to right: Panel · Scene · Description · Dialogue · Caption · SFX | Bold · Italic | ···
✓  Tapping a block type converts the current block to that type
✓  Bold and Italic apply to selected text within Description, Dialogue, and Caption only (not Panel or Scene)
✓  "···" overflow contains: Find/Replace, and future editor-specific options
✓  All actions have keyboard shortcuts
?  What keyboard shortcuts map to each block type?
?  Does the bar indicate which block type is currently active (highlighted button)?
?  If no block is selected (cursor between blocks), what state does the bar show?
!  Cmd/Ctrl+B = Bold, Cmd/Ctrl+I = Italic confirmed. Block type shortcuts not yet defined.

---

## 13. Script Editor — Panel Size Tags

✓  Each Panel block carries an optional size tag
✓  Size tag displayed inline to the right of the panel label: e.g., "Panel 1  [½]"
✓  Tapping the tag (or empty space where it would appear) opens a small picker
✓  Size options: Full · ½ · ⅓ · ⅙ · ⅛ · Remainder · (none/clear)
✓  Default: no tag. Untagged panels share remaining space equally.
✓  Storyboard canvas panel grid overlay regenerates whenever tags are added, changed, or removed
✓  Horizontal panel arrangement is NOT encoded in size tags in v1 — vertical sizing only
?  Can the user clear a size tag after setting one? ("None" option in the picker)
?  Does the picker show a visual preview of how the page would look with each size?
!  "Remainder" tag behavior when multiple panels have Remainder — do they split the remaining space equally?
!  What happens if the size tags on a page add up to more than 100%? (e.g., two Full panels)

---

## 14. Script Editor — Keyboard Flow

✓  Panel → Enter → Scene Heading
✓  Scene Heading → Enter → Description
✓  Scene Heading → Tab → Panel
✓  Description → Enter → Description (new line as new block)
✓  Description → Tab → Character name (Dialogue)
✓  Character name → Enter → Dialogue text
✓  Character name → Enter (if empty) → new Panel + Scene Heading
✓  Dialogue text → Enter → new Dialogue (same speaker implied? or blank character name?)
✓  Dialogue text → Tab → new Character name (Double-Tab → escape to Description)
✓  Caption → Enter → Description
✓  SFX → Enter → Description
✓  Backspace on empty block → deletes block, focus moves to previous block
✓  Shift+Enter → newline within Description, Caption, or Dialogue (not a new block)
✓  Cmd/Ctrl+B → Bold, Cmd/Ctrl+I → Italic
?  Dialogue → Tab → new character name: is the previous speaker's name pre-filled, or blank?
?  Panel → Tab → what happens? Not specified.
!  SFX → Tab → not specified

---

## 15. Script Editor — Comments

✓  Small dot on left edge of any script block with unresolved comment thread
✓  Amber dot = unresolved; grey dot = all resolved
✓  Tapping the dot opens sidebar comment panel scrolled to that block's thread
✓  Comment sidebar: slides in from right edge of editor pane, ~40% width overlay
✓  Sidebar shows all threads for the current page, grouped by block, in reading order
✓  Each thread: avatar + name + comment text + timestamp + reply input + Resolve button
✓  Resolved threads collapsed; "Show resolved" toggle expands them
✓  New thread: tap a script block → inline "+ Comment" affordance appears → opens thread in sidebar
✓  Comment panel toggled via button in global chrome (right side, adjacent to collaborator avatars)
?  Does tapping the dot always open the sidebar, or does it first show a preview popover?
?  Can you reply to a resolved thread, and does replying re-open it?
!  "+ Comment" inline affordance — does it appear on hover (web) or always on tap (iPad)?
!  Comment panel and the right-side tools (split view etc.) — do they compete for the same space?

---

## 16. Storyboard Canvas

iPad-only for drawing in v1. Web gets read-only preview.

✓  One page at a time — not continuous scroll
✓  Page strip at bottom: thumbnails of all pages in the issue
✓  Tap a thumbnail → jump to that page
✓  4-finger swipe (any direction) → next or previous page
✓  Panel grid overlay: auto-generated from Panel block size tags in the script for this page
✓  Panel grid overlay: visual reference only, does not constrain drawing
✓  Panel grid overlay: toggled on/off via drawing toolbar
✓  Panel grid overlay: updates live when size tags change in the script
✓  Panel grid overlay: vertical sizing only (horizontal layout drawn freehand)
✓  Auto-save: every 30 seconds while canvas is open, and on navigation away
✓  Script Reference Panel: slides in from right as half-width overlay, canvas dims behind it
✓  Script Reference Panel: shows full script text for current page, read-only and scrollable
✓  Script Reference Panel: toggled via button on drawing toolbar
✓  When script editor open in standard mode: storyboard appears as 40% preview pane (read-only render)
✓  Tapping storyboard preview pane opens full storyboard canvas
✓  Web v1: read-only rendered preview, drawing not available
?  Page strip thumbnails — are they rendered storyboard art, or placeholder tiles with status?
?  In the preview pane (40% mode), can the user scroll the storyboard independently?
!  Storyboard page creation — is a storyboard page auto-created when a script page is created, or created on first open?

---

## 17. Storyboard Canvas — Drawing Toolbar

iPad only. Default position: left edge.

✓  Snaps to the edges of the canvas pane (not freely floating)
✓  Auto-hides 3 seconds after last drawing stroke
✓  Reappears on any tap that is not a drawing stroke
✓  Tools: Pencil · Eraser
✓  Stroke weight slider
✓  Colors: Black · Dark grey · Red
✓  Actions: Undo · Script reference panel toggle · Grid overlay toggle · Reference image import
✓  2-finger tap = Undo (gesture, independent of toolbar)
✓  Redo available via toolbar button only (no gesture)
?  Can the user reposition the toolbar to other edges (right, top, bottom)?
!  No Redo gesture — is this intentional? Confirm.
~  Additional colors beyond Black / Dark grey / Red (v2)

---

## 18. Storyboard Canvas — Gestures

✓  Pencil / finger stroke → draw
✓  2-finger tap → undo
✓  2-finger drag → pan canvas
✓  Pinch → free zoom
✓  3-finger tap on a panel → snap-zoom: panel fills screen
✓  3-finger tap (when zoomed) → snap back to full page
✓  3-finger swipe (when zoomed) → jump to next panel in swipe direction
✓  4-finger swipe → next / previous page
?  Is there a zoom limit (max zoom level)?
?  3-finger swipe direction — left/right only, or all four directions?
!  Conflict between 3-finger swipe (jump panel) and 4-finger swipe (next page) — need to confirm gesture recognition priority

---

## 19. Storyboard Canvas — Reference Image

✓  Import from photo library or files
✓  Set opacity via slider, then sketch over the image
✓  Image is non-destructive — separate layer below drawing layer
✓  Reference image is not exported as part of the storyboard
?  Can there be multiple reference images per page, or only one?
?  Can the reference image be repositioned or scaled after import?
!  Reference layer visibility — is there a toggle to show/hide it separate from the opacity slider?

---

## 20. Universe Bible — Overview (`/universe/:id/bible`)

✓  Accessed by tapping universe name in binder header OR navigating to /universe/[id]/bible
✓  Grid of cards, default grouping by type (Characters · Locations · Notes · Timelines)
✓  Within each group: sorted by most recently modified
✓  Each card: name, type-tag color swatch, one-line snippet, portrait/cover image if exists
✓  Search bar pinned to top — spotlight-style, filters as you type
✓  Text search: matches name, field values, rich text body
✓  Filter: typing "Issue 3" or "Series 2" filters to entries associated with that container
✓  Filter by type: type "Character" or tap type chip in results
✓  "+" button in Bible header opens type picker: Character · Location · Note · Timeline
✓  Multiple types can be selected at creation (non-exclusive)
✓  After confirming type(s): navigates directly to detail page, name field focused, entry created immediately with empty name
✓  View modes (controlled by global View button): By type · By recently modified · By series · By issue
?  Does the Bible search update the binder sections simultaneously, or is it scoped to the Bible content area?
?  "By issue" view — does this require selecting a specific issue first?
!  Bible overview card grid — how many columns? Does it reflow?
!  Empty state for 0 entries — not specified
~  Object, Vehicle, Faction, Lore type tags (v2)

---

## 21. Universe Bible — Entry Detail

✓  All entry types share the same structure — single scrolling page
✓  Header: name (large, editable inline), color swatch (tap to change), type tag chips (editable)
✓  Images & Sketches: horizontal scroll strip, import from photo library or files, draw in-app (Skia, iPad only)
✓  Drawing tools in entry: Pencil · Eraser · weight slider · Black / Dark grey / Red · 2-finger tap = undo
✓  Web: images viewable; drawing not available v1
✓  Multiple images/sketches can be added
✓  Default fields: labeled rows, tap to edit inline, empty fields show "Add a value" placeholder
✓  Default fields determined by type tags
✓  Character default fields: Name · Role · Birthday · Gender · Sex · Species · Sexual Orientation · Birthplace · Blood Type · Height · Appearance · Backstory
✓  Location default fields: Name · Description · Time Period
✓  Note default fields: Title only — body is freeform rich text (primary content area)
✓  Custom fields: "+" at bottom of fields section, text label input, suggestions from universe field registry
✓  Universe field registry: all custom field labels ever used in this universe, as suggestions on any entry
✓  Custom fields text-only in v1
✓  Rich text notes section below all fields: bold · italic · headings · bullet lists · inline code
✓  Series overlays: collapsible "Series Notes" section at bottom
✓  Series Notes: list of series, each with expandable text area for per-series notes
✓  Series overlay notes are additive — do not overwrite universe-level field values
✓  Auto-save: debounced 1.5s after last field edit or keystroke
?  Can the user reorder default fields, or only custom fields?
?  Can the user remove a default field from the display (not delete, just hide)?
?  Series Notes section — does it show all series, or only series the entry has been associated with?
!  Color swatch picker — what color options are available? Full color picker or preset palette?
!  Type tag chips — can the user remove the last type tag, leaving the entry untyped?
~  Typed custom fields (date, number, boolean) — v2
~  Object/Faction/etc. default field sets — v2

---

## 22. Dossier System

DESIGN.md defines the dossier system. This is the living creative context attached to every entity.

✓  Every entity has a dossier
✓  Some entities: dossier IS the primary interface (Character, Location, Timeline Event, Range, Note)
✓  Some entities: dossier is ATTACHED as supplementary context (Page, Script Block, Container, Universe)
✓  Dossier can contain: text, images, drawings, sketches, script references, timeline pins, entity links, any data view
✓  Single tap on entity → navigate to entity, resume at last state
✓  Double tap → cycle depth states: entity only → entity + dossier split → dossier only → back
✓  State persistence: every entity remembers its last depth state
✓  Multiple entities can be active simultaneously (workspace model, not navigation stack)
✓  Dossier layout options: vertical scroll (v1) · horizontal scroll (v1) · freeform canvas (v2)
✓  Layout preference stored in dossier_canvas_state, created lazily on first open
!  Double tap cycle — does this work via gestures on iPad, or is there a button?
!  "Multiple warm contexts" — how does the user see/switch between open entities? Tab bar? History? Not yet designed.
!  Dossier attachment creation UI — how does a user add a timeline pin or entity link to a dossier? Not yet designed.
~  Freeform canvas dossier layout (v2)

---

## 23. Timeline Tool

✓  Horizontal, scrollable timeline
✓  Single horizontal spine across center
✓  Events: diamond notch on spine, thin vertical connector, card above or below (alternating)
✓  Event card: title + date label (compact) or title + date + description (expanded)
✓  Ranges: named colored bar along spine between two events, labeled above
✓  Ranges can overlap (alternating above/below spine)
✓  Cluster labels: navigational annotations, cartographic behavior (prominent zoomed out, fades zoomed in)
✓  Arc: story arc spanning multiple events, parabola or bracket, slightly transparent
✓  Issue brackets: optional dotted black brackets labeled "Issue 1" etc. in Geist Mono
✓  Timescale options: Pure Sequence · Standard Earth Time · Custom
✓  Multiple timelines per universe — no single authoritative timeline
✓  Selected event card: amber left bar, amber border
✓  Tap spine between events → inline event creation
✓  1-finger hold on spine → scrub mode
✓  2-finger drag → pan, Pinch → zoom
✓  4-finger tap → toggle minimal view (chrome off)
✓  Timeline events are entities with their own dossiers
✓  Ranges are entities with their own dossiers
✓  Timeline pin: a selected group of events or a range can be pinned as a living reference into any entity's dossier
✓  Timeline pin is a query descriptor, not a snapshot — updates if events change
?  How does the user create a new Range? Select two events, then action?
?  Event creation from spine tap — does a card appear inline or does a modal open?
?  How does the user switch between multiple timelines?
!  Zoom controls UI — +/- buttons, or gesture only?
!  Cluster labels — when and how does the user create them? Auto-generated or manual?
!  Arc entity — how is it created? Not specified.
~  Custom timescale unit wizard
~  Character arc timelines (character-specific)
~  Location timelines

---

## 24. Collaboration Panel

Accessed by tapping collaborator avatars in global chrome.

✓  List of all collaborators: name, role, access scope
✓  Invite button: enter email, assign role and scope, sends invite email
✓  Roles: Owner · Editor · Viewer
✓  Access scopes: Universe-wide · Series-level · Bible-only
✓  Recent activity feed: who did what, when, tappable to navigate to the item
✓  Page status flow: draft → in review → locked → complete
✓  Any Editor or Owner can move pages between draft / in review / complete
✓  Only Owner can lock or unlock a page
✓  Locked pages: lock icon on binder row, subtle banner in editor, cannot be edited by anyone while locked
✓  Private workspace: "My Drafts" in binder, visible only to that user, owner cannot see
✓  Private content not visible in search, Bible overview, recent activity, or any collaborator view
✓  Publish action: moves item from private workspace into universe (long-press context menu or button in detail view)
✓  Unpublish available as long as no other collaborator has edited the item
✓  Share links: read-only, no account required, scoped to universe/series/issue/page/Bible
✓  Share link options: password-protect, set expiry date
✓  Private workspace content never included in share links
?  Can an Editor invite others? (Spec says no — only Owner can invite. Confirm.)
?  What does the activity feed look like for a Viewer (read-only) — do they see all activity?
!  What does a Viewer see when they open a locked page in the editor? Read-only view? Same as normal but no edits?
!  Share link generation UI — where exactly in the Share button flow does this live vs. export?
~  Yjs CRDT real-time sync (v2)
~  Live presence, named cursors (v2)
~  Commenter role (v2)
~  Granular per-role permission matrix (v2)
~  Activity diff view (v2)

---

## 25. Export Modal

✓  Triggered from Share button in global chrome OR long-press context menu on any binder item
✓  Step 1: choose scope — entire issue or single page (pre-selected if a page is open)
✓  Step 2: choose format — Script PDF · Script Text · Storyboard PDF
✓  Script PDF style: PanelSync style or Final Draft style
✓  Script PDF: one script page per PDF page, header on each page (universe, series, issue, page number)
✓  Script PDF: respects custom Series/Issue label names
✓  Final Draft style: courier font, panel descriptions left-aligned, dialogue centered, character names all-caps
✓  PanelSync style: PanelSync body font, blocks visually distinct by type
✓  Script Text: plain text, no styling
✓  Storyboard PDF: one storyboard page per PDF page, 1:1, 300dpi, uncompressed
✓  Storyboard PDF: panel grid overlay included, all sketch content at full fidelity
✓  Storyboard PDF: matches universe configured page size
✓  Export runs as background job, notification when file is ready
✓  Only one format per export (combined script+storyboard PDF deferred to v2)
?  Where does the export notification appear? System notification? In-app banner?
?  Where is the exported file saved — device files, share sheet, or both?
!  Export from long-press binder item — does the scope auto-set based on what was long-pressed?
~  Combined script + storyboard PDF (v2)
~  Share Center: full export studio with search, filter, reorder, bulk export (v2)

---

## 26. Split View

✓  Main content area can show one or two editor panes side by side
✓  Each editor has its own discrete floating toolbar
✓  Floating toolbar default position: top-center of its pane
✓  Reposition toolbar: long press + drag, snaps to four edges of its pane (not freely floating)
✓  Active pane indicated by subtle highlight border
✓  Clicking into a pane makes it active
✓  Global actions (undo/redo, share) target the active pane
✓  Common split pairs: Script + Storyboard · Script + Characters · Timeline + Script · Characters + Sketch · Locations + Sketch · Timeline + Characters
?  How does the user initiate split view? "Open in Split" from long-press context menu seems implied.
?  Can the user resize the split (adjust the divider between panes)?
?  Can split view show three panes, or maximum two?
!  When share is triggered with two panes open and no clear focus — modal asks which to export. What does that modal look like?
!  Can both panes show the same editor type? (e.g., two script editors for different issues)
~  More than 2 panes (v2)

---

## 27. Accessibility (Cross-Cutting)

✓  All interactive elements keyboard focusable with visible focus rings (accent color outline)
✓  Binder tree: role="tree" / role="treeitem" for hierarchy
✓  Script blocks: each block has aria-label describing block type
✓  Color is never the only status indicator — paired with text labels
✓  Modal dialogs: focus trap, Escape to close, aria-modal="true"
✓  Icon buttons: always include aria-label
✓  All text meets WCAG AA contrast minimum against its background
?  Does the script editor support screen reader navigation block-by-block?
?  Is the binder keyboard-navigable with arrow keys (tree keyboard pattern)?
!  Drag interactions (toolbar reposition, binder resize, section tear-off) — no keyboard alternative specified
!  Gesture-only actions (4-finger tap, 3-finger swipe) — no alternative specified for users who cannot perform multi-finger gestures
!  Font size / text zoom — no mechanism specified for users who need larger text in the editor
