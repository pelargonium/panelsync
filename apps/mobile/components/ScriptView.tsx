import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fromWebEvent, fromNativeEvent, isWeb, type KeyInfo } from '../lib/keyboard';

export type ScriptElementType = 'page' | 'panel' | 'scene' | 'character' | 'parenthetical' | 'dialogue' | 'caption';
export type PanelSize = 'splash' | 'half' | 'wide' | 'small' | 'banner' | 'beat';

export interface ScriptElement {
  id: string;
  type: ScriptElementType;
  text: string;
  size?: PanelSize;
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

interface ScriptViewProps {
  elements: ScriptElement[];
  onElementsChange: (elements: ScriptElement[]) => void;
  isFocused: boolean;
  nameInputRef: React.RefObject<TextInput | null>;
  firstInputRef?: React.RefObject<TextInput | null>;
}

const SCRIPT_ELEMENT_TYPES: ScriptElementType[] = ['page', 'panel', 'scene', 'character', 'parenthetical', 'dialogue', 'caption'];
const PANEL_SIZE_CYCLE: (PanelSize | undefined)[] = ['splash', 'half', 'wide', 'small', 'banner', 'beat', undefined];

const SIZE_BUDGET: Record<PanelSize, number> = {
  splash: 1.0,
  half: 0.5,
  wide: 0.33,
  small: 0.15,
  banner: 0.13,
  beat: 0.10,
};

// Indentation levels — pushed right for breathing room
function indentForType(type: ScriptElementType): number {
  if (type === 'page') return 16;
  if (type === 'panel') return 40;
  if (type === 'scene') return 64;
  if (type === 'character') return 160;
  if (type === 'parenthetical') return 160;
  if (type === 'dialogue') return 128;
  if (type === 'caption') return 128;
  return 16;
}

function styleForType(type: ScriptElementType, colors: any) {
  if (type === 'page') return { fontSize: 14, fontWeight: '700' as const, color: colors.text };
  if (type === 'panel') return { fontSize: 12, fontWeight: '700' as const, color: colors.text };
  if (type === 'character') return { fontSize: 12, fontWeight: '700' as const, color: colors.text };
  if (type === 'parenthetical') return { fontSize: 12, fontStyle: 'italic' as const, color: colors.text };
  return { fontSize: 13, color: colors.text };
}

// Compute auto-numbering: page numbers and per-page panel counts
function computeNumbering(elements: ScriptElement[]): Map<number, { pageNum: number; panelNum?: number; panelsOnPage?: number }> {
  const map = new Map<number, { pageNum: number; panelNum?: number; panelsOnPage?: number }>();
  let pageCount = 0;
  let panelCount = 0;
  let lastPageIdx = -1;
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type === 'page') {
      if (lastPageIdx !== -1) map.get(lastPageIdx)!.panelsOnPage = panelCount;
      pageCount++;
      panelCount = 0;
      lastPageIdx = i;
      map.set(i, { pageNum: pageCount });
    } else if (elements[i].type === 'panel') {
      panelCount++;
      map.set(i, { pageNum: pageCount, panelNum: panelCount });
    }
  }
  if (lastPageIdx !== -1) map.get(lastPageIdx)!.panelsOnPage = panelCount;
  return map;
}

function matchCaptionKeyword(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return lower.length >= 2 && 'caption'.startsWith(lower);
}

function getFittestSize(elements: ScriptElement[], index: number): PanelSize | undefined {
  // Find start of current page
  let pageStart = 0;
  for (let i = index; i >= 0; i--) {
    if (elements[i].type === 'page') { pageStart = i; break; }
  }
  // Sum budgets of other panels on this page
  let used = 0;
  for (let i = pageStart; i < elements.length; i++) {
    if (elements[i].type === 'page' && i !== pageStart) break;
    if (elements[i].type === 'panel' && i !== index && elements[i].size) {
      used += SIZE_BUDGET[elements[i].size!];
    }
  }
  const remaining = 1.0 - used;
  // Find largest cycle size that fits
  return PANEL_SIZE_CYCLE.find(s => s && SIZE_BUDGET[s] <= remaining + 0.01) as PanelSize | undefined;
}

