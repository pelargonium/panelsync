import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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

  // Auto-focus logic
  useEffect(() => {
    if (isFocused && elements[focusedIndex]) {
      const input = inputRefs.current[elements[focusedIndex].id];
      setTimeout(() => input?.focus(), 0);
    }
  }, [isFocused, focusedIndex, elements]);

  // Keyboard handler
  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  keyRef.current = (e: KeyboardEvent) => {
    if (!isFocused || Platform.OS !== 'web') return;

    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    const isEditing = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
    if (!isEditing) return;

    // Don't intercept keys when name input is focused (it's outside ScriptView)
    const nameEl = nameInputRef.current as unknown as HTMLElement;
    if (nameEl && (active === nameEl || (nameEl as any).contains?.(active))) return;

    const currentElement = elements[focusedIndex];
    if (!currentElement) return;

    // Enter chain
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const currentText = currentElement.text.trim();

      if (currentText === '') {
        // Empty element -> collapse up hierarchy
        if (currentElement.type === 'dialogue') {
          replaceElement(focusedIndex, 'character');
        } else if (currentElement.type === 'character') {
          replaceElement(focusedIndex, 'panel');
        } else if (currentElement.type === 'panel') {
          replaceElement(focusedIndex, 'page');
        } else if (currentElement.type === 'scene') {
          // Empty scene -> skip to character (don't leave blank scene descriptions)
          replaceElement(focusedIndex, 'character');
        } else if (currentElement.type === 'page') {
          addElement(focusedIndex, 'panel');
        } else {
          addElement(focusedIndex, 'dialogue');
        }
      } else {
        // Non-empty element -> advance down hierarchy
        if (currentElement.type === 'page') {
          addElement(focusedIndex, 'panel');
        } else if (currentElement.type === 'panel') {
          addElement(focusedIndex, 'scene');
        } else if (currentElement.type === 'scene') {
          addElement(focusedIndex, 'character');
        } else if (currentElement.type === 'character') {
          addElement(focusedIndex, 'dialogue');
        } else if (currentElement.type === 'parenthetical') {
          // Close parens: append ) to current text, then create dialogue
          updateElement(focusedIndex, { text: currentElement.text });
          addElement(focusedIndex, 'dialogue');
        } else if (currentElement.type === 'dialogue') {
          addElement(focusedIndex, 'character');
        }
      }
      return;
    }

    // Tab / Shift+Tab - type cycling (only on empty elements)
    if (e.key === 'Tab' && currentElement.text.trim() === '') {
      e.preventDefault();
      const currentIndex = SCRIPT_ELEMENT_TYPES.indexOf(currentElement.type);
      let nextIndex;
      if (e.shiftKey) {
        nextIndex = (currentIndex - 1 + SCRIPT_ELEMENT_TYPES.length) % SCRIPT_ELEMENT_TYPES.length;
      } else {
        nextIndex = (currentIndex + 1) % SCRIPT_ELEMENT_TYPES.length;
      }
      replaceElement(focusedIndex, SCRIPT_ELEMENT_TYPES[nextIndex]);
      return;
    }

    // ArrowUp / ArrowDown - linear navigation
    if (e.key === 'ArrowUp' && !e.altKey) {
      e.preventDefault();
      if (focusedIndex === 0) {
        (document.activeElement as HTMLElement)?.blur();
        nameInputRef.current?.focus();
      } else {
        setFocusedIndex(Math.max(0, focusedIndex - 1));
        setTimeout(() => {
          const prevInput = inputRefs.current[elements[focusedIndex - 1]?.id] as any;
          if (prevInput?.setSelectionRange) {
            const len = prevInput.value?.length || 0;
            prevInput.setSelectionRange(len, len);
          }
        }, 0);
      }
      return;
    }
    if (e.key === 'ArrowDown' && !e.altKey) {
      e.preventDefault();
      setFocusedIndex(Math.min(elements.length - 1, focusedIndex + 1));
      setTimeout(() => {
        const nextInput = inputRefs.current[elements[focusedIndex + 1]?.id] as any;
        if (nextInput?.setSelectionRange) {
          nextInput.setSelectionRange(0, 0);
        }
      }, 0);
      return;
    }

    // Alt+Up / Alt+Down - block jumping (content elements)
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const isUp = e.key === 'ArrowUp';
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
      setTimeout(() => {
        const targetInput = inputRefs.current[elements[nextIndex]?.id] as any;
        if (targetInput?.setSelectionRange) {
          const len = targetInput.value?.length || 0;
          targetInput.setSelectionRange(len, len);
        }
      }, 0);
      return;
    }

    // Alt+Left / Alt+Right - within-dialogue navigation
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const isLeft = e.key === 'ArrowLeft';
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

      if (targetIndex !== focusedIndex) {
        setFocusedIndex(targetIndex);
        setTimeout(() => {
          const targetInput = inputRefs.current[elements[targetIndex]?.id] as any;
          if (targetInput?.setSelectionRange) {
            const len = targetInput.value?.length || 0;
            targetInput.setSelectionRange(len, len);
          }
        }, 0);
      }
      return;
    }

    // Backspace on empty element
    if (e.key === 'Backspace' && currentElement.text.trim() === '' && elements.length > 1) {
      e.preventDefault();
      deleteElement(focusedIndex);
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur();
      return;
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => keyRef.current?.(e);
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

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
              if (Platform.OS === 'web' && parenIndex !== -1) {
                const input = document.activeElement as HTMLInputElement;
                if (input?.selectionStart === parenIndex + 1) {
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
            {/* Page/Panel prefix label */}
            {prefix ? (
              <Text style={{ fontFamily: mono, ...styleForType(el.type, colors), marginRight: 8 }}>
                {prefix}
              </Text>
            ) : null}

            {/* Parenthetical decorative parens */}
            {el.type === 'parenthetical' && (
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, marginRight: 2 }}>(</Text>
            )}

            <TextInput
              ref={r => { if (r) inputRefs.current[el.id] = r; }}
              value={el.text}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              submitBehavior="submit"
              style={{
                flex: 1,
                fontFamily: mono,
                ...styleForType(el.type, colors),
                paddingVertical: 0,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
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
