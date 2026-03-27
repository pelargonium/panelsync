import { useEffect, useRef, useState } from 'react';
import {
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
import PanelMapPreview from '../../components/PanelMapPreview';
import { type ScriptElement } from '../../components/ScriptView';
import { UniverseProvider, useUniverse } from '../../context/UniverseContext';
import { useTheme } from '../../context/ThemeContext';
import { type ApiEntity } from '../../lib/api';
import { fromWebEvent, isWeb, subscribeNativeKeys, type KeyInfo } from '../../lib/keyboard';

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
  onScriptElements,
  onEntityType,
}: {
  justCreatedId: string | null;
  onAutoFocusDone: () => void;
  onSaveStateChange: (state: 'saved' | 'saving') => void;
  isFocused: boolean;
  onScriptElements?: (elements: ScriptElement[]) => void;
  onEntityType?: (type: string) => void;
}) {
  const { activeEntityType, activeEntityId } = useUniverse();

  useEffect(() => {
    if (!(activeEntityType === 'entity' && activeEntityId)) {
      onScriptElements?.([]);
    }
  }, [activeEntityType, activeEntityId, onScriptElements]);

  if (activeEntityType === 'entity' && activeEntityId) {
    return (
      <Editor
        entityId={activeEntityId}
        isFocused={isFocused}
        autoFocusName={justCreatedId === activeEntityId}
        onAutoFocusDone={onAutoFocusDone}
        onSaveStateChange={onSaveStateChange}
        onScriptElements={onScriptElements}
        onEntityType={onEntityType}
      />
    );
  }

  return <EmptyContent />;
}

