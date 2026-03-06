import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';

const Stack = createNativeStackNavigator();

// ── Mock Data ──────────────────────────────────────────

const INITIAL_UNIVERSES = [
  { id: '1', name: 'The Voidborn Saga', seriesCount: 3, lastEdited: '2 hours ago' },
  { id: '2', name: 'Neon Requiem', seriesCount: 1, lastEdited: 'Yesterday' },
];

// ── New Universe Modal ─────────────────────────────────

function NewUniverseModal({ visible, onClose, onCreate }) {
  const [name, setName] = useState('');

  function handleCreate() {
    if (name.trim().length === 0) return;
    onCreate(name.trim());
    setName('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>New Universe</Text>
          <Text style={styles.modalSubtitle}>
            A Universe contains all your series, characters, locations, and timelines.
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Universe name..."
            placeholderTextColor="#A8A49E"
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, name.trim().length === 0 && styles.createButtonDisabled]}
              onPress={handleCreate}
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Universe Card ──────────────────────────────────────

function UniverseCard({ universe, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardCover} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{universe.name}</Text>
        <Text style={styles.cardMeta}>
          {universe.seriesCount} series · edited {universe.lastEdited}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Universes Dashboard ────────────────────────────────

function UniversesDashboard({ navigation }) {
  const [universes, setUniverses] = useState(INITIAL_UNIVERSES);
  const [modalVisible, setModalVisible] = useState(false);

  function handleCreate(name) {
    setUniverses(prev => [{
      id: Date.now().toString(),
      name,
      seriesCount: 0,
      lastEdited: 'Just now',
    }, ...prev]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>PANELSYNC</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.newButtonText}>+ New Universe</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>YOUR UNIVERSES</Text>
        {universes.map(u => (
          <UniverseCard
            key={u.id}
            universe={u}
            onPress={() => navigation.navigate('Universe', { universe: u })}
          />
        ))}
      </ScrollView>
      <NewUniverseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

// ── Universe Screen ────────────────────────────────────

function UniverseScreen({ route, navigation }) {
  const { universe } = route.params;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Universes</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>{universe.name.toUpperCase()}</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Sidebar navigation */}
      <View style={styles.workspace}>
        <View style={styles.sidebar}>
          {[
            { label: 'SERIES', color: '#C41E1E' },
            { label: 'CHARACTERS', color: '#1E6B3C' },
            { label: 'LOCATIONS', color: '#1E6B3C' },
            { label: 'TIMELINE', color: '#1B4FD8' },
            { label: 'NOTES', color: '#6B6860' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={styles.sidebarItem}>
              <View style={[styles.sidebarDot, { backgroundColor: item.color }]} />
              <Text style={styles.sidebarLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main content area */}
        <View style={styles.mainContent}>
          <Text style={styles.emptyLabel}>Select a section from the sidebar</Text>
        </View>
      </View>
    </View>
  );
}

// ── App Root ───────────────────────────────────────────

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Universes" component={UniversesDashboard} />
        <Stack.Screen name="Universe" component={UniverseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8E4DC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#D4CFC7',
    backgroundColor: '#F5F2EC',
  },
  logo: { color: '#C41E1E', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  backButton: { color: '#C41E1E', fontSize: 13, fontWeight: '600', width: 80 },
  newButton: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  newButtonText: { color: '#F5F2EC', fontSize: 13, fontWeight: '700' },
  list: { padding: 24 },
  sectionLabel: { color: '#6B6860', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  card: { backgroundColor: '#F5F2EC', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#D4CFC7', overflow: 'hidden' },
  cardCover: { height: 80, backgroundColor: '#D4CFC7' },
  cardBody: { padding: 16 },
  cardName: { color: '#1A1A1A', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: '#6B6860', fontSize: 12 },

  // Workspace
  workspace: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 180,
    backgroundColor: '#F5F2EC',
    borderRightWidth: 1,
    borderRightColor: '#D4CFC7',
    paddingTop: 24,
    paddingHorizontal: 12,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  sidebarDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  sidebarLabel: { color: '#1A1A1A', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyLabel: { color: '#A8A49E', fontSize: 13, fontStyle: 'italic' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#F5F2EC', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480, borderWidth: 1, borderColor: '#D4CFC7' },
  modalTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { color: '#6B6860', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  modalInput: { backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#D4CFC7', borderRadius: 6, padding: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: '#D4CFC7' },
  cancelButtonText: { color: '#6B6860', fontSize: 13, fontWeight: '600' },
  createButton: { backgroundColor: '#C41E1E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  createButtonDisabled: { backgroundColor: '#D4CFC7' },
  createButtonText: { color: '#FAFAF8', fontSize: 13, fontWeight: '700' },
});