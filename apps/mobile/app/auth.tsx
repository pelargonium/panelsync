import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme';
import { api, saveToken } from '../lib/api';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.auth.login({ email: email.trim(), password })
        : await api.auth.register({ email: email.trim(), password, displayName: displayName.trim() || undefined });

      await saveToken(res.token);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <View style={s.card}>
        <Text style={s.logo}>PANELSYNC</Text>
        <Text style={s.tagline}>Your comic universe, organized.</Text>

        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, mode === 'login' && s.tabActive]}
            onPress={() => { setMode('login'); setError(null); }}
          >
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, mode === 'register' && s.tabActive]}
            onPress={() => { setMode('register'); setError(null); }}
          >
            <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <TextInput
            style={s.input}
            placeholder="Display name (optional)"
            placeholderTextColor={colors.faint}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.faint}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.faint}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        {error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.button, loading && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={s.buttonText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:           { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 32 },
  logo:           { color: colors.accent, fontSize: 18, fontWeight: '700', letterSpacing: 3, textAlign: 'center', marginBottom: 6 },
  tagline:        { color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  tabs:           { flexDirection: 'row', marginBottom: 20, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  tab:            { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: colors.bg },
  tabText:        { color: colors.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive:  { color: colors.text },
  input:          { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 14, marginBottom: 12 },
  error:          { color: '#e05050', fontSize: 12, marginBottom: 12 },
  button:         { backgroundColor: colors.accent, borderRadius: 6, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: colors.surface, fontSize: 14, fontWeight: '700' },
});
