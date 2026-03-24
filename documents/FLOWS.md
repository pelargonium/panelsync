# PanelSync — Interaction Blueprint

## How to Read This Document

This is a screen-by-screen, element-by-element record of every interaction in the app.
It is the primary reference for implementation. When Codex builds a screen, this is the brief.

**Format:**
- Each section is a screen, content area, modal, or panel
- Elements are listed in rough top-to-bottom / layout order
- Interactions are listed under each element
- Navigation outcomes use →
- `[OPEN]` = decision not yet made — must be resolved before building this element
- `[?]` = behavior implied or assumed but not explicitly confirmed — confirm before building
- No marker = defined in SPEC.md or DESIGN.md

**Relationship to other documents:**
- `SPEC.md` — authoritative feature descriptions. If this file and SPEC.md conflict, flag it.
- `DESIGN.md` — foundational principles. Supersedes both.
- `INVENTORY.md` — behavior register with gap tracking. Companion to this file.
- `CONCEPT.md` — current build state and next step. Session start point.

---

## SCREENS IN THIS DOCUMENT

1. Universes Dashboard
2. Create Universe Modal
3. Universe Workspace Shell (persistent — wraps all screens below)
4. Universe Home
5. Series Map
6. Issue Map
7. Script Editor
8. Storyboard Canvas
9. Universe Bible Overview
10. Bible Entry Detail
11. Timeline Tool
12. Collaboration Panel (overlay)
13. Comment Sidebar (overlay)
14. Export Modal
15. Account Settings
16. Split View (modifier, not a screen)

---
---

## 1. SCREEN: Universes Dashboard

**Route:** `/`
**Chrome:** None. No binder, no top bar. Standalone screen.

---

### HEADER

**"PanelSync" wordmark**
- Left aligned
- Not interactive

**[+] button**
- Right aligned
- Tap → open Create Universe Modal

**View toggle**
- Right of header, left of [+]
- Toggles between grid view and list view
- Default: grid view
- State persists across sessions [?]

---

### UNIVERSE GRID / LIST

**Universe Card** *(one per universe)*
- Grid view: 2-column
- List view: single column, more compact [OPEN: list view card contents not fully defined]
- Shows: universe name (large), last edited timestamp (muted)
- If cover image set: image as card background with dark overlay
- If no cover image: styled name on plain dark background — no placeholder imagery
- Visual: two smaller cards peek 12px below the main card (decorative stack, always shown)

- Tap → navigate to `/universe/:id`, resume at last open item
  - If never opened before: open Universe Home with Get Started page
- Long press → context menu:
  - "Open" → same as tap
  - "Universe Settings" → [OPEN: screen not yet designed]
  - "Duplicate" → [OPEN: behavior not defined — deep copy? what about collaborators?]
  - "Delete" → confirm dialog ("Delete [name]? This cannot be undone.") → on confirm: delete universe, remove card

**Ghost Card** *(shown only when fewer than 2 universes exist)*
- Dashed border, no content, centered [+] icon
- Tap → open Create Universe Modal
- Disappears once 2+ universes exist

**Empty State** *(shown when 0 universes exist)*
- No grid shown
- Background prompt text: "Create your first universe"
- Large centered CTA button: "New Universe"
- CTA tap → open Create Universe Modal

---

### FIRST LAUNCH ONLY

- Peekaboo animation plays once: sub-cards slide 18px down and back, tooltip appears
- Never plays again after first view

---
---

## 2. MODAL: Create Universe

**Trigger:** [+] button on dashboard, Ghost Card tap, empty state CTA
**Type:** Tabbed modal, full-screen on iPad [?]

---

### PERSISTENT FOOTER (all tabs)

**"Cancel" button**
- Ghost style
- Tap → dismiss modal, no changes saved, return to dashboard

**"Create Universe" button**
- Accent style
- Disabled until Universe Name field has at least one character
- Tap → create universe, dismiss modal, navigate to `/universe/:id` (new universe)

---

### TAB 1: Basics

**Universe Name** *(required)*
- Text input, focused on modal open
- Placeholder: "Universe name"
- Empty → Create Universe button remains disabled

**Cover Image**
- Upload affordance (button or tap area)
- [OPEN: upload behavior — photo library, files, or both?]
- Image preview shown once selected, with option to remove
- Optional — no image is a valid state

**Series Label**
- Text input
- Default value: "Series"
- Hint: "What do you call a collection of issues?"
- Used throughout the universe in place of "Series"

**Issue Label**
- Text input
- Default value: "Issue"
- Hint: "What do you call a single installment?"
- Used throughout the universe in place of "Issue"

---

### TAB 2: Page Setup

**Default Page Size**
- Radio group
- Options: US Comic · US Full Bleed · Manga Tankōbon · European BD · Letter · A4 · Custom
- Default: US Comic
- Selecting "Custom" reveals two number inputs: Width and Height, with unit selector (inches / mm) [?]
- Controls storyboard canvas aspect ratio and PDF export page dimensions

**Default Issue Length**
- Number input
- Default: 22
- Label: "Pages per issue (default)"
- Pages are always manually addable/removable — this is only the pre-populate count

---

### TAB 3: Timeline

**Timescale**
- Radio group or segmented control
- Options:
  - "Pure Sequence" — no time unit, ordered moments only
  - "Standard Earth Time" — real calendar, seconds to millennia
  - "Custom" — user-defined unit chain
- Selecting "Custom" → [OPEN: unit wizard not yet designed]

---

### TAB 4: Collaborators

**Invite field**
- Email input
- [+] or "Invite" button to the right
- Tap Invite → adds email to pending list below

