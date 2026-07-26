import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { VisitEntry, Category, CATEGORY_COLORS, MapType, getCategoriesForMap } from '../types';
import { generateEntryId } from '../storage/database';

interface Props {
  visible: boolean;
  featureId: string;
  featureName: string;
  mapType: MapType;
  entries: VisitEntry[];
  onSave: (entry: VisitEntry) => void;
  onDelete: (entryId: string) => void;
  onClose: () => void;
}

const C = {
  primary: '#003366',
  secondary: '#0055A5',
  bg: '#F5F7FA',
  white: '#FFFFFF',
  text: '#1A2C45',
  muted: '#6B87A8',
  border: '#C8D8EA',
  inputBg: '#F0F4FA',
  danger: '#D32F2F',
};

function fmt(iso: string): string {
  if (!iso) return '';
  if (iso.includes('-')) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseISO(display: string): string {
  if (!display) return '';
  if (display.includes('/')) {
    const [d, m, y] = display.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return display;
}

function categoriesLabel(cats: Category[]): string {
  return cats.length > 0 ? cats.join(' · ') : '—';
}

// ─── Entry card (in list view) ────────────────────────────────────────────────
function EntryCard({
  entry,
  onEdit,
}: { entry: VisitEntry; onEdit: () => void }) {
  const firstCat = entry.categories?.[0];
  const col = firstCat ? CATEGORY_COLORS[firstCat] : { fill: '#D4E4F7', stroke: '#88AACC', chip: '#88AACC', light: '#EEF4FB' };
  return (
    <TouchableOpacity style={styles.card} onPress={onEdit} activeOpacity={0.75}>
      <View style={[styles.cardAccent, { backgroundColor: col.fill }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardChips}>
            {(entry.categories ?? []).slice(0, 3).map(cat => {
              const c = CATEGORY_COLORS[cat];
              return (
                <View key={cat} style={[styles.chip, { backgroundColor: c.light, borderColor: c.stroke }]}>
                  <Text style={[styles.chipText, { color: c.chip }]}>{cat}</Text>
                </View>
              );
            })}
            {(entry.categories?.length ?? 0) > 3 && (
              <Text style={styles.moreChips}>+{(entry.categories.length - 3)}</Text>
            )}
          </View>
          {entry.visitDate ? (
            <Text style={styles.cardDate}>{fmt(entry.visitDate)}</Text>
          ) : null}
        </View>
        {entry.contact ? <Text style={styles.cardContact}>{entry.contact}</Text> : null}
        {entry.organization ? <Text style={styles.cardOrg}>{entry.organization}</Text> : null}
        {entry.notes ? (
          <Text style={styles.cardNotes} numberOfLines={2}>{entry.notes}</Text>
        ) : null}
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InfoModal({
  visible, featureId, featureName, mapType, entries, onSave, onDelete, onClose,
}: Props) {
  const availableCategories = getCategoriesForMap(mapType);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const backdropReady = React.useRef(false);
  React.useEffect(() => {
    if (visible) {
      backdropReady.current = false;
      const t = setTimeout(() => { backdropReady.current = true; }, 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Form fields
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([availableCategories[0]]);
  const [visitDate, setVisitDate]     = useState('');
  const [contact, setContact]         = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes]             = useState('');

  useEffect(() => {
    if (visible) setView('list');
  }, [visible, featureId]);

  function toggleCategory(cat: Category) {
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  }

  function openNewForm() {
    setEditingId(null);
    setSelectedCategories([availableCategories[0]]);
    setVisitDate('');
    setContact('');
    setOrganization('');
    setNotes('');
    setView('form');
  }

  function openEditForm(entry: VisitEntry) {
    setEditingId(entry.entryId);
    // Handle legacy single-category entries
    const cats = entry.categories?.length > 0
      ? entry.categories
      : [];
    setSelectedCategories(cats);
    setVisitDate(fmt(entry.visitDate));
    setContact(entry.contact);
    setOrganization(entry.organization);
    setNotes(entry.notes);
    setView('form');
  }

  function handleSave() {
    const cats = selectedCategories.length > 0 ? selectedCategories : [availableCategories[0]];
    const entry: VisitEntry = {
      entryId:        editingId ?? generateEntryId(),
      territoryId:    featureId,
      mapType,
      territoryName:  featureName,
      categories:     cats,
      customCategory: '',
      visitDate:      parseISO(visitDate),
      contact,
      organization,
      notes,
      createdAt:      editingId
        ? (entries.find(e => e.entryId === editingId)?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };
    onSave(entry);
    setView('list');
  }

  function handleDelete() {
    if (!editingId) return;
    Alert.alert(
      'Eliminar actividad',
      '¿Seguro que querés eliminar esta entrada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDelete(editingId);
            setView('list');
          },
        },
      ]
    );
  }

  const regionLabel = mapType === 'argentina' ? 'PROVINCIA' : 'PARTIDO';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={view === 'form' ? () => setView('list') : onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            if (!backdropReady.current) return;
            if (view !== 'form') onClose();
          }}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            {view === 'form' ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => setView('list')}>
                <Text style={styles.backBtnText}>‹ Volver</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.headerCenter}>
              <Text style={styles.regionLabel}>{regionLabel}</Text>
              <Text style={styles.featureName} numberOfLines={1}>{featureName}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              <TouchableOpacity style={styles.newBtn} onPress={openNewForm}>
                <Text style={styles.newBtnText}>+ Nueva actividad</Text>
              </TouchableOpacity>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {entries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyText}>
                      No hay actividades registradas.{'\n'}Tocá "Nueva actividad" para agregar.
                    </Text>
                  </View>
                ) : (
                  [...entries]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map(entry => (
                      <EntryCard
                        key={entry.entryId}
                        entry={entry}
                        onEdit={() => openEditForm(entry)}
                      />
                    ))
                )}
              </ScrollView>
            </>
          )}

          {/* ── FORM VIEW ── */}
          {view === 'form' && (
            <>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Category chips — multi-select */}
                <Text style={styles.fieldLabel}>Categoría (podés seleccionar varias)</Text>
                <View style={styles.catRow}>
                  {availableCategories.map(cat => {
                    const col = CATEGORY_COLORS[cat];
                    const active = selectedCategories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catBtn,
                          { borderColor: col.stroke },
                          active && { backgroundColor: col.fill },
                        ]}
                        onPress={() => toggleCategory(cat)}
                      >
                        <Text style={[styles.catBtnText, { color: active ? col.chip : C.muted }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Date */}
                <Text style={styles.fieldLabel}>Fecha</Text>
                <TextInput
                  style={styles.input}
                  value={visitDate}
                  onChangeText={(t) => setVisitDate(autoFormatDate(t))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  maxLength={10}
                />

                {/* Contact */}
                <Text style={styles.fieldLabel}>Contacto</Text>
                <TextInput
                  style={styles.input}
                  value={contact}
                  onChangeText={setContact}
                  placeholder="Nombre y apellido"
                  placeholderTextColor={C.muted}
                  autoCapitalize="words"
                />

                {/* Organization */}
                <Text style={styles.fieldLabel}>Organización</Text>
                <TextInput
                  style={styles.input}
                  value={organization}
                  onChangeText={setOrganization}
                  placeholder="Nombre de la institución"
                  placeholderTextColor={C.muted}
                  autoCapitalize="words"
                />

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Observaciones, acuerdos, próximos pasos…"
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                />
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                {editingId ? (
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setView('list')}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,20,50,0.5)' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  handle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F8',
    gap: 8,
  },
  backBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  backBtnText: { fontSize: 17, color: C.secondary, fontWeight: '600' },
  headerCenter: { flex: 1 },
  regionLabel: {
    fontSize: 9, fontWeight: '700', color: C.secondary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
  },
  featureName: { fontSize: 18, fontWeight: '800', color: C.primary },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EEF2F8', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 13, color: C.muted, fontWeight: '600' },

  newBtn: {
    margin: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  newBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  scroll: { flexGrow: 0 },
  scrollContent: { padding: 16, paddingBottom: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Entry card
  card: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardAccent: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: '700' },
  moreChips: { fontSize: 10, color: C.muted, alignSelf: 'center' },
  cardDate: { fontSize: 11, color: C.muted, flexShrink: 0 },
  cardContact: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 1 },
  cardOrg: { fontSize: 12, color: C.muted, marginBottom: 2 },
  cardNotes: { fontSize: 12, color: C.muted, lineHeight: 17 },
  cardArrow: { fontSize: 24, color: C.muted, paddingHorizontal: 12 },

  // Form
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, marginTop: 14,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    backgroundColor: C.white,
  },
  catBtnText: { fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text,
  },
  notesInput: { minHeight: 90, paddingTop: 12 },

  footer: {
    flexDirection: 'row', gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: '#EEF2F8',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', backgroundColor: C.white,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
  deleteBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.danger,
    alignItems: 'center', backgroundColor: '#FFF5F5',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: C.danger },
  saveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 12,
    backgroundColor: C.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: C.white },
});
