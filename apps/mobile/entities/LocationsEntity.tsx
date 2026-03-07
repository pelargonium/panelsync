import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import type { Universe } from '../types';

export default function LocationsEntity({ universe: _universe }: { universe: Universe }) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Locations</Text>
        <TouchableOpacity style={s.addButton}>
          <Text style={s.addButtonText}>+ New Location</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.empty}>No locations yet.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, padding: 32 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:         { color: colors.text, fontSize: 22, fontWeight: '700' },
  addButton:     { backgroundColor: colors.bible, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  addButtonText: { color: colors.pageWhite, fontSize: 13, fontWeight: '700' },
  empty:         { color: colors.muted, fontSize: 14, lineHeight: 22 },
});
