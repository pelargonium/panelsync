import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { colors } from '../theme';

const COLOR_PALETTE = ['#c8a768', '#1E6B3C', '#1B4FD8', '#6B2D8B', '#C41E1E', '#4A4A5A'];

type SaveState = 'saved' | 'saving';

interface GroupEditorProps {
  entityId: string;
}

export default function GroupEditor({ entityId }: GroupEditorProps) {
  const { memberships, entities, addMembership, removeMembership, updateEntityName } = useUniverse();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const hydratedRef = useRef(false);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSavesRef = useRef(0);
  const latestNameRef = useRef('');
  const latestBodyRef = useRef('');
  const savedNameRef = useRef('');
  const savedBodyRef = useRef('');

  const members = useMemo(() => {
    const memberIds = new Set(
      memberships.filter((item) => item.groupId === entityId).map((item) => item.characterId),
    );
    return entities.filter((entity) => memberIds.has(entity.id));
  }, [memberships, entityId, entities]);

  const availableCharacters = useMemo(() => {
    const memberIds = new Set(
      memberships.filter((item) => item.groupId === entityId).map((item) => item.characterId),
    );
    return entities.filter((entity) => entity.type === 'character' && !memberIds.has(entity.id));
  }, [memberships, entityId, entities]);

  function clearTimers() {
    if (nameTimerRef.current) {
      clearTimeout(nameTimerRef.current);
      nameTimerRef.current = null;
    }
    if (bodyTimerRef.current) {
      clearTimeout(bodyTimerRef.current);
      bodyTimerRef.current = null;
    }
  }

  function syncSaveState() {
    if (nameTimerRef.current || bodyTimerRef.current || inFlightSavesRef.current > 0) {
      setSaveState('saving');
      return;
    }
    setSaveState('saved');
  }

  async function runSave(task: () => Promise<void>) {
    inFlightSavesRef.current += 1;
    syncSaveState();
    try {
      await task();
    } finally {
      inFlightSavesRef.current -= 1;
      syncSaveState();
    }
  }

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    clearTimers();
    inFlightSavesRef.current = 0;
    setSaveState('saved');
    setColorPickerOpen(false);
    setAddMemberOpen(false);
    setLoading(true);

    api.bible.get(entityId)
      .then((res) => {
        if (cancelled) return;
        setName(res.data.name);
        setColor(res.data.color);
        setBody(res.data.bodyText);
        latestNameRef.current = res.data.name;
        latestBodyRef.current = res.data.bodyText;
        savedNameRef.current = res.data.name;
        savedBodyRef.current = res.data.bodyText;
        hydratedRef.current = true;
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimers();
      inFlightSavesRef.current = 0;
    };
  }, [entityId]);

  useEffect(() => {
    latestNameRef.current = name;
    if (!hydratedRef.current) return;

    if (nameTimerRef.current) {
      clearTimeout(nameTimerRef.current);
    }

    if (name === savedNameRef.current) {
      syncSaveState();
      return;
    }

    nameTimerRef.current = setTimeout(() => {
      nameTimerRef.current = null;
      const nextName = latestNameRef.current.trim();

      if (!nextName) {
        syncSaveState();
        return;
      }

      runSave(async () => {
        await api.bible.update(entityId, { name: nextName });
        savedNameRef.current = nextName;
        updateEntityName(entityId, nextName);
      }).catch(() => {});
    }, 600);

    syncSaveState();

    return () => {
      if (nameTimerRef.current) {
        clearTimeout(nameTimerRef.current);
        nameTimerRef.current = null;
      }
    };
  }, [entityId, name, updateEntityName]);

  useEffect(() => {
    latestBodyRef.current = body;
    if (!hydratedRef.current) return;

    if (bodyTimerRef.current) {
      clearTimeout(bodyTimerRef.current);
    }

    if (body === savedBodyRef.current) {
      syncSaveState();
      return;
    }

    bodyTimerRef.current = setTimeout(() => {
      bodyTimerRef.current = null;
      const nextBody = latestBodyRef.current;

      runSave(async () => {
        await api.bible.updateContent(entityId, nextBody);
        savedBodyRef.current = nextBody;
      }).catch(() => {});
    }, 600);

    syncSaveState();

    return () => {
      if (bodyTimerRef.current) {
        clearTimeout(bodyTimerRef.current);
        bodyTimerRef.current = null;
      }
    };
  }, [body, entityId]);

  async function handleColorChange(nextColor: string) {
    setColor(nextColor);
    setColorPickerOpen(false);
    await runSave(async () => {
      await api.bible.update(entityId, { color: nextColor });
    }).catch(() => {});
  }

  async function handleAddMember(characterId: string) {
    setAddMemberOpen(false);
    await runSave(async () => {
      await addMembership(characterId, entityId);
    }).catch(() => {});
  }

  async function handleRemoveMember(characterId: string) {
    await runSave(async () => {
      await removeMembership(characterId, entityId);
    }).catch(() => {});
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View className="flex-row items-center" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <View
          className="mr-2 h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: saveState === 'saved' ? colors.bible : colors.accent }}
        />
        <Text className="text-xs font-medium" style={{ color: colors.faint }}>
          {saveState === 'saved' ? 'Saved' : 'Saving…'}
        </Text>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-8 pb-4 pt-10">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Untitled Group"
            placeholderTextColor={colors.faint}
            style={{ color: colors.text, fontSize: 28, fontWeight: '700', paddingVertical: 0 }}
          />

          <View className="mt-2 flex-row items-center">
            <TouchableOpacity onPress={() => setColorPickerOpen((current) => !current)}>
              <View className="h-[14px] w-[14px] rounded-full" style={{ backgroundColor: color ?? '#9B7FD4' }} />
            </TouchableOpacity>
            <View className="ml-3 rounded-full border px-2 py-1" style={{ borderColor: colors.border }}>
              <Text className="text-[11px]" style={{ color: colors.muted }}>
                Group
              </Text>
            </View>
          </View>

          {colorPickerOpen ? (
            <View className="mt-2 flex-row items-center justify-between">
              {COLOR_PALETTE.map((swatch) => {
                const active = swatch === color;
                return (
                  <TouchableOpacity key={swatch} onPress={() => handleColorChange(swatch)}>
                    <View
                      className="h-[22px] w-[22px] items-center justify-center rounded-full"
                      style={{
                        backgroundColor: active ? colors.pageWhite : 'transparent',
                        borderWidth: active ? 2 : 0,
                        borderColor: active ? colors.pageWhite : 'transparent',
                        transform: [{ scale: active ? 1.08 : 1 }],
                      }}
                    >
                      <View className="h-[18px] w-[18px] rounded-full" style={{ backgroundColor: swatch }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View className="px-8 pt-4">
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            placeholder="Notes about this group…"
            placeholderTextColor={colors.faint}
            style={{ color: colors.text, fontSize: 15, lineHeight: 22, minHeight: 140 }}
          />
        </View>

        <View className="mt-6 px-8 pb-10">
          <Text
            className="mb-2 text-[11px] font-bold"
            style={{ color: colors.muted, letterSpacing: 1.5 }}
          >
            MEMBERS
          </Text>

          {members.map((member) => (
            <View key={member.id} className="mb-2 flex-row items-center">
              <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: colors.accent }} />
              <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                {member.name}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                <Text style={{ color: colors.faint, fontSize: 16 }}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {addMemberOpen ? (
            <View
              className="mt-2 max-h-[200px] rounded-lg border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <ScrollView nestedScrollEnabled>
                {availableCharacters.map((character, index) => (
                  <TouchableOpacity
                    key={character.id}
                    onPress={() => handleAddMember(character.id)}
                    className="px-4 py-2.5"
                    style={{
                      borderBottomWidth: index === availableCharacters.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text className="text-sm" style={{ color: colors.text }}>
                      {character.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <TouchableOpacity onPress={() => setAddMemberOpen((current) => !current)} className="mt-2">
            <Text className="text-sm" style={{ color: colors.accent }}>
              {addMemberOpen ? 'Cancel' : '+ Add Member'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
