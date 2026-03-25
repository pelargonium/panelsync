import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';

export const pageSizeEnum = pgEnum('page_size', [
  'us_comic',
  'us_full_bleed',
  'manga_tankobon',
  'european_bd',
  'letter',
  'a4',
  'custom',
]);

export const collaboratorRoleEnum = pgEnum('collaborator_role', [
  'owner',
  'editor',
  'contributor',
  'viewer',
]);

export const accessScopeEnum = pgEnum('access_scope', [
  'universe',
  'series',
  'bible_only',
]);

export const scriptBlockTypeEnum = pgEnum('script_block_type', [
  'panel',
  'scene',
  'description',
  'dialogue',
  'caption',
  'sfx',
]);

export const entityTypeEnum = pgEnum('entity_type', [
  'character',
  'location',
  'note',
  'group',
  'bible',
  'folder',
  'timeline',
  'script',
]);

export const pageStatusEnum = pgEnum('page_status', [
  'draft',
  'in_review',
  'locked',
  'complete',
]);

export const timelineIntentEnum = pgEnum('timeline_intent', [
  'story',
  'reference',
  'character_arc',
  'production',
]);

export const dossierLayoutEnum = pgEnum('dossier_layout', [
  'vertical',
  'horizontal',
]);

export const dossierAttachmentTypeEnum = pgEnum('dossier_attachment_type', [
  'text',
  'image',
  'drawing',
  'sketch',
  'entity_link',
  'timeline_pin',
  'script_ref',
  'waypoint',
]);

export const dossierEntityTypeEnum = pgEnum('dossier_entity_type', [
  'universe',
  'container',
  'page',
  'script_block',
  'entity',
  'timeline',
  'timeline_event',
  'timeline_range',
  'draft',
]);

export const draftStatusEnum = pgEnum('draft_status', [
  'working',
  'filed',
  'published',
]);

export const eventActionEnum = pgEnum('event_action', [
  'created',
  'updated',
  'deleted',
  'moved',
  'assigned',
  'locked',
  'unlocked',
]);

export const depthStateEnum = pgEnum('depth_state', [
  'entity_only',
  'split',
  'dossier_only',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const universes = pgTable('universes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  coverImageUrl: text('cover_image_url'),
  pageSize: pageSizeEnum('page_size').notNull().default('us_comic'),
  customPageWidth: integer('custom_page_width'),
  customPageHeight: integer('custom_page_height'),
  defaultIssueLength: integer('default_issue_length').notNull().default(22),
  timelineTimescale: text('timeline_timescale').notNull().default('pure_sequence'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const universeMembers = pgTable('universe_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: collaboratorRoleEnum('role').notNull().default('editor'),
  accessScope: accessScopeEnum('access_scope').notNull().default('universe'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const hierarchyLevels = pgTable('hierarchy_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const containers = pgTable('containers', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  levelId: uuid('level_id').notNull().references(() => hierarchyLevels.id),
  parentId: uuid('parent_id').references((): any => containers.id),
  name: text('name').notNull(),
  number: integer('number'),
  status: pageStatusEnum('status'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const memberSeriesAccess = pgTable('member_series_access', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => universeMembers.id, { onDelete: 'cascade' }),
  containerId: uuid('container_id').notNull().references(() => containers.id, { onDelete: 'cascade' }),
});

export const drafts = pgTable('drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: draftStatusEnum('status').notNull().default('working'),
  containerId: uuid('container_id').references(() => containers.id),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  containerId: uuid('container_id').references(() => containers.id),
  draftId: uuid('draft_id').references(() => drafts.id),
  number: integer('number').notNull(),
  status: pageStatusEnum('status').notNull().default('draft'),
  updatedBy: uuid('updated_by').references(() => users.id),
  isPrivate: boolean('is_private').notNull().default(false),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const scriptBlocks = pgTable('script_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }),
  draftId: uuid('draft_id').references(() => drafts.id),
  type: scriptBlockTypeEnum('type').notNull(),
  content: jsonb('content').notNull().default({}),
  speaker: text('speaker'),
  sizeTag: text('size_tag'),
  position: real('position').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  width: integer('width'),
  height: integer('height'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

export const entities = pgTable('entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  type: entityTypeEnum('type').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  position: real('position'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const timelines = pgTable('timelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  intent: timelineIntentEnum('intent').notNull().default('story'),
  timeSystem: text('time_system').notNull().default('sequence'),
  customUnit: text('custom_unit'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  timelineId: uuid('timeline_id').notNull().references(() => timelines.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  dateLabel: text('date_label'),
  color: text('color'),
  position: real('position').notNull().default(0),
  timeValue: text('time_value'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const timelineRanges = pgTable('timeline_ranges', {
  id: uuid('id').primaryKey().defaultRandom(),
  timelineId: uuid('timeline_id').notNull().references(() => timelines.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startEventId: uuid('start_event_id').references(() => timelineEvents.id),
  endEventId: uuid('end_event_id').references(() => timelineEvents.id),
  color: text('color'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dossierAttachments = pgTable('dossier_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  entityType: dossierEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  type: dossierAttachmentTypeEnum('type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  context: jsonb('context').notNull().default({}),
  searchText: text('search_text'),
  entityRefs: uuid('entity_refs').array().notNull().default(sql`'{}'::uuid[]`),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  state: text('state').notNull().default('draft'),
  position: real('position').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const dossierCanvasState = pgTable('dossier_canvas_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: dossierEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  layout: dossierLayoutEnum('layout').notNull().default('vertical'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): any => comments.id),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  content: text('content').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id),
  action: eventActionEnum('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const workspaceState = pgTable('workspace_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activeEntityType: text('active_entity_type'),
  activeEntityId: text('active_entity_id'),
  depthState: depthStateEnum('depth_state').notNull().default('entity_only'),
  binderOpen: boolean('binder_open').notNull().default(true),
  warmContexts: jsonb('warm_contexts').notNull().default([]),
  stagingArea: jsonb('staging_area').notNull().default([]),
  everythingDepth: text('everything_depth').notNull().default('page'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const entityTags = pgTable('entity_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  taggedBy: uuid('tagged_by').references(() => users.id),
  taggedAt: timestamp('tagged_at').notNull().defaultNow(),
});

export const entityMemberships = pgTable('entity_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentEntityId: uuid('parent_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  childEntityId: uuid('child_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  position: real('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const boardMembers = pgTable('board_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  position: real('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const perspectives = pgTable('perspectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filterDescriptor: jsonb('filter_descriptor').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
