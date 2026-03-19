import { eq, and, asc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { series, issues, pages, universes, universeMembers } from '../db/schema.js';

// Helper: verify the caller has access to the universe (owner or member)
async function assertUniverseAccess(universeId: string, userId: string): Promise<boolean> {
  const [universe] = await db.select({ ownerId: universes.ownerId }).from(universes).where(eq(universes.id, universeId)).limit(1);
  if (!universe) return false;
  if (universe.ownerId === userId) return true;
  const [m] = await db.select().from(universeMembers)
    .where(and(eq(universeMembers.universeId, universeId), eq(universeMembers.userId, userId)))
    .limit(1);
  return !!m;
}

export async function seriesRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  // ── Series ────────────────────────────────────────────────────────────────

  // GET /api/series?universeId=
  server.get<{ Querystring: { universeId: string } }>('/', async (request, reply) => {
    const { universeId } = request.query;
    const userId = request.user.sub;
    if (!universeId) { reply.code(400); return { error: 'universeId is required' }; }
    if (!await assertUniverseAccess(universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

    const rows = await db.select().from(series)
      .where(eq(series.universeId, universeId))
      .orderBy(asc(series.number));
    return { data: rows };
  });

  // POST /api/series
  server.post<{ Body: { universeId: string; name: string; number?: number } }>('/', async (request, reply) => {
    const { universeId, name, number } = request.body;
    const userId = request.user.sub;
    if (!universeId || !name?.trim()) { reply.code(400); return { error: 'universeId and name are required' }; }
    if (!await assertUniverseAccess(universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

    // Auto-number if not provided
    let num = number;
    if (!num) {
      const existing = await db.select({ number: series.number }).from(series).where(eq(series.universeId, universeId));
      num = existing.length > 0 ? Math.max(...existing.map(r => r.number)) + 1 : 1;
    }

    const [row] = await db.insert(series).values({ universeId, name: name.trim(), number: num }).returning();
    reply.code(201);
    return { data: row };
  });

  // PATCH /api/series/:id
  server.patch<{ Params: { id: string }; Body: { name?: string; arcNotes?: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const [row] = await db.select().from(series).where(eq(series.id, id)).limit(1);
    if (!row) { reply.code(404); return { error: 'not found' }; }
    if (!await assertUniverseAccess(row.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

    const updates: Partial<typeof series.$inferInsert> = { updatedAt: new Date() };
    if (request.body.name !== undefined)     updates.name = request.body.name.trim();
    if (request.body.arcNotes !== undefined) updates.arcNotes = request.body.arcNotes;

    const [updated] = await db.update(series).set(updates).where(eq(series.id, id)).returning();
    return { data: updated };
  });

  // DELETE /api/series/:id
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const [row] = await db.select().from(series).where(eq(series.id, id)).limit(1);
    if (!row) { reply.code(404); return { error: 'not found' }; }
    if (!await assertUniverseAccess(row.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

    await db.delete(series).where(eq(series.id, id));
    reply.code(204);
  });

  // ── Issues ────────────────────────────────────────────────────────────────

  // GET /api/series/:seriesId/issues
  server.get<{ Params: { seriesId: string } }>('/:seriesId/issues', async (request, reply) => {
    const { seriesId } = request.params;
    const userId = request.user.sub;

    const [s] = await db.select().from(series).where(eq(series.id, seriesId)).limit(1);
    if (!s) { reply.code(404); return { error: 'series not found' }; }
    if (!await assertUniverseAccess(s.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

    const rows = await db.select().from(issues).where(eq(issues.seriesId, seriesId)).orderBy(asc(issues.number));
    return { data: rows };
  });

  // POST /api/series/:seriesId/issues
  server.post<{ Params: { seriesId: string }; Body: { name: string; number?: number } }>(
    '/:seriesId/issues', async (request, reply) => {
      const { seriesId } = request.params;
      const { name, number } = request.body;
      const userId = request.user.sub;

      const [s] = await db.select().from(series).where(eq(series.id, seriesId)).limit(1);
      if (!s) { reply.code(404); return { error: 'series not found' }; }
      if (!await assertUniverseAccess(s.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }
      if (!name?.trim()) { reply.code(400); return { error: 'name is required' }; }

      let num = number;
      if (!num) {
        const existing = await db.select({ number: issues.number }).from(issues).where(eq(issues.seriesId, seriesId));
        num = existing.length > 0 ? Math.max(...existing.map(r => r.number)) + 1 : 1;
      }

      const [row] = await db.insert(issues).values({ seriesId, name: name.trim(), number: num }).returning();
      reply.code(201);
      return { data: row };
    }
  );

  // ── Pages ─────────────────────────────────────────────────────────────────

  // GET /api/series/issues/:issueId/pages
  server.get<{ Params: { issueId: string } }>('/issues/:issueId/pages', async (request, reply) => {
    const { issueId } = request.params;
    const userId = request.user.sub;

    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
    if (!issue) { reply.code(404); return { error: 'issue not found' }; }
    const [s] = await db.select().from(series).where(eq(series.id, issue.seriesId)).limit(1);
    if (!await assertUniverseAccess(s!.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

    const rows = await db.select().from(pages).where(eq(pages.issueId, issueId)).orderBy(asc(pages.number));
    return { data: rows };
  });

  // POST /api/series/issues/:issueId/pages
  server.post<{ Params: { issueId: string }; Body: { number?: number } }>(
    '/issues/:issueId/pages', async (request, reply) => {
      const { issueId } = request.params;
      const userId = request.user.sub;

      const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
      if (!issue) { reply.code(404); return { error: 'issue not found' }; }
      const [s] = await db.select().from(series).where(eq(series.id, issue.seriesId)).limit(1);
      if (!await assertUniverseAccess(s!.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

      let num = request.body?.number;
      if (!num) {
        const existing = await db.select({ number: pages.number }).from(pages).where(eq(pages.issueId, issueId));
        num = existing.length > 0 ? Math.max(...existing.map(r => r.number)) + 1 : 1;
      }

      const [row] = await db.insert(pages).values({ issueId, number: num, updatedBy: userId }).returning();
      reply.code(201);
      return { data: row };
    }
  );

  // PATCH /api/series/issues/pages/:pageId
  server.patch<{ Params: { pageId: string }; Body: { status?: string; scriptContent?: unknown } }>(
    '/issues/pages/:pageId', async (request, reply) => {
      const { pageId } = request.params;
      const userId = request.user.sub;

      const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
      if (!page) { reply.code(404); return { error: 'not found' }; }
      const [issue] = await db.select().from(issues).where(eq(issues.id, page.issueId)).limit(1);
      const [s] = await db.select().from(series).where(eq(series.id, issue!.seriesId)).limit(1);
      if (!await assertUniverseAccess(s!.universeId, userId)) { reply.code(403); return { error: 'forbidden' }; }

      // Locked pages cannot be edited
      if (page.status === 'locked') { reply.code(403); return { error: 'page is locked' }; }

      const updates: Partial<typeof pages.$inferInsert> = { updatedAt: new Date(), updatedBy: userId };
      if (request.body.status !== undefined)        updates.status = request.body.status as any;
      if (request.body.scriptContent !== undefined) updates.scriptContent = request.body.scriptContent as any;

      const [updated] = await db.update(pages).set(updates).where(eq(pages.id, pageId)).returning();
      return { data: updated };
    }
  );
}
