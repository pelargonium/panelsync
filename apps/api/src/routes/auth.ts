import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, 'hex');
  return timingSafeEqual(buf, storedBuf);
}

interface RegisterBody {
  email: string;
  password: string;
  displayName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/register
  server.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { email, password, displayName } = request.body;

    if (!email || !password) {
      reply.code(400);
      return { error: 'email and password are required' };
    }
    if (password.length < 8) {
      reply.code(400);
      return { error: 'password must be at least 8 characters' };
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      reply.code(409);
      return { error: 'email already in use' };
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), passwordHash, displayName: displayName ?? null })
      .returning({ id: users.id, email: users.email, displayName: users.displayName });

    const token = server.jwt.sign({ sub: user.id });
    reply.code(201);
    return { token, user };
  });

  // POST /api/auth/login
  server.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      reply.code(400);
      return { error: 'email and password are required' };
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      reply.code(401);
      return { error: 'invalid credentials' };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      reply.code(401);
      return { error: 'invalid credentials' };
    }

    const token = server.jwt.sign({ sub: user.id });
    return {
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  });

  // GET /api/auth/me — protected
  server.get('/me', { onRequest: [server.authenticate] }, async (request) => {
    const [user] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1);
    return { user };
  });
}
