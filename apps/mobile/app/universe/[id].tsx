import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
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
  isFocused,
}: {
  justCreatedId: string | null;
  onAutoFocusDone: () => void;
  onSaveStateChange: (state: 'saved' | 'saving') => void;
  isFocused: boolean;
}) {
  const { activeEntityType, activeEntityId } = useUniverse();

  if (activeEntityType === 'entity' && activeEntityId) {
    return (
      <Editor
        entityId={activeEntityId}
        isFocused={isFocused}
        autoFocusName={justCreatedId === activeEntityId}
        onAutoFocusDone={onAutoFocusDone}
        onSaveStateChange={onSaveStateChange}
      />
    );
  }

  return <EmptyContent />;
}

function ShortcutSection({ mono, colors, title, items }: {
  mono: string;
  colors: { text: string; muted: string; border: string };
  title: string;
  items: [string, string][];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>{title}</Text>
      {items.map(([key, desc]) => (
        <View key={key} style={{ flexDirection: 'row', paddingVertical: 3 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.text, width: 120 }}>{key}</Text>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, flex: 1 }}>{desc}</Text>
        </View>
      ))}
    </View>
  );
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

  const {
    secondaryEntityId,
    activateSecondaryEntity,
    closeSecondaryEditor,
  } = useUniverse();

  const [creatingType, setCreatingType] = useState<ApiEntity['type'] | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [editorSaveState, setEditorSaveState] = useState<'saved' | 'saving'>('saved');
  const [secondarySaveState, setSecondarySaveState] = useState<'saved' | 'saving'>('saved');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<'binder' | 'editor-left' | 'editor-right'>('binder');
  const binderWrapperRef = useRef<View>(null);
  const editorWrapperRef = useRef<View>(null);
  const secondaryEditorWrapperRef = useRef<View>(null);

  // App-level keyboard shortcuts
  const appKeyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  appKeyRef.current = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === '\\') {
      e.preventDefault();
      setBinderOpen(!binderOpen);
      return;
    }
    if (e.metaKey && (e.key === ';' || e.code === 'Semicolon')) {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur?.();
      setFocusedPanel((p) => {
        if (p === 'binder') return 'editor-left';
        if (p === 'editor-left') return secondaryEntityId ? 'editor-right' : 'binder';
        return 'binder'; // editor-right → binder
      });
      return;
    }
    if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      setShortcutsOpen((v) => !v);
      return;
    }
    if (e.key === 'Escape' && shortcutsOpen) {
      e.preventDefault();
      setShortcutsOpen(false);
    }
    if (e.key === 'Enter' && e.shiftKey && focusedPanel === 'editor-right') {
      e.preventDefault();
      closeSecondaryEditor();
      setFocusedPanel('editor-left');
      return;
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onKeyDown(e: KeyboardEvent) { appKeyRef.current?.(e); }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // Click-to-focus panel detection (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const binderEl = binderWrapperRef.current as unknown as HTMLElement;
    const editorEl = editorWrapperRef.current as unknown as HTMLElement;
    const secondaryEditorEl = secondaryEditorWrapperRef.current as unknown as HTMLElement;

    function onBinderMouseDown() {
      setFocusedPanel('binder');
      const active = document.activeElement as HTMLElement;
      if (active && editorEl?.contains(active)) { active.blur(); }
      if (active && secondaryEditorEl?.contains(active)) { active.blur(); }
    }
    function onPrimaryEditorMouseDown() {
      setFocusedPanel('editor-left');
      const active = document.activeElement as HTMLElement;
      if (active && binderEl?.contains(active)) { active.blur(); }
      if (active && secondaryEditorEl?.contains(active)) { active.blur(); }
    }
    function onSecondaryEditorMouseDown() {
      setFocusedPanel('editor-right');
      const active = document.activeElement as HTMLElement;
      if (active && binderEl?.contains(active)) { active.blur(); }
      if (active && editorEl?.contains(active)) { active.blur(); }
    }

    binderEl?.addEventListener('mousedown', onBinderMouseDown);
    editorEl?.addEventListener('mousedown', onPrimaryEditorMouseDown);
    secondaryEditorEl?.addEventListener('mousedown', onSecondaryEditorMouseDown);

    return () => {
      binderEl?.removeEventListener('mousedown', onBinderMouseDown);
      editorEl?.removeEventListener('mousedown', onPrimaryEditorMouseDown);
      secondaryEditorEl?.removeEventListener('mousedown', onSecondaryEditorMouseDown);
    };
  }, [binderOpen, secondaryEntityId]);

  async function handleCreateEntity(type: ApiEntity['type']) {
    setCreatingType(type);
    try {
      const entry = await createEntity(type);
      activateEntity('entity', entry.id);
      setJustCreatedId(entry.id);
      setFocusedPanel('editor-left');
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
          {focusedPanel === 'editor-right' ? secondarySaveState : editorSaveState}
        </Text>
        <TouchableOpacity onPress={toggle} style={{ marginLeft: 12 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>
            {mode === 'dark' ? 'light' : 'dark'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShortcutsOpen((v) => !v)} style={{ marginLeft: 12 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: shortcutsOpen ? colors.text : colors.muted }}>?</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Binder */}
        {binderOpen ? (
          <View
            ref={binderWrapperRef}
            style={{
              width: BINDER_WIDTH,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              borderTopWidth: 2,
              borderTopColor: focusedPanel === 'binder' ? colors.text : 'transparent',
            }}
          >
            <Binder
              onCreateEntity={handleCreateEntity}
              onCreateFolder={handleCreateFolder}
              creatingType={creatingType}
              isFocused={focusedPanel === 'binder'}
              onActivateSecondary={(type, id) => {
                activateSecondaryEntity(type, id);
                setFocusedPanel('editor-right');
              }}
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
        <View
          ref={editorWrapperRef}
          style={{
            flex: 1,
            borderTopWidth: 2,
            borderTopColor: focusedPanel === 'editor-left' ? colors.text : 'transparent',
          }}
        >
          <ErrorBoundary colors={colors} mono={mono}>
            <PrimaryContent
              justCreatedId={justCreatedId}
              onAutoFocusDone={() => setJustCreatedId(null)}
              onSaveStateChange={setEditorSaveState}
              isFocused={focusedPanel === 'editor-left'}
            />
          </ErrorBoundary>
        </View>

        {/* Secondary editor (only if secondaryEntityId is set) */}
        {secondaryEntityId && (
          <>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View ref={secondaryEditorWrapperRef} style={{ flex: 1, borderTopWidth: 2, borderTopColor: focusedPanel === 'editor-right' ? colors.text : 'transparent' }}>
              <ErrorBoundary colors={colors} mono={mono}>
                <Editor
                  entityId={secondaryEntityId}
                  isFocused={focusedPanel === 'editor-right'}
                  onSaveStateChange={setSecondarySaveState}
                />
              </ErrorBoundary>
            </View>
          </>
        )}

        {/* Shortcut reference overlay */}
        {shortcutsOpen && (
          <View style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 280,
            backgroundColor: colors.bg,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
            zIndex: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 36, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, flex: 1 }}>shortcuts</Text>
              <TouchableOpacity onPress={() => setShortcutsOpen(false)}>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>x</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: 12 }}>
              <ShortcutSection mono={mono} colors={colors} title="BINDER" items={[
                ['Up/Down', 'move selection'],
                ['Shift+Up/Down', 'extend selection'],
                ['Enter', 'open entity'],
                ['Shift+Enter', 'open in split'],
                ['Right', 'expand'],
                ['Left', 'collapse / parent'],
                ['Escape', 'clear selection / filter'],
                ['type', 'filter'],
                ['Cmd+Shift+A', 'new entity'],
                ['Cmd+Shift+M', 'move to folder'],
                ['F2', 'rename'],
                ['Backspace', 'delete (y/n)'],
              ]} />
              <ShortcutSection mono={mono} colors={colors} title="EDITOR" items={[
                ['ArrowUp', 'name (from top of text)'],
                ['Enter', 'text (from name)'],
                ['Shift+Enter', 'close split (right editor)'],
                ['Escape', 'blur editor'],
              ]} />
              <ShortcutSection mono={mono} colors={colors} title="TIMELINE" items={[
                ['Tab / Shift+Tab', 'cycle fields'],
                ['Enter', 'next event'],
                ['Alt+Up/Down', 'jump events'],
                ['Alt+Shift+Up/Down', 'jump 5'],
                ['Alt+Left', 'spine mode'],
                ['Up/Down (spine)', 'navigate spine'],
                ['Right (spine)', 'insert / edit'],
                ['Delete (spine)', 'delete event'],
                ['Escape', 'exit spine / blur'],
              ]} />
              <ShortcutSection mono={mono} colors={colors} title="APP" items={[
                ['Cmd+;', 'cycle panels'],
                ['Cmd+\\', 'toggle binder'],
                ['Cmd+/', 'this panel'],
              ]} />
            </ScrollView>
          </View>
        )}
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