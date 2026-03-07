import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native';
import { colors } from '../theme';
import type { Character } from '../types';

interface Props {
  character: Character;
  onBack: () => void;
}

type TabKey = 'profile' | 'backstory' | 'notes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile',   label: 'PROFILE' },
  { key: 'backstory', label: 'BACKSTORY' },
  { key: 'notes',     label: 'NOTES' },
];

export default function CharacterScreen({ character, onBack }: Props) {
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role ?? '');
  const [appearance, setAppearance] = useState(character.appearance ?? '');
  const [backstory, setBackstory] = useState(character.backstory ?? '');
  const [notes, setNotes] = useState(character.notes ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backButton}>← Characters</Text>
        </TouchableOpacity>
        <View style={s.characterInitial}>
          <Text style={s.initialText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ width: 80 }} />
      </View>

      {/* Name and role */}
      <View style={s.nameRow}>
        <TextInput
          style={s.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Character name..."
          placeholderTextColor={colors.faint}
        />
        <TextInput
          style={s.roleInput}
          value={role}
          onChangeText={setRole}
          placeholder="Role..."
          placeholderTextColor={colors.faint}
        />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={s.content}>
        {activeTab === 'profile' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>APPEARANCE</Text>
            <TextInput
              style={s.textArea}
              value={appearance}
              onChangeText={setAppearance}
              placeholder="Describe how this character looks..."
              placeholderTextColor={colors.faint}
              multiline
            />
          </View>
        )}
        {activeTab === 'backstory' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>BACKSTORY</Text>
            <TextInput
              style={[s.textArea, { minHeight: 300 }]}
              value={backstory}
              onChangeText={setBackstory}
              placeholder="Write the character's history and background..."
              placeholderTextColor={colors.faint}
              multiline
            />
          </View>
        )}
        {activeTab === 'notes' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>NOTES</Text>
            <TextInput
              style={[s.textArea, { minHeight: 300 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other notes about this character..."
              placeholderTextColor={colors.faint}
              multiline
            />
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton:       { color: colors.accent, fontSize: 13, fontWeight: '600', width: 80 },
  characterInitial: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bible, alignItems: 'center', justifyContent: 'center' },
  initialText:      { color: colors.pageWhite, fontSize: 24, fontWeight: '700' },
  nameRow:          { backgroundColor: colors.surface, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  nameInput:        { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  roleInput:        { color: colors.bible, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  tabs:             { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:              { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:        { borderBottomWidth: 2, borderBottomColor: colors.bible },
  tabLabel:         { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  tabLabelActive:   { color: colors.bible },
  content:          { flex: 1 },
  section:          { padding: 24 },
  sectionLabel:     { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  textArea:         { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, fontSize: 14, color: colors.text, lineHeight: 22, minHeight: 120 },
});
