import { and, asc, desc, eq, max, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { bibleEntries, dossierAttachments, universes, universeMembers } from '../db/schema.js';

async function assertUniverseAccess(universeId: string, userId: string): Promise<boolean> {
  const [universe] = await db
    .select({ ownerId: universes.ownerId })
    .from(universes)
    .where(eq(universes.id, universeId))
    .limit(1);

  if (!universe) return false;
  if (universe.ownerId === userId) return true;

  const [membership] = await db
    .select({ id: universeMembers.id })
    .from(universeMembers)
    .where(and(
      eq(universeMembers.universeId, universeId),
      eq(universeMembers.userId, userId),
    ))
    .limit(1);

  return !!membership;
}

function serializeEntry(entry: typeof bibleEntries.$inferSelect) {
  return {
    id: entry.id,
    universeId: entry.universeId,
    type: entry.type,
    name: entry.name,
    color: entry.color,
    position: entry.position,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

type BibleTextPayload = {
  text?: string;
};

type BlockPayload =
  | { kind: 'field'; label: string; value: string }
  | { kind: 'note'; title: string; body: string }
  | { kind: 'text'; content: string };

function serializeBlock(row: typeof dossierAttachments.$inferSelect) {
  const payload = row.payload as BlockPayload;
  return {
    id: row.id,
    kind: payload.kind,
    ...(payload.kind === 'field'
      ? { label: payload.label ?? '', value: payload.value ?? '' }
      : payload.kind === 'note'
      ? { title: payload.title ?? '', body: payload.body ?? '' }
      : { content: payload.content ?? '' }),
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getEntryForAccess(id: string, userId: string) {
  const [entry] = await db.select().from(bibleEntries).where(eq(bibleEntries.id, id)).limit(1);
  if (!entry) return { error: 'not found' as const };
  if (!await assertUniverseAccess(entry.universeId, userId)) return { error: 'forbidden' as const };
  return { entry };
}

export async function bibleRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  server.get<{ Params: { universeId: string } }>(
    '/universes/:universeId/bible/memberships',
    async (request, reply) => {
      const { universeId } = request.params;
      const userId = request.user.sub;

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const rows = await db
        .select()
        .from(dossierAttachments)
        .where(and(
          eq(dossierAttachments.universeId, universeId),
          eq(dossierAttachments.entityType, 'bible_entry'),
          eq(dossierAttachments.type, 'text'),
          sql`${dossierAttachments.payload}->>'kind' = 'group_membership'`,
        ));

      return {
        data: rows.map((row) => ({
          characterId: row.entityId,
          groupId: (row.payload as { kind: string; groupId: string }).groupId,
        })),
      };
    },
  );

  server.get<{ Params: { universeId: string } }>(
    '/universes/:universeId/bible',
    async (request, reply) => {
      const { universeId } = request.params;
      const userId = request.user.sub;

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const rows = await db
        .select()
        .from(bibleEntries)
        .where(eq(bibleEntries.universeId, universeId))
        .orderBy(asc(bibleEntries.name));

      return { data: rows.map(serializeEntry) };
    },
  );

  server.post<{ Params: { universeId: string }; Body: { name: string; type: 'character' | 'location' | 'note' | 'group' } }>(
    '/universes/:universeId/bible',
    async (request, reply) => {
      const { universeId } = request.params;
      const { name, type } = request.body;
      const userId = request.user.sub;

      if (!name?.trim()) {
        reply.code(400);
        return { error: 'name is required' };
      }

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const [maxPositionRow] = await db
        .select({ value: max(bibleEntries.position) })
        .from(bibleEntries)
        .where(eq(bibleEntries.universeId, universeId));

      const [row] = await db
        .insert(bibleEntries)
        .values({
          universeId,
          type,
          name: name.trim(),
          position: (maxPositionRow?.value ?? 0) + 1,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      if (type === 'character') {
        await db.insert(dossierAttachments).values([
          {
            universeId,
            entityType: 'bible_entry',
            entityId: row.id,
            type: 'text',
            payload: { kind: 'text', content: '' },
            position: 0.5,
            createdBy: userId,
            updatedBy: userId,
          },
          {
            universeId,
            entityType: 'bible_entry',
            entityId: row.id,
            type: 'text',
            payload: { kind: 'field', label: 'Role', value: '' },
            position: 1.0,
            createdBy: userId,
            updatedBy: userId,
          },
          {
            universeId,
            entityType: 'bible_entry',
            entityId: row.id,
            type: 'text',
            payload: { kind: 'field', label: 'Age', value: '' },
            position: 2.0,
            createdBy: userId,
            updatedBy: userId,
          },
          {
            universeId,
            entityType: 'bible_entry',
            entityId: row.id,
            type: 'text',
            payload: { kind: 'field', label: 'Motivation', value: '' },
            position: 3.0,
            createdBy: userId,
            updatedBy: userId,
          },
        ]);
      }

      reply.code(201);
      return { data: serializeEntry(row) };
    },
  );

  server.get<{ Params: { id: string } }>(
    '/bible/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const [attachment] = await db
        .select({ payload: dossierAttachments.payload })
        .from(dossierAttachments)
        .where(and(
          eq(dossierAttachments.entityType, 'bible_entry'),
          eq(dossierAttachments.entityId, id),
          eq(dossierAttachments.type, 'text'),
        ))
        .orderBy(desc(dossierAttachments.updatedAt))
        .limit(1);

      const payload = (attachment?.payload ?? {}) as BibleTextPayload;

      return {
        data: {
          ...serializeEntry(result.entry),
          bodyText: payload.text ?? '',
        },
      };
    },
  );

  server.patch<{ Params: { id: string }; Body: { name?: string; type?: 'character' | 'location' | 'note' | 'group'; color?: string; position?: number | null } }>(
    '/bible/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const updates: Partial<typeof bibleEntries.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      if (request.body.name !== undefined) {
        const trimmedName = request.body.name.trim();
        if (!trimmedName) {
          reply.code(400);
          return { error: 'name must not be empty' };
        }
        updates.name = trimmedName;
      }

      if (request.body.type !== undefined) {
        updates.type = request.body.type;
      }

      if (request.body.color !== undefined) {
        updates.color = request.body.color;
      }

      if (request.body.position !== undefined) {
        updates.position = request.body.position;
      }

      const [row] = await db.update(bibleEntries).set(updates).where(eq(bibleEntries.id, id)).returning();
      return { data: serializeEntry(row) };
    },
  );

  server.patch<{ Params: { id: string }; Body: { text: string } }>(
    '/bible/:id/content',
    async (request, reply) => {
      const { id } = request.params;
      const { text } = request.body;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const now = new Date();
      const [attachment] = await db
        .select({ id: dossierAttachments.id })
        .from(dossierAttachments)
        .where(and(
          eq(dossierAttachments.entityType, 'bible_entry'),
          eq(dossierAttachments.entityId, id),
          eq(dossierAttachments.type, 'text'),
        ))
        .limit(1);

      if (attachment) {
        await db
          .update(dossierAttachments)
          .set({
            payload: { text },
            searchText: text,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(dossierAttachments.id, attachment.id));
      } else {
        await db.insert(dossierAttachments).values({
          universeId: result.entry.universeId,
          entityType: 'bible_entry',
          entityId: id,
          type: 'text',
          payload: { text },
          searchText: text,
          createdBy: userId,
          updatedBy: userId,
          updatedAt: now,
        });
      }

      return { data: { id, text } };
    },
  );

  server.delete<{ Params: { id: string } }>(
    '/bible/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      await db
        .delete(dossierAttachments)
        .where(and(
          eq(dossierAttachments.entityType, 'bible_entry'),
          eq(dossierAttachments.entityId, id),
        ));

      await db.delete(bibleEntries).where(eq(bibleEntries.id, id));
      reply.code(204);
    },
  );

  server.post<{ Params: { groupId: string }; Body: { characterId: string } }>(
    '/bible/:groupId/members',
    async (request, reply) => {
      const { groupId } = request.params;
      const { characterId } = request.body;
      const userId = request.user.sub;

      const groupResult = await getEntryForAccess(groupId, userId);
      if ('error' in groupResult) {
        reply.code(groupResult.error === 'not found' ? 404 : 403);
        return { error: groupResult.error };
      }

      if (groupResult.entry.type !== 'group') {
        reply.code(400);
        return { error: 'group entry required' };
      }

      const [character] = await db.select().from(bibleEntries).where(eq(bibleEntries.id, characterId)).limit(1);
      if (!character || character.type !== 'character' || character.universeId !== groupResult.entry.universeId) {
        reply.code(400);
        return { error: 'character entry required' };
      }

      const [existing] = await db
        .select()
        .from(dossierAttachments)
        .where(and(
          eq(dossierAttachments.entityId, characterId),
          sql`${dossierAttachments.payload}->>'kind' = 'group_membership'`,
          sql`${dossierAttachments.payload}->>'groupId' = ${groupId}`,
        ))
        .limit(1);

      if (existing) {
        return { data: { characterId, groupId } };
      }

      await db.insert(dossierAttachments).values({
        universeId: groupResult.entry.universeId,
        entityType: 'bible_entry',
        entityId: characterId,
        type: 'text',
        payload: { kind: 'group_membership', groupId },
        position: 0,
        createdBy: userId,
        updatedBy: userId,
      });

      reply.code(201);
      return { data: { characterId, groupId } };
    },
  );

  server.delete<{ Params: { groupId: string; characterId: string } }>(
    '/bible/:groupId/members/:characterId',
    async (request, reply) => {
      const { groupId, characterId } = request.params;
      const userId = request.user.sub;

      const groupResult = await getEntryForAccess(groupId, userId);
      if ('error' in groupResult) {
        reply.code(groupResult.error === 'not found' ? 404 : 403);
        return { error: groupResult.error };
      }

      await db.delete(dossierAttachments).where(and(
        eq(dossierAttachments.entityId, characterId),
        sql`${dossierAttachments.payload}->>'kind' = 'group_membership'`,
        sql`${dossierAttachments.payload}->>'groupId' = ${groupId}`,
      ));

      reply.code(204);
    },
  );

  server.get<{ Params: { id: string } }>(
    '/bible/:id/blocks',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const rows = await db
        .select()
        .from(dossierAttachments)
        .where(and(
          eq(dossierAttachments.entityType, 'bible_entry'),
          eq(dossierAttachments.entityId, id),
        ))
        .orderBy(asc(dossierAttachments.position));

      const data = rows
        .filter((row) => {
          const payload = row.payload as BlockPayload;
          return payload.kind === 'field' || payload.kind === 'note' || payload.kind === 'text';
        })
        .map(serializeBlock);

      return { data };
    },
  );

  server.post<{ Params: { id: string }; Body: { kind: 'field' | 'note' | 'text'; label?: string; value?: string; title?: string; body?: string; content?: string; position?: number } }>(
    '/bible/:id/blocks',
    async (request, reply) => {
      const { id } = request.params;
      const { kind } = request.body;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      let position = request.body.position;
      if (position === undefined) {
        const [positionRow] = await db
          .select({ value: max(dossierAttachments.position) })
          .from(dossierAttachments)
          .where(and(
            eq(dossierAttachments.entityType, 'bible_entry'),
            eq(dossierAttachments.entityId, id),
          ));

        position = positionRow?.value !== null && positionRow?.value !== undefined
          ? positionRow.value + 1.0
          : 1.0;
      }

      const payload: BlockPayload = kind === 'field'
        ? {
            kind,
            label: request.body.label ?? '',
            value: request.body.value ?? '',
          }
        : kind === 'note'
        ? {
            kind,
            title: request.body.title ?? '',
            body: request.body.body ?? '',
          }
        : {
            kind: 'text',
            content: request.body.content ?? '',
          };

      const [row] = await db
        .insert(dossierAttachments)
        .values({
          universeId: result.entry.universeId,
          entityType: 'bible_entry',
          entityId: id,
          type: 'text',
          payload,
          position,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      reply.code(201);
      return { data: serializeBlock(row) };
    },
  );

  server.patch<{ Params: { id: string; blockId: string }; Body: { label?: string; value?: string; title?: string; body?: string; content?: string } }>(
    '/bible/:id/blocks/:blockId',
    async (request, reply) => {
      const { id, blockId } = request.params;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const [row] = await db.select().from(dossierAttachments).where(eq(dossierAttachments.id, blockId)).limit(1);
      if (!row || row.entityId !== id) {
        reply.code(404);
        return { error: 'not found' };
      }

      const payload = row.payload as BlockPayload;
      const nextPayload: BlockPayload = payload.kind === 'field'
        ? {
            kind: 'field',
            label: request.body.label ?? payload.label ?? '',
            value: request.body.value ?? payload.value ?? '',
          }
        : payload.kind === 'note'
        ? {
            kind: 'note',
            title: request.body.title ?? payload.title ?? '',
            body: request.body.body ?? payload.body ?? '',
          }
        : {
            kind: 'text',
            content: request.body.content ?? payload.content ?? '',
          };

      const [updatedRow] = await db
        .update(dossierAttachments)
        .set({
          payload: nextPayload,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(dossierAttachments.id, blockId))
        .returning();

      return { data: serializeBlock(updatedRow) };
    },
  );

  server.delete<{ Params: { id: string; blockId: string } }>(
    '/bible/:id/blocks/:blockId',
    async (request, reply) => {
      const { id, blockId } = request.params;
      const userId = request.user.sub;

      const result = await getEntryForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const [row] = await db.select().from(dossierAttachments).where(eq(dossierAttachments.id, blockId)).limit(1);
      if (!row || row.entityId !== id) {
        reply.code(404);
        return { error: 'not found' };
      }

      await db.delete(dossierAttachments).where(eq(dossierAttachments.id, blockId));
      reply.code(204);
    },
  );
}
