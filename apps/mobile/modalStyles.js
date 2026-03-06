import { StyleSheet } from 'react-native';

export const modalStyles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:     { backgroundColor: '#F5F2EC', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480, borderWidth: 1, borderColor: '#D4CFC7' },
  title:     { color: '#1A1A1A', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle:  { color: '#6B6860', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  input:     { backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#D4CFC7', borderRadius: 6, padding: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 16 },
  actions:   { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancel:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: '#D4CFC7' },
  cancelTxt: { color: '#6B6860', fontSize: 13, fontWeight: '600' },
  create:    { backgroundColor: '#C41E1E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  createOff: { backgroundColor: '#D4CFC7' },
  createTxt: { color: '#FAFAF8', fontSize: 13, fontWeight: '700' },
});