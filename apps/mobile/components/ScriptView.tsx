import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fromWebEvent, fromNativeEvent, isWeb, type KeyInfo } from '../lib/keyboard';

export type ScriptElementType = 'page' | 'panel' | 'scene' | 'character' | 'parenthetical' | 'dialogue';

export interface ScriptElement {
  id: string;
  type: ScriptElementType;
  text: string;
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
}

const SCRIPT_ELEMENT_TYPES: ScriptElementType[] = ['page', 'panel', 'scene', 'character', 'parenthetical', 'dialogue'];

// Indentation levels — pushed right for breathing room
function indentForType(type: ScriptElementType): number {
  if (type === 'page') return 16;
  if (type === 'panel') return 40;
  if (type === 'scene') return 64;
  if (type === 'character') return 80;
  if (type === 'parenthetical') return 80;
  if (type === 'dialogue') return 64;
  return 16;
}

function styleForType(type: ScriptElementType, colors: any) {
  if (type === 'page') return { fontSize: 14, fontWeight: '700' as const, color: colors.text };
  if (type === 'panel') return { fontSize: 12, fontWeight: '700' as const, color: colors.text };
  if (type === 'scene') return { fontSize: 13, color: colors.text };
  if (type === 'character') return { fontSize: 12, fontWeight: '700' as const, color: colors.text };
  if (type === 'parenthetical') return { fontSize: 12, fontStyle: 'italic' as const, color: colors.text };
  if (type === 'dialogue') return { fontSize: 13, color: colors.text };
  return { fontSize: 13, color: colors.text };
}

// Compute auto-numbering: page numbers and per-page panel counts
function computeNumbering(elements: ScriptElement[]): Map<number, { pageNum: number; panelNum?: number }> {
  const map = new Map<number, { pageNum: number; panelNum?: number }>();
  let pageCount = 0;
  let panelCount = 0;
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type === 'page') {
      pageCount++;
      panelCount = 0;
      map.set(i, { pageNum: pageCount });
    } else if (elements[i].type === 'panel') {
      panelCount++;
      map.set(i, { pageNum: pageCount, panelNum: panelCount });
    }
  }
  return map;
}

export default function ScriptView({ elements, onElementsChange, isFocused, nameInputRef }: ScriptViewProps) {
  const { colors, mono } = useTheme();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<Record<string, TextInput>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const numbering = useMemo(() => computeNumbering(elements), [elements]);

  // Element mutation helpers
  function addElement(afterIndex: number, type: ScriptElementType, text: string = '') {
    const el = { id: generateId(), type, text };
    const next = [...elements];
    next.splice(afterIndex + 1, 0, el);
    onElementsChange(next);
    setFocusedIndex(afterIndex + 1);
  }

  function replaceElement(index: number, type: ScriptElementType, text: string = '') {
    onElementsChange(elements.map((e, i) => i === index ? { ...e, type, text } : e));
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

  // Auto-focus logic
  useEffect(() => {
    if (isFocused && elements[focusedIndex]) {
      const input = inputRefs.current[elements[focusedIndex].id];
      setTimeout(() => input?.focus(), 0);
    }
  }, [isFocused, focusedIndex, elements]);

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
          replaceElement(focusedIndex, 'page');
        } else if (currentElement.type === 'scene') {
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
          addElement(focusedIndex, 'dialogue');
        } else if (currentElement.type === 'parenthetical') {
          updateElement(focusedIndex, { text: currentElement.text });
          addElement(focusedIndex, 'dialogue');
        } else if (currentElement.type === 'dialogue') {
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
    handleKeyRef.current?.(fromNativeEvent(e));
  }

  return (
    <ScrollView ref={scrollViewRef} style={{ flex: 1, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
      {elements.map((el, i) => {
        const nums = numbering.get(i);

        // Build prefix for page/panel rows
        let prefix = '';
        if (el.type === 'page' && nums) {
          prefix = `Page ${nums.pageNum}`;
        } else if (el.type === 'panel' && nums) {
          prefix = `Panel ${nums.panelNum}`;
        }

        // Placeholder text per type
        const placeholder = el.type === 'scene' ? 'scene description'
          : el.type === 'character' ? 'character'
          : el.type === 'dialogue' ? 'dialogue'
          : el.type === 'parenthetical' ? 'parenthetical'
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

            {el.type === 'parenthetical' && (
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, marginRight: 2 }}>(</Text>
            )}

            <TextInput
              ref={r => { if (r) inputRefs.current[el.id] = r; }}
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
              onFocus={() => setFocusedIndex(i)}
              multiline={false}
            />

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
