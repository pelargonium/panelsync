import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { api, type ApiBibleBlock, type ApiEntity } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { useTheme } from '../context/ThemeContext';

const FIELD_SUGGESTIONS = [
  'Role', 'Age', 'Motivation', 'Education Level', 'Occupation',
  'Expertise', 'Pronouns', 'Sexual Orientation', 'Nationality', 'Ethnicity',
  'Height', 'Physical Appearance', 'Hair', 'Eyes', 'Distinctive Features',
  'Personality', 'Strengths', 'Weaknesses', 'Fears', 'Desires',
  'Values', 'Secrets', 'Regrets', 'Family Background', 'Key Relationships',
  'Speech Patterns', 'Habits', 'Quirks', 'Moral Code', 'Trauma',
  'Mental Health', 'Hobbies', 'Socioeconomic Status', 'Political Views', 'Religious Beliefs',
  'Greatest Achievement', 'Greatest Failure', 'Ambitions', 'Living Situation', 'Physical Health',
  'Pet Peeves', 'Trust Issues', 'Emotional Intelligence', 'Catchphrase', 'First Impression',
  'MBTI Type', 'Love Language', 'Coping Mechanisms', 'Alignment', 'What They Would Die For',
];

type SortMode = 'written' | 'type' | 'az';
type SaveState = 'saved' | 'saving' | 'error';
type BlockPatch = {
  label?: string;
  value?: string;
  title?: string;
  body?: string;
  content?: string;
};

interface EditorProps {
  entityId: string;
  autoFocusName?: boolean;
  onAutoFocusDone?: () => void;
  onSaveStateChange?: (state: 'saved' | 'saving') => void;
}

type TextSelection = {
  blockId: string;
  start: number;
  end: number;
};

function sortBlocks(blocks: ApiBibleBlock[], sortMode: SortMode) {
  if (sortMode === 'written') {
    return [...blocks].sort((a, b) => a.position - b.position);
  }
  if (sortMode === 'type') {
    const order = { text: 0, field: 1, note: 2 };
    return [...blocks].sort((a, b) => {
      const cmp = order[a.kind] - order[b.kind];
      return cmp !== 0 ? cmp : a.position - b.position;
    });
  }
  return [...blocks].sort((a, b) => {
    const la = a.kind === 'field' ? a.label ?? '' : a.kind === 'note' ? a.title ?? '' : (a.content ?? '').slice(0, 30);
    const lb = b.kind === 'field' ? b.label ?? '' : b.kind === 'note' ? b.title ?? '' : (b.content ?? '').slice(0, 30);
    return la.localeCompare(lb, undefined, { sensitivity: 'base' });
  });
}

function nextSortMode(current: SortMode): SortMode {
  if (current === 'written') return 'type';
  if (current === 'type') return 'az';
  return 'written';
}

function sortLabel(mode: SortMode) {
  if (mode === 'written') return 'doc';
  if (mode === 'type') return 'type';
  return 'a-z';
}

function updateLocalBlock(blocks: ApiBibleBlock[], id: string, patch: Partial<ApiBibleBlock>) {
  return blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

// ── Block sub-components ────────────────────────────────────────────────────

function TextBlock({
  block, onUpdate, onFocus, onSelectionChange, onTabForward, inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onFocus: () => void;
  onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  onTabForward: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  const { colors, mono } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, marginBottom: 2 }}>text</Text>
      <TextInput
        value={block.content ?? ''}
        onChangeText={(c) => onUpdate(block.id, { content: c.replace(/\t/g, '') })}
        onFocus={onFocus}
        onSelectionChange={onSelectionChange}
        onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
        multiline
        textAlignVertical="top"
        ref={(ref) => { inputRefs.current[`${block.id}:content`] = ref; }}
        style={{ fontFamily: mono, fontSize: 13, lineHeight: 20, color: colors.text }}
      />
    </View>
  );
}