function computePageOverflows(elements: ScriptElement[]): Set<number> {
  const overflows = new Set<number>();
  let pageNum = 0;
  let panels: ScriptElement[] = [];

  function checkPage() {
    if (panels.length === 0) return;
    const explicit = panels.filter((panel) => panel.size);
    const implicit = panels.filter((panel) => !panel.size);
    const explicitTotal = explicit.reduce((sum, panel) => sum + SIZE_BUDGET[panel.size!], 0);
    const implicitEach = implicit.length > 0
      ? (explicit.length === 0 ? 1.0 / panels.length : Math.max(0, (1.0 - explicitTotal) / implicit.length))
      : 0;
    const total = explicitTotal + implicit.length * implicitEach;
    if (total > 1.05) overflows.add(pageNum);
  }

  for (const element of elements) {
    if (element.type === 'page') {
      checkPage();
      pageNum++;
      panels = [];
    } else if (element.type === 'panel') {
      panels.push(element);
    }
  }
  checkPage();

  return overflows;
}

export default function ScriptView({ elements, onElementsChange, isFocused, nameInputRef, firstInputRef }: ScriptViewProps) {
  const { colors, mono } = useTheme();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<Record<string, TextInput>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const numbering = useMemo(() => computeNumbering(elements), [elements]);
  const overflows = useMemo(() => computePageOverflows(elements), [elements]);

  // Element mutation helpers
  function addElement(afterIndex: number, type: ScriptElementType, text: string = '') {
    const el = { id: generateId(), type, text };
    const next = [...elements];
    next.splice(afterIndex + 1, 0, el);
    onElementsChange(next);
    setFocusedIndex(afterIndex + 1);
  }

  function replaceElement(index: number, type: ScriptElementType, text: string = '') {
    onElementsChange(elements.map((e, i) => {
      if (i !== index) return e;
      const next = { ...e, type, text };
      if (type !== 'panel') delete next.size;
      return next;
    }));
    setFocusedIndex(index);
  }

  function updateElement(index: number, patch: Partial<ScriptElement>) {
    onElementsChange(elements.map((e, i) => i === index ? { ...e, ...patch } : e));
  }

  function deleteElement(index: number) {
    if (elements.length <= 1) return;
    const next = elements.filter((_, i) => i !== index);
    onElementsChange(next);
    setFocusedIndex(Math.max(0, index - 1));
  }

  function blurCurrent() {
    if (isWeb) {
      (document.activeElement as HTMLElement)?.blur?.();
    } else {
      const el = elements[focusedIndex];
      if (el) inputRefs.current[el.id]?.blur();
    }
  }

  // Auto-focus logic — only when focusedIndex or panel focus changes, not on every edit
  useEffect(() => {
    const el = elements[focusedIndex];
    if (isFocused && el) {
      const input = inputRefs.current[el.id];
      setTimeout(() => input?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, focusedIndex]);

  // ── Unified keyboard handler ───────────────────────────────────────
  const handleKeyRef = useRef<(info: KeyInfo) => void>(undefined);
  handleKeyRef.current = (info: KeyInfo) => {
    if (!isFocused) return;

    const currentElement = elements[focusedIndex];
    if (!currentElement) return;

    // Enter chain
    if (info.key === 'Enter' && !info.shift && !info.ctrl && !info.meta && !info.alt) {
      info.prevent();
      const currentText = currentElement.text.trim();

      if (currentText === '') {
        if (currentElement.type === 'dialogue') {
          replaceElement(focusedIndex, 'character');
        } else if (currentElement.type === 'character') {
          replaceElement(focusedIndex, 'panel');
        } else if (currentElement.type === 'panel') {
          addElement(focusedIndex, 'scene');
        } else if (currentElement.type === 'scene') {
          replaceElement(focusedIndex, 'character');
        } else if (currentElement.type === 'caption') {
          replaceElement(focusedIndex, 'character');
        } else if (currentElement.type === 'page') {
          addElement(focusedIndex, 'panel');
        } else {
          addElement(focusedIndex, 'dialogue');
        }
      } else {
        if (currentElement.type === 'page') {
          addElement(focusedIndex, 'panel');
        } else if (currentElement.type === 'panel') {
          addElement(focusedIndex, 'scene');
        } else if (currentElement.type === 'scene') {
          addElement(focusedIndex, 'character');
        } else if (currentElement.type === 'character') {
          if (matchCaptionKeyword(currentElement.text)) {
            replaceElement(focusedIndex, 'caption', '');
            addElement(focusedIndex, 'character');
          } else {
            addElement(focusedIndex, 'dialogue');
          }
        } else if (currentElement.type === 'parenthetical') {
          updateElement(focusedIndex, { text: currentElement.text });
          addElement(focusedIndex, 'dialogue');
        } else if (currentElement.type === 'dialogue') {
          addElement(focusedIndex, 'character');
        } else if (currentElement.type === 'caption') {
          addElement(focusedIndex, 'character');
        }
      }
      return;
    }

    // Tab / Shift+Tab - type cycling (only on empty elements)
    if (info.key === 'Tab' && currentElement.text.trim() === '') {
      info.prevent();
      const currentIndex = SCRIPT_ELEMENT_TYPES.indexOf(currentElement.type);
      let nextIndex;
      if (info.shift) {
        nextIndex = (currentIndex - 1 + SCRIPT_ELEMENT_TYPES.length) % SCRIPT_ELEMENT_TYPES.length;
      } else {
        nextIndex = (currentIndex + 1) % SCRIPT_ELEMENT_TYPES.length;
      }
      replaceElement(focusedIndex, SCRIPT_ELEMENT_TYPES[nextIndex]);
      return;
    }

    // ArrowUp / ArrowDown - linear navigation
    if (info.key === 'ArrowUp' && !info.alt) {
      info.prevent();
      if (focusedIndex === 0) {
        blurCurrent();
        nameInputRef.current?.focus();
      } else {
        setFocusedIndex(Math.max(0, focusedIndex - 1));
      }
      return;
    }

    // Panel size cycling via ArrowLeft/ArrowRight
    if (currentElement.type === 'panel' && currentElement.text === '' && (info.key === 'ArrowLeft' || info.key === 'ArrowRight')) {
      info.prevent();
      const currentSize = currentElement.size;
      // Smart default: when no size is set, start from the fittest size for this page
      if (!currentSize) {
        const fittest = getFittestSize(elements, focusedIndex);
        updateElement(focusedIndex, { size: fittest });
        return;
      }
      const currentIndex = PANEL_SIZE_CYCLE.indexOf(currentSize);
      let nextIndex;
      if (info.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % PANEL_SIZE_CYCLE.length;
      } else {
        nextIndex = (currentIndex - 1 + PANEL_SIZE_CYCLE.length) % PANEL_SIZE_CYCLE.length;
      }
      updateElement(focusedIndex, { size: PANEL_SIZE_CYCLE[nextIndex] });
      return;
    }

    if (info.key === 'ArrowDown' && !info.alt) {
      info.prevent();
      setFocusedIndex(Math.min(elements.length - 1, focusedIndex + 1));
      return;
    }

    // Alt+Up / Alt+Down - block jumping (content elements)
    if (info.alt && (info.key === 'ArrowUp' || info.key === 'ArrowDown')) {
      info.prevent();
      const isUp = info.key === 'ArrowUp';
      let nextIndex = focusedIndex;
      const contentTypes: ScriptElementType[] = ['scene', 'dialogue', 'parenthetical'];

      if (isUp) {
        for (let i = focusedIndex - 1; i >= 0; i--) {
          if (contentTypes.includes(elements[i].type)) { nextIndex = i; break; }
        }
      } else {
        for (let i = focusedIndex + 1; i < elements.length; i++) {
          if (contentTypes.includes(elements[i].type)) { nextIndex = i; break; }
        }
      }
      setFocusedIndex(nextIndex);
      return;
    }

    // Alt+Left / Alt+Right - within-dialogue navigation
    if (info.alt && (info.key === 'ArrowLeft' || info.key === 'ArrowRight')) {
      info.prevent();
      const isLeft = info.key === 'ArrowLeft';
      let targetIndex = focusedIndex;

      if (isLeft) {
        if (currentElement.type === 'dialogue' && focusedIndex > 0 && elements[focusedIndex - 1].type === 'parenthetical') {
          targetIndex = focusedIndex - 1;
        } else if ((currentElement.type === 'dialogue' || currentElement.type === 'parenthetical') && focusedIndex > 0 && elements[focusedIndex - 1].type === 'character') {
          targetIndex = focusedIndex - 1;
        }
      } else {
        if (currentElement.type === 'character' && focusedIndex < elements.length - 1 && elements[focusedIndex + 1].type === 'parenthetical') {
          targetIndex = focusedIndex + 1;
        } else if ((currentElement.type === 'character' || currentElement.type === 'parenthetical') && focusedIndex < elements.length - 1 && elements[focusedIndex + 1].type === 'dialogue') {
          targetIndex = focusedIndex + 1;
        }
      }

      if (targetIndex !== focusedIndex) setFocusedIndex(targetIndex);
      return;
    }

    // Backspace on empty element
    if (info.key === 'Backspace' && currentElement.text.trim() === '' && elements.length > 1) {
      info.prevent();
      if (currentElement.type === 'panel' && currentElement.size) {
        updateElement(focusedIndex, { size: undefined });
        return;
      }
      deleteElement(focusedIndex);
      return;
    }

    // Escape
    if (info.key === 'Escape') {
      info.prevent();
      blurCurrent();
      return;
    }
  };

  // Web: document-level capture phase listener
  useEffect(() => {
    if (!isWeb) return;
    function handler(e: KeyboardEvent) {
      // Skip if name input is focused
      const active = document.activeElement as HTMLElement;
      const nameEl = nameInputRef.current as unknown as HTMLElement;
      if (nameEl && (active === nameEl || (nameEl as any).contains?.(active))) return;
      const isEditing = (active as any)?.tagName === 'INPUT' || (active as any)?.tagName === 'TEXTAREA';
      if (!isEditing) return;

      handleKeyRef.current?.(fromWebEvent(e));
    }
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  // Native: onKeyPress handler for TextInputs
  function nativeKeyPress(e: any) {
    if (isWeb) return;
    handleKeyRef.current?.(fromNativeEvent(e));
  }

  return (
    <ScrollView ref={scrollViewRef} style={{ flex: 1, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
      {elements.map((el, i) => {
        const nums = numbering.get(i);

        // Build prefix for page/panel rows
        let prefix = '';
        if (el.type === 'page' && nums) {
          prefix = `Page ${nums.pageNum} (${nums.panelsOnPage ?? 0} panels)`;
        } else if (el.type === 'panel' && nums) {
          prefix = `Panel ${nums.panelNum}`;
        }

        // Placeholder text per type
        const placeholder = el.type === 'scene' ? 'scene description'
          : el.type === 'character' ? 'character'
          : el.type === 'dialogue' ? 'dialogue'
          : el.type === 'caption' ? 'caption'
          : el.type === 'parenthetical' ? 'parenthetical'
          : el.type === 'panel' ? ''
          : prefix ? 'title' : '';

        // Character onChangeText with parenthetical auto-insert
        const onChangeText = el.type === 'character'
          ? (v: string) => {
              const parenIndex = v.indexOf('(');
              if (parenIndex !== -1) {
                // On web, check cursor position; on native, always split on (
                if (isWeb) {
                  const input = document.activeElement as HTMLInputElement;
                  if (input?.selectionStart === parenIndex + 1) {
                    const beforeParen = v.substring(0, parenIndex).toUpperCase();
                    const afterParen = v.substring(parenIndex + 1);
                    updateElement(i, { text: beforeParen });
                    addElement(i, 'parenthetical', afterParen);
                    return;
                  }
                } else {
                  // Native: split whenever ( appears (cursor position not accessible)
                  const beforeParen = v.substring(0, parenIndex).toUpperCase();
                  const afterParen = v.substring(parenIndex + 1);
                  updateElement(i, { text: beforeParen });
                  addElement(i, 'parenthetical', afterParen);
                  return;
                }
              }
              updateElement(i, { text: v.toUpperCase() });
            }
          : (v: string) => updateElement(i, { text: v });

        return (
          <View
            key={el.id}
            style={{
              flexDirection: 'row',
              backgroundColor: focusedIndex === i ? colors.selection : 'transparent',
              paddingLeft: indentForType(el.type),
              paddingVertical: el.type === 'page' || el.type === 'panel' ? 6 : 2,
              marginTop: el.type === 'page' ? 12 : el.type === 'panel' ? 6 : 0,
              minHeight: 28,
              alignItems: 'center',
            }}
          >
            {prefix ? (
              <Text style={{ fontFamily: mono, ...styleForType(el.type, colors), marginRight: 8 }}>
                {prefix}
              </Text>
            ) : null}

            {el.type === 'panel' && el.text === '' && (el.size || focusedIndex === i) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>
                  {focusedIndex === i ? '← ' : ''}
                </Text>
                <Text style={{
                  fontFamily: mono,
                  fontSize: 12,
                  color: el.size ? colors.text : colors.muted,
                  textTransform: 'uppercase'
                }}>
                  {el.size ? el.size : (focusedIndex === i ? 'Select panel size' : '')}
                </Text>
                <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>
                  {focusedIndex === i ? ' →' : ''}
                </Text>
              </View>
            )}

            {el.type === 'parenthetical' && (
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, marginRight: 2 }}>(</Text>
            )}

            {el.type === 'page' ? (
              <TextInput
                ref={r => {
                  if (r) inputRefs.current[el.id] = r;
                  if (r && i === 0 && firstInputRef) (firstInputRef as React.MutableRefObject<TextInput | null>).current = r;
                }}
                value=""
                onKeyPress={nativeKeyPress}
                submitBehavior="submit"
                style={{ width: 0, height: 0, padding: 0, margin: 0, opacity: 0, position: 'absolute' }}
                onFocus={() => setFocusedIndex(i)}
              />
            ) : (
              <TextInput
                ref={r => {
                  if (r) inputRefs.current[el.id] = r;
                  if (r && i === 0 && firstInputRef) (firstInputRef as React.MutableRefObject<TextInput | null>).current = r;
                }}
                value={el.text}
                onChangeText={onChangeText}
                onKeyPress={nativeKeyPress}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                submitBehavior="submit"
                style={{
                  flex: 1,
                  fontFamily: mono,
                  ...styleForType(el.type, colors),
                  paddingVertical: 0,
                  ...(isWeb ? { outlineStyle: 'none' as any } : {}),
                }}
                onFocus={() => {
                  setFocusedIndex(i);
                }}
                multiline={false}
              />
            )}

            {el.type === 'character' && focusedIndex === i && matchCaptionKeyword(el.text) && (
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, marginLeft: 8, opacity: 0.6 }}>
                CAPTION
              </Text>
            )}

            {el.type === 'panel' && overflows.has(numbering.get(i)?.pageNum ?? 0) ? (
              <Text style={{ fontFamily: mono, fontSize: 10, color: colors.error, marginLeft: 4 }}>[!]</Text>
            ) : null}

            {el.type === 'parenthetical' && (
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, marginLeft: 2 }}>)</Text>
            )}
          </View>
        );
      })}
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}
