import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { api, type ApiBibleBlock } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';
import { colors } from '../theme';

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

const COLOR_PALETTE = ['#c8a768', '#1E6B3C', '#1B4FD8', '#6B2D8B', '#C41E1E', '#4A4A5A'];
const noOutline = { outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as object;

type SortMode = 'written' | 'type' | 'az';
type SaveState = 'saved' | 'saving';
type BlockPatch = {
  label?: string;
  value?: string;
  title?: string;
  body?: string;
  content?: string;
};

interface CharacterEditorProps {
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
    return [...blocks].sort((left, right) => left.position - right.position);
  }

  if (sortMode === 'type') {
    const kindOrder = { text: 0, field: 1, note: 2 };
    return [...blocks].sort((left, right) => {
      const order = kindOrder[left.kind] - kindOrder[right.kind];
      if (order !== 0) return order;
      return left.position - right.position;
    });
  }

  return [...blocks].sort((left, right) => {
    const leftLabel = left.kind === 'field'
      ? left.label ?? ''
      : left.kind === 'note'
      ? left.title ?? ''
      : (left.content ?? '').slice(0, 30);
    const rightLabel = right.kind === 'field'
      ? right.label ?? ''
      : right.kind === 'note'
      ? right.title ?? ''
      : (right.content ?? '').slice(0, 30);
    return leftLabel.localeCompare(rightLabel, undefined, { sensitivity: 'base' });
  });
}

function nextSortMode(current: SortMode): SortMode {
  if (current === 'written') return 'type';
  if (current === 'type') return 'az';
  return 'written';
}

function sortLabel(sortMode: SortMode) {
  if (sortMode === 'written') return 'Document';
  if (sortMode === 'type') return 'Type';
  return 'A–Z';
}

function updateLocalBlock(blocks: ApiBibleBlock[], id: string, patch: Partial<ApiBibleBlock>) {
  return blocks.map((block) => (block.id === id ? { ...block, ...patch } : block));
}

function InsertZone({ onPress, minHeight = 20 }: { onPress: () => void; minHeight?: number }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={1} style={{ minHeight }}>
      <View style={{ flex: 1 }} />
    </TouchableOpacity>
  );
}

