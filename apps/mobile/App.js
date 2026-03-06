import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';

const Stack = createNativeStackNavigator();

const INITIAL_UNIVERSES = [
  { id: '1', name: 'The Voidborn Saga', seriesCount: 3, lastEdited: '2 hours ago' },
  { id: '2', name: 'Neon Requiem', seriesCount: 1, lastEdited: 'Yesterday' },
];

const SIDEBAR_SECTIONS = [
  { key: 'series',      label: 'SERIES',      color: '#C41E1E' },
  { key: 'characters',  label: 'CHARACTERS',  color: '#1E6B3C' },
  { key: 'locations',   label: 'LOCATIONS',   color: '#1E6B3C' },
  { key: 'timeline',    label: 'TIMELINE',    color: '#1B4FD8' },
  { key: 'notes',       label: 'NOTES',       color: '#6B6860' },
];

// ── Section placeholder views ──────────────────────────

function SeriesPanel({ universe }) {
  return (
    <View style={panel.container}>
      <Text style={panel.title}>Series</Text>
      <Text style={panel.subtitle}>No series yet in {universe.name}.</Text>
      <TouchableOpacity style={panel.addButton}>
        <Text style={panel.addButtonText}>+ New Series</Text>
      </TouchableOpacity>
    </View>
  );
}

function CharactersPanel({ universe }) {
  const [characters, setCharacters] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');

  function handleCreate() {
    if (name.trim().length === 0) return;
    setCharacters(prev => [{
      id: Date.now().toString(),
      name: name.trim(),
      role: role.trim(),
      description: description.trim(),
    }, ...prev]);
    setName('');
    setRole('');
    setDescription('');
    setModalVisible(false);
  }

  return (
    <View style={panel.container}>
      <View style={panel.panelHeader}>
        <Text style={panel.title}>Characters</Text>
        <TouchableOpacity style={panel.addButton} onPress={() => setModalVisible(true)}>
          <Text style={panel.addButtonText}>+ New Character</Text>
        </TouchableOpacity>
      </View>

      {characters.length === 0 ? (
        <Text style={panel.subtitle}>No characters yet. Add one to start building your world.</Text>
      ) : (
        <ScrollView>
          {characters.map(c => (
            <View key={c.id} style={panel.card}>
              <View style={panel.cardaccent} />
              <View style={panel.cardContent}>
                <Text style={panel.cardName}>{c.name}</Text>
                {c.role ? <Text style={panel.cardRole}>{c.role}</Text> : null}
                {c.description ? <Text style={panel.cardDesc}>{c.description}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Character</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name..."
              placeholderTextColor="#A8A49E"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Role (e.g. Protagonist, Antagonist, Supporting)..."
              placeholderTextColor="#A8A49E"
              value={role}
              onChangeText={setRole}
            />
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Brief description..."
              placeholderTextColor="#A8A49E"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
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
    </View>
  );
}

function LocationsPanel({ universe }) {
  return (
    <View style={panel.container}>
      <Text style={panel.title}>Locations</Text>
      <Text style={panel.subtitle}>No locations yet.</Text>
      <TouchableOpacity style={panel.addButton}>
        <Text style={panel.addButtonText}>+ New Location</Text>
      </TouchableOpacity>
    </View>
  );
}

function TimelinePanel({ universe }) {
  return (
    <View style={panel.container}>
      <Text style={panel.title}>Timeline</Text>
      <Text style={panel.subtitle}>No timelines yet. Create one to start tracking events.</Text>
      <TouchableOpacity style={panel.addButton}>
        <Text style={panel.addButtonText}>+ New Timeline</Text>
      </TouchableOpacity>
    </View>
  );
}

function NotesPanel({ universe }) {
  return (
    <View style={panel.container}>
      <Text style={panel.title}>Notes</Text>
      <Text style={panel.subtitle}>No notes yet.</Text>
      <TouchableOpacity style={panel.addButton}>
        <Text style={panel.addButtonText}>+ New Note</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyPanel() {
  return (
    <View style={panel.container}>
      <Text style={panel.empty}>Select a section from the sidebar</Text>
    </View>
  );
}

function ActivePanel({ section, universe }) {
  switch (section) {
    case 'series':     return <SeriesPanel universe={universe} />;
    case 'characters': return <CharactersPanel universe={universe} />;
    case 'locations':  return <LocationsPanel universe={universe} />;
    case 'timeline':   return <TimelinePanel universe={universe} />;
    case 'notes':      return <NotesPanel universe={universe} />;
    default:           return <EmptyPanel />;
  }
}

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
  const [activeSection, setActiveSection] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Universes</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>{universe.name.toUpperCase()}</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.workspace}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          {SIDEBAR_SECTIONS.map(section => (
            <TouchableOpacity
              key={section.key}
              style={[
                styles.sidebarItem,
                activeSection === section.key && styles.sidebarItemActive,
              ]}
              onPress={() => setActiveSection(section.key)}
            >
              <View style={[styles.sidebarDot, { backgroundColor: section.color }]} />
              <Text style={[
                styles.sidebarLabel,
                activeSection === section.key && styles.sidebarLabelActive,
              ]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main content */}
        <ScrollView style={styles.mainContent}>
          <ActivePanel section={activeSection} universe={universe} />
        </ScrollView>
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
  sidebarItemActive: { backgroundColor: '#E8E4DC' },
  sidebarDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  sidebarLabel: { color: '#6B6860', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sidebarLabelActive: { color: '#1A1A1A' },
  mainContent: { flex: 1 },
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

const panel = StyleSheet.create({
  container: { flex: 1, padding: 32 },
  title: { color: '#1A1A1A', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#6B6860', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  addButton: { alignSelf: 'flex-start', backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  addButtonText: { color: '#F5F2EC', fontSize: 13, fontWeight: '700' },
  empty: { color: '#A8A49E', fontSize: 13, fontStyle: 'italic' },
  topRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
},
card: {
  backgroundColor: '#F5F2EC',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#D4CFC7',
  padding: 16,
  marginBottom: 10,
},
cardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
avatar: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#1E6B3C',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
avatarText: {
  color: '#FAFAF8',
  fontSize: 16,
  fontWeight: '700',
},
cardName: {
  color: '#1A1A1A',
  fontSize: 15,
  fontWeight: '700',
},
cardRole: {
  color: '#6B6860',
  fontSize: 12,
  marginTop: 2,
},
cardDesc: {
  color: '#6B6860',
  fontSize: 13,
  lineHeight: 20,
},
panelHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
},
card: {
  flexDirection: 'row',
  backgroundColor: '#F5F2EC',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#D4CFC7',
  marginBottom: 10,
  overflow: 'hidden',
},
cardAccent: {
  width: 4,
  backgroundColor: '#1E6B3C',
},
cardContent: {
  flex: 1,
  padding: 14,
},
cardName: {
  color: '#1A1A1A',
  fontSize: 15,
  fontWeight: '700',
  marginBottom: 2,
},
cardRole: {
  color: '#1E6B3C',
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 1,
  marginBottom: 4,
},
cardDesc: {
  color: '#6B6860',
  fontSize: 13,
  lineHeight: 20,
},
});