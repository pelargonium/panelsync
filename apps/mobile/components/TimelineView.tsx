import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { generateId } from './ScriptView';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  dateline: string;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  onEventsChange: (events: TimelineEvent[]) => void;
  isFocused: boolean;
  nameInputRef: React.RefObject<TextInput | null>;
}

export default function TimelineView({ events, onEventsChange, isFocused, nameInputRef }: TimelineViewProps) {
  const { colors, mono } = useTheme();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeField, setActiveField] = useState<'title' | 'dateline' | 'description'>('title');
  const [spineMode, setSpineMode] = useState(false);
  const [spinePosition, setSpinePosition] = useState({ index: 0, at: 'event' as 'event' | 'midpoint' });
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const inputRefs = useRef<Record<string, TextInput>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  // Event mutation helpers
  function addEvent(afterIndex?: number) {
    const newEvent = { id: generateId(), title: '', description: '', dateline: '' };
    const next = [...events];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : events.length;
    next.splice(insertAt, 0, newEvent);
    onEventsChange(next);
    setFocusedIndex(insertAt);
    setActiveField('title');
    setSpineMode(false);
  }

  function updateEvent(index: number, patch: Partial<TimelineEvent>) {
    onEventsChange(events.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function deleteEvent(index: number) {
    const next = events.filter((_, i) => i !== index);
    setDeleteConfirmIndex(null);
    if (next.length === 0) {
      const blank = { id: generateId(), title: '', description: '', dateline: '' };
      onEventsChange([blank]);
      setSpineMode(false);
      setFocusedIndex(0);
      setActiveField('title');
    } else {
      onEventsChange(next);
      const newIndex = Math.min(index, next.length - 1);
      setSpinePosition({ index: newIndex, at: 'event' });
    }
  }

  // Auto-focus logic
  useEffect(() => {
    if (isFocused && !spineMode) {
      const event = events[focusedIndex];
      if (event) {
        const key = `${event.id}-${activeField}`;
        const input = inputRefs.current[key];
        setTimeout(() => input?.focus(), 0);
      }
    }
  }, [isFocused, spineMode, focusedIndex, activeField, events]);

  // Keyboard handler
  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  keyRef.current = (e: KeyboardEvent) => {
    if (!isFocused || Platform.OS !== 'web') return;

    const activeElement = document.activeElement;
    const isEditing = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

    if (spineMode) {
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
          if (e.altKey && e.shiftKey) {
            // Jump 5 spine positions (alternating event/midpoint)
            setSpinePosition(p => {
              let pos = { ...p };
              for (let step = 0; step < 5; step++) {
                if (pos.at === 'midpoint') { pos = { index: pos.index, at: 'event' }; }
                else if (pos.index > 0) { pos = { index: pos.index - 1, at: 'midpoint' }; }
                else break;
              }
              return pos;
            });
            break;
          }
          if (spinePosition.at === 'midpoint') { setSpinePosition({ index: spinePosition.index, at: 'event' }); }
          else if (spinePosition.index > 0) { setSpinePosition({ index: spinePosition.index - 1, at: 'midpoint' }); }
          break;
        case 'ArrowDown':
          if (e.altKey && e.shiftKey) {
            const lastIndex = events.length - 1;
            setSpinePosition(p => {
              let pos = { ...p };
              for (let step = 0; step < 5; step++) {
                if (pos.at === 'event' && pos.index < lastIndex) { pos = { index: pos.index, at: 'midpoint' }; }
                else if (pos.at === 'midpoint') { pos = { index: pos.index + 1, at: 'event' }; }
                else break;
              }
              return pos;
            });
            break;
          }
          if (spinePosition.at === 'event' && spinePosition.index < events.length - 1) { setSpinePosition({ index: spinePosition.index, at: 'midpoint' }); }
          else if (spinePosition.at === 'midpoint') { setSpinePosition({ index: spinePosition.index + 1, at: 'event' }); }
          break;
        case 'ArrowRight':
          setSpineMode(false);
          if (spinePosition.at === 'midpoint') { addEvent(spinePosition.index); }
          else { setFocusedIndex(spinePosition.index); setActiveField('title'); }
          break;
        case 'Delete': case 'Backspace':
          if (spinePosition.at === 'event') {
            if (deleteConfirmIndex === spinePosition.index) { deleteEvent(spinePosition.index); }
            else { setDeleteConfirmIndex(spinePosition.index); }
          }
          break;
        case 'Escape':
          if (deleteConfirmIndex !== null) { setDeleteConfirmIndex(null); break; }
          setSpineMode(false);
          setFocusedIndex(spinePosition.index);
          setActiveField('title');
          break;
      }
      // y/n for delete confirm
      if (deleteConfirmIndex !== null) {
        if (e.key === 'y') { deleteEvent(deleteConfirmIndex); return; }
        if (e.key === 'n') { setDeleteConfirmIndex(null); return; }
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'y' && e.key !== 'n') { setDeleteConfirmIndex(null); }
    } else if (isEditing) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const fields: Array<'title' | 'dateline' | 'description'> = ['title', 'dateline', 'description'];
        const currentFieldIndex = fields.indexOf(activeField);
        const nextFieldIndex = (currentFieldIndex + (e.shiftKey ? -1 : 1) + fields.length) % fields.length;
        setActiveField(fields[nextFieldIndex]);
      } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        addEvent(focusedIndex);
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey) { setFocusedIndex(i => Math.max(0, i - 5)); }
        else if (focusedIndex > 0) { setFocusedIndex(focusedIndex - 1); }
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.shiftKey) { setFocusedIndex(i => Math.min(events.length - 1, i + 5)); }
        else if (focusedIndex < events.length - 1) { setFocusedIndex(focusedIndex + 1); }
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setSpineMode(true);
        setSpinePosition({ index: focusedIndex, at: 'event' });
        (document.activeElement as HTMLElement)?.blur();
      } else if (e.key === 'ArrowUp' && activeField === 'title' && focusedIndex === 0) {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        nameInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => keyRef.current?.(e);
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  return (
    <ScrollView ref={scrollViewRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
      {events.flatMap((event, i) => {
        const rows = [
          <View key={event.id} style={{ flexDirection: 'row', backgroundColor: !spineMode && focusedIndex === i ? colors.selection : 'transparent' }}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <View style={{ width: 2, flex: 1, backgroundColor: i === 0 ? 'transparent' : colors.border }} />
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: (spineMode && spinePosition.index === i && spinePosition.at === 'event') ? colors.text : colors.muted }} />
              <View style={{ width: 2, flex: 1, backgroundColor: i < events.length - 1 ? colors.border : 'transparent' }} />
            </View>
            <View style={{ width: 16, justifyContent: 'flex-start', paddingTop: 16 }}><View style={{ height: 2, backgroundColor: colors.border }} /></View>
            <View style={{ flex: 1, paddingBottom: 16, paddingTop: 12 }}>
              {(event.dateline || (!spineMode && focusedIndex === i && activeField === 'dateline')) && (
                <TextInput ref={r => { if (r) inputRefs.current[`${event.id}-dateline`] = r; }} value={event.dateline} onChangeText={v => updateEvent(i, { dateline: v })} placeholder="date..." placeholderTextColor={colors.muted} submitBehavior="submit" style={{ fontFamily: mono, fontSize: 10, color: colors.muted, paddingVertical: 0 }} onFocus={() => { setFocusedIndex(i); setActiveField('dateline'); setSpineMode(false); }} />
              )}
              <TextInput ref={r => { if (r) inputRefs.current[`${event.id}-title`] = r; }} value={event.title} onChangeText={v => updateEvent(i, { title: v })} placeholder="event title..." placeholderTextColor={colors.muted} submitBehavior="submit" style={{ fontFamily: mono, fontSize: 14, fontWeight: '700', color: colors.text, paddingVertical: 0 }} onFocus={() => { setFocusedIndex(i); setActiveField('title'); setSpineMode(false); }} />
              <TextInput ref={r => { if (r) inputRefs.current[`${event.id}-description`] = r; }} value={event.description} onChangeText={v => updateEvent(i, { description: v })} placeholder="description..." placeholderTextColor={colors.muted} submitBehavior="submit" style={{ fontFamily: mono, fontSize: 13, color: colors.text, paddingVertical: 0, marginTop: 2 }} onFocus={() => { setFocusedIndex(i); setActiveField('description'); setSpineMode(false); }} />
              {spineMode && deleteConfirmIndex === i && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>delete?</Text>
                  <TouchableOpacity onPress={() => deleteEvent(i)}><Text style={{ fontFamily: mono, fontSize: 12, color: colors.error }}>yes</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setDeleteConfirmIndex(null)}><Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>no</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>,
        ];
        if (spineMode && i < events.length - 1) {
          const isMidFocused = spinePosition.index === i && spinePosition.at === 'midpoint';
          rows.push(
            <View key={`mid-${event.id}`} style={{ flexDirection: 'row', height: 24 }}>
              <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.border }} />
                <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: isMidFocused ? colors.text : colors.muted, backgroundColor: isMidFocused ? colors.text : 'transparent', zIndex: 1 }} />
              </View>
            </View>,
          );
        }
        return rows;
      })}
    </ScrollView>
  );
}