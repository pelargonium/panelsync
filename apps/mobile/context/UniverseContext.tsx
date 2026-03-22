import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, getToken, type ApiBibleEntry, type ApiPage } from '../lib/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type DepthState = 'entity_only' | 'split' | 'dossier_only';

export interface WarmContext {
  entityType: string;
  entityId: string;
  depthState: DepthState;
}

interface WorkspaceStateResponse {
  data: {
    activeEntityType: string | null;
    activeEntityId: string | null;
    depthState: DepthState;
    binderOpen: boolean;
    warmContexts: WarmContext[];
  };
}

interface UniverseContextValue {
  universeId: string;
  universeName: string;
  entities: ApiBibleEntry[];
  loadingEntities: boolean;
  refreshEntities: () => Promise<void>;
  createEntity: (type: ApiBibleEntry['type']) => Promise<ApiBibleEntry>;
  deleteEntity: (id: string) => Promise<void>;
  updateEntityName: (id: string, name: string) => void;
  pagesByContainer: Record<string, ApiPage[]>;
  loadPages: (containerId: string) => Promise<void>;
  binderOpen: boolean;
  setBinderOpen: (open: boolean) => void;
  activeEntityType: string | null;
  activeEntityId: string | null;
  depthState: DepthState;
  activateEntity: (type: string, id: string) => void;
  cycleDepthState: () => void;
  warmContexts: WarmContext[];
}

const UniverseContext = createContext<UniverseContextValue | null>(null);

async function requestWorkspaceState<T>(path: string, options?: RequestInit): Promise<T> {
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

  return res.json() as Promise<T>;
}

function normalizeWarmContexts(input: WarmContext[] | unknown): WarmContext[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is WarmContext => (
      !!item &&
      typeof item === 'object' &&
      typeof (item as WarmContext).entityType === 'string' &&
      typeof (item as WarmContext).entityId === 'string' &&
      typeof (item as WarmContext).depthState === 'string'
    ))
    .slice(0, 10)
    .map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      depthState: item.depthState,
    }));
}

function cycleDepth(current: DepthState): DepthState {
  if (current === 'entity_only') return 'split';
  if (current === 'split') return 'dossier_only';
  return 'entity_only';
}

function defaultNameForType(type: ApiBibleEntry['type']) {
  if (type === 'character') return 'Untitled Character';
  if (type === 'location') return 'Untitled Location';
  return 'Untitled Note';
}

export function UniverseProvider({
  universeId,
  universeName,
  children,
}: {
  universeId: string;
  universeName: string;
  children: ReactNode;
}) {
  const [entities, setEntities] = useState<ApiBibleEntry[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [pagesByContainer] = useState<Record<string, ApiPage[]>>({});
  const [binderOpenState, setBinderOpenState] = useState(true);
  const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [depthState, setDepthState] = useState<DepthState>('entity_only');
  const [warmContexts, setWarmContexts] = useState<WarmContext[]>([]);
  const hasHydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshEntities() {
    const res = await api.bible.list(universeId);
    setEntities(res.data);
  }

  useEffect(() => {
    let cancelled = false;
    hasHydratedRef.current = false;
    setLoadingEntities(true);
    setEntities([]);

    Promise.all([
      api.bible.list(universeId),
      requestWorkspaceState<WorkspaceStateResponse>(`/api/workspace-state?universeId=${universeId}`),
    ])
      .then(([entitiesRes, workspaceRes]) => {
        if (cancelled) return;
        setEntities(entitiesRes.data);
        setBinderOpenState(workspaceRes.data.binderOpen);
        setActiveEntityType(workspaceRes.data.activeEntityType);
        setActiveEntityId(workspaceRes.data.activeEntityId);
        setDepthState(workspaceRes.data.depthState);
        setWarmContexts(normalizeWarmContexts(workspaceRes.data.warmContexts));
        hasHydratedRef.current = true;
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEntities(false);
        }
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [universeId]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      requestWorkspaceState<WorkspaceStateResponse>('/api/workspace-state', {
        method: 'PUT',
        body: JSON.stringify({
          universeId,
          activeEntityType,
          activeEntityId,
          depthState,
          binderOpen: binderOpenState,
          warmContexts,
        }),
      }).catch(() => {});
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [universeId, activeEntityType, activeEntityId, depthState, binderOpenState, warmContexts]);

  function activateEntity(type: string, id: string) {
    const isSameEntity = activeEntityType === type && activeEntityId === id;
    const nextDepth = isSameEntity ? depthState : 'entity_only';

    setActiveEntityType(type);
    setActiveEntityId(id);
    if (!isSameEntity) {
      setDepthState(nextDepth);
    }

    setWarmContexts((current) => {
      const nextEntry: WarmContext = { entityType: type, entityId: id, depthState: nextDepth };
      return [nextEntry, ...current.filter((item) => item.entityId !== id)].slice(0, 10);
    });
  }

  function cycleDepthState() {
    setDepthState((current) => cycleDepth(current));
  }

  function setBinderOpen(open: boolean) {
    setBinderOpenState(open);
  }

  async function createEntity(type: ApiBibleEntry['type']) {
    const res = await api.bible.create(universeId, {
      type,
      name: defaultNameForType(type),
    });

    setEntities((current) => [...current, res.data]);
    return res.data;
  }

  async function deleteEntity(id: string) {
    await api.bible.delete(id);

    setEntities((current) => current.filter((entry) => entry.id !== id));
    setWarmContexts((current) => current.filter((entry) => entry.entityId !== id));

    if (activeEntityId === id) {
      setActiveEntityType(null);
      setActiveEntityId(null);
    }
  }

  function updateEntityName(id: string, name: string) {
    setEntities((current) => current.map((entry) => (
      entry.id === id
        ? { ...entry, name, updatedAt: new Date().toISOString() }
        : entry
    )));
  }

  async function loadPages(_containerId: string) {}

  return (
    <UniverseContext.Provider
      value={{
        universeId,
        universeName,
        entities,
        loadingEntities,
        refreshEntities,
        createEntity,
        deleteEntity,
        updateEntityName,
        pagesByContainer,
        loadPages,
        binderOpen: binderOpenState,
        setBinderOpen,
        activeEntityType,
        activeEntityId,
        depthState,
        activateEntity,
        cycleDepthState,
        warmContexts,
      }}
    >
      {children}
    </UniverseContext.Provider>
  );
}

export function useUniverse() {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error('useUniverse must be used within UniverseProvider');
  return ctx;
}
