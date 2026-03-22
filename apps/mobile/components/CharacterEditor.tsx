import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
}

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
  if (sortMode === 'written') return 'Written';
  if (sortMode === 'type') return 'Type';
  return 'A-Z';
}

function updateLocalBlock(blocks: ApiBibleBlock[], id: string, patch: Partial<ApiBibleBlock>) {
  return blocks.map((block) => (block.id === id ? { ...block, ...patch } : block));
}

function TextBlock({
  block,
  onUpdate,
  onDelete,
  onFocus,
  inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onDelete: (id: string) => void;
  onFocus: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);

  return (
    <View className="mb-1 px-4 py-1">
      <View className="flex-row">
        <TextInput
          value={block.content ?? ''}
          onChangeText={(content) => onUpdate(block.id, { content })}
          onFocus={onFocus}
          multiline
          textAlignVertical="top"
          placeholder="Write…"
          placeholderTextColor={colors.faint}
          ref={(ref) => {
            inputRefs.current[`${block.id}:content`] = ref;
          }}
          style={{ flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 }}
        />

        <TouchableOpacity onPress={() => setPendingDelete(true)} className="pl-2 pt-1">
          <Text style={{ color: colors.faint, fontSize: 14 }}>
            ×
          </Text>
        </TouchableOpacity>
      </View>

      {pendingDelete ? (
        <View className="mt-1 flex-row items-center">
          <Text className="text-xs" style={{ color: colors.faint }}>
            Delete?
          </Text>
          <TouchableOpacity onPress={() => onDelete(block.id)} className="ml-2">
            <Text className="text-xs" style={{ color: '#d14b4b' }}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPendingDelete(false)} className="ml-2">
            <Text className="text-xs" style={{ color: colors.faint }}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function FieldBlock({
  block,
  onUpdate,
  onDelete,
  onFocus,
  inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onDelete: (id: string) => void;
  onFocus: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredSuggestions = block.label && block.label.length > 0
    ? FIELD_SUGGESTIONS.filter((item) =>
        item.toLowerCase().includes((block.label ?? '').toLowerCase()),
      ).slice(0, 6)
    : [];

  useEffect(() => () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
  }, []);

  return (
    <View className="mb-3 rounded-lg px-4 pb-3 pt-3" style={{ backgroundColor: colors.surface }}>
      <View className="flex-row items-center">
        <TextInput
          value={block.label ?? ''}
          onChangeText={(label) => onUpdate(block.id, { label })}
          onFocus={() => {
            onFocus();
            setShowSuggestions(true);
          }}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
          }}
          autoCapitalize="characters"
          maxLength={60}
          placeholder="FIELD NAME"
          placeholderTextColor={colors.faint}
          ref={(ref) => {
            inputRefs.current[`${block.id}:label`] = ref;
          }}
          style={{
            flex: 1,
            color: colors.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.5,
          }}
        />

        {pendingDelete ? (
          <View className="ml-3 flex-row items-center">
            <Text className="text-xs" style={{ color: colors.text }}>
              Delete?
            </Text>
            <TouchableOpacity onPress={() => onDelete(block.id)} className="ml-3">
              <Text className="text-xs font-semibold" style={{ color: '#d14b4b' }}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDelete(false)} className="ml-3">
              <Text className="text-xs font-semibold" style={{ color: colors.faint }}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setPendingDelete(true)} className="pl-3">
            <Text style={{ color: colors.faint, fontSize: 16 }}>
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
                  onUpdate(block.id, { label: suggestion });
                  setShowSuggestions(false);
                }}
                className="px-3 py-2"
                style={{
                  borderBottomWidth: index === filteredSuggestions.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
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

      <TextInput
        value={block.value ?? ''}
        onChangeText={(value) => onUpdate(block.id, { value })}
        onFocus={onFocus}
        maxLength={280}
        placeholder="—"
        placeholderTextColor={colors.faint}
        ref={(ref) => {
          inputRefs.current[`${block.id}:value`] = ref;
        }}
        className="mt-1"
        style={{ color: colors.text, fontSize: 15 }}
      />
    </View>
  );
}

function NoteBlock({
  block,
  onUpdate,
  onDelete,
  onFocus,
  inputRefs,
}: {
  block: ApiBibleBlock;
  onUpdate: (id: string, patch: BlockPatch) => void;
  onDelete: (id: string) => void;
  onFocus: () => void;
  inputRefs: MutableRefObject<Record<string, TextInput | null>>;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);

  return (
    <View className="mb-3 rounded-lg px-4 pb-3 pt-3" style={{ backgroundColor: colors.surface }}>
      <View className="mb-2 flex-row items-center">
        <TextInput
          value={block.title ?? ''}
          onChangeText={(title) => onUpdate(block.id, { title })}
          onFocus={onFocus}
          placeholder="Note title…"
          placeholderTextColor={colors.faint}
          ref={(ref) => {
            inputRefs.current[`${block.id}:title`] = ref;
          }}
          style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' }}
        />

        {pendingDelete ? (
          <View className="ml-3 flex-row items-center">
            <Text className="text-xs" style={{ color: colors.text }}>
              Delete?
            </Text>
            <TouchableOpacity onPress={() => onDelete(block.id)} className="ml-3">
              <Text className="text-xs font-semibold" style={{ color: '#d14b4b' }}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDelete(false)} className="ml-3">
              <Text className="text-xs font-semibold" style={{ color: colors.faint }}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setPendingDelete(true)} className="pl-3">
            <Text style={{ color: colors.faint, fontSize: 16 }}>
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        value={block.body ?? ''}
        onChangeText={(body) => onUpdate(block.id, { body })}
        onFocus={onFocus}
        multiline
        textAlignVertical="top"
        placeholder="Write something…"
        placeholderTextColor={colors.faint}
        ref={(ref) => {
          inputRefs.current[`${block.id}:body`] = ref;
        }}
        style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}
      />
    </View>
  );
}

