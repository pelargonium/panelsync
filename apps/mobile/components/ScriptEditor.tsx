import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

const TYPE_ORDER: ScriptBlockType[] = ['panel', 'scene', 'description', 'dialogue', 'caption', 'sfx'];

function sortBlocks(blocks: ApiScriptBlock[]) {
  return [...blocks].sort((a, b) => a.position - b.position);
}

function emptyForBlock(block: ApiScriptBlock) {
  return !(block.content?.text?.trim()) && !(block.speaker?.trim());
}

function typeColor(type: ScriptBlockType) {
  if (type === 'panel') return colors.accent;
  if (type === 'scene') return colors.muted;
  if (type === 'description') return colors.faint;
  if (type === 'dialogue') return colors.timeline;
  if (type === 'caption') return colors.accent;
  return colors.chalkboard;
}

function nextType(type: ScriptBlockType): ScriptBlockType {
  const currentIndex = TYPE_ORDER.indexOf(type);
  return TYPE_ORDER[(currentIndex + 1) % TYPE_ORDER.length];
}

function advanceType(type: ScriptBlockType): ScriptBlockType {
  if (type === 'panel') return 'scene';
  if (type === 'scene') return 'description';
  if (type === 'description') return 'dialogue';
  if (type === 'dialogue') return 'dialogue';
  if (type === 'caption') return 'description';
  return 'description';
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
  const isLoading = pages.length > 0 && pages.some((page) => !(page.id in blocksByPage));

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

  async function insertBlock(pageId: string, insertAfterIndex: number, type: ScriptBlockType = 'description') {
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
      type,
      content: { text: '' },
      position,
    });

    setBlocksByPage((current) => ({
      ...current,
      [pageId]: sortBlocks([...(current[pageId] ?? []), res.data]),
    }));
    setFocusedBlockId(res.data.id);

    setTimeout(() => {
      if (type !== 'panel') {
        inputRefs.current[`${res.data.id}:primary`]?.focus();
      }
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
        inputRefs.current[`${previous.id}:primary`]?.focus();
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

  async function focusOrAdvance(pageId: string, index: number, block: ApiScriptBlock) {
    const blocks = blocksByPage[pageId] ?? [];
    const next = blocks[index + 1];

    if (next) {
      setFocusedBlockId(next.id);
      setTimeout(() => {
        if (next.type !== 'panel') {
          inputRefs.current[`${next.id}:primary`]?.focus();
        }
      }, 50);
      return;
    }

    await insertBlock(pageId, index, advanceType(block.type));
  }

  function cycleTypeByTab(pageId: string, block: ApiScriptBlock) {
    updateType(pageId, block, nextType(block.type)).catch(() => {});
  }

  function panelNumberForPage(blocks: ApiScriptBlock[], blockId: string) {
    let count = 0;
    for (const block of blocks) {
      if (block.type === 'panel') count += 1;
      if (block.id === blockId) return count;
    }
    return count;
  }

  function AddBlockButton({
    pageId,
    insertAfterIndex,
    prominent = false,
    label = '＋ add block',
    type = 'description',
  }: {
    pageId: string;
    insertAfterIndex: number;
    prominent?: boolean;
    label?: string;
    type?: ScriptBlockType;
  }) {
    return (
      <TouchableOpacity
        onPress={() => insertBlock(pageId, insertAfterIndex, type)}
        className={prominent ? 'items-center justify-center py-10' : 'px-4 py-1'}
      >
        <Text
          className={prominent ? 'text-sm' : 'text-xs'}
          style={{ color: colors.faint, fontFamily: 'Courier New' }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderToolbar(page: ApiPage, block: ApiScriptBlock, index: number) {
    return (
      <View>
        <View
          className="mt-3 flex-row items-center border-y px-4 py-2"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {TYPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => updateType(page.id, block, option.value)}
              className="mr-3"
            >
              <Text
                className="text-[10px] font-bold uppercase"
                style={{
                  color: block.type === option.value ? typeColor(option.value) : colors.muted,
                  fontFamily: 'Courier New',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View className="flex-1" />

          <TouchableOpacity onPress={() => focusOrAdvance(page.id, index, block)}>
            <Text
              className="text-[12px] font-bold"
              style={{ color: colors.accent, fontFamily: 'Courier New' }}
            >
              ↵
            </Text>
          </TouchableOpacity>
        </View>

        {block.type === 'panel' && (
          <View className="flex-row px-4 pb-2 pt-2" style={{ backgroundColor: colors.surface }}>
            {PANEL_SIZE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => updatePanelSize(page.id, block, option.value)}
                className="mr-3"
              >
                <Text
                  className="text-[10px] uppercase"
                  style={{
                    color: block.sizeTag === option.value ? colors.accent : colors.muted,
                    fontFamily: 'Courier New',
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderBlock(page: ApiPage, block: ApiScriptBlock, index: number, blocks: ApiScriptBlock[]) {
    const isFocused = focusedBlockId === block.id;
    const sharedTextStyle = { color: colors.text, fontFamily: 'Courier New' as const };
    const pagePanelNumber = panelNumberForPage(blocks, block.id);

    return (
      <View key={block.id}>
        {index > 0 && <AddBlockButton pageId={page.id} insertAfterIndex={index - 1} />}

        <View className="px-4 py-2">
          {block.type === 'panel' && (
            <TouchableOpacity onPress={() => setFocusedBlockId(block.id)} className="py-4">
              <View className="flex-row items-center">
                <View className="flex-1" style={{ height: 1, backgroundColor: colors.accent }} />
                <View className="px-4">
                  <Text
                    className="text-[11px] font-semibold"
                    style={{ color: colors.accent, fontFamily: 'Courier New', letterSpacing: 1 }}
                  >
                    PANEL {pagePanelNumber}
                  </Text>
                </View>
                <View className="flex-1" style={{ height: 1, backgroundColor: colors.accent }} />
              </View>
            </TouchableOpacity>
          )}

          {block.type === 'scene' && (
            <TextInput
              ref={(ref) => {
                inputRefs.current[`${block.id}:primary`] = ref;
              }}
              value={block.content?.text ?? ''}
              onFocus={() => setFocusedBlockId(block.id)}
              onChangeText={(text) => {
                updateLocalBlock(page.id, block.id, { content: { text } });
                scheduleSave(page.id, block.id);
              }}
              onSubmitEditing={() => {
                focusOrAdvance(page.id, index, block).catch(() => {});
              }}
              returnKeyType="next"
              autoCapitalize="characters"
              placeholder="INT./EXT. LOCATION — TIME"
              placeholderTextColor={colors.faint}
              className="py-1 text-[14px]"
              style={{ ...sharedTextStyle, textTransform: 'uppercase' }}
            />
          )}

          {block.type === 'description' && (
            <TextInput
              ref={(ref) => {
                inputRefs.current[`${block.id}:primary`] = ref;
              }}
              multiline
              scrollEnabled={false}
              value={block.content?.text ?? ''}
              onFocus={() => setFocusedBlockId(block.id)}
              onChangeText={(text) => {
                updateLocalBlock(page.id, block.id, { content: { text } });
                scheduleSave(page.id, block.id);
              }}
              onKeyPress={(event) => {
                const key = event.nativeEvent.key;
                const native = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean };
                if (key === 'Backspace' && emptyForBlock(block)) {
                  deleteBlock(page.id, block.id).catch(() => {});
                } else if (key === 'Tab') {
                  cycleTypeByTab(page.id, block);
                } else if (key === 'Enter' && !native.shiftKey) {
                  focusOrAdvance(page.id, index, block).catch(() => {});
                }
              }}
              placeholder="Describe the action…"
              placeholderTextColor={colors.faint}
              className="min-h-[30px] py-1 text-[14px]"
              style={{ ...sharedTextStyle, color: colors.muted, textAlignVertical: 'top' }}
            />
          )}

          {block.type === 'dialogue' && (
            <View style={{ paddingLeft: 100 }}>
              <TextInput
                ref={(ref) => {
                  inputRefs.current[`${block.id}:speaker`] = ref;
                }}
                value={block.speaker ?? ''}
                onFocus={() => setFocusedBlockId(block.id)}
                onChangeText={(speaker) => {
                  updateLocalBlock(page.id, block.id, { speaker });
                  scheduleSave(page.id, block.id);
                }}
                onSubmitEditing={() => {
                  inputRefs.current[`${block.id}:primary`]?.focus();
                }}
                returnKeyType="next"
                autoCapitalize="characters"
                placeholder="CHARACTER"
                placeholderTextColor={colors.faint}
                className="py-1 text-[13px] font-bold uppercase"
                style={{ ...sharedTextStyle, fontWeight: '700' }}
              />
              <TextInput
                ref={(ref) => {
                  inputRefs.current[`${block.id}:primary`] = ref;
                }}
                multiline
                scrollEnabled={false}
                value={block.content?.text ?? ''}
                onFocus={() => setFocusedBlockId(block.id)}
                onChangeText={(text) => {
                  updateLocalBlock(page.id, block.id, { content: { text } });
                  scheduleSave(page.id, block.id);
                }}
                onKeyPress={(event) => {
                  const key = event.nativeEvent.key;
                  const native = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean };
                  if (key === 'Backspace' && emptyForBlock(block)) {
                    deleteBlock(page.id, block.id).catch(() => {});
                  } else if (key === 'Tab') {
                    cycleTypeByTab(page.id, block);
                  } else if (key === 'Enter' && !native.shiftKey) {
                    focusOrAdvance(page.id, index, block).catch(() => {});
                  }
                }}
                placeholder="Dialogue…"
                placeholderTextColor={colors.faint}
                className="min-h-[30px] py-1 text-[14px]"
                style={{ ...sharedTextStyle, color: colors.muted, textAlignVertical: 'top' }}
              />
            </View>
          )}

          {block.type === 'caption' && (
            <View className="rounded-r-md py-2 pl-3 pr-2" style={{ borderLeftWidth: 2, borderLeftColor: colors.accent }}>
              <TextInput
                ref={(ref) => {
                  inputRefs.current[`${block.id}:primary`] = ref;
                }}
                multiline
                scrollEnabled={false}
                value={block.content?.text ?? ''}
                onFocus={() => setFocusedBlockId(block.id)}
                onChangeText={(text) => {
                  updateLocalBlock(page.id, block.id, { content: { text } });
                  scheduleSave(page.id, block.id);
                }}
                onKeyPress={(event) => {
                  const key = event.nativeEvent.key;
                  const native = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean };
                  if (key === 'Backspace' && emptyForBlock(block)) {
                    deleteBlock(page.id, block.id).catch(() => {});
                  } else if (key === 'Tab') {
                    cycleTypeByTab(page.id, block);
                  } else if (key === 'Enter' && !native.shiftKey) {
                    focusOrAdvance(page.id, index, block).catch(() => {});
                  }
                }}
                placeholder="Narration…"
                placeholderTextColor={colors.faint}
                className="min-h-[30px] py-1 text-[14px]"
                style={{ ...sharedTextStyle, color: colors.muted, fontStyle: 'italic', textAlignVertical: 'top' }}
              />
            </View>
          )}

          {block.type === 'sfx' && (
            <TextInput
              ref={(ref) => {
                inputRefs.current[`${block.id}:primary`] = ref;
              }}
              value={block.content?.text ?? ''}
              onFocus={() => setFocusedBlockId(block.id)}
              onChangeText={(text) => {
                updateLocalBlock(page.id, block.id, { content: { text } });
                scheduleSave(page.id, block.id);
              }}
              onSubmitEditing={() => {
                focusOrAdvance(page.id, index, block).catch(() => {});
              }}
              onKeyPress={(event) => {
                if (event.nativeEvent.key === 'Tab') {
                  cycleTypeByTab(page.id, block);
                }
              }}
              returnKeyType="next"
              autoCapitalize="characters"
              placeholder="KRAAKOOOM"
              placeholderTextColor={colors.faint}
              className="py-1 text-[22px] font-bold"
              style={{ ...sharedTextStyle, color: colors.chalkboard, fontWeight: '700' }}
            />
          )}
        </View>

        {isFocused && renderToolbar(page, block, index)}
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View
        className="flex-row items-center border-b px-4"
        style={{ height: 36, borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <View
          className="mr-2 h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: isSaving ? colors.accent : colors.bible }}
        />
        <Text
          className="text-[10px]"
          style={{ color: isSaving ? colors.accent : colors.bible, fontFamily: 'Courier New', letterSpacing: 1 }}
        >
          {isSaving ? 'SAVING' : 'ALL SAVED'}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 200 }}
        >
          {pages.map((page, pageIndex) => {
            const blocks = sortBlocks(blocksByPage[page.id] ?? []);
            return (
              <View key={page.id}>
                {pageIndex > 0 && (
                  <View className="mx-4 h-[72px] items-center justify-center">
                    <View className="absolute left-4 right-4 h-px" style={{ backgroundColor: colors.border }} />
                    <Text
                      className="px-3 text-[9px] uppercase"
                      style={{ color: colors.faint, backgroundColor: colors.bg, fontFamily: 'Courier New', letterSpacing: 1 }}
                    >
                      PAGE {String(page.number).padStart(2, '0')}
                    </Text>
                  </View>
                )}

                <View
                  onLayout={(event) => {
                    pageOffsets.current[page.id] = event.nativeEvent.layout.y;
                  }}
                  className="mx-4 rounded-lg px-0 pb-8"
                  style={{ backgroundColor: colors.pageWhite }}
                >
                  <View className="px-4 pt-6 pb-4">
                    <Text
                      className="text-[11px]"
                      style={{
                        color: activePageId === page.id ? colors.accent : colors.muted,
                        fontFamily: 'Courier New',
                        letterSpacing: 1.2,
                      }}
                    >
                      PAGE {String(page.number).padStart(2, '0')}
                    </Text>
                  </View>

                  {blocks.length === 0 ? (
                    <TouchableOpacity onPress={() => insertBlock(page.id, -1, 'scene')} className="items-center justify-center py-16">
                      <Text className="text-sm" style={{ color: colors.faint, fontFamily: 'Courier New' }}>
                        Tap to start writing…
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    blocks.map((block, index) => renderBlock(page, block, index, blocks))
                  )}

                  <TouchableOpacity onPress={() => insertBlock(page.id, blocks.length - 1)} className="px-4 pt-2">
                    <Text className="text-xs" style={{ color: colors.faint, fontFamily: 'Courier New' }}>
                      ＋
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
