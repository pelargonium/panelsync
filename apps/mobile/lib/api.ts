import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'panelsync_auth_token';

// ── Token storage ─────────────────────────────────────────────────────────────
// SecureStore is native-only. On web we fall back to sessionStorage.

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return sessionStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') { sessionStorage.setItem(TOKEN_KEY, token); return; }
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') { sessionStorage.removeItem(TOKEN_KEY); return; }
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
}

export interface ApiUniverse {
  id: string;
  ownerId: string;
  name: string;
  coverImageUrl: string | null;
  pageSize: string;
  customPageWidth: number | null;
  customPageHeight: number | null;
  defaultIssueLength: number;
  seriesLabel: string;
  issueLabel: string;
  timelineTimescale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHierarchyLevel {
  id: string;
  universeId: string;
  name: string;
  position: number;
  createdAt: string;
}

export interface ApiContainer {
  id: string;
  universeId: string;
  levelId: string;
  parentId: string | null;
  name: string;
  number: number | null;
  status: 'draft' | 'in_review' | 'locked' | 'complete' | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDraft {
  id: string;
  universeId: string;
  name: string;
  status: 'working' | 'filed' | 'published';
  containerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPage {
  id: string;
  issueId: string;
  containerId?: string | null;
  draftId?: string | null;
  number: number;
  status: 'draft' | 'in_review' | 'locked' | 'complete';
  scriptContent: unknown;
  updatedAt: string;
}

export type ApiSeries = ApiContainer;
export type ApiIssue = ApiContainer;

interface RawApiPage {
  id: string;
  containerId: string | null;
  draftId: string | null;
  number: number;
  status: ApiPage['status'];
  updatedAt: string;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const containerCache = new Map<string, ApiContainer>();
const hierarchyCache = new Map<string, ApiHierarchyLevel[]>();

function cacheContainers(rows: ApiContainer[]): ApiContainer[] {
  rows.forEach((row) => containerCache.set(row.id, row));
  return rows;
}

function normalizePage(row: RawApiPage): ApiPage {
  return {
    ...row,
    issueId: row.containerId ?? '',
    scriptContent: null,
  };
}

function normalizePages(rows: RawApiPage[]): ApiPage[] {
  return rows.map(normalizePage);
}

async function getHierarchyLevels(universeId: string): Promise<ApiHierarchyLevel[]> {
  const cached = hierarchyCache.get(universeId);
  if (cached) return cached;

  const res = await request<{ data: ApiHierarchyLevel[] }>(`/api/hierarchy?universeId=${universeId}`);
  hierarchyCache.set(universeId, res.data);
  return res.data;
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (body: { email: string; password: string; displayName?: string }) =>
      request<{ token: string; user: ApiUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: ApiUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<{ user: ApiUser }>('/api/auth/me'),
  },

  universes: {
    list: () => request<{ data: ApiUniverse[] }>('/api/universes'),
    get: (id: string) => request<{ data: ApiUniverse }>(`/api/universes/${id}`),
    create: (body: {
      name: string;
      pageSize?: string;
      defaultIssueLength?: number;
      seriesLabel?: string;
      issueLabel?: string;
      timelineTimescale?: string;
    }) => request<{ data: ApiUniverse }>('/api/universes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<ApiUniverse>) =>
      request<{ data: ApiUniverse }>(`/api/universes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/api/universes/${id}`, { method: 'DELETE' }),
  },

  hierarchy: {
    list: async (universeId: string) => {
      const data = await getHierarchyLevels(universeId);
      return { data };
    },
    create: async (body: { universeId: string; name: string; position: number }) => {
      const res = await request<{ data: ApiHierarchyLevel }>('/api/hierarchy', { method: 'POST', body: JSON.stringify(body) });
      hierarchyCache.delete(body.universeId);
      return res;
    },
  },

  containers: {
    list: async (universeId: string, levelId?: string, parentId?: string) => {
      const params = new URLSearchParams({ universeId });
      if (levelId) params.set('levelId', levelId);
      if (parentId) params.set('parentId', parentId);
      const res = await request<{ data: ApiContainer[] }>(`/api/containers?${params.toString()}`);
      return { data: cacheContainers(res.data) };
    },
    create: async (body: { universeId: string; levelId: string; parentId?: string | null; name: string; number?: number }) => {
      const res = await request<{ data: ApiContainer }>('/api/containers', { method: 'POST', body: JSON.stringify(body) });
      cacheContainers([res.data]);
      return res;
    },
    children: async (containerId: string) => {
      const res = await request<{ data: ApiContainer[] }>(`/api/containers/${containerId}/children`);
      return { data: cacheContainers(res.data) };
    },
    pages: async (containerId: string) => {
      const res = await request<{ data: RawApiPage[] }>(`/api/containers/${containerId}/pages`);
      return { data: normalizePages(res.data) };
    },
    createPage: async (containerId: string, body?: { number?: number }) => {
      const res = await request<{ data: RawApiPage }>(`/api/containers/${containerId}/pages`, { method: 'POST', body: JSON.stringify(body ?? {}) });
      return { data: normalizePage(res.data) };
    },
    update: async (id: string, body: { name?: string; number?: number | null }) => {
      const res = await request<{ data: ApiContainer }>(`/api/containers/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      cacheContainers([res.data]);
      return res;
    },
    delete: (id: string) => request<void>(`/api/containers/${id}`, { method: 'DELETE' }),
  },

  drafts: {
    list: (universeId: string) =>
      request<{ data: ApiDraft[] }>(`/api/drafts?universeId=${universeId}`),
    create: (body: { universeId: string; name: string }) =>
      request<{ data: ApiDraft }>('/api/drafts', { method: 'POST', body: JSON.stringify(body) }),
    pages: async (draftId: string) => {
      const res = await request<{ data: RawApiPage[] }>(`/api/drafts/${draftId}/pages`);
      return { data: normalizePages(res.data) };
    },
    createPage: async (draftId: string, body?: { number?: number }) => {
      const res = await request<{ data: RawApiPage }>(`/api/drafts/${draftId}/pages`, { method: 'POST', body: JSON.stringify(body ?? {}) });
      return { data: normalizePage(res.data) };
    },
    update: (id: string, body: { name?: string; status?: ApiDraft['status']; containerId?: string | null }) =>
      request<{ data: ApiDraft }>(`/api/drafts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/api/drafts/${id}`, { method: 'DELETE' }),
  },

  pages: {
    list: (containerId: string) => api.containers.pages(containerId),
    create: (containerId: string) => api.containers.createPage(containerId),
    update: async (pageId: string, body: { status?: string; scriptContent?: unknown }) => {
      const res = await request<{ data: RawApiPage }>(`/api/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify(body) });
      return { data: normalizePage(res.data) };
    },
  },

  series: {
    list: async (universeId: string) => {
      const levels = await getHierarchyLevels(universeId);
      const seriesLevel = levels.find((level) => level.position === 1);
      if (!seriesLevel) return { data: [] as ApiSeries[] };
      return api.containers.list(universeId, seriesLevel.id);
    },
    create: async (body: { universeId: string; name: string; number?: number }) => {
      const levels = await getHierarchyLevels(body.universeId);
      const seriesLevel = levels.find((level) => level.position === 1);
      if (!seriesLevel) throw new Error('Series hierarchy level not found');
      return api.containers.create({ ...body, levelId: seriesLevel.id });
    },
    update: (id: string, body: { name?: string; arcNotes?: string }) =>
      api.containers.update(id, { name: body.name }),
    delete: (id: string) => api.containers.delete(id),
  },

  issues: {
    list: async (seriesId: string) => {
      const res = await api.containers.children(seriesId);
      return { data: res.data };
    },
    create: async (seriesId: string, body: { name: string; number?: number }) => {
      const parent = containerCache.get(seriesId);
      if (!parent) throw new Error('Parent container not loaded');

      const levels = await getHierarchyLevels(parent.universeId);
      const currentLevel = levels.find((level) => level.id === parent.levelId);
      if (!currentLevel) throw new Error('Parent hierarchy level not found');

      const childLevel = levels.find((level) => level.position === currentLevel.position + 1);
      if (!childLevel) throw new Error('Issue hierarchy level not found');

      return api.containers.create({
        universeId: parent.universeId,
        levelId: childLevel.id,
        parentId: seriesId,
        name: body.name,
        number: body.number,
      });
    },
  },
};
