import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';
import { PanGestureHandler, State, TouchableOpacity as GestureTouchableOpacity } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CharacterEditor from '../../components/CharacterEditor';
import EntityEditor from '../../components/EntityEditor';
import GroupEditor from '../../components/GroupEditor';
import { UniverseProvider, useUniverse } from '../../context/UniverseContext';
import { type ApiEntity, type ApiMembership } from '../../lib/api';
import { colors } from '../../theme';

const BINDER_WIDTH = 264;

type SortMode = 'az' | 'type' | 'recent' | 'manual';
type BinderItem =
  | { kind: 'group'; entity: ApiEntity }
  | { kind: 'member'; entity: ApiEntity; groupId: string }
  | { kind: 'entity'; entity: ApiEntity };

function EmptyContent({ universeName }: { universeName: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.bg }}>
      <Text className="text-center text-2xl font-bold" style={{ color: colors.text }}>
        {universeName}
      </Text>
      <Text className="mt-3 text-center text-sm" style={{ color: colors.faint }}>
        Select an entity from the binder to open it in the workspace.
      </Text>
    </View>
  );
}

function DossierPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
      <Text className="text-sm" style={{ color: colors.faint }}>
        Dossier
      </Text>
    </View>
  );
}

function entityColor(type: ApiEntity['type']) {
  if (type === 'character') return colors.accent;
  if (type === 'location') return colors.bible;
  if (type === 'group') return '#9B7FD4';
  return colors.muted;
}

