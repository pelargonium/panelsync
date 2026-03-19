import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '../../../../../../theme';

export default function ScriptStubScreen() {
  const params = useLocalSearchParams<{
    id: string;
    iid: string;
    pid: string;
    pageNum: string;
    universeName: string;
  }>();

  const universeName = decodeURIComponent(params.universeName ?? '');

  return (
    <SafeAreaView style={s.root}>
      <View style={s.card}>
        <Text style={s.eyebrow}>SCRIPT STUB</Text>
        <Text style={s.title}>{universeName || 'Universe'}</Text>
        <Text style={s.meta}>Issue ID: {params.iid}</Text>
        <Text style={s.meta}>Page {params.pageNum ?? '?'}</Text>
        <Text style={s.meta}>Page ID: {params.pid}</Text>
        <Text style={s.hint}>This route is wired and ready for the real script editor.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card:    { width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.xl },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.accent, marginBottom: spacing.sm },
  title:   { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  meta:    { fontSize: 13, color: colors.muted, marginBottom: 6 },
  hint:    { fontSize: 13, color: colors.faint, lineHeight: 20, marginTop: spacing.md },
});
