import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { colors } from '../theme';
import { modalStyles as m } from '../components/modalStyles';

export default function CharactersEntity({ universe }) {
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
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Characters</Text>
        <TouchableOpacity style={s.addButton} onPress={() => setModalVisible(true)}>
          <Text style={s.addButtonText}>+ New Character</Text>
        </TouchableOpacity>
      </View>

      {characters.length === 0 ? (
        <Text style={s.empty}>No characters yet. Add one to start building your world.</Text>
      ) : (
        <ScrollView>
          {characters.map(c => (
            <View key={c.id} style={s.card}>
              <View style={s.cardAccent} />
              <View style={s.cardContent}>
                <Text style={s.cardName}>{c.name}</Text>
                {c.role ? <Text style={s.cardRole}>{c.role}</Text> : null}
                {c.description ? <Text style={s.cardDesc}>{c.description}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={m.overlay}
        >
          <TouchableOpacity style={m.backdrop} onPress={() => setModalVisible(false)} />
          <View style={m.sheet}>
            <Text style={m.title}>New Character</Text>
            <TextInput
              style={m.input}
              placeholder="Name..."
              placeholderTextColor={colors.faint}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={m.input}
              placeholder="Role (e.g. Protagonist, Antagonist, Supporting)..."
              placeholderTextColor={colors.faint}
              value={role}
              onChangeText={setRole}
            />
            <TextInput
              style={[m.input, { height: 80 }]}
              placeholder="Brief description..."
              placeholderTextColor={colors.faint}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <View style={m.actions}>
              <TouchableOpacity style={m.cancel} onPress={() => setModalVisible(false)}>
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
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, padding: 32 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:         { color: colors.text, fontSize: 22, fontWeight: '700' },
  addButton:     { backgroundColor: colors.bible, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  addButtonText: { color: colors.pageWhite, fontSize: 13, fontWeight: '700' },
  empty:         { color: colors.muted, fontSize: 14, lineHeight: 22 },
  card:          { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' },
  cardAccent:    { width: 4, backgroundColor: colors.bible },
  cardContent:   { flex: 1, padding: 14 },
  cardName:      { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardRole:      { color: colors.bible, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  cardDesc:      { color: colors.muted, fontSize: 13, lineHeight: 20 },
});