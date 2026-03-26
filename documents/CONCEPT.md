# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/universe/[id]`.
- API deployed to Railway at `https://panelsyncapi-production.up.railway.app`. Neon DATABASE_URL and JWT_SECRET set as Railway env vars. Railway runs `npm run build && npm run start` via `railway.json` (fixes stale dist/ problem).
- Schema: 24 tables. `bible_entries` renamed to `entities`, `bibleEntryTypeEnum` → `entityTypeEnum` (added 'bible' and 'folder' values), `dossier_attachments.entity_type` value `'bible_entry'` → `'entity'`. New tables: `tags`, `entity_tags`, `entity_memberships`, `boards`, `board_members`, `perspectives`. `workspace_state` has `stagingArea jsonb` and `everythingDepth text` fields. Migrations 0005–0007 applied to Neon.
- Entity routes: `/api/universes/:id/entities`, `/api/entities/:id`, `/api/entities/:id/content`. All auth-gated.
- Real auth: `POST /api/auth/register` and `POST /api/auth/login` with scrypt + JWT.
- Workspace state routes: `GET /api/workspace-state`, `PUT /api/workspace-state` — per-user per-universe nav persistence.
- Block CRUD API: `GET/POST /api/pages/:pageId/blocks`, `PATCH/DELETE /api/pages/:pageId/blocks/:blockId`.
- EAS configured: `eas.json` has preview profile with `EXPO_PUBLIC_API_URL` baked in. iPad UDID registered, provisioning profile covers device. App installs and runs on iPad.
- `UniverseContext.tsx`: fetches entity list + workspace state in parallel on mount. Entity CRUD: createEntity, deleteEntity, updateEntityName.
- **Minimal UI strip (step 1 complete):** ThemeContext with light/dark toggle, monospace font, minimal palette (bg, text, muted, border, selection, error). ErrorBoundary wraps editor panel. Dashboard, workspace, EntityEditor, GroupEditor all stripped to functional minimalism. No silent `.catch(() => {})` — save failures surface as 'error' state. DraggableFlatList and PanGestureHandler removed from workspace. Binder shows flat entity list with type labels (C/L/N/G).
- **Unified editor (step 5 rewritten):** `Editor.tsx` — name input + single multiline TextInput. No block-per-input model. Saves to `bodyText` via `api.entities.updateContent`. Auto-save on 600ms debounce. Entity type shown as label below name. Members section for groups. Toolbar: just delete confirm. Old block model stripped entirely. Editor is now a plain text surface. ArrowUp from first line of text focuses name input; Enter from name focuses text.
- **Panel focus (step 7 complete):** `focusedPanel` state in workspace tracks active panel (`'binder' | 'editor'`). Cmd+; toggles between panels. 2px top border indicator on active panel. Clicking in either panel sets it as focused (mousedown listeners on wrapper refs, blurs inputs in the other panel). Binder keyboard handler gated by `isFocused` prop. Editor auto-focuses text input when panel becomes active. Panels are isolated — Escape stays within each panel (binder: clear selection/filter, editor: blur text). Creating an entity auto-focuses the editor panel.
- **Binder multi-select + move (step 7 complete):** Shift+Up/Down extends selection range (anchor-to-focus model). Selected items highlighted with selection background. Cmd+M opens move-to-folder picker: shows "(root)" + all folders, arrow-navigable, Enter confirms. Moves entities by updating entity_memberships (removes old parent, adds new). Bulk delete: Delete on multi-selection shows "delete? y/n" on all selected items. Escape clears selection. Shortcut reference panel (Cmd+/ or "?" button) shows all shortcuts in right-side overlay.
- **File mode binder (step 3 complete):** `Binder.tsx` component replaces inline flat entity list. Auto type sections (Characters, Locations, Notes, Groups) — collapsible, default open. Curated folders at top level via `buildFolderTree()` using entity_memberships. Recursive `FolderContents` for arbitrary nesting depth. Folder/group expand/collapse with v/> indicators. Create picker includes folder type. `[id].tsx` workspace simplified from 295 to 185 lines — all binder logic moved to Binder component.
- **Binder keyboard nav (step 4 complete):** Full keyboard navigation on web. Flat `navItems` list computed from binder tree for consistent Up/Down traversal. Arrow keys move focus (left border indicator), Enter opens entity, Right/Left expand/collapse sections and folders (Left also jumps to parent). Type-to-filter: any printable key opens filter input, live-filters entities by name. Cmd+N opens create picker (arrow-navigable), Cmd+Shift+N creates folder. F2 renames inline. Delete/Cmd+Backspace triggers inline "y/n" delete confirm. Escape context-chains: clear filter → deselect. App-level: Cmd+B toggles binder, Cmd+D toggles dark/light. All via stable `useRef` handler pattern to avoid stale closures.
- **Timeline entity type:** 'timeline' added to schema enum, API types, mobile types, binder, and context. Migration 0008 applied to Neon. `TimelineView.tsx` component: vertical spine layout with event cards (dateline, title, description). Card editing mode with Tab field cycling, Enter for rapid bulk entry, Alt+Arrow event jumping. Spine navigation mode (Alt+Left to enter) for structural operations: arrow-key traversal alternating event nodes and midpoints, Right to insert/edit, Delete with y/n confirm. Events stored as JSON array in bodyText, auto-saved on 600ms debounce. Shortcut reference panel updated with TIMELINE section.
- **Binder drag-and-drop:** Pointer-based drag-and-drop for moving entities between folders. Mousedown + 5px threshold starts drag. Ghost label follows pointer (name + count for multi-drag). Drop indicator line between rows, folder/group highlight on hover. Auto-scroll near edges. Escape cancels. Multi-select drag moves all selected. Cannot drop onto self or children. Group membership is semantic only (members stay in type section) — only folder membership creates structural containment.
- **2-up split editor:** Secondary editor panel to the right of primary. Shift+Enter from binder opens entity in secondary. Cmd+; cycles binder → editor-left → editor-right → binder. Shift+Enter from editor-right closes split. Secondary entity persisted via `stagingArea` jsonb on workspace_state. Click-to-focus with three panel refs.
- **Script entity type:** 'script' added to schema enum, API types, mobile types, binder, and context. Migration 0009 applied to Neon. `ScriptView.tsx` component: vertical element list with indentation-based visual hierarchy. Elements: page, panel, scene, character, parenthetical, dialogue, caption. Pages show "Page N (M panels)" with dynamic panel count, no editable text. Panels auto-number per page. Context-aware Enter chains: non-empty advances down hierarchy, empty collapses up. Tab/Shift+Tab cycles element type on empty blocks (caption included in cycle). `(` in character name auto-splits into character + parenthetical. Typing "ca"/"cap"/etc. in character field shows CAPTION autocomplete; Enter converts to caption type. Character names auto-uppercased. Character/parenthetical indented at 160, dialogue/caption at 128. Parentheticals on own row with decorative `( )`. Alt+Up/Down jumps to content elements, Alt+Left/Right navigates dialogue groups. Elements stored as JSON in bodyText, auto-saved on 600ms debounce. Shortcut reference updated with SCRIPT section. Clickable shortcut items for toggle actions (cycle panels, panel map, binder, theme).
- **Auth page restyled:** Stripped to match mono/minimal app style — no card, no border-radius, underlined inputs, plain text buttons, uses `useTheme()`.
- **Universes keyboard nav:** Up/Down arrow keys to highlight universe, Enter to open, Cmd+Backspace to trigger delete (three-step confirmation: modal → "are you sure?" → delete). Selection highlight with `colors.selection`. Dashboard keyboard listener gated by pathname so it doesn't fire inside universe workspaces.
- **Cross-platform keyboard support:** All keyboard shortcuts now work on native iOS/iPad builds via TextInput `onKeyPress` handlers, not just web. Shared `KeyInfo` abstraction in `lib/keyboard.ts` with `fromWebEvent`/`fromNativeEvent` adapters. Web uses `document.addEventListener('keydown')` (capture phase), native uses `onKeyPress` on every TextInput. Applied to: ScriptView, TimelineView, Editor, Binder (hidden TextInput for nav-mode key capture), universe workspace (app-level shortcuts + `onTouchStart` for panel focus), universes list (hidden TextInput for arrow/Enter nav). Spine mode in TimelineView remains web-only (no TextInput focused). App-level Cmd shortcuts on native only fire when a TextInput is focused.
- **Panel map preview:** Panel sizing via Left/Right arrow-key cycling on panel elements (splash → half → wide → small → banner → beat → no size). Smart default: first arrow press selects the largest size fitting remaining page budget. Size display inline next to "Panel N" prefix: `← HALF →` when focused, `HALF` when unfocused. Backspace on empty sized panel clears size. `PanelMapPreview.tsx` component renders proportional ASCII page grids (box-drawing characters, 24-row pages, panels as horizontal bands with height matching their budget fraction). Budget math: splash=100%, half=50%, wide=33%, small=15%, banner=13%, beat=10%, unsized=equal share of remaining. Overflow detection with `[!]` inline indicator and error-colored preview. Preview shown as right-side overlay (Cmd+Shift+P toggle), mutually exclusive with shortcuts panel. Editor pipes scriptElements to workspace via callback prop. Chalkboard and panel preview HTML mockups saved in documents/.
- DESIGN.md: fully updated. "Lenses, Not Containers" foregrounded. Four binder modes designed: Everything, File, Publishing, Board. Bible as entity type specified. Staging area, perspectives, folder deletion dialog, depth control, Publishing mode all specified. Content model section added: entity pages as nested documents, block types (text, field, note, script) as universal atoms, promotion-from-selection pattern, starter fields as prompts. Dossier clarified as freeform spatial canvas (v1 = linear scroll; target = infinite canvas with coordinates on every item). Block types valid in any entity page including script blocks.

