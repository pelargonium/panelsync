import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme';
import { type ApiContainer, type ApiHierarchyLevel, type ApiPage } from '../../lib/api';
import CharactersEntity from '../../entities/CharactersEntity';
import LocationsEntity from '../../entities/LocationsEntity';
import TimelineEntity from '../../entities/TimelineEntity';
import NotesEntity from '../../entities/NotesEntity';
import ScriptEditor from '../../components/ScriptEditor';
import type { Universe } from '../../types';
import { UniverseProvider, useUniverse } from '../../context/UniverseContext';

type SectionKey = 'characters' | 'locations' | 'timeline' | 'notes';

const BINDER_WIDTH = 264;

function labelForContainer(level: ApiHierarchyLevel | undefined, container: ApiContainer) {
  const levelName = level?.name ?? 'Container';
  const numbered = container.number ? `${levelName} ${container.number}` : levelName;
  return `${numbered} — ${container.name}`;
}

function EmptyContent({ universeName }: { universeName: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.bg }}>
      <Text className="text-center text-2xl font-bold" style={{ color: colors.text }}>
        {universeName}
      </Text>
      <Text className="mt-3 text-center text-sm" style={{ color: colors.faint }}>
        Select a page or section from the binder to open it in the workspace.
      </Text>
    </View>
  );
}

function DossierPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
      <Text className="text-sm" style={{ color: colors.faint }}>
        Dossier
      </Text>
    </View>
  );
}

function SectionContent({ sectionKey }: { sectionKey: SectionKey }) {
  const { universeId, universeName } = useUniverse();
  const universe: Universe = { id: universeId, name: universeName, seriesCount: 0, lastEdited: '' };

  if (sectionKey === 'characters') return <CharactersEntity universe={universe} />;
  if (sectionKey === 'locations') return <LocationsEntity universe={universe} />;
  if (sectionKey === 'timeline') return <TimelineEntity universe={universe} />;
  return <NotesEntity universe={universe} />;
}

function PrimaryContent() {
  const { activeEntityType, activeEntityId, universeName, pagesByContainer } = useUniverse();

  if (!activeEntityType || !activeEntityId) {
    return <EmptyContent universeName={universeName} />;
  }

  if (activeEntityType === 'section') {
    return <SectionContent sectionKey={activeEntityId as SectionKey} />;
  }

  if (activeEntityType === 'page') {
    const issueEntry = Object.entries(pagesByContainer).find(([, pages]) =>
      pages.some((page) => page.id === activeEntityId),
    );

    if (!issueEntry) {
      return <EmptyContent universeName={universeName} />;
    }

    return <ScriptEditor issueId={issueEntry[0]} activePageId={activeEntityId} />;
  }

  return <EmptyContent universeName={universeName} />;
}

function ContentArea() {
  const { depthState } = useUniverse();

  if (depthState === 'dossier_only') {
    return <DossierPlaceholder />;
  }

  if (depthState === 'split') {
    return (
      <View className="flex-1 flex-row">
        <View className="flex-1 border-r" style={{ borderColor: colors.border }}>
          <PrimaryContent />
        </View>
        <View className="flex-1">
          <DossierPlaceholder />
        </View>
      </View>
    );
  }

  return <PrimaryContent />;
}

