import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import type { Universe } from '../types';

export default function SeriesEntity({ universe }: { universe: Universe }) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Series</Text>
        <TouchableOpacity style={s.addButton}>
          <Text style={s.addButtonText}>+ New Series</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.empty}>No series yet in {universe.name}.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, padding: 32 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:         { color: colors.text, fontSize: 22, fontWeight: '700' },
  addButton:     { backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  addButtonText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  empty:         { color: colors.muted, fontSize: 14, lineHeight: 22 },
});