function ShortcutSection({ mono, colors, title, items }: {
  mono: string;
  colors: { text: string; muted: string; border: string };
  title: string;
  items: [string, string, (() => void)?][];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 }}>{title}</Text>
      {items.map(([key, desc, onPress]) => {
        const Content = (
          <View key={key} style={{ flexDirection: 'row', paddingVertical: 3 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: colors.text, width: 120 }}>{key}</Text>
            <Text style={{ 
              fontFamily: mono, 
              fontSize: 11, 
              color: onPress ? colors.text : colors.muted, 
              flex: 1,
              textDecorationLine: onPress ? 'underline' : 'none'
            }}>{desc}</Text>
          </View>
        );

        if (onPress) {
          return (
            <TouchableOpacity key={key} onPress={onPress}>{Content}</TouchableOpacity>
          );
        }
        return Content;
      })}
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
  const [shortcutsOpen, setShortcutsOpen] = useState<false | 'contextual' | 'all'>(false);
  const [primaryEditorType, setPrimaryEditorType] = useState<string | null>(null);
  const [secondaryEditorType, setSecondaryEditorType] = useState<string | null>(null);
  const [panelMapOpen, setPanelMapOpen] = useState(false);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [focusedPanel, setFocusedPanel] = useState<'binder' | 'editor-left' | 'editor-right'>('binder');
  const binderWrapperRef = useRef<View>(null);
  const editorWrapperRef = useRef<View>(null);
  const secondaryEditorWrapperRef = useRef<View>(null);

  function cyclePanels() {
    setFocusedPanel((p) => {
      if (p === 'binder') return 'editor-left';
      if (p === 'editor-left') return secondaryEntityId ? 'editor-right' : 'binder';
      return 'binder';
    });
  }

  // App-level keyboard shortcuts
  const appKeyRef = useRef<(info: KeyInfo) => void>(undefined);
  appKeyRef.current = (info: KeyInfo) => {
    if (info.meta && info.key === '\\') {
      info.prevent();
      setBinderOpen(!binderOpen);
      return;
    }
    if (info.meta && info.key === ';') {
      info.prevent();
      if (isWeb) {
        (document.activeElement as HTMLElement)?.blur?.();
      }
      cyclePanels();
      return;
    }
    if (info.meta && info.shift && (info.key === 'p' || info.key === 'P')) {
      info.prevent();
      setPanelMapOpen((value) => !value);
      setShortcutsOpen(false);
      return;
    }
    if (info.key === '/' && info.meta) {
      info.prevent();
      setShortcutsOpen((v) => v === false ? 'contextual' : v === 'contextual' ? 'all' : false);
      setPanelMapOpen(false);
      return;
    }
    if (info.key === 'Escape' && panelMapOpen) {
      info.prevent();
      setPanelMapOpen(false);
      return;
    }
    if (info.key === 'Escape' && shortcutsOpen !== false) {
      info.prevent();
      setShortcutsOpen(false);
    }
    if (info.key === 'Enter' && info.shift && focusedPanel === 'editor-right') {
      info.prevent();
      closeSecondaryEditor();
      setSecondaryEditorType(null);
      setFocusedPanel('editor-left');
      return;
    }
  };

  useEffect(() => {
    if (!isWeb) return;
    function onKeyDown(e: KeyboardEvent) { appKeyRef.current?.(fromWebEvent(e)); }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    if (isWeb) return;
    return subscribeNativeKeys((info) => {
      appKeyRef.current?.(info);
    });
  }, []);

  // Click-to-focus panel detection (web only)
  useEffect(() => {
    if (!isWeb) return;
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
        {scriptElements.length > 0 && (
          <TouchableOpacity onPress={() => { setPanelMapOpen((value) => !value); setShortcutsOpen(false); }} style={{ marginLeft: 12 }}>
            <Text style={{ fontFamily: mono, fontSize: 11, color: panelMapOpen ? colors.text : colors.muted }}>
              map
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => { setShortcutsOpen((v) => v === false ? 'contextual' : v === 'contextual' ? 'all' : false); setPanelMapOpen(false); }} style={{ marginLeft: 12 }}>
          <Text style={{ fontFamily: mono, fontSize: 11, color: shortcutsOpen !== false ? colors.text : colors.muted }}>?</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Binder */}
        {binderOpen ? (
          <View
            ref={binderWrapperRef}
            onTouchStart={() => setFocusedPanel('binder')}
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
          onTouchStart={() => setFocusedPanel('editor-left')}
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
              onScriptElements={setScriptElements}
              onEntityType={setPrimaryEditorType}
            />
          </ErrorBoundary>
        </View>

        {/* Secondary editor (only if secondaryEntityId is set) */}
        {secondaryEntityId && (
          <>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View ref={secondaryEditorWrapperRef} onTouchStart={() => setFocusedPanel('editor-right')} style={{ flex: 1, borderTopWidth: 2, borderTopColor: focusedPanel === 'editor-right' ? colors.text : 'transparent' }}>
              <ErrorBoundary colors={colors} mono={mono}>
                <Editor
                  entityId={secondaryEntityId}
                  isFocused={focusedPanel === 'editor-right'}
                  onSaveStateChange={setSecondarySaveState}
                  onEntityType={setSecondaryEditorType}
                />
              </ErrorBoundary>
            </View>
          </>
        )}

        {/* Shortcut reference overlay */}
        {shortcutsOpen !== false && (() => {
          const activeTypes = new Set<string>();
          if (primaryEditorType) activeTypes.add(primaryEditorType);
          if (secondaryEditorType) activeTypes.add(secondaryEditorType);
          const showAll = shortcutsOpen === 'all';
          const showTimeline = showAll || activeTypes.has('timeline');
          const showScript = showAll || activeTypes.has('script');
          const showBoard = showAll || activeTypes.has('board');
          const showEditor = showAll || activeTypes.size > 0;

          return (
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
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, flex: 1 }}>
                {showAll ? 'all shortcuts' : 'shortcuts'}
              </Text>
              <TouchableOpacity onPress={() => setShortcutsOpen((v) => v === 'contextual' ? 'all' : 'contextual')} style={{ marginRight: 12 }}>
                <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>
                  {showAll ? 'less' : 'all'}
                </Text>
              </TouchableOpacity>
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
              {showEditor && (
              <ShortcutSection mono={mono} colors={colors} title="EDITOR" items={[
                ['ArrowUp', 'name (from top of text)'],
                ['Enter', 'text (from name)'],
                ['Shift+Enter', 'close split (right editor)'],
                ['Escape', 'blur editor'],
              ]} />
              )}
              {showTimeline && (
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
              )}
              {showScript && (
              <ShortcutSection mono={mono} colors={colors} title="SCRIPT" items={[
                ['Left/Right (panel)', 'cycle panel size'],
                ['Enter', 'next element (context-aware)'],
                ['type caption hint', 'convert character to caption'],
                ['Tab / Shift+Tab', 'cycle element type (empty)'],
                ['Backspace (empty)', 'delete element / clear size'],
                ['Alt+Up/Down', 'jump to content'],
                ['Alt+Left/Right', 'navigate dialogue group'],
                ['( in character', 'insert parenthetical'],
                ['ArrowUp (from top)', 'name input'],
                ['Escape', 'blur'],
              ]} />
              )}
              {showBoard && (
              <ShortcutSection mono={mono} colors={colors} title="BOARD" items={[
                ['` (backtick)', 'overview mode'],
                ['Enter (overview)', 'edit mode'],
                ['V (overview)', 'toggle horizontal / vertical'],
                ['B (overview)', 'toggle beat labels'],
                ['Enter', 'next beat (create if none)'],
                ['Cmd+Arrow', 'navigate (parent / child / forks)'],
                ['Cmd+Shift+Arrow', 'create outcome'],
                ['Alt+Arrow', 'jump 5 beats'],
                ['Tab', 'fork alternate timeline'],
                ['Backspace (empty)', 'delete beat'],
                ['Shift+Tab', 'delete thread (single beat)'],
              ]} />
              )}
              <ShortcutSection mono={mono} colors={colors} title="APP" items={[
                ['Cmd+;', 'cycle panels', () => cyclePanels()],
                ['Cmd+Shift+P', 'toggle panel map', () => { setPanelMapOpen(v => !v); setShortcutsOpen(false); }],
                ['Cmd+\\', 'toggle binder', () => setBinderOpen(!binderOpen)],
                ['dark/light', 'toggle theme', () => toggle()],
                ['Cmd+/', 'this panel (again for all)'],
              ]} />
            </ScrollView>
          </View>
          );
        })()}

        {panelMapOpen && scriptElements.length > 0 && (
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 280,
              backgroundColor: colors.bg,
              borderLeftWidth: 1,
              borderLeftColor: colors.border,
              zIndex: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                height: 36,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, flex: 1 }}>
                panel map
              </Text>
              <TouchableOpacity onPress={() => setPanelMapOpen(false)}>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>x</Text>
              </TouchableOpacity>
            </View>
            <PanelMapPreview elements={scriptElements} />
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
