import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CharacterEditor from '../../components/CharacterEditor';
import EntityEditor from '../../components/EntityEditor';
import GroupEditor from '../../components/GroupEditor';
import { UniverseProvider, useUniverse } from '../../context/UniverseContext';
import { type ApiBibleEntry, type ApiMembership } from '../../lib/api';
import { colors } from '../../theme';

const BINDER_WIDTH = 264;

type SortMode = 'az' | 'type' | 'recent';

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

function entityColor(type: ApiBibleEntry['type']) {
  if (type === 'character') return colors.accent;
  if (type === 'location') return colors.bible;
  if (type === 'group') return '#9B7FD4';
  return colors.muted;
}

function compareEntities(left: ApiBibleEntry, right: ApiBibleEntry, sortMode: SortMode) {
  if (sortMode === 'recent') {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }

  if (sortMode === 'type') {
    const typeOrder: Record<ApiBibleEntry['type'], number> = {
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

function PrimaryContent({
  justCreatedId,
  onAutoFocusDone,
}: {
  justCreatedId: string | null;
  onAutoFocusDone: () => void;
}) {
  const { activeEntityType, activeEntityId, universeName, entities } = useUniverse();

  if (activeEntityType === 'bible_entry' && activeEntityId) {
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
}: {
  justCreatedId: string | null;
  onAutoFocusDone: () => void;
}) {
  const { depthState } = useUniverse();

  if (depthState === 'dossier_only') {
    return <DossierPlaceholder />;
  }

  if (depthState === 'split') {
    return (
      <View className="flex-1 flex-row">
        <View className="flex-1 border-r" style={{ borderColor: colors.border }}>
          <PrimaryContent justCreatedId={justCreatedId} onAutoFocusDone={onAutoFocusDone} />
        </View>
        <View className="flex-1">
          <DossierPlaceholder />
        </View>
      </View>
    );
  }

  return <PrimaryContent justCreatedId={justCreatedId} onAutoFocusDone={onAutoFocusDone} />;
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
  creatingType: ApiBibleEntry['type'] | null;
  onCreate: (type: ApiBibleEntry['type']) => void;
}) {
  const options: Array<{ type: ApiBibleEntry['type']; label: string }> = [
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
  pendingDelete,
  onDeleteConfirm,
  onDeleteCancel,
  onPress,
  onLongPress,
}: {
  entity: ApiBibleEntry;
  pendingDelete: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { activeEntityId } = useUniverse();
  const isActive = activeEntityId === entity.id;

  if (pendingDelete) {
    return (
      <View
        className="h-11 flex-row items-center px-4"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }}
      >
        <Text className="flex-1 text-[13px]" style={{ color: colors.text }}>
          Delete {entity.name}?
        </Text>
        <TouchableOpacity onPress={onDeleteConfirm}>
          <Text className="text-[13px] font-semibold" style={{ color: '#d14b4b' }}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDeleteCancel} className="ml-4">
          <Text className="text-[13px] font-semibold" style={{ color: colors.faint }}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} delayLongPress={250}>
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
  onLongPress,
  pendingDelete,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  group: ApiBibleEntry;
  memberCount: number;
  expanded: boolean;
  onToggle: () => void;
  onPress: () => void;
  onLongPress: () => void;
  pendingDelete: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const { activeEntityId } = useUniverse();
  const isActive = activeEntityId === group.id;

  if (pendingDelete) {
    return (
      <View
        className="h-11 flex-row items-center px-4"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }}
      >
        <Text className="flex-1 text-[13px]" style={{ color: colors.text }}>
          Delete {group.name}?
        </Text>
        <TouchableOpacity onPress={onDeleteConfirm}>
          <Text className="text-[13px] font-semibold" style={{ color: '#d14b4b' }}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDeleteCancel} className="ml-4">
          <Text className="text-[13px] font-semibold" style={{ color: colors.faint }}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} delayLongPress={250}>
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

