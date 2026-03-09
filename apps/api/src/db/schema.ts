import {
  pgTable, pgEnum, text, integer, boolean,
  timestamp, uuid, jsonb, real,
} from 'drizzle-orm/pg-core';

// ── Enums ────────────────────────────────────────────────────────────────────

export const pageSizeEnum = pgEnum('page_size', [
  'us_comic', 'us_full_bleed', 'manga_tankobon', 'european_bd', 'letter', 'a4', 'custom',
]);

export const collaboratorRoleEnum = pgEnum('collaborator_role', [
  'owner', 'editor', 'viewer',
]);

export const accessScopeEnum = pgEnum('access_scope', [
  'universe', 'series', 'bible_only',
]);

export const scriptBlockTypeEnum = pgEnum('script_block_type', [
  'panel', 'scene', 'description', 'dialogue', 'caption', 'sfx',
]);

export const bibleEntryTypeEnum = pgEnum('bible_entry_type', [
  'character', 'location', 'note', 'timeline',
]);

export const pageStatusEnum = pgEnum('page_status', [
  'draft', 'in_review', 'locked', 'complete',
]);

export const timelineIntentEnum = pgEnum('timeline_intent', [
  'story', 'reference', 'character_arc', 'production',
]);

export const timelineEventTagTypeEnum = pgEnum('timeline_event_tag_type', [
  'point', 'range',
]);

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName:  text('display_name'),
  avatarUrl:    text('avatar_url'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// ── Universes ─────────────────────────────────────────────────────────────────

export const universes = pgTable('universes', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  ownerId:            uuid('owner_id').notNull().references(() => users.id),
  name:               text('name').notNull(),
  coverImageUrl:      text('cover_image_url'),
  pageSize:           pageSizeEnum('page_size').notNull().default('us_comic'),
  customPageWidth:    integer('custom_page_width'),   // points, used when pageSize = 'custom'
  customPageHeight:   integer('custom_page_height'),
  defaultIssueLength: integer('default_issue_length').notNull().default(22),
  seriesLabel:        text('series_label').notNull().default('Series'),
  issueLabel:         text('issue_label').notNull().default('Issue'),
  timelineTimescale:  text('timeline_timescale').notNull().default('pure_sequence'), // 'pure_sequence' | 'earth_time' | 'custom'
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});

// ── Universe Members ──────────────────────────────────────────────────────────