function FieldBlock({
  block, onUpdate, onDelete, onFocus, inputRefs, fieldMode, onFieldNext, onTabForward,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onDelete: (id: string) => void;
  onFocus: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
  fieldMode?: boolean;
  onFieldNext?: () => void;
  onTabForward: () => void;
}) {
  const { colors, mono } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [label, setLabel] = useState(block.label ?? '');
  const [value, setValue] = useState(block.value ?? '');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIdRef = useRef(block.id);

  useEffect(() => {
    if (block.id !== prevIdRef.current) {
      prevIdRef.current = block.id;
      setLabel(block.label ?? '');
      setValue(block.value ?? '');
      setSelectedIdx(-1);
    }
  }, [block.id, block.label, block.value]);

  useEffect(() => () => { if (blurTimerRef.current) clearTimeout(blurTimerRef.current); }, []);

  const filtered = label.length > 0
    ? FIELD_SUGGESTIONS.filter((s) => s.toLowerCase().includes(label.toLowerCase())).slice(0, 6)
    : [];

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.border, padding: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={label}
          onChangeText={(next) => { setLabel(next); setSelectedIdx(-1); onUpdate(block.id, { label: next }); }}
          onKeyPress={(e) => {
            const key = e.nativeEvent.key;
            if (key === 'Tab') { onTabForward(); return; }
            if (key === 'ArrowDown') setSelectedIdx((p) => Math.min(p + 1, filtered.length - 1));
            else if (key === 'ArrowUp') setSelectedIdx((p) => Math.max(p - 1, -1));
          }}
          onFocus={() => { onFocus(); setShowSuggestions(true); }}
          onBlur={() => { blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 300); }}
          onSubmitEditing={() => {
            if (selectedIdx >= 0 && filtered[selectedIdx]) {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              setLabel(filtered[selectedIdx]);
              onUpdate(block.id, { label: filtered[selectedIdx] });
              setShowSuggestions(false);
              setSelectedIdx(-1);
              return;
            }
            if (fieldMode) inputRefs.current[`${block.id}:value`]?.focus();
          }}
          returnKeyType={fieldMode ? 'next' : 'default'}
          autoCapitalize="characters"
          maxLength={60}
          placeholder="FIELD"
          placeholderTextColor={colors.muted}
          ref={(ref) => { inputRefs.current[`${block.id}:label`] = ref; }}
          style={{ fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.muted, width: 100 }}
        />
        <Text style={{ fontFamily: mono, color: colors.border, marginHorizontal: 8 }}>|</Text>
        <TextInput
          value={value}
          onChangeText={(next) => { setValue(next); onUpdate(block.id, { value: next }); }}
          onFocus={onFocus}
          onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
          onSubmitEditing={() => { if (fieldMode) onFieldNext?.(); }}
          returnKeyType={fieldMode ? 'next' : 'default'}
          maxLength={280}
          placeholder="--"
          placeholderTextColor={colors.muted}
          ref={(ref) => { inputRefs.current[`${block.id}:value`] = ref; }}
          style={{ fontFamily: mono, fontSize: 13, color: colors.text, flex: 1 }}
        />
        {pendingDelete ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
            <TouchableOpacity onPress={() => onDelete(block.id)} hitSlop={8}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error }}>y</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDelete(false)} hitSlop={8} style={{ marginLeft: 8 }}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>n</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setPendingDelete(true)} hitSlop={12} style={{ marginLeft: 8 }}>
            <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>x</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && filtered.length > 0 && (
        <View style={{ marginTop: 4, borderWidth: 1, borderColor: colors.border, maxHeight: 160 }}>
          <ScrollView nestedScrollEnabled>
            {filtered.map((suggestion, i) => (
              <TouchableOpacity
                key={suggestion}
                onPress={() => {
                  if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                  setLabel(suggestion);
                  onUpdate(block.id, { label: suggestion });
                  setShowSuggestions(false);
                  setSelectedIdx(-1);
                }}
                style={{
                  paddingHorizontal: 8, paddingVertical: 6,
                  borderBottomWidth: i === filtered.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                  backgroundColor: i === selectedIdx ? colors.selection : 'transparent',
                }}
              >
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function NoteBlock({
  block, onUpdate, onDelete, onFocus, onTabForward, inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onDelete: (id: string) => void;
  onFocus: () => void;
  onTabForward: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  const { colors, mono } = useTheme();
  const [pendingDelete, setPendingDelete] = useState(false);
  const [title, setTitle] = useState(block.title ?? '');
  const [body, setBody] = useState(block.body ?? '');
  const prevIdRef = useRef(block.id);

  useEffect(() => {
    if (block.id !== prevIdRef.current) {
      prevIdRef.current = block.id;
      setTitle(block.title ?? '');
      setBody(block.body ?? '');
    }
  }, [block.id, block.title, block.body]);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.border, padding: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, marginRight: 8 }}>note</Text>
        <TextInput
          value={title}
          onChangeText={(next) => { setTitle(next); onUpdate(block.id, { title: next }); }}
          onFocus={onFocus}
          onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
          placeholder="title"
          placeholderTextColor={colors.muted}
          ref={(ref) => { inputRefs.current[`${block.id}:title`] = ref; }}
          style={{ fontFamily: mono, fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }}
        />
        {pendingDelete ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
            <TouchableOpacity onPress={() => onDelete(block.id)} hitSlop={8}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error }}>y</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDelete(false)} hitSlop={8} style={{ marginLeft: 8 }}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>n</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setPendingDelete(true)} hitSlop={12} style={{ marginLeft: 8 }}>
            <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>x</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        value={body}
        onChangeText={(next) => { setBody(next); onUpdate(block.id, { body: next.replace(/\t/g, '') }); }}
        onFocus={onFocus}
        onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
        multiline
        textAlignVertical="top"
        ref={(ref) => { inputRefs.current[`${block.id}:body`] = ref; }}
        style={{ fontFamily: mono, fontSize: 13, lineHeight: 20, color: colors.text }}
      />
    </View>
  );
}

