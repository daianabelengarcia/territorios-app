import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '../lib/supabase';

function ArgIcon() {
  return (
    <Svg width={72} height={72} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={38} fill="#003366" />
      <Path
        d="M35 12 L45 12 L48 20 L50 32 L52 40 L50 50 L46 60 L42 70 L38 70 L34 60 L30 50 L28 40 L30 32 L32 20 Z"
        fill="#FFFFFF" opacity={0.9}
      />
    </Svg>
  );
}

const COLORS = {
  primary:   '#003366',
  secondary: '#0055A5',
  accent:    '#75AADB',
  bg:        '#F0F4FA',
  white:     '#FFFFFF',
  text:      '#1A2C45',
  muted:     '#6B87A8',
};

function handleLogout() {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('¿Querés cerrar sesión?')) supabase.auth.signOut();
  } else {
    Alert.alert('Cerrar sesión', '¿Querés salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }
}

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <ArgIcon />
        <Text style={styles.appTitle}>TERRITORIOS</Text>
        <Text style={styles.appSubtitle}>Sistema de Gestión Territorial</Text>
      </View>

      {/* Cards */}
      <View style={styles.cardsSection}>
        <Text style={styles.sectionLabel}>Seleccioná un territorio</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Argentina')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardAccent, { backgroundColor: '#0055A5' }]} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>🗺️  República Argentina</Text>
            <Text style={styles.cardDesc}>
              24 provincias y CABA. Registrá visitas y contactos institucionales.
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('BuenosAires')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardAccent, { backgroundColor: '#1A7A4A' }]} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>🗺️  Provincia de Buenos Aires</Text>
            <Text style={styles.cardDesc}>
              135 partidos bonaerenses. Registrá visitas y contactos por distrito.
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('AMBA')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardAccent, { backgroundColor: '#5C2D91' }]} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>🗺️  AMBA</Text>
            <Text style={styles.cardDesc}>
              CABA + 24 partidos del Gran Buenos Aires. Vista ampliada del área metropolitana.
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión  →</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Los datos se sincronizan en la nube.{'\n'}Exportalos en formato Excel desde cada pantalla.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: {
    alignItems: 'center', paddingTop: 28, paddingBottom: 28, paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
  },
  appTitle:    { fontSize: 32, fontWeight: '800', color: COLORS.white, letterSpacing: 6, marginTop: 14 },
  appSubtitle: { fontSize: 12, color: COLORS.accent, letterSpacing: 2, marginTop: 6, textTransform: 'uppercase' },

  cardsSection: {
    flex: 1, backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 24, paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14, marginLeft: 4,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 12,
    overflow: 'hidden', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardAccent:  { width: 6, alignSelf: 'stretch' },
  cardContent: { flex: 1, padding: 16 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardDesc:    { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  cardArrow:   { fontSize: 26, color: COLORS.accent, paddingRight: 14, fontWeight: '300' },

  logoutBtn: { alignItems: 'center', paddingVertical: 16 },
  logoutText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },

  footer: { backgroundColor: COLORS.bg, padding: 20, alignItems: 'center' },
  footerText: { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 17 },
});
