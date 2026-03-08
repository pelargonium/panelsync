const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// In-memory token store. Replace with expo-secure-store when auth is wired up.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    register: (body: { email: string; password: string }) =>
      request<{ token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<{ user: { sub: string } }>('/api/auth/me'),
  },

  worlds: {
    list: () => request<{ data: unknown[] }>('/api/worlds'),
    get: (id: string) => request<{ data: unknown }>(`/api/worlds/${id}`),
    create: (body: unknown) =>
      request<{ data: unknown }>('/api/worlds', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: unknown) =>
      request<{ data: unknown }>(`/api/worlds/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/worlds/${id}`, { method: 'DELETE' }),
  },

  characters: {
    list: (worldId?: string) =>
      request<{ data: unknown[] }>(
        `/api/characters${worldId ? `?worldId=${worldId}` : ''}`,
      ),
    get: (id: string) => request<{ data: unknown }>(`/api/characters/${id}`),
    create: (body: unknown) =>
      request<{ data: unknown }>('/api/characters', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: unknown) =>
      request<{ data: unknown }>(`/api/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/characters/${id}`, { method: 'DELETE' }),
  },
};