## Next Step
Test script editor UX refinements with real content, then generate real content to validate the brainstorming loop.

## Completed Task
Script editor UX refinements: arrow-key panel size cycling with smart budget defaults, caption element type with autocomplete, doubled character/dialogue indentation, page panel counts, banner/beat sizes, clickable shortcut items. Focus fight bug fixed.

---

## Direction: Keyboard-First Minimal Prototype

**Goal:** Get the app to a place where it feels good to brainstorm — create entities, organize them, connect them, generate content rapidly. Not scripts yet. World-building.

**Approach:**
- Strip all visual decoration. Monospace font, no icons, no color except state (selected, active, saved/unsaved). Dark mode from the start (light/dark toggle).
- File mode binder as the primary navigation surface, keyboard-navigable.
- Keyboard shortcuts are core UX, designed alongside every feature.
- Build the creation environment first (File mode). Generate real content. Then build the discovery environment (Everything mode) and test it against real data.

**Minimum visible UI:**
- Top: universe name (left), save state (right)
- Left panel: binder — filter field, collapsible type sections, curated folders with nesting, selection highlight
- Right panel: editor — entity name, blocks with type labels, focus indicator on active block
- Bottom: "Cmd+/ for shortcuts" hint
- Rows ~44pt for tap fallback. No toolbar, no icons, no chrome beyond this.