export default function CharacterEditor({ entityId }: CharacterEditorProps) {
  const { updateEntityName } = useUniverse();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ApiBibleBlock[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('written');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const hydratedRef = useRef(false);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlightSavesRef = useRef(0);
  const latestNameRef = useRef('');
  const savedNameRef = useRef('');
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const blocksRef = useRef<ApiBibleBlock[]>([]);
  const lastFocusedBlockIdRef = useRef<string | null>(null);

  const sortedBlocks = useMemo(() => sortBlocks(blocks, sortMode), [blocks, sortMode]);

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
    if (titleTimerRef.current || hasPendingBlockTimers || inFlightSavesRef.current > 0) {
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
        const res = await api.bible.blocks.update(entityId, blockId, body);
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
    clearTimers();
    inFlightSavesRef.current = 0;
    setSaveState('saved');
    setColorPickerOpen(false);
    setLoading(true);
    setBlocks([]);

    Promise.all([api.bible.get(entityId), api.bible.blocks.list(entityId)])
      .then(([entryRes, blocksRes]) => {
        if (cancelled) return;
        setName(entryRes.data.name);
        setColor(entryRes.data.color);
        setBlocks(blocksRes.data);
        latestNameRef.current = entryRes.data.name;
        savedNameRef.current = entryRes.data.name;
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

  async function handleColorChange(nextColor: string) {
    setColor(nextColor);
    setColorPickerOpen(false);
    runSave(async () => {
      await api.bible.update(entityId, { color: nextColor });
    }).catch(() => {});
  }

  function handleBlockUpdate(id: string, patch: BlockPatch) {
    setBlocks((current) => updateLocalBlock(current, id, patch));
    scheduleBlockSave(id);
  }

  async function handleBlockDelete(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
    if (blockTimersRef.current[id]) {
      clearTimeout(blockTimersRef.current[id]);
      delete blockTimersRef.current[id];
    }
    syncSaveState();
    await runSave(async () => {
      await api.bible.blocks.delete(entityId, id);
    }).catch(() => {});
  }

  async function createBlock(
    body: { kind: 'field' | 'note' | 'text'; label?: string; value?: string; title?: string; body?: string; content?: string },
    focusKey: string,
  ) {
    let position: number | undefined;
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

    const res = await api.bible.blocks.create(entityId, { ...body, position });
    setBlocks((current) => [...current, res.data]);

    setTimeout(() => {
      inputRefs.current[`${res.data.id}:${focusKey}`]?.focus();
    }, 0);
  }

  async function handleRandomField() {
    const used = new Set(
      blocks
        .filter((block) => block.kind === 'field')
        .map((block) => block.label ?? ''),
    );
    const available = FIELD_SUGGESTIONS.filter((label) => !used.has(label));
    const source = available.length > 0 ? available : FIELD_SUGGESTIONS;
    const pickedLabel = source[Math.floor(Math.random() * source.length)];
    await createBlock({ kind: 'field', label: pickedLabel, value: '' }, 'value');
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

      <View className="px-8 pb-4 pt-10">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Untitled"
          placeholderTextColor={colors.faint}
          style={{ color: colors.text, fontSize: 28, fontWeight: '700', paddingVertical: 0 }}
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

      <View
        className="h-11 flex-row items-center px-4"
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => createBlock({ kind: 'text', content: '' }, 'content')}>
          <Text className="text-sm font-medium" style={{ color: colors.accent }}>
            + Text
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => createBlock({ kind: 'field', label: '', value: '' }, 'label')} className="ml-4">
          <Text className="text-sm font-medium" style={{ color: colors.accent }}>
            + Field
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => createBlock({ kind: 'note', title: '', body: '' }, 'title')} className="ml-4">
          <Text className="text-sm font-medium" style={{ color: colors.accent }}>
            + Note
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRandomField} className="ml-4">
          <Text className="text-sm" style={{ color: colors.muted }}>
            ⚄
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortMode((current) => nextSortMode(current))} className="ml-auto">
          <Text className="text-xs" style={{ color: colors.muted }}>
            {sortLabel(sortMode)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 pt-4" keyboardShouldPersistTaps="handled">
        {sortedBlocks.map((block) => {
          if (block.kind === 'text') {
            return (
              <TextBlock
                key={block.id}
                block={block}
                onUpdate={handleBlockUpdate}
                onDelete={handleBlockDelete}
                onFocus={() => {
                  lastFocusedBlockIdRef.current = block.id;
                }}
                inputRefs={inputRefs}
              />
            );
          }

          if (block.kind === 'field') {
            return (
              <FieldBlock
                key={block.id}
                block={block}
                onUpdate={handleBlockUpdate}
                onDelete={handleBlockDelete}
                onFocus={() => {
                  lastFocusedBlockIdRef.current = block.id;
                }}
                inputRefs={inputRefs}
              />
            );
          }

          return (
            <NoteBlock
              key={block.id}
              block={block}
              onUpdate={handleBlockUpdate}
              onDelete={handleBlockDelete}
              onFocus={() => {
                lastFocusedBlockIdRef.current = block.id;
              }}
              inputRefs={inputRefs}
            />
          );
        })}
        <View className="h-16" />
      </ScrollView>
    </View>
  );
}
