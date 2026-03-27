import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../context/ThemeContext';
import DebugPanel from '../components/DebugPanel';
import * as KeyCommand from 'react-native-key-command';
import { emit, initConsoleCapture, initNetworkCapture } from '../lib/debug';
import { emitNativeKey, isNative } from '../lib/keyboard';
import '../global.css';

// Initialize debug hooks early (no-op in production)
initConsoleCapture();
initNetworkCapture();

type KeyCommandPayload = {
  input: string;
  modifierFlags?: number;
};

type RegisteredCommand = {
  input: string;
  modifierFlags?: number;
};

function parseNativeKey(payload: KeyCommandPayload): string | null {
  const input = payload.input ?? '';
  const lower = input.toLowerCase();
  const c = KeyCommand.constants as Record<string, string | number | undefined>;

  if (input === c.keyInputUpArrow || lower === 'arrowup') return 'ArrowUp';
  if (input === c.keyInputDownArrow || lower === 'arrowdown') return 'ArrowDown';
  if (input === c.keyInputLeftArrow || lower === 'arrowleft') return 'ArrowLeft';
  if (input === c.keyInputRightArrow || lower === 'arrowright') return 'ArrowRight';
  if (input === c.keyInputEscape || lower === 'escape') return 'Escape';
  if (input === c.keyInputEnter || input === '\r' || lower === 'enter') return 'Enter';
  if (input === '\t' || lower === 'tab') return 'Tab';
  if (input === '\b' || lower === 'backspace') return 'Backspace';
  if (input === '\u007f' || lower === 'delete') return 'Delete';
  if (input === '`') return '`';
  if (lower === 'f2' || input === '\uf704') return 'F2';
  if (input.length === 1) return input;
  return null;
}

function hasModifier(modifierFlags: number, flagName: string): boolean {
  const flagValue = (KeyCommand.constants as Record<string, number | string | undefined>)[flagName];
  return typeof flagValue === 'number' && (modifierFlags & flagValue) === flagValue;
}

function buildCommands(): RegisteredCommand[] {
  const c = KeyCommand.constants as Record<string, string | number | undefined>;
  const command = typeof c.keyModifierCommand === 'number' ? c.keyModifierCommand : undefined;
  const shift = typeof c.keyModifierShift === 'number' ? c.keyModifierShift : undefined;
  const option = typeof c.keyModifierOption === 'number'
    ? c.keyModifierOption
    : typeof c.keyModifierAlternate === 'number'
      ? c.keyModifierAlternate
      : undefined;
  const control = typeof c.keyModifierControl === 'number' ? c.keyModifierControl : undefined;

  const commands: RegisteredCommand[] = [];

  function add(input: string, modifierFlags?: number) {
    commands.push(typeof modifierFlags === 'number' ? { input, modifierFlags } : { input });
  }

  const up = c.keyInputUpArrow as string;
  const down = c.keyInputDownArrow as string;
  const left = c.keyInputLeftArrow as string;
  const right = c.keyInputRightArrow as string;
  const escape = c.keyInputEscape as string;
  const enter = (c.keyInputEnter as string) ?? '\r';

  add(up);
  add(down);
  add(left);
  add(right);
  add(enter);
  add(escape);
  add('\t');
  add('\b');
  add('\u007f');
  add('f2');
  add('\uf704');
  add('`');

  if (typeof shift === 'number') {
    add(up, shift);
    add(down, shift);
    add('\t', shift);
    add(enter, shift);
  }

  if (typeof command === 'number') {
    add(';', command);
    add('\\', command);
    add('/', command);
    add('\b', command);
    add(up, command);
    add(down, command);
    add(left, command);
    add(right, command);
  }

  if (typeof command === 'number' && typeof shift === 'number') {
    const commandShift = command | shift;
    add('a', commandShift);
    add('m', commandShift);
    add('p', commandShift);
    add(up, commandShift);
    add(down, commandShift);
    add(left, commandShift);
    add(right, commandShift);
  }

  if (typeof option === 'number') {
    add(up, option);
    add(down, option);
    add(left, option);
    add(right, option);
  }

  if (typeof control === 'number') {
    add(up, control);
    add(down, control);
    add(left, control);
    add(right, control);
  }

  return commands;
}

export default function RootLayout() {
  useEffect(() => {
    if (!isNative) return;

    const commands = buildCommands();
    KeyCommand.registerKeyCommands(commands);

    const sub = KeyCommand.eventEmitter.addListener('onKeyCommand', (payload: KeyCommandPayload) => {
      const key = parseNativeKey(payload);
      if (!key) return;
      const modifierFlags = payload.modifierFlags ?? 0;
      const info = {
        key,
        shift: hasModifier(modifierFlags, 'keyModifierShift') || hasModifier(modifierFlags, 'keyModifierShiftControl'),
        alt: hasModifier(modifierFlags, 'keyModifierOption') || hasModifier(modifierFlags, 'keyModifierAlternate'),
        meta: hasModifier(modifierFlags, 'keyModifierCommand'),
        ctrl: hasModifier(modifierFlags, 'keyModifierControl'),
        prevent: () => {},
      };

      if (__DEV__) {
        emit({
          type: 'key',
          timestamp: Date.now(),
          key: info.key,
          shift: info.shift,
          alt: info.alt,
          meta: info.meta,
          ctrl: info.ctrl,
          source: 'app',
        });
      }

      emitNativeKey(info);
    });

    return () => {
      sub?.remove?.();
      KeyCommand.unregisterKeyCommands(commands);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <DebugPanel />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
