import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { type PanelSize, type ScriptElement } from './ScriptView';

interface PanelMapPreviewProps {
  elements: ScriptElement[];
}

interface PageData {
  pageNum: number;
  panels: { panelNum: number; size?: PanelSize; text: string }[];
}

const PAGE_ROWS = 24;
const INNER_W = 28;
const MIN_ROWS = 2;

const SIZE_BUDGET: Record<PanelSize, number> = {
  splash: 1.0,
  half: 0.5,
  wide: 0.33,
  small: 0.15,
};

function extractPages(elements: ScriptElement[]): PageData[] {
  const pages: PageData[] = [];
  let pageNum = 0;
  let panelNum = 0;

  for (const element of elements) {
    if (element.type === 'page') {
      pageNum += 1;
      panelNum = 0;
      pages.push({ pageNum, panels: [] });
      continue;
    }

    if (element.type !== 'panel') continue;

    if (pages.length === 0) {
      pageNum = 1;
      pages.push({ pageNum, panels: [] });
    }

    panelNum += 1;
    pages[pages.length - 1].panels.push({
      panelNum,
      size: element.size,
      text: element.text,
    });
  }

  return pages;
}

function centeredLabel(content: string): string {
  const trimmed = content.length > INNER_W ? content.slice(0, INNER_W) : content;
  const pad = Math.max(0, INNER_W - trimmed.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `${' '.repeat(left)}${trimmed}${' '.repeat(right)}`;
}

function renderPageGrid(page: PageData): { lines: string; overflow: boolean } {
  if (page.panels.length === 0) {
    const lines = [`┌${'─'.repeat(INNER_W)}┐`];
    for (let i = 0; i < PAGE_ROWS; i++) lines.push(`│${' '.repeat(INNER_W)}│`);
    lines.push(`└${'─'.repeat(INNER_W)}┘`);
    return { lines: lines.join('\n'), overflow: false };
  }

  const explicit = page.panels.filter((panel) => panel.size);
  const implicit = page.panels.filter((panel) => !panel.size);
  const explicitTotal = explicit.reduce((sum, panel) => sum + SIZE_BUDGET[panel.size!], 0);
  const implicitEach = implicit.length > 0
    ? (explicit.length === 0 ? 1 / page.panels.length : Math.max(0, (1 - explicitTotal) / implicit.length))
    : 0;

  const fractions = page.panels.map((panel) => (
    panel.size ? SIZE_BUDGET[panel.size] : implicitEach
  ));
  const overflow = fractions.reduce((sum, value) => sum + value, 0) > 1.05;

  const rows = fractions.map((fraction) => Math.max(MIN_ROWS, Math.round(fraction * PAGE_ROWS)));

  let diff = PAGE_ROWS - rows.reduce((sum, rowCount) => sum + rowCount, 0);
  while (diff !== 0) {
    let targetIndex = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] > rows[targetIndex]) targetIndex = i;
    }

    if (diff > 0) {
      rows[targetIndex] += 1;
      diff -= 1;
    } else {
      if (rows[targetIndex] <= MIN_ROWS) break;
      rows[targetIndex] -= 1;
      diff += 1;
    }
  }

  const lines: string[] = [];
  for (let i = 0; i < page.panels.length; i++) {
    const panel = page.panels[i];
    const panelRows = rows[i];
    const label = `Panel ${panel.panelNum}${panel.size ? ` [${panel.size.toUpperCase()}]` : ''}`;
    const labelRow = Math.floor((panelRows - 1) / 2);

    if (i === 0) {
      lines.push(`┌${'─'.repeat(INNER_W)}┐`);
    } else {
      lines.push(`├${'─'.repeat(INNER_W)}┤`);
    }

    for (let row = 0; row < panelRows; row++) {
      if (row === labelRow) {
        lines.push(`│${centeredLabel(label)}│`);
      } else {
        lines.push(`│${' '.repeat(INNER_W)}│`);
      }
    }
  }
  lines.push(`└${'─'.repeat(INNER_W)}┘`);

  return { lines: lines.join('\n'), overflow };
}

export default function PanelMapPreview({ elements }: PanelMapPreviewProps) {
  const { colors, mono } = useTheme();
  const pages = useMemo(() => extractPages(elements), [elements]);

  return (
    <ScrollView className="flex-1" style={{ padding: 12 }}>
      {pages.map((page) => {
        const { lines, overflow } = renderPageGrid(page);
        return (
          <View key={page.pageNum} className="mb-4">
            <Text
              style={{
                fontFamily: mono,
                fontSize: 10,
                color: overflow ? colors.error : colors.muted,
                marginBottom: 4,
              }}
            >
              Page {page.pageNum}{overflow ? '  OVER' : ''}
            </Text>
            <Text
              style={{
                fontFamily: mono,
                fontSize: 10,
                lineHeight: 12,
                color: overflow ? colors.error : colors.text,
              }}
            >
              {lines}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
