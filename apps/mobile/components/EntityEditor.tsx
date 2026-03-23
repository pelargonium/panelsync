import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { colors } from '../theme';

interface EntityEditorProps {
  entityId: string;
}

type SaveState = 'saved' | 'saving';

export default function EntityEditor({ entityId }: EntityEditorProps) {
  const { updateEntityName, deleteEntity } = useUniverse();
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
    if (titleTimerRef.current) {
      clearTimeout(titleTimerRef.current);
      titleTimerRef.current = null;
    }
    if (bodyTimerRef.current) {
      clearTimeout(bodyTimerRef.current);
      bodyTimerRef.current = null;
    }
  }

  function syncSaveState() {
    if (titleTimerRef.current || bodyTimerRef.current || inFlightSavesRef.current > 0) {
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
    setLoading(true);

    api.bible.get(entityId)
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

    if (titleTimerRef.current) {
      clearTimeout(titleTimerRef.current);
    }

    if (name === savedNameRef.current) {
      syncSaveState();
      return;
    }

    titleTimerRef.current = setTimeout(() => {
      titleTimerRef.current = null;
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
      if (titleTimerRef.current) {
        clearTimeout(titleTimerRef.current);
        titleTimerRef.current = null;
      }
    };
  }, [entityId, name, updateEntityName]);

  useEffect(() => {
    latestBodyRef.current = bodyText;
    if (!hydratedRef.current) return;

    if (bodyTimerRef.current) {
      clearTimeout(bodyTimerRef.current);
    }

    if (bodyText === savedBodyRef.current) {
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
  }, [bodyText, entityId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View className="flex-1 px-8 pb-8 pt-10" style={{ backgroundColor: colors.bg }}>
      <View
        className="flex-row items-center"
        style={{ position: 'absolute', top: 16, right: 16 }}
      >
        <View
          className="mr-2 h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: saveState === 'saved' ? colors.bible : colors.accent }}
        />
        <Text className="text-xs font-medium" style={{ color: colors.faint }}>
          {saveState === 'saved' ? 'Saved' : 'Saving…'}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Untitled"
        placeholderTextColor={colors.faint}
        style={{
          color: colors.text,
          fontSize: 28,
          fontWeight: '700',
          paddingVertical: 0,
        }}
      />

      <View className="mt-4 h-px" style={{ backgroundColor: colors.border }} />

      <TextInput
        value={bodyText}
        onChangeText={setBodyText}
        placeholder="Write something…"
        placeholderTextColor={colors.faint}
        multiline
        textAlignVertical="top"
        className="mt-5 flex-1"
        style={{
          color: colors.text,
          fontSize: 15,
          lineHeight: 22,
        }}
      />

      <View className="mt-4 flex-row items-center">
        {confirmDelete ? (
          <>
            <Text className="text-[13px]" style={{ color: colors.faint }}>Delete this entry?</Text>
            <TouchableOpacity onPress={() => void deleteEntity(entityId)} className="ml-3">
              <Text className="text-[13px] font-semibold" style={{ color: '#d14b4b' }}>Yes, delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmDelete(false)} className="ml-3">
              <Text className="text-[13px]" style={{ color: colors.faint }}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => setConfirmDelete(true)}>
            <Text className="text-[13px]" style={{ color: colors.faint }}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
