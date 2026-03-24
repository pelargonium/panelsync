import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUniverse } from '../context/UniverseContext';
import { type ApiEntity, type ApiMembership } from '../lib/api';

type EntityType = ApiEntity['type'];

const TYPE_SECTIONS: Array<{ type: EntityType; label: string }> = [
  { type: 'character', label: 'Characters' },
  { type: 'location', label: 'Locations' },
  { type: 'note', label: 'Notes' },
  { type: 'group', label: 'Groups' },
];

function typeLabel(type: string): string {
  if (type === 'character') return 'C';
  if (type === 'location') return 'L';
  if (type === 'group') return 'G';
  if (type === 'note') return 'N';
  if (type === 'folder') return 'F';
  return '?';
}

// Build a map of parentId -> children for folder nesting
function buildFolderTree(entities: ApiEntity[], memberships: ApiMembership[]) {
  // memberships use groupId as parent, characterId as child
  // (naming is legacy from when only groups had members)
  const childrenOf: Record<string, string[]> = {};
  const parentOf: Record<string, string> = {};

  for (const m of memberships) {
    const parent = entities.find((e) => e.id === m.groupId);
    if (!parent || (parent.type !== 'folder' && parent.type !== 'group')) continue;
    if (!childrenOf[m.groupId]) childrenOf[m.groupId] = [];
    childrenOf[m.groupId].push(m.characterId);
    parentOf[m.characterId] = m.groupId;
  }

  return { childrenOf, parentOf };
}

