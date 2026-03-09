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

export interface ApiSeries {
  id: string;
  universeId: string;
  number: number;
  name: string;
  arcNotes: string;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiIssue {
  id: string;
  seriesId: string;
  number: number;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPage {
  id: string;
  issueId: string;
  number: number;
  status: 'draft' | 'in_review' | 'locked' | 'complete';
  scriptContent: unknown;
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
    list: () => request<{ data: ApiUniverse[] }>('/api/worlds'),
    get: (id: string) => request<{ data: ApiUniverse }>(`/api/worlds/${id}`),
    create: (body: {
      name: string;
      pageSize?: string;
      defaultIssueLength?: number;
      seriesLabel?: string;
      issueLabel?: string;
      timelineTimescale?: string;
    }) => request<{ data: ApiUniverse }>('/api/worlds', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<ApiUniverse>) =>
      request<{ data: ApiUniverse }>(`/api/worlds/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/api/worlds/${id}`, { method: 'DELETE' }),
  },

  series: {
    list: (universeId: string) =>
      request<{ data: ApiSeries[] }>(`/api/series?universeId=${universeId}`),
    create: (body: { universeId: string; name: string; number?: number }) =>
      request<{ data: ApiSeries }>('/api/series', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; arcNotes?: string }) =>
      request<{ data: ApiSeries }>(`/api/series/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/api/series/${id}`, { method: 'DELETE' }),
  },

  issues: {
    list: (seriesId: string) =>
      request<{ data: ApiIssue[] }>(`/api/series/${seriesId}/issues`),
    create: (seriesId: string, body: { name: string; number?: number }) =>
      request<{ data: ApiIssue }>(`/api/series/${seriesId}/issues`, { method: 'POST', body: JSON.stringify(body) }),
  },

  pages: {
    list: (issueId: string) =>
      request<{ data: ApiPage[] }>(`/api/series/issues/${issueId}/pages`),
    create: (issueId: string) =>
      request<{ data: ApiPage }>(`/api/series/issues/${issueId}/pages`, { method: 'POST', body: JSON.stringify({}) }),
    update: (pageId: string, body: { status?: string; scriptContent?: unknown }) =>
      request<{ data: ApiPage }>(`/api/series/issues/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
};
