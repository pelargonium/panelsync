import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, type ApiEntity } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { useTheme } from '../context/ThemeContext';
import TimelineView, { type TimelineEvent } from './TimelineView';
import ScriptView, { type ScriptElement, generateId } from './ScriptView';
type SaveState = 'saved' | 'saving' | 'error';

interface EditorProps {
  entityId: string;
  isFocused: boolean;
  autoFocusName?: boolean;
  onAutoFocusDone?: () => void;
  onSaveStateChange?: (state: 'saved' | 'saving') => void;
}

function entityTypeLabel(type: ApiEntity['type']): string {
  if (type === 'character') return 'character';
  if (type === 'location') return 'location';
  if (type === 'group') return 'group';
  if (type === 'folder') return 'folder';
  if (type === 'timeline') return 'timeline';
  if (type === 'script') return 'script';
  return 'note';
}

// ── Members section (groups only) ──────────────────────────────────────────

function MembersSection({
  entityId,
  onSaveStart,
  onSaveEnd,
  onSaveError,
}: {
  entityId: string;
  onSaveStart: () => void;
  onSaveEnd: () => void;
  onSaveError: () => void;
}) {
  const { memberships, entities, addMembership, removeMembership } = useUniverse();
  const { colors, mono } = useTheme();
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const members = useMemo(() => {
    const memberIds = new Set(
      memberships.filter((item) => item.groupId === entityId).map((item) => item.characterId),
    );
    return entities.filter((entity) => memberIds.has(entity.id));
  }, [memberships, entityId, entities]);

  const availableEntities = useMemo(() => {
    const memberIds = new Set(
      memberships.filter((item) => item.groupId === entityId).map((item) => item.characterId),
    );
    return entities.filter((entity) => entity.type === 'character' && !memberIds.has(entity.id));
  }, [memberships, entityId, entities]);

  async function handleAddMember(characterId: string) {
    setAddMemberOpen(false);
    onSaveStart();
    try {
      await addMembership(characterId, entityId);
      onSaveEnd();
    } catch {
      onSaveError();
    }
  }

  async function handleRemoveMember(characterId: string) {
    onSaveStart();
    try {
      await removeMembership(characterId, entityId);
      onSaveEnd();
    } catch {
      onSaveError();
    }
  }

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 24, paddingBottom: 16 }}>
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
            {availableEntities.map((entity) => (
              <TouchableOpacity
                key={entity.id}
                onPress={() => handleAddMember(entity.id)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text }}>{entity.name}</Text>
              </TouchableOpacity>
            ))}
            {availableEntities.length === 0 && (
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
    </View>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────

export default function Editor({
  entityId,
  isFocused,
  autoFocusName = false,
  onAutoFocusDone,
  onSaveStateChange,
}: EditorProps) {
  const { updateEntityName, deleteEntity } = useUniverse();
  const { colors, mono } = useTheme();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<ApiEntity['type']>('note');
  const [text, setText] = useState('');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editorRef = useRef<View>(null);
  const hydratedRef = useRef(false);
  const nameInputRef = useRef<TextInput | null>(null);
  const textInputRef = useRef<TextInput | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestScriptRef = useRef<string>('[]');
  const savedScriptRef = useRef<string>('[]');
  const eventsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(0);
  const latestNameRef = useRef('');
  const savedNameRef = useRef('');
  const latestTextRef = useRef('');
  const savedTextRef = useRef('');
  const latestEventsRef = useRef<string>('[]');
  const savedEventsRef = useRef<string>('[]');
  const autoFocusNameRef = useRef(autoFocusName);
  const onAutoFocusDoneRef = useRef(onAutoFocusDone);
  const onSaveStateChangeRef = useRef(onSaveStateChange);
  const updateEntityNameRef = useRef(updateEntityName);

  useEffect(() => {
    autoFocusNameRef.current = autoFocusName;
    onAutoFocusDoneRef.current = onAutoFocusDone;
    onSaveStateChangeRef.current = onSaveStateChange;
    updateEntityNameRef.current = updateEntityName;
  });

  const isGroup = entityType === 'group';

  function notifySaveState(state: SaveState) {
    setSaveState(state);
    onSaveStateChangeRef.current?.(state === 'error' ? 'saving' : state);
  }

  function hasPending() {
    return !!(titleTimerRef.current || textTimerRef.current || eventsTimerRef.current || scriptTimerRef.current || inFlightRef.current > 0);
  }

  async function runSave(task: () => Promise<void>) {
    inFlightRef.current += 1;
    notifySaveState('saving');
    try {
      await task();
      inFlightRef.current -= 1;
      if (!hasPending()) notifySaveState('saved');
    } catch (e) {
      inFlightRef.current -= 1;
      notifySaveState('error');
      console.error('[Editor] save failed:', e);
    }
  }

  // ── Load entity ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
    if (scriptTimerRef.current) clearTimeout(scriptTimerRef.current);
    if (eventsTimerRef.current) clearTimeout(eventsTimerRef.current);
    titleTimerRef.current = null;
    textTimerRef.current = null;
    scriptTimerRef.current = null;
    eventsTimerRef.current = null;
    inFlightRef.current = 0;
    setSaveState('saved');
    setConfirmDelete(false);
    setLoading(true);
    setText('');

    api.entities.get(entityId)
      .then((entryRes) => {
        if (cancelled) return;
        setName(entryRes.data.name);
        setEntityType(entryRes.data.type as ApiEntity['type']);
        latestNameRef.current = entryRes.data.name;
        savedNameRef.current = entryRes.data.name;

        const content = entryRes.data.bodyText ?? '';
        if (entryRes.data.type === 'timeline') {
          let parsed: TimelineEvent[] = [];
          try { parsed = JSON.parse(content); } catch { parsed = []; }
          if (!Array.isArray(parsed)) parsed = [];
          if (parsed.length === 0) parsed = [{ id: generateId(), title: '', description: '', dateline: '' }];
          setEvents(parsed);
          latestEventsRef.current = JSON.stringify(parsed);
          savedEventsRef.current = content || '[]';
        } else if (entryRes.data.type === 'script') {
          let parsed: ScriptElement[] = [];
          try { parsed = JSON.parse(content); } catch { parsed = []; }
          if (!Array.isArray(parsed)) parsed = [];
          if (parsed.length === 0) parsed = [
            { id: generateId(), type: 'page', text: '' },
            { id: generateId(), type: 'panel', text: '' },
          ];
          setScriptElements(parsed);
          latestScriptRef.current = JSON.stringify(parsed);
          savedScriptRef.current = content || '[]';
        } else {
          setText(content);
          latestTextRef.current = content;
          savedTextRef.current = content;
        }
        hydratedRef.current = true;

        if (autoFocusNameRef.current) {
          setName('');
          setTimeout(() => { nameInputRef.current?.focus(); onAutoFocusDoneRef.current?.(); }, 150);
        }
      })
      .catch((e) => {
        if (!cancelled) { console.error('[Editor] load failed:', e); notifySaveState('error'); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
      if (textTimerRef.current) clearTimeout(textTimerRef.current);
      if (scriptTimerRef.current) clearTimeout(scriptTimerRef.current);
      if (eventsTimerRef.current) clearTimeout(eventsTimerRef.current);
    };
  }, [entityId]);

  // ── Name auto-save ───────────────────────────────────────────────────

  useEffect(() => {
    latestNameRef.current = name;
    if (!hydratedRef.current) return;
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    if (name === savedNameRef.current) return;

    notifySaveState('saving');
    titleTimerRef.current = setTimeout(() => {
      titleTimerRef.current = null;
      const next = latestNameRef.current.trim();
      if (!next) return;
      runSave(async () => {
        await api.entities.update(entityId, { name: next });
        savedNameRef.current = next;
        updateEntityNameRef.current(entityId, next);
      });
    }, 600);

    return () => { if (titleTimerRef.current) { clearTimeout(titleTimerRef.current); titleTimerRef.current = null; } };
  }, [entityId, name]);

  // ── Text auto-save ───────────────────────────────────────────────────

  useEffect(() => {
    latestTextRef.current = text;
    if (!hydratedRef.current) return;
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
    if (text === savedTextRef.current) return;

    notifySaveState('saving');
    textTimerRef.current = setTimeout(() => {
      textTimerRef.current = null;
      runSave(async () => {
        await api.entities.updateContent(entityId, latestTextRef.current);
        savedTextRef.current = latestTextRef.current;
      });
    }, 600);

    return () => { if (textTimerRef.current) { clearTimeout(textTimerRef.current); textTimerRef.current = null; } };
  }, [entityId, text]);

  // ── Events auto-save (timeline) ─────────────────────────────────────
  useEffect(() => {
    if (entityType !== 'timeline') return;
    const serialized = JSON.stringify(events);
    latestEventsRef.current = serialized;
    if (!hydratedRef.current) return;
    if (eventsTimerRef.current) clearTimeout(eventsTimerRef.current);
    if (serialized === savedEventsRef.current) return;

    notifySaveState('saving');
    eventsTimerRef.current = setTimeout(() => {
      eventsTimerRef.current = null;
      runSave(async () => {
        await api.entities.updateContent(entityId, latestEventsRef.current);
        savedEventsRef.current = latestEventsRef.current;
      });
    }, 600);

    return () => { if (eventsTimerRef.current) { clearTimeout(eventsTimerRef.current); eventsTimerRef.current = null; } };
  }, [entityId, entityType, events]);

  // ── Script auto-save ────────────────────────────────────────────────
  useEffect(() => {
    if (entityType !== 'script') return;
    const serialized = JSON.stringify(scriptElements);
    latestScriptRef.current = serialized;
    if (!hydratedRef.current) return;
    if (scriptTimerRef.current) clearTimeout(scriptTimerRef.current);
    if (serialized === savedScriptRef.current) return;

    notifySaveState('saving');
    scriptTimerRef.current = setTimeout(() => {
      scriptTimerRef.current = null;
      runSave(async () => {
        await api.entities.updateContent(entityId, latestScriptRef.current);
        savedScriptRef.current = latestScriptRef.current;
      });
    }, 600);

    return () => { if (scriptTimerRef.current) { clearTimeout(scriptTimerRef.current); scriptTimerRef.current = null; } };
  }, [entityId, entityType, scriptElements]);

  // ── Auto-focus when panel becomes active ────────────────────────────

  useEffect(() => {
    if (isFocused && hydratedRef.current && entityType !== 'timeline' && entityType !== 'script') {
      textInputRef.current?.focus();
    }
  }, [isFocused, entityType]);

  // ── Keyboard (web only) ──────────────────────────────────────────────

  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  keyRef.current = (e: KeyboardEvent) => {
    if (!isFocused) return;
    if (entityType === 'timeline' || entityType === 'script') return;  // TimelineView and ScriptView have their own handlers

    if (e.key === 'Escape') {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur?.();
      return;
    }

    // ArrowUp at top of text → focus name input
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey) {
      const { start } = selectionRef.current;
      const before = latestTextRef.current.slice(0, start);
      if (!before.includes('\n')) {
        e.preventDefault();
        nameInputRef.current?.focus();
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onKeyDown(e: KeyboardEvent) { keyRef.current?.(e); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return (
    <View ref={editorRef} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 }}>
        <TextInput
          ref={nameInputRef}
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => {
            if (entityType === 'script' || entityType === 'timeline') {
              // Let the sub-view handle focus — just blur the name input
              (nameInputRef.current as any)?.blur?.();
            } else {
              textInputRef.current?.focus();
            }
          }}
          returnKeyType="next"
          placeholder="untitled"
          placeholderTextColor={colors.muted}
          style={{ fontFamily: mono, fontSize: 18, fontWeight: '700', color: colors.text, paddingVertical: 0 }}
        />
        <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, marginTop: 4 }}>{entityTypeLabel(entityType)}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      {/* Save state */}
      <Text style={{ fontFamily: mono, fontSize: 11, color: saveState === 'error' ? colors.error : colors.muted, position: 'absolute', top: 8, right: 16, zIndex: 10 }}>
        {saveState === 'saved' ? 'saved' : saveState === 'saving' ? 'saving...' : 'save failed'}
      </Text>

      {/* Body */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {entityType === 'timeline' ? (
          <TimelineView
            events={events}
            onEventsChange={setEvents}
            isFocused={isFocused}
            nameInputRef={nameInputRef}
          />
        ) : entityType === 'script' ? (
          <ScriptView
            elements={scriptElements}
            onElementsChange={setScriptElements}
            isFocused={isFocused}
            nameInputRef={nameInputRef}
          />
        ) : (
          <TextInput
            ref={textInputRef}
            value={text}
            onChangeText={setText}
            onSelectionChange={(e) => { selectionRef.current = e.nativeEvent.selection; }}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            placeholder="start writing..."
            placeholderTextColor={colors.muted}
            style={{
              fontFamily: mono,
              fontSize: 13,
              lineHeight: 20,
              color: colors.text,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 48,
              flex: 1,
              minHeight: 300,
            }}
          />
        )}

        {isGroup && (
          <>
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginTop: 16 }} />
            <MembersSection
              entityId={entityId}
              onSaveStart={() => { inFlightRef.current += 1; notifySaveState('saving'); }}
              onSaveEnd={() => { inFlightRef.current -= 1; if (!hasPending()) notifySaveState('saved'); }}
              onSaveError={() => { inFlightRef.current -= 1; notifySaveState('error'); }}
            />
          </>
        )}
      </ScrollView>

      {/* Toolbar */}
      <View style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 12,
      }}>
        {confirmDelete ? (
          <>
            <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>delete {entityTypeLabel(entityType)}?</Text>
            <TouchableOpacity onPress={() => void deleteEntity(entityId)}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error }}>yes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmDelete(false)}>
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
