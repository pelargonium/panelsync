import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { worldsRoutes } from './routes/worlds.js';
import { charactersRoutes } from './routes/characters.js';

const server = Fastify({ logger: true });

await server.register(cors, { origin: true });
await server.register(authPlugin);

server.register(healthRoutes);
server.register(authRoutes, { prefix: '/api/auth' });
server.register(worldsRoutes, { prefix: '/api/worlds' });
server.register(charactersRoutes, { prefix: '/api/characters' });

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await server.listen({ port, host });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
