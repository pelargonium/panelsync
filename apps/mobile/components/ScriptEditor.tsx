import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import { api, type ApiPage, type ApiScriptBlock, type ScriptBlockType } from '../lib/api';
import { useUniverse } from '../context/UniverseContext';

interface ScriptEditorProps {
  issueId: string;
  activePageId: string;
}

type BlocksByPage = Record<string, ApiScriptBlock[]>;

// Smart advance: what type to create on Enter
const ADVANCE: Record<ScriptBlockType, ScriptBlockType> = {
  panel:       'scene',
  scene:       'description',
  description: 'dialogue',
  dialogue:    'dialogue',
  caption:     'description',
  sfx:         'description',
};

// Tab cycling order
const TYPE_CYCLE: ScriptBlockType[] = ['panel', 'scene', 'description', 'dialogue', 'caption', 'sfx'];

const TYPE_OPTIONS: Array<{ label: string; value: ScriptBlockType }> = [
  { label: 'PNL', value: 'panel' },
  { label: 'SCN', value: 'scene' },
  { label: 'DESC', value: 'description' },
  { label: 'DLG', value: 'dialogue' },
  { label: 'CAP', value: 'caption' },
  { label: 'SFX', value: 'sfx' },
];

const PANEL_SIZE_OPTIONS = [
  { label: 'FULL', value: 'full' },
  { label: 'HALF', value: 'half' },
  { label: 'THIRD', value: 'third' },
  { label: 'QUARTER', value: 'quarter' },
];

const TYPE_COLOR: Record<ScriptBlockType, string> = {
  panel:       colors.accent,
  scene:       colors.muted,
  description: colors.faint,
  dialogue:    colors.timeline,
  caption:     colors.accent,
  sfx:         colors.chalkboard,
};

function sortBlocks(blocks: ApiScriptBlock[]) {
  return [...blocks].sort((a, b) => a.position - b.position);
}

function emptyForBlock(block: ApiScriptBlock) {
  return !(block.content?.text?.trim()) && !(block.speaker?.trim());
}

