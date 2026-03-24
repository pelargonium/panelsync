import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { useTheme } from '../context/ThemeContext';

interface EntityEditorProps {
  entityId: string;
}

type SaveState = 'saved' | 'saving' | 'error';

export default function EntityEditor({ entityId }: EntityEditorProps) {
  const { updateEntityName, deleteEntity } = useUniverse();
  const { colors, mono } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const hydratedRef = useRef(false);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSavesRef = useRef(0);
  const latestNameRef = useRef('');
  const latestBodyRef = useRef('');
  const savedNameRef = useRef('');
  const savedBodyRef = useRef('');

  function clearTimers() {
    if (titleTimerRef.current) { clearTimeout(titleTimerRef.current); titleTimerRef.current = null; }
    if (bodyTimerRef.current) { clearTimeout(bodyTimerRef.current); bodyTimerRef.current = null; }
  }

  function syncSaveState() {
    if (titleTimerRef.current || bodyTimerRef.current || inFlightSavesRef.current > 0) {
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
      console.error('[EntityEditor] save failed:', e);
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
    setConfirmDelete(false);
    setLoading(true);

    api.entities.get(entityId)
      .then((res) => {
        if (cancelled) return;
        setName(res.data.name);
        setBodyText(res.data.bodyText);
        latestNameRef.current = res.data.name;
        latestBodyRef.current = res.data.bodyText;
        savedNameRef.current = res.data.name;
        savedBodyRef.current = res.data.bodyText;
        hydratedRef.current = true;
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('[EntityEditor] load failed:', e);
          setSaveState('error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimers(); inFlightSavesRef.current = 0; };
  }, [entityId]);

  useEffect(() => {
    latestNameRef.current = name;
    if (!hydratedRef.current) return;
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    if (name === savedNameRef.current) { syncSaveState(); return; }

    titleTimerRef.current = setTimeout(() => {
      titleTimerRef.current = null;
      const nextName = latestNameRef.current.trim();
      if (!nextName) { syncSaveState(); return; }
      runSave(async () => {
        await api.entities.update(entityId, { name: nextName });
        savedNameRef.current = nextName;
        updateEntityName(entityId, nextName);
      });
    }, 600);
    syncSaveState();
    return () => { if (titleTimerRef.current) { clearTimeout(titleTimerRef.current); titleTimerRef.current = null; } };
  }, [entityId, name, updateEntityName]);

  useEffect(() => {
    latestBodyRef.current = bodyText;
    if (!hydratedRef.current) return;
    if (bodyTimerRef.current) clearTimeout(bodyTimerRef.current);
    if (bodyText === savedBodyRef.current) { syncSaveState(); return; }

    bodyTimerRef.current = setTimeout(() => {
      bodyTimerRef.current = null;
      runSave(async () => {
        await api.entities.updateContent(entityId, latestBodyRef.current);
        savedBodyRef.current = latestBodyRef.current;
      });
    }, 600);
    syncSaveState();
    return () => { if (bodyTimerRef.current) { clearTimeout(bodyTimerRef.current); bodyTimerRef.current = null; } };
  }, [bodyText, entityId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}>
      <Text style={{ fontFamily: mono, fontSize: 11, color: saveState === 'error' ? colors.error : colors.muted, position: 'absolute', top: 12, right: 16 }}>
        {saveState === 'saved' ? 'saved' : saveState === 'saving' ? 'saving...' : 'save failed'}
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="untitled"
        placeholderTextColor={colors.muted}
        style={{ fontFamily: mono, fontSize: 18, fontWeight: '700', color: colors.text, paddingVertical: 0 }}
      />

      <View style={{ height: 1, backgroundColor: colors.border, marginTop: 12, marginBottom: 16 }} />

      <TextInput
        value={bodyText}
        onChangeText={setBodyText}
        placeholder="write..."
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
        style={{ fontFamily: mono, fontSize: 13, lineHeight: 20, color: colors.text, flex: 1 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        {confirmDelete ? (
          <>
            <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>delete?</Text>
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
  );
}