import type { FastifyInstance } from 'fastify';

export async function charactersRoutes(server: FastifyInstance) {
  // GET /api/characters?worldId=...
  server.get('/', async () => {
    return { data: [] };
  });

  // GET /api/characters/:id
  server.get<{ Params: { id: string } }>('/:id', async (request) => {
    const { id } = request.params;
    return { data: null, id };
  });

  // POST /api/characters
  server.post('/', async (request, reply) => {
    reply.code(201);
    return { data: null };
  });

  // PATCH /api/characters/:id
  server.patch<{ Params: { id: string } }>('/:id', async (request) => {
    const { id } = request.params;
    return { data: null, id };
  });

  // DELETE /api/characters/:id
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    reply.code(204);
    return;
  });
}
