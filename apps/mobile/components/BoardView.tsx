import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fromNativeEvent, fromWebEvent, isWeb, shouldIgnoreNativeTextInputKey, subscribeNativeKeys, type KeyInfo } from '../lib/keyboard';
import { generateId } from './ScriptView';

export interface BeatNode {
  id: string;
  text: string;
  col: number;
  row: number;
  parentId: string | null;
  relation: 'sequence' | 'fork' | 'outcome';
  children: string[];
}

interface BoardViewProps {
  beats: BeatNode[];
  onBeatsChange: (beats: BeatNode[]) => void;
  isFocused: boolean;
  nameInputRef: React.RefObject<TextInput | null>;
  firstInputRef?: React.RefObject<TextInput | null>;
}

type BoardMode = 'edit' | 'overview';
type BoardDirection = 'horizontal' | 'vertical';

const INNER_WIDTH = 20;
const MAX_TEXT = 60;
const CONTENT_LINES = 3;
const CONNECTOR_WIDTH = 7;
const VERTICAL_PADDING_ROWS = 4;

function createRootBeat(): BeatNode {
  return {
    id: generateId(),
    text: '',
    col: 0,
    row: 0,
    parentId: null,
    relation: 'sequence',
    children: [],
  };
}

function clampBeatText(input: string): string {
  return input.replace(/\n/g, ' ').slice(0, MAX_TEXT);
}

function padRight(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + ' '.repeat(width - text.length);
}

