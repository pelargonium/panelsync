import { eq, and } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { universes, universeMembers } from '../db/schema.js';

interface CreateUniverseBody {
  name: string;
  pageSize?: string;
  customPageWidth?: number;
  customPageHeight?: number;
  defaultIssueLength?: number;
  seriesLabel?: string;
  issueLabel?: string;
  timelineTimescale?: string;
}

interface UpdateUniverseBody {
  name?: string;
  pageSize?: string;
  customPageWidth?: number;
  customPageHeight?: number;
  defaultIssueLength?: number;
  seriesLabel?: string;
  issueLabel?: string;
}

export async function worldsRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('onRequest', server.authenticate);

  // GET /api/worlds — list universes the caller owns or is a member of
  server.get('/', async (request) => {
    const userId = request.user.sub;

    const owned = await db
      .select()
      .from(universes)
      .where(eq(universes.ownerId, userId));

    const memberRows = await db
      .select({ universeId: universeMembers.universeId })
      .from(universeMembers)
      .where(eq(universeMembers.userId, userId));

    const memberIds = memberRows
      .map(r => r.universeId)
      .filter(id => !owned.find(u => u.id === id));

    let memberUniverses: (typeof universes.$inferSelect)[] = [];
    if (memberIds.length > 0) {
      memberUniverses = await Promise.all(
        memberIds.map(id =>
          db.select().from(universes).where(eq(universes.id, id)).limit(1).then(r => r[0])
        )
      ).then(rows => rows.filter(Boolean) as (typeof universes.$inferSelect)[]);
    }

    return { data: [...owned, ...memberUniverses] };
  });

  // GET /api/worlds/:id
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const [universe] = await db.select().from(universes).where(eq(universes.id, id)).limit(1);
    if (!universe) { reply.code(404); return { error: 'not found' }; }

    if (universe.ownerId !== userId) {
      const [membership] = await db
        .select()
        .from(universeMembers)
        .where(and(eq(universeMembers.universeId, id), eq(universeMembers.userId, userId)))
        .limit(1);
      if (!membership) { reply.code(403); return { error: 'forbidden' }; }
    }

    return { data: universe };
  });

  // POST /api/worlds
  server.post<{ Body: CreateUniverseBody }>('/', async (request, reply) => {
    const userId = request.user.sub;
    const { name, pageSize, customPageWidth, customPageHeight, defaultIssueLength, seriesLabel, issueLabel, timelineTimescale } = request.body;

    if (!name?.trim()) { reply.code(400); return { error: 'name is required' }; }

    const [universe] = await db
      .insert(universes)
      .values({
        ownerId: userId,
        name: name.trim(),
        pageSize: (pageSize as any) ?? 'us_comic',
        customPageWidth: customPageWidth ?? null,
        customPageHeight: customPageHeight ?? null,
        defaultIssueLength: defaultIssueLength ?? 22,
        seriesLabel: seriesLabel ?? 'Series',
        issueLabel: issueLabel ?? 'Issue',
        timelineTimescale: timelineTimescale ?? 'pure_sequence',
      })
      .returning();

    // Owner membership row
    await db.insert(universeMembers).values({
      universeId: universe.id,
      userId,
      role: 'owner',
      accessScope: 'universe',
    });

    reply.code(201);
    return { data: universe };
  });

  // PATCH /api/worlds/:id
  server.patch<{ Params: { id: string }; Body: UpdateUniverseBody }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const [universe] = await db.select().from(universes).where(eq(universes.id, id)).limit(1);
    if (!universe) { reply.code(404); return { error: 'not found' }; }
    if (universe.ownerId !== userId) { reply.code(403); return { error: 'only the owner can update universe settings' }; }

    const updates: Partial<typeof universes.$inferInsert> = { updatedAt: new Date() };
    const b = request.body;
    if (b.name !== undefined)               updates.name = b.name.trim();
    if (b.pageSize !== undefined)           updates.pageSize = b.pageSize as any;
    if (b.customPageWidth !== undefined)    updates.customPageWidth = b.customPageWidth;
    if (b.customPageHeight !== undefined)   updates.customPageHeight = b.customPageHeight;
    if (b.defaultIssueLength !== undefined) updates.defaultIssueLength = b.defaultIssueLength;
    if (b.seriesLabel !== undefined)        updates.seriesLabel = b.seriesLabel;
    if (b.issueLabel !== undefined)         updates.issueLabel = b.issueLabel;

    const [updated] = await db.update(universes).set(updates).where(eq(universes.id, id)).returning();
    return { data: updated };
  });

  // DELETE /api/worlds/:id
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const [universe] = await db.select().from(universes).where(eq(universes.id, id)).limit(1);
    if (!universe) { reply.code(404); return { error: 'not found' }; }
    if (universe.ownerId !== userId) { reply.code(403); return { error: 'only the owner can delete a universe' }; }

    await db.delete(universes).where(eq(universes.id, id));
    reply.code(204);
  });
}
