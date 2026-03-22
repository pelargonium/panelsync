import { and, asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import {
  containers,
  drafts,
  hierarchyLevels,
  pages,
  universes,
  universeMembers,
  workspaceState,
} from '../db/schema.js';

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

async function getContainerForAccess(containerId: string, userId: string) {
  const [container] = await db.select().from(containers).where(eq(containers.id, containerId)).limit(1);
  if (!container) return { error: 'not found' as const };
  if (!await assertUniverseAccess(container.universeId, userId)) return { error: 'forbidden' as const };
  return { container };
}

async function getDraftForAccess(draftId: string, userId: string) {
  const [draft] = await db.select().from(drafts).where(eq(drafts.id, draftId)).limit(1);
  if (!draft) return { error: 'not found' as const };
  if (!await assertUniverseAccess(draft.universeId, userId)) return { error: 'forbidden' as const };
  return { draft };
}

async function getPageUniverseId(pageId: string): Promise<string | null> {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) return null;

  if (page.containerId) {
    const [container] = await db
      .select({ universeId: containers.universeId })
      .from(containers)
      .where(eq(containers.id, page.containerId))
      .limit(1);
    return container?.universeId ?? null;
  }

  if (page.draftId) {
    const [draft] = await db
      .select({ universeId: drafts.universeId })
      .from(drafts)
      .where(eq(drafts.id, page.draftId))
      .limit(1);
    return draft?.universeId ?? null;
  }

  return null;
}

function defaultWorkspaceState() {
  return {
    activeEntityType: null,
    activeEntityId: null,
    depthState: 'entity_only' as const,
    binderOpen: true,
    warmContexts: [],
  };
}

