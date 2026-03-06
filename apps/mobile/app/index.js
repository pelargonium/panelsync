import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const MOCK_UNIVERSES = [
  { id: '1', name: 'The Voidborn Saga', seriesCount: 3, lastEdited: '2 hours ago' },
  { id: '2', name: 'Neon Requiem', seriesCount: 1, lastEdited: 'Yesterday' },
];

function UniverseCard({ universe }) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardCover} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{universe.name}</Text>
        <Text style={styles.cardMeta}>
          {universe.seriesCount} series · edited {universe.lastEdited}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function UniversesDashboard() {
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>PANELSYNC</Text>
        <TouchableOpacity style={styles.newButton}>
          <Text style={styles.newButtonText}>+ New Universe</Text>
        </TouchableOpacity>
      </View>

      {/* Universe list */}
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>YOUR UNIVERSES</Text>
        {MOCK_UNIVERSES.map(u => (
          <UniverseCard key={u.id} universe={u} />
        ))}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E4DC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#D4CFC7',
    backgroundColor: '#F5F2EC',
  },
  logo: {
    color: '#C41E1E',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  newButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  newButtonText: {
    color: '#F5F2EC',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 24,
  },
  sectionLabel: {
    color: '#6B6860',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F5F2EC',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4CFC7',
    overflow: 'hidden',
  },
  cardCover: {
    height: 80,
    backgroundColor: '#D4CFC7',
  },
  cardBody: {
    padding: 16,
  },
  cardName: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    color: '#6B6860',
    fontSize: 12,
  },
});