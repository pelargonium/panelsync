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
      if (!pagesByContainer[issueId]) {
        await loadPages(issueId);
      }
    }

    loadIssue().catch(() => {
      if (!cancelled) {
        setBlocksByPage({});
      }
    });

    return () => {
      cancelled = true;
    };
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

      if (!cancelled) {
        setBlocksByPage(Object.fromEntries(entries));
      }
    }

    if (pages.length > 0) {
      loadBlocks().catch(() => {
        if (!cancelled) {
          setBlocksByPage({});
        }
      });
    } else {
      setBlocksByPage({});
    }

    return () => {
      cancelled = true;
    };
  }, [pages, issueId]);

  useEffect(() => {
    blocksRef.current = blocksByPage;
  }, [blocksByPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const y = pageOffsets.current[activePageId];
      if (y !== undefined) {
        scrollViewRef.current?.scrollTo({ y, animated: true });
      }
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
        (current[pageId] ?? []).map((block) => (
          block.id === blockId ? { ...block, ...updates } : block
        )),
      ),
    }));
  }

  function markDirty(blockId: string, value: boolean) {
    setDirtyIds((current) => ({ ...current, [blockId]: value }));
  }

  function scheduleSave(pageId: string, blockId: string) {
    if (blockTimers.current[blockId]) {
      clearTimeout(blockTimers.current[blockId]);
    }

    markDirty(blockId, true);

    blockTimers.current[blockId] = setTimeout(async () => {
      const block = (blocksRef.current[pageId] ?? []).find((item) => item.id === blockId);
      if (!block) {
        markDirty(blockId, false);
        delete blockTimers.current[blockId];
        return;
      }

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

  async function insertBlock(pageId: string, insertAfterIndex: number) {
    const blocks = blocksByPage[pageId] ?? [];
    const previous = insertAfterIndex >= 0 ? blocks[insertAfterIndex] : null;
    const next = insertAfterIndex + 1 < blocks.length ? blocks[insertAfterIndex + 1] : null;

    let position = 1;
    if (previous && next) {
      position = (previous.position + next.position) / 2;
    } else if (previous) {
      position = previous.position + 1;
    } else if (next) {
      position = next.position / 2;
    }

    const res = await api.blocks.create(pageId, {
      type: 'description',
      content: { text: '' },
      position,
    });

    setBlocksByPage((current) => ({
      ...current,
      [pageId]: sortBlocks([...(current[pageId] ?? []), res.data]),
    }));
    setFocusedBlockId(res.data.id);

    setTimeout(() => {
      inputRefs.current[res.data.id]?.focus();
    }, 50);
  }

  async function deleteBlock(pageId: string, blockId: string) {
    const blocks = blocksByPage[pageId] ?? [];
    const index = blocks.findIndex((block) => block.id === blockId);
    const previous = index > 0 ? blocks[index - 1] : null;

    if (blockTimers.current[blockId]) {
      clearTimeout(blockTimers.current[blockId]);
      delete blockTimers.current[blockId];
    }

    await api.blocks.delete(pageId, blockId);

    setBlocksByPage((current) => ({
      ...current,
      [pageId]: (current[pageId] ?? []).filter((block) => block.id !== blockId),
    }));
    setDirtyIds((current) => {
      const next = { ...current };
      delete next[blockId];
      return next;
    });

    if (previous) {
      setFocusedBlockId(previous.id);
      setTimeout(() => {
        inputRefs.current[previous.id]?.focus();
      }, 50);
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

  function blockLabel(type: ScriptBlockType) {
    if (type === 'panel') return 'PANEL';
    if (type === 'scene') return 'SCENE';
    if (type === 'description') return 'DESCRIPTION';
    if (type === 'dialogue') return 'DIALOGUE';
    if (type === 'caption') return 'CAPTION';
    return 'SFX';
  }

  function renderBlock(page: ApiPage, block: ApiScriptBlock, index: number) {
    const isFocused = focusedBlockId === block.id;

    return (
      <View key={block.id}>
        <TouchableOpacity
          onPress={() => insertBlock(page.id, index - 1)}
          className="mx-6 h-8 items-center justify-center rounded border border-dashed"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-base" style={{ color: colors.accent }}>＋</Text>
        </TouchableOpacity>

        <View
          className="mx-4 my-2 rounded-lg border p-3"
          style={{
            borderColor: isFocused ? colors.accent : colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text className="mb-2 text-[10px] font-bold tracking-[1.4px]" style={{ color: colors.muted }}>
            {blockLabel(block.type)}
            {block.type === 'panel' && block.sizeTag ? ` · ${block.sizeTag.toUpperCase()}` : ''}
          </Text>

          {block.type === 'dialogue' && (
            <TextInput
              value={block.speaker ?? ''}
              onFocus={() => setFocusedBlockId(block.id)}
            onChangeText={(speaker) => {
                updateLocalBlock(page.id, block.id, { speaker });
                scheduleSave(page.id, block.id);
              }}
              placeholder="Speaker"
              placeholderTextColor={colors.faint}
              className="mb-2 rounded border px-3 py-2 text-sm"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          )}

          <TextInput
            ref={(ref) => {
              inputRefs.current[block.id] = ref;
            }}
            multiline
            value={block.content?.text ?? ''}
            onFocus={() => setFocusedBlockId(block.id)}
            onChangeText={(text) => {
              const content = { text };
              updateLocalBlock(page.id, block.id, { content });
              scheduleSave(page.id, block.id);
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && emptyForBlock(block)) {
                deleteBlock(page.id, block.id).catch(() => {});
              }
            }}
            placeholder={block.type === 'panel' ? 'Panel note…' : 'Write…'}
            placeholderTextColor={colors.faint}
            className="min-h-[64px] text-sm"
            style={{ color: colors.text, textAlignVertical: 'top' }}
          />

          {isFocused && (
            <View className="mt-3">
              <View className="flex-row flex-wrap">
                {TYPE_OPTIONS.map((option) => {
                  const active = block.type === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateType(page.id, block, option.value)}
                      className="mr-2 mt-2 rounded px-3 py-2"
                      style={{ backgroundColor: active ? colors.accent : colors.bg }}
                    >
                      <Text className="text-[11px] font-semibold" style={{ color: active ? colors.surface : colors.text }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {block.type === 'panel' && (
                <View className="mt-2 flex-row flex-wrap">
                  {PANEL_SIZE_OPTIONS.map((option) => {
                    const active = block.sizeTag === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => updatePanelSize(page.id, block, option.value)}
                        className="mr-2 mt-2 rounded px-3 py-2"
                        style={{ backgroundColor: active ? colors.timeline : colors.bg }}
                      >
                        <Text className="text-[11px] font-semibold" style={{ color: active ? colors.surface : colors.text }}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View className="border-b px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
        <Text className="text-xs font-semibold" style={{ color: isSaving ? colors.accent : colors.faint }}>
          {isSaving ? 'Saving…' : 'All saved'}
        </Text>
      </View>

      <ScrollView ref={scrollViewRef} className="flex-1" contentContainerStyle={{ paddingBottom: 200 }}>
        {pages.map((page) => {
          const blocks = sortBlocks(blocksByPage[page.id] ?? []);
          return (
            <View
              key={page.id}
              onLayout={(event) => {
                pageOffsets.current[page.id] = event.nativeEvent.layout.y;
              }}
              className="border-b pb-6"
              style={{ borderColor: colors.border }}
            >
              <View className="px-4 py-4">
                <Text className="text-base font-bold" style={{ color: activePageId === page.id ? colors.accent : colors.text }}>
                  Page {page.number}
                </Text>
              </View>

              {blocks.map((block, index) => renderBlock(page, block, index))}

              <TouchableOpacity
                onPress={() => insertBlock(page.id, blocks.length - 1)}
                className="mx-6 mt-1 h-8 items-center justify-center rounded border border-dashed"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-base" style={{ color: colors.accent }}>＋</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