function wrapToLines(text: string, width: number, lines: number): string[] {
  const raw = text.trim();
  if (!raw) return Array.from({ length: lines }, () => ' '.repeat(width));

  const words = raw.split(/\s+/);
  const out: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    if (word.length > width) {
      if (current) {
        out.push(padRight(current, width));
        current = '';
      }
      let remaining = word;
      while (remaining.length > width && out.length < lines) {
        out.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
      if (remaining && out.length < lines) {
        current = remaining;
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      out.push(padRight(current, width));
      current = word;
    }

    if (out.length >= lines) break;
  }

  if (out.length < lines && current) out.push(padRight(current, width));
  while (out.length < lines) out.push(' '.repeat(width));
  return out.slice(0, lines);
}

function normalizeBeats(input: BeatNode[]): BeatNode[] {
  const map = new Map(input.map((beat) => [beat.id, { ...beat, text: clampBeatText(beat.text), children: [...beat.children] }]));

  for (const beat of map.values()) {
    beat.children = beat.children.filter((id) => map.has(id));
  }

  for (const beat of map.values()) {
    if (!beat.parentId) continue;
    const parent = map.get(beat.parentId);
    if (!parent) {
      beat.parentId = null;
      continue;
    }
    if (!parent.children.includes(beat.id)) parent.children.push(beat.id);
  }

  const roots = [...map.values()].filter((beat) => beat.parentId === null);
  if (roots.length === 0) {
    return [createRootBeat()];
  }

  return [...map.values()];
}

function threadRootFor(beat: BeatNode, beatMap: Map<string, BeatNode>): BeatNode {
  let cursor = beat;
  while (cursor.parentId) {
    const parent = beatMap.get(cursor.parentId);
    if (!parent || parent.row !== cursor.row) break;
    cursor = parent;
  }
  return cursor;
}

function sequenceChildFor(beat: BeatNode, beatMap: Map<string, BeatNode>): BeatNode | null {
  for (const childId of beat.children) {
    const child = beatMap.get(childId);
    if (!child) continue;
    if (child.row === beat.row && child.relation === 'sequence') return child;
  }
  for (const childId of beat.children) {
    const child = beatMap.get(childId);
    if (!child) continue;
    if (child.row === beat.row) return child;
  }
  return null;
}

function isEmptyBeat(beat: BeatNode): boolean {
  return beat.text.trim().length === 0;
}

export default function BoardView({ beats, onBeatsChange, isFocused, nameInputRef, firstInputRef }: BoardViewProps) {
  const { colors, mono } = useTheme();
  const [mode, setMode] = useState<BoardMode>('edit');
  const [direction, setDirection] = useState<BoardDirection>('horizontal');
  const [focusedId, setFocusedId] = useState<string | null>(beats[0]?.id ?? null);
  const [showLabels, setShowLabels] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [measuredCharWidth, setMeasuredCharWidth] = useState<number>(0);

  const latestBeatsRef = useRef<BeatNode[]>(beats);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const hiddenInputRef = useRef<TextInput | null>(null);
  const horizontalRef = useRef<ScrollView>(null);
  const verticalRef = useRef<ScrollView>(null);

  useEffect(() => {
    latestBeatsRef.current = beats;
  }, [beats]);

  useEffect(() => {
    if (beats.length === 0) {
      const root = createRootBeat();
      onBeatsChange([root]);
      setFocusedId(root.id);
      return;
    }
    if (!focusedId || !beats.some((beat) => beat.id === focusedId)) {
      setFocusedId(beats[0].id);
    }
  }, [beats, focusedId, onBeatsChange]);

  const normalizedBeats = useMemo(() => normalizeBeats(beats), [beats]);

  const beatMap = useMemo(() => new Map(normalizedBeats.map((beat) => [beat.id, beat])), [normalizedBeats]);

  const focusedBeat = focusedId ? beatMap.get(focusedId) ?? null : null;

  const minRow = useMemo(() => {
    if (normalizedBeats.length === 0) return 0;
    return Math.min(...normalizedBeats.map((beat) => beat.row));
  }, [normalizedBeats]);

  const maxRow = useMemo(() => {
    if (normalizedBeats.length === 0) return 0;
    return Math.max(...normalizedBeats.map((beat) => beat.row));
  }, [normalizedBeats]);

  const maxCol = useMemo(() => {
    if (normalizedBeats.length === 0) return 0;
    return Math.max(...normalizedBeats.map((beat) => beat.col));
  }, [normalizedBeats]);

  const rows = useMemo(() => {
    const out: number[] = [];
    const padMin = Math.min(minRow, -VERTICAL_PADDING_ROWS);
    const padMax = Math.max(maxRow, VERTICAL_PADDING_ROWS);
    for (let row = padMin; row <= padMax; row += 1) out.push(row);
    return out;
  }, [minRow, maxRow]);

  const cols = useMemo(() => {
    const out: number[] = [];
    for (let col = 0; col <= maxCol; col += 1) out.push(col);
    return out;
  }, [maxCol]);

  const byPos = useMemo(() => {
    const map = new Map<string, BeatNode>();
    for (const beat of normalizedBeats) {
      map.set(`${beat.col}:${beat.row}`, beat);
    }
    return map;
  }, [normalizedBeats]);

  const fontSize = mode === 'edit' ? 12 : 8;
  const lineHeight = mode === 'edit' ? 16 : 11;
  const charWidth = measuredCharWidth > 0 ? measuredCharWidth : fontSize * 0.62;
  const cardLines = showLabels ? 6 : 5;
  const GAP_LINES = 1;
  const CONNECTOR_BAND_HEIGHT = 3;
  const rowHeight = lineHeight * (cardLines + GAP_LINES);
  const colWidth = (INNER_WIDTH + 2 + CONNECTOR_WIDTH) * charWidth + 18;

  function scrollToFocused(targetId: string) {
    const beat = beatMap.get(targetId);
    if (!beat) return;
    const firstRow = rows[0] ?? minRow;
    const rowIndex = beat.row - firstRow;
    if (direction === 'horizontal') {
      const x = Math.max(0, beat.col * colWidth - 32);
      const centerOffset = viewportHeight > 0 ? (viewportHeight / 2) - (rowHeight / 2) : 24;
      const y = Math.max(0, rowIndex * rowHeight - centerOffset);
      horizontalRef.current?.scrollTo({ x, animated: true });
      verticalRef.current?.scrollTo({ y, animated: true });
      return;
    }
    const centerOffsetX = viewportWidth > 0 ? (viewportWidth / 2) - (colWidth / 2) : 24;
    const x = Math.max(0, rowIndex * colWidth - centerOffsetX);
    const depthHeight = rowHeight + CONNECTOR_BAND_HEIGHT * lineHeight;
    const centerOffsetY = viewportHeight > 0 ? (viewportHeight / 2) - (rowHeight / 2) : 24;
    const y = Math.max(0, beat.col * depthHeight - centerOffsetY);
    horizontalRef.current?.scrollTo({ x, animated: true });
    verticalRef.current?.scrollTo({ y, animated: true });
  }

  useEffect(() => {
    if (!focusedId) return;
    scrollToFocused(focusedId);
  }, [focusedId, mode, direction, beatMap, minRow, rowHeight, rows, viewportHeight, viewportWidth, colWidth]);

  useEffect(() => {
    if (viewportHeight <= 0 && viewportWidth <= 0) return;
    const singleRoot = normalizedBeats.length === 1 && normalizedBeats[0]?.row === 0;
    if (!singleRoot) return;
    const firstRow = rows[0] ?? 0;
    const rowIndex = 0 - firstRow;
    if (direction === 'horizontal') {
      const y = Math.max(0, rowIndex * rowHeight - ((viewportHeight / 2) - (rowHeight / 2)));
      verticalRef.current?.scrollTo({ y, animated: false });
      return;
    }
    const x = Math.max(0, rowIndex * colWidth - ((viewportWidth / 2) - (colWidth / 2)));
    horizontalRef.current?.scrollTo({ x, animated: false });
  }, [normalizedBeats, rows, rowHeight, viewportHeight, viewportWidth, direction, colWidth]);

  useEffect(() => {
    if (!isFocused) return;
    if (mode === 'edit' && focusedId) {
      setTimeout(() => inputRefs.current[focusedId]?.focus(), 0);
      return;
    }
    if (mode === 'overview') {
      setTimeout(() => hiddenInputRef.current?.focus(), 0);
    }
  }, [isFocused, mode, focusedId]);

  useEffect(() => {
    if (!focusedId || !firstInputRef) return;
    firstInputRef.current = inputRefs.current[focusedId];
  }, [focusedId, firstInputRef, mode, normalizedBeats]);

  function applyMutation(mutator: (current: BeatNode[]) => { next: BeatNode[]; focusId?: string | null }) {
    const current = normalizeBeats(latestBeatsRef.current);
    const { next, focusId } = mutator(current);
    const normalized = normalizeBeats(next);
    latestBeatsRef.current = normalized;
    onBeatsChange(normalized);
    if (focusId) setFocusedId(focusId);
    else if (normalized[0]) setFocusedId(normalized[0].id);
  }

  function allOccupiedRows(current: BeatNode[]): Set<number> {
    return new Set(current.map((beat) => beat.row));
  }

  function pickRowNear(current: BeatNode[], col: number, baseRow: number, direction: -1 | 1): number {
    const occupied = allOccupiedRows(current);
    let step = 1;
    while (step < 5000) {
      const candidate = baseRow + (direction * step);
      if (!occupied.has(candidate)) return candidate;
      step += 1;
    }
    return baseRow + direction;
  }

  function updateFocusedText(nextText: string) {
    if (!focusedId) return;
    applyMutation((current) => {
      const next = current.map((beat) => beat.id === focusedId ? { ...beat, text: nextText } : beat);
      return { next, focusId: focusedId };
    });
  }

  function createChild(current: BeatNode[], parent: BeatNode, relation: 'sequence' | 'fork' | 'outcome', row: number): BeatNode[] {
    const child: BeatNode = {
      id: generateId(),
      text: '',
      col: parent.col + 1,
      row,
      parentId: parent.id,
      relation,
      children: [],
    };
    return current.map((beat) => beat.id === parent.id ? { ...beat, children: [...beat.children, child.id] } : beat).concat(child);
  }

  function findNearestInColumn(current: BeatNode[], col: number, fromRow: number, direction: -1 | 1): BeatNode | null {
    const options = current
      .filter((beat) => beat.col === col && (direction < 0 ? beat.row < fromRow : beat.row > fromRow))
      .sort((a, b) => direction < 0 ? b.row - a.row : a.row - b.row);
    return options[0] ?? null;
  }

  function createOrFocusSequence() {
    if (!focusedId) return;
    applyMutation((current) => {
      const map = new Map(current.map((beat) => [beat.id, beat]));
      const currentBeat = map.get(focusedId);
      if (!currentBeat) return { next: current };

      const existing = sequenceChildFor(currentBeat, map);
      if (existing) return { next: current, focusId: existing.id };

      const next = createChild(current, currentBeat, 'sequence', currentBeat.row);
      const created = next[next.length - 1];
      return { next, focusId: created.id };
    });
  }

  function collectSubtree(beatId: string, map: Map<string, BeatNode>): string[] {
    const ids: string[] = [beatId];
    const beat = map.get(beatId);
    if (!beat) return ids;
    for (const childId of beat.children) {
      ids.push(...collectSubtree(childId, map));
    }
    return ids;
  }

  function forkThread() {
    if (!focusedId) return;
    applyMutation((current) => {
      const map = new Map(current.map((beat) => [beat.id, beat]));
      const currentBeat = map.get(focusedId);
      if (!currentBeat) return { next: current };

      // First fork from a beat with a same-row sequence child: center the split
      const seqChild = sequenceChildFor(currentBeat, map);
      const offRowChildren = currentBeat.children.filter((id) => {
        const child = map.get(id);
        return child && child.row !== currentBeat.row;
      });

      if (seqChild && offRowChildren.length === 0) {
        const subtreeIds = new Set(collectSubtree(seqChild.id, map));
        const shiftedPositions = new Set<string>();
        for (const id of subtreeIds) {
          const beat = map.get(id);
          if (beat) shiftedPositions.add(`${beat.col}:${beat.row - 1}`);
        }
        const collides = current.some((beat) =>
          !subtreeIds.has(beat.id) && shiftedPositions.has(`${beat.col}:${beat.row}`)
        );

        if (!collides) {
          let next = current.map((beat) =>
            subtreeIds.has(beat.id) ? { ...beat, row: beat.row - 1 } : beat
          );
          const newRow = pickRowNear(next, currentBeat.col + 1, currentBeat.row, 1);
          next = createChild(next, currentBeat, 'fork', newRow);
          const created = next[next.length - 1];
          return { next, focusId: created.id };
        }
      }

      // Default: fork downward
      const newRow = pickRowNear(current, currentBeat.col + 1, currentBeat.row, 1);
      const next = createChild(current, currentBeat, 'fork', newRow);
      const created = next[next.length - 1];
      return { next, focusId: created.id };
    });
  }

  function moveToParent() {
    if (!focusedBeat?.parentId) return;
    setFocusedId(focusedBeat.parentId);
  }

  function moveRight() {
    if (!focusedBeat) return;
    const next = sequenceChildFor(focusedBeat, beatMap);
    if (next) { setFocusedId(next.id); return; }
    // No same-row child — pick the child closest to our row
    let closest: BeatNode | null = null;
    let closestDist = Infinity;
    for (const childId of focusedBeat.children) {
      const child = beatMap.get(childId);
      if (!child) continue;
      const dist = Math.abs(child.row - focusedBeat.row);
      if (dist < closestDist) { closestDist = dist; closest = child; }
    }
    if (closest) setFocusedId(closest.id);
  }

  function jumpAlong(direction: -1 | 1) {
    if (!focusedBeat) return;
    let cursor: BeatNode | null = focusedBeat;
    for (let i = 0; i < 5; i += 1) {
      if (!cursor) break;
      if (direction > 0) {
        const next = sequenceChildFor(cursor, beatMap);
        if (!next) break;
        cursor = next;
      } else {
        if (!cursor.parentId) break;
        const parent: BeatNode | null = beatMap.get(cursor.parentId) ?? null;
        cursor = parent;
      }
    }
    if (cursor) setFocusedId(cursor.id);
  }

  function navigateVertical(direction: -1 | 1) {
    if (!focusedBeat) return;
    const existing = findNearestInColumn(normalizedBeats, focusedBeat.col, focusedBeat.row, direction);
    if (existing) setFocusedId(existing.id);
  }

  function createOutcome(direction: -1 | 1) {
    if (!focusedId) return;
    applyMutation((current) => {
      const currentBeat = current.find((beat) => beat.id === focusedId);
      if (!currentBeat) return { next: current };

      const newRow = pickRowNear(current, currentBeat.col + 1, currentBeat.row, direction);
      const next = createChild(current, currentBeat, 'outcome', newRow);
      const created = next[next.length - 1];
      return { next, focusId: created.id };
    });
  }

  function deleteFocusedBeatIfEmpty() {
    if (!focusedId) return;
    applyMutation((current) => {
      const map = new Map(current.map((beat) => [beat.id, beat]));
      const target = map.get(focusedId);
      if (!target || !isEmptyBeat(target)) return { next: current, focusId: focusedId };
      if (current.length <= 1) return { next: [createRootBeat()] };
      if (target.children.length > 0) return { next: current, focusId: focusedId };

      const next = current
        .filter((beat) => beat.id !== target.id)
        .map((beat) => beat.id === target.parentId ? { ...beat, children: beat.children.filter((id) => id !== target.id) } : beat);

      const focusId = target.parentId ?? next[0]?.id ?? null;
      return { next, focusId };
    });
  }

  function deleteThreadIfSingleBeat() {
    if (!focusedId) return;
    applyMutation((current) => {
      const map = new Map(current.map((beat) => [beat.id, beat]));
      const target = map.get(focusedId);
      if (!target) return { next: current };
      if (!target.parentId || target.children.length > 0) return { next: current };

      const root = threadRootFor(target, map);
      const nextInThread = sequenceChildFor(root, map);
      if (nextInThread) return { next: current, focusId: focusedId };

      const next = current
        .filter((beat) => beat.id !== root.id)
        .map((beat) => beat.id === root.parentId ? { ...beat, children: beat.children.filter((id) => id !== root.id) } : beat);

      if (next.length === 0) return { next: [createRootBeat()] };
      return { next, focusId: root.parentId ?? next[0].id };
    });
  }

  // Compute directional connectivity for a cell's connector area
  function connectorInfo(col: number, row: number): { hasUp: boolean; hasDown: boolean; hasLeft: boolean; hasRight: boolean } {
    if (col === 0) return { hasUp: false, hasDown: false, hasLeft: false, hasRight: false };

    let hasUp = false;
    let hasDown = false;
    let hasLeft = false;

    for (const b of normalizedBeats) {
      if (b.col !== col) continue;
      if (!b.parentId) continue;
      const parent = beatMap.get(b.parentId);
      if (!parent || parent.col !== col - 1) continue;
      const parentRow = parent.row;
      const childRow = b.row;

      if (parentRow === childRow) {
        continue;
      }

      const low = Math.min(parentRow, childRow);
      const high = Math.max(parentRow, childRow);

      // Interior of this specific segment gets continuous vertical pipe.
      if (row > low && row < high) {
        hasUp = true;
        hasDown = true;
      }

      // Parent junction: line from left and vertical branch toward child.
      if (row === parentRow) {
        hasLeft = true;
        if (childRow < parentRow) hasUp = true;
        if (childRow > parentRow) hasDown = true;
      }

      // Child landing row: branch arrives vertically at this row.
      if (row === childRow) {
        if (parentRow < childRow) hasUp = true;
        if (parentRow > childRow) hasDown = true;
      }
    }

    const beat = byPos.get(`${col}:${row}`) ?? null;
    const beatParent = beat?.parentId ? beatMap.get(beat.parentId) : null;
    const beatFromLeft = !!beatParent && beatParent.col === col - 1;
    const hasRight = !!beat && beatFromLeft;

    return {
      hasUp,
      hasDown,
      hasLeft: hasLeft || (beatFromLeft && beatParent?.row === row),
      hasRight,
    };
  }

  // Pick the right box-drawing junction character based on directional connections
  function junctionChar(up: boolean, down: boolean, left: boolean, right: boolean): string {
    if (up && down && left && right) return '┼';
    if (up && down && left) return '┤';
    if (up && down && right) return '├';
    if (up && left && right) return '┴';
    if (down && left && right) return '┬';
    if (up && down) return '│';
    if (left && right) return '─';
    if (down && left) return '┐';
    if (down && right) return '┌';
    if (up && left) return '┘';
    if (up && right) return '└';
    if (up || down) return '│';
    if (left || right) return '─';
    return ' ';
  }

  const handleKeyRef = useRef<(info: KeyInfo) => void>(undefined);
  handleKeyRef.current = (info: KeyInfo) => {
    if (!isFocused) return;
    if (!focusedBeat) return;

    if (mode === 'edit') {
      if (info.key === '`' && !info.shift && !info.alt && !info.meta && !info.ctrl) {
        info.prevent();
        setMode('overview');
        return;
      }

      if (info.key === 'Enter' && !info.shift && !info.alt && !info.meta && !info.ctrl) {
        info.prevent();
        createOrFocusSequence();
        return;
      }

      if (info.key === 'Tab' && !info.shift) {
        info.prevent();
        forkThread();
        return;
      }

      if (info.key === 'Tab' && info.shift) {
        info.prevent();
        deleteThreadIfSingleBeat();
        return;
      }

      const parentKey = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const childKey = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      const forkPrevKey = direction === 'horizontal' ? 'ArrowUp' : 'ArrowLeft';
      const forkNextKey = direction === 'horizontal' ? 'ArrowDown' : 'ArrowRight';
      const jumpPrevKey = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const jumpNextKey = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

      if ((info.meta || info.ctrl) && info.key === parentKey) {
        info.prevent();
        moveToParent();
        return;
      }

      if ((info.meta || info.ctrl) && info.key === childKey) {
        info.prevent();
        moveRight();
        return;
      }

      if ((info.meta || info.ctrl) && info.shift && info.key === forkPrevKey) {
        info.prevent();
        createOutcome(-1);
        return;
      }

      if ((info.meta || info.ctrl) && info.shift && info.key === forkNextKey) {
        info.prevent();
        createOutcome(1);
        return;
      }

      if ((info.meta || info.ctrl) && info.key === forkPrevKey) {
        info.prevent();
        navigateVertical(-1);
        return;
      }

      if ((info.meta || info.ctrl) && info.key === forkNextKey) {
        info.prevent();
        navigateVertical(1);
        return;
      }

      if (info.alt && info.key === jumpPrevKey) {
        info.prevent();
        jumpAlong(-1);
        return;
      }

      if (info.alt && info.key === jumpNextKey) {
        info.prevent();
        jumpAlong(1);
        return;
      }

      if (info.key === 'Backspace' && isEmptyBeat(focusedBeat)) {
        info.prevent();
        deleteFocusedBeatIfEmpty();
      }
      return;
    }

    if (mode === 'overview') {
      if (info.key === 'Enter' || info.key === 'NumpadEnter') {
        info.prevent();
        setMode('edit');
        return;
      }
      if (info.key === 'v' || info.key === 'V') {
        info.prevent();
        setDirection((d) => (d === 'horizontal' ? 'vertical' : 'horizontal'));
        return;
      }
      if (info.key === 'b' || info.key === 'B') {
        info.prevent();
        setShowLabels((prev) => !prev);
        return;
      }
      const parentKey = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const childKey = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      const forkPrevKey = direction === 'horizontal' ? 'ArrowUp' : 'ArrowLeft';
      const forkNextKey = direction === 'horizontal' ? 'ArrowDown' : 'ArrowRight';
      const jumpPrevKey = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const jumpNextKey = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

      if (info.key === parentKey) { info.prevent(); moveToParent(); return; }
      if (info.key === childKey) { info.prevent(); moveRight(); return; }
      if (info.key === forkPrevKey) { info.prevent(); const next = findNearestInColumn(normalizedBeats, focusedBeat.col, focusedBeat.row, -1); if (next) setFocusedId(next.id); return; }
      if (info.key === forkNextKey) { info.prevent(); const next = findNearestInColumn(normalizedBeats, focusedBeat.col, focusedBeat.row, 1); if (next) setFocusedId(next.id); return; }
      if (info.alt && info.key === jumpPrevKey) { info.prevent(); jumpAlong(-1); return; }
      if (info.alt && info.key === jumpNextKey) { info.prevent(); jumpAlong(1); return; }

    }
  };

  useEffect(() => {
    if (!isWeb) return;
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement;
      const nameEl = nameInputRef.current as unknown as HTMLElement;
      if (nameEl && (active === nameEl || (nameEl as any)?.contains?.(active))) return;

      const activeInput = focusedId ? (inputRefs.current[focusedId] as unknown as HTMLElement | null) : null;
      const hiddenInputEl = hiddenInputRef.current as unknown as HTMLElement | null;

      if (mode === 'edit' && activeInput && active !== activeInput) return;
      // In overview we intentionally allow document-level handling even when the
      // hidden input is not the active element, so Enter and navigation remain
      // reliable after mode switches/layout toggles.
      if (mode === 'overview' && hiddenInputEl && active === nameEl) return;

      handleKeyRef.current?.(fromWebEvent(e));
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [mode, focusedId, nameInputRef]);

  useEffect(() => {
    if (isWeb) return;
    return subscribeNativeKeys((info) => {
      handleKeyRef.current?.(info);
    });
  }, []);

  function nativeKeyPress(e: any) {
    if (isWeb) return;
    const info = fromNativeEvent(e);
    if (shouldIgnoreNativeTextInputKey(info)) return;
    handleKeyRef.current?.(info);
  }

  // ── Build the entire grid as text lines ─────────────────────────────
  // Horizontal path is unchanged. Vertical path uses explicit connector bands
  // between depth bands so fork trunks can span through empty card areas.
  const CELL_WIDTH = CONNECTOR_WIDTH + INNER_WIDTH + 2; // connector + left border + content + right border

  const gridLines = useMemo(() => {
    const linesPerRow = cardLines + GAP_LINES;
    const output: { text: string; hasContent: boolean }[] = [];
    const blankConnector = ' '.repeat(CONNECTOR_WIDTH);

    function renderCardPart(col: number, row: number, lineIdx: number): { card: string; hasContent: boolean } {
      const beat = byPos.get(`${col}:${row}`) ?? null;
      let cardChar = ' '.repeat(INNER_WIDTH + 2);
      let hasContent = false;
      if (beat && lineIdx < cardLines) {
        const contentLines = wrapToLines(beat.text, INNER_WIDTH, CONTENT_LINES);
        const isFocusedEdit = beat.id === focusedId && mode === 'edit';
        const displayLines = isFocusedEdit
          ? Array.from({ length: CONTENT_LINES }, () => ' '.repeat(INNER_WIDTH))
          : contentLines;

        if (lineIdx === 0) {
          cardChar = `┌${'─'.repeat(INNER_WIDTH)}┐`;
        } else if (showLabels && lineIdx === 1) {
          cardChar = `│${padRight(`BEAT ${beat.col + 1}`, INNER_WIDTH)}│`;
        } else if (lineIdx === cardLines - 1) {
          cardChar = `└${'─'.repeat(INNER_WIDTH)}┘`;
        } else {
          const contentIdx = lineIdx - (showLabels ? 2 : 1);
          if (contentIdx >= 0 && contentIdx < CONTENT_LINES) {
            cardChar = `│${displayLines[contentIdx]}│`;
            hasContent = true;
          } else {
            cardChar = `│${' '.repeat(INNER_WIDTH)}│`;
          }
        }
      }

      return { card: cardChar, hasContent };
    }

    if (direction === 'horizontal') {
      function renderHorizontalCell(col: number, row: number, lineIdx: number): { connector: string; card: string; hasContent: boolean } {
        const info = connectorInfo(col, row);
        const { hasUp, hasDown, hasLeft, hasRight } = info;
        const hasVertical = hasUp || hasDown;
        const card = renderCardPart(col, row, lineIdx);

        let connChar = ' '.repeat(CONNECTOR_WIDTH);
        if (lineIdx < cardLines) {
          const centerLine = showLabels ? 2 : 1;
          if (lineIdx === centerLine && (hasLeft || hasRight || hasVertical)) {
            const left3 = hasLeft ? '───' : '   ';
            const right3 = hasRight ? '───' : '   ';
            const center = junctionChar(hasUp, hasDown, hasLeft, hasRight);
            connChar = `${left3}${center}${right3}`;
          } else if (lineIdx < centerLine && hasUp) {
            connChar = '   │   ';
          } else if (lineIdx > centerLine && hasDown) {
            connChar = '   │   ';
          }
        } else if (hasDown) {
          connChar = '   │   ';
        }

        return { connector: connChar, card: card.card, hasContent: card.hasContent };
      }

      for (const row of rows) {
        for (let lineIdx = 0; lineIdx < linesPerRow; lineIdx++) {
          let fullLine = '';
          let hasContent = false;
          for (const col of cols) {
            const cell = renderHorizontalCell(col, row, lineIdx);
            fullLine += cell.connector + cell.card;
            if (cell.hasContent) hasContent = true;
          }
          output.push({ text: fullLine, hasContent });
        }
      }
      return output;
    }

    // Vertical mode:
    // [card band col 0]
    // [connector band col 0->1]
    // [card band col 1]
    // ...
    const transitionEdges = new Map<number, Array<{ parentRow: number; childRow: number }>>();
    for (const beat of normalizedBeats) {
      if (beat.col <= 0 || !beat.parentId) continue;
      const parent = beatMap.get(beat.parentId);
      if (!parent || parent.col !== beat.col - 1) continue;
      const key = parent.col;
      const list = transitionEdges.get(key) ?? [];
      list.push({ parentRow: parent.row, childRow: beat.row });
      transitionEdges.set(key, list);
    }

    const cardCenter = CONNECTOR_WIDTH + Math.floor((INNER_WIDTH + 2) / 2);

    function isRowInSpan(edges: Array<{ parentRow: number; childRow: number }>, r: number): boolean {
      return edges.some((edge) => {
        if (edge.parentRow === edge.childRow) return false;
        const low = Math.min(edge.parentRow, edge.childRow);
        const high = Math.max(edge.parentRow, edge.childRow);
        return r >= low && r <= high;
      });
    }

    function verticalConnectorBandCell(prevCol: number, row: number, bandLine: number): string {
      const edges = transitionEdges.get(prevCol) ?? [];
      if (edges.length === 0) return ' '.repeat(CELL_WIDTH);

      const hasParentDrop = edges.some((e) => e.parentRow === row);
      const hasChildRise = edges.some((e) => e.childRow === row);
      const inSpan = isRowInSpan(edges, row);

      const chars = Array.from({ length: CELL_WIDTH }, () => ' ');

      if (bandLine === 1 && inSpan) {
        const leftInSpan = isRowInSpan(edges, row - 1);
        const rightInSpan = isRowInSpan(edges, row + 1);
        const fillStart = leftInSpan ? 0 : cardCenter;
        const fillEnd = rightInSpan ? CELL_WIDTH - 1 : cardCenter;
        for (let i = fillStart; i <= fillEnd; i += 1) chars[i] = '─';
      }

      if (bandLine === 0 && hasParentDrop) chars[cardCenter] = '│';
      if (bandLine === CONNECTOR_BAND_HEIGHT - 1 && hasChildRise) chars[cardCenter] = '│';

      if (bandLine === 1) {
        let centerChar = ' ';
        if (inSpan && hasParentDrop && hasChildRise) centerChar = '┼';
        else if (inSpan && hasParentDrop) centerChar = '┬';
        else if (inSpan && hasChildRise) centerChar = '┴';
        else if (hasParentDrop || hasChildRise) centerChar = '│';
        else if (inSpan) centerChar = '─';
        if (centerChar !== ' ') chars[cardCenter] = centerChar;
      }

      return chars.join('');
    }

    for (let colIdx = 0; colIdx < cols.length; colIdx += 1) {
      const col = cols[colIdx];

      // Card band for current depth
      const nextEdges = transitionEdges.get(col) ?? [];
      for (let lineIdx = 0; lineIdx < linesPerRow; lineIdx++) {
        let fullLine = '';
        let hasContent = false;
        for (const row of rows) {
          const card = renderCardPart(col, row, lineIdx);
          if (lineIdx >= cardLines && nextEdges.length > 0) {
            // Gap line: draw vertical pipe if connection exists below
            const needsPipe = nextEdges.some((e) => e.parentRow === row);
            if (needsPipe) {
              fullLine += ' '.repeat(cardCenter) + '│' + ' '.repeat(CELL_WIDTH - cardCenter - 1);
            } else {
              fullLine += blankConnector + card.card;
            }
          } else {
            fullLine += blankConnector + card.card;
          }
          if (card.hasContent) hasContent = true;
        }
        output.push({ text: fullLine, hasContent });
      }

      // Connector band to next depth
      if (colIdx < cols.length - 1) {
        for (let bandLine = 0; bandLine < CONNECTOR_BAND_HEIGHT; bandLine += 1) {
          let fullLine = '';
          for (const row of rows) {
            fullLine += verticalConnectorBandCell(col, row, bandLine);
          }
          output.push({ text: fullLine, hasContent: false });
        }
      }
    }

    return output;
  }, [rows, cols, byPos, direction, showLabels, cardLines, normalizedBeats, beatMap, focusedId, mode]);

  // ── Compute focused beat's TextInput overlay position ───────────────
  const focusedOverlay = useMemo(() => {
    if (!focusedBeat || mode !== 'edit') return null;
    const firstRow = rows[0] ?? 0;
    const rowIdx = focusedBeat.row - firstRow;
    const colIdx = cols.indexOf(focusedBeat.col);
    if (colIdx < 0) return null;

    const linesPerRow = cardLines + GAP_LINES;
    const connectorOffset = direction === 'vertical' ? colIdx * CONNECTOR_BAND_HEIGHT : 0;
    const topLine = (direction === 'horizontal' ? rowIdx : colIdx) * linesPerRow + connectorOffset + (showLabels ? 2 : 1);
    const leftChar = (direction === 'horizontal' ? colIdx : rowIdx) * CELL_WIDTH + CONNECTOR_WIDTH + 1; // +1 for left border

    return {
      top: topLine * lineHeight,
      left: leftChar * charWidth,
      width: INNER_WIDTH * charWidth,
      height: CONTENT_LINES * lineHeight,
    };
  }, [focusedBeat, mode, direction, rows, cols, cardLines, showLabels, lineHeight, charWidth, CONNECTOR_BAND_HEIGHT]);

  // ── Highlight ranges for the focused beat ───────────────────────────
  const focusedHighlight = useMemo(() => {
    if (!focusedBeat) return null;
    const firstRow = rows[0] ?? 0;
    const rowIdx = focusedBeat.row - firstRow;
    const colIdx = cols.indexOf(focusedBeat.col);
    if (colIdx < 0) return null;

    const linesPerRow = cardLines + GAP_LINES;
    const connectorOffset = direction === 'vertical' ? colIdx * CONNECTOR_BAND_HEIGHT : 0;
    const topLine = (direction === 'horizontal' ? rowIdx : colIdx) * linesPerRow + connectorOffset;
    const leftChar = (direction === 'horizontal' ? colIdx : rowIdx) * CELL_WIDTH + CONNECTOR_WIDTH;

    return {
      startLine: topLine,
      endLine: topLine + cardLines,
      startChar: leftChar,
      endChar: leftChar + INNER_WIDTH + 2,
    };
  }, [focusedBeat, direction, rows, cols, cardLines, CONNECTOR_BAND_HEIGHT]);

  return (
    <ScrollView
      ref={verticalRef}
      className="flex-1"
      style={{ flex: 1 }}
      onLayout={(e) => {
        setViewportHeight(e.nativeEvent.layout.height);
        setViewportWidth(e.nativeEvent.layout.width);
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hidden element to measure actual monospace character width */}
      <Text
        style={{ position: 'absolute', opacity: 0, fontFamily: mono, fontSize, lineHeight }}
        onLayout={(e) => setMeasuredCharWidth(e.nativeEvent.layout.width / 10)}
      >{'MMMMMMMMMM'}</Text>

      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted }}>
          {`${mode === 'edit' ? 'edit' : 'overview'} · ${direction === 'horizontal' ? 'horizontal' : 'vertical'}`}
        </Text>
      </View>

      <ScrollView
        ref={horizontalRef}
        horizontal
        className="flex-1"
        showsHorizontalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
      >
        <View style={{ position: 'relative' }}>
          {gridLines.map((line, idx) => {
            // Check if this line overlaps with the focused beat's card
            const hl = focusedHighlight;
            if (hl && idx >= hl.startLine && idx < hl.endLine) {
              // Split line into before-highlight, highlight, after-highlight
              const before = line.text.slice(0, hl.startChar);
              const highlighted = line.text.slice(hl.startChar, hl.endChar);
              const after = line.text.slice(hl.endChar);
              return (
                <Text key={idx} style={{ fontFamily: mono, fontSize, lineHeight, color: colors.muted }}>
                  {before}
                  <Text style={{ backgroundColor: colors.selection, color: colors.text }}>{highlighted}</Text>
                  {after}
                </Text>
              );
            }
            return (
              <Text key={idx} style={{ fontFamily: mono, fontSize, lineHeight, color: colors.muted }}>
                {line.text}
              </Text>
            );
          })}

          {/* TextInput overlay for focused beat in edit mode */}
          {focusedOverlay && (
            <TextInput
              ref={(r) => {
                if (focusedId) inputRefs.current[focusedId] = r;
                if (r && firstInputRef && focusedId) {
                  firstInputRef.current = r;
                }
              }}
              value={focusedBeat?.text ?? ''}
              onChangeText={(value) => updateFocusedText(clampBeatText(value))}
              onKeyPress={nativeKeyPress}
              multiline
              maxLength={MAX_TEXT}
              submitBehavior="submit"
              placeholder=""
              style={{
                position: 'absolute',
                top: focusedOverlay.top,
                left: focusedOverlay.left,
                width: focusedOverlay.width,
                height: focusedOverlay.height,
                fontFamily: mono,
                fontSize,
                lineHeight,
                color: colors.text,
                padding: 0,
                margin: 0,
                textAlignVertical: 'top',
                backgroundColor: colors.selection,
                ...(isWeb ? { outlineStyle: 'none' as any } : {}),
              }}
            />
          )}
        </View>
      </ScrollView>

      <TextInput
        ref={hiddenInputRef}
        value=""
        onChangeText={() => {}}
        onKeyPress={nativeKeyPress}
        style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      />
    </ScrollView>
  );
}
