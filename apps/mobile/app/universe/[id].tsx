import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../theme';
import { modalStyles as m } from '../../components/modalStyles';
import { api, type ApiSeries, type ApiIssue } from '../../lib/api';
import CharactersEntity from '../../entities/CharactersEntity';
import LocationsEntity from '../../entities/LocationsEntity';
import TimelineEntity from '../../entities/TimelineEntity';
import NotesEntity from '../../entities/NotesEntity';
import type { Universe } from '../../types';

type SectionKey = 'characters' | 'locations' | 'timeline' | 'notes';

const BINDER_W = 264;

// ─── New Series Modal ─────────────────────────────────────────────────────────

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

// ─── Series Row ───────────────────────────────────────────────────────────────

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
      <View style={s.row}>
        <TouchableOpacity onPress={toggle} style={s.chevronHitArea}>
          <Text style={s.rowChevron}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggle} style={s.rowLabel}>
          <Text style={s.seriesName} numberOfLines={1}>
            Series {series.number} — {series.name}
          </Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View>
          {loadingIssues
            ? <ActivityIndicator size="small" color={colors.muted} style={{ paddingVertical: 8, paddingLeft: 38 }} />
            : issues.length === 0
              ? <Text style={s.emptyRow}>No issues yet</Text>
              : issues.map(issue => (
                  <View key={issue.id} style={s.row}>
                    <TouchableOpacity style={[s.chevronHitArea, s.indentIssue]}>
                      <Text style={s.rowChevron}>▸</Text>
                    </TouchableOpacity>
                    <View style={s.rowLabel}>
                      <Text style={s.issueName} numberOfLines={1}>
                        Issue {issue.number} — {issue.name}
                      </Text>
                    </View>
                  </View>
                ))
          }
        </View>
      )}
    </View>
  );
}

// ─── Content Area ─────────────────────────────────────────────────────────────

