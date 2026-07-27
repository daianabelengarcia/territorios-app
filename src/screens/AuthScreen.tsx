import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const validate = () => {
    if (!email.trim()) return 'Ingresá tu email.';
    if (!email.includes('@')) return 'Email inválido.';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: 'https://daianabelengarcia.github.io/territorios-app/' },
      });
      if (error) {
        setError(error.message);
      } else {
        Alert.alert(
          '¡Cuenta creada!',
          'Revisá tu email para confirmar la cuenta y luego iniciá sesión.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🗺️</Text>
          <Text style={styles.title}>Territorios</Text>
          <Text style={styles.subtitle}>Registro de actividades institucionales</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Iniciar sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => { setMode('register'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Registrarse
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              placeholder="tu@email.com"
              placeholderTextColor="#9BAFC4"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9BAFC4"
              secureTextEntry
            />

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.65 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.btnText}>
                    {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#003366';

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 32 },
  logo:   { fontSize: 52, marginBottom: 8 },
  title:  { fontSize: 28, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#6B87A8', marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E7F0' },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: PRIMARY },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#9BAFC4' },
  tabTextActive: { color: PRIMARY },

  form:  { padding: 24 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B87A8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1.5, borderColor: '#C8D8EA',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#1A2C45',
  },

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 8,
    padding: 10, marginTop: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '500' },

  btn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
