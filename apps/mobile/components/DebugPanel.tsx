import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { subscribe, emit, type DebugEvent, type DebugKeyEvent, type DebugConsoleEvent, type DebugNetworkEvent } from '../lib/debug';
import { isWeb } from '../lib/keyboard';

const MAX_EVENTS = 80;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function KeyRow({ event, mono, colors }: { event: DebugKeyEvent; mono: string; colors: any }) {
  const mods: string[] = [];
  if (event.meta) mods.push('Cmd');
  if (event.ctrl) mods.push('Ctrl');
  if (event.alt) mods.push('Alt');
  if (event.shift) mods.push('Shift');
  const combo = [...mods, event.key].join('+');
  const tag = event.source === 'test' ? '[test]' : '[app]';

  return (
    <Text style={{ fontFamily: mono, fontSize: 10, color: colors.text, marginBottom: 2 }}>
      <Text style={{ color: colors.muted }}>{formatTime(event.timestamp)} </Text>
      <Text style={{ color: event.source === 'test' ? colors.text : colors.muted }}>{tag} </Text>
      <Text style={{ fontWeight: '700' }}>{combo}</Text>
    </Text>
  );
}

function ConsoleRow({ event, mono, colors }: { event: DebugConsoleEvent; mono: string; colors: any }) {
  const levelColor = event.level === 'error' ? colors.error : event.level === 'warn' ? '#cc8800' : colors.muted;
  return (
    <Text style={{ fontFamily: mono, fontSize: 10, color: colors.text, marginBottom: 2 }} numberOfLines={3}>
      <Text style={{ color: colors.muted }}>{formatTime(event.timestamp)} </Text>
      <Text style={{ color: levelColor }}>[{event.level}] </Text>
      {event.message}
    </Text>
  );
}

function NetworkRow({ event, mono, colors }: { event: DebugNetworkEvent; mono: string; colors: any }) {
  const statusColor = event.error ? colors.error : (event.status && event.status >= 400) ? colors.error : colors.text;
  // Shorten URL: strip origin if it's the API
  const shortUrl = event.url.replace(/https?:\/\/[^/]+/, '');
  return (
    <Text style={{ fontFamily: mono, fontSize: 10, color: colors.text, marginBottom: 2 }} numberOfLines={2}>
      <Text style={{ color: colors.muted }}>{formatTime(event.timestamp)} </Text>
      <Text style={{ fontWeight: '700' }}>{event.method} </Text>
      <Text>{shortUrl} </Text>
      <Text style={{ color: statusColor }}>
        {event.error ? `ERR: ${event.error}` : event.status ?? '...'}
      </Text>
      {event.duration != null && <Text style={{ color: colors.muted }}> {event.duration}ms</Text>}
    </Text>
  );
}

export default function DebugPanel() {
  const { colors, mono } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'keys' | 'console' | 'network'>('keys');
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const testInputRef = useRef<TextInput>(null);

  useEffect(() => {
    return subscribe((event) => {
      setEvents(prev => [...prev.slice(-(MAX_EVENTS - 1)), event]);
    });
  }, []);

  // Auto-scroll on new events
  useEffect(() => {
    if (open) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [events, open, tab]);

  const filtered = events.filter(e => {
    if (tab === 'keys') return e.type === 'key';
    if (tab === 'console') return e.type === 'console';
    if (tab === 'network') return e.type === 'network';
    return false;
  });

  function handleTestKeyPress(e: any) {
    // Native: raw onKeyPress from the test input
    if (!isWeb) {
      const n = e.nativeEvent as any;
      emit({
        type: 'key',
        timestamp: Date.now(),
        key: n.key ?? '???',
        shift: n.shiftKey ?? false,
        alt: n.altKey ?? false,
        meta: n.metaKey ?? false,
        ctrl: n.ctrlKey ?? false,
        source: 'test',
      });
    }
  }

  // Web: test input also captures via native DOM
  function handleTestKeyDown(e: any) {
    if (isWeb) {
      emit({
        type: 'key',
        timestamp: Date.now(),
        key: e.nativeEvent?.key ?? e.key ?? '???',
        shift: e.nativeEvent?.shiftKey ?? false,
        alt: e.nativeEvent?.altKey ?? false,
        meta: e.nativeEvent?.metaKey ?? false,
        ctrl: e.nativeEvent?.ctrlKey ?? false,
        source: 'test',
      });
    }
  }

  if (!__DEV__) return null;

  // Collapsed: small toggle button
  if (!open) {
    return (
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          backgroundColor: colors.border,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          zIndex: 9999,
          opacity: 0.7,
        }}
      >
        <Text style={{ fontFamily: mono, fontSize: 10, color: colors.text }}>DBG</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        zIndex: 9999,
      }}
    >
      {/* Tab bar */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, height: 32, alignItems: 'center', paddingHorizontal: 8 }}>
        {(['keys', 'console', 'network'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ marginRight: 12 }}>
            <Text style={{
              fontFamily: mono,
              fontSize: 11,
              color: tab === t ? colors.text : colors.muted,
              fontWeight: tab === t ? '700' : '400',
            }}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setEvents([])} style={{ marginRight: 12 }}>
          <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted }}>clear</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>x</Text>
        </TouchableOpacity>
      </View>

      {/* Key test input — shown on KEYS tab */}
      {tab === 'keys' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 32, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, marginRight: 8 }}>test:</Text>
          <TextInput
            ref={testInputRef}
            style={{
              flex: 1,
              fontFamily: mono,
              fontSize: 11,
              color: colors.text,
              paddingVertical: 2,
              borderBottomWidth: 1,
              borderBottomColor: colors.muted,
              ...(isWeb ? { outlineStyle: 'none' as any } : {}),
            }}
            placeholder="tap here, press keys"
            placeholderTextColor={colors.muted}
            onKeyPress={handleTestKeyPress}
            // Web: also capture via onKeyDown for full key info
            {...(isWeb ? { onKeyDown: handleTestKeyDown } : {})}
            value=""
            multiline={false}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {/* Event log */}
      <ScrollView ref={scrollRef} style={{ flex: 1, padding: 8 }}>
        {filtered.length === 0 && (
          <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted }}>
            {tab === 'keys' ? 'Press keys to see events...' : tab === 'console' ? 'No console output yet...' : 'No network requests yet...'}
          </Text>
        )}
        {filtered.map((event, i) => {
          if (event.type === 'key') return <KeyRow key={i} event={event} mono={mono} colors={colors} />;
          if (event.type === 'console') return <ConsoleRow key={i} event={event} mono={mono} colors={colors} />;
          if (event.type === 'network') return <NetworkRow key={i} event={event} mono={mono} colors={colors} />;
          return null;
        })}
      </ScrollView>
    </View>
  );
}
