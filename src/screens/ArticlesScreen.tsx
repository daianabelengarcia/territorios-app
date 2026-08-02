import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Article } from '../types';
import { saveArticle, deleteArticle, getAllArticles } from '../storage/database';
import { exportArticleToWord, exportAllArticlesToWord } from '../utils/exportToWord';

const PRIMARY = '#003366';
const ACCENT  = '#0055A5';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
}

// ── Formulario ───────────────────────────────────────────────────────────────
interface ArticleFormProps {
  initial?: Article;
  onSave: (a: Article) => void;
  onCancel: () => void;
}

function ArticleForm({ initial, onSave, onCancel }: ArticleFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [link,  setLink]  = useState(initial?.link  ?? '');
  const [body,  setBody]  = useState(initial?.body  ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Título requerido', 'Ingresá un título para el artículo.');
      return;
    }
    setSaving(true);
    const article: Article = {
      articleId: initial?.articleId ?? generateId(),
      title:     title.trim(),
      link:      link.trim(),
      body:      body.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(article);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.formTitle}>{initial ? 'Editar artículo' : 'Nuevo artículo'}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.saveBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formBody} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.fieldLabel}>Título *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Título del artículo"
          placeholderTextColor="#9BAFC4"
          maxLength={200}
        />

        <Text style={styles.fieldLabel}>Link</Text>
        <TextInput
          style={styles.input}
          value={link}
          onChangeText={setLink}
          placeholder="https://..."
          placeholderTextColor="#9BAFC4"
          autoCapitalize="none"
          keyboardType="url"
          maxLength={500}
        />

        <Text style={styles.fieldLabel}>Texto</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="Escribí el contenido del artículo..."
          placeholderTextColor="#9BAFC4"
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Detalle ──────────────────────────────────────────────────────────────────
interface ArticleDetailProps {
  article: Article;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onExport: () => void;
}

