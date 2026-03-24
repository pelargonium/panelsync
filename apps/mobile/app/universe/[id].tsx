import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Editor from '../../components/Editor';
import Binder from '../../components/Binder';
import ErrorBoundary from '../../components/ErrorBoundary';
import { UniverseProvider, useUniverse } from '../../context/UniverseContext';
import { useTheme } from '../../context/ThemeContext';
import { type ApiEntity } from '../../lib/api';

const BINDER_WIDTH = 260;

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
  const { activeEntityType, activeEntityId } = useUniverse();

  if (activeEntityType === 'entity' && activeEntityId) {
    return (
      <Editor
        entityId={activeEntityId}
        autoFocusName={justCreatedId === activeEntityId}
        onAutoFocusDone={onAutoFocusDone}
        onSaveStateChange={onSaveStateChange}
      />
    );
  }

  return <EmptyContent />;
}

function UniverseWorkspace() {
  const router = useRouter();
  const { colors, mono, toggle, mode } = useTheme();
  const {
    universeName,
    binderOpen,
    setBinderOpen,
    activateEntity,
    createEntity,
  } = useUniverse();

  const [creatingType, setCreatingType] = useState<ApiEntity['type'] | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [editorSaveState, setEditorSaveState] = useState<'saved' | 'saving'>('saved');

  // App-level keyboard shortcuts (Cmd+B toggle binder, Cmd+D toggle theme)
  const appKeyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  appKeyRef.current = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === 'b') {
      e.preventDefault();
      setBinderOpen(!binderOpen);
    }
    if (e.metaKey && e.key === 'd') {
      e.preventDefault();
      toggle();
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onKeyDown(e: KeyboardEvent) { appKeyRef.current?.(e); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleCreateEntity(type: ApiEntity['type']) {
    setCreatingType(type);
    try {
      const entry = await createEntity(type);
      activateEntity('entity', entry.id);
      setJustCreatedId(entry.id);
    } catch (e: unknown) {
      console.error('Failed to create entity:', e);
    } finally {
      setCreatingType(null);
    }
  }

  async function handleCreateFolder() {
    setCreatingType('folder');
    try {
      const entry = await createEntity('folder');
      activateEntity('entity', entry.id);
      setJustCreatedId(entry.id);
    } catch (e: unknown) {
      console.error('Failed to create folder:', e);
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
            <Binder
              onCreateEntity={handleCreateEntity}
              onCreateFolder={handleCreateFolder}
              creatingType={creatingType}
            />
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