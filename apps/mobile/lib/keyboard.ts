import { Platform } from 'react-native';
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { emit } from './debug';

/**
 * Cross-platform keyboard event info.
 * On web: created from DOM KeyboardEvent.
 * On native: created from RN TextInput onKeyPress.
 */
export interface KeyInfo {
  key: string;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  ctrl: boolean;
  prevent: () => void;
}

type NativeKeyHandler = (info: KeyInfo) => void;

const nativeKeyHandlers = new Set<NativeKeyHandler>();
const NATIVE_SHORTCUT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Escape',
  'Enter',
  'Tab',
  'Backspace',
  'Delete',
  'F2',
  '`',
]);

export function subscribeNativeKeys(handler: NativeKeyHandler): () => void {
  nativeKeyHandlers.add(handler);
  return () => {
    nativeKeyHandlers.delete(handler);
  };
}

export function emitNativeKey(info: KeyInfo) {
  nativeKeyHandlers.forEach((handler) => handler(info));
}

export function shouldIgnoreNativeTextInputKey(info: KeyInfo): boolean {
  if (info.meta || info.ctrl || info.alt) return true;
  return NATIVE_SHORTCUT_KEYS.has(info.key);
}

export function fromWebEvent(e: KeyboardEvent): KeyInfo {
  if (__DEV__) {
    emit({ type: 'key', timestamp: Date.now(), key: e.key, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey, ctrl: e.ctrlKey, source: 'app' });
  }
  return {
    key: e.key,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    ctrl: e.ctrlKey,
    prevent: () => e.preventDefault(),
  };
}

export function fromNativeEvent(e: NativeSyntheticEvent<TextInputKeyPressEventData>): KeyInfo {
  const n = e.nativeEvent as any;
  if (__DEV__) {
    emit({ type: 'key', timestamp: Date.now(), key: n.key, shift: n.shiftKey ?? false, alt: n.altKey ?? false, meta: n.metaKey ?? false, ctrl: n.ctrlKey ?? false, source: 'app' });
  }
  return {
    key: n.key,
    shift: n.shiftKey ?? false,
    alt: n.altKey ?? false,
    meta: n.metaKey ?? false,
    ctrl: n.ctrlKey ?? false,
    prevent: () => {}, // no preventDefault on native — single-line inputs handle this naturally
  };
}

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';

/**
 * Blur the currently focused element.
 * On web: blurs document.activeElement.
 * On native: caller must blur the specific ref.
 */
export function blurActiveWeb() {
  if (isWeb) {
    (document.activeElement as HTMLElement)?.blur?.();
  }
}