**Role selector**
- Appears alongside each pending invite
- Options: Editor · Viewer
- [?] Does scope (Universe-wide / Series-level / Bible-only) also appear here, or is that set after creation?

**Pending invites list**
- Shows emails that will be invited on Create
- Each row: email address, role, [×] to remove

---
---

## 3. SHELL: Universe Workspace

**Routes:** All `/universe/:id/*` routes
**Description:** Persistent wrapper present on every screen inside a universe. Contains the top chrome and binder. The content area changes; the shell does not.

---

### TOP CHROME BAR

**Height:** 48px, full width, always visible

**Undo button** *(left)*
- Icon button
- Tap → undo last action in the active editor pane
- Disabled when nothing to undo
- [OPEN: is undo scoped per-editor (script undo vs Bible field undo) or global?]

**Redo button** *(left, next to Undo)*
- Icon button
- Tap → redo in active editor pane
- Disabled when nothing to redo

**Save / Sync Status** *(center)*
- Small icon + short text label
- States and their labels:
  - editing → "Editing…"
  - saving → "Saving…"
  - saved → "All changes saved"
  - syncing → "Syncing…"
  - synced → "Synced"
  - offline → "Offline" (amber icon)
  - error → "Save failed" (red icon)
- Tap → popover with plain-language description of current state
  - e.g., "Offline — changes will sync when reconnected"
  - e.g., "All changes saved · Last saved 2 minutes ago"

**View button** *(right)*
- Label: "View" with icon
- Tap → opens View Panel (contextual — contents change based on what is on screen)
  - Binder focused: sort order, tree/column mode
  - Universe Home open: section visibility and order
  - Script editor focused: script editor display options [OPEN: what options?]
  - Bible open: view mode (by type / by recently modified / by series / by issue)
  - Timeline open: [OPEN: what options?]
  - Storyboard open: [OPEN: what options?]

**Share button** *(right)*
- Tap when one editor pane is focused → open Export Modal with that content pre-selected
- Tap when two panes open, no clear focus → dialog: "Which content would you like to export?" with the two open items as options → on selection: open Export Modal
- Tap when no editor open (e.g., Universe Home) → [OPEN: what does Share do here?]

**Comment Panel toggle** *(right)*
- Icon button
- Tap → toggle Comment Sidebar open/closed
- Badge shows unresolved comment count when sidebar is closed [?]
- [OPEN: exact position in chrome not yet finalized — to the left of collaborator avatars]

**Collaborator avatars** *(right)*
- Shows avatars of all users with access to the universe
- [OPEN: how many before overflow? e.g. show 3 then "+2"]
- Tap → open Collaboration Panel

**Account avatar** *(rightmost)*
- Shows current user's avatar or initials
- Tap → open Account Settings screen

---

### BINDER

**Default width:** 264px
**Behavior:** Always visible by default. Can be resized by dragging the right edge.

#### Binder Header

**Universe name**
- Accent color text
- Tap → navigate to Universe Home (content area updates, binder and chrome stay)

**Collapse button**
- Icon: chevron-left
- Position: far right of binder header
- Tap → binder slides off screen, content area expands to fill full width
- When collapsed: a small tab or edge handle appears at the left edge of the screen
  - Tap or swipe-right from left edge → binder slides back in [OPEN: exact collapsed affordance not specified]

**4-finger swipe from left edge**
- Anywhere inside a universe: toggles binder collapsed/expanded

#### Binder Search Bar

- Pinned below header, above all sections
- Always visible (does not scroll with sections)
- Placeholder: "Search universe…"
- Typing → filters all content in the universe, results shown inline [OPEN: results shown inside binder as a list? or opens a search results view in content area?]
- Search bar hides on scroll up, reappears on scroll down [?]
- Clear [×] button appears when text is present

#### Binder Sections (general behavior)

- Each section has a header row with a label and expand/collapse chevron
- Tap section header → expand or collapse that section
- Sections are independently expandable (multiple can be open simultaneously) [?]
- Long press section header + drag → detaches section from binder into a standalone column
- Detached columns snap to fixed positions: left edge, right edge, between binder and editor
- Dragging a detached column back onto the binder → re-docks it
- Section order is draggable (drag handle on section header) [OPEN: drag handle always visible, or only in an "edit binder" mode?]
- Users can create custom sections: [OPEN: how is this triggered? A "+ Add Section" button at the bottom of the binder?]
- Custom sections: name, contents, icon — all user-defined

**Long press any binder item** → context menu:
- "Open" → opens item in content area
- "Open in Split" → opens item in a second pane (split view)
- "Rename" → inline rename (item label becomes editable text field)
- "Delete" → confirm dialog → delete
- "Select" → enter selection mode (described below)
- "Pin" → pins item to Pinned Items on Universe Home [?]

**Selection mode:**
- Single taps accumulate selection (checkboxes appear on rows)
- Bulk action toolbar appears at bottom of binder
- [OPEN: what bulk actions are available? Delete, Move, Export, Change Status?]
- Exit: tap "Done" button or deselect all items

#### Binder Section: SERIES / ISSUE / PAGE

Two zones separated by a divider.

**Upper Zone — Publication Structure**

Hierarchy tree:

```
▶ Series Name                          [status badge]
    ▶ Issue Name              [✏] [🎨]  [status badge]
        Page 1                [✏] [🎨]
        Page 2                [✏] [🎨]
```

**Series row:**
- Chevron (▶/▼): tap → expand/collapse to show issues (inline, no navigation)
- Series name: tap → open Series Map in content area
- Status badge: read-only, reflects aggregate status of issues beneath it
- Long press → context menu (standard + "Add Issue")