function InlineCreateRow({
  placeholder,
  onCreate,
  onCancel,
}: {
  placeholder: string;
  onCreate: (value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate(value.trim());
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mx-4 mt-2 flex-row items-center rounded-md border px-3 py-2" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
      <TextInput
        autoFocus
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        onBlur={onCancel}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        className="flex-1 text-sm"
        style={{ color: colors.text }}
      />
      <TouchableOpacity disabled={submitting || !value.trim()} onPress={submit} className="ml-2">
        <Text className="text-base font-semibold" style={{ color: value.trim() ? colors.accent : colors.faint }}>
          ✓
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function useDoubleTap(onSingleTap: () => void, onDoubleTap: () => void) {
  const lastTapRef = useRef(0);

  return () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onDoubleTap();
      return;
    }

    lastTapRef.current = now;
    onSingleTap();
  };
}

function PageRow({ page }: { page: ApiPage }) {
  const { activateEntity, activeEntityType, activeEntityId } = useUniverse();
  const isActive = activeEntityType === 'page' && activeEntityId === page.id;

  return (
    <View className="flex-row items-center pl-14 pr-3 py-1">
      <Text className="flex-1 text-xs" style={{ color: isActive ? colors.accent : colors.text }}>
        Page {page.number}
      </Text>
      <View className="flex-row">
        <TouchableOpacity
          onPress={() => activateEntity('page', page.id)}
          className="h-6 w-6 items-center justify-center rounded border"
          style={{
            borderColor: isActive ? colors.accent : colors.border,
            backgroundColor: isActive ? colors.accent : colors.surface,
          }}
        >
          <Text className="text-[11px] font-semibold" style={{ color: isActive ? colors.surface : colors.text }}>
            S
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled
          className="ml-2 h-6 w-6 items-center justify-center rounded border"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-[11px]" style={{ color: colors.faint }}>
            B
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IssueRow({
  issue,
  level,
}: {
  issue: ApiContainer;
  level: ApiHierarchyLevel | undefined;
}) {
  const { pagesByContainer, loadPages, createPage, activateEntity, cycleDepthState, activeEntityType, activeEntityId } = useUniverse();
  const [expanded, setExpanded] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const pages = pagesByContainer[issue.id];
  const isActive = activeEntityType === 'container' && activeEntityId === issue.id;

  const handleTap = useDoubleTap(
    () => activateEntity('container', issue.id),
    cycleDepthState,
  );

  async function toggle() {
    if (!expanded && !pages) {
      setLoadingPages(true);
      setPageError(null);
      try {
        await loadPages(issue.id);
      } catch (error: any) {
        setPageError(error.message ?? 'Failed to load pages.');
      } finally {
        setLoadingPages(false);
      }
    }

    setExpanded((current) => !current);
  }

  async function handleCreatePage() {
    setCreatingPage(true);
    setPageError(null);
    try {
      await createPage(issue.id);
      setExpanded(true);
    } catch (error: any) {
      setPageError(error.message ?? 'Failed to create page.');
    } finally {
      setCreatingPage(false);
    }
  }

  return (
    <View>
      <View className="flex-row items-center min-h-8">
        <TouchableOpacity onPress={toggle} className="w-7 items-center justify-center pl-1">
          <Text className="text-[10px]" style={{ color: colors.faint }}>
            {expanded ? '▾' : '▸'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleTap} className="flex-1 py-2 pr-2">
          <Text className="text-xs" style={{ color: isActive ? colors.accent : colors.text }}>
            {labelForContainer(level, issue)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCreatePage} disabled={creatingPage} className="mr-3 w-6 items-center justify-center">
          {creatingPage
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text className="text-base" style={{ color: colors.accent }}>＋</Text>}
        </TouchableOpacity>
      </View>

      {expanded && (
        <View>
          {loadingPages && <ActivityIndicator size="small" color={colors.faint} className="py-2" />}
          {!loadingPages && (pages?.length ?? 0) === 0 && (
            <Text className="pl-14 py-1 text-xs" style={{ color: colors.faint }}>
              No pages yet
            </Text>
          )}
          {!loadingPages && (pages ?? []).map((page) => (
            <PageRow key={page.id} page={page} />
          ))}
          {pageError && (
            <Text className="pl-14 py-1 text-xs" style={{ color: colors.accent }}>
              {pageError}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function SeriesRow({
  series,
  level,
  issueLevel,
}: {
  series: ApiContainer;
  level: ApiHierarchyLevel | undefined;
  issueLevel: ApiHierarchyLevel | undefined;
}) {
  const { containers, createContainer, activateEntity, cycleDepthState, activeEntityType, activeEntityId } = useUniverse();
  const [expanded, setExpanded] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const issues = containers.filter((container) => container.parentId === series.id);
  const isActive = activeEntityType === 'container' && activeEntityId === series.id;

  const handleTap = useDoubleTap(
    () => activateEntity('container', series.id),
    cycleDepthState,
  );

  async function handleCreateIssue(name: string) {
    if (!issueLevel) return;
    await createContainer(issueLevel.id, series.id, name);
    setAddingChild(false);
    setExpanded(true);
  }

  return (
    <View>
      <View className="flex-row items-center min-h-8">
        <TouchableOpacity onPress={() => setExpanded((current) => !current)} className="w-7 items-center justify-center pl-4">
          <Text className="text-[10px]" style={{ color: colors.faint }}>
            {expanded ? '▾' : '▸'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleTap} className="flex-1 py-2 pr-2">
          <Text className="text-[13px] font-semibold" style={{ color: isActive ? colors.accent : colors.text }}>
            {labelForContainer(level, series)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAddingChild(true)} className="mr-3 w-6 items-center justify-center">
          <Text className="text-base" style={{ color: colors.accent }}>＋</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View>
          {issues.length === 0 && !addingChild && (
            <Text className="pl-11 py-1 text-xs" style={{ color: colors.faint }}>
              No issues yet
            </Text>
          )}
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} level={issueLevel} />
          ))}
          {addingChild && issueLevel && (
            <InlineCreateRow
              placeholder={`${issueLevel.name} name...`}
              onCreate={handleCreateIssue}
              onCancel={() => setAddingChild(false)}
            />
          )}
        </View>
      )}
    </View>
  );
}

function SectionButton({
  sectionKey,
  label,
  color,
}: {
  sectionKey: SectionKey;
  label: string;
  color: string;
}) {
  const { activeEntityType, activeEntityId, activateEntity } = useUniverse();
  const isActive = activeEntityType === 'section' && activeEntityId === sectionKey;

  return (
    <TouchableOpacity
      onPress={() => activateEntity('section', sectionKey)}
      className="flex-row items-center justify-between px-4 pt-4 pb-1"
    >
      <Text className="text-[10px] font-bold tracking-[1.5px]" style={{ color: isActive ? color : colors.muted }}>
        {label}
      </Text>
      <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: color }} />
    </TouchableOpacity>
  );
}

function BinderFooterPill({
  label,
  onPress,
  active,
  color,
}: {
  label: string;
  onPress: () => void;
  active: boolean;
  color: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="mr-2">
      <View
        className="min-w-9 items-center rounded px-2 py-1"
        style={{
          backgroundColor: color,
          borderWidth: active ? 1 : 0,
          borderColor: colors.text,
        }}
      >
        <Text className="text-[10px] font-semibold" style={{ color: colors.surface }}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function UniverseWorkspace() {
  const router = useRouter();
  const {
    universeName,
    hierarchyLevels,
    containers,
    loadingContainers,
    binderOpen,
    setBinderOpen,
    activeEntityType,
    activeEntityId,
    createContainer,
    activateEntity,
  } = useUniverse();
  const [addingSeries, setAddingSeries] = useState(false);
  const seriesLevel = hierarchyLevels.find((level) => level.position === 1);
  const issueLevel = hierarchyLevels.find((level) => level.position === 2);
  const seriesList = seriesLevel
    ? containers.filter((container) => container.levelId === seriesLevel.id && !container.parentId)
    : [];

  async function handleCreateSeries(name: string) {
    if (!seriesLevel) return;
    await createContainer(seriesLevel.id, null, name);
    setAddingSeries(false);
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View
        className="flex-row items-center px-4"
        style={{ height: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <TouchableOpacity onPress={() => router.back()} className="flex-1">
          <Text className="text-[13px] font-semibold" style={{ color: colors.accent }}>
            ← Universes
          </Text>
        </TouchableOpacity>
        <Text className="text-[10px]" style={{ color: colors.faint }}>
          ● Saved
        </Text>
        <View className="flex-1" />
      </View>

      <View className="flex-1 flex-row">
        {binderOpen ? (
          <View
            className="flex-col"
            style={{ width: BINDER_WIDTH, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <View className="flex-row items-center border-b px-4 py-3" style={{ borderColor: colors.border }}>
              <Text className="flex-1 text-sm font-bold" style={{ color: colors.text }}>
                {universeName}
              </Text>
              <TouchableOpacity onPress={() => setBinderOpen(false)}>
                <Text className="text-xl" style={{ color: colors.muted }}>‹</Text>
              </TouchableOpacity>
            </View>

            <View className="border-b p-2" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center rounded-md px-3 py-2" style={{ backgroundColor: colors.bg }}>
                <Text className="mr-1 text-sm" style={{ color: colors.faint }}>⌕</Text>
                <TextInput
                  placeholder="Search universe…"
                  placeholderTextColor={colors.faint}
                  className="flex-1 text-sm"
                  style={{ color: colors.text }}
                />
              </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center justify-between px-4 pt-4 pb-1">
                <Text className="text-[10px] font-bold tracking-[1.5px]" style={{ color: colors.muted }}>
                  SERIES / ISSUE / PAGE
                </Text>
                <TouchableOpacity onPress={() => setAddingSeries(true)}>
                  <Text className="text-base" style={{ color: colors.accent }}>＋</Text>
                </TouchableOpacity>
              </View>

              {loadingContainers && (
                <ActivityIndicator size="small" color={colors.faint} className="py-4" />
              )}

              {!loadingContainers && seriesList.length === 0 && !addingSeries && (
                <TouchableOpacity onPress={() => setAddingSeries(true)} className="px-4 py-2">
                  <Text className="text-sm" style={{ color: colors.faint }}>
                    + Add a series
                  </Text>
                </TouchableOpacity>
              )}

              {!loadingContainers && seriesList.map((series) => (
                <SeriesRow
                  key={series.id}
                  series={series}
                  level={seriesLevel}
                  issueLevel={issueLevel}
                />
              ))}

              {addingSeries && seriesLevel && (
                <InlineCreateRow
                  placeholder={`${seriesLevel.name} name...`}
                  onCreate={handleCreateSeries}
                  onCancel={() => setAddingSeries(false)}
                />
              )}

              <SectionButton sectionKey="characters" label="CHARACTERS" color={colors.accent} />
              <SectionButton sectionKey="locations" label="LOCATIONS" color={colors.bible} />
              <SectionButton sectionKey="timeline" label="TIMELINE" color={colors.timeline} />
              <SectionButton sectionKey="notes" label="NOTES" color={colors.faint} />
              <View className="h-6" />
            </ScrollView>

            <View className="flex-row items-center border-t px-4 py-3" style={{ borderColor: colors.border }}>
              <BinderFooterPill
                label="Chr"
                onPress={() => activateEntity('section', 'characters')}
                active={activeEntityType === 'section' && activeEntityId === 'characters'}
                color={colors.accent}
              />
              <BinderFooterPill
                label="Loc"
                onPress={() => activateEntity('section', 'locations')}
                active={activeEntityType === 'section' && activeEntityId === 'locations'}
                color={colors.bible}
              />
              <BinderFooterPill
                label="TL"
                onPress={() => activateEntity('section', 'timeline')}
                active={activeEntityType === 'section' && activeEntityId === 'timeline'}
                color={colors.timeline}
              />
              <BinderFooterPill
                label="Nte"
                onPress={() => activateEntity('section', 'notes')}
                active={activeEntityType === 'section' && activeEntityId === 'notes'}
                color={colors.muted}
              />
              <BinderFooterPill
                label="+"
                onPress={() => setAddingSeries(true)}
                active={false}
                color={colors.text}
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setBinderOpen(true)}
            className="items-center justify-center"
            style={{ width: 22, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <Text className="text-xl" style={{ color: colors.muted }}>›</Text>
          </TouchableOpacity>
        )}

        <View className="flex-1">
          <ContentArea />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function UniverseScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const universeId = id as string;
  const universeName = decodeURIComponent(name as string);

  return (
    <UniverseProvider universeId={universeId} universeName={universeName}>
      <UniverseWorkspace />
    </UniverseProvider>
  );
}