### Keyboard Map

**App-level**
- Cmd+; — toggle focus between binder and editor
- Cmd+\\ — toggle binder visibility
- Cmd+/ — shortcut reference panel

**Binder (when focused)**
- Up/Down — move selection
- Shift+Up/Down — extend selection range
- Enter — open selected entity in editor
- Right — expand folder/section
- Left — collapse folder/section, or select parent
- Start typing — live filter
- Escape — clear selection, or clear filter
- Cmd+Shift+A — new entity (inline type picker)
- Cmd+Shift+M — move to folder (picker)
- Backspace/Delete — delete selected (inline y/n confirm)
- F2 — rename selected inline

**Editor (when focused)**
- ArrowUp — name input (from top of text)
- Enter — text area (from name input)
- Escape — blur active input

### Build Sequence

1. ~~**Strip + dark mode**~~ ✅ — ThemeContext, minimal palette, monospace, ErrorBoundary, no silent failures
2. ~~**Strip CharacterEditor**~~ ✅ — migrated to minimal theme, same block model
3. ~~**File mode binder**~~ ✅ — auto type sections (Characters, Locations, Notes, Groups), curated folders via entity_memberships, recursive nesting, depth indentation, Binder component extracted
4. ~~**Binder keyboard nav**~~ ✅ — arrow keys, Enter, expand/collapse, type-to-filter, Cmd+N, F2 rename, Delete confirm, Cmd+B/D app shortcuts
5. ~~**Unified editor**~~ ✅ — Editor.tsx, single TextInput for body text, no block model. Name + text area + delete. 280 lines.
6. ~~**Binder multi-select + move**~~ ✅ — Shift+Up/Down selection, Cmd+Shift+M move-to-folder picker, bulk delete, shortcut reference panel (Cmd+/)
7. ~~**Panel focus**~~ ✅ — Cmd+; toggles binder/editor, 2px top border indicator, click-to-focus, isolated Escape per panel
8. **Field lines** — inline fields in text area (bullet-list pattern: Enter continues, double-Enter exits)
9. **@-mention linking** — autocomplete triggered by @, creates entity_link dossier attachment
9. **Generate real content** — use the app to brainstorm a world
10. **Everything mode** — flat view, strip folder context, see what the unstructured pile looks like

