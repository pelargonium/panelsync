import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { useTheme } from '../context/ThemeContext';

type SaveState = 'saved' | 'saving' | 'error';

interface GroupEditorProps {
  entityId: string;
}

export default function GroupEditor({ entityId }: GroupEditorProps) {
  const { memberships, entities, addMembership, removeMembership, updateEntityName, deleteEntity } = useUniverse();
  const { colors, mono } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
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
    if (nameTimerRef.current) { clearTimeout(nameTimerRef.current); nameTimerRef.current = null; }
    if (bodyTimerRef.current) { clearTimeout(bodyTimerRef.current); bodyTimerRef.current = null; }
  }

  function syncSaveState() {
    if (nameTimerRef.current || bodyTimerRef.current || inFlightSavesRef.current > 0) {
      setSaveState('saving');
      return;
    }
    setSaveState((prev) => prev === 'error' ? 'error' : 'saved');
  }

  async function runSave(task: () => Promise<void>) {
    inFlightSavesRef.current += 1;
    syncSaveState();
    try {
      await task();
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      console.error('[GroupEditor] save failed:', e);
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
    setAddMemberOpen(false);
    setConfirmDelete(false);
    setLoading(true);

    api.entities.get(entityId)
      .then((res) => {
        if (cancelled) return;
        setName(res.data.name);
        setBody(res.data.bodyText);
        latestNameRef.current = res.data.name;
        latestBodyRef.current = res.data.bodyText;
        savedNameRef.current = res.data.name;
        savedBodyRef.current = res.data.bodyText;
        hydratedRef.current = true;
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('[GroupEditor] load failed:', e);
          setSaveState('error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimers(); inFlightSavesRef.current = 0; };
  }, [entityId]);

  useEffect(() => {
    latestNameRef.current = name;
    if (!hydratedRef.current) return;
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    if (name === savedNameRef.current) { syncSaveState(); return; }

    nameTimerRef.current = setTimeout(() => {
      nameTimerRef.current = null;
      const nextName = latestNameRef.current.trim();
      if (!nextName) { syncSaveState(); return; }
      runSave(async () => {
        await api.entities.update(entityId, { name: nextName });
        savedNameRef.current = nextName;
        updateEntityName(entityId, nextName);
      });
    }, 600);
    syncSaveState();
    return () => { if (nameTimerRef.current) { clearTimeout(nameTimerRef.current); nameTimerRef.current = null; } };
  }, [entityId, name, updateEntityName]);

  useEffect(() => {
    latestBodyRef.current = body;
    if (!hydratedRef.current) return;
    if (bodyTimerRef.current) clearTimeout(bodyTimerRef.current);
    if (body === savedBodyRef.current) { syncSaveState(); return; }

    bodyTimerRef.current = setTimeout(() => {
      bodyTimerRef.current = null;
      runSave(async () => {
        await api.entities.updateContent(entityId, latestBodyRef.current);
        savedBodyRef.current = latestBodyRef.current;
      });
    }, 600);
    syncSaveState();
    return () => { if (bodyTimerRef.current) { clearTimeout(bodyTimerRef.current); bodyTimerRef.current = null; } };
  }, [body, entityId]);

  async function handleAddMember(characterId: string) {
    setAddMemberOpen(false);
    await runSave(async () => {
      await addMembership(characterId, entityId);
    });
  }

  async function handleRemoveMember(characterId: string) {
    await runSave(async () => {
      await removeMembership(characterId, entityId);
    });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Text style={{ fontFamily: mono, fontSize: 11, color: saveState === 'error' ? colors.error : colors.muted, position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
        {saveState === 'saved' ? 'saved' : saveState === 'saving' ? 'saving...' : 'save failed'}
      </Text>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="untitled group"
            placeholderTextColor={colors.muted}
            style={{ fontFamily: mono, fontSize: 18, fontWeight: '700', color: colors.text, paddingVertical: 0 }}
          />
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, marginTop: 4 }}>group</Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 24 }} />

        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            placeholder="notes about this group..."
            placeholderTextColor={colors.muted}
            style={{ fontFamily: mono, fontSize: 13, lineHeight: 20, color: colors.text, minHeight: 100 }}
          />
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 24, paddingBottom: 32 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, letterSpacing: 1, marginBottom: 8 }}>MEMBERS</Text>

          {members.map((member) => (
            <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}>{member.name}</Text>
              <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>x</Text>
              </TouchableOpacity>
            </View>
          ))}

          {addMemberOpen && (
            <View style={{ marginTop: 8, borderWidth: 1, borderColor: colors.border, maxHeight: 200 }}>
              <ScrollView nestedScrollEnabled>
                {availableCharacters.map((character) => (
                  <TouchableOpacity
                    key={character.id}
                    onPress={() => handleAddMember(character.id)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text }}>{character.name}</Text>
                  </TouchableOpacity>
                ))}
                {availableCharacters.length === 0 && (
                  <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, padding: 12 }}>no characters available</Text>
                )}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity onPress={() => setAddMemberOpen((c) => !c)} style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>
              {addMemberOpen ? 'cancel' : '+ add member'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
            {confirmDelete ? (
              <>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>delete group?</Text>
                <TouchableOpacity onPress={() => void deleteEntity(entityId)} style={{ marginLeft: 12 }}>
                  <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error }}>yes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ marginLeft: 12 }}>
                  <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>no</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setConfirmDelete(true)}>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}