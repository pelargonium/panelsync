import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUniverse } from '../context/UniverseContext';
import { api, type ApiEntity, type ApiMembership } from '../lib/api';

type EntityType = ApiEntity['type'];

const TYPE_SECTIONS: Array<{ type: EntityType; label: string }> = [
  { type: 'character', label: 'Characters' },
  { type: 'location', label: 'Locations' },
  { type: 'note', label: 'Notes' },
  { type: 'group', label: 'Groups' },
  { type: 'timeline', label: 'Timelines' },
  { type: 'script', label: 'Scripts' },
];

const ROW_HEIGHT = 44;

const CREATE_OPTIONS: Array<{ type: EntityType; label: string }> = [
  { type: 'character', label: 'character' },
  { type: 'location', label: 'location' },
  { type: 'note', label: 'note' },
  { type: 'group', label: 'group' },
  { type: 'folder', label: 'folder' },
  { type: 'timeline', label: 'timeline' },
  { type: 'script', label: 'script' },
];

function typeLabel(type: string): string {
  if (type === 'character') return 'C';
  if (type === 'location') return 'L';
  if (type === 'group') return 'G';
  if (type === 'note') return 'N';
  if (type === 'folder') return 'F';
  if (type === 'script') return 'S';
  if (type === 'timeline') return 'T';
  return '?';
}

// ── Nav item for flat keyboard-navigable list ─────────────────────────────

type NavItem = {
  id: string;
  kind: 'folder' | 'entity' | 'section' | 'group';
  depth: number;
  entityType?: EntityType;
};

// ── Tree helpers ──────────────────────────────────────────────────────────

function buildFolderTree(entities: ApiEntity[], memberships: ApiMembership[]) {
  const childrenOf: Record<string, string[]> = {};
  const parentOf: Record<string, string> = {};

  for (const m of memberships) {
    const parent = entities.find((e) => e.id === m.groupId);
    if (!parent || (parent.type !== 'folder' && parent.type !== 'group')) continue;
    if (!childrenOf[m.groupId]) childrenOf[m.groupId] = [];
    childrenOf[m.groupId].push(m.characterId);
    // Only folders create structural containment (hides from type section).
    // Group membership is semantic — members stay in their type section.
    if (parent.type === 'folder') {
      parentOf[m.characterId] = m.groupId;
    }
  }

  return { childrenOf, parentOf };
}