function UniverseWorkspace() {
  const router = useRouter();
  const {
    universeName,
    entities,
    memberships,
    loadingEntities,
    binderOpen,
    setBinderOpen,
    activateEntity,
    createEntity,
    deleteEntity,
  } = useUniverse();
  const [sortMode, setSortMode] = useState<SortMode>('az');
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [creatingType, setCreatingType] = useState<ApiBibleEntry['type'] | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

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

  function dismissTransientUi() {
    setSortPickerOpen(false);
    setTypePickerOpen(false);
    setPendingDeleteId(null);
  }

  async function handleCreate(type: ApiBibleEntry['type']) {
    setCreatingType(type);
    try {
      const entry = await createEntity(type);
      activateEntity('bible_entry', entry.id);
      setJustCreatedId(entry.id);
      setTypePickerOpen(false);
    } finally {
      setCreatingType(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteEntity(id);
    setPendingDeleteId(null);
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View
        className="flex-row items-center px-4"
        style={{ height: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <TouchableOpacity onPress={() => router.replace('/')} className="flex-1">
          <Text className="text-[13px] font-semibold" style={{ color: colors.accent }}>
            ← Universes
          </Text>
        </TouchableOpacity>
        <Text className="text-[10px]" style={{ color: colors.faint }}>
          ● Saved
        </Text>
        <View className="flex-1" />
      </View>

      <View className="flex-1 flex-row">
        {binderOpen ? (
          <View
            className="flex-col"
            style={{ width: BINDER_WIDTH, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <View className="flex-row items-center px-4" style={{ height: 48, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text className="flex-1 text-sm font-bold" style={{ color: colors.text }}>
                {universeName}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTypePickerOpen(false);
                  setPendingDeleteId(null);
                  setSortPickerOpen((current) => !current);
                }}
              >
                <Text className="text-[13px]" style={{ color: colors.text }}>
                  Sort
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSortPickerOpen(false);
                  setPendingDeleteId(null);
                  setTypePickerOpen((current) => !current);
                }}
                className="ml-3"
              >
                <Text className="text-[20px]" style={{ color: colors.accent }}>
                  +
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  dismissTransientUi();
                  setBinderOpen(false);
                }}
                className="ml-3"
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
                  .filter(Boolean) as ApiBibleEntry[];
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
                        activateEntity('bible_entry', group.id);
                      }}
                      onLongPress={() => setPendingDeleteId(group.id)}
                      pendingDelete={pendingDeleteId === group.id}
                      onDeleteConfirm={() => handleDelete(group.id)}
                      onDeleteCancel={() => setPendingDeleteId(null)}
                    />
                    {isExpanded && memberEntities.map((member) => (
                      <View key={member.id} style={{ paddingLeft: 20 }}>
                        <EntityRow
                          entity={member}
                          pendingDelete={pendingDeleteId === member.id}
                          onDeleteConfirm={() => handleDelete(member.id)}
                          onDeleteCancel={() => setPendingDeleteId(null)}
                          onPress={() => {
                            dismissTransientUi();
                            activateEntity('bible_entry', member.id);
                          }}
                          onLongPress={() => setPendingDeleteId(member.id)}
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
                  pendingDelete={pendingDeleteId === entity.id}
                  onDeleteConfirm={() => handleDelete(entity.id)}
                  onDeleteCancel={() => setPendingDeleteId(null)}
                  onPress={() => {
                    dismissTransientUi();
                    activateEntity('bible_entry', entity.id);
                  }}
                  onLongPress={() => setPendingDeleteId(entity.id)}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setBinderOpen(true)}
            className="items-center justify-center"
            style={{ width: 22, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border }}
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
            setPendingDeleteId(null);
          }}
        >
          <ContentArea justCreatedId={justCreatedId} onAutoFocusDone={() => setJustCreatedId(null)} />
        </View>
      </View>
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