function MainContent({ section, universe }: { section: SectionKey | null; universe: Universe }) {
  switch (section) {
    case 'characters': return <CharactersEntity universe={universe} />;
    case 'locations':  return <LocationsEntity universe={universe} />;
    case 'timeline':   return <TimelineEntity universe={universe} />;
    case 'notes':      return <NotesEntity universe={universe} />;
    default: return (
      <View style={s.contentEmpty}>
        <Text style={s.contentEmptyTitle}>{universe.name}</Text>
        <Text style={s.contentEmptyHint}>Select a page from the binder to open the script editor, or choose a section to browse your universe.</Text>
      </View>
    );
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UniverseScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const universeId = id as string;
  const universeName = decodeURIComponent(name as string);

  const [seriesList, setSeriesList]       = useState<ApiSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [newSeriesVisible, setNewSeriesVisible] = useState(false);
  const [binderOpen, setBinderOpen]       = useState(true);

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

  function toggleSection(key: SectionKey) {
    setActiveSection(prev => prev === key ? null : key);
  }

  return (
    <SafeAreaView style={s.root}>

      {/* ── Chrome ── */}
      <View style={s.chrome}>
        <TouchableOpacity onPress={() => router.back()} style={s.chromeBack}>
          <Text style={s.chromeBackText}>← Universes</Text>
        </TouchableOpacity>
        <Text style={s.saveStatus}>● Saved</Text>
        <View style={s.chromeRight} />
      </View>

      {/* ── Workspace ── */}
      <View style={s.workspace}>

        {/* ── Binder ── */}
        {binderOpen ? (
          <View style={s.binder}>

            {/* Header */}
            <View style={s.binderHeader}>
              <Text style={s.binderUniverseName} numberOfLines={1}>{universeName}</Text>
              <TouchableOpacity onPress={() => setBinderOpen(false)} style={s.collapseBtn}>
                <Text style={s.chevronLarge}>‹</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={s.searchWrap}>
              <View style={s.searchBar}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  placeholder="Search universe…"
                  placeholderTextColor={colors.faint}
                  style={s.searchInput}
                />
              </View>
            </View>

            {/* Sections */}
            <ScrollView style={s.sections} showsVerticalScrollIndicator={false}>

              {/* Series / Issue / Page */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>SERIES / ISSUE / PAGE</Text>
                <TouchableOpacity onPress={() => setNewSeriesVisible(true)}>
                  <Text style={s.sectionAdd}>＋</Text>
                </TouchableOpacity>
              </View>
              {loadingSeries
                ? <ActivityIndicator size="small" color={colors.muted} style={{ paddingVertical: 12 }} />
                : seriesList.length === 0
                  ? <TouchableOpacity onPress={() => setNewSeriesVisible(true)}>
                      <Text style={s.emptyRow}>+ Add a series</Text>
                    </TouchableOpacity>
                  : seriesList.map(series => (
                      <SeriesRow key={series.id} series={series} universeId={universeId} />
                    ))
              }

              {/* Characters */}
              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('characters')}
              >
                <Text style={[s.sectionLabel, activeSection === 'characters' && { color: colors.accent }]}>
                  CHARACTERS
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.accent }]} />
              </TouchableOpacity>

              {/* Locations */}
              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('locations')}
              >
                <Text style={[s.sectionLabel, activeSection === 'locations' && { color: colors.bible }]}>
                  LOCATIONS
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.bible }]} />
              </TouchableOpacity>

              {/* Timeline */}
              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('timeline')}
              >
                <Text style={[s.sectionLabel, activeSection === 'timeline' && { color: colors.timeline }]}>
                  TIMELINE
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.timeline }]} />
              </TouchableOpacity>

              {/* Notes */}
              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('notes')}
              >
                <Text style={[s.sectionLabel, activeSection === 'notes' && { color: colors.muted }]}>
                  NOTES
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.faint }]} />
              </TouchableOpacity>

              <View style={{ height: spacing.lg }} />
            </ScrollView>

            {/* Footer */}
            <View style={s.binderFooter}>
              <TouchableOpacity style={s.footerTag} onPress={() => toggleSection('characters')}>
                <View style={[s.footerPill, { backgroundColor: colors.accent }, activeSection === 'characters' && s.footerPillActive]}>
                  <Text style={s.footerPillText}>Chr</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerTag} onPress={() => toggleSection('locations')}>
                <View style={[s.footerPill, { backgroundColor: colors.bible }, activeSection === 'locations' && s.footerPillActive]}>
                  <Text style={s.footerPillText}>Loc</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerTag} onPress={() => toggleSection('timeline')}>
                <View style={[s.footerPill, { backgroundColor: colors.timeline }, activeSection === 'timeline' && s.footerPillActive]}>
                  <Text style={s.footerPillText}>TL</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerTag} onPress={() => toggleSection('notes')}>
                <View style={[s.footerPill, { backgroundColor: colors.muted }, activeSection === 'notes' && s.footerPillActive]}>
                  <Text style={s.footerPillText}>Nte</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerTag} onPress={() => setNewSeriesVisible(true)}>
                <View style={[s.footerPill, { backgroundColor: colors.text }]}>
                  <Text style={s.footerPillText}>+</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Collapsed binder strip */
          <TouchableOpacity style={s.binderCollapsed} onPress={() => setBinderOpen(true)}>
            <Text style={s.chevronLarge}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Content ── */}
        <View style={s.content}>
          <MainContent section={activeSection} universe={universe} />
        </View>
      </View>

      <NewSeriesModal
        visible={newSeriesVisible}
        universeId={universeId}
        onClose={() => setNewSeriesVisible(false)}
        onCreate={series => setSeriesList(prev => [...prev, series])}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: colors.bg },

  // Chrome
  chrome:             { height: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  chromeBack:         { flex: 1 },
  chromeBackText:     { fontSize: 13, fontWeight: '600', color: colors.accent },
  saveStatus:         { fontSize: 10, color: colors.faint, letterSpacing: 0.5 },
  chromeRight:        { flex: 1 },

  // Workspace
  workspace:          { flex: 1, flexDirection: 'row' },

  // Binder
  binder:             { width: BINDER_W, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, flexDirection: 'column' },
  binderHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  binderUniverseName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  collapseBtn:        { paddingLeft: spacing.sm },
  chevronLarge:       { fontSize: 20, color: colors.muted },
  binderCollapsed:    { width: 22, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  // Search
  searchWrap:         { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchBar:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: 4 },
  searchIcon:         { fontSize: 14, color: colors.faint },
  searchInput:        { flex: 1, fontSize: 13, color: colors.text },

  // Sections
  sections:           { flex: 1 },
  sectionHeaderRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4 },
  sectionLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.muted },
  sectionAdd:         { fontSize: 16, color: colors.accent, lineHeight: 18 },
  typeDot:            { width: 7, height: 7, borderRadius: 4 },

  // Rows
  row:                { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  rowLabel:           { flex: 1, paddingVertical: 7, paddingRight: spacing.xs },
  chevronHitArea:     { width: 28, paddingLeft: spacing.md, alignItems: 'center', justifyContent: 'center' },
  indentIssue:        { paddingLeft: spacing.md + 10 },
  rowChevron:         { fontSize: 10, color: colors.faint },
  seriesName:         { fontSize: 13, fontWeight: '600', color: colors.text },
  issueName:          { fontSize: 12, color: colors.text },
  emptyRow:           { fontSize: 12, color: colors.faint, fontStyle: 'italic', paddingHorizontal: spacing.md, paddingVertical: 6 },

  // Footer
  binderFooter:       { height: 44, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.sm },
  footerTag:          { alignItems: 'center', justifyContent: 'center' },
  footerPill:         { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, opacity: 0.75 },
  footerPillActive:   { opacity: 1 },
  footerPillText:     { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Content
  content:            { flex: 1, backgroundColor: colors.bg },
  contentEmpty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  contentEmptyTitle:  { fontSize: 20, fontWeight: '700', color: colors.muted, marginBottom: spacing.sm },
  contentEmptyHint:   { fontSize: 13, color: colors.faint, textAlign: 'center', lineHeight: 20 },

  modalError:         { color: '#e05050', fontSize: 12, marginBottom: 8 },
});