---

## Deferred
- `packages/types` shared package — wait until schema is written, then extract shared interfaces
- `apps/api/.env` is gitignored — Neon DATABASE_URL must be re-entered if repo is cloned fresh
- Rename "Universe" → "World" in codebase — spec uses "Universe" now confirmed; codebase matches
- iPad visual polish (tap targets, button styling, color swatches, toolbar layout) — revisit after keyboard-first prototype validates the interaction model
- Gesture navigation (two-finger swipe for binder toggle) — deferred, keyboard handles this
- Storyboard canvas, Timeline tool, Collaboration, Export — later phases
- API route splitting (containers.ts) — do when touching those routes next
- API input validation (Typebox) — apply as routes are modified
- Test infrastructure (Vitest + supertest) — set up with first route refactor

---

## Active Decisions
- ORM: Drizzle (schema is TypeScript, easy to change)
- Hosting: Railway (API + Postgres), Cloudflare Pages (web), Cloudflare R2 (files)
- Monorepo: npm workspaces — Metro already configured with watchFolders
- Auth: JWT (email + password). OAuth deferred to v2.
- Sync: REST polling, last-write-wins. Yjs CRDT deferred to v2.
- UI: functional minimalism, monospace, dark/light mode, keyboard-first
- Editor: one unified editor for all entity types. Block types (text, field, note) available on any entity. Entity type is a starting label, not a capability gate.
- Members: any entity can have a members section. Memberships carry a freeform `role` label (leader, father, ally, etc.) — members section groups by role. Hierarchy is semantic, not structural. (`role` column on `entity_memberships` deferred — current members section is flat list, groups only.)
- Script editor: deferred until world-building loop feels good
- Drawing canvas: React Native Skia, deferred

---

## Sprint Position
Pivoted from feature sprints to interaction-first prototyping. Build the keyboard-first brainstorming loop, validate with real content, then layer visual design and additional features.

| Phase | Deliverable |
|-------|-------------|
| ✅ Foundation | Expo monorepo, NativeWind, Expo Router, auth, Drizzle schema, workspace shell |
| ✅ Script editor | Block-based editor, Final Draft visual style, block CRUD API |
| ✅ Entity list + editor | Flat entity list in binder, freeform text editor, persists to DB |
| ✅ Railway + iPad | API on Railway, EAS build, app running on iPad |
| Next | Minimal UI strip + dark mode + File mode binder + keyboard navigation |
| After | @-mention linking, quick switcher, editor keyboard flow |
| After | Generate real content, evaluate, build Everything mode |
| Later | Visual design pass, Publishing mode, script editor integration |
| Later | Storyboard canvas (Skia), Timeline tool, Collaboration, Export |
