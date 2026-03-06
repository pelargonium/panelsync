import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';

const MOCK_UNIVERSES = [
  { id: '1', name: 'The Voidborn Saga', seriesCount: 3, lastEdited: '2 hours ago' },
  { id: '2', name: 'Neon Requiem', seriesCount: 1, lastEdited: 'Yesterday' },
];

function UniverseCard({ universe }) {
  return (
    <TouchableOpacity style={styles.card}>
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

export default function App() {
  const [universes, setUniverses] = useState(MOCK_UNIVERSES);
  const [modalVisible, setModalVisible] = useState(false);

  function handleCreate(name) {
    const newUniverse = {
      id: Date.now().toString(),
      name,
      seriesCount: 0,
      lastEdited: 'Just now',
    };
    setUniverses(prev => [newUniverse, ...prev]);
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>PANELSYNC</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.newButtonText}>+ New Universe</Text>
        </TouchableOpacity>
      </View>

      {/* Universe list */}
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>YOUR UNIVERSES</Text>
        {universes.map(u => (
          <UniverseCard key={u.id} universe={u} />
        ))}
      </ScrollView>

      {/* Modal */}
      <NewUniverseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreate}
      />

    </View>
  );
}

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
  logo: { color: '#C41E1E', fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  newButton: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  newButtonText: { color: '#F5F2EC', fontSize: 13, fontWeight: '700' },
  list: { padding: 24 },
  sectionLabel: { color: '#6B6860', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  card: { backgroundColor: '#F5F2EC', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#D4CFC7', overflow: 'hidden' },
  cardCover: { height: 80, backgroundColor: '#D4CFC7' },
  cardBody: { padding: 16 },
  cardName: { color: '#1A1A1A', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: '#6B6860', fontSize: 12 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#F5F2EC',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#D4CFC7',
  },
  modalTitle: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#6B6860',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#D4CFC7',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4CFC7',
  },
  cancelButtonText: {
    color: '#6B6860',
    fontSize: 13,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#C41E1E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#D4CFC7',
  },
  createButtonText: {
    color: '#FAFAF8',
    fontSize: 13,
    fontWeight: '700',
  },
});