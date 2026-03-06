import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { colors } from '../theme';
import { modalStyles as m } from '../components/modalStyles';

const INITIAL_UNIVERSES = [
  { id: '1', name: 'The Voidborn Saga', seriesCount: 3, lastEdited: '2 hours ago' },
  { id: '2', name: 'Neon Requiem', seriesCount: 1, lastEdited: 'Yesterday' },
];

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
        style={m.overlay}
      >
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
          <View style={m.actions}>
            <TouchableOpacity style={m.cancel} onPress={onClose}>
              <Text style={m.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.create, name.trim().length === 0 && m.createOff]}
              onPress={handleCreate}
            >
              <Text style={m.createTxt}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function UniverseCard({ universe, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress}>
      <View style={s.cardCover} />
      <View style={s.cardBody}>
        <Text style={s.cardName}>{universe.name}</Text>
        <Text style={s.cardMeta}>
          {universe.seriesCount} series · edited {universe.lastEdited}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function UniversesDashboard({ navigation }) {
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
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>PANELSYNC</Text>
        <TouchableOpacity style={s.newButton} onPress={() => setModalVisible(true)}>
          <Text style={s.newButtonText}>+ New Universe</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.list}>
        <Text style={s.sectionLabel}>YOUR UNIVERSES</Text>
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

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  logo:          { color: colors.accent, fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  newButton:     { backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  newButtonText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  list:          { padding: 24 },
  sectionLabel:  { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  card:          { backgroundColor: colors.surface, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardCover:     { height: 80, backgroundColor: colors.border },
  cardBody:      { padding: 16 },
  cardName:      { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta:      { color: colors.muted, fontSize: 12 },
});