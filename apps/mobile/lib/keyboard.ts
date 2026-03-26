import { Platform } from 'react-native';
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';

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

export function fromWebEvent(e: KeyboardEvent): KeyInfo {
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
