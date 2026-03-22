import { and, asc, desc, eq } from 'drizzle-orm';
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
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

type BibleTextPayload = {
  text?: string;
};

export async function bibleRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

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

  server.post<{ Params: { universeId: string }; Body: { name: string; type: 'character' | 'location' | 'note' } }>(
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

      const [row] = await db
        .insert(bibleEntries)
        .values({
          universeId,
          type,
          name: name.trim(),
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      reply.code(201);
      return { data: serializeEntry(row) };
    },
  );

  server.get<{ Params: { id: string } }>(
    '/bible/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const [entry] = await db.select().from(bibleEntries).where(eq(bibleEntries.id, id)).limit(1);
      if (!entry) {
        reply.code(404);
        return { error: 'not found' };
      }

      if (!await assertUniverseAccess(entry.universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
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
          ...serializeEntry(entry),
          bodyText: payload.text ?? '',
        },
      };
    },
  );

  server.patch<{ Params: { id: string }; Body: { name?: string; type?: 'character' | 'location' | 'note' } }>(
    '/bible/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const [entry] = await db.select().from(bibleEntries).where(eq(bibleEntries.id, id)).limit(1);
      if (!entry) {
        reply.code(404);
        return { error: 'not found' };
      }

      if (!await assertUniverseAccess(entry.universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
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

      const [entry] = await db.select().from(bibleEntries).where(eq(bibleEntries.id, id)).limit(1);
      if (!entry) {
        reply.code(404);
        return { error: 'not found' };
      }

      if (!await assertUniverseAccess(entry.universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
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
          universeId: entry.universeId,
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

      const [entry] = await db.select().from(bibleEntries).where(eq(bibleEntries.id, id)).limit(1);
      if (!entry) {
        reply.code(404);
        return { error: 'not found' };
      }

      if (!await assertUniverseAccess(entry.universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
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
}
