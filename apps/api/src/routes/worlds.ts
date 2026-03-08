import type { FastifyInstance } from 'fastify';

export async function worldsRoutes(server: FastifyInstance) {
  // GET /api/worlds
  server.get('/', async () => {
    return { data: [] };
  });

  // GET /api/worlds/:id
  server.get<{ Params: { id: string } }>('/:id', async (request) => {
    const { id } = request.params;
    return { data: null, id };
  });

  // POST /api/worlds
  server.post('/', async (request, reply) => {
    reply.code(201);
    return { data: null };
  });

  // PATCH /api/worlds/:id
  server.patch<{ Params: { id: string } }>('/:id', async (request) => {
    const { id } = request.params;
    return { data: null, id };
  });

  // DELETE /api/worlds/:id
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    reply.code(204);
    return;
  });
}
