import type { FastifyInstance } from 'fastify';

export async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/register
  // TODO: validate body, hash password, insert user into DB, return token
  server.post('/register', async (_request, reply) => {
    reply.code(501);
    return { error: 'Not yet implemented' };
  });

  // POST /api/auth/login
  // TODO: look up user in DB, verify password hash, return token
  server.post('/login', async (_request, reply) => {
    reply.code(501);
    return { error: 'Not yet implemented' };
  });

  // GET /api/auth/me — protected, returns the current user from the JWT
  server.get(
    '/me',
    { onRequest: [server.authenticate] },
    async (request) => {
      return { user: request.user };
    },
  );
}