function TextBlock({
  block,
  onUpdate,
  onFocus,
  onSelectionChange,
  onTabForward,
  inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onFocus: () => void;
  onSelectionChange: (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  onTabForward: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  return (
    <View className="mb-1 px-4 py-1">
      <TextInput
        value={block.content ?? ''}
        onChangeText={(content) => onUpdate(block.id, { content: content.replace(/\t/g, '') })}
        onFocus={onFocus}
        onSelectionChange={onSelectionChange}
        onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
        multiline
        textAlignVertical="top"
        ref={(ref) => {
          inputRefs.current[`${block.id}:content`] = ref;
        }}
        style={{ color: colors.text, fontSize: 15, lineHeight: 22, ...(noOutline as object) }}
      />
    </View>
  );
}

function FieldBlock({
  block,
  onUpdate,
  onDelete,
  onFocus,
  inputRefs,
  fieldMode,
  onFieldNext,
  onTabForward,
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [label, setLabel] = useState(block.label ?? '');
  const [value, setValue] = useState(block.value ?? '');
  const [labelWidth, setLabelWidth] = useState(80);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIdRef = useRef(block.id);

  useEffect(() => {
    if (block.id !== prevIdRef.current) {
      prevIdRef.current = block.id;
      setLabel(block.label ?? '');
      setValue(block.value ?? '');
      setSelectedSuggestionIndex(-1);
    }
  }, [block.id, block.label, block.value]);

  useEffect(() => () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
  }, []);

  const filteredSuggestions = label.length > 0
    ? FIELD_SUGGESTIONS.filter((item) =>
        item.toLowerCase().includes(label.toLowerCase()),
      ).slice(0, 6)
    : [];

  return (
    <View
      className="mb-2 mx-4 rounded-md px-3 py-1"
      style={{ borderWidth: 1, borderColor: colors.border }}
    >
      <View className="flex-row items-center">
        <View
          style={{ position: 'absolute', opacity: 0, top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Text
            style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}
            onLayout={(e) => {
              const measured = e.nativeEvent.layout.width;
              setLabelWidth(Math.max(60, Math.min(measured + 16, 200)));
            }}
          >
            {label || 'FIELD'}
          </Text>
        </View>
        <TextInput
          value={label}
          onChangeText={(nextLabel) => {
            setLabel(nextLabel);
            setSelectedSuggestionIndex(-1);
            onUpdate(block.id, { label: nextLabel });
          }}
          onKeyPress={(e) => {
            const key = e.nativeEvent.key;
            if (key === 'Tab') { onTabForward(); return; }
            if (key === 'ArrowDown') {
              setSelectedSuggestionIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
            } else if (key === 'ArrowUp') {
              setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1));
            }
          }}
          onFocus={() => {
            onFocus();
            setShowSuggestions(true);
          }}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 300);
          }}
          onSubmitEditing={() => {
            if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
              const suggestion = filteredSuggestions[selectedSuggestionIndex];
              if (blurTimerRef.current) {
                clearTimeout(blurTimerRef.current);
              }
              setLabel(suggestion);
              onUpdate(block.id, { label: suggestion });
              setShowSuggestions(false);
              setSelectedSuggestionIndex(-1);
              return;
            }
            if (fieldMode) {
              inputRefs.current[`${block.id}:value`]?.focus();
            }
          }}
          returnKeyType={fieldMode ? 'next' : 'default'}
          autoCapitalize="characters"
          maxLength={60}
          placeholder="FIELD"
          placeholderTextColor={colors.faint}
          ref={(ref) => {
            inputRefs.current[`${block.id}:label`] = ref;
          }}
          style={{
            width: labelWidth,
            color: colors.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.5,
            ...(noOutline as object),
          }}
        />

        <View className="mx-3 w-px self-stretch" style={{ backgroundColor: colors.border }} />

        <TextInput
          value={value}
          onChangeText={(nextValue) => {
            setValue(nextValue);
            onUpdate(block.id, { value: nextValue });
          }}
          onFocus={onFocus}
          onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
          onSubmitEditing={() => {
            if (fieldMode) {
              onFieldNext?.();
            }
          }}
          returnKeyType={fieldMode ? 'next' : 'default'}
          maxLength={280}
          placeholder="—"
          placeholderTextColor={colors.faint}
          ref={(ref) => {
            inputRefs.current[`${block.id}:value`] = ref;
          }}
          style={{ flex: 1, color: colors.text, fontSize: 14, ...(noOutline as object) }}
        />

        {pendingDelete ? (
          <View className="ml-3 flex-row items-center">
            <Text className="text-sm" style={{ color: colors.text }}>
              Delete?
            </Text>
            <TouchableOpacity onPress={() => onDelete(block.id)} className="ml-3" hitSlop={8}>
              <Text className="text-sm font-semibold" style={{ color: '#d14b4b' }}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDelete(false)} className="ml-3" hitSlop={8}>
              <Text className="text-sm font-semibold" style={{ color: colors.faint }}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setPendingDelete(true)} hitSlop={12} style={{ paddingLeft: 10, paddingVertical: 6 }}>
            <Text style={{ color: colors.faint, fontSize: 18 }}>
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && filteredSuggestions.length > 0 ? (
        <View
          className="mb-1 mt-2 max-h-40 rounded-md border"
          style={{ backgroundColor: colors.pageWhite, borderColor: colors.border }}
        >
          <ScrollView nestedScrollEnabled>
            {filteredSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion}
                onPress={() => {
                  if (blurTimerRef.current) {
                    clearTimeout(blurTimerRef.current);
                  }
                  setLabel(suggestion);
                  onUpdate(block.id, { label: suggestion });
                  setShowSuggestions(false);
                  setSelectedSuggestionIndex(-1);
                }}
                className="px-3 py-2"
                style={{
                  borderBottomWidth: index === filteredSuggestions.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                  backgroundColor: index === selectedSuggestionIndex ? colors.surface : 'transparent',
                }}
              >
                <Text className="text-[13px]" style={{ color: colors.text }}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function NoteBlock({
  block,
  onUpdate,
  onDelete,
  onFocus,
  onTabForward,
  inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onDelete: (id: string) => void;
  onFocus: () => void;
  onTabForward: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const [title, setTitle] = useState(block.title ?? '');
  const [body, setBody] = useState(block.body ?? '');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const prevIdRef = useRef(block.id);

  useEffect(() => {
    if (block.id !== prevIdRef.current) {
      prevIdRef.current = block.id;
      setTitle(block.title ?? '');
      setBody(block.body ?? '');
    }
  }, [block.id, block.title, block.body]);

  return (
    <View
      className="mb-3 rounded-lg mx-4 pb-3 pt-3 px-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="mb-2 flex-row items-center">
        <View style={{ flex: 1 }}>
          <TextInput
            value={title}
            onChangeText={(nextTitle) => {
              setTitle(nextTitle);
              onUpdate(block.id, { title: nextTitle });
            }}
            onFocus={() => {
              onFocus();
              setIsTitleFocused(true);
            }}
            onBlur={() => setIsTitleFocused(false)}
            onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
            placeholder="Note Title"
            placeholderTextColor={colors.faint}
            ref={(ref) => {
              inputRefs.current[`${block.id}:title`] = ref;
            }}
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: '600',
              height: title !== '' || isTitleFocused ? undefined : 0,
              ...(noOutline as object),
            }}
          />
          {!(title !== '' || isTitleFocused) && (
            <TouchableOpacity
              onPress={() => {
                setIsTitleFocused(true);
                setTimeout(() => inputRefs.current[`${block.id}:title`]?.focus(), 0);
              }}
              style={{ height: 20 }}
            />
          )}
        </View>

        {pendingDelete ? (
          <View className="ml-3 flex-row items-center">
            <Text className="text-sm" style={{ color: colors.text }}>
              Delete?
            </Text>
            <TouchableOpacity onPress={() => onDelete(block.id)} className="ml-3" hitSlop={8}>
              <Text className="text-sm font-semibold" style={{ color: '#d14b4b' }}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDelete(false)} className="ml-3" hitSlop={8}>
              <Text className="text-sm font-semibold" style={{ color: colors.faint }}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setPendingDelete(true)} hitSlop={12} style={{ paddingLeft: 10, paddingVertical: 6 }}>
            <Text style={{ color: colors.faint, fontSize: 18 }}>
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>

        <TextInput
          value={body}
          onChangeText={(nextBody) => {
            setBody(nextBody);
            onUpdate(block.id, { body: nextBody.replace(/\t/g, '') });
          }}
          onFocus={onFocus}
          onKeyPress={(e) => { if (e.nativeEvent.key === 'Tab') onTabForward(); }}
          multiline
          textAlignVertical="top"
          ref={(ref) => {
            inputRefs.current[`${block.id}:body`] = ref;
          }}
        style={{ color: colors.text, fontSize: 15, lineHeight: 22, ...(noOutline as object) }}
      />
    </View>
  );
}