function addNavChildren(
  parentId: string,
  depth: number,
  items: NavItem[],
  childrenOf: Record<string, string[]>,
  entities: ApiEntity[],
  expanded: Record<string, boolean>,
) {
  const childIds = childrenOf[parentId] ?? [];
  const children = childIds
    .map((id) => entities.find((e) => e.id === id))
    .filter(Boolean) as ApiEntity[];

  children.sort((a, b) => {
    const aFolder = a.type === 'folder' || a.type === 'group' ? 0 : 1;
    const bFolder = b.type === 'folder' || b.type === 'group' ? 0 : 1;
    if (aFolder !== bFolder) return aFolder - bFolder;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  for (const child of children) {
    if (child.type === 'folder') {
      items.push({ id: child.id, kind: 'folder', depth, entityType: 'folder' });
      if (expanded[child.id]) {
        addNavChildren(child.id, depth + 1, items, childrenOf, entities, expanded);
      }
    } else {
      items.push({ id: child.id, kind: 'entity', depth, entityType: child.type });
    }
  }
}

function buildNavList(
  topFolders: ApiEntity[],
  sectionEntities: Record<string, ApiEntity[]>,
  childrenOf: Record<string, string[]>,
  entities: ApiEntity[],
  expanded: Record<string, boolean>,
  filterText: string,
): NavItem[] {
  // Filtering: flat list of matching entities, no sections
  if (filterText) {
    const lower = filterText.toLowerCase();
    return entities
      .filter((e) => e.type !== 'folder' && e.name.toLowerCase().includes(lower))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((e) => ({ id: e.id, kind: 'entity' as const, depth: 0, entityType: e.type }));
  }

  const items: NavItem[] = [];

  // Top-level curated folders
  for (const folder of topFolders) {
    items.push({ id: folder.id, kind: 'folder', depth: 0, entityType: 'folder' });
    if (expanded[folder.id]) {
      addNavChildren(folder.id, 1, items, childrenOf, entities, expanded);
    }
  }

  // Auto type sections
  for (const section of TYPE_SECTIONS) {
    const sectionItems = sectionEntities[section.type] ?? [];
    if (sectionItems.length === 0) continue;
    const sectionKey = `section:${section.type}`;
    items.push({ id: sectionKey, kind: 'section', depth: 0, entityType: section.type });
    if (expanded[sectionKey] ?? true) {
      for (const entity of sectionItems) {
        if (section.type === 'group') {
          items.push({ id: entity.id, kind: 'group', depth: 1, entityType: 'group' });
          if (expanded[entity.id]) {
            addNavChildren(entity.id, 2, items, childrenOf, entities, expanded);
          }
        } else {
          items.push({ id: entity.id, kind: 'entity', depth: 1, entityType: entity.type });
        }
      }
    }
  }

  return items;
}

// ── Row components ────────────────────────────────────────────────────────

function BinderEntityRow({
  entity,
  depth,
  isActive,
  isFocused,
  isSelected,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  isDeleting,
  onPointerDown,
  onPress,
}: {
  entity: ApiEntity;
  depth: number;
  isActive: boolean;
  isFocused: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (text: string) => void;
  onRenameSubmit: () => void;
  isDeleting: boolean;
  onPointerDown: (e: any) => void;
  onPress: () => void;
}) {
  const { colors, mono } = useTheme();
  const renameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isRenaming) setTimeout(() => renameRef.current?.focus(), 0);
  }, [isRenaming]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View onPointerDown={onPointerDown} style={{
        minHeight: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12 + depth * 16,
        paddingRight: 12,
        paddingVertical: 10,
        backgroundColor: isSelected ? colors.selection : isActive ? colors.selection : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderLeftWidth: isFocused ? 2 : 0,
        borderLeftColor: isFocused ? colors.text : 'transparent',
      }}>
        <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, width: 16 }}>
          {typeLabel(entity.type)}
        </Text>
        {isDeleting ? (
          <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error, flex: 1 }}>
            delete? y/n
          </Text>
        ) : isRenaming ? (
          <TextInput
            ref={renameRef}
            value={renameValue}
            onChangeText={onRenameChange}
            onSubmitEditing={onRenameSubmit}
            style={{
              fontFamily: mono, fontSize: 13, color: colors.text,
              flex: 1, padding: 0, margin: 0,
              ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
            }}
            selectTextOnFocus
          />
        ) : (
          <Text numberOfLines={1} style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}>
            {entity.name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function BinderFolderRow({
  entity,
  depth,
  isActive,
  isFocused,
  isSelected,
  isExpanded,
  childCount,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  isDropTarget,
  onPointerDown,
  onPress,
  onToggle,
}: {
  entity: ApiEntity;
  depth: number;
  isActive: boolean;
  isFocused: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  childCount: number;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (text: string) => void;
  onRenameSubmit: () => void;
  isDropTarget: boolean;
  onPointerDown: (e: any) => void;
  onPress: () => void;
  onToggle: () => void;
}) {
  const { colors, mono } = useTheme();
  const renameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isRenaming) setTimeout(() => renameRef.current?.focus(), 0);
  }, [isRenaming]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View onPointerDown={onPointerDown} style={{
        minHeight: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12 + depth * 16,
        paddingRight: 12,
        paddingVertical: 10,
        backgroundColor: isDropTarget ? colors.selection : isSelected ? colors.selection : isActive ? colors.selection : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderLeftWidth: isFocused ? 2 : 0,
        borderLeftColor: isFocused ? colors.text : 'transparent',
      }}>
        <TouchableOpacity onPress={onToggle} hitSlop={8} style={{ width: 16 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>
            {isExpanded ? 'v' : '>'}
          </Text>
        </TouchableOpacity>
        {isRenaming ? (
          <TextInput
            ref={renameRef}
            value={renameValue}
            onChangeText={onRenameChange}
            onSubmitEditing={onRenameSubmit}
            style={{
              fontFamily: mono, fontSize: 13, color: colors.text,
              flex: 1, padding: 0, margin: 0,
              ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
            }}
            selectTextOnFocus
          />
        ) : (
          <Text numberOfLines={1} style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}>
            {entity.name}
          </Text>
        )}
        {!isRenaming && childCount > 0 && (
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>{childCount}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionRow({
  label,
  count,
  isExpanded,
  isFocused,
  onToggle,
}: {
  label: string;
  count: number;
  isExpanded: boolean;
  isFocused: boolean;
  onToggle: () => void;
}) {
  const { colors, mono } = useTheme();

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderLeftWidth: isFocused ? 2 : 0,
        borderLeftColor: isFocused ? colors.text : 'transparent',
      }}>
        <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, width: 16 }}>
          {isExpanded ? 'v' : '>'}
        </Text>
        <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, letterSpacing: 1, flex: 1 }}>
          {label} ({count})
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface BinderProps {
  onCreateEntity: (type: EntityType) => void;
  onCreateFolder: () => void;
  creatingType: EntityType | null;
  isFocused: boolean;
  onActivateSecondary: (type: string, id: string) => void;
}

