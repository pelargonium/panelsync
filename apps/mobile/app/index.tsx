import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { api, getToken, clearToken, type ApiUniverse } from '../lib/api';
import { fromNativeEvent, fromWebEvent, isWeb, type KeyInfo } from '../lib/keyboard';

function NewUniverseModal({ visible, onClose, onCreate, onKeyPress }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onKeyPress: (e: any) => void;
}) {
  const { colors, mono } = useTheme();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await onCreate(name.trim());
      setName('');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create universe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, padding: 24, width: '90%', maxWidth: 480 }}>
          <Text style={{ fontFamily: mono, fontSize: 14, color: colors.text, marginBottom: 16 }}>New Universe</Text>
          <TextInput
            style={{ fontFamily: mono, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, padding: 8, marginBottom: 8, backgroundColor: 'transparent' }}
            placeholder="name..."
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            onKeyPress={onKeyPress}
            submitBehavior="submit"
            autoFocus
            onSubmitEditing={handleCreate}
          />
          {error && <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error, marginBottom: 8 }}>{error}</Text>}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!name.trim() || loading}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: !name.trim() || loading ? colors.border : colors.text }}
            >
              {loading
                ? <ActivityIndicator color={colors.text} size="small" />
                : <Text style={{ fontFamily: mono, fontSize: 13, color: !name.trim() ? colors.muted : colors.text }}>create</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DeleteUniverseModal({ universe, onClose, onDeleted }: {
  universe: ApiUniverse;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const { colors, mono } = useTheme();
  const [step, setStep] = useState<'confirm' | 'final'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await api.universes.delete(universe.id);
      onDeleted(universe.id);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete universe.');
      setLoading(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, padding: 24, width: '90%', maxWidth: 480 }}>
          {step === 'confirm' ? (
            <>
              <Text style={{ fontFamily: mono, fontSize: 14, color: colors.text, marginBottom: 8 }}>Delete "{universe.name}"?</Text>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, marginBottom: 16 }}>
                This will permanently delete the universe and all its content.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep('final')}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.error }}
                >
                  <Text style={{ fontFamily: mono, fontSize: 13, color: colors.error }}>delete</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: mono, fontSize: 14, color: colors.error, marginBottom: 8 }}>Are you sure?</Text>
              <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, marginBottom: 16 }}>
                This can't be undone. "{universe.name}" and everything in it will be gone.
              </Text>
              {error && <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error, marginBottom: 8 }}>{error}</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted }}>cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={loading}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.error }}
                >
                  {loading
                    ? <ActivityIndicator color={colors.error} size="small" />
                    : <Text style={{ fontFamily: mono, fontSize: 13, color: colors.error }}>delete forever</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function WorldsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, mono, toggle, mode } = useTheme();
  const [universes, setUniverses] = useState<ApiUniverse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingDeleteUniverse, setPendingDeleteUniverse] = useState<ApiUniverse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hiddenInputRef = useRef<TextInput>(null);

  useEffect(() => {
    getToken().then(token => {
      if (!token) {
        router.replace('/auth');
      } else {
        setAuthChecked(true);
      }
    });
  }, []);

  const loadUniverses = useCallback(async () => {
    try {
      const res = await api.universes.list();
      setUniverses(res.data);
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.includes('403')) {
        await clearToken();
        router.replace('/auth');
      }
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    loadUniverses().finally(() => setLoading(false));
  }, [authChecked]);

  // Keyboard navigation for universe list
  const keyRef = useRef<(info: KeyInfo) => void>(undefined);
  keyRef.current = (info: KeyInfo) => {
    if (modalVisible || pendingDeleteUniverse) return;
    if (universes.length === 0) return;

    // Only handle keys when the dashboard is the active route
    if (pathname !== '/') return;

    // Don't handle keys when an input/textarea is focused
    if (isWeb) {
      const active = document.activeElement as HTMLElement;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
    }

    if (info.key === 'ArrowDown') {
      info.prevent();
      setSelectedIndex(i => Math.min(universes.length - 1, i + 1));
    } else if (info.key === 'ArrowUp') {
      info.prevent();
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (info.key === 'Enter' && !info.meta && !info.ctrl) {
      info.prevent();
      const u = universes[selectedIndex];
      if (u) router.push({ pathname: '/universe/[id]', params: { id: u.id, name: u.name } });
    } else if (info.key === 'Backspace' && info.meta) {
      info.prevent();
      const u = universes[selectedIndex];
      if (u) setPendingDeleteUniverse(u);
    }
  };

  useEffect(() => {
    if (!isWeb) return;
    function onKeyDown(e: KeyboardEvent) { keyRef.current?.(fromWebEvent(e)); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isWeb) return;
    if (!authChecked || modalVisible || pendingDeleteUniverse) return;
    setTimeout(() => hiddenInputRef.current?.focus(), 0);
  }, [authChecked, modalVisible, pendingDeleteUniverse, universes.length]);

  // Keep selectedIndex in bounds when list changes
  useEffect(() => {
    if (selectedIndex >= universes.length && universes.length > 0) {
      setSelectedIndex(universes.length - 1);
    }
  }, [universes.length, selectedIndex]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadUniverses();
    setRefreshing(false);
  }

  async function handleCreate(name: string) {
    const res = await api.universes.create({ name });
    setUniverses(prev => [res.data, ...prev]);
  }

  async function handleSignOut() {
    await clearToken();
    router.replace('/auth');
  }

  if (!authChecked || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TextInput
        ref={hiddenInputRef}
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
        onKeyPress={(e: any) => keyRef.current?.(fromNativeEvent(e))}
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text, letterSpacing: 2 }}>PANELSYNC</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={toggle}>
            <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>{mode === 'dark' ? 'light' : 'dark'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text }}>+ new</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.muted} />}
      >
        {universes.length === 0 ? (
          <Text style={{ fontFamily: mono, fontSize: 13, color: colors.muted, marginTop: 24 }}>
            No universes yet. Tap "+ new" to create one.
          </Text>
        ) : (
          universes.map((u, idx) => {
            const edited = new Date(u.updatedAt);
            const diffMs = Date.now() - edited.getTime();
            const diffH = Math.floor(diffMs / 36e5);
            const diffD = Math.floor(diffMs / 864e5);
            const lastEdited = diffH < 1 ? 'just now' : diffH < 24 ? `${diffH}h ago` : diffD === 1 ? 'yesterday' : `${diffD}d ago`;
            const isSelected = idx === selectedIndex;

            return (
              <TouchableOpacity
                key={u.id}
                onPress={() => { setSelectedIndex(idx); router.push({ pathname: '/universe/[id]', params: { id: u.id, name: u.name } }); }}
                onLongPress={() => setPendingDeleteUniverse(u)}
                delayLongPress={500}
                style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: isSelected ? colors.selection : 'transparent' }}
              >
                <Text style={{ fontFamily: mono, fontSize: 14, color: colors.text }}>{u.name}</Text>
                <Text style={{ fontFamily: mono, fontSize: 11, color: colors.muted, marginTop: 2 }}>{lastEdited}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <NewUniverseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
        onKeyPress={(e: any) => keyRef.current?.(fromNativeEvent(e))}
      />
      {pendingDeleteUniverse && (
        <DeleteUniverseModal
          universe={pendingDeleteUniverse}
          onClose={() => setPendingDeleteUniverse(null)}
          onDeleted={(id) => setUniverses(prev => prev.filter(u => u.id !== id))}
        />
      )}
    </View>
  );
}
