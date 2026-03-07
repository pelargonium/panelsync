import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme';
import SeriesEntity from '../../entities/SeriesEntity';
import CharactersEntity from '../../entities/CharactersEntity';
import LocationsEntity from '../../entities/LocationsEntity';
import TimelineEntity from '../../entities/TimelineEntity';
import NotesEntity from '../../entities/NotesEntity';
import type { Universe } from '../../types';

type SectionKey = 'series' | 'characters' | 'locations' | 'timeline' | 'notes';

const SIDEBAR_SECTIONS: { key: SectionKey; label: string; color: string }[] = [
  { key: 'series',     label: 'SERIES',     color: colors.accent },
  { key: 'characters', label: 'CHARACTERS', color: colors.bible },
  { key: 'locations',  label: 'LOCATIONS',  color: colors.bible },
  { key: 'timeline',   label: 'TIMELINE',   color: colors.timeline },
  { key: 'notes',      label: 'NOTES',      color: colors.muted },
];

function ActiveEntity({ section, universe }: { section: SectionKey | null; universe: Universe }) {
  switch (section) {
    case 'series':     return <SeriesEntity universe={universe} />;
    case 'characters': return <CharactersEntity universe={universe} />;
    case 'locations':  return <LocationsEntity universe={universe} />;
    case 'timeline':   return <TimelineEntity universe={universe} />;
    case 'notes':      return <NotesEntity universe={universe} />;
    default:           return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Select a section from the sidebar</Text>
      </View>
    );
  }
}

export default function WorldScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);

  const universe: Universe = {
    id: id as string,
    name: decodeURIComponent(name as string),
    seriesCount: 0,
    lastEdited: '',
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backButton}>← Universes</Text>
        </TouchableOpacity>
        <Text style={s.logo}>{universe.name.toUpperCase()}</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={s.workspace}>
        <View style={s.sidebar}>
          {SIDEBAR_SECTIONS.map(section => (
            <TouchableOpacity
              key={section.key}
              style={[s.sidebarItem, activeSection === section.key && s.sidebarItemActive]}
              onPress={() => setActiveSection(section.key)}
            >
              <View style={[s.sidebarDot, { backgroundColor: section.color }]} />
              <Text style={[s.sidebarLabel, activeSection === section.key && s.sidebarLabelActive]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.mainContent}>
          <ActiveEntity section={activeSection} universe={universe} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  logo:               { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  backButton:         { color: colors.accent, fontSize: 13, fontWeight: '600', width: 80 },
  workspace:          { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  sidebar:            { width: 180, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 24, paddingHorizontal: 12 },
  sidebarItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  sidebarItemActive:  { backgroundColor: colors.bg },
  sidebarDot:         { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  sidebarLabel:       { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sidebarLabelActive: { color: colors.text },
  mainContent:        { flex: 1 },
  empty:              { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText:          { color: colors.faint, fontSize: 13, fontStyle: 'italic' },
});