export default function Binder({
  onCreateEntity,
  onCreateFolder,
  creatingType,
  isFocused,
  onActivateSecondary,
}: BinderProps) {
  const { colors, mono } = useTheme();
  const {
    entities, memberships, loadingEntities,
    activeEntityId, activateEntity, updateEntityName, deleteEntity,
    addMembership, removeMembership,
  } = useUniverse();

  // ── State ──────────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createPickerOpen, setCreatePickerOpen] = useState(false);
  const [createPickerIndex, setCreatePickerIndex] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState<number | null>(null);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [movePickerIndex, setMovePickerIndex] = useState(0);
  const [dragState, setDragState] = useState<{
    entityIds: string[];
    pointerY: number;
    startY: number;
    started: boolean;
    dropTarget: { type: 'between'; index: number } | { type: 'onto'; id: string } | null;
  } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const filterInputRef = useRef<TextInput>(null);
  const dragGhostLabel = useRef('');
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollOffsetRef = useRef(0);
  const binderViewRef = useRef<View>(null);

  // ── Derived data ───────────────────────────────────────────────────────
  const { childrenOf, parentOf } = useMemo(
    () => buildFolderTree(entities, memberships),
    [entities, memberships],
  );

  const sectionEntities = useMemo(() => {
    const result: Record<string, ApiEntity[]> = {};
    for (const section of TYPE_SECTIONS) {
      result[section.type] = entities
        .filter((e) => e.type === section.type && !parentOf[e.id])
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return result;
  }, [entities, parentOf]);

  const topFolders = useMemo(
    () => entities
      .filter((e) => e.type === 'folder' && !parentOf[e.id])
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [entities, parentOf],
  );

  const navItems = useMemo(
    () => buildNavList(topFolders, sectionEntities, childrenOf, entities, expanded, filterText),
    [topFolders, sectionEntities, childrenOf, entities, expanded, filterText],
  );

  const focusedIndex = useMemo(
    () => navItems.findIndex((item) => item.id === focusedId),
    [navItems, focusedId],
  );

  // Multi-select: computed range between anchor and focus
  const selectedIds = useMemo(() => {
    if (selectionAnchorIndex === null || focusedIndex < 0) return new Set<string>();
    const start = Math.min(selectionAnchorIndex, focusedIndex);
    const end = Math.max(selectionAnchorIndex, focusedIndex);
    const ids = new Set<string>();
    for (let i = start; i <= end; i++) {
      const item = navItems[i];
      if (item.kind !== 'section') ids.add(item.id);
    }
    return ids;
  }, [selectionAnchorIndex, focusedIndex, navItems]);

  // All folders for the move picker
  const allFolders = useMemo(
    () => entities.filter((e) => e.type === 'folder').sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [entities],
  );

  // Move picker options: "(root)" + all folders, excluding entities being moved
  const moveTargets = useMemo(() => {
    const movingIds = selectedIds.size > 0 ? selectedIds : new Set(focusedId ? [focusedId] : []);
    return [
      { id: '__root__', name: '(root)' },
      ...allFolders.filter((f) => !movingIds.has(f.id)),
    ];
  }, [allFolders, selectedIds, focusedId]);

  // Clear focused item if it's no longer in the list
  useEffect(() => {
    if (focusedId && focusedIndex < 0) {
      setFocusedId(null);
      setSelectionAnchorIndex(null);
    }
  }, [focusedId, focusedIndex]);

  // ── Navigation ─────────────────────────────────────────────────────────

  function moveFocus(delta: number) {
    if (navItems.length === 0) return;
    let nextIndex: number;
    if (focusedIndex < 0) {
      nextIndex = delta > 0 ? 0 : navItems.length - 1;
    } else {
      nextIndex = Math.max(0, Math.min(navItems.length - 1, focusedIndex + delta));
    }
    setFocusedId(navItems[nextIndex].id);
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, nextIndex * ROW_HEIGHT - ROW_HEIGHT * 3),
      animated: false,
    });
  }

  function activateFocused() {
    if (focusedIndex < 0) return;
    const item = navItems[focusedIndex];
    if (item.kind === 'section') {
      toggleExpanded(item.id);
    } else {
      activateEntity('entity', item.id);
    }
  }

  function expandFocused() {
    if (focusedIndex < 0) return;
    const item = navItems[focusedIndex];
    if (item.kind === 'section' || item.kind === 'folder' || item.kind === 'group') {
      const isExp = item.kind === 'section'
        ? (expanded[item.id] ?? true)
        : (expanded[item.id] ?? false);
      if (!isExp) {
        setExpanded((prev) => ({ ...prev, [item.id]: true }));
      } else {
        moveFocus(1);
      }
    }
  }

  function collapseFocused() {
    if (focusedIndex < 0) return;
    const item = navItems[focusedIndex];
    if (item.kind === 'section' || item.kind === 'folder' || item.kind === 'group') {
      const isExp = item.kind === 'section'
        ? (expanded[item.id] ?? true)
        : (expanded[item.id] ?? false);
      if (isExp) {
        setExpanded((prev) => ({ ...prev, [item.id]: false }));
        return;
      }
    }
    // Move to parent: look backwards for a lower-depth expandable item
    for (let i = focusedIndex - 1; i >= 0; i--) {
      const candidate = navItems[i];
      if (candidate.depth < item.depth &&
          (candidate.kind === 'section' || candidate.kind === 'folder' || candidate.kind === 'group')) {
        setFocusedId(candidate.id);
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, i * ROW_HEIGHT - ROW_HEIGHT * 3),
          animated: false,
        });
        return;
      }
    }
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const current = prev[key] ?? (key.startsWith('section:') ? true : false);
      return { ...prev, [key]: !current };
    });
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────

  function handlePointerDown(e: any, itemId: string) {
    if (Platform.OS !== 'web' || e.button !== 0) return;

    const item = navItems.find((n) => n.id === itemId);
    if (!item || item.kind === 'section') return;

    const isDraggingSelection = selectedIds.size > 0 && selectedIds.has(itemId);
    const ids = isDraggingSelection ? [...selectedIds] : [itemId];

    if (!isDraggingSelection) {
      setSelectionAnchorIndex(null);
    }

    const binderEl = binderViewRef.current as unknown as HTMLElement;
    if (!binderEl) return;
    const rect = binderEl.getBoundingClientRect();

    setDragState({
      entityIds: ids,
      pointerY: e.clientY - rect.top,
      startY: e.clientY - rect.top,
      started: false,
      dropTarget: null,
    });

    dragGhostLabel.current = ids.length > 1
      ? `${entities.find((en) => en.id === ids[0])?.name ?? ''} +${ids.length - 1}`
      : entities.find((en) => en.id === ids[0])?.name ?? '';
  }

  const pointerMoveRef = useRef<(e: PointerEvent) => void>(undefined);
  pointerMoveRef.current = (e: PointerEvent) => {
    if (!dragState) return;

    const binderEl = binderViewRef.current as unknown as HTMLElement;
    if (!binderEl) return;
    const rect = binderEl.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    if (!dragState.started && Math.abs(relativeY - dragState.startY) < 5) {
      return;
    }

    e.preventDefault();

    const scrollEdgeSize = 40;
    if (e.clientY < rect.top + scrollEdgeSize) {
      if (!autoScrollRef.current) {
        autoScrollRef.current = setInterval(() => {
          scrollViewRef.current?.scrollTo({ y: scrollOffsetRef.current - 15, animated: false });
        }, 16);
      }
    } else if (e.clientY > rect.bottom - scrollEdgeSize) {
      if (!autoScrollRef.current) {
        autoScrollRef.current = setInterval(() => {
          scrollViewRef.current?.scrollTo({ y: scrollOffsetRef.current + 15, animated: false });
        }, 16);
      }
    } else if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    const yInScrollView = relativeY + scrollOffsetRef.current;
    const rowIndex = Math.floor(yInScrollView / ROW_HEIGHT);
    const rowOffset = yInScrollView % ROW_HEIGHT;

    let dropTarget: typeof dragState.dropTarget = null;

    if (rowIndex >= 0 && rowIndex < navItems.length) {
      const targetItem = navItems[rowIndex];
      if (rowOffset < 8) {
        dropTarget = { type: 'between', index: rowIndex };
      } else if (rowOffset > ROW_HEIGHT - 8) {
        dropTarget = { type: 'between', index: rowIndex + 1 };
      } else if (targetItem.kind === 'folder' || targetItem.kind === 'group') {
        dropTarget = { type: 'onto', id: targetItem.id };
      } else {
        dropTarget = { type: 'between', index: rowIndex + 1 };
      }
    } else if (rowIndex >= navItems.length) {
      dropTarget = { type: 'between', index: navItems.length };
    }

    if (dropTarget?.type === 'onto') {
      const ontoId = dropTarget.id;
      const targetEntity = entities.find((en) => en.id === ontoId);
      // Only characters can be dropped onto groups
      if (targetEntity?.type === 'group') {
        const allCharacters = dragState.entityIds.every((id) => {
          const e = entities.find((en) => en.id === id);
          return e?.type === 'character';
        });
        if (!allCharacters) dropTarget = null;
      }
      if (dropTarget && dropTarget.type === 'onto' && dragState.entityIds.includes(dropTarget.id)) {
        dropTarget = null;
      } else if (dropTarget && dropTarget.type === 'onto') {
        let currentId: string | undefined = dropTarget.id;
        while (currentId) {
          if (dragState.entityIds.includes(currentId)) {
            dropTarget = null;
            break;
          }
          currentId = parentOf[currentId];
        }
      }
    }

    setDragState((d) => d ? { ...d, started: true, pointerY: relativeY, dropTarget } : null);
  };

  const pointerUpRef = useRef<(e: PointerEvent) => void>(undefined);
  pointerUpRef.current = async () => {
    if (!dragState) return;

    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    if (dragState.started && dragState.dropTarget) {
      const { entityIds, dropTarget } = dragState;

      let targetFolderId: string | null = null;
      if (dropTarget.type === 'onto') {
        targetFolderId = dropTarget.id;
      } else if (dropTarget.type === 'between') {
        const index = dropTarget.index;
        if (index > 0) {
          const itemBefore = navItems[index - 1];
          if (itemBefore.kind === 'folder' || itemBefore.kind === 'group') {
            const isExpanded = expanded[itemBefore.id] ?? false;
            if (isExpanded && itemBefore.depth < (navItems[index]?.depth ?? itemBefore.depth + 1)) {
              targetFolderId = itemBefore.id;
            } else {
              targetFolderId = parentOf[itemBefore.id] ?? null;
            }
          } else {
            targetFolderId = parentOf[itemBefore.id] ?? null;
          }
        }
      }

      for (const id of entityIds) {
        const currentParent = parentOf[id];
        if (currentParent === targetFolderId) continue;

        if (currentParent) await removeMembership(id, currentParent);
        if (targetFolderId) await addMembership(id, targetFolderId);
      }
    }

    setDragState(null);
  };

  function handleSelect(id: string) {
    setCreatePickerOpen(false);
    setDeletingId(null);
    activateEntity('entity', id);
    setFocusedId(id);
  }

  // ── Filter ─────────────────────────────────────────────────────────────

  function startFilter(char: string) {
    setFilterText(char);
    setRenamingId(null);
    setDeletingId(null);
    setCreatePickerOpen(false);
    setTimeout(() => filterInputRef.current?.focus(), 0);
  }

  function clearFilter() {
    setFilterText('');
    if (Platform.OS === 'web') {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  }

  // ── Rename ─────────────────────────────────────────────────────────────

  function startRename() {
    if (focusedIndex < 0) return;
    const item = navItems[focusedIndex];
    if (item.kind === 'section') return;
    const entity = entities.find((e) => e.id === item.id);
    if (!entity) return;
    setRenamingId(item.id);
    setRenameValue(entity.name);
  }

  function confirmRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      updateEntityName(renamingId, trimmed);
      api.entities.update(renamingId, { name: trimmed }).catch((e: unknown) => {
        console.error('Failed to rename entity:', e);
      });
    }
    setRenamingId(null);
    setRenameValue('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
    if (Platform.OS === 'web') {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  function startDelete() {
    if (focusedIndex < 0) return;
    const item = navItems[focusedIndex];
    if (item.kind === 'section') return;
    setDeletingId(item.id);
  }

  function confirmDeleteAction() {
    if (!deletingId) return;
    const id = deletingId;
    // Move focus to adjacent item before deleting
    const idx = navItems.findIndex((item) => item.id === id);
    if (idx >= 0) {
      const next = navItems[idx + 1] ?? navItems[idx - 1];
      setFocusedId(next?.id ?? null);
    }
    setDeletingId(null);
    deleteEntity(id).catch((e: unknown) => {
      console.error('Failed to delete entity:', e);
    });
  }

  function cancelDelete() {
    setDeletingId(null);
  }

  // ── Move to folder ────────────────────────────────────────────────────

  function startMove() {
    const ids = selectedIds.size > 0 ? selectedIds : new Set(focusedId ? [focusedId] : []);
    if (ids.size === 0) return;
    // Don't allow moving sections
    for (const id of ids) {
      if (id.startsWith('section:')) return;
    }
    setMovePickerOpen(true);
    setMovePickerIndex(0);
    setDeletingId(null);
    setRenamingId(null);
    setCreatePickerOpen(false);
  }

  async function handleMoveConfirm(targetIndex: number) {
    const target = moveTargets[targetIndex];
    if (!target) return;
    const targetFolderId = target.id === '__root__' ? null : target.id;
    const ids = selectedIds.size > 0 ? [...selectedIds] : focusedId ? [focusedId] : [];

    for (const id of ids) {
      const currentParent = parentOf[id];
      if (currentParent) {
        await removeMembership(id, currentParent);
      }
      if (targetFolderId) {
        await addMembership(id, targetFolderId);
      }
    }

    setMovePickerOpen(false);
    setSelectionAnchorIndex(null);
  }

  function cancelMove() {
    setMovePickerOpen(false);
  }

  // ── Bulk delete ───────────────────────────────────────────────────────

  function startBulkDelete() {
    if (selectedIds.size === 0) return;
    setDeletingId('__bulk__');
  }

  async function confirmBulkDelete() {
    const ids = [...selectedIds];
    setDeletingId(null);
    setSelectionAnchorIndex(null);
    // Move focus to first item after selection
    const maxIdx = Math.max(...ids.map((id) => navItems.findIndex((n) => n.id === id)));
    const next = navItems[maxIdx + 1] ?? navItems[0];
    setFocusedId(next?.id ?? null);

    for (const id of ids) {
      try {
        await deleteEntity(id);
      } catch (e: unknown) {
        console.error('Failed to delete entity:', e);
      }
    }
  }

  // ── Create picker ──────────────────────────────────────────────────────

  function openCreatePicker() {
    setCreatePickerOpen(true);
    setCreatePickerIndex(0);
  }

  function handleCreateOption(index: number) {
    const opt = CREATE_OPTIONS[index];
    if (opt.type === 'folder') {
      onCreateFolder();
    } else {
      onCreateEntity(opt.type);
    }
    setCreatePickerOpen(false);
  }

  // ── Keyboard handler (web only) ────────────────────────────────────────

  const handlerRef = useRef<(e: KeyboardEvent) => void>(undefined);

  handlerRef.current = function onKeyDown(e: KeyboardEvent) {
    if (!isFocused) return;

    if (e.key === 'Escape' && dragState?.started) {
      e.preventDefault();
      setDragState(null);
      if (autoScrollRef.current) { clearInterval(autoScrollRef.current); autoScrollRef.current = null; }
      return;
    }

    const active = document.activeElement as HTMLElement;
    const isInInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';

    // Cmd+Shift+A — open create picker
    if (e.metaKey && e.shiftKey && e.key === 'a') {
      e.preventDefault();
      openCreatePicker();
      return;
    }

    // Rename mode: only Escape cancels (Enter handled by onSubmitEditing)
    if (renamingId && isInInput) {
      if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
      return;
    }

    // Filter input focused: arrow nav + Enter + Escape
    if (filterText && isInInput) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = navItems[focusedIndex];
        if (e.shiftKey && item && item.kind !== 'section') {
          onActivateSecondary('entity', item.id);
        } else {
          activateFocused();
        }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); clearFilter(); return; }
      return;
    }

    // Any other input (editor text fields) — don't interfere
    if (isInInput) return;

    // Delete confirmation mode (single or bulk)
    if (deletingId) {
      e.preventDefault();
      if (e.key === 'y' || e.key === 'Y') {
        if (deletingId === '__bulk__') confirmBulkDelete();
        else confirmDeleteAction();
        return;
      }
      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') { cancelDelete(); return; }
      return;
    }

    // Move picker mode
    if (movePickerOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMovePickerIndex((i) => Math.min(moveTargets.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMovePickerIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); void handleMoveConfirm(movePickerIndex); return; }
      if (e.key === 'Escape') { e.preventDefault(); cancelMove(); return; }
      return;
    }

    // Create picker mode
    if (createPickerOpen) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCreatePickerIndex((i) => Math.min(CREATE_OPTIONS.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCreatePickerIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); handleCreateOption(createPickerIndex); return; }
      if (e.key === 'Escape') { e.preventDefault(); setCreatePickerOpen(false); return; }
      return;
    }

    // Cmd+Shift+M — move to folder
    if (e.metaKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      startMove();
      return;
    }

    // Shift+Arrow — extend selection
    if (e.key === 'ArrowDown' && e.shiftKey) {
      e.preventDefault();
      if (selectionAnchorIndex === null) setSelectionAnchorIndex(focusedIndex >= 0 ? focusedIndex : 0);
      moveFocus(1);
      return;
    }
    if (e.key === 'ArrowUp' && e.shiftKey) {
      e.preventDefault();
      if (selectionAnchorIndex === null) setSelectionAnchorIndex(focusedIndex >= 0 ? focusedIndex : 0);
      moveFocus(-1);
      return;
    }

    // Normal navigation (clears selection)
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectionAnchorIndex(null); moveFocus(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectionAnchorIndex(null); moveFocus(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      setSelectionAnchorIndex(null);
      const item = navItems[focusedIndex];
      if (e.shiftKey && item && item.kind !== 'section') {
        onActivateSecondary('entity', item.id);
      } else {
        activateFocused();
      }
    }
    else if (e.key === 'ArrowRight') { e.preventDefault(); expandFocused(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); collapseFocused(); }
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (selectionAnchorIndex !== null) { setSelectionAnchorIndex(null); }
      else if (filterText) clearFilter();
      else setFocusedId(null);
    }
    else if (e.key === 'F2') { e.preventDefault(); startRename(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectedIds.size > 0) startBulkDelete();
      else startDelete();
    }
    // Type-to-filter: any single printable character
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setSelectionAnchorIndex(null);
      startFilter(e.key);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function onKeyDown(e: KeyboardEvent) {
      handlerRef.current?.(e);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !dragState) return;

    function onPointerMove(e: PointerEvent) { pointerMoveRef.current?.(e); }
    function onPointerUp(e: PointerEvent) { pointerUpRef.current?.(e); }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [dragState !== null]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <View ref={binderViewRef} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 36,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, flex: 1 }}>binder</Text>
        <TouchableOpacity onPress={openCreatePicker}>
          <Text style={{ fontFamily: mono, fontSize: 15, color: colors.text }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Create picker */}
      {createPickerOpen && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 8,
        }}>
          {CREATE_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.type}
              onPress={() => handleCreateOption(i)}
              disabled={creatingType !== null}
            >
              {creatingType === opt.type
                ? <ActivityIndicator size="small" color={colors.muted} />
                : <Text style={{
                    fontFamily: mono, fontSize: 12,
                    color: createPickerIndex === i ? colors.text : colors.muted,
                    textDecorationLine: createPickerIndex === i ? 'underline' : 'none',
                  }}>{opt.label}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Move picker */}
      {movePickerOpen && (
        <View style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          maxHeight: 200,
        }}>
          <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4, letterSpacing: 1 }}>
            MOVE TO {selectedIds.size > 1 ? `(${selectedIds.size} items)` : ''}
          </Text>
          <ScrollView nestedScrollEnabled>
            {moveTargets.map((target, i) => (
              <TouchableOpacity
                key={target.id}
                onPress={() => void handleMoveConfirm(i)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: movePickerIndex === i ? colors.selection : 'transparent',
                }}
              >
                <Text style={{
                  fontFamily: mono, fontSize: 12,
                  color: movePickerIndex === i ? colors.text : colors.muted,
                }}>{target.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter input */}
      {filterText !== '' && (
        <View style={{
          paddingHorizontal: 12, paddingVertical: 6,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <TextInput
            ref={filterInputRef}
            value={filterText}
            onChangeText={setFilterText}
            style={{
              fontFamily: mono, fontSize: 12, color: colors.text, padding: 0,
              ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
            }}
            placeholder="filter..."
            placeholderTextColor={colors.muted}
          />
        </View>
      )}

      {/* Nav list */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, pointerEvents: dragState?.started ? 'none' : 'auto' }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {loadingEntities && (
          <ActivityIndicator size="small" color={colors.muted} style={{ marginTop: 16 }} />
        )}

        {!loadingEntities && navItems.length === 0 && (
          <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, padding: 12 }}>
            {filterText ? 'no matches.' : 'empty. tap + to create.'}
          </Text>
        )}

        {!loadingEntities && navItems.map((item, i) => {
          // Spacer between top folders and type sections
          const prev = i > 0 ? navItems[i - 1] : null;
          const needsSpacer = item.kind === 'section' && prev &&
            (prev.kind === 'folder' || prev.kind === 'entity' || prev.kind === 'group');
          const showDropIndicator = dragState?.started && dragState.dropTarget?.type === 'between' && dragState.dropTarget.index === i;

          if (item.kind === 'section') {
            const sectionType = item.entityType!;
            const section = TYPE_SECTIONS.find((s) => s.type === sectionType);
            const count = (sectionEntities[sectionType] ?? []).length;
            const isExp = expanded[item.id] ?? true;

            return (
              <React.Fragment key={`${item.id}:${i}`}>
                {showDropIndicator && <View style={{ height: 2, backgroundColor: colors.text }} />}
                {needsSpacer && <View style={{ height: 8 }} />}
                <SectionRow
                  label={section?.label ?? sectionType}
                  count={count}
                  isExpanded={isExp}
                  isFocused={focusedId === item.id}
                  onToggle={() => toggleExpanded(item.id)}
                />
              </React.Fragment>
            );
          }

          const entity = entities.find((e) => e.id === item.id);
          if (!entity) return null;

          if (item.kind === 'folder' || item.kind === 'group') {
            const isExp = expanded[entity.id] ?? false;
            const count = (childrenOf[entity.id] ?? []).length;
            const isDropTarget = !!(dragState?.started && dragState.dropTarget?.type === 'onto' && dragState.dropTarget.id === entity.id);
            return (
              <React.Fragment key={`${entity.id}:${i}`}>
                {showDropIndicator && <View style={{ height: 2, backgroundColor: colors.text }} />}
                <BinderFolderRow
                entity={entity}
                depth={item.depth}
                isActive={activeEntityId === entity.id}
                isFocused={focusedId === entity.id}
                isSelected={selectedIds.has(entity.id)}
                isExpanded={isExp}
                childCount={count}
                isRenaming={renamingId === entity.id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={confirmRename}
                  isDropTarget={isDropTarget}
                onPress={() => handleSelect(entity.id)}
                onToggle={() => toggleExpanded(entity.id)}
                  onPointerDown={(e: any) => handlePointerDown(e, entity.id)}
              />
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={`${entity.id}:${i}`}>
              {showDropIndicator && <View style={{ height: 2, backgroundColor: colors.text }} />}
              <BinderEntityRow
              entity={entity}
              depth={item.depth}
              isActive={activeEntityId === entity.id}
              isFocused={focusedId === entity.id}
              isSelected={selectedIds.has(entity.id)}
              isRenaming={renamingId === entity.id}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={confirmRename}
              isDeleting={deletingId === entity.id || (deletingId === '__bulk__' && selectedIds.has(entity.id))}
                onPointerDown={(e: any) => handlePointerDown(e, entity.id)}
              onPress={() => handleSelect(entity.id)}
            />
            </React.Fragment>
          );
        })}
        {dragState?.started && dragState.dropTarget?.type === 'between' && dragState.dropTarget.index === navItems.length && (
          <View style={{ height: 2, backgroundColor: colors.text }} />
        )}
      </ScrollView>

      {/* Drag Ghost */}
      {dragState?.started && (
        <View
          style={{
            position: 'absolute',
            top: dragState.pointerY - 16,
            left: 16,
            right: 16,
            opacity: 0.7,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            zIndex: 100,
          }}
          pointerEvents="none"
        >
          <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>{dragGhostLabel.current}</Text>
        </View>
      )}
    </View>
  );
}