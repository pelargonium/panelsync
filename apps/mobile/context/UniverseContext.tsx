import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, getToken, type ApiContainer, type ApiHierarchyLevel, type ApiPage } from '../lib/api';

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
  hierarchyLevels: ApiHierarchyLevel[];
  containers: ApiContainer[];
  loadingContainers: boolean;
  refreshContainers: () => Promise<void>;
  pagesByContainer: Record<string, ApiPage[]>;
  loadPages: (containerId: string) => Promise<void>;
  addPage: (containerId: string, page: ApiPage) => void;
  binderOpen: boolean;
  setBinderOpen: (open: boolean) => void;
  activeEntityType: string | null;
  activeEntityId: string | null;
  depthState: DepthState;
  activateEntity: (type: string, id: string) => void;
  cycleDepthState: () => void;
  warmContexts: WarmContext[];
  createContainer: (levelId: string, parentId: string | null, name: string) => Promise<ApiContainer>;
  createPage: (containerId: string) => Promise<ApiPage>;
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

export function UniverseProvider({
  universeId,
  universeName,
  children,
}: {
  universeId: string;
  universeName: string;
  children: ReactNode;
}) {
  const [hierarchyLevels, setHierarchyLevels] = useState<ApiHierarchyLevel[]>([]);
  const [containers, setContainers] = useState<ApiContainer[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(true);
  const [pagesByContainer, setPagesByContainer] = useState<Record<string, ApiPage[]>>({});
  const [binderOpenState, setBinderOpenState] = useState(true);
  const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [depthState, setDepthState] = useState<DepthState>('entity_only');
  const [warmContexts, setWarmContexts] = useState<WarmContext[]>([]);
  const hasHydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshContainers() {
    setLoadingContainers(true);
    try {
      const [levelsRes, containersRes, workspaceRes] = await Promise.all([
        api.hierarchy.list(universeId),
        api.containers.list(universeId),
        requestWorkspaceState<WorkspaceStateResponse>(`/api/workspace-state?universeId=${universeId}`),
      ]);

      setHierarchyLevels(levelsRes.data);
      setContainers(containersRes.data);
      setBinderOpenState(workspaceRes.data.binderOpen);
      setActiveEntityType(workspaceRes.data.activeEntityType);
      setActiveEntityId(workspaceRes.data.activeEntityId);
      setDepthState(workspaceRes.data.depthState);
      setWarmContexts(normalizeWarmContexts(workspaceRes.data.warmContexts));
      hasHydratedRef.current = true;
    } finally {
      setLoadingContainers(false);
    }
  }

  useEffect(() => {
    refreshContainers();
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

  async function loadPages(containerId: string) {
    if (pagesByContainer[containerId]) return;

    const res = await api.containers.pages(containerId);
    setPagesByContainer((current) => {
      if (current[containerId]) return current;
      return { ...current, [containerId]: res.data };
    });
  }

  function addPage(containerId: string, page: ApiPage) {
    setPagesByContainer((current) => ({
      ...current,
      [containerId]: [...(current[containerId] ?? []), page],
    }));
  }

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

  async function createContainer(levelId: string, parentId: string | null, name: string) {
    const res = await api.containers.create({
      universeId,
      levelId,
      parentId,
      name,
    });

    setContainers((current) => [...current, res.data]);
    return res.data;
  }

  async function createPage(containerId: string) {
    const res = await api.containers.createPage(containerId);
    addPage(containerId, res.data);
    return res.data;
  }

  return (
    <UniverseContext.Provider
      value={{
        universeId,
        universeName,
        hierarchyLevels,
        containers,
        loadingContainers,
        refreshContainers,
        pagesByContainer,
        loadPages,
        addPage,
        binderOpen: binderOpenState,
        setBinderOpen,
        activeEntityType,
        activeEntityId,
        depthState,
        activateEntity,
        cycleDepthState,
        warmContexts,
        createContainer,
        createPage,
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