function ArticleDetail({ article, onEdit, onDelete, onBack, onExport }: ArticleDetailProps) {
  const handleLink = () => {
    if (!article.link) return;
    const url = article.link.startsWith('http') ? article.link : `https://${article.link}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el link.'));
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('¿Eliminar este artículo?')) onDelete();
    } else {
      Alert.alert('Eliminar', '¿Eliminás este artículo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onDelete },
      ]);
    }
  };

  return (
    <>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.detailActions}>
          <TouchableOpacity style={styles.exportSmallBtn} onPress={onExport}>
            <Text style={styles.exportSmallBtnText}>📄 Word</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailBody} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.detailDate}>{formatDate(article.createdAt)}</Text>
        <Text style={styles.detailTitle}>{article.title}</Text>

        {!!article.link && (
          <TouchableOpacity onPress={handleLink} style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={2}>🔗 {article.link}</Text>
          </TouchableOpacity>
        )}

        {!!article.body && (
          <Text style={styles.bodyText}>{article.body}</Text>
        )}
      </ScrollView>
    </>
  );
}

// ── Pantalla principal ───────────────────────────────────────────────────────
type View = 'list' | 'form' | 'detail';

export default function ArticlesScreen() {
  const [articles, setArticles]     = useState<Article[]>([]);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);
  const [view, setView]             = useState<View>('list');
  const [selected, setSelected]     = useState<Article | null>(null);
  const [editTarget, setEditTarget] = useState<Article | undefined>(undefined);

  useEffect(() => {
    getAllArticles().then(data => { setArticles(data); setLoading(false); });
  }, []);

  const handleSave = useCallback(async (article: Article) => {
    await saveArticle(article);
    setArticles(prev => {
      const idx = prev.findIndex(a => a.articleId === article.articleId);
      if (idx >= 0) { const next = [...prev]; next[idx] = article; return next; }
      return [article, ...prev];
    });
    setView('list');
    setEditTarget(undefined);
    setSelected(null);
  }, []);

  const handleDelete = useCallback(async (articleId: string) => {
    await deleteArticle(articleId);
    setArticles(prev => prev.filter(a => a.articleId !== articleId));
    setView('list');
    setSelected(null);
  }, []);

  const handleExportOne = useCallback(async (article: Article) => {
    try { await exportArticleToWord(article); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Error al exportar'); }
  }, []);

  const handleExportAll = useCallback(async () => {
    if (articles.length === 0) return;
    setExporting(true);
    try { await exportAllArticlesToWord(articles); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Error al exportar'); }
    finally { setExporting(false); }
  }, [articles]);

  // ── Render form ────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ArticleForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setView(editTarget ? 'detail' : 'list'); setEditTarget(undefined); }}
        />
      </SafeAreaView>
    );
  }

  // ── Render detail ──────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ArticleDetail
          article={selected}
          onBack={() => { setView('list'); setSelected(null); }}
          onEdit={() => { setEditTarget(selected); setView('form'); }}
          onDelete={() => handleDelete(selected.articleId)}
          onExport={() => handleExportOne(selected)}
        />
      </SafeAreaView>
    );
  }

  // ── Render list ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* List header */}
      <View style={styles.listHeader}>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => { setEditTarget(undefined); setView('form'); }}
        >
          <Text style={styles.newBtnText}>+ Nuevo artículo</Text>
        </TouchableOpacity>

        {articles.length > 0 && (
          <TouchableOpacity
            style={[styles.exportAllBtn, exporting && { opacity: 0.5 }]}
            onPress={handleExportAll}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color={PRIMARY} />
              : <Text style={styles.exportAllBtnText}>📄 Word</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Article list */}
      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : articles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>Sin artículos todavía</Text>
          <Text style={styles.emptyDesc}>Tocá "+ Nuevo artículo" para empezar.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {articles.map(article => (
            <TouchableOpacity
              key={article.articleId}
              style={styles.card}
              onPress={() => { setSelected(article); setView('detail'); }}
              activeOpacity={0.82}
            >
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle} numberOfLines={2}>{article.title}</Text>
                {!!article.link && (
                  <Text style={styles.cardLink} numberOfLines={1}>🔗 {article.link}</Text>
                )}
                {!!article.body && (
                  <Text style={styles.cardBody} numberOfLines={3}>{article.body}</Text>
                )}
                <Text style={styles.cardDate}>{formatDate(article.createdAt)}</Text>
              </View>
              <View style={styles.cardRight}>
                <TouchableOpacity
                  style={styles.cardWordBtn}
                  onPress={() => handleExportOne(article)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cardWordBtnText}>📄</Text>
                </TouchableOpacity>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },

  // List
  listHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E7F0',
  },
  newBtn: {
    flex: 1, backgroundColor: PRIMARY, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
  },
  newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  exportAllBtn: {
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center',
    minWidth: 80,
  },
  exportAllBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: PRIMARY, marginBottom: 6 },
  emptyDesc:  { fontSize: 13, color: '#6B87A8', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10,
    overflow: 'hidden', padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardMain:      { flex: 1 },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: PRIMARY, marginBottom: 4 },
  cardLink:      { fontSize: 12, color: ACCENT, marginBottom: 4 },
  cardBody:      { fontSize: 13, color: '#3A4D63', lineHeight: 19, marginBottom: 6 },
  cardDate:      { fontSize: 11, color: '#9BAFC4' },
  cardRight:     { alignItems: 'center', gap: 6, paddingLeft: 10 },
  cardWordBtn:   { padding: 6 },
  cardWordBtnText: { fontSize: 18 },
  cardArrow:     { fontSize: 24, color: '#9BAFC4', fontWeight: '300' },

  // Form
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E7F0',
  },
  formTitle:    { fontSize: 16, fontWeight: '700', color: PRIMARY, flex: 1, textAlign: 'center' },
  cancelBtn:    { paddingVertical: 6, paddingRight: 12 },
  cancelBtnText: { color: ACCENT, fontSize: 14, fontWeight: '600' },
  saveBtn:      { backgroundColor: PRIMARY, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  saveBtnText:  { color: '#FFF', fontWeight: '700', fontSize: 14 },
  formBody:     { flex: 1, backgroundColor: '#F0F4FA' },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B87A8',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 6, marginTop: 16,
  },
  input: {
    backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5,
    borderColor: '#D0DCF0', paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#1A2C45',
  },
  textArea: { minHeight: 200, paddingTop: 12 },

  // Detail
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E7F0',
  },
  detailActions:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  exportSmallBtn:    { borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  exportSmallBtnText: { color: PRIMARY, fontSize: 12, fontWeight: '700' },
  editBtn:           { backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  editBtnText:       { color: '#FFF', fontSize: 12, fontWeight: '700' },
  deleteBtn:         { backgroundColor: '#FEE2E2', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  deleteBtnText:     { color: '#C62828', fontSize: 12, fontWeight: '700' },

  detailBody:  { flex: 1, backgroundColor: '#F0F4FA' },
  detailDate:  { fontSize: 11, color: '#9BAFC4', marginBottom: 6 },
  detailTitle: { fontSize: 22, fontWeight: '800', color: PRIMARY, marginBottom: 14, lineHeight: 28 },
  linkContainer: {
    backgroundColor: '#EEF4FF', borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: ACCENT,
  },
  linkText:    { fontSize: 13, color: ACCENT, fontWeight: '600' },
  bodyText:    { fontSize: 15, color: '#1A2C45', lineHeight: 24 },
});
