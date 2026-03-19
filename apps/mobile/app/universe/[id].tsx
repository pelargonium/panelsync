import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../theme';
import { modalStyles as m } from '../../components/modalStyles';
import { api, type ApiSeries, type ApiIssue, type ApiPage } from '../../lib/api';
import CharactersEntity from '../../entities/CharactersEntity';
import LocationsEntity from '../../entities/LocationsEntity';
import TimelineEntity from '../../entities/TimelineEntity';
import NotesEntity from '../../entities/NotesEntity';
import type { Universe } from '../../types';

type SectionKey = 'characters' | 'locations' | 'timeline' | 'notes';

const BINDER_W = 264;

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

function NewIssueModal({ visible, seriesId, onClose, onCreate }: {
  visible: boolean;
  seriesId: string;
  onClose: () => void;
  onCreate: (issue: ApiIssue) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.issues.create(seriesId, { name: name.trim() });
      onCreate(res.data);
      setName('');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create issue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m.overlay}>
        <TouchableOpacity style={m.backdrop} onPress={onClose} />
        <View style={m.sheet}>
          <Text style={m.title}>New Issue</Text>
          <TextInput
            style={m.input}
            placeholder="Issue name..."
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

function IssueRow({
  issue,
  universeId,
  universeName,
}: {
  issue: ApiIssue;
  universeId: string;
  universeName: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState<ApiPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  async function toggle() {
    if (!expanded && pages.length === 0) {
      setLoadingPages(true);
      try {
        const res = await api.pages.list(issue.id);
        setPages(res.data);
      } catch (e: any) {
        setPageError(e.message ?? 'Failed to load pages.');
      } finally {
        setLoadingPages(false);
      }
    }
    setExpanded(prev => !prev);
  }

  async function handleCreatePage() {
    setPageError(null);
    setCreatingPage(true);
    try {
      const res = await api.pages.create(issue.id);
      setPages(prev => [...prev, res.data]);
      setExpanded(true);
    } catch (e: any) {
      setPageError(e.message ?? 'Failed to create page.');
    } finally {
      setCreatingPage(false);
    }
  }

  function openScript(page: ApiPage) {
    router.push({
      pathname: '/universe/[id]/issue/[iid]/page/[pid]',
      params: {
        id: universeId,
        iid: issue.id,
        pid: page.id,
        pageNum: String(page.number),
        universeName: encodeURIComponent(universeName),
      },
    });
  }

  return (
    <View>
      <View style={s.row}>
        <TouchableOpacity onPress={toggle} style={[s.chevronHitArea, s.indentIssue]}>
          <Text style={s.rowChevron}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggle} style={s.rowLabel}>
          <Text style={s.issueName} numberOfLines={1}>
            Issue {issue.number} — {issue.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.issueAddButton, creatingPage && s.issueAddButtonOff]}
          onPress={handleCreatePage}
          disabled={creatingPage}
        >
          {creatingPage
            ? <ActivityIndicator size="small" color={colors.surface} />
            : <Text style={s.issueAddText}>＋</Text>
          }
        </TouchableOpacity>
      </View>

      {expanded && (
        <View>
          {loadingPages
            ? <ActivityIndicator size="small" color={colors.muted} style={s.loadingPages} />
            : pages.length === 0
              ? <Text style={s.emptyPageRow}>No pages yet</Text>
              : pages.map(page => (
                  <View key={page.id} style={[s.row, s.pageRow]}>
                    <Text style={s.pageNum}>Page {page.number}</Text>
                    <View style={s.pageIcons}>
                      <TouchableOpacity
                        style={[s.pageIcon, s.pageIconActive]}
                        onPress={() => openScript(page)}
                      >
                        <Text style={[s.pageIconText, s.pageIconTextActive]}>S</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.pageIcon} disabled>
                        <Text style={s.pageIconText}>B</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
          }
          {pageError && <Text style={s.inlineError}>{pageError}</Text>}
        </View>
      )}
    </View>
  );
}

function SeriesRow({
  series,
  universeId,
  universeName,
}: {
  series: ApiSeries;
  universeId: string;
  universeName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [newIssueVisible, setNewIssueVisible] = useState(false);

  async function toggle() {
    if (!expanded && issues.length === 0) {
      setIssuesError(null);
      setLoadingIssues(true);
      try {
        const res = await api.issues.list(series.id);
        setIssues(res.data);
      } catch (e: any) {
        setIssuesError(e.message ?? 'Failed to load issues.');
      } finally {
        setLoadingIssues(false);
      }
    }
    setExpanded(prev => !prev);
  }

  function handleIssueCreate(issue: ApiIssue) {
    setIssues(prev => [...prev, issue]);
    setExpanded(true);
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
        <TouchableOpacity style={s.seriesAddButton} onPress={() => setNewIssueVisible(true)}>
          <Text style={s.seriesAddText}>＋</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View>
          {loadingIssues
            ? <ActivityIndicator size="small" color={colors.muted} style={s.loadingIssues} />
            : issues.length === 0
              ? <Text style={s.emptyIssueRow}>No issues yet</Text>
              : issues.map(issue => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    universeId={universeId}
                    universeName={universeName}
                  />
                ))
          }
          {issuesError && <Text style={s.inlineError}>{issuesError}</Text>}
        </View>
      )}

      <NewIssueModal
        visible={newIssueVisible}
        seriesId={series.id}
        onClose={() => setNewIssueVisible(false)}
        onCreate={handleIssueCreate}
      />
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
      <View style={s.contentEmpty}>
        <Text style={s.contentEmptyTitle}>{universe.name}</Text>
        <Text style={s.contentEmptyHint}>Select a page from the binder to open the script editor, or choose a section to browse your universe.</Text>
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
  const [binderOpen, setBinderOpen] = useState(true);

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
      <View style={s.chrome}>
        <TouchableOpacity onPress={() => router.back()} style={s.chromeBack}>
          <Text style={s.chromeBackText}>← Universes</Text>
        </TouchableOpacity>
        <Text style={s.saveStatus}>● Saved</Text>
        <View style={s.chromeRight} />
      </View>

      <View style={s.workspace}>
        {binderOpen ? (
          <View style={s.binder}>
            <View style={s.binderHeader}>
              <Text style={s.binderUniverseName} numberOfLines={1}>{universeName}</Text>
              <TouchableOpacity onPress={() => setBinderOpen(false)} style={s.collapseBtn}>
                <Text style={s.chevronLarge}>‹</Text>
              </TouchableOpacity>
            </View>

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

            <ScrollView style={s.sections} showsVerticalScrollIndicator={false}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>SERIES / ISSUE / PAGE</Text>
                <TouchableOpacity onPress={() => setNewSeriesVisible(true)}>
                  <Text style={s.sectionAdd}>＋</Text>
                </TouchableOpacity>
              </View>
              {loadingSeries
                ? <ActivityIndicator size="small" color={colors.muted} style={s.loadingSeries} />
                : seriesList.length === 0
                  ? <TouchableOpacity onPress={() => setNewSeriesVisible(true)}>
                      <Text style={s.emptyRow}>+ Add a series</Text>
                    </TouchableOpacity>
                  : seriesList.map(series => (
                      <SeriesRow
                        key={series.id}
                        series={series}
                        universeId={universeId}
                        universeName={universeName}
                      />
                    ))
              }

              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('characters')}
              >
                <Text style={[s.sectionLabel, activeSection === 'characters' && { color: colors.accent }]}>
                  CHARACTERS
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.accent }]} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('locations')}
              >
                <Text style={[s.sectionLabel, activeSection === 'locations' && { color: colors.bible }]}>
                  LOCATIONS
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.bible }]} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sectionHeaderRow}
                onPress={() => toggleSection('timeline')}
              >
                <Text style={[s.sectionLabel, activeSection === 'timeline' && { color: colors.timeline }]}>
                  TIMELINE
                </Text>
                <View style={[s.typeDot, { backgroundColor: colors.timeline }]} />
              </TouchableOpacity>

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
          <TouchableOpacity style={s.binderCollapsed} onPress={() => setBinderOpen(true)}>
            <Text style={s.chevronLarge}>›</Text>
          </TouchableOpacity>
        )}

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

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: colors.bg },
  chrome:             { height: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  chromeBack:         { flex: 1 },
  chromeBackText:     { fontSize: 13, fontWeight: '600', color: colors.accent },
  saveStatus:         { fontSize: 10, color: colors.faint, letterSpacing: 0.5 },
  chromeRight:        { flex: 1 },
  workspace:          { flex: 1, flexDirection: 'row' },
  binder:             { width: BINDER_W, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, flexDirection: 'column' },
  binderHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  binderUniverseName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  collapseBtn:        { paddingLeft: spacing.sm },
  chevronLarge:       { fontSize: 20, color: colors.muted },
  binderCollapsed:    { width: 22, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  searchWrap:         { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchBar:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: 4 },
  searchIcon:         { fontSize: 14, color: colors.faint },
  searchInput:        { flex: 1, fontSize: 13, color: colors.text },
  sections:           { flex: 1 },
  sectionHeaderRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4 },
  sectionLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.muted },
  sectionAdd:         { fontSize: 16, color: colors.accent, lineHeight: 18 },
  typeDot:            { width: 7, height: 7, borderRadius: 4 },
  row:                { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  rowLabel:           { flex: 1, paddingVertical: 7, paddingRight: spacing.xs },
  chevronHitArea:     { width: 28, paddingLeft: spacing.md, alignItems: 'center', justifyContent: 'center' },
  indentIssue:        { paddingLeft: spacing.md + 10 },
  rowChevron:         { fontSize: 10, color: colors.faint },
  seriesName:         { fontSize: 13, fontWeight: '600', color: colors.text },
  issueName:          { fontSize: 12, color: colors.text },
  seriesAddButton:    { width: 24, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  seriesAddText:      { fontSize: 16, color: colors.accent, lineHeight: 18 },
  issueAddButton:     { width: 20, height: 20, borderRadius: 3, marginRight: spacing.sm, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  issueAddButtonOff:  { opacity: 0.7 },
  issueAddText:       { fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 14 },
  loadingSeries:      { paddingVertical: 12 },
  loadingIssues:      { paddingVertical: 8, paddingLeft: 38 },
  loadingPages:       { paddingVertical: 8, paddingLeft: 52 },
  emptyRow:           { fontSize: 12, color: colors.faint, fontStyle: 'italic', paddingHorizontal: spacing.md, paddingVertical: 6 },
  emptyIssueRow:      { fontSize: 12, color: colors.faint, fontStyle: 'italic', paddingLeft: spacing.md + 28, paddingVertical: 6 },
  emptyPageRow:       { fontSize: 11, color: colors.faint, fontStyle: 'italic', paddingLeft: spacing.md + 40, paddingVertical: 6 },
  inlineError:        { fontSize: 11, color: '#e05050', paddingLeft: spacing.md + 28, paddingBottom: 6 },
  pageRow:            { paddingLeft: spacing.md + 24 },
  pageNum:            { flex: 1, fontSize: 11, color: colors.muted, paddingVertical: 6 },
  pageIcons:          { flexDirection: 'row', gap: 3, paddingRight: spacing.sm },
  pageIcon:           { width: 20, height: 20, borderRadius: 3, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  pageIconActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  pageIconText:       { fontSize: 9, fontWeight: '700', color: colors.muted },
  pageIconTextActive: { color: '#fff' },
  binderFooter:       { height: 44, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.sm },
  footerTag:          { alignItems: 'center', justifyContent: 'center' },
  footerPill:         { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, opacity: 0.75 },
  footerPillActive:   { opacity: 1 },
  footerPillText:     { fontSize: 10, fontWeight: '700', color: '#fff' },
  content:            { flex: 1, backgroundColor: colors.bg },
  contentEmpty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  contentEmptyTitle:  { fontSize: 20, fontWeight: '700', color: colors.muted, marginBottom: spacing.sm },
  contentEmptyHint:   { fontSize: 13, color: colors.faint, textAlign: 'center', lineHeight: 20 },
  modalError:         { color: '#e05050', fontSize: 12, marginBottom: 8 },
});