export default function ScriptEditor({ issueId, activePageId }: ScriptEditorProps) {
  const { pagesByContainer, loadPages } = useUniverse();
  const [blocksByPage, setBlocksByPage] = useState<BlocksByPage>({});
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<ScrollView | null>(null);
  const pageOffsets = useRef<Record<string, number>>({});
  const blockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const blocksRef = useRef<BlocksByPage>({});

  const pages = useMemo(() => {
    const rows = pagesByContainer[issueId] ?? [];
    return [...rows].sort((a, b) => a.number - b.number);
  }, [issueId, pagesByContainer]);

  useEffect(() => {
    let cancelled = false;
    async function loadIssue() {
      if (!pagesByContainer[issueId]) await loadPages(issueId);
    }
    loadIssue().catch(() => { if (!cancelled) setBlocksByPage({}); });
    return () => { cancelled = true; };
  }, [issueId, loadPages, pagesByContainer]);

  useEffect(() => {
    let cancelled = false;
    async function loadBlocks() {
      const entries = await Promise.all(
        pages.map(async (page) => {
          const res = await api.blocks.list(page.id);
          return [page.id, sortBlocks(res.data)] as const;
        }),
      );
      if (!cancelled) setBlocksByPage(Object.fromEntries(entries));
    }
    if (pages.length > 0) {
      loadBlocks().catch(() => { if (!cancelled) setBlocksByPage({}); });
    } else {
      setBlocksByPage({});
    }
    return () => { cancelled = true; };
  }, [pages, issueId]);

  useEffect(() => { blocksRef.current = blocksByPage; }, [blocksByPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const y = pageOffsets.current[activePageId];
      if (y !== undefined) scrollViewRef.current?.scrollTo({ y, animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [activePageId]);

  useEffect(() => () => {
    Object.values(blockTimers.current).forEach(clearTimeout);
  }, []);

  const isSaving = Object.values(dirtyIds).some(Boolean);

  function updateLocalBlock(pageId: string, blockId: string, updates: Partial<ApiScriptBlock>) {
    setBlocksByPage((current) => ({
      ...current,
      [pageId]: sortBlocks(
        (current[pageId] ?? []).map((b) => b.id === blockId ? { ...b, ...updates } : b),
      ),
    }));
  }

  function markDirty(blockId: string, value: boolean) {
    setDirtyIds((current) => ({ ...current, [blockId]: value }));
  }

  function scheduleSave(pageId: string, blockId: string) {
    if (blockTimers.current[blockId]) clearTimeout(blockTimers.current[blockId]);
    markDirty(blockId, true);
    blockTimers.current[blockId] = setTimeout(async () => {
      const block = (blocksRef.current[pageId] ?? []).find((b) => b.id === blockId);
      if (!block) { markDirty(blockId, false); delete blockTimers.current[blockId]; return; }
      try {
        const res = await api.blocks.update(pageId, block.id, {
          content: block.content,
          speaker: block.speaker,
          sizeTag: block.sizeTag,
        });
        updateLocalBlock(pageId, block.id, res.data);
      } finally {
        markDirty(blockId, false);
        delete blockTimers.current[blockId];
      }
    }, 500);
  }

  async function insertBlock(pageId: string, insertAfterIndex: number, type: ScriptBlockType = 'description') {
    const blocks = blocksByPage[pageId] ?? [];
    const previous = insertAfterIndex >= 0 ? blocks[insertAfterIndex] : null;
    const next = insertAfterIndex + 1 < blocks.length ? blocks[insertAfterIndex + 1] : null;
    let position = 1;
    if (previous && next) position = (previous.position + next.position) / 2;
    else if (previous) position = previous.position + 1;
    else if (next) position = next.position / 2;

    const res = await api.blocks.create(pageId, { type, content: { text: '' }, position });
    setBlocksByPage((current) => ({
      ...current,
      [pageId]: sortBlocks([...(current[pageId] ?? []), res.data]),
    }));
    setFocusedBlockId(res.data.id);
    setTimeout(() => { inputRefs.current[res.data.id]?.focus(); }, 50);
  }

  async function deleteBlock(pageId: string, blockId: string) {
    const blocks = blocksByPage[pageId] ?? [];
    const index = blocks.findIndex((b) => b.id === blockId);
    const previous = index > 0 ? blocks[index - 1] : null;

    if (blockTimers.current[blockId]) {
      clearTimeout(blockTimers.current[blockId]);
      delete blockTimers.current[blockId];
    }

    await api.blocks.delete(pageId, blockId);
    setBlocksByPage((current) => ({
      ...current,
      [pageId]: (current[pageId] ?? []).filter((b) => b.id !== blockId),
    }));
    setDirtyIds((current) => { const next = { ...current }; delete next[blockId]; return next; });

    if (previous) {
      setFocusedBlockId(previous.id);
      setTimeout(() => { inputRefs.current[previous.id]?.focus(); }, 50);
    } else {
      setFocusedBlockId(null);
    }
  }

  async function updateType(pageId: string, block: ApiScriptBlock, type: ScriptBlockType) {
    const nextLocal: Partial<ApiScriptBlock> = {
      type,
      sizeTag: type === 'panel' ? block.sizeTag ?? 'full' : null,
      speaker: type === 'dialogue' ? block.speaker ?? '' : null,
    };
    updateLocalBlock(pageId, block.id, nextLocal);
    const res = await api.blocks.update(pageId, block.id, nextLocal);
    updateLocalBlock(pageId, block.id, res.data);
  }

  async function updatePanelSize(pageId: string, block: ApiScriptBlock, sizeTag: string) {
    updateLocalBlock(pageId, block.id, { sizeTag });
    const res = await api.blocks.update(pageId, block.id, { sizeTag });
    updateLocalBlock(pageId, block.id, res.data);
  }

  function cycleType(pageId: string, block: ApiScriptBlock) {
    const idx = TYPE_CYCLE.indexOf(block.type);
    const next = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
    updateType(pageId, block, next);
  }

  function advanceBlock(pageId: string, block: ApiScriptBlock, blocks: ApiScriptBlock[]) {
    const index = blocks.findIndex((b) => b.id === block.id);
    // If there's already a next block, focus it
    const next = index + 1 < blocks.length ? blocks[index + 1] : null;
    if (next) {
      setFocusedBlockId(next.id);
      setTimeout(() => { inputRefs.current[next.id]?.focus(); }, 30);
    } else {
      // Create a new block with smart advance type
      insertBlock(pageId, index, ADVANCE[block.type]);
    }
  }

  // ─── Block renderers ──────────────────────────────────────────────────────

  function renderPanelBlock(page: ApiPage, block: ApiScriptBlock, panelNumber: number) {
    const isFocused = focusedBlockId === block.id;
    return (
      <View key={block.id}>
        <TouchableOpacity
          onPress={() => setFocusedBlockId(block.id)}
          className="mt-6 mb-2"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            <View className="flex-row items-center mx-3" style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Courier New', fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 1.5 }}>
                PANEL {panelNumber}
              </Text>
              {block.sizeTag && (
                <View className="rounded px-1" style={{ backgroundColor: colors.border }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.muted }}>
                    {block.sizeTag.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          </View>
        </TouchableOpacity>

        {isFocused && (
          <View className="flex-row flex-wrap px-4 pb-2" style={{ gap: 6 }}>
            {PANEL_SIZE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => updatePanelSize(page.id, block, opt.value)}
                className="rounded px-3 py-1"
                style={{ backgroundColor: block.sizeTag === opt.value ? colors.accent : colors.border }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: block.sizeTag === opt.value ? colors.surface : colors.muted }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderTextBlock(page: ApiPage, block: ApiScriptBlock, blocks: ApiScriptBlock[], style: object, placeholder: string, extra?: object) {
    const isFocused = focusedBlockId === block.id;
    return (
      <View key={block.id} className="mb-1">
        <TextInput
          ref={(ref) => { inputRefs.current[block.id] = ref; }}
          multiline
          scrollEnabled={false}
          value={block.content?.text ?? ''}
          onFocus={() => setFocusedBlockId(block.id)}
          onChangeText={(text) => {
            updateLocalBlock(page.id, block.id, { content: { text } });
            scheduleSave(page.id, block.id);
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && emptyForBlock(block)) {
              deleteBlock(page.id, block.id).catch(() => {});
            }
            if (nativeEvent.key === 'Tab') {
              cycleType(page.id, block);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={[{ color: colors.text }, style, extra]}
        />
        {isFocused && renderTypeBar(page, block, blocks)}
      </View>
    );
  }

  function renderDialogueBlock(page: ApiPage, block: ApiScriptBlock, blocks: ApiScriptBlock[]) {
    const isFocused = focusedBlockId === block.id;
    return (
      <View key={block.id} className="mb-1" style={{ paddingLeft: 100 }}>
        <TextInput
          value={block.speaker ?? ''}
          onFocus={() => setFocusedBlockId(block.id)}
          onChangeText={(speaker) => {
            updateLocalBlock(page.id, block.id, { speaker });
            scheduleSave(page.id, block.id);
          }}
          onSubmitEditing={() => {
            // Enter on character name → move to dialogue text
            const textInputKey = `${block.id}_text`;
            inputRefs.current[textInputKey]?.focus();
          }}
          placeholder="CHARACTER"
          placeholderTextColor={colors.faint}
          autoCapitalize="characters"
          style={{ fontFamily: 'Courier New', fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: 1, paddingVertical: 2 }}
        />
        <TextInput
          ref={(ref) => { inputRefs.current[`${block.id}_text`] = ref; }}
          multiline
          scrollEnabled={false}
          value={block.content?.text ?? ''}
          onFocus={() => setFocusedBlockId(block.id)}
          onChangeText={(text) => {
            updateLocalBlock(page.id, block.id, { content: { text } });
            scheduleSave(page.id, block.id);
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && emptyForBlock(block)) {
              deleteBlock(page.id, block.id).catch(() => {});
            }
            if (nativeEvent.key === 'Enter') {
              advanceBlock(page.id, block, blocks);
            }
          }}
          placeholder="Dialogue…"
          placeholderTextColor={colors.faint}
          style={{ fontFamily: 'Courier New', fontSize: 13, color: colors.muted, lineHeight: 20, paddingVertical: 2 }}
        />
        {isFocused && renderTypeBar(page, block, blocks)}
      </View>
    );
  }

  function renderCaptionBlock(page: ApiPage, block: ApiScriptBlock, blocks: ApiScriptBlock[]) {
    const isFocused = focusedBlockId === block.id;
    return (
      <View key={block.id} className="my-1 py-2 pl-3" style={{ borderLeftWidth: 2, borderLeftColor: colors.accent }}>
        <TextInput
          ref={(ref) => { inputRefs.current[block.id] = ref; }}
          multiline
          scrollEnabled={false}
          value={block.content?.text ?? ''}
          onFocus={() => setFocusedBlockId(block.id)}
          onChangeText={(text) => {
            updateLocalBlock(page.id, block.id, { content: { text } });
            scheduleSave(page.id, block.id);
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && emptyForBlock(block)) {
              deleteBlock(page.id, block.id).catch(() => {});
            }
          }}
          placeholder="Narration…"
          placeholderTextColor={colors.faint}
          style={{ fontFamily: 'Courier New', fontSize: 12, fontStyle: 'italic', color: colors.muted, lineHeight: 20 }}
        />
        {isFocused && renderTypeBar(page, block, blocks)}
      </View>
    );
  }

  function renderTypeBar(page: ApiPage, block: ApiScriptBlock, blocks: ApiScriptBlock[]) {
    return (
      <View className="flex-row mt-2" style={{ gap: 4 }}>
        {TYPE_OPTIONS.map((opt) => {
          const active = block.type === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => updateType(page.id, block, opt.value)}
              className="rounded px-2 py-1"
              style={{ backgroundColor: active ? TYPE_COLOR[opt.value] : 'transparent' }}
            >
              <Text style={{ fontFamily: 'Courier New', fontSize: 9, fontWeight: '700', letterSpacing: 1, color: active ? colors.surface : colors.faint }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View className="flex-1" />
        <TouchableOpacity
          onPress={() => advanceBlock(page.id, block, blocks)}
          className="rounded px-2 py-1"
          style={{ backgroundColor: colors.border }}
        >
          <Text style={{ fontSize: 9, color: colors.muted }}>↵</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderBlock(page: ApiPage, block: ApiScriptBlock, index: number, blocks: ApiScriptBlock[], panelNumber: number) {
    if (block.type === 'panel') {
      return renderPanelBlock(page, block, panelNumber);
    }
    if (block.type === 'dialogue') {
      return renderDialogueBlock(page, block, blocks);
    }
    if (block.type === 'caption') {
      return renderCaptionBlock(page, block, blocks);
    }
    if (block.type === 'scene') {
      return renderTextBlock(page, block, blocks,
        { fontFamily: 'Courier New', fontSize: 13, fontWeight: '700', letterSpacing: 1, lineHeight: 20, paddingVertical: 4 },
        'INT./EXT. LOCATION — TIME',
        { textTransform: 'uppercase' }
      );
    }
    if (block.type === 'sfx') {
      return renderTextBlock(page, block, blocks,
        { fontFamily: 'Courier New', fontSize: 22, fontWeight: '700', color: colors.accent, letterSpacing: 1, paddingVertical: 4 },
        'KRAAKOOOM'
      );
    }
    // description (default)
    return renderTextBlock(page, block, blocks,
      { fontFamily: 'Courier New', fontSize: 13, lineHeight: 21, color: colors.muted, paddingVertical: 3 },
      'Describe the action…'
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      {/* Save status bar */}
      <View className="flex-row items-center px-4 border-b" style={{ height: 36, borderColor: colors.border, backgroundColor: colors.surface }}>
        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: isSaving ? colors.accent : colors.bible }} />
        <Text style={{ fontFamily: 'Courier New', fontSize: 10, color: isSaving ? colors.accent : colors.faint, letterSpacing: 1 }}>
          {isSaving ? 'SAVING' : 'ALL SAVED'}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 24, paddingHorizontal: 16 }}
      >
        {pages.map((page, pageIndex) => {
          const blocks = sortBlocks(blocksByPage[page.id] ?? []);
          let panelCount = 0;

          return (
            <View key={page.id}>
              {/* Page gap divider between pages */}
              {pageIndex > 0 && (
                <View className="items-center my-8">
                  <View className="absolute left-0 right-0 h-px" style={{ backgroundColor: colors.border, top: 11 }} />
                  <View className="px-3" style={{ backgroundColor: colors.bg }}>
                    <Text style={{ fontFamily: 'Courier New', fontSize: 9, color: colors.faint, letterSpacing: 2 }}>
                      PAGE {page.number}
                    </Text>
                  </View>
                </View>
              )}

              {/* Page card */}
              <View
                onLayout={(event) => {
                  pageOffsets.current[page.id] = event.nativeEvent.layout.y;
                }}
                className="rounded-lg px-6 pt-5 pb-8"
                style={{ backgroundColor: colors.pageWhite }}
              >
                {/* Page header */}
                <View className="flex-row items-baseline mb-6 pb-4 border-b" style={{ borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'Courier New', fontSize: 11, color: activePageId === page.id ? colors.accent : colors.faint, letterSpacing: 2, textTransform: 'uppercase' }}>
                    {`Page ${String(page.number).padStart(2, '0')}`}
                  </Text>
                </View>

                {/* Blocks */}
                {blocks.map((block, index) => {
                  if (block.type === 'panel') panelCount++;
                  return renderBlock(page, block, index, blocks, panelCount);
                })}

                {/* Add first block if empty */}
                {blocks.length === 0 && (
                  <TouchableOpacity onPress={() => insertBlock(page.id, -1, 'scene')}>
                    <Text style={{ fontFamily: 'Courier New', fontSize: 12, color: colors.faint, textAlign: 'center', paddingVertical: 24 }}>
                      Tap to start writing…
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Add block at end */}
                {blocks.length > 0 && (
                  <TouchableOpacity
                    onPress={() => insertBlock(page.id, blocks.length - 1, ADVANCE[blocks[blocks.length - 1].type])}
                    className="mt-4 items-center"
                  >
                    <Text style={{ fontSize: 12, color: colors.faint }}>＋</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