function EntityRow({
  entity,
  depth,
  isActive,
  onPress,
}: {
  entity: ApiEntity;
  depth: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors, mono } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12 + depth * 16,
        paddingRight: 12,
        paddingVertical: 10,
        backgroundColor: isActive ? colors.selection : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, width: 16 }}>
          {typeLabel(entity.type)}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}>
          {entity.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FolderRow({
  entity,
  depth,
  isActive,
  isExpanded,
  childCount,
  onPress,
  onToggle,
}: {
  entity: ApiEntity;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  childCount: number;
  onPress: () => void;
  onToggle: () => void;
}) {
  const { colors, mono } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12 + depth * 16,
        paddingRight: 12,
        paddingVertical: 10,
        backgroundColor: isActive ? colors.selection : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={onToggle} hitSlop={8} style={{ width: 16 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>
            {isExpanded ? 'v' : '>'}
          </Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}>
          {entity.name}
        </Text>
        {childCount > 0 && (
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>{childCount}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function FolderContents({
  folderId,
  entities,
  childrenOf,
  depth,
  activeEntityId,
  expanded,
  onToggle,
  onSelect,
}: {
  folderId: string;
  entities: ApiEntity[];
  childrenOf: Record<string, string[]>;
  depth: number;
  activeEntityId: string | null;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const childIds = childrenOf[folderId] ?? [];
  const children = childIds
    .map((id) => entities.find((e) => e.id === id))
    .filter(Boolean) as ApiEntity[];

  // Sort: folders first, then alphabetically
  children.sort((a, b) => {
    const aFolder = a.type === 'folder' || a.type === 'group' ? 0 : 1;
    const bFolder = b.type === 'folder' || b.type === 'group' ? 0 : 1;
    if (aFolder !== bFolder) return aFolder - bFolder;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return (
    <>
      {children.map((child) => {
        if (child.type === 'folder') {
          const isExpanded = expanded[child.id] ?? false;
          const count = (childrenOf[child.id] ?? []).length;
          return (
            <View key={child.id}>
              <FolderRow
                entity={child}
                depth={depth}
                isActive={activeEntityId === child.id}
                isExpanded={isExpanded}
                childCount={count}
                onPress={() => onSelect(child.id)}
                onToggle={() => onToggle(child.id)}
              />
              {isExpanded && (
                <FolderContents
                  folderId={child.id}
                  entities={entities}
                  childrenOf={childrenOf}
                  depth={depth + 1}
                  activeEntityId={activeEntityId}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              )}
            </View>
          );
        }

        return (
          <EntityRow
            key={child.id}
            entity={child}
            depth={depth}
            isActive={activeEntityId === child.id}
            onPress={() => onSelect(child.id)}
          />
        );
      })}
    </>
  );
}

interface BinderProps {
  onCreateEntity: (type: EntityType) => void;
  onCreateFolder: () => void;
  creatingType: EntityType | null;
}

export default function Binder({ onCreateEntity, onCreateFolder, creatingType }: BinderProps) {
  const { colors, mono } = useTheme();
  const { entities, memberships, loadingEntities, activeEntityId, activateEntity } = useUniverse();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createPickerOpen, setCreatePickerOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { childrenOf, parentOf } = useMemo(
    () => buildFolderTree(entities, memberships),
    [entities, memberships],
  );

  // Entities grouped by type, excluding those inside folders
  const sectionEntities = useMemo(() => {
    const result: Record<string, ApiEntity[]> = {};
    for (const section of TYPE_SECTIONS) {
      result[section.type] = entities
        .filter((e) => e.type === section.type && !parentOf[e.id])
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return result;
  }, [entities, parentOf]);

  // Top-level curated folders (folders not inside other folders)
  const topFolders = useMemo(
    () => entities
      .filter((e) => e.type === 'folder' && !parentOf[e.id])
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [entities, parentOf],
  );

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSelect(id: string) {
    setCreatePickerOpen(false);
    activateEntity('entity', id);
  }

  const createOptions: Array<{ type: EntityType; label: string }> = [
    { type: 'character', label: 'character' },
    { type: 'location', label: 'location' },
    { type: 'note', label: 'note' },
    { type: 'group', label: 'group' },
    { type: 'folder', label: 'folder' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Binder header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 36,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, flex: 1 }}>binder</Text>
        <TouchableOpacity onPress={() => setCreatePickerOpen((o) => !o)}>
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
          {createOptions.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              onPress={() => {
                setCreateError(null);
                if (opt.type === 'folder') {
                  onCreateFolder();
                } else {
                  onCreateEntity(opt.type);
                }
                setCreatePickerOpen(false);
              }}
              disabled={creatingType !== null}
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

      {/* Scrollable content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {loadingEntities && (
          <ActivityIndicator size="small" color={colors.muted} style={{ marginTop: 16 }} />
        )}

        {!loadingEntities && entities.length === 0 && (
          <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, padding: 12 }}>
            empty. tap + to create.
          </Text>
        )}

        {!loadingEntities && (
          <>
            {/* Curated folders (top level) */}
            {topFolders.map((folder) => {
              const isExpanded = expanded[folder.id] ?? false;
              const count = (childrenOf[folder.id] ?? []).length;

              return (
                <View key={folder.id}>
                  <FolderRow
                    entity={folder}
                    depth={0}
                    isActive={activeEntityId === folder.id}
                    isExpanded={isExpanded}
                    childCount={count}
                    onPress={() => handleSelect(folder.id)}
                    onToggle={() => toggleSection(folder.id)}
                  />
                  {isExpanded && (
                    <FolderContents
                      folderId={folder.id}
                      entities={entities}
                      childrenOf={childrenOf}
                      depth={1}
                      activeEntityId={activeEntityId}
                      expanded={expanded}
                      onToggle={toggleSection}
                      onSelect={handleSelect}
                    />
                  )}
                </View>
              );
            })}

            {topFolders.length > 0 && (
              <View style={{ height: 8 }} />
            )}

            {/* Auto type sections */}
            {TYPE_SECTIONS.map((section) => {
              const items = sectionEntities[section.type] ?? [];
              if (items.length === 0) return null;

              const sectionKey = `section:${section.type}`;
              const isExpanded = expanded[sectionKey] ?? true; // default open
              const isGroup = section.type === 'group';

              return (
                <View key={section.type}>
                  <TouchableOpacity
                    onPress={() => toggleSection(sectionKey)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, width: 16 }}>
                      {isExpanded ? 'v' : '>'}
                    </Text>
                    <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, letterSpacing: 1, flex: 1 }}>
                      {section.label} ({items.length})
                    </Text>
                  </TouchableOpacity>

                  {isExpanded && items.map((entity) => {
                    // For groups, render with expand/collapse for members
                    if (isGroup) {
                      const groupExpanded = expanded[entity.id] ?? false;
                      const memberCount = (childrenOf[entity.id] ?? []).length;
                      return (
                        <View key={entity.id}>
                          <FolderRow
                            entity={entity}
                            depth={1}
                            isActive={activeEntityId === entity.id}
                            isExpanded={groupExpanded}
                            childCount={memberCount}
                            onPress={() => handleSelect(entity.id)}
                            onToggle={() => toggleSection(entity.id)}
                          />
                          {groupExpanded && (
                            <FolderContents
                              folderId={entity.id}
                              entities={entities}
                              childrenOf={childrenOf}
                              depth={2}
                              activeEntityId={activeEntityId}
                              expanded={expanded}
                              onToggle={toggleSection}
                              onSelect={handleSelect}
                            />
                          )}
                        </View>
                      );
                    }

                    return (
                      <EntityRow
                        key={entity.id}
                        entity={entity}
                        depth={1}
                        isActive={activeEntityId === entity.id}
                        onPress={() => handleSelect(entity.id)}
                      />
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