function compareEntities(left: ApiEntity, right: ApiEntity, sortMode: SortMode) {
  if (sortMode === 'recent') {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }

  if (sortMode === 'type') {
    const typeOrder: Record<ApiEntity['type'], number> = {
      group: 0,
      character: 1,
      location: 2,
      note: 3,
    };
    const typeComparison = typeOrder[left.type] - typeOrder[right.type];
    if (typeComparison !== 0) return typeComparison;
  }

  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function compareByPosition(left: ApiEntity, right: ApiEntity) {
  if (left.position == null && right.position == null) {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  }
  if (left.position == null) return 1;
  if (right.position == null) return -1;
  return left.position - right.position;
}

function PrimaryContent({
  justCreatedId,
  onAutoFocusDone,
  onSaveStateChange,
}: {
  justCreatedId: string | null;
  onAutoFocusDone: () => void;
  onSaveStateChange: (state: 'saved' | 'saving') => void;
}) {
  const { activeEntityType, activeEntityId, universeName, entities } = useUniverse();

  if (activeEntityType === 'entity' && activeEntityId) {
    const entity = entities.find((item) => item.id === activeEntityId);
    if (entity?.type === 'group') {
      return <GroupEditor entityId={activeEntityId} />;
    }
    if (entity?.type === 'character') {
      return (
        <CharacterEditor
          entityId={activeEntityId}
          autoFocusName={justCreatedId === activeEntityId}
          onAutoFocusDone={onAutoFocusDone}
          onSaveStateChange={onSaveStateChange}
        />
      );
    }
    return <EntityEditor entityId={activeEntityId} />;
  }

  return <EmptyContent universeName={universeName} />;
}

function ContentArea({
  justCreatedId,
  onAutoFocusDone,
  onSaveStateChange,
}: {
  justCreatedId: string | null;
  onAutoFocusDone: () => void;
  onSaveStateChange: (state: 'saved' | 'saving') => void;
}) {
  const { depthState } = useUniverse();

  if (depthState === 'dossier_only') {
    return <DossierPlaceholder />;
  }

  if (depthState === 'split') {
    return (
      <View className="flex-1 flex-row">
        <View className="flex-1 border-r" style={{ borderColor: colors.border }}>
          <PrimaryContent justCreatedId={justCreatedId} onAutoFocusDone={onAutoFocusDone} onSaveStateChange={onSaveStateChange} />
        </View>
        <View className="flex-1">
          <DossierPlaceholder />
        </View>
      </View>
    );
  }

  return <PrimaryContent justCreatedId={justCreatedId} onAutoFocusDone={onAutoFocusDone} onSaveStateChange={onSaveStateChange} />;
}

function SortPicker({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (next: SortMode) => void;
}) {
  const options: Array<{ value: SortMode; label: string }> = [
    { value: 'az', label: 'A-Z' },
    { value: 'type', label: 'Type' },
    { value: 'recent', label: 'Recent' },
    { value: 'manual', label: 'Manual' },
  ];

  return (
    <View
      className="flex-row items-center px-4 py-2"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}
    >
      {options.map((option) => (
        <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} className="mr-4">
          <Text
            className="text-[13px]"
            style={{
              color: value === option.value ? colors.accent : colors.text,
              textDecorationLine: value === option.value ? 'underline' : 'none',
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TypePicker({
  creatingType,
  onCreate,
}: {
  creatingType: ApiEntity['type'] | null;
  onCreate: (type: ApiEntity['type']) => void;
}) {
  const options: Array<{ type: ApiEntity['type']; label: string }> = [
    { type: 'group', label: 'Group' },
    { type: 'character', label: 'Character' },
    { type: 'location', label: 'Location' },
    { type: 'note', label: 'Note' },
  ];

  return (
    <View
      className="flex-row items-center px-4 py-2"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.type}
          onPress={() => onCreate(option.type)}
          disabled={creatingType !== null}
          className="mr-2 rounded-full px-3 py-1.5"
          style={{ backgroundColor: colors.bg }}
        >
          {creatingType === option.type ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text className="text-[13px] font-medium" style={{ color: entityColor(option.type) }}>
              {option.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function EntityRow({
  entity,
  onPress,
}: {
  entity: ApiEntity;
  onPress: () => void;
}) {
  const { activeEntityId } = useUniverse();
  const isActive = activeEntityId === entity.id;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        className="h-11 flex-row items-center px-4"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: isActive ? colors.bg : colors.surface,
          position: 'relative',
        }}
      >
        {isActive ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: colors.accent,
            }}
          />
        ) : null}
        <View className="mr-[10px] h-2 w-2 rounded-full" style={{ backgroundColor: entityColor(entity.type) }} />
        <Text numberOfLines={1} className="flex-1 text-sm" style={{ color: isActive ? colors.accent : colors.text }}>
          {entity.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function GroupRow({
  group,
  memberCount,
  expanded,
  onToggle,
  onPress,
}: {
  group: ApiEntity;
  memberCount: number;
  expanded: boolean;
  onToggle: () => void;
  onPress: () => void;
}) {
  const { activeEntityId } = useUniverse();
  const isActive = activeEntityId === group.id;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        className="h-11 flex-row items-center px-4"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: isActive ? colors.bg : colors.surface,
          position: 'relative',
        }}
      >
        {isActive ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: colors.accent,
            }}
          />
        ) : null}

        <TouchableOpacity onPress={onToggle} hitSlop={8}>
          <Text className="mr-2 text-[11px]" style={{ color: colors.muted }}>
            {expanded ? '▾' : '▸'}
          </Text>
        </TouchableOpacity>

        <View className="mr-[10px] h-2 w-2 rounded-full" style={{ backgroundColor: entityColor('group') }} />
        <Text numberOfLines={1} className="flex-1 text-sm" style={{ color: isActive ? colors.accent : colors.text }}>
          {group.name}
        </Text>
        {memberCount > 0 ? (
          <Text className="text-xs" style={{ color: colors.faint }}>
            {memberCount}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function ManualBinderRow({
  item,
  activeEntityId,
  memberCount,
  expanded,
  onToggle,
  onPress,
  onDragLongPress,
  isDragging,
}: {
  item: BinderItem;
  activeEntityId: string | null;
  memberCount?: number;
  expanded?: boolean;
  onToggle?: () => void;
  onPress: () => void;
  onDragLongPress: () => void;
  isDragging: boolean;
}) {
  const entity = item.entity;
  const isActive = activeEntityId === entity.id;
  const isGroup = item.kind === 'group';
  const indent = item.kind === 'member' ? 20 : 0;

  return (
    <ScaleDecorator activeScale={1.01}>
      <GestureTouchableOpacity onPress={onPress} onLongPress={onDragLongPress} activeOpacity={1}>
        <View
          className="h-11 flex-row items-center"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: isDragging ? colors.bg : isActive ? colors.bg : colors.surface,
            position: 'relative',
            paddingLeft: 16 + indent,
            paddingRight: 16,
          }}
        >
          {isActive ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: colors.accent,
              }}
            />
          ) : null}

          {isGroup ? (
            <TouchableOpacity onPress={onToggle} hitSlop={8}>
              <Text className="mr-2 text-[11px]" style={{ color: colors.muted }}>
                {expanded ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
          ) : item.kind === 'member' ? (
            <Text className="mr-2 text-[11px]" style={{ color: colors.muted }}>
              ↳
            </Text>
          ) : null}

          <View className="mr-[10px] h-2 w-2 rounded-full" style={{ backgroundColor: entityColor(entity.type) }} />
          <Text numberOfLines={1} className="flex-1 text-sm" style={{ color: isActive ? colors.accent : colors.text }}>
            {entity.name}
          </Text>
          {isGroup && memberCount ? (
            <Text className="text-xs" style={{ color: colors.faint }}>
              {memberCount}
            </Text>
          ) : null}
        </View>
      </GestureTouchableOpacity>
    </ScaleDecorator>
  );
}