// ── Members section (groups only) ───────────────────────────────────────────

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

// ── Main editor ─────────────────────────────────────────────────────────────

function entityTypeLabel(type: ApiEntity['type']): string {
  if (type === 'character') return 'character';
  if (type === 'location') return 'location';
  if (type === 'group') return 'group';
  if (type === 'folder') return 'folder';
  return 'note';
}

export default function Editor({
  entityId,
  autoFocusName = false,
  onAutoFocusDone,
  onSaveStateChange,
}: EditorProps) {
  const { entities, updateEntityName, deleteEntity } = useUniverse();
  const { colors, mono } = useTheme();
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<ApiEntity['type']>('note');
  const [blocks, setBlocks] = useState<ApiBibleBlock[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('written');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [fieldMode, setFieldMode] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const editorRef = useRef<View>(null);
  const hydratedRef = useRef(false);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlightSavesRef = useRef(0);
  const latestNameRef = useRef('');
  const savedNameRef = useRef('');
  const nameInputRef = useRef<TextInput | null>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const blocksRef = useRef<ApiBibleBlock[]>([]);
  const lastFocusedBlockIdRef = useRef<string | null>(null);
  const lastSelectionRef = useRef<TextSelection | null>(null);
  const autoFocusNameRef = useRef(autoFocusName);
  const onAutoFocusDoneRef = useRef(onAutoFocusDone);
  const onSaveStateChangeRef = useRef(onSaveStateChange);

  useEffect(() => {
    autoFocusNameRef.current = autoFocusName;
    onAutoFocusDoneRef.current = onAutoFocusDone;
    onSaveStateChangeRef.current = onSaveStateChange;
  });

  const sortedBlocks = useMemo(() => sortBlocks(blocks, sortMode), [blocks, sortMode]);
  const focusedBlock = useMemo(() => blocks.find((b) => b.id === focusedBlockId) ?? null, [blocks, focusedBlockId]);
  const canConvert = focusedBlock?.kind === 'text' || focusedBlock?.kind === 'note';
  const convertLabel = focusedBlock?.kind === 'note' ? '-> text' : '-> note';

  const entity = entities.find((e) => e.id === entityId);
  const isGroup = entityType === 'group';

  function clearTimers() {
    if (titleTimerRef.current) { clearTimeout(titleTimerRef.current); titleTimerRef.current = null; }
    Object.values(blockTimersRef.current).forEach(clearTimeout);
    blockTimersRef.current = {};
  }

  function syncSaveState() {
    const pending = Object.keys(blockTimersRef.current).length > 0;
    const next: SaveState = (titleTimerRef.current || pending || inFlightSavesRef.current > 0) ? 'saving' : (saveState === 'error' ? 'error' : 'saved');
    setSaveState(next);
    onSaveStateChangeRef.current?.(next === 'error' ? 'saving' : next);
  }

  async function runSave(task: () => Promise<void>) {
    inFlightSavesRef.current += 1;
    syncSaveState();
    try {
      await task();
      setSaveState('saved');
      onSaveStateChangeRef.current?.('saved');
    } catch (e) {
      setSaveState('error');
      console.error('[Editor] save failed:', e);
    } finally {
      inFlightSavesRef.current -= 1;
      syncSaveState();
    }
  }

  function scheduleBlockSave(blockId: string) {
    if (blockTimersRef.current[blockId]) clearTimeout(blockTimersRef.current[blockId]);

    blockTimersRef.current[blockId] = setTimeout(() => {
      delete blockTimersRef.current[blockId];
      const block = blocksRef.current.find((b) => b.id === blockId);
      if (!block) { syncSaveState(); return; }

      const body: BlockPatch =
        block.kind === 'field' ? { label: block.label ?? '', value: block.value ?? '' }
        : block.kind === 'note' ? { title: block.title ?? '', body: block.body ?? '' }
        : { content: block.content ?? '' };

      runSave(async () => {
        const res = await api.entities.blocks.update(entityId, blockId, body);
        setBlocks((cur) => updateLocalBlock(cur, blockId, res.data));
      });
    }, 600);
    syncSaveState();
  }

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  // ── Load entity + blocks ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    lastFocusedBlockIdRef.current = null;
    lastSelectionRef.current = null;
    clearTimers();
    inFlightSavesRef.current = 0;
    setSaveState('saved');
    setFieldMode(false);
    setFocusedBlockId(null);
    setDeletingBlockId(null);
    setConfirmDelete(false);
    setLoading(true);
    setBlocks([]);

    Promise.all([api.entities.get(entityId), api.entities.blocks.list(entityId)])
      .then(async ([entryRes, blocksRes]) => {
        if (cancelled) return;

        setName(entryRes.data.name);
        setEntityType(entryRes.data.type as ApiEntity['type']);
        latestNameRef.current = entryRes.data.name;
        savedNameRef.current = entryRes.data.name;

        // bodyText migration: if entity has bodyText but no blocks, create a text block
        if (blocksRes.data.length === 0 && entryRes.data.bodyText.trim()) {
          try {
            const migrated = await api.entities.blocks.create(entityId, {
              kind: 'text',
              content: entryRes.data.bodyText,
              position: 1.0,
            });
            // Clear the old bodyText
            await api.entities.updateContent(entityId, '');
            setBlocks([migrated.data]);
          } catch (e) {
            console.error('[Editor] bodyText migration failed:', e);
            // Fall back to empty blocks — bodyText is still there if we retry
            setBlocks([]);
          }
        } else {
          setBlocks(blocksRes.data);
        }

        hydratedRef.current = true;
        if (autoFocusNameRef.current) {
          setName('');
          setTimeout(() => { nameInputRef.current?.focus(); onAutoFocusDoneRef.current?.(); }, 150);
        }
      })
      .catch((e) => {
        if (!cancelled) { console.error('[Editor] load failed:', e); setSaveState('error'); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimers(); inFlightSavesRef.current = 0; };
  }, [entityId]);

  // ── Name auto-save ──────────────────────────────────────────────────────

  useEffect(() => {
    latestNameRef.current = name;
    if (!hydratedRef.current) return;
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    if (name === savedNameRef.current) { syncSaveState(); return; }

    titleTimerRef.current = setTimeout(() => {
      titleTimerRef.current = null;
      const next = latestNameRef.current.trim();
      if (!next) { syncSaveState(); return; }
      runSave(async () => {
        await api.entities.update(entityId, { name: next });
        savedNameRef.current = next;
        updateEntityName(entityId, next);
      });
    }, 600);
    syncSaveState();
    return () => { if (titleTimerRef.current) { clearTimeout(titleTimerRef.current); titleTimerRef.current = null; } };
  }, [entityId, name, updateEntityName]);

  // ── Block operations ────────────────────────────────────────────────────

  function handleBlockUpdate(id: string, patch: BlockPatch) {
    setBlocks((cur) => updateLocalBlock(cur, id, patch));
    scheduleBlockSave(id);
  }

  function focusBlock(block: ApiBibleBlock) {
    lastFocusedBlockIdRef.current = block.id;
    setFocusedBlockId(block.id);
    setDeletingBlockId(null);
  }

  function focusFirstBlockInput() {
    const first = sortBlocks(blocksRef.current, 'written')[0];
    if (!first) return;
    const key = first.kind === 'text' ? `${first.id}:content` : first.kind === 'field' ? `${first.id}:label` : `${first.id}:title`;
    inputRefs.current[key]?.focus();
  }

  async function handleBlockDelete(id: string) {
    const ordered = sortBlocks(blocksRef.current, 'written');
    const idx = ordered.findIndex((b) => b.id === id);
    const prev = ordered[idx - 1];
    const next = ordered[idx + 1];
    const shouldMerge = !!prev && !!next && prev.kind === 'text' && next.kind === 'text';

    setBlocks((cur) => cur.filter((b) => b.id !== id));
    if (blockTimersRef.current[id]) { clearTimeout(blockTimersRef.current[id]); delete blockTimersRef.current[id]; }
    if (shouldMerge && blockTimersRef.current[next.id]) { clearTimeout(blockTimersRef.current[next.id]); delete blockTimersRef.current[next.id]; }
    syncSaveState();

    await runSave(async () => {
      await api.entities.blocks.delete(entityId, id);
      if (shouldMerge) {
        const lp = blocksRef.current.find((b) => b.id === prev.id);
        const ln = blocksRef.current.find((b) => b.id === next.id);
        const merged = (lp?.content ?? prev.content ?? '') + ((lp?.content ?? prev.content) && (ln?.content ?? next.content) ? '\n' : '') + (ln?.content ?? next.content ?? '');
        await api.entities.blocks.update(entityId, prev.id, { content: merged });
        await api.entities.blocks.delete(entityId, next.id);
        setBlocks((cur) => cur.filter((b) => b.id !== next.id).map((b) => b.id === prev.id ? { ...b, content: merged } : b));
      }
    });
  }

  async function createBlock(
    body: { kind: 'field' | 'note' | 'text'; label?: string; value?: string; title?: string; body?: string; content?: string },
    focusKey: string,
    explicitPosition?: number,
    direction: 'below' | 'above' = 'below',
  ) {
    let position = explicitPosition;
    if (position === undefined) {
      const lastId = lastFocusedBlockIdRef.current;
      if (lastId) {
        const sorted = sortBlocks(blocksRef.current, 'written');
        const idx = sorted.findIndex((b) => b.id === lastId);
        if (idx !== -1) {
          if (direction === 'below') {
            const after = sorted[idx + 1];
            position = after ? (sorted[idx].position + after.position) / 2 : sorted[idx].position + 1.0;
          } else {
            const before = sorted[idx - 1];
            position = before ? (before.position + sorted[idx].position) / 2 : sorted[idx].position - 1.0;
          }
        }
      }
    }
    const res = await api.entities.blocks.create(entityId, { ...body, position });
    setBlocks((cur) => [...cur, res.data]);
    setTimeout(() => { focusBlock(res.data); inputRefs.current[`${res.data.id}:${focusKey}`]?.focus(); }, 0);
  }

  async function handleRandomField() {
    const used = new Set(blocksRef.current.filter((b) => b.kind === 'field').map((b) => b.label ?? ''));
    const avail = FIELD_SUGGESTIONS.filter((l) => !used.has(l));
    const source = avail.length > 0 ? avail : FIELD_SUGGESTIONS;
    await createBlock({ kind: 'field', label: source[Math.floor(Math.random() * source.length)], value: '' }, 'value');
  }

  function focusAdjacentBlock(currentId: string, direction: 'next' | 'prev') {
    const ordered = sortBlocks(blocksRef.current, 'written');
    const idx = ordered.findIndex((b) => b.id === currentId);
    if (idx === -1) return;
    const target = direction === 'next' ? ordered[idx + 1] : ordered[idx - 1];
    if (!target) { nameInputRef.current?.focus(); return; }
    const key = target.kind === 'text' ? `${target.id}:content` : target.kind === 'field' ? `${target.id}:label` : `${target.id}:title`;
    inputRefs.current[key]?.focus();
  }

  async function handleConvert() {
    if (!focusedBlock || (focusedBlock.kind !== 'text' && focusedBlock.kind !== 'note')) return;

    if (focusedBlock.kind === 'text') {
      const sel = lastSelectionRef.current;
      const content = focusedBlock.content ?? '';
      const hasSel = !!sel && sel.blockId === focusedBlock.id && sel.start !== sel.end;

      if (hasSel && sel) {
        const before = content.slice(0, sel.start);
        const selected = content.slice(sel.start, sel.end);
        const after = content.slice(sel.end);

        await runSave(async () => {
          if (before.trim()) {
            await api.entities.blocks.update(entityId, focusedBlock.id, { content: before });
            setBlocks((cur) => updateLocalBlock(cur, focusedBlock.id, { content: before }));
          } else {
            await api.entities.blocks.delete(entityId, focusedBlock.id);
            setBlocks((cur) => cur.filter((b) => b.id !== focusedBlock.id));
          }
          const noteRes = await api.entities.blocks.create(entityId, { kind: 'note', body: selected, position: focusedBlock.position + 0.25 });
          setBlocks((cur) => [...cur, noteRes.data]);
          setTimeout(() => { inputRefs.current[`${noteRes.data.id}:title`]?.focus(); }, 0);
          if (after.trim()) {
            const afterRes = await api.entities.blocks.create(entityId, { kind: 'text', content: after, position: focusedBlock.position + 0.5 });
            setBlocks((cur) => [...cur, afterRes.data]);
          }
        });
      } else {
        if (!content.trim()) return;
        await runSave(async () => {
          const noteRes = await api.entities.blocks.create(entityId, { kind: 'note', body: content, position: focusedBlock.position });
          await api.entities.blocks.delete(entityId, focusedBlock.id);
          setBlocks((cur) => [...cur.filter((b) => b.id !== focusedBlock.id), noteRes.data]);
          setTimeout(() => { inputRefs.current[`${noteRes.data.id}:title`]?.focus(); }, 0);
        });
      }
      return;
    }

    // note -> text
    const noteContent = focusedBlock.body ?? '';
    await runSave(async () => {
      const textRes = await api.entities.blocks.create(entityId, { kind: 'text', content: noteContent, position: focusedBlock.position });
      await api.entities.blocks.delete(entityId, focusedBlock.id);
      setBlocks((cur) => [...cur.filter((b) => b.id !== focusedBlock.id), textRes.data]);
    });
  }

  // ── Editor keyboard shortcuts (web only) ─────────────────────────────

  const editorKeyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  editorKeyRef.current = (e: KeyboardEvent) => {
    const editorEl = editorRef.current as unknown as HTMLElement;
    if (!editorEl?.contains(document.activeElement)) return;

    // Delete confirmation mode: y confirms, n/Escape cancels
    if (deletingBlockId) {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        void handleBlockDelete(deletingBlockId);
        setDeletingBlockId(null);
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        e.preventDefault();
        setDeletingBlockId(null);
      }
      return;
    }

    // Shift+Tab — previous block
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const blockId = focusedBlockId ?? lastFocusedBlockIdRef.current;
      if (blockId) focusAdjacentBlock(blockId, 'prev');
      return;
    }

    // Cmd+Enter — new text block below
    if (e.key === 'Enter' && e.metaKey && !e.shiftKey) {
      e.preventDefault();
      void createBlock({ kind: 'text', content: '' }, 'content', undefined, 'below');
      return;
    }

    // Cmd+Shift+Enter — new text block above
    if (e.key === 'Enter' && e.metaKey && e.shiftKey) {
      e.preventDefault();
      void createBlock({ kind: 'text', content: '' }, 'content', undefined, 'above');
      return;
    }

    // Cmd+Backspace — delete focused block (with confirmation)
    if (e.key === 'Backspace' && e.metaKey) {
      e.preventDefault();
      const blockId = focusedBlockId ?? lastFocusedBlockIdRef.current;
      if (blockId) setDeletingBlockId(blockId);
      return;
    }

    // Escape — deselect block
    if (e.key === 'Escape') {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur?.();
      setFocusedBlockId(null);
      lastFocusedBlockIdRef.current = null;
      return;
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onKeyDown(e: KeyboardEvent) { editorKeyRef.current?.(e); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

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
          onFocus={() => { setFocusedBlockId(null); setDeletingBlockId(null); }}
          onSubmitEditing={focusFirstBlockInput}
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

      {/* Blocks */}
      <ScrollView style={{ flex: 1, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
        {sortedBlocks.map((block, i) => {
          const prev = sortedBlocks[i - 1];
          const needsZone = block.kind !== 'text' && (i === 0 || prev.kind !== 'text');
          const zonePos = i === 0 ? block.position - 1.0 : (prev.position + block.position) / 2;

          const isFocused = focusedBlockId === block.id;
          const isDeleting = deletingBlockId === block.id;

          return (
            <View key={block.id}>
              {needsZone && (
                <TouchableOpacity
                  onPress={() => createBlock({ kind: 'text', content: '' }, 'content', zonePos)}
                  style={{ minHeight: 24 }}
                >
                  <View style={{ flex: 1 }} />
                </TouchableOpacity>
              )}

              {/* Focus indicator + delete confirmation */}
              <View style={{ borderLeftWidth: 2, borderLeftColor: isDeleting ? colors.error : isFocused ? colors.text : 'transparent' }}>
                {isDeleting && (
                  <Text style={{ fontFamily: mono, fontSize: 10, color: colors.error, paddingHorizontal: 16, paddingTop: 2 }}>delete block? y/n</Text>
                )}

              {block.kind === 'text' ? (
                <TextBlock
                  block={block}
                  onUpdate={handleBlockUpdate}
                  onFocus={() => focusBlock(block)}
                  onSelectionChange={(e) => {
                    lastSelectionRef.current = { blockId: block.id, start: e.nativeEvent.selection.start, end: e.nativeEvent.selection.end };
                  }}
                  onTabForward={() => focusAdjacentBlock(block.id, 'next')}
                  inputRefs={inputRefs}
                />
              ) : block.kind === 'field' ? (
                <FieldBlock
                  block={block}
                  onUpdate={handleBlockUpdate}
                  onDelete={handleBlockDelete}
                  onFocus={() => focusBlock(block)}
                  inputRefs={inputRefs}
                  fieldMode={fieldMode}
                  onFieldNext={async () => { await createBlock({ kind: 'field', label: '', value: '' }, 'label'); }}
                  onTabForward={() => focusAdjacentBlock(block.id, 'next')}
                />
              ) : (
                <NoteBlock
                  block={block}
                  onUpdate={handleBlockUpdate}
                  onDelete={handleBlockDelete}
                  onFocus={() => focusBlock(block)}
                  onTabForward={() => focusAdjacentBlock(block.id, 'next')}
                  inputRefs={inputRefs}
                />
              )}
              </View>
            </View>
          );
        })}

        {/* Members section for groups */}
        {isGroup && (
          <>
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginTop: 16 }} />
            <MembersSection
              entityId={entityId}
              onSaveStart={() => { inFlightSavesRef.current += 1; syncSaveState(); }}
              onSaveEnd={() => { inFlightSavesRef.current -= 1; setSaveState('saved'); onSaveStateChangeRef.current?.('saved'); syncSaveState(); }}
              onSaveError={() => { inFlightSavesRef.current -= 1; setSaveState('error'); syncSaveState(); }}
            />
          </>
        )}

        {/* Trailing insert zone */}
        <TouchableOpacity
          onPress={() => {
            const last = sortedBlocks[sortedBlocks.length - 1];
            if (last?.kind === 'text') {
              focusBlock(last);
              inputRefs.current[`${last.id}:content`]?.focus();
            } else {
              void createBlock({ kind: 'text', content: '' }, 'content', last ? last.position + 1.0 : 1.0);
            }
          }}
          style={{ minHeight: 64 }}
        >
          <View style={{ flex: 1 }} />
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Toolbar */}
      <View style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexWrap: 'wrap',
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
          <>
            <TouchableOpacity onPress={() => setConfirmDelete(true)}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>delete</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.border }}>|</Text>
            <TouchableOpacity onPress={() => void createBlock({ kind: 'field', label: '', value: '' }, 'label')}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>+ field</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              if (!fieldMode) { setFieldMode(true); await createBlock({ kind: 'field', label: '', value: '' }, 'label'); }
              else { setFieldMode(false); }
            }}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: fieldMode ? colors.text : colors.muted, textDecorationLine: fieldMode ? 'underline' : 'none' }}>fields</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void createBlock({ kind: 'note', title: '', body: '' }, 'title')}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>+ note</Text>
            </TouchableOpacity>
            {canConvert && (
              <TouchableOpacity onPress={() => void handleConvert()}>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>{convertLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleRandomField}>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>random</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSortMode((c) => nextSortMode(c))} style={{ marginLeft: 'auto' }}>
              <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted }}>{sortLabel(sortMode)}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
