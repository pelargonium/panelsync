import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme';
import { modalStyles as m } from '../components/modalStyles';
import { api, getToken, clearToken, type ApiUniverse } from '../lib/api';

function NewUniverseModal({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m.overlay}>
        <TouchableOpacity style={m.backdrop} onPress={onClose} />
        <View style={m.sheet}>
          <Text style={m.title}>New Universe</Text>
          <Text style={m.subtitle}>
            A Universe contains all your series, characters, locations, and timelines.
          </Text>
          <TextInput
            style={m.input}
            placeholder="Universe name..."
            placeholderTextColor={colors.faint}
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          {error && <Text style={s.modalError}>{error}</Text>}
          <View style={m.actions}>
            <TouchableOpacity style={m.cancel} onPress={onClose}>
              <Text style={m.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.create, (!name.trim() || loading) && m.createOff]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.surface} />
                : <Text style={m.createTxt}>Create</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function UniverseCard({ universe, onPress }: { universe: ApiUniverse; onPress: () => void }) {
  const edited = new Date(universe.updatedAt);
  const diffMs = Date.now() - edited.getTime();
  const diffH = Math.floor(diffMs / 36e5);
  const diffD = Math.floor(diffMs / 864e5);
  const lastEdited = diffH < 1 ? 'Just now' : diffH < 24 ? `${diffH}h ago` : diffD === 1 ? 'Yesterday' : `${diffD} days ago`;

  return (
    <TouchableOpacity style={s.card} onPress={onPress}>
      <View style={s.cardCover} />
      <View style={s.cardBody}>
        <Text style={s.cardName}>{universe.name}</Text>
        <Text style={s.cardMeta}>edited {lastEdited}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function WorldsDashboard() {
  const router = useRouter();
  const [universes, setUniverses] = useState<ApiUniverse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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
      <View style={s.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>PANELSYNC</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.newButton} onPress={() => setModalVisible(true)}>
            <Text style={s.newButtonText}>+ New Universe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <Text style={s.sectionLabel}>YOUR UNIVERSES</Text>
        {universes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No universes yet.</Text>
            <Text style={s.emptyHint}>Tap "+ New Universe" to create your first one.</Text>
          </View>
        ) : (
          universes.map(u => (
            <UniverseCard
              key={u.id}
              universe={u}
              onPress={() => router.push({ pathname: '/universe/[id]', params: { id: u.id, name: u.name } })}
            />
          ))
        )}
      </ScrollView>

      <NewUniverseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  centered:      { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  logo:          { color: colors.accent, fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newButton:     { backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  newButtonText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  signOutButton: { paddingHorizontal: 10, paddingVertical: 8 },
  signOutText:   { color: colors.muted, fontSize: 13 },
  list:          { padding: 24 },
  sectionLabel:  { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  card:          { backgroundColor: colors.surface, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardCover:     { height: 80, backgroundColor: colors.border },
  cardBody:      { padding: 16 },
  cardName:      { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta:      { color: colors.muted, fontSize: 12 },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: colors.muted, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyHint:     { color: colors.faint, fontSize: 13 },
  modalError:    { color: '#e05050', fontSize: 12, marginBottom: 8 },
});
