import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Augment Fastify types so server.authenticate is known to TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Augment JWT types so request.user is typed
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export const authPlugin = fp(async (server: FastifyInstance) => {
  server.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  });

  server.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  );
});