**Issue row (collapsed):**
- Chevron (▶/▼): tap → expand/collapse to show pages
- Issue name: tap → open Issue Map in content area
- [✏] Script icon: tap → open Script Editor in content area, scrolled to page 1
- [🎨] Storyboard icon: tap → open Storyboard Canvas in content area, first page
- Status badge: read-only, reflects aggregate of pages beneath it
- Long press → context menu (standard + "Add Page")

**Page row:**
- Page label (e.g., "Page 1" or user-set name): tap → [OPEN: what does tapping the page name do? Options: open Script Editor, open Issue Map scrolled to that page, nothing]
- [✏] Script icon: tap → open Script Editor, scrolled to this page
- [🎨] Storyboard icon: tap → open Storyboard Canvas on this page
- No status badge on individual page rows [?]
- Lock icon shown on row when page status is "locked"
- Long press → context menu (standard + "Add Page After", "Duplicate Page")

**"+" affordances:**
- [+] at bottom of series list → create new series
  - [OPEN: inline creation in binder, or modal?]
- [+] at bottom of each issue's page list → create new page at end
- [OPEN: How does the user create a new issue? Presumably long-press on a series row → "Add Issue"]

**Lower Zone — Pool**

Divider label: "POOL"

**Draft row:**
- Shows: draft name, [✏] Script icon, last modified timestamp
- Tap draft name → [OPEN: open the draft's script in content area? or is this same as Script icon?]
- [✏] Script icon: tap → open draft's script in content area
- Long press → context menu: standard + "Assign to Issue…" (opens picker to choose container)

**"+ New draft" row:**
- Tap → create new draft with default name, open it in content area immediately [?]

**Pool sort control:**
- [OPEN: where does the sort control live? Options: View button, small control in the pool zone header]
- Sort options: last modified · name · type

**My Drafts (Private Workspace):**
- Collapsible subsection within Pool, visible only to current user
- Label: "My Drafts"
- Contains private drafts not visible to any other collaborator, including Owner
- Tap [✏] → open private draft in content area
- Long press → context menu: standard + "Publish" (moves to shared universe)

#### Binder Section: CHARACTERS

- Collapsed by default
- When expanded: list of all universe characters with Character type tag
- Each row: colored dot + character name
- Can be filtered to show only characters relevant to current series [OPEN: filter control location not specified — View button? Section header toggle?]
- Tap character name → open Bible Entry Detail for that character in content area
- Long press → standard context menu

#### Binder Section: NOTES

- Collapsed by default
- When expanded: list of Note-type Bible entries
- Each row: note title
- Tap note title → open Bible Entry Detail (note editor) in content area
- Long press → standard context menu

**Quick-capture:**
- Floating button on iPad [OPEN: position not specified — bottom corner of screen?]
- Cmd/Ctrl+Shift+N on web
- Tap → create new Note-type entry, open it immediately in content area, name field focused

#### Binder Section: TIMELINE

- Collapsed by default
- When expanded: list of Timeline-type entries by name
- Tap entry → open Timeline Tool for that timeline in content area
- Long press → standard context menu

#### Binder Footer — Type-Tag Pills

- Always visible at bottom of binder, does not scroll
- Pills: 👤 Characters · 📍 Locations · 📅 Timeline · 📝 Notes
- Tap a pill → [OPEN: opens filtered list in content area, or as overlay within binder?]

---
---

## 4. CONTENT: Universe Home

**Route:** `/universe/:id`
**Access:** Tap universe name in binder header, or navigate to route directly

---

### GET STARTED PAGE *(new universe, first open only)*

- Shown instead of normal Universe Home on first open of a newly created universe
- Three shortcut actions: "Create a character" · "Create a timeline" · "Start writing a script"
  - "Create a character" → open Bible Entry Detail with Character type pre-selected
  - "Create a timeline" → open Timeline Tool with new timeline
  - "Start writing a script" → [OPEN: what does this do with no series/issue yet? Create one automatically?]
- "Don't show this again" checkbox at bottom
  - When checked and dismissed: subsequent opens show normal Universe Home

---

### UNIVERSE HOME SECTIONS

All four sections on by default. Toggleable and reorderable.

**[Customize] button:**
- Tap → enter edit mode
- In edit mode: drag handles appear on sections, remove [×] controls appear
- Drag to reorder, [×] to toggle off
- Exit: "Done" button

**Section: Series Overview**
- Cards for each series (using custom Series label if set)
- Each card: series name, issue count, page count, last edited, status badge
- Tap card → open Series Map in content area
- [OPEN: empty state if 0 series — ghost card? prompt text?]

**Section: Recent Activity**
- Feed of changes across the universe
- Each item: "[Name] edited [Page X] · [Issue Y] · [time ago]"
- Tap item → navigate to that item in content area
- [OPEN: how many items shown? Is there a "show more" / pagination?]

**Section: Universe Stats**
- Read-only counters: total pages · characters · locations · timeline events
- Not interactive

**Section: Pinned Items**
- Items pinned via long-press context menu from anywhere in the binder
- Any type: character, page, note, etc.
- Each row: type icon + item name
- Tap → open that item in content area
- [OPEN: how does the user unpin? Long press → "Unpin"?]

---
---

## 5. CONTENT: Series Map

**Route:** `/universe/:id` (content area only — no dedicated route yet) [OPEN: needs a route]
**Access:** Tap series name in binder, or tap series card on Universe Home

---

- Read-only overview in v1
- Grid of issue cards for the selected series
- Each card: issue number, title, page count, status badge
- Tap card → open Issue Map in content area
- [OPEN: "Add Issue" affordance — button in this view, or only from binder?]
- [OPEN: empty state if 0 issues]
- v2: annotations, arc overlays, drag-to-reorder

---
---

## 6. CONTENT: Issue Map

**Route:** `/universe/:id` (content area only) [OPEN: needs a route]
**Access:** Tap issue name in binder, or tap issue card in Series Map

---

- Read-only overview in v1
- Grid of page tiles for the selected issue
- Each tile: page number, status dot, storyboard thumbnail (or blank if no storyboard)
- Tap tile → [OPEN: opens Script Editor for that page? Storyboard? A picker?]
- [OPEN: "Add Page" affordance in this view?]
- [OPEN: empty state if 0 pages]
- v2: pacing view, drag-to-reorder

---
---

## 7. CONTENT: Script Editor

**Route:** `/universe/:id/issue/:iid/script` [OPEN: confirm route shape]
**Access:** [✏] Script icon on any issue or page row in binder
**Scroll target:** Opening from an issue row → scroll to page 1. Opening from a page row → scroll to that page.

---

### DOCUMENT AREA

- Continuously scrolling document — all pages of an issue in one scroll
- No pagination

**Page Divider** *(between pages)*
- Full-width divider bar with label: "── Page N ──"
- Not interactive
- [OPEN: is the page number in the divider interactive? e.g., tap to open a "go to page" picker?]

**"Last edited by [Name] · [time]" footer**
- Appears below each page's last block, above the next page divider
- Not interactive

**Update Banner** *(conditional)*
- Shown at top of page when it has been edited since the user last viewed it
- Text: "Updated by [Name] · [time ago]"
- Tap to dismiss

**Locked Page Banner** *(conditional)*
- Shown when page status is "locked"
- Text: "This page is locked"
- Not dismissible while page remains locked
- Editor is read-only in this state

---

### SCRIPT BLOCKS

Each block is a discrete row in the document.

**Panel block:**
- Left: "PANEL N" label (auto-numbered, renumbers on delete)
- Right: size tag — "[½]" if set, or empty tap zone if not set
- Tap size tag or empty zone → open Size Tag Picker (see below)
- Tapping into the block focuses it for editing (though Panel blocks have no text content)
- Left edge: comment dot (amber if unresolved, grey if all resolved, hidden if no comments)
- Tap comment dot → open Comment Sidebar scrolled to this block's thread

**Scene Heading block:**
- Single text line, uppercase
- Autocomplete on location names from Bible [?]
- Keywords trigger: INT. EXT. WIDE CLOSEUP MEDIUM HORIZON BIRD'S EYE WORM'S EYE
- Left edge: comment dot (same as Panel)

**Description block:**
- Multi-line text, supports Bold and Italic
- Shift+Enter → newline within block (does not create new block)
- Left edge: comment dot

**Dialogue block:**
- Two-part: character name line (uppercase) + dialogue text line
- Character name: autocomplete from Bible Character entries, filtered to current series
- Inline @character mark creates entity connection in dossier
- Dialogue text: supports Bold and Italic
- Shift+Enter → newline within dialogue text
- Left edge: comment dot (on the block as a whole, not per-line) [?]

**Caption block:**
- Single text area, supports Bold and Italic
- Shift+Enter → newline within block
- Left edge: comment dot

**SFX block:**
- Single text line, rendered large and stylized
- Left edge: comment dot

**New comment on any block:**
- Tap anywhere on block → inline "+ Comment" affordance appears [OPEN: hover on web, always-visible tap zone on iPad?]
- Tap "+ Comment" → opens Comment Sidebar with new thread for this block, input focused

---

### SIZE TAG PICKER

- Triggered by tapping the size tag area on a Panel block
- Small popover near the tapped element
- Options: Full · ½ · ⅓ · ⅙ · ⅛ · Remainder · None (clear)
- Tap option → sets tag, popover dismisses
- Tap outside → dismiss with no change
- [OPEN: visual preview of page layout with selected size?]

---

### BLOCK SELECTOR BAR

Position determined by keyboard state:
- On-screen keyboard active → bar appears as keyboard accessory (fixed strip directly above keyboard)
- Physical keyboard connected → bar pinned to bottom edge of editor pane

**Contents (left to right):**
`[ Panel ] [ Scene ] [ Description ] [ Dialogue ] [ Caption ] [ SFX ]  [ B ] [ I ]  [ ··· ]`

- Block type buttons: tap → convert current block to that type
- Bold [B]: tap → toggle bold on selected text. Only active in Description, Dialogue, Caption.
- Italic [I]: tap → toggle italic on selected text. Only active in Description, Dialogue, Caption.
- Active block type is highlighted (accent color) [?]
- [···] overflow menu:
  - "Find / Replace" → [OPEN: UI not yet designed]
  - Future editor-specific options

**Keyboard shortcuts (physical keyboard):**
- Cmd/Ctrl+B → Bold
- Cmd/Ctrl+I → Italic
- Block type shortcuts → [OPEN: not yet defined]

---

### KEYBOARD FLOW (Enter / Tab behavior)

| Current block    | Enter →                             | Tab →                       |
|------------------|-------------------------------------|-----------------------------|
| Panel            | New Scene Heading                   | [OPEN: not specified]       |
| Scene Heading    | New Description                     | New Panel                   |
| Description      | New Description                     | Character name (Dialogue)   |
| Character name   | Dialogue text                       | —                           |
| Character name (empty) + Enter | New Panel + New Scene Heading | —             |
| Dialogue text    | New Dialogue (same or blank speaker?) [?] | New Character name   |
| Dialogue text + double Tab | Escape to Description      | —                           |
| Caption          | New Description                     | —                           |
| SFX              | New Description                     | [OPEN: not specified]       |

- Backspace on empty block → delete block, focus moves to previous block

---

### DISTRACTION-FREE MODE

**Enter:**
- 4-finger tap anywhere in editor
- [OPEN: also a button? Where?]

**In distraction-free:**
- Binder hidden
- Top chrome hidden
- Editor expands to full width
- Block selector bar remains visible (only way to change block type on touch)

**Exit:**
- 4-finger tap again
- Swipe from left edge to reveal binder
- [OPEN: any other exit paths?]

---

### FIND / REPLACE

- Accessed via [···] in block selector bar
- [OPEN: UI not designed — modal? inline bar at top of editor?]

---

### AUTO-SAVE

- Debounced 1.5s after last keystroke
- Status reflected in top chrome sync indicator

---
---

## 8. CONTENT: Storyboard Canvas

**Route:** `/universe/:id/issue/:iid/page/:pid/storyboard` [OPEN: confirm route shape]
**Access:** [🎨] Storyboard icon on any issue or page row in binder
**iPad:** Full drawing experience. **Web:** Read-only rendered preview.

---

### CANVAS AREA

- Dark background
- White rectangle representing the page, proportioned to universe page size setting, scaled to fit
- Panel grid overlay: derived from script size tags for this page, vertical divisions only
  - Updates live when size tags change in the script
  - Toggled on/off via drawing toolbar
  - Visual reference only — does not constrain drawing

**Locked page:**
- Canvas is read-only (no drawing)
- Locked banner shown [?]

---

### PAGE STRIP (bottom of canvas area)

- Horizontal filmstrip of all pages in the issue
- Each thumbnail: small rendered image or blank tile, page number below, status dot
- Active page: accent-colored border
- Tap thumbnail → jump to that page
- [OPEN: is the page strip always visible, or does it auto-hide during drawing?]

---

### DRAWING TOOLBAR (iPad only)

- Vertical strip, default position: left edge of canvas pane
- Snaps to edges of canvas pane (not freely floating)
- Auto-hides 3 seconds after last drawing stroke
- Reappears on any non-drawing tap

**Contents (top to bottom):**
- [Pencil] tool — tap to select (default active)
- [Eraser] tool — tap to select
- ─ divider ─
- Stroke weight slider (vertical)
- ─ divider ─
- Color: Black dot (default)
- Color: Dark grey dot
- Color: Red dot
- ─ divider ─
- [Undo] — tap → undo last stroke
- [Script Reference] — tap → toggle Script Reference Panel
- [Grid Overlay] — tap → toggle panel grid overlay on/off
- [Import Reference Image] — tap → open photo library / files picker

**[OPEN: Can the user reposition the toolbar to right, top, or bottom edges?]**

---

### GESTURES (iPad)

| Gesture                          | Action                                      |
|----------------------------------|---------------------------------------------|
| Pencil / finger stroke           | Draw                                        |
| 2-finger tap                     | Undo                                        |
| 2-finger drag                    | Pan canvas                                  |
| Pinch                            | Zoom (free)                                 |
| 3-finger tap on a panel          | Snap-zoom: panel fills screen               |
| 3-finger tap (when zoomed)       | Snap back to full page                      |
| 3-finger swipe (when zoomed)     | Jump to next panel in swipe direction       |
| 4-finger swipe                   | Next / previous page                        |

**[OPEN: zoom level limits not specified]**
**[OPEN: 3-finger swipe direction — left/right only, or all four?]**

---

### SCRIPT REFERENCE PANEL

- Triggered by: [Script Reference] button on drawing toolbar
- Slides in from right edge of canvas as half-width overlay
- Canvas dims behind it (does not disappear)
- Shows: full script text for current page, read-only, scrollable
- Close: tap [Script Reference] button again, or tap outside the panel [?]

---

### REFERENCE IMAGE

- Triggered by: [Import Reference Image] on drawing toolbar
- Opens: photo library or files picker [OPEN: one or both?]
- After import: opacity slider appears to set transparency
- Image lives on a separate layer below the drawing layer
- Non-destructive: not exported with the storyboard
- [OPEN: can there be multiple reference images per page?]
- [OPEN: can the reference image be repositioned or scaled after import?]
- [OPEN: toggle to show/hide the reference layer]

---

### SPLIT PREVIEW MODE

When script editor is open alongside storyboard:
- Storyboard appears as 40% preview pane within the split
- Read-only rendered image in v1 (not a live drawable canvas)
- Tap the preview pane → open full storyboard canvas (exits split, or promotes storyboard to full pane?) [OPEN]

---

### AUTO-SAVE

- Every 30 seconds while canvas is open
- On navigation away from the page

---
---

## 9. CONTENT: Universe Bible Overview

**Route:** `/universe/:id/bible`
**Access:** Binder footer pill tap, binder Bible section, [OPEN: also from top of binder?]

---

### HEADER

**"Universe Bible" heading** (or user-set name) [OPEN: can users rename the Bible?]

**[+] button**
- Tap → open type picker inline or as small popover
- Type picker options: Character · Location · Note · Timeline
- Multiple types selectable (non-exclusive)
- Confirm → create entry immediately with empty name, navigate to Bible Entry Detail, name field focused

**View modes** (controlled by global View button when Bible is open):
- By type (default): grouped by type tag, sorted by last modified within each group
- By recently modified: flat list, most recent first
- By series: grouped by series association
- By issue: [OPEN: requires selecting a specific issue first?]

---

### SEARCH BAR

- Pinned below header
- Spotlight-style: filters as you type
- Text search: matches name, field values, rich text body
- Filter shortcuts: typing "Issue 3" or "Series 2" filters to entries associated with that container
- Filter by type: type "Character" or tap a type chip in results
- Clear [×] button when text present

---

### ENTRY CARDS

Grouped by type (default view). Within each group: sorted by last modified.

**Entry card:**
- Shows: name, type-tag color swatch, one-line snippet (role for Characters, description for Locations, first line for Notes, name for Timelines), portrait/cover image if exists
- Tap → open Bible Entry Detail for this entry in content area
- Long press → standard context menu

**Group header:**
- Label: "CHARACTERS", "LOCATIONS", "NOTES", "TIMELINES"
- [OPEN: collapse/expand individual groups?]

**Empty state:**
- [OPEN: not specified — prompt text? ghost card?]

---
---

## 10. CONTENT: Bible Entry Detail

**Route:** `/universe/:id/bible/:entryId`
**Access:** Tap any entry card in Bible Overview, tap character/location/note in binder sections

---

### HEADER

**Name field**
- Large text, editable inline
- Focused on arrival if entry is newly created (name is empty)
- Auto-saves on change

**Color swatch**
- Circular color indicator
- Tap → color picker [OPEN: full color picker or preset palette?]
- Color used as accent on cards throughout the app

**Type tag chips**
- Shows current type tags as removable chips: [Character ×] [Location ×]
- Tap [×] on a chip → remove that type tag [OPEN: can the last tag be removed, leaving the entry untyped?]
- "+ Add type" affordance → opens type picker, same as creation

---

### IMAGES & SKETCHES STRIP

- Horizontal scroll strip below the header
- Each item: imported image or in-app sketch, shown as a square tile
- Tap a tile → [OPEN: expand to full view? lightbox?]
- "[+]" tile at end: tap → add image or sketch
  - Options: import from photo library, import from files, draw new sketch [OPEN: picker or separate buttons?]
- Drawing (iPad only): opens Skia canvas within the entry, same tools as storyboard (Pencil, Eraser, weight slider, Black/Dark grey/Red, 2-finger tap = undo)
- Web: images viewable, drawing not available in v1

---

### DEFAULT FIELDS

- Displayed as labeled rows: `Field Label    [value or placeholder]`
- Fields shown depend on type tags
- Empty fields show: "Add a value" placeholder
- Tap a row → value becomes editable inline
- Auto-saves on change (debounced 1.5s)

**Character type default fields:**
Name · Role · Birthday · Gender · Sex · Species · Sexual Orientation · Birthplace · Blood Type · Height · Appearance · Backstory

**Location type default fields:**
Name · Description · Time Period

**Note type default fields:**
Title only (body is rich text — primary content area)

**Timeline type:**
Name only — no editable fields at Bible level. Opens timeline editor.

**[OPEN: can users reorder default fields?]**
**[OPEN: can users hide a default field they don't want?]**

---

### CUSTOM FIELDS

- Appear below default fields
- "[+ Add custom field]" link at bottom of fields section
- Tap → text input for field label appears, with autocomplete suggestions from the universe field registry
  - Universe field registry: all custom field labels ever created in this universe, available as suggestions on any entry
- Confirm label → field added, value input focused
- Custom fields: text-only in v1
- [OPEN: can custom fields be deleted? Reordered?]

---

### RICH TEXT NOTES

- Section below all fields
- Label: "Notes"
- Freeform rich text editor
- Supports: bold · italic · headings · bullet lists · inline code
- Auto-saves (debounced 1.5s)
- For Note-type entries, this is the primary content area (takes up most of the page)

---

### SERIES OVERLAYS

- Collapsible section at the bottom of the entry
- Label: "Series Notes"
- Collapsed by default
- When expanded: list of series in the universe, each with an expandable text area
- [OPEN: shows all series, or only series this entry has been associated with?]
- Series overlay notes are additive — they layer on top of universe-level fields, do not overwrite them
- Auto-saves on change

---

### DOSSIER ACCESS

- Double tap on the entry (or a dedicated button — [OPEN: button placement not specified]) cycles depth states:
  1. Entry only (default)
  2. Entry + dossier split
  3. Dossier only
  4. Back to entry only
- Each entity remembers its last depth state
- Dossier can contain: text, images, drawings, sketches, script references, timeline pins, entity links
- [OPEN: dossier attachment creation UI not yet designed]

---
---

## 11. CONTENT: Timeline Tool

**Route:** `/universe/:id/timeline/:timelineId`
**Access:** Tap timeline entry in binder Timeline section, tap Timeline-type Bible entry card

---

### TIMELINE HEADER

**Timeline name**
- Editable inline [?]

**[+ Add Event] button** [OPEN: button location not specified — top right? floating?]

**Timeline selector** [OPEN: how does the user switch between multiple timelines?]

---

### TIMELINE CANVAS

- Horizontal, scrollable
- Dark background
- Single horizontal spine (1px line) across center

**Spine interactions:**
- Tap between two events on the spine → inline event creation [OPEN: form appears inline or as modal?]
- 1-finger hold on spine → scrub mode [OPEN: scrub mode behavior not defined]

**Pan and zoom:**
- 2-finger drag → pan
- Pinch → zoom (variable rate)
- Zoom controls: [OPEN: +/- buttons shown? Where?]

**Minimal view:**
- 4-finger tap → toggle minimal view (chrome off)
- Same gesture exits

---

### EVENT

**Appearance:**
- Diamond notch on spine (split color: tag color top / black bottom)
- Thin vertical connector line to card
- Cards alternate above and below spine
- Card content: title + date label (compact) / title + date + description (expanded)

**Interactions:**
- Tap card → select event (amber left bar, amber border on selected card)
- Tap selected card → expand/collapse to show description [?]
- Tap selected event → open Event Detail (dossier) [OPEN: where? In-content-area panel? Slides in from right?]
- [OPEN: how does the user edit an event's title/date/description?]
- [OPEN: how does the user delete an event?]
- Drag event along spine → reposition in timeline [?]

---

### RANGE

- Named colored bar along the spine between two events
- Multiple overlapping ranges: alternate above and below spine
- Label above the bar: range name
- Tap → select range, show options [OPEN: what options?]
- [OPEN: how does the user create a Range? Select two events, then action?]
- Range is an entity with its own dossier
- [OPEN: how does the user access the range's dossier?]

---

### ARC

- Story arc spanning multiple events
- Rendered as parabola (horizontal) or bracket (vertical), slightly transparent
- [OPEN: how is an Arc created?]
- [OPEN: arc vs. range — what is the user-facing distinction?]

---

### CLUSTER LABEL

- Navigational annotation on the spine
- Cartographic behavior: prominent when zoomed out, fades when zoomed in
- [OPEN: how does the user create a cluster label? Auto-generated or manual?]

---

### ISSUE BRACKETS *(optional)*

- Dotted black brackets labeled "Issue 1", "Issue 2" etc. in monospace
- [OPEN: how are these toggled on/off? Drawing toolbar? View button?]
- [OPEN: how are they positioned — manually, or derived from page count?]

---

### TIMELINE PINS

- A selected group of events or a range can be pinned as a living reference into any entity's dossier
- Stored as a query descriptor — not a snapshot. Updates if events change.
- [OPEN: how does the user initiate a pin? Select events, then "Pin to…" action?]

---
---

## 12. PANEL: Collaboration Panel

**Access:** Tap collaborator avatars in top chrome
**Type:** Slides in from right (or modal) [OPEN: panel or modal?]

---

### COLLABORATOR LIST

- All collaborators with name, role, and access scope
- [OPEN: can the Owner change a collaborator's role from here?]
- [OPEN: can the Owner remove a collaborator from here?]

---

### INVITE

- Email input field
- Role selector: Editor · Viewer
- Access scope selector: Universe-wide · Series-level · Bible-only
  - Series-level: shows series picker [OPEN: which series are selectable?]
- [Invite] button → sends invite email, adds to pending list
- Pending invites shown below with [Revoke] option

---

### RECENT ACTIVITY FEED

- "[Name] edited [Page X] · [Issue Y] · [time ago]"
- Tap item → navigate to that item in content area
- [OPEN: how many items shown? Paginated?]

---
---

## 13. PANEL: Comment Sidebar

**Access:**
- Toggle button in top chrome (right side, near collaborator avatars)
- Tap comment dot on any script block → opens sidebar scrolled to that block's thread

**Type:** Slides in from right edge of editor pane, ~40% width overlay. Editor remains visible behind it.

---

### SIDEBAR HEADER

**"Comments" label**

**"Show resolved" toggle**
- Off by default
- Toggle on → resolved threads expand in place

**[×] close button**
- Tap → close sidebar

---

### COMMENT THREADS

- All threads for the current page, grouped by block, in reading order
- Block label shown above each group (e.g., "Panel 1", "Dialogue — MARA")

**Thread:**
- Avatar + name + timestamp
- Comment text
- [Reply] input field below last message
- [Resolve] button
  - Tap → mark thread as resolved, thread collapses (if "Show resolved" is off)
  - Resolved threads shown with strikethrough or muted style
- [OPEN: can a resolved thread be re-opened? By whom?]

**New thread:**
- Tap any script block in the editor → "+ Comment" affordance appears on the block
- Tap "+ Comment" → sidebar opens (if not open), new empty thread for that block appears at bottom of sidebar, input focused

**Storyboard comments:**
- Tap anywhere on canvas → pin placed at that location, thread opens in sidebar
- Pin remains visible on canvas, moves with canvas pan
- [OPEN: pin appearance not specified — dot? pin icon?]

---
---

## 14. MODAL: Export

**Access:** Share button in top chrome, or long-press context menu on any binder item

---

### STEP 1: Choose Scope

- "Entire issue" — all pages [pre-selected if arriving from issue or no specific page context]
- "Single page" — [pre-selected if a specific page is currently open]
- [OPEN: if triggered from long-press on a series item, does it offer "Entire series"?]

---

### STEP 2: Choose Format

**Script PDF**
- Sub-option: PanelSync style / Final Draft style (radio)
- PanelSync style: blocks visually distinct by type, PanelSync body font
- Final Draft style: Courier font, panel descriptions left-aligned, dialogue centered, character names all-caps
- Both: one script page per PDF page, header on each page (universe, series, issue number, page number)
- Both: respects custom Series/Issue label names

**Script Text**
- Plain text, no styling

**Storyboard PDF**
- One storyboard page per PDF page, 1:1
- 300dpi, uncompressed
- Panel grid overlay included
- All sketch content at full fidelity
- Matches universe configured page size

---

### EXPORT ACTION

**[Export] button**
- Tap → export runs as background job
- Modal dismisses
- Notification appears when file is ready [OPEN: system notification? in-app banner? both?]
- [OPEN: where is the file saved — device files, share sheet, or user's choice?]

**[Cancel] button**
- Dismiss modal, no export

---
---

## 15. SCREEN: Account Settings

**Access:** Tap account avatar in top chrome
**[OPEN: is this a modal, a panel, or a full screen?]**

---

**Profile**
- Display name (editable)
- Avatar (changeable)
- Email address [OPEN: editable? requires re-verification?]
- Password change

**Appearance**
- Theme: [OPEN: light / dark / system? or is the app always dark?]

**Notifications**
- [OPEN: notification settings not specified]

**Keyboard Shortcuts**
- [OPEN: shortcut reference list? or user-configurable?]

**Sign Out**
- Tap → confirm dialog → sign out, navigate to auth screen [OPEN: auth screen not yet designed in detail]

---
---

## 16. MODIFIER: Split View

Split view is not a screen — it is a state modifier that the content area can be in.

---

**Entering split view:**
- Long press any binder item → "Open in Split" from context menu → item opens in second pane alongside whatever is currently in the content area
- [OPEN: any other way to initiate split view?]

**Split layout:**
- Two editor panes side by side
- Each pane is independent: own toolbar, own scroll position, own active state
- Divider between panes [OPEN: resizable? or fixed 50/50?]

**Active pane:**
- Indicated by a subtle highlight border
- Clicking into a pane makes it active
- Undo/Redo and Share in top chrome target the active pane

**Toolbars in split view:**
- Each editor has its own floating toolbar
- Default position: top-center of its pane
- Reposition: long press toolbar + drag → snaps to four edges of its pane (not freely floating)
- Toolbars do not float freely (prevents collisions in split view)

**Exiting split view:**
- [OPEN: how does the user close one pane? × button on the pane? Drag to close?]

**Common split pairs:**
Script + Storyboard · Script + Characters · Timeline + Script · Characters + Sketch · Locations + Sketch · Timeline + Characters

**[OPEN: can both panes show the same editor type, e.g., two different scripts?]**
**[OPEN: can the user have more than 2 panes? (no, v1 is max 2)]**

---
---

## OPEN QUESTIONS SUMMARY

Items flagged `[OPEN]` throughout this document that need decisions before building:

### Navigation & Routing
- Series Map and Issue Map need dedicated routes
- Script Editor route shape needs confirmation
- Storyboard route shape needs confirmation
- What does tapping a page row name (not an icon) do?

### Dashboard
- Universe Settings screen not yet designed
- Duplicate universe behavior not defined
- List view card contents not fully defined

### Create Universe Modal
- Upload behavior: photo library, files, or both?
- Custom page size: inline width/height inputs?
- Tab 4 invite: does scope appear at invite time or post-creation?
- Behavior on swipe-dismiss without completing

### Binder
- Collapsed state affordance (tab? edge handle?)
- Search results: inline in binder or content area?
- Sections: independently expandable or only one at a time?
- "Edit binder" mode vs. always-visible drag handles
- Custom section creation trigger
- Bulk action options in selection mode
- Pool sort control location
- Characters filter control location
- Footer pill result: binder overlay or content area?
- New series/issue creation: inline or modal?
- What triggers "Add Issue"?

### Universe Home
- Get Started shortcuts: what happens with no series/issue yet?
- Series Overview empty state
- Recent Activity item count and pagination
- Unpin mechanism

### Script Editor
- Route shape
- Page divider tap behavior
- Distraction-free mode: also a button?
- Distraction-free exit paths beyond 4-finger tap and swipe
- Panel block: Tab key behavior
- SFX block: Tab key behavior
- Dialogue Enter: same speaker carried forward or blank?
- Find/Replace UI design
- Block type keyboard shortcuts
- "+ Comment" affordance: hover (web) or tap zone (iPad)?
- [OPEN] indicator: block type-by-block or block-level only for Dialogue?
- Size tag picker: preview of layout?

### Storyboard Canvas
- Route shape
- Toolbar repositioning to other edges?
- Page strip: always visible or auto-hides during drawing?
- Reference image: multiple per page?
- Reference image: reposition/scale after import?
- Reference image: visibility toggle separate from opacity?
- Split preview tap: exits split or promotes storyboard pane?

### Bible
- Rename the Bible?
- Entry group collapse/expand in overview
- Empty state for 0 entries
- Color swatch: full picker or preset palette?
- Type tag: can last tag be removed?
- Default fields: reorderable? hideable?
- Custom fields: deletable? reorderable?
- Series Notes: show all series or only associated series?
- Images strip: tap tile action (lightbox?)
- Add image/sketch: picker or separate buttons?
- Dossier attachment creation UI

### Timeline
- Switch between multiple timelines
- Event creation: inline form or modal?
- Event editing: how?
- Event deletion: how?
- Event drag-to-reorder
- Event detail/dossier: where does it open?
- Range creation: select two events + action?
- Range dossier access
- Arc creation and user-facing distinction from Range
- Cluster label: auto or manual?
- Issue brackets: toggle and positioning
- Timeline pin initiation

### Collaboration
- Collaboration panel: panel or modal?
- Role change and collaborator removal from panel
- Viewer: activity feed visibility
- Locked page: what does a viewer/editor see in the editor?
- Activity feed count and pagination

### Export
- Scope when triggered from series long-press: offer "entire series"?
- File delivery: system notification, in-app banner, or both?
- File destination: device files, share sheet, user's choice?

### Account Settings
- Modal, panel, or full screen?
- Theme options (always dark? light mode?)
- Email editability
- Keyboard shortcuts: reference or configurable?
- Notification settings

### Split View
- Additional entry points beyond "Open in Split"
- Divider: resizable or fixed?
- Closing one pane
- Two panes of same editor type
