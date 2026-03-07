import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const modalStyles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:     { backgroundColor: colors.surface, borderRadius: 12, padding: 24, width: '90%', maxWidth: 480, borderWidth: 1, borderColor: colors.border },
  title:     { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle:  { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 20 },
  input:     { backgroundColor: colors.pageWhite, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 },
  actions:   { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancel:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  cancelTxt: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  create:    { backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  createOff: { backgroundColor: colors.border },
  createTxt: { color: colors.pageWhite, fontSize: 13, fontWeight: '700' },
});
