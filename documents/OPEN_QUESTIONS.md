# PanelSync — Open Design Questions
*Generated end of design session, March 2026. Work through these before building the workspace shell or revising the schema.*

---

## 1. The Dossier as a data structure
- What does a dossier attachment look like in the database? It needs to support text, images, drawings, script references, timeline pins, links to other entities — all as typed, contextualized facts on any entity.
- Is a dossier a table of attachments with a polymorphic entity reference (like comments currently are), or something else?
- How do drawings and handwritten notes get stored — as binary data, as references to files in R2, or something else?
- How do live pinned views (a timeline slice, a filtered character list) get stored — as a query/filter descriptor, or as a snapshot?

## 2. The Bible / Character / Location schema
- The current schema has fixed-column tables for bible_entries. Does that survive the living dossier model, or does it need to become a more flexible typed-fact structure?
- How do custom fields work at the data level — are they rows in a separate table, a JSON blob, or something else?
- How do waypoints get stored on a character or location?
- How do series overlays get stored — the current schema has `bible_entry_series_overlays` but is that flexible enough?

## 3. The script block format
- We sketched a format — is it final enough to commit to, or are there edge cases we haven't considered? (bold/italic inline marks, multi-speaker dialogue, SFX styling hints)
- How does the block format interact with the Panel entity in the schema — currently panels are a separate table with panel_number and size_tag. Does that stay, or does it get derived from script blocks at read time?

## 4. The Timeline data structure
- Timeline events can reference characters, locations, pages, other events. Is the current polymorphic `asset_timeline_tags` table the right approach for this, or does it need rethinking?
- How do waypoints on a character connect to timeline events — is that a foreign key, a loose reference, or something else?
- How are multiple timelines per character stored and retrieved?

## 5. The entity reference / connection system
- Entities can reference each other freely — a dossier can pin a timeline slice, a script block references a character by name, a timeline event references a page. How does this web of connections get stored without creating a maintenance nightmare?
- Do we need a general-purpose `connections` or `references` table, or are specific foreign keys enough?

## 6. Comments
- The current schema has a polymorphic comments table. Does it survive as-is, or does the distinction between dossiers and comments require changes?
- Comments need to attach to script blocks specifically — is the current `target_type / target_id` pattern sufficient for that level of granularity?

## 7. The workspace and navigation state
- Where does user navigation state live — last open entity, depth state (entity only / split / dossier only), warm contexts? Does this get persisted to the database or just held in memory per session?
- Does the route structure need to change before we build the workspace shell? (The missing series segment, the issue-level editor vs page-level route question.)

## 8. The issue-level script editor
- The editor loads all pages of an issue as one document. How does auto-save work — does the whole issue save at once, or does each page save independently as it's edited?
- How does the editor know which page to scroll to on open — is the page ID in the URL sufficient, or does it need additional state?

## 9. File storage
- Images, drawings, and sketches need to go somewhere (R2 is the plan). What's the data structure for referencing stored files — a URL, a file ID, metadata about dimensions and type?
- How do reference images on storyboard pages, dossier attachments, and Bible entry images all relate — are they the same file storage system with different reference points?

## 10. Versioning and locking
- Pages can be locked. Can dossier attachments be locked independently of the entity they're attached to?
- Does the handoff phase of a character dossier (where an editor locks canonical facts) need a formal locked state on individual facts, or just on the dossier as a whole?
- Do we need versioning at the block level (for undo history, for tracking who changed what in collaboration)?

## 11. The schedule
- Given all of the above — what gets built in what order? The workspace shell, the schema revision, the dossier system, the script editor, and the Bible are all interdependent. What's the minimum viable foundation that everything else can build on without being thrown away?
