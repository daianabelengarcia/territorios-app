import { Platform } from 'react-native';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, Table, TableRow, TableCell, WidthType, AlignmentType,
  ImageRun,
} from 'docx';
import { VisitEntry, MapType, Article } from '../types';

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch { return iso; }
}

function safeFileName(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
}

function field(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value || '—', size: 22 }),
    ],
  });
}

async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function imagesParagraphs(images: string[]): Promise<(Paragraph | ImageRun)[]> {
  if (!images?.length) return [];
  const result: Paragraph[] = [];

  if (Platform.OS === 'web') {
    // En web podemos incrustar las imágenes
    for (const url of images) {
      const buf = await fetchImageBuffer(url);
      if (!buf) continue;
      try {
        result.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: buf,
                transformation: { width: 300, height: 200 },
                type: 'jpg',
              }),
            ],
          })
        );
      } catch {
        // Si falla la imagen, caer a URL
        result.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: url, size: 18, color: '1565C0' })],
        }));
      }
    }
  } else {
    // En mobile incluimos los URLs como texto
    result.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Fotos:', bold: true, size: 22 })],
    }));
    for (const url of images) {
      result.push(new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `• ${url}`, size: 18, color: '1565C0' })],
      }));
    }
  }

  return result;
}

async function entrySection(entry: VisitEntry, mapType: MapType, index: number, total: number): Promise<Paragraph[]> {
  const cats = (entry.categories ?? []).join(' / ') || '—';
  const imgs = await imagesParagraphs(entry.images ?? []);
  return [
    new Paragraph({
      text: `Actividad ${index + 1}${total > 1 ? ` de ${total}` : ''}`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: index === 0 ? 0 : 320, after: 120 },
    }),
    field(mapType === 'argentina' ? 'Provincia' : 'Partido', entry.territoryName),
    field('Categoría', cats),
    field('Fecha', formatDate(entry.visitDate)),
    field('Contacto', entry.contact),
    field('Organización', entry.organization),
    field('Notas', entry.notes),
    ...(imgs.length > 0
      ? [new Paragraph({ children: [new TextRun({ text: 'Fotos:', bold: true, size: 22 })], spacing: { before: 120, after: 80 } }), ...imgs]
      : []
    ),
  ];
}

async function buildDocument(entries: VisitEntry[], title: string, mapType: MapType): Promise<Document> {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const timestamp = new Date().toLocaleDateString('es-AR');

  const sections = await Promise.all(
    sorted.map((e, i) => entrySection(e, mapType, i, sorted.length))
  );

  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Exportado el ${timestamp}`, italics: true, size: 20, color: '666666' })],
      spacing: { after: 320 },
    }),
    ...sections.flat(),
  ];

  return new Document({
    sections: [{ children }],
  });
}

async function downloadDoc(doc: Document, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing    = await import('expo-sharing');
    const base64     = await Packer.toBase64String(doc);
    const uri        = (FileSystem.cacheDirectory ?? '') + fileName;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error('El dispositivo no puede compartir archivos.');
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      dialogTitle: 'Exportar Word',
    });
  }
}

/** Exporta una sola entrada como Word. */
export async function exportEntryToWord(entry: VisitEntry, mapType: MapType): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const safe = safeFileName(entry.territoryName);
  const fileName = `Territorios_${safe}_${timestamp}.docx`;
  const title = entry.territoryName;
  const doc = await buildDocument([entry], title, mapType);
  await downloadDoc(doc, fileName);
}

// ── Artículos ────────────────────────────────────────────────────────────────

function buildArticleDocument(articles: Article[], docTitle: string): Document {
  const timestamp = new Date().toLocaleDateString('es-AR');
  const sorted = [...articles].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const children: Paragraph[] = [
    new Paragraph({
      text: docTitle,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Exportado el ${timestamp}`, italics: true, size: 20, color: '666666' })],
      spacing: { after: 320 },
    }),
  ];

  sorted.forEach((article, i) => {
    children.push(
      new Paragraph({
        text: article.title || 'Sin título',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: i === 0 ? 0 : 360, after: 120 },
      }),
    );
    if (article.link) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Link: ', bold: true, size: 22 }),
            new TextRun({ text: article.link, size: 22, color: '1565C0' }),
          ],
        }),
      );
    }
    if (article.body) {
      // Split by newlines to preserve paragraph breaks
      const lines = article.body.split('\n');
      lines.forEach((line, li) => {
        children.push(
          new Paragraph({
            spacing: { after: li === lines.length - 1 ? 0 : 80 },
            children: [new TextRun({ text: line || ' ', size: 22 })],
          }),
        );
      });
    }
  });

  return new Document({ sections: [{ children }] });
}

/** Exporta un artículo individual como Word. */
export async function exportArticleToWord(article: Article): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const safe = safeFileName(article.title || 'articulo');
  const fileName = `Articulo_${safe}_${timestamp}.docx`;
  const doc = buildArticleDocument([article], article.title || 'Artículo');
  await downloadDoc(doc, fileName);
}

/** Exporta todos los artículos como un solo Word. */
export async function exportAllArticlesToWord(articles: Article[]): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Articulos_todos_${timestamp}.docx`;
  const doc = buildArticleDocument(articles, 'Artículos');
  await downloadDoc(doc, fileName);
}

/** Exporta todos los registros de un territorio como Word. */
export async function exportTerritoryToWord(
  entries: VisitEntry[],
  territoryName: string,
  mapType: MapType
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const safe = safeFileName(territoryName);
  const fileName = `Territorios_${safe}_completo_${timestamp}.docx`;
  const title = `Actividades en ${territoryName}`;
  const doc = await buildDocument(entries, title, mapType);
  await downloadDoc(doc, fileName);
}