function UniverseWorkspace() {
  const router = useRouter();
  const {
    universeName,
    entities,
    memberships,
    loadingEntities,
    binderOpen,
    setBinderOpen,
    activeEntityId,
    activateEntity,
    createEntity,
    updateEntityPosition,
    addMembership,
    removeMembership,
  } = useUniverse();
  const [sortMode, setSortMode] = useState<SortMode>('az');
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [creatingType, setCreatingType] = useState<ApiEntity['type'] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [editorSaveState, setEditorSaveState] = useState<'saved' | 'saving'>('saved');
  const [gestureHelpVisible, setGestureHelpVisible] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const sortedEntities = useMemo(
    () => [...entities].sort((left, right) => compareEntities(left, right, sortMode)),
    [entities, sortMode],
  );

  const groupEntities = useMemo(
    () => entities.filter((entity) => entity.type === 'group').sort((a, b) => a.name.localeCompare(b.name)),
    [entities],
  );

  const nonGroupEntities = useMemo(
    () => sortedEntities.filter((entity) => entity.type !== 'group'),
    [sortedEntities],
  );

  const membersByGroup = useMemo(() => {
    const map: Record<string, string[]> = {};
    memberships.forEach((membership: ApiMembership) => {
      if (!map[membership.groupId]) {
        map[membership.groupId] = [];
      }
      map[membership.groupId].push(membership.characterId);
    });
    return map;
  }, [memberships]);

  const binderItems = useMemo<BinderItem[]>(() => {
    if (sortMode !== 'manual') return [];

    const groups = entities.filter((entity) => entity.type === 'group').sort(compareByPosition);
    const flat: BinderItem[] = [];

    for (const group of groups) {
      flat.push({ kind: 'group', entity: group });
      if (!(expandedGroups[group.id] ?? false)) {
        continue;
      }

      const memberIds = membersByGroup[group.id] ?? [];
      const members = memberIds
        .map((id) => entities.find((entity) => entity.id === id))
        .filter(Boolean) as ApiEntity[];
      members.sort(compareByPosition);
      for (const member of members) {
        flat.push({ kind: 'member', entity: member, groupId: group.id });
      }
    }

    const memberIdSet = new Set(Object.values(membersByGroup).flat());
    const standaloneEntities = entities
      .filter((entity) => entity.type !== 'group' && !memberIdSet.has(entity.id))
      .sort(compareByPosition);

    for (const entity of standaloneEntities) {
      flat.push({ kind: 'entity', entity });
    }

    return flat;
  }, [sortMode, entities, membersByGroup, expandedGroups]);

  function dismissTransientUi() {
    setSortPickerOpen(false);
    setTypePickerOpen(false);
  }

  async function handleCreate(type: ApiEntity['type']) {
    setCreatingType(type);
    setCreateError(null);
    try {
      const entry = await createEntity(type);
      activateEntity('entity', entry.id);
      setJustCreatedId(entry.id);
      setTypePickerOpen(false);
    } catch (e: any) {
      setCreateError(e.message ?? 'Failed to create entity.');
    } finally {
      setCreatingType(null);
    }
  }


  async function handleDragEnd({ data }: { data: BinderItem[] }) {
    const oldMembersByGroup: Record<string, string[]> = {};
    for (const [groupId, memberIds] of Object.entries(membersByGroup)) {
      oldMembersByGroup[groupId] = [...memberIds];
    }

    const positionUpdates: Array<{ id: string; position: number }> = data.map((item, index) => ({
      id: item.entity.id,
      position: index + 1,
    }));
    positionUpdates.forEach(({ id, position }) => updateEntityPosition(id, position));

    let currentGroupId: string | null = null;
    const newMembersByGroup: Record<string, string[]> = {};

    entities
      .filter((entity) => entity.type === 'group')
      .forEach((group) => {
        if (!(expandedGroups[group.id] ?? false)) {
          newMembersByGroup[group.id] = [...(oldMembersByGroup[group.id] ?? [])];
        }
      });

    for (const item of data) {
      if (item.kind === 'group') {
        currentGroupId = item.entity.id;
        newMembersByGroup[currentGroupId] = newMembersByGroup[currentGroupId] ?? [];
      } else if (currentGroupId !== null) {
        newMembersByGroup[currentGroupId].push(item.entity.id);
      }
    }

    for (const [groupId, newMembers] of Object.entries(newMembersByGroup)) {
      const oldMembers = oldMembersByGroup[groupId] ?? [];
      for (const memberId of newMembers) {
        if (!oldMembers.includes(memberId)) {
          void addMembership(memberId, groupId);
        }
      }
    }

    const allNewMembers = new Set(Object.values(newMembersByGroup).flat());
    for (const [groupId, oldMembers] of Object.entries(oldMembersByGroup)) {
      for (const memberId of oldMembers) {
        if (!allNewMembers.has(memberId)) {
          void removeMembership(memberId, groupId);
        }
      }
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: colors.bg }}>
      {/* Top bar */}
      <View
        className="flex-row items-center px-4"
        style={{ height: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <TouchableOpacity onPress={() => router.replace('/')} hitSlop={8} style={{ marginRight: 12 }}>
          <Text style={{ color: colors.accent, fontSize: 20, lineHeight: 24 }}>‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-[15px] font-bold" style={{ color: colors.text }} numberOfLines={1}>
          {universeName}
        </Text>
        <View className="flex-row items-center">
          <View
            className="mr-1 h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: editorSaveState === 'saved' ? colors.bible : colors.accent }}
          />
          <Text className="mr-3 text-[11px]" style={{ color: colors.faint }}>
            {editorSaveState === 'saved' ? 'Saved' : 'Saving…'}
          </Text>
          <TouchableOpacity onPress={() => setGestureHelpVisible(true)} hitSlop={8}>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600' }}>?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gesture legend modal */}
      <Modal visible={gestureHelpVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setGestureHelpVisible(false)}
        >
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 24, width: 320, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>Gestures & Shortcuts</Text>
            {[
              ['2-finger swipe right', 'Open binder'],
              ['2-finger swipe left', 'Close binder'],
              ['Tab', 'Next block (character editor)'],
              ['Long press universe', 'Delete universe'],
            ].map(([gesture, action]) => (
              <View key={gesture} style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', width: 180 }}>{gesture}</Text>
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{action}</Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setGestureHelpVisible(false)}
              style={{ marginTop: 8, alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.bg, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <PanGestureHandler
        minPointers={2}
        maxPointers={2}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END) {
            if (nativeEvent.translationX > 60 && !binderOpen) {
              setBinderOpen(true);
            } else if (nativeEvent.translationX < -60 && binderOpen) {
              dismissTransientUi();
              setBinderOpen(false);
            }
          }
        }}
      >
      <View className="flex-1 flex-row">
        {binderOpen ? (
          <View
            className="flex-col"
            style={{ width: BINDER_WIDTH, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <View className="flex-row items-center px-3" style={{ height: 48, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text className="flex-1 text-sm font-bold" style={{ color: colors.text }}>
                Entities
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTypePickerOpen(false);
                  setSortPickerOpen((current) => !current);
                }}
                style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 5 }}
              >
                <Text className="text-[12px] font-medium" style={{ color: colors.text }}>
                  Sort
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSortPickerOpen(false);
                  setTypePickerOpen((current) => !current);
                }}
                className="ml-2"
                style={{ paddingHorizontal: 10, paddingVertical: 2 }}
              >
                <Text className="text-[22px]" style={{ color: colors.accent }}>
                  +
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  dismissTransientUi();
                  setBinderOpen(false);
                }}
                className="ml-1"
                style={{ paddingHorizontal: 8, paddingVertical: 4 }}
              >
                <Text className="text-xl" style={{ color: colors.muted }}>
                  ‹
                </Text>
              </TouchableOpacity>
            </View>

            {sortPickerOpen ? (
              <SortPicker
                value={sortMode}
                onChange={(next) => {
                  setSortMode(next);
                  setSortPickerOpen(false);
                }}
              />
            ) : null}

            {typePickerOpen ? (
              <TypePicker creatingType={creatingType} onCreate={handleCreate} />
            ) : null}
            {createError ? (
              <Text className="px-4 py-1 text-xs" style={{ color: '#e05050' }}>{createError}</Text>
            ) : null}

            {sortMode === 'manual' ? (
              <DraggableFlatList
                data={binderItems}
                keyExtractor={(item) =>
                  item.kind === 'member'
                    ? `${item.kind}:${item.groupId}:${item.entity.id}`
                    : `${item.kind}:${item.entity.id}`
                }
                onDragEnd={handleDragEnd}
                activationDistance={0}
                autoscrollSpeed={120}
                containerStyle={{ flex: 1 }}
                renderItem={({ item, drag, isActive }: RenderItemParams<BinderItem>) => (
                  <ManualBinderRow
                    item={item}
                    activeEntityId={activeEntityId}
                    memberCount={item.kind === 'group' ? (membersByGroup[item.entity.id] ?? []).length : undefined}
                    expanded={item.kind === 'group' ? (expandedGroups[item.entity.id] ?? false) : undefined}
                    onToggle={item.kind === 'group'
                      ? () => setExpandedGroups((current) => ({ ...current, [item.entity.id]: !current[item.entity.id] }))
                      : undefined}
                    onPress={() => {
                      dismissTransientUi();
                      activateEntity('entity', item.entity.id);
                    }}
                    onDragLongPress={drag}
                    isDragging={isActive}
                  />
                )}
                ListEmptyComponent={
                  loadingEntities ? (
                    <ActivityIndicator size="small" color={colors.faint} className="py-4" />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        setSortPickerOpen(false);
                        setTypePickerOpen(true);
                      }}
                      className="px-4 py-3"
                    >
                      <Text className="text-sm" style={{ color: colors.faint }}>
                        Tap + to create your first entity
                      </Text>
                    </TouchableOpacity>
                  )
                }
              />
            ) : (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
            >
              {loadingEntities ? (
                <ActivityIndicator size="small" color={colors.faint} className="py-4" />
              ) : null}

              {!loadingEntities && groupEntities.length === 0 && nonGroupEntities.length === 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setSortPickerOpen(false);
                    setTypePickerOpen(true);
                  }}
                  className="px-4 py-3"
                >
                  <Text className="text-sm" style={{ color: colors.faint }}>
                    Tap + to create your first entity
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!loadingEntities && groupEntities.map((group) => {
                const memberIds = membersByGroup[group.id] ?? [];
                const memberEntities = memberIds
                  .map((id) => entities.find((entity) => entity.id === id))
                  .filter(Boolean) as ApiEntity[];
                const isExpanded = expandedGroups[group.id] ?? false;

                return (
                  <View key={group.id}>
                    <GroupRow
                      group={group}
                      memberCount={memberEntities.length}
                      expanded={isExpanded}
                      onToggle={() =>
                        setExpandedGroups((current) => ({ ...current, [group.id]: !current[group.id] }))
                      }
                      onPress={() => {
                        dismissTransientUi();
                        activateEntity('entity', group.id);
                      }}
                    />
                    {isExpanded && memberEntities.map((member) => (
                      <View key={member.id} style={{ paddingLeft: 20 }}>
                        <EntityRow
                          entity={member}
                          onPress={() => {
                            dismissTransientUi();
                            activateEntity('entity', member.id);
                          }}
                        />
                      </View>
                    ))}
                  </View>
                );
              })}

              {groupEntities.length > 0 && nonGroupEntities.length > 0 ? (
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              ) : null}

              {!loadingEntities && nonGroupEntities.map((entity) => (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  onPress={() => {
                    dismissTransientUi();
                    activateEntity('entity', entity.id);
                  }}
                />
              ))}
            </ScrollView>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setBinderOpen(true)}
            className="items-center justify-center"
            style={{ width: 36, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <Text className="text-xl" style={{ color: colors.muted }}>
              ›
            </Text>
          </TouchableOpacity>
        )}

        <View
          className="flex-1"
          onTouchStart={() => {
            setSortPickerOpen(false);
            setTypePickerOpen(false);
          }}
        >
          <ContentArea
            justCreatedId={justCreatedId}
            onAutoFocusDone={() => setJustCreatedId(null)}
            onSaveStateChange={setEditorSaveState}
          />
        </View>
      </View>
      </PanGestureHandler>
    </SafeAreaView>
  );
}

export default function UniverseScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const universeId = id as string;
  const universeName = decodeURIComponent(name as string);

  return (
    <UniverseProvider universeId={universeId} universeName={universeName}>
      <UniverseWorkspace />
    </UniverseProvider>
  );
}
