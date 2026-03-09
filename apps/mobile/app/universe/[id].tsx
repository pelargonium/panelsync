import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme';
import { modalStyles as m } from '../../components/modalStyles';
import { api, type ApiSeries, type ApiIssue } from '../../lib/api';
import CharactersEntity from '../../entities/CharactersEntity';
import LocationsEntity from '../../entities/LocationsEntity';
import TimelineEntity from '../../entities/TimelineEntity';
import NotesEntity from '../../entities/NotesEntity';
import type { Universe } from '../../types';

type SectionKey = 'characters' | 'locations' | 'timeline' | 'notes';

const BOTTOM_SECTIONS: { key: SectionKey; label: string; color: string }[] = [
  { key: 'characters', label: 'CHARACTERS', color: colors.bible },
  { key: 'locations',  label: 'LOCATIONS',  color: colors.bible },
  { key: 'timeline',   label: 'TIMELINE',   color: colors.timeline },
  { key: 'notes',      label: 'NOTES',      color: colors.muted },
];

function NewSeriesModal({ visible, universeId, onClose, onCreate }: {
  visible: boolean;
  universeId: string;
  onClose: () => void;
  onCreate: (s: ApiSeries) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.series.create({ universeId, name: name.trim() });
      onCreate(res.data);
      setName('');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create series.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m.overlay}>
        <TouchableOpacity style={m.backdrop} onPress={onClose} />
        <View style={m.sheet}>
          <Text style={m.title}>New Series</Text>
          <TextInput
            style={m.input}
            placeholder="Series name..."
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

function SeriesRow({ series, universeId }: { series: ApiSeries; universeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  async function toggle() {
    if (!expanded && issues.length === 0) {
      setLoadingIssues(true);
      try {
        const res = await api.issues.list(series.id);
        setIssues(res.data);
      } catch {}
      setLoadingIssues(false);
    }
    setExpanded(e => !e);
  }

  return (
    <View>
      <TouchableOpacity style={s.seriesRow} onPress={toggle}>
        <Text style={s.chevron}>{expanded ? '▾' : '▸'}</Text>
        <Text style={s.seriesName} numberOfLines={1}>{series.number}. {series.name}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={s.issueList}>
          {loadingIssues
            ? <ActivityIndicator size="small" color={colors.muted} style={{ paddingVertical: 8 }} />
            : issues.length === 0
              ? <Text style={s.emptyIssues}>No issues yet</Text>
              : issues.map(issue => (
                  <View key={issue.id} style={s.issueRow}>
                    <Text style={s.issueLabel} numberOfLines={1}>#{issue.number} {issue.name}</Text>
                  </View>
                ))
          }
        </View>
      )}
    </View>
  );
}

function MainContent({ section, universe }: { section: SectionKey | null; universe: Universe }) {
  switch (section) {
    case 'characters': return <CharactersEntity universe={universe} />;
    case 'locations':  return <LocationsEntity universe={universe} />;
    case 'timeline':   return <TimelineEntity universe={universe} />;
    case 'notes':      return <NotesEntity universe={universe} />;
    default: return (
      <View style={s.emptyMain}>
        <Text style={s.emptyMainText}>Select a series or section from the sidebar</Text>
      </View>
    );
  }
}

export default function UniverseScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const universeId = id as string;
  const universeName = decodeURIComponent(name as string);

  const [seriesList, setSeriesList] = useState<ApiSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [newSeriesVisible, setNewSeriesVisible] = useState(false);

  const universe: Universe = { id: universeId, name: universeName, seriesCount: 0, lastEdited: '' };

  const loadSeries = useCallback(async () => {
    try {
      const res = await api.series.list(universeId);
      setSeriesList(res.data);
    } catch {}
  }, [universeId]);

  useEffect(() => {
    setLoadingSeries(true);
    loadSeries().finally(() => setLoadingSeries(false));
  }, [loadSeries]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backButton}>← Universes</Text>
        </TouchableOpacity>
        <Text style={s.logo}>{universeName.toUpperCase()}</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={s.workspace}>
        <View style={s.sidebar}>
          <View style={s.sidebarSection}>
            <View style={s.sidebarSectionHeader}>
              <Text style={s.sidebarSectionLabel}>SERIES</Text>
              <TouchableOpacity onPress={() => setNewSeriesVisible(true)}>
                <Text style={s.addBtn}>＋</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.seriesScroll} showsVerticalScrollIndicator={false}>
              {loadingSeries
                ? <ActivityIndicator size="small" color={colors.muted} style={{ paddingTop: 12 }} />
                : seriesList.length === 0
                  ? <TouchableOpacity onPress={() => setNewSeriesVisible(true)}>
                      <Text style={s.emptySeries}>+ Add a series</Text>
                    </TouchableOpacity>
                  : seriesList.map(series => (
                      <SeriesRow key={series.id} series={series} universeId={universeId} />
                    ))
              }
            </ScrollView>
          </View>

          <View style={s.bottomSections}>
            {BOTTOM_SECTIONS.map(sec => (
              <TouchableOpacity
                key={sec.key}
                style={[s.sidebarItem, activeSection === sec.key && s.sidebarItemActive]}
                onPress={() => setActiveSection(activeSection === sec.key ? null : sec.key)}
              >
                <View style={[s.sidebarDot, { backgroundColor: sec.color }]} />
                <Text style={[s.sidebarLabel, activeSection === sec.key && s.sidebarLabelActive]}>
                  {sec.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.mainContent}>
          <MainContent section={activeSection} universe={universe} />
        </View>
      </View>

      <NewSeriesModal
        visible={newSeriesVisible}
        universeId={universeId}
        onClose={() => setNewSeriesVisible(false)}
        onCreate={series => setSeriesList(prev => [...prev, series])}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.bg },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  logo:                 { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  backButton:           { color: colors.accent, fontSize: 13, fontWeight: '600', width: 80 },
  workspace:            { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  sidebar:              { width: 200, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, flexDirection: 'column' },
  sidebarSection:       { flex: 1, paddingTop: 16, paddingHorizontal: 12, minHeight: 0 },
  sidebarSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sidebarSectionLabel:  { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  addBtn:               { color: colors.accent, fontSize: 16, lineHeight: 18 },
  seriesScroll:         { flex: 1 },
  seriesRow:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4 },
  chevron:              { color: colors.muted, fontSize: 10, width: 14 },
  seriesName:           { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  issueList:            { paddingLeft: 18 },
  issueRow:             { paddingVertical: 5, paddingHorizontal: 4 },
  issueLabel:           { color: colors.muted, fontSize: 12 },
  emptyIssues:          { color: colors.faint, fontSize: 11, fontStyle: 'italic', paddingVertical: 6 },
  emptySeries:          { color: colors.faint, fontSize: 12, fontStyle: 'italic', paddingTop: 4 },
  bottomSections:       { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8, paddingHorizontal: 12 },
  sidebarItem:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  sidebarItemActive:    { backgroundColor: colors.bg },
  sidebarDot:           { width: 7, height: 7, borderRadius: 4, marginRight: 9 },
  sidebarLabel:         { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  sidebarLabelActive:   { color: colors.text },
  mainContent:          { flex: 1 },
  emptyMain:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyMainText:        { color: colors.faint, fontSize: 13, fontStyle: 'italic' },
  modalError:           { color: '#e05050', fontSize: 12, marginBottom: 8 },
});
