/**
 * Mockup: Binder / Sidebar
 *
 * Covers: persistent sidebar layout, global chrome top bar,
 * Series/Issue/Page accordion, section headers, search bar,
 * footer type-tag icons, binder collapse, split-view shell.
 *
 * Static data only — no backend.
 * Route: /mockups/binder
 */

import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, StyleSheet,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';

// ─── Static mock data ────────────────────────────────────────────────────────

const UNIVERSE_NAME = 'The Ironwood Saga';

const MOCK_SERIES = [
  {
    id: 's1', number: 1, name: 'The Awakening',
    issues: [
      { id: 'i1', number: 1, name: 'The Call',    pages: [1, 2, 3, 4, 5] },
      { id: 'i2', number: 2, name: 'The Road',    pages: [1, 2, 3] },
    ],
  },
  {
    id: 's2', number: 2, name: 'The Reckoning',
    issues: [
      { id: 'i3', number: 1, name: 'Embers',      pages: [1, 2] },
    ],
  },
];

const MOCK_CHARACTERS = ['Mara Voss', 'Theo Kael', 'The Warden'];
const MOCK_TIMELINES  = ['Story Timeline', 'Arc — Mara'];
const MOCK_DRAFTS     = ['Untitled character sketch', 'Notes on Act 2'];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function BinderMockup() {
  const [binderOpen,     setBinderOpen]     = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<string[]>(['s1']);
  const [expandedIssues, setExpandedIssues] = useState<string[]>(['i1']);
  const [activeItem,     setActiveItem]     = useState<string | null>('page-i1-1');

  function toggleSeries(id: string) {
    setExpandedSeries(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleIssue(id: string) {
    setExpandedIssues(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <SafeAreaView style={s.root}>

      {/* ── Global Chrome ── */}
      <View style={s.chrome}>
        <View style={s.chromeLeft}>
          <ChromeBtn label="↩" />
          <ChromeBtn label="↪" />
        </View>
        <Text style={s.saveStatus}>● All saved</Text>
        <View style={s.chromeRight}>
          <ChromeBtn label="View" />
          <ChromeBtn label="Share" />
          <Avatar initials="MK" bg={colors.timeline} />
          <Avatar initials="ME" bg={colors.accent} />
        </View>
      </View>

      {/* ── Workspace row ── */}
      <View style={s.workspace}>

        {/* ── Binder ── */}
        {binderOpen ? (
          <View style={s.binder}>

            {/* Universe name + collapse */}
            <View style={s.binderHeader}>
              <Text style={s.universeName} numberOfLines={1}>{UNIVERSE_NAME}</Text>
              <TouchableOpacity onPress={() => setBinderOpen(false)} style={s.collapseBtn}>
                <Text style={s.chevron}>‹</Text>
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

              {/* ─ Series / Issue / Page ─ */}
              <SectionHeader label="SERIES / ISSUE / PAGE" />
              {MOCK_SERIES.map(series => (
                <View key={series.id}>
                  {/* Series row */}
                  <View style={s.row}>
                    <TouchableOpacity
                      onPress={() => toggleSeries(series.id)}
                      style={s.chevronHitArea}
                    >
                      <Text style={s.rowChevron}>
                        {expandedSeries.includes(series.id) ? '▾' : '▸'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveItem(`series-${series.id}`)}
                      style={s.rowLabel}
                    >
                      <Text
                        style={[s.seriesName, activeItem === `series-${series.id}` && s.activeText]}
                        numberOfLines={1}
                      >
                        Series {series.number} — {series.name}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Issues */}
                  {expandedSeries.includes(series.id) && series.issues.map(issue => (
                    <View key={issue.id}>
                      <View style={s.row}>
                        <TouchableOpacity
                          onPress={() => toggleIssue(issue.id)}
                          style={[s.chevronHitArea, s.indentIssue]}
                        >
                          <Text style={s.rowChevron}>
                            {expandedIssues.includes(issue.id) ? '▾' : '▸'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setActiveItem(`issue-${issue.id}`)}
                          style={s.rowLabel}
                        >
                          <Text
                            style={[s.issueName, activeItem === `issue-${issue.id}` && s.activeText]}
                            numberOfLines={1}
                          >
                            Issue {issue.number} — {issue.name}
                          </Text>
                        </TouchableOpacity>
                        <PageIcons active={activeItem} prefix={`script-${issue.id}`} onPress={setActiveItem} />
                      </View>

                      {/* Pages */}
                      {expandedIssues.includes(issue.id) && issue.pages.map(pg => (
                        <View key={pg} style={[s.row, s.pageRow]}>
                          <Text style={s.pageNum}>Page {pg}</Text>
                          <PageIcons active={activeItem} prefix={`page-${issue.id}-${pg}`} onPress={setActiveItem} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}

              {/* ─ Arc Notes ─ */}
              <SectionHeader label="ARC NOTES" />
              <View style={s.sectionBody}>
                <Text style={s.placeholder}>Series 1 — The Awakening</Text>
              </View>

              {/* ─ Characters ─ */}
              <SectionHeader label="CHARACTERS" />
              {MOCK_CHARACTERS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={s.row}
                  onPress={() => setActiveItem(`char-${name}`)}
                >
                  <View style={[s.typeDot, { backgroundColor: colors.accent }]} />
                  <Text style={[s.itemName, activeItem === `char-${name}` && s.activeText]}>{name}</Text>
                </TouchableOpacity>
              ))}

              {/* ─ Timeline ─ */}
              <SectionHeader label="TIMELINE" />
              {MOCK_TIMELINES.map(name => (
                <TouchableOpacity
                  key={name}
                  style={s.row}
                  onPress={() => setActiveItem(`tl-${name}`)}
                >
                  <View style={[s.typeDot, { backgroundColor: colors.timeline }]} />
                  <Text style={[s.itemName, activeItem === `tl-${name}` && s.activeText]}>{name}</Text>
                </TouchableOpacity>
              ))}

              {/* ─ My Drafts (private workspace) ─ */}
              <SectionHeader label="MY DRAFTS" dimmed />
              {MOCK_DRAFTS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={s.row}
                  onPress={() => setActiveItem(`draft-${name}`)}
                >
                  <View style={[s.typeDot, { backgroundColor: colors.faint }]} />
                  <Text style={[s.itemName, { color: colors.muted }, activeItem === `draft-${name}` && s.activeText]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* bottom padding */}
              <View style={{ height: spacing.lg }} />
            </ScrollView>

            {/* Footer — type-tag filter icons */}
            <View style={s.binderFooter}>
              <FooterTag label="Chr" color={colors.accent}    hint="Characters" />
              <FooterTag label="Loc" color={colors.bible}     hint="Locations" />
              <FooterTag label="TL"  color={colors.timeline}  hint="Timeline" />
              <FooterTag label="Nte" color={colors.muted}     hint="Notes" />
              <FooterTag label="+"   color={colors.text}      hint="New entry" />
            </View>
          </View>
        ) : (
          /* Collapsed binder — thin expand strip */
          <TouchableOpacity
            style={s.binderCollapsed}
            onPress={() => setBinderOpen(true)}
          >
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Content area placeholder ── */}
        <View style={s.content}>
          {activeItem?.startsWith('page-') ? (
            <View style={s.contentActive}>
              <Text style={s.contentTitle}>Script Editor</Text>
              <Text style={s.contentHint}>Page {activeItem.split('-')[2]} · Issue {activeItem.split('-')[1].replace('i', '')}</Text>
              <View style={s.scriptPreview}>
                <ScriptBlock type="PANEL" text="Panel 1" tag="½" />
                <ScriptBlock type="SCENE" text="INT. IRONWOOD FOREST — DUSK" />
                <ScriptBlock type="DESC"  text="Mara crouches low in the underbrush, her breath shallow. The Warden passes twenty feet away." />
                <ScriptBlock type="DLG"   text="MARA (V.O.)\nI had three seconds to decide." />
                <ScriptBlock type="PANEL" text="Panel 2" tag="⅓" />
                <ScriptBlock type="DESC"  text="Close on her hand — white-knuckled around the knife." />
              </View>
            </View>
          ) : (
            <View style={s.contentEmpty}>
              <Text style={s.contentEmptyTitle}>The Ironwood Saga</Text>
              <Text style={s.contentEmptyHint}>Select a page from the binder to open the script editor or storyboard canvas.</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChromeBtn({ label }: { label: string }) {
  return (
    <TouchableOpacity style={s.chromeBtn}>
      <Text style={s.chromeBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Avatar({ initials, bg }: { initials: string; bg: string }) {
  return (
    <View style={[s.avatar, { backgroundColor: bg }]}>
      <Text style={s.avatarText}>{initials}</Text>
    </View>
  );
}

function SectionHeader({ label, dimmed }: { label: string; dimmed?: boolean }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionLabel, dimmed && { color: colors.faint }]}>{label}</Text>
    </View>
  );
}

function PageIcons({
  active, prefix, onPress,
}: {
  active: string | null;
  prefix: string;
  onPress: (key: string) => void;
}) {
  const scriptKey = prefix.startsWith('page') ? prefix : `script-${prefix.replace('script-', '')}`;
  const boardKey  = prefix.startsWith('page') ? `board-${prefix}` : `board-${prefix.replace('script-', '')}`;
  return (
    <View style={s.pageIcons}>
      <TouchableOpacity
        style={[s.pageIcon, active === scriptKey && s.pageIconActive]}
        onPress={() => onPress(scriptKey)}
      >
        <Text style={[s.pageIconText, active === scriptKey && s.pageIconTextActive]}>S</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.pageIcon, active === boardKey && s.pageIconActive]}
        onPress={() => onPress(boardKey)}
      >
        <Text style={[s.pageIconText, active === boardKey && s.pageIconTextActive]}>B</Text>
      </TouchableOpacity>
    </View>
  );
}

function FooterTag({ label, color, hint }: { label: string; color: string; hint: string }) {
  return (
    <TouchableOpacity style={s.footerTag}>
      <View style={[s.footerTagPill, { backgroundColor: color }]}>
        <Text style={s.footerTagText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ScriptBlock({ type, text, tag }: { type: string; text: string; tag?: string }) {
  const typeColor: Record<string, string> = {
    PANEL: colors.accent,
    SCENE: colors.muted,
    DESC:  colors.text,
    DLG:   colors.timeline,
  };
  return (
    <View style={s.scriptBlock}>
      <View style={[s.blockTypeBar, { backgroundColor: typeColor[type] ?? colors.faint }]} />
      <View style={s.blockContent}>
        <View style={s.blockRow}>
          <Text style={[s.blockType, { color: typeColor[type] ?? colors.faint }]}>{type}</Text>
          {tag && <Text style={s.blockTag}>{tag}</Text>}
        </View>
        <Text style={s.blockText}>{text}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BINDER_W = 264;

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.bg },

  // Chrome
  chrome:          { height: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
  chromeLeft:      { flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  chromeRight:     { flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', justifyContent: 'flex-end' },
  saveStatus:      { fontSize: 10, color: colors.faint, letterSpacing: 0.5 },
  chromeBtn:       { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chromeBtnText:   { fontSize: 12, color: colors.text },
  avatar:          { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Workspace
  workspace:       { flex: 1, flexDirection: 'row' },

  // Binder
  binder:          { width: BINDER_W, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, flexDirection: 'column' },
  binderHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  universeName:    { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  collapseBtn:     { paddingLeft: spacing.sm },
  chevron:         { fontSize: 20, color: colors.muted },
  binderCollapsed: { width: 22, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  // Search
  searchWrap:      { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: 4 },
  searchIcon:      { fontSize: 14, color: colors.faint },
  searchInput:     { flex: 1, fontSize: 13, color: colors.text },

  // Sections
  sections:        { flex: 1 },
  sectionHeader:   { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4 },
  sectionLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.muted },
  sectionBody:     { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  placeholder:     { fontSize: 12, color: colors.faint, fontStyle: 'italic' },

  // Rows
  row:             { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  rowLabel:        { flex: 1, paddingVertical: 7, paddingRight: spacing.xs },
  chevronHitArea:  { width: 28, paddingLeft: spacing.md, alignItems: 'center', justifyContent: 'center' },
  indentIssue:     { paddingLeft: spacing.md + 10 },
  rowChevron:      { fontSize: 10, color: colors.faint },

  seriesName:      { fontSize: 13, fontWeight: '600', color: colors.text },
  issueName:       { fontSize: 12, color: colors.text },
  activeText:      { color: colors.accent },

  // Page rows
  pageRow:         { paddingLeft: spacing.md + 24 },
  pageNum:         { flex: 1, fontSize: 11, color: colors.muted, paddingVertical: 6 },

  // Page icons (S = Script, B = Board)
  pageIcons:       { flexDirection: 'row', gap: 3, paddingRight: spacing.sm },
  pageIcon:        { width: 20, height: 20, borderRadius: 3, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  pageIconActive:  { backgroundColor: colors.accent, borderColor: colors.accent },
  pageIconText:    { fontSize: 9, fontWeight: '700', color: colors.muted },
  pageIconTextActive: { color: '#fff' },

  // Binder items (character, timeline, etc.)
  typeDot:         { width: 7, height: 7, borderRadius: 4, marginLeft: spacing.md, marginRight: 8 },
  itemName:        { flex: 1, fontSize: 12, color: colors.text, paddingVertical: 7 },

  // Footer
  binderFooter:    { height: 44, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.sm },
  footerTag:       { alignItems: 'center', justifyContent: 'center' },
  footerTagPill:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  footerTagText:   { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Content area
  content:         { flex: 1, backgroundColor: colors.bg },
  contentEmpty:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  contentEmptyTitle: { fontSize: 20, fontWeight: '700', color: colors.muted, marginBottom: spacing.sm },
  contentEmptyHint: { fontSize: 13, color: colors.faint, textAlign: 'center', lineHeight: 20 },
  contentActive:   { flex: 1, padding: spacing.md },
  contentTitle:    { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  contentHint:     { fontSize: 12, color: colors.muted, marginBottom: spacing.md },

  // Script preview (stub)
  scriptPreview:   { flex: 1, backgroundColor: colors.pageWhite, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  scriptBlock:     { flexDirection: 'row', gap: spacing.sm },
  blockTypeBar:    { width: 3, borderRadius: 2, minHeight: 20 },
  blockContent:    { flex: 1 },
  blockRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  blockType:       { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  blockTag:        { fontSize: 9, fontWeight: '700', color: colors.muted, backgroundColor: colors.border, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 },
  blockText:       { fontSize: 12, color: colors.text, lineHeight: 18 },
});
