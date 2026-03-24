import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CharacterEditor from '../../components/CharacterEditor';
import EntityEditor from '../../components/EntityEditor';
import GroupEditor from '../../components/GroupEditor';
import ErrorBoundary from '../../components/ErrorBoundary';
import { UniverseProvider, useUniverse } from '../../context/UniverseContext';
import { useTheme } from '../../context/ThemeContext';
import { type ApiEntity } from '../../lib/api';

const BINDER_WIDTH = 260;

type SortMode = 'az' | 'type' | 'recent';

function compareEntities(left: ApiEntity, right: ApiEntity, sortMode: SortMode) {
  if (sortMode === 'recent') {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }
  if (sortMode === 'type') {
    const order: Record<string, number> = { group: 0, character: 1, location: 2, note: 3 };
    const cmp = (order[left.type] ?? 9) - (order[right.type] ?? 9);
    if (cmp !== 0) return cmp;
  }
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function typeLabel(type: string): string {
  if (type === 'character') return 'C';
  if (type === 'location') return 'L';
  if (type === 'group') return 'G';
  if (type === 'note') return 'N';
  if (type === 'folder') return 'F';
  return '?';
}

function EmptyContent() {
  const { colors, mono } = useTheme();
  const { universeName } = useUniverse();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontFamily: mono, fontSize: 14, color: colors.muted }}>
        {universeName}
      </Text>
      <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, marginTop: 8 }}>
        Select an entity from the binder.
      </Text>
    </View>
  );
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
  const { activeEntityType, activeEntityId, entities } = useUniverse();

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

  return <EmptyContent />;
}

function EntityRow({ entity, onPress }: { entity: ApiEntity; onPress: () => void }) {
  const { colors, mono } = useTheme();
  const { activeEntityId } = useUniverse();
  const isActive = activeEntityId === entity.id;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isActive ? colors.selection : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, width: 16 }}>
          {typeLabel(entity.type)}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: mono, fontSize: 13, color: isActive ? colors.text : colors.text, flex: 1 }}>
          {entity.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function UniverseWorkspace() {
  const router = useRouter();
  const { colors, mono, toggle, mode } = useTheme();
  const {
    universeName,
    entities,
    loadingEntities,
    binderOpen,
    setBinderOpen,
    activateEntity,
    createEntity,
  } = useUniverse();

  const [sortMode, setSortMode] = useState<SortMode>('az');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [creatingType, setCreatingType] = useState<ApiEntity['type'] | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [editorSaveState, setEditorSaveState] = useState<'saved' | 'saving'>('saved');
  const [createError, setCreateError] = useState<string | null>(null);

  const sortedEntities = useMemo(
    () => [...entities].sort((a, b) => compareEntities(a, b, sortMode)),
    [entities, sortMode],
  );

  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'az', label: 'a-z' },
    { value: 'type', label: 'type' },
    { value: 'recent', label: 'recent' },
  ];

  const typeOptions: Array<{ type: ApiEntity['type']; label: string }> = [
    { type: 'character', label: 'character' },
    { type: 'location', label: 'location' },
    { type: 'note', label: 'note' },
    { type: 'group', label: 'group' },
  ];

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.replace('/')} style={{ marginRight: 12 }}>
          <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>{'<'}</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}>
          {universeName}
        </Text>
        <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>
          {editorSaveState === 'saved' ? 'saved' : 'saving...'}
        </Text>
        <TouchableOpacity onPress={toggle} style={{ marginLeft: 12 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>
            {mode === 'dark' ? 'light' : 'dark'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Binder */}
        {binderOpen ? (
          <View style={{ width: BINDER_WIDTH, borderRightWidth: 1, borderRightColor: colors.border }}>
            {/* Binder header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              height: 36,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              {sortOptions.map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => setSortMode(opt.value)} style={{ marginRight: 10 }}>
                  <Text style={{
                    fontFamily: mono,
                    fontSize: 11,
                    color: sortMode === opt.value ? colors.text : colors.muted,
                    textDecorationLine: sortMode === opt.value ? 'underline' : 'none',
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setTypePickerOpen(o => !o)}>
                <Text style={{ fontFamily: mono, fontSize: 15, color: colors.text }}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBinderOpen(false)} style={{ marginLeft: 10 }}>
                <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>{'<'}</Text>
              </TouchableOpacity>
            </View>

            {/* Type picker */}
            {typePickerOpen && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                {typeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    onPress={() => handleCreate(opt.type)}
                    disabled={creatingType !== null}
                    style={{ marginRight: 10, paddingVertical: 4 }}
                  >
                    {creatingType === opt.type
                      ? <ActivityIndicator size="small" color={colors.muted} />
                      : <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>{opt.label}</Text>
                    }
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {createError && (
              <Text style={{ fontFamily: mono, fontSize: 11, color: colors.error, paddingHorizontal: 12, paddingVertical: 4 }}>
                {createError}
              </Text>
            )}

            {/* Entity list */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {loadingEntities && (
                <ActivityIndicator size="small" color={colors.muted} style={{ marginTop: 16 }} />
              )}
              {!loadingEntities && sortedEntities.length === 0 && (
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, padding: 12 }}>
                  empty. tap + to create.
                </Text>
              )}
              {!loadingEntities && sortedEntities.map((entity) => (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  onPress={() => {
                    setTypePickerOpen(false);
                    activateEntity('entity', entity.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setBinderOpen(true)}
            style={{
              width: 32,
              justifyContent: 'center',
              alignItems: 'center',
              borderRightWidth: 1,
              borderRightColor: colors.border,
            }}
          >
            <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>{'>'}</Text>
          </TouchableOpacity>
        )}

        {/* Editor */}
        <View style={{ flex: 1 }}>
          <ErrorBoundary colors={colors} mono={mono}>
            <PrimaryContent
              justCreatedId={justCreatedId}
              onAutoFocusDone={() => setJustCreatedId(null)}
              onSaveStateChange={setEditorSaveState}
            />
          </ErrorBoundary>
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