export default function CharacterEditor({
  entityId,
  autoFocusName = false,
  onAutoFocusDone,
  onSaveStateChange,
}: CharacterEditorProps) {
  const { updateEntityName, deleteEntity } = useUniverse();
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ApiBibleBlock[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('written');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [fieldMode, setFieldMode] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
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
  const focusedBlock = useMemo(
    () => blocks.find((block) => block.id === focusedBlockId) ?? null,
    [blocks, focusedBlockId],
  );
  const canConvert = focusedBlock?.kind === 'text' || focusedBlock?.kind === 'note';
  const convertLabel = focusedBlock?.kind === 'note' ? '→ Text' : '→ Note';

  function clearTimers() {
    if (titleTimerRef.current) {
      clearTimeout(titleTimerRef.current);
      titleTimerRef.current = null;
    }
    Object.values(blockTimersRef.current).forEach(clearTimeout);
    blockTimersRef.current = {};
  }

  function syncSaveState() {
    const hasPendingBlockTimers = Object.keys(blockTimersRef.current).length > 0;
    const next = (titleTimerRef.current || hasPendingBlockTimers || inFlightSavesRef.current > 0) ? 'saving' : 'saved';
    setSaveState(next);
    onSaveStateChangeRef.current?.(next);
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

  function scheduleBlockSave(blockId: string) {
    if (blockTimersRef.current[blockId]) {
      clearTimeout(blockTimersRef.current[blockId]);
    }

    blockTimersRef.current[blockId] = setTimeout(() => {
      delete blockTimersRef.current[blockId];

      const block = blocksRef.current.find((item) => item.id === blockId);
      if (!block) {
        syncSaveState();
        return;
      }

      const body: BlockPatch =
        block.kind === 'field'
          ? { label: block.label ?? '', value: block.value ?? '' }
          : block.kind === 'note'
          ? { title: block.title ?? '', body: block.body ?? '' }
          : { content: block.content ?? '' };

      runSave(async () => {
        const res = await api.entities.blocks.update(entityId, blockId, body);
        setBlocks((current) => updateLocalBlock(current, blockId, res.data));
      }).catch(() => {});
    }, 600);

    syncSaveState();
  }

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    lastFocusedBlockIdRef.current = null;
    lastSelectionRef.current = null;
    clearTimers();
    inFlightSavesRef.current = 0;
    setSaveState('saved');
    setColorPickerOpen(false);
    setFieldMode(false);
    setFocusedBlockId(null);
    setLoading(true);
    setBlocks([]);

    Promise.all([api.entities.get(entityId), api.entities.blocks.list(entityId)])
      .then(([entryRes, blocksRes]) => {
        if (cancelled) return;
        setName(entryRes.data.name);
        setColor(entryRes.data.color);
        setBlocks(blocksRes.data);
        latestNameRef.current = entryRes.data.name;
        savedNameRef.current = entryRes.data.name;
        hydratedRef.current = true;
        if (autoFocusNameRef.current) {
          setName('');
        }
        if (autoFocusNameRef.current) {
          setTimeout(() => {
            nameInputRef.current?.focus();
            onAutoFocusDoneRef.current?.();
          }, 150);
        }
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
        await api.entities.update(entityId, { name: nextName });
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

  async function handleColorChange(nextColor: string) {
    setColor(nextColor);
    setColorPickerOpen(false);
    runSave(async () => {
      await api.entities.update(entityId, { color: nextColor });
    }).catch(() => {});
  }

  function handleBlockUpdate(id: string, patch: BlockPatch) {
    setBlocks((current) => updateLocalBlock(current, id, patch));
    scheduleBlockSave(id);
  }

  function focusBlock(block: ApiBibleBlock) {
    lastFocusedBlockIdRef.current = block.id;
    setFocusedBlockId(block.id);
  }

  function focusFirstBlockInput() {
    const first = sortBlocks(blocksRef.current, 'written')[0];
    if (!first) return;

    if (first.kind === 'text') {
      inputRefs.current[`${first.id}:content`]?.focus();
      return;
    }

    if (first.kind === 'field') {
      inputRefs.current[`${first.id}:label`]?.focus();
      return;
    }

    inputRefs.current[`${first.id}:title`]?.focus();
  }

  async function handleBlockDelete(id: string) {
    const writtenOrder = sortBlocks(blocksRef.current, 'written');
    const idx = writtenOrder.findIndex((block) => block.id === id);
    const prev = writtenOrder[idx - 1];
    const next = writtenOrder[idx + 1];
    const shouldMerge = !!prev && !!next && prev.kind === 'text' && next.kind === 'text';

    setBlocks((current) => current.filter((block) => block.id !== id));
    if (blockTimersRef.current[id]) {
      clearTimeout(blockTimersRef.current[id]);
      delete blockTimersRef.current[id];
    }
    if (shouldMerge && blockTimersRef.current[next.id]) {
      clearTimeout(blockTimersRef.current[next.id]);
      delete blockTimersRef.current[next.id];
    }
    syncSaveState();
    await runSave(async () => {
      await api.entities.blocks.delete(entityId, id);

      if (shouldMerge) {
        const latestPrev = blocksRef.current.find((block) => block.id === prev.id);
        const latestNext = blocksRef.current.find((block) => block.id === next.id);
        const prevContent = latestPrev?.content ?? prev.content ?? '';
        const nextContent = latestNext?.content ?? next.content ?? '';
        const merged = prevContent + (prevContent && nextContent ? '\n' : '') + nextContent;

        await api.entities.blocks.update(entityId, prev.id, { content: merged });
        await api.entities.blocks.delete(entityId, next.id);

        setBlocks((current) =>
          current
            .filter((block) => block.id !== next.id)
            .map((block) => (block.id === prev.id ? { ...block, content: merged } : block)),
        );
      }
    }).catch(() => {});
  }

  async function createBlock(
    body: { kind: 'field' | 'note' | 'text'; label?: string; value?: string; title?: string; body?: string; content?: string },
    focusKey: string,
    explicitPosition?: number,
  ) {
    let position: number | undefined = explicitPosition;

    if (position === undefined) {
      const lastId = lastFocusedBlockIdRef.current;
      if (lastId) {
        const sorted = sortBlocks(blocksRef.current, 'written');
        const idx = sorted.findIndex((block) => block.id === lastId);
        if (idx !== -1) {
          const after = sorted[idx + 1];
          position = after
            ? (sorted[idx].position + after.position) / 2
            : sorted[idx].position + 1.0;
        }
      }
    }

    const res = await api.entities.blocks.create(entityId, { ...body, position });
    setBlocks((current) => [...current, res.data]);

    setTimeout(() => {
      focusBlock(res.data);
      inputRefs.current[`${res.data.id}:${focusKey}`]?.focus();
    }, 0);
  }

  async function handleRandomField() {
    const used = new Set(
      blocksRef.current
        .filter((block) => block.kind === 'field')
        .map((block) => block.label ?? ''),
    );
    const available = FIELD_SUGGESTIONS.filter((label) => !used.has(label));
    const source = available.length > 0 ? available : FIELD_SUGGESTIONS;
    const pickedLabel = source[Math.floor(Math.random() * source.length)];
    await createBlock({ kind: 'field', label: pickedLabel, value: '' }, 'value');
  }

  function focusAdjacentBlock(currentBlockId: string, direction: 'next' | 'prev') {
    const ordered = sortBlocks(blocksRef.current, 'written');
    const idx = ordered.findIndex((b) => b.id === currentBlockId);
    if (idx === -1) return;
    const target = direction === 'next' ? ordered[idx + 1] : ordered[idx - 1];
    if (!target) {
      if (direction === 'next') nameInputRef.current?.focus();
      return;
    }
    const key =
      target.kind === 'text' ? `${target.id}:content` :
      target.kind === 'field' ? `${target.id}:label` :
      `${target.id}:title`;
    inputRefs.current[key]?.focus();
  }

  async function handleConvert() {
    if (!focusedBlock || (focusedBlock.kind !== 'text' && focusedBlock.kind !== 'note')) {
      return;
    }

    if (focusedBlock.kind === 'text') {
      const sel = lastSelectionRef.current;
      const content = focusedBlock.content ?? '';
      const hasSelection = !!sel && sel.blockId === focusedBlock.id && sel.start !== sel.end;

      if (hasSelection && sel) {
        const before = content.slice(0, sel.start);
        const selected = content.slice(sel.start, sel.end);
        const after = content.slice(sel.end);
        const notePosition = focusedBlock.position + 0.25;
        const afterPosition = focusedBlock.position + 0.5;

        await runSave(async () => {
          if (before.trim()) {
            await api.entities.blocks.update(entityId, focusedBlock.id, { content: before });
            setBlocks((current) => updateLocalBlock(current, focusedBlock.id, { content: before }));
          } else {
            await api.entities.blocks.delete(entityId, focusedBlock.id);
            setBlocks((current) => current.filter((block) => block.id !== focusedBlock.id));
          }

          const noteRes = await api.entities.blocks.create(entityId, {
            kind: 'note',
            body: selected,
            position: notePosition,
          });
          setBlocks((current) => [...current, noteRes.data]);
          setTimeout(() => {
            inputRefs.current[`${noteRes.data.id}:title`]?.focus();
          }, 0);

          if (after.trim()) {
            const afterRes = await api.entities.blocks.create(entityId, {
              kind: 'text',
              content: after,
              position: afterPosition,
            });
            setBlocks((current) => [...current, afterRes.data]);
          }
        }).catch(() => {});
      } else {
        if (!content.trim()) {
          return;
        }

        await runSave(async () => {
          const noteRes = await api.entities.blocks.create(entityId, {
            kind: 'note',
            body: content,
            position: focusedBlock.position,
          });
          await api.entities.blocks.delete(entityId, focusedBlock.id);
          setBlocks((current) => [...current.filter((block) => block.id !== focusedBlock.id), noteRes.data]);
          setTimeout(() => {
            inputRefs.current[`${noteRes.data.id}:title`]?.focus();
          }, 0);
        }).catch(() => {});
      }

      return;
    }

    const noteContent = focusedBlock.body ?? '';
    await runSave(async () => {
      const textRes = await api.entities.blocks.create(entityId, {
        kind: 'text',
        content: noteContent,
        position: focusedBlock.position,
      });
      await api.entities.blocks.delete(entityId, focusedBlock.id);
      setBlocks((current) => [...current.filter((block) => block.id !== focusedBlock.id), textRes.data]);
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
      <View className="px-8 pb-4 pt-10">
        <TextInput
          ref={nameInputRef}
          value={name}
          onChangeText={setName}
          onFocus={() => setFocusedBlockId(null)}
          onSubmitEditing={focusFirstBlockInput}
          returnKeyType="next"
          placeholder="Untitled"
          placeholderTextColor={colors.faint}
          style={{ color: colors.text, fontSize: 28, fontWeight: '700', paddingVertical: 0, ...(noOutline as object) }}
        />

        <View className="mt-2 flex-row items-center">
          <TouchableOpacity onPress={() => setColorPickerOpen((current) => !current)}>
            <View
              className="h-[14px] w-[14px] rounded-full"
              style={{ backgroundColor: color ?? colors.muted }}
            />
          </TouchableOpacity>
          <View className="ml-3 rounded-full border px-2 py-1" style={{ borderColor: colors.border }}>
            <Text className="text-[11px]" style={{ color: colors.muted }}>
              Character
            </Text>
          </View>
        </View>

        {colorPickerOpen ? (
          <View className="mt-2 flex-row items-center justify-between">
            {COLOR_PALETTE.map((swatch) => {
              const active = swatch === color;
              return (
                <TouchableOpacity key={swatch} onPress={() => handleColorChange(swatch)} hitSlop={4}>
                  <View
                    style={{
                      width: 34, height: 34,
                      alignItems: 'center', justifyContent: 'center',
                      borderRadius: 17,
                      backgroundColor: active ? colors.pageWhite : 'transparent',
                      borderWidth: active ? 2 : 0,
                      borderColor: active ? colors.pageWhite : 'transparent',
                      transform: [{ scale: active ? 1.08 : 1 }],
                    }}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: swatch }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <ScrollView
        className="flex-1 pt-4"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.pageWhite }}
      >
        {sortedBlocks.map((block, index) => {
          const prev = sortedBlocks[index - 1];
          const needsZoneBefore = block.kind !== 'text' && (index === 0 || prev.kind !== 'text');
          const zonePosition = index === 0 ? block.position - 1.0 : (prev.position + block.position) / 2;

          return (
            <View key={block.id}>
              {needsZoneBefore ? (
                <InsertZone
                  onPress={() => createBlock({ kind: 'text', content: '' }, 'content', zonePosition)}
                  minHeight={32}
                />
              ) : null}

              {block.kind === 'text' ? (
                <TextBlock
                  block={block}
                  onUpdate={handleBlockUpdate}
                  onFocus={() => { focusBlock(block); }}
                  onSelectionChange={(event) => {
                    lastSelectionRef.current = {
                      blockId: block.id,
                      start: event.nativeEvent.selection.start,
                      end: event.nativeEvent.selection.end,
                    };
                  }}
                  onTabForward={() => focusAdjacentBlock(block.id, 'next')}
                  inputRefs={inputRefs}
                />
              ) : block.kind === 'field' ? (
                <FieldBlock
                  block={block}
                  onUpdate={handleBlockUpdate}
                  onDelete={handleBlockDelete}
                  onFocus={() => { focusBlock(block); }}
                  inputRefs={inputRefs}
                  fieldMode={fieldMode}
                  onFieldNext={async () => {
                    await createBlock({ kind: 'field', label: '', value: '' }, 'label');
                  }}
                  onTabForward={() => focusAdjacentBlock(block.id, 'next')}
                />
              ) : (
                <NoteBlock
                  block={block}
                  onUpdate={handleBlockUpdate}
                  onDelete={handleBlockDelete}
                  onFocus={() => { focusBlock(block); }}
                  onTabForward={() => focusAdjacentBlock(block.id, 'next')}
                  inputRefs={inputRefs}
                />
              )}
            </View>
          );
        })}

        <InsertZone
          onPress={() => {
            const last = sortedBlocks[sortedBlocks.length - 1];
            if (last?.kind === 'text') {
              focusBlock(last);
              inputRefs.current[`${last.id}:content`]?.focus();
            } else {
              const appendPosition = last ? last.position + 1.0 : 1.0;
              void createBlock({ kind: 'text', content: '' }, 'content', appendPosition);
            }
          }}
          minHeight={64}
        />

        <View className="h-16" />
      </ScrollView>

      <View
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderColor: colors.border,
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {confirmDelete ? (
          <>
            <Text style={{ color: colors.text, fontSize: 14 }}>Delete character?</Text>
            <TouchableOpacity
              onPress={() => void deleteEntity(entityId)}
              style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#c0392b', borderRadius: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConfirmDelete(false)}
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setConfirmDelete(true)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#c0392b', borderRadius: 6 }}
            >
              <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>

            <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />

            <TouchableOpacity
              onPress={() => void createBlock({ kind: 'field', label: '', value: '' }, 'label')}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.accent, borderRadius: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+ Field</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                if (!fieldMode) {
                  setFieldMode(true);
                  await createBlock({ kind: 'field', label: '', value: '' }, 'label');
                } else {
                  setFieldMode(false);
                }
              }}
              style={{
                paddingHorizontal: 10, paddingVertical: 7,
                borderWidth: 1,
                borderColor: fieldMode ? colors.accent : colors.border,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: fieldMode ? colors.accent : colors.text, fontSize: 14, fontWeight: '600' }}>
                Fields
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void createBlock({ kind: 'note', title: '', body: '' }, 'title')}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.accent, borderRadius: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+ Note</Text>
            </TouchableOpacity>

            {canConvert ? (
              <TouchableOpacity
                onPress={() => void handleConvert()}
                style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{convertLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleRandomField}
              style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>⚄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSortMode((current) => nextSortMode(current))}
              style={{ marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 7 }}
            >
              <Text style={{ color: colors.muted, fontSize: 13 }}>{sortLabel(sortMode)}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
