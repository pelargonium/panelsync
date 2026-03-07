import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Pressable
} from 'react-native';
import { colors } from '../theme';
import CharacterScreen from '../screens/CharacterScreen';

export default function CharactersEntity({ universe }) {
  const [characters, setCharacters] = useState([
  { id: '1', name: 'Kael', role: 'Protagonist', description: 'A wandering archivist.' },
  { id: '2', name: 'Sira', role: 'Antagonist', description: 'The last warden.' },
]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);

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
    setCreating(false);
  }

  if (selectedCharacter) {
    return (
      <CharacterScreen
        character={selectedCharacter}
        onBack={() => setSelectedCharacter(null)}
      />
    );
  }

  return (
    
    

    <View style={s.container}>
          <Text style={{ color: 'red', fontSize: 24 }}>CHARACTERS LOADED</Text>
      <View style={s.header}>
        <Text style={s.title}>Characters</Text>
        <TouchableOpacity style={s.addButton} onPress={() => setCreating(!creating)}>
          <Text style={s.addButtonText}>{creating ? 'Cancel' : '+ New Character'}</Text>
        </TouchableOpacity>
      </View>

      {creating && (
        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Name..."
            placeholderTextColor={colors.faint}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <TextInput
            style={s.input}
            placeholder="Role (e.g. Protagonist, Antagonist, Supporting)..."
            placeholderTextColor={colors.faint}
            value={role}
            onChangeText={setRole}
          />
          <TextInput
            style={[s.input, { height: 80 }]}
            placeholder="Brief description..."
            placeholderTextColor={colors.faint}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TouchableOpacity
            style={[s.createButton, name.trim().length === 0 && s.createButtonOff]}
            onPress={handleCreate}
          >
            <Text style={s.createButtonText}>Create Character</Text>
          </TouchableOpacity>
        </View>
      )}

      {characters.length === 0 && !creating ? (
        <Text style={s.empty}>No characters yet. Add one to start building your world.</Text>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {characters.map(c => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
              onPress={() => setSelectedCharacter(c)}
            >
              <View style={s.cardAccent} />
              <View style={s.cardContent}>
                <Text style={s.cardName}>{c.name}</Text>
                {c.role ? <Text style={s.cardRole}>{c.role}</Text> : null}
                {c.description ? <Text style={s.cardDesc}>{c.description}</Text> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, padding: 32 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:           { color: colors.text, fontSize: 22, fontWeight: '700' },
  addButton:       { backgroundColor: colors.bible, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  addButtonText:   { color: colors.pageWhite, fontSize: 13, fontWeight: '700' },
  empty:           { color: colors.muted, fontSize: 14, lineHeight: 22 },
  form:            { backgroundColor: colors.surface, borderRadius: 8, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  input:           { backgroundColor: colors.pageWhite, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, fontSize: 14, color: colors.text, marginBottom: 12 },
  createButton:    { backgroundColor: colors.bible, padding: 12, borderRadius: 6, alignItems: 'center' },
  createButtonOff: { backgroundColor: colors.border },
  createButtonText:{ color: colors.pageWhite, fontSize: 13, fontWeight: '700' },
  card:            { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' },
  cardAccent:      { width: 4, backgroundColor: colors.bible },
  cardContent:     { flex: 1, padding: 14 },
  cardName:        { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardRole:        { color: colors.bible, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  cardDesc:        { color: colors.muted, fontSize: 13, lineHeight: 20 },
});