export const universeMembers = pgTable('universe_members', {
  id:          uuid('id').primaryKey().defaultRandom(),
  universeId:  uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId:      uuid('user_id').notNull().references(() => users.id),
  role:        collaboratorRoleEnum('role').notNull().default('editor'),
  accessScope: accessScopeEnum('access_scope').notNull().default('universe'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// ── Series ───────────────────────────────────────────────────────────────────

export const series = pgTable('series', {
  id:           uuid('id').primaryKey().defaultRandom(),
  universeId:   uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  number:       integer('number').notNull(),
  name:         text('name').notNull(),
  arcNotes:     text('arc_notes').notNull().default(''),
  coverImageUrl: text('cover_image_url'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// For series-scoped members, rows in this table indicate which series they can access.
export const memberSeriesAccess = pgTable('member_series_access', {
  id:       uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => universeMembers.id, { onDelete: 'cascade' }),
  seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
});

// ── Issues ────────────────────────────────────────────────────────────────────

export const issues = pgTable('issues', {
  id:        uuid('id').primaryKey().defaultRandom(),
  seriesId:  uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  number:    integer('number').notNull(),
  name:      text('name').notNull(),
  notes:     text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Pages ─────────────────────────────────────────────────────────────────────

export const pages = pgTable('pages', {
  id:            uuid('id').primaryKey().defaultRandom(),
  issueId:       uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  number:        integer('number').notNull(),
  status:        pageStatusEnum('status').notNull().default('draft'),
  scriptContent: jsonb('script_content').default([]),  // JSON array of script blocks (denormalized cache)
  updatedBy:     uuid('updated_by').references(() => users.id),
  isPrivate:     boolean('is_private').notNull().default(false),
  ownerId:       uuid('owner_id').references(() => users.id), // set when isPrivate=true
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
});

// ── Script Blocks ─────────────────────────────────────────────────────────────
// Normalized table for querying. scriptContent on pages is a denormalized cache.

export const scriptBlocks = pgTable('script_blocks', {
  id:           uuid('id').primaryKey().defaultRandom(),
  pageId:       uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  type:         scriptBlockTypeEnum('type').notNull(),
  order:        integer('order').notNull(),
  content:      text('content').notNull().default(''),
  panelNumber:  integer('panel_number'),   // set on 'panel' blocks
  speaker:      text('speaker'),           // set on 'dialogue' blocks
  panelSizeTag: text('panel_size_tag'),    // 'full' | 'half' | 'third' | 'sixth' | 'eighth' | 'remainder'
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// ── Panels ────────────────────────────────────────────────────────────────────
// Derived from script parsing. Read by storyboard grid overlay.

export const panels = pgTable('panels', {
  id:          uuid('id').primaryKey().defaultRandom(),
  pageId:      uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  panelNumber: integer('panel_number').notNull(),
  sizeTag:     text('size_tag'),           // 'full' | 'half' | 'third' | 'sixth' | 'eighth' | 'remainder'
  keywords:    jsonb('keywords').default([]).$type<string[]>(),
});

// ── Storyboard Pages ──────────────────────────────────────────────────────────

export const storyboardPages = pgTable('storyboard_pages', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  pageId:             uuid('page_id').notNull().unique().references(() => pages.id, { onDelete: 'cascade' }),
  sketchData:         jsonb('sketch_data').default({}),        // Skia path data
  referenceImageUrl:  text('reference_image_url'),
  referenceOpacity:   real('reference_opacity').default(0.5),
  updatedBy:          uuid('updated_by').references(() => users.id),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});

// ── Bible Entries ─────────────────────────────────────────────────────────────

export const bibleEntries = pgTable('bible_entries', {
  id:           uuid('id').primaryKey().defaultRandom(),
  universeId:   uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  typeTag:      bibleEntryTypeEnum('type_tag').notNull(),
  // Entries can carry multiple type tags — stored as a JSON array of additional tags
  extraTypeTags: jsonb('extra_type_tags').default([]).$type<string[]>(),
  name:         text('name').notNull(),
  color:        text('color'),             // accent color for cards
  // Character fields
  role:         text('role'),
  birthday:     text('birthday'),
  gender:       text('gender'),
  sex:          text('sex'),
  species:      text('species'),
  sexualOrientation: text('sexual_orientation'),
  birthplace:   text('birthplace'),
  bloodType:    text('blood_type'),
  height:       text('height'),
  appearance:   text('appearance'),
  backstory:    text('backstory'),
  knowledgeGaps: jsonb('knowledge_gaps').default({}).$type<Record<string, string>>(),
  // Location fields
  description:  text('description'),
  timePeriod:   text('time_period'),
  // Shared
  richTextContent: jsonb('rich_text_content').default({}), // ProseMirror/rich text body
  customFields: jsonb('custom_fields').default({}).$type<Record<string, string>>(),
  isPrivate:    boolean('is_private').notNull().default(false),
  ownerId:      uuid('owner_id').references(() => users.id), // set when isPrivate=true
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// ── Bible Entry Images ────────────────────────────────────────────────────────

export const bibleEntryImages = pgTable('bible_entry_images', {
  id:           uuid('id').primaryKey().defaultRandom(),
  entryId:      uuid('entry_id').notNull().references(() => bibleEntries.id, { onDelete: 'cascade' }),
  imageUrl:     text('image_url'),
  sketchData:   jsonb('sketch_data'),      // null = imported image, non-null = Skia sketch
  order:        integer('order').notNull().default(0),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// ── Series Overlays ───────────────────────────────────────────────────────────

export const bibleEntrySeriesOverlays = pgTable('bible_entry_series_overlays', {
  id:       uuid('id').primaryKey().defaultRandom(),
  entryId:  uuid('entry_id').notNull().references(() => bibleEntries.id, { onDelete: 'cascade' }),
  seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  notes:    text('notes').notNull().default(''),
});

// ── Note Folders ──────────────────────────────────────────────────────────────

export const noteFolders = pgTable('note_folders', {
  id:             uuid('id').primaryKey().defaultRandom(),
  universeId:     uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  parentFolderId: uuid('parent_folder_id').references((): any => noteFolders.id),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
});

// ── Timelines ─────────────────────────────────────────────────────────────────

export const timelines = pgTable('timelines', {
  id:          uuid('id').primaryKey().defaultRandom(),
  universeId:  uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  intent:      timelineIntentEnum('intent').notNull().default('story'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

export const timelineEvents = pgTable('timeline_events', {
  id:               uuid('id').primaryKey().defaultRandom(),
  timelineId:       uuid('timeline_id').notNull().references(() => timelines.id, { onDelete: 'cascade' }),
  title:            text('title').notNull(),
  description:      text('description').notNull().default(''),
  dateLabel:        text('date_label'),
  tagType:          timelineEventTagTypeEnum('tag_type').notNull().default('point'),
  rangeStartLabel:  text('range_start_label'),
  rangeEndLabel:    text('range_end_label'),
  color:            text('color'),
  sortOrder:        integer('sort_order').notNull().default(0),
  characterIds:     jsonb('character_ids').default([]).$type<string[]>(),
  locationId:       uuid('location_id').references(() => bibleEntries.id),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

export const timelineRanges = pgTable('timeline_ranges', {
  id:            uuid('id').primaryKey().defaultRandom(),
  timelineId:    uuid('timeline_id').notNull().references(() => timelines.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  startEventId:  uuid('start_event_id').notNull().references(() => timelineEvents.id),
  endEventId:    uuid('end_event_id').notNull().references(() => timelineEvents.id),
});

// Polymorphic tags linking any asset to any timeline event.
export const assetTimelineTags = pgTable('asset_timeline_tags', {
  id:              uuid('id').primaryKey().defaultRandom(),
  assetType:       text('asset_type').notNull(), // 'character' | 'location' | 'issue' | 'page' | ...
  assetId:         uuid('asset_id').notNull(),
  timelineEventId: uuid('timeline_event_id').notNull().references(() => timelineEvents.id, { onDelete: 'cascade' }),
  tagType:         timelineEventTagTypeEnum('tag_type').notNull().default('point'),
});

// ── Comments (polymorphic) ────────────────────────────────────────────────────

export const comments = pgTable('comments', {
  id:         uuid('id').primaryKey().defaultRandom(),
  targetType: text('target_type').notNull(), // 'page' | 'storyboard' | 'bible_entry' | 'timeline_event'
  targetId:   uuid('target_id').notNull(),
  userId:     uuid('user_id').notNull().references(() => users.id),
  content:    text('content').notNull(),
  resolved:   boolean('resolved').notNull().default(false),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
});

// ── Pinned Items ──────────────────────────────────────────────────────────────

export const pinnedItems = pgTable('pinned_items', {
  id:         uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').notNull().references(() => users.id),
  itemType:   text('item_type').notNull(), // 'page' | 'bible_entry' | 'timeline' | ...
  itemId:     uuid('item_id').notNull(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});
