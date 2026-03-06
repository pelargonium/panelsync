import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import SeriesPanel from '../panels/SeriesPanel';
import CharactersPanel from '../panels/CharactersPanel';
import LocationsPanel from '../panels/LocationsPanel';
import TimelinePanel from '../panels/TimelinePanel';
import NotesPanel from '../panels/NotesPanel';

const SIDEBAR_SECTIONS = [
  { key: 'series',     label: 'SERIES',     color: colors.accent },
  { key: 'characters', label: 'CHARACTERS', color: colors.bible },
  { key: 'locations',  label: 'LOCATIONS',  color: colors.bible },
  { key: 'timeline',   label: 'TIMELINE',   color: colors.timeline },
  { key: 'notes',      label: 'NOTES',      color: colors.muted },
];

function ActivePanel({ section, universe }) {
  switch (section) {
    case 'series':     return <SeriesPanel universe={universe} />;
    case 'characters': return <CharactersPanel universe={universe} />;
    case 'locations':  return <LocationsPanel universe={universe} />;
    case 'timeline':   return <TimelinePanel universe={universe} />;
    case 'notes':      return <NotesPanel universe={universe} />;
    default:           return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Select a section from the sidebar</Text>
      </View>
    );
  }
}

export default function UniverseScreen({ route, navigation }) {
  const { universe } = route.params;
  const [activeSection, setActiveSection] = useState(null);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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

        <ScrollView style={s.mainContent}>
          <ActivePanel section={activeSection} universe={universe} />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  logo:             { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  backButton:       { color: colors.accent, fontSize: 13, fontWeight: '600', width: 80 },
  workspace:        { flex: 1, flexDirection: 'row' },
  sidebar:          { width: 180, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 24, paddingHorizontal: 12 },
  sidebarItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  sidebarItemActive:{ backgroundColor: colors.bg },
  sidebarDot:       { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  sidebarLabel:     { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sidebarLabelActive:{ color: colors.text },
  mainContent:      { flex: 1 },
  empty:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText:        { color: colors.faint, fontSize: 13, fontStyle: 'italic' },
});