export async function containersRoutes(server: FastifyInstance) {
  server.addHook('onRequest', server.authenticate);

  server.get<{ Querystring: { universeId?: string; levelId?: string; parentId?: string } }>(
    '/api/containers',
    async (request, reply) => {
      const { universeId, levelId, parentId } = request.query;
      const userId = request.user.sub;

      if (!universeId) {
        reply.code(400);
        return { error: 'universeId is required' };
      }

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const filters = [eq(containers.universeId, universeId)];
      if (levelId) filters.push(eq(containers.levelId, levelId));
      if (parentId) filters.push(eq(containers.parentId, parentId));

      const rows = await db
        .select()
        .from(containers)
        .where(and(...filters))
        .orderBy(asc(containers.number), asc(containers.createdAt));

      return { data: rows };
    },
  );

  server.post<{ Body: { universeId: string; levelId: string; parentId?: string | null; name: string; number?: number | null } }>(
    '/api/containers',
    async (request, reply) => {
      const { universeId, levelId, parentId, name, number } = request.body;
      const userId = request.user.sub;

      if (!universeId || !levelId || !name?.trim()) {
        reply.code(400);
        return { error: 'universeId, levelId, and name are required' };
      }

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const [level] = await db
        .select({ id: hierarchyLevels.id, universeId: hierarchyLevels.universeId })
        .from(hierarchyLevels)
        .where(eq(hierarchyLevels.id, levelId))
        .limit(1);

      if (!level || level.universeId !== universeId) {
        reply.code(400);
        return { error: 'invalid levelId' };
      }

      if (parentId) {
        const parentResult = await getContainerForAccess(parentId, userId);
        if ('error' in parentResult) {
          reply.code(parentResult.error === 'not found' ? 404 : 403);
          return { error: parentResult.error };
        }
        if (parentResult.container.universeId !== universeId) {
          reply.code(400);
          return { error: 'parent container must belong to the same universe' };
        }
      }

      const [row] = await db
        .insert(containers)
        .values({
          universeId,
          levelId,
          parentId: parentId ?? null,
          name: name.trim(),
          number: number ?? null,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      reply.code(201);
      return { data: row };
    },
  );

  server.patch<{ Params: { id: string }; Body: { name?: string; number?: number | null } }>(
    '/api/containers/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const result = await getContainerForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      const updates: Partial<typeof containers.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      if (request.body.name !== undefined) updates.name = request.body.name.trim();
      if (request.body.number !== undefined) updates.number = request.body.number;

      const [row] = await db.update(containers).set(updates).where(eq(containers.id, id)).returning();
      return { data: row };
    },
  );

  server.delete<{ Params: { id: string } }>('/api/containers/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const result = await getContainerForAccess(id, userId);
    if ('error' in result) {
      reply.code(result.error === 'not found' ? 404 : 403);
      return { error: result.error };
    }

    await db.delete(containers).where(eq(containers.id, id));
    reply.code(204);
  });

  server.get<{ Params: { containerId: string } }>('/api/containers/:containerId/children', async (request, reply) => {
    const { containerId } = request.params;
    const userId = request.user.sub;

    const result = await getContainerForAccess(containerId, userId);
    if ('error' in result) {
      reply.code(result.error === 'not found' ? 404 : 403);
      return { error: result.error };
    }

    const rows = await db
      .select()
      .from(containers)
      .where(eq(containers.parentId, containerId))
      .orderBy(asc(containers.number), asc(containers.createdAt));

    return { data: rows };
  });

  server.get<{ Params: { containerId: string } }>('/api/containers/:containerId/pages', async (request, reply) => {
    const { containerId } = request.params;
    const userId = request.user.sub;

    const result = await getContainerForAccess(containerId, userId);
    if ('error' in result) {
      reply.code(result.error === 'not found' ? 404 : 403);
      return { error: result.error };
    }

    const rows = await db
      .select()
      .from(pages)
      .where(eq(pages.containerId, containerId))
      .orderBy(asc(pages.number));

    return { data: rows };
  });

  server.post<{ Params: { containerId: string }; Body: { number?: number } }>(
    '/api/containers/:containerId/pages',
    async (request, reply) => {
      const { containerId } = request.params;
      const userId = request.user.sub;

      const result = await getContainerForAccess(containerId, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      let number = request.body?.number;
      if (!number) {
        const existing = await db
          .select({ number: pages.number })
          .from(pages)
          .where(eq(pages.containerId, containerId));
        number = existing.length > 0 ? Math.max(...existing.map((row) => row.number)) + 1 : 1;
      }

      const [row] = await db
        .insert(pages)
        .values({
          containerId,
          number,
          updatedBy: userId,
        })
        .returning();

      reply.code(201);
      return { data: row };
    },
  );

  server.get<{ Querystring: { universeId?: string } }>('/api/hierarchy', async (request, reply) => {
    const { universeId } = request.query;
    const userId = request.user.sub;

    if (!universeId) {
      reply.code(400);
      return { error: 'universeId is required' };
    }

    if (!await assertUniverseAccess(universeId, userId)) {
      reply.code(403);
      return { error: 'forbidden' };
    }

    const rows = await db
      .select()
      .from(hierarchyLevels)
      .where(eq(hierarchyLevels.universeId, universeId))
      .orderBy(asc(hierarchyLevels.position));

    return { data: rows };
  });

  server.post<{ Body: { universeId: string; name: string; position: number } }>(
    '/api/hierarchy',
    async (request, reply) => {
      const { universeId, name, position } = request.body;
      const userId = request.user.sub;

      if (!universeId || !name?.trim() || position === undefined) {
        reply.code(400);
        return { error: 'universeId, name, and position are required' };
      }

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const [row] = await db
        .insert(hierarchyLevels)
        .values({ universeId, name: name.trim(), position })
        .returning();

      reply.code(201);
      return { data: row };
    },
  );

  server.patch<{ Params: { id: string }; Body: { name?: string; position?: number } }>(
    '/api/hierarchy/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const [level] = await db.select().from(hierarchyLevels).where(eq(hierarchyLevels.id, id)).limit(1);
      if (!level) {
        reply.code(404);
        return { error: 'not found' };
      }

      if (!await assertUniverseAccess(level.universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      const updates: Partial<typeof hierarchyLevels.$inferInsert> = {};
      if (request.body.name !== undefined) updates.name = request.body.name.trim();
      if (request.body.position !== undefined) updates.position = request.body.position;

      const [row] = await db.update(hierarchyLevels).set(updates).where(eq(hierarchyLevels.id, id)).returning();
      return { data: row };
    },
  );

  server.delete<{ Params: { id: string } }>('/api/hierarchy/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const [level] = await db.select().from(hierarchyLevels).where(eq(hierarchyLevels.id, id)).limit(1);
    if (!level) {
      reply.code(404);
      return { error: 'not found' };
    }

    if (!await assertUniverseAccess(level.universeId, userId)) {
      reply.code(403);
      return { error: 'forbidden' };
    }

    await db.delete(hierarchyLevels).where(eq(hierarchyLevels.id, id));
    reply.code(204);
  });

  server.get<{ Querystring: { universeId?: string } }>('/api/drafts', async (request, reply) => {
    const { universeId } = request.query;
    const userId = request.user.sub;

    if (!universeId) {
      reply.code(400);
      return { error: 'universeId is required' };
    }

    if (!await assertUniverseAccess(universeId, userId)) {
      reply.code(403);
      return { error: 'forbidden' };
    }

    const rows = await db
      .select()
      .from(drafts)
      .where(eq(drafts.universeId, universeId))
      .orderBy(asc(drafts.updatedAt));

    return { data: rows };
  });

  server.post<{ Body: { universeId: string; name: string } }>('/api/drafts', async (request, reply) => {
    const { universeId, name } = request.body;
    const userId = request.user.sub;

    if (!universeId || !name?.trim()) {
      reply.code(400);
      return { error: 'universeId and name are required' };
    }

    if (!await assertUniverseAccess(universeId, userId)) {
      reply.code(403);
      return { error: 'forbidden' };
    }

    const [row] = await db
      .insert(drafts)
      .values({
        universeId,
        name: name.trim(),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    reply.code(201);
    return { data: row };
  });

  server.patch<{ Params: { id: string }; Body: { name?: string; status?: 'working' | 'filed' | 'published'; containerId?: string | null } }>(
    '/api/drafts/:id',
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const result = await getDraftForAccess(id, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      if (request.body.containerId) {
        const parentResult = await getContainerForAccess(request.body.containerId, userId);
        if ('error' in parentResult) {
          reply.code(parentResult.error === 'not found' ? 404 : 403);
          return { error: parentResult.error };
        }
        if (parentResult.container.universeId !== result.draft.universeId) {
          reply.code(400);
          return { error: 'containerId must belong to the same universe' };
        }
      }

      const updates: Partial<typeof drafts.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      if (request.body.name !== undefined) updates.name = request.body.name.trim();
      if (request.body.status !== undefined) updates.status = request.body.status;
      if (request.body.containerId !== undefined) updates.containerId = request.body.containerId;

      const [row] = await db.update(drafts).set(updates).where(eq(drafts.id, id)).returning();
      return { data: row };
    },
  );

  server.delete<{ Params: { id: string } }>('/api/drafts/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const result = await getDraftForAccess(id, userId);
    if ('error' in result) {
      reply.code(result.error === 'not found' ? 404 : 403);
      return { error: result.error };
    }

    await db.delete(drafts).where(eq(drafts.id, id));
    reply.code(204);
  });

  server.get<{ Params: { draftId: string } }>('/api/drafts/:draftId/pages', async (request, reply) => {
    const { draftId } = request.params;
    const userId = request.user.sub;

    const result = await getDraftForAccess(draftId, userId);
    if ('error' in result) {
      reply.code(result.error === 'not found' ? 404 : 403);
      return { error: result.error };
    }

    const rows = await db
      .select()
      .from(pages)
      .where(eq(pages.draftId, draftId))
      .orderBy(asc(pages.number));

    return { data: rows };
  });

  server.post<{ Params: { draftId: string }; Body: { number?: number } }>(
    '/api/drafts/:draftId/pages',
    async (request, reply) => {
      const { draftId } = request.params;
      const userId = request.user.sub;

      const result = await getDraftForAccess(draftId, userId);
      if ('error' in result) {
        reply.code(result.error === 'not found' ? 404 : 403);
        return { error: result.error };
      }

      let number = request.body?.number;
      if (!number) {
        const existing = await db
          .select({ number: pages.number })
          .from(pages)
          .where(eq(pages.draftId, draftId));
        number = existing.length > 0 ? Math.max(...existing.map((row) => row.number)) + 1 : 1;
      }

      const [row] = await db
        .insert(pages)
        .values({
          draftId,
          number,
          updatedBy: userId,
        })
        .returning();

      reply.code(201);
      return { data: row };
    },
  );

  server.patch<{ Params: { pageId: string }; Body: { status?: 'draft' | 'in_review' | 'locked' | 'complete' } }>(
    '/api/pages/:pageId',
    async (request, reply) => {
      const { pageId } = request.params;
      const userId = request.user.sub;

      const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
      if (!page) {
        reply.code(404);
        return { error: 'not found' };
      }

      const universeId = await getPageUniverseId(pageId);
      if (!universeId) {
        reply.code(400);
        return { error: 'page is not attached to a container or draft' };
      }

      if (!await assertUniverseAccess(universeId, userId)) {
        reply.code(403);
        return { error: 'forbidden' };
      }

      if (page.status === 'locked') {
        reply.code(403);
        return { error: 'page is locked' };
      }

      const updates: Partial<typeof pages.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      if (request.body.status !== undefined) updates.status = request.body.status;

      const [row] = await db.update(pages).set(updates).where(eq(pages.id, pageId)).returning();
      return { data: row };
    },
  );

  server.get<{ Querystring: { universeId?: string } }>('/api/workspace-state', async (request, reply) => {
    const { universeId } = request.query;
    const userId = request.user.sub;

    if (!universeId) {
      reply.code(400);
      return { error: 'universeId is required' };
    }

    if (!await assertUniverseAccess(universeId, userId)) {
      reply.code(403);
      return { error: 'forbidden' };
    }

    const [row] = await db
      .select()
      .from(workspaceState)
      .where(and(
        eq(workspaceState.universeId, universeId),
        eq(workspaceState.userId, userId),
      ))
      .limit(1);

    if (!row) {
      return { data: defaultWorkspaceState() };
    }

    return {
      data: {
        activeEntityType: row.activeEntityType,
        activeEntityId: row.activeEntityId,
        depthState: row.depthState,
        binderOpen: row.binderOpen,
        warmContexts: row.warmContexts,
      },
    };
  });

  server.put<{
    Body: {
      universeId: string;
      activeEntityType?: string | null;
      activeEntityId?: string | null;
      depthState?: 'entity_only' | 'split' | 'dossier_only';
      binderOpen?: boolean;
      warmContexts?: Array<{ entityType: string; entityId: string; depthState: string }>;
    };
  }>('/api/workspace-state', async (request, reply) => {
    const { universeId } = request.body;
    const userId = request.user.sub;

    if (!universeId) {
      reply.code(400);
      return { error: 'universeId is required' };
    }

    if (!await assertUniverseAccess(universeId, userId)) {
      reply.code(403);
      return { error: 'forbidden' };
    }

    const [existing] = await db
      .select()
      .from(workspaceState)
      .where(and(
        eq(workspaceState.universeId, universeId),
        eq(workspaceState.userId, userId),
      ))
      .limit(1);

    const nextValues = {
      activeEntityType: request.body.activeEntityType ?? null,
      activeEntityId: request.body.activeEntityId ?? null,
      depthState: request.body.depthState ?? 'entity_only',
      binderOpen: request.body.binderOpen ?? true,
      warmContexts: request.body.warmContexts ?? [],
      updatedAt: new Date(),
    };

    const [row] = existing
      ? await db
          .update(workspaceState)
          .set(nextValues)
          .where(eq(workspaceState.id, existing.id))
          .returning()
      : await db
          .insert(workspaceState)
          .values({
            universeId,
            userId,
            ...nextValues,
          })
          .returning();

    return {
      data: {
        activeEntityType: row.activeEntityType,
        activeEntityId: row.activeEntityId,
        depthState: row.depthState,
        binderOpen: row.binderOpen,
        warmContexts: row.warmContexts,
      },
    };
  });
}
