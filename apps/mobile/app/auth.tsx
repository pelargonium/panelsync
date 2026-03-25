import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { api, saveToken } from '../lib/api';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const { colors, mono } = useTheme();
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
      style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <View style={{ width: '100%', maxWidth: 360 }}>
        <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text, letterSpacing: 2, marginBottom: 4 }}>PANELSYNC</Text>
        <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, marginBottom: 32 }}>your comic universe, organized.</Text>

        <View style={{ flexDirection: 'row', marginBottom: 24, gap: 16 }}>
          <TouchableOpacity onPress={() => { setMode('login'); setError(null); }}>
            <Text style={{ fontFamily: mono, fontSize: 12, color: mode === 'login' ? colors.text : colors.muted }}>sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMode('register'); setError(null); }}>
            <Text style={{ fontFamily: mono, fontSize: 12, color: mode === 'register' ? colors.text : colors.muted }}>create account</Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <TextInput
            style={{ fontFamily: mono, fontSize: 13, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, marginBottom: 16 }}
            placeholder="display name"
            placeholderTextColor={colors.muted}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={{ fontFamily: mono, fontSize: 13, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, marginBottom: 16 }}
          placeholder="email"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={{ fontFamily: mono, fontSize: 13, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, marginBottom: 16 }}
          placeholder="password"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        {error && <Text style={{ fontFamily: mono, fontSize: 12, color: colors.error, marginBottom: 12 }}>{error}</Text>}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{ borderWidth: 1, borderColor: loading ? colors.border : colors.text, paddingVertical: 10, alignItems: 'center', marginTop: 4, opacity: loading ? 0.5 : 1 }}
        >
          {loading
            ? <ActivityIndicator color={colors.text} size="small" />
            : <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text }}>{mode === 'login' ? 'sign in' : 'create account'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
