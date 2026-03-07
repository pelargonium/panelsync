import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import type { Universe } from '../types';

export default function TimelineEntity({ universe: _universe }: { universe: Universe }) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Timeline</Text>
        <TouchableOpacity style={s.addButton}>
          <Text style={s.addButtonText}>+ New Timeline</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.empty}>No timelines yet. Create one to start tracking events.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, padding: 32 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:         { color: colors.text, fontSize: 22, fontWeight: '700' },
  addButton:     { backgroundColor: colors.timeline, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  addButtonText: { color: colors.pageWhite, fontSize: 13, fontWeight: '700' },
  empty:         { color: colors.muted, fontSize: 14, lineHeight: 22 },
});
