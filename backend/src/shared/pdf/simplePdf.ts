type PdfSection = {
  title?: string;
  lines: string[];
};

function normalizePdfText(value: string) {
  if (!value) return '';
  return value
    .toString()
    .replace(/[\u202F\u00A0\u00A0]/g, ' ') // Espaces insécables et fins
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^\x20-\x7E]/g, ' ') // Remplace tout caractère non-ASCII restant par un espace au lieu de '?'
    .trim();
}

function toPdfHexString(value: string) {
  return Buffer.from(normalizePdfText(value), 'ascii').toString('hex').toUpperCase();
}

function wrapLine(value: string, maxChars = 94) {
  const sanitized = normalizePdfText(value).trim();
  if (!sanitized) {
    return [''];
  }

  const words = sanitized.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    for (let index = 0; index < word.length; index += maxChars) {
      lines.push(word.slice(index, index + maxChars));
    }
    current = '';
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function paginateLines(lines: string[], maxLinesPerPage = 48) {
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  return pages.length > 0 ? pages : [['']];
}

export function buildSimplePdf(title: string, sections: PdfSection[]) {
  const documentLines: string[] = [title.toUpperCase(), ''];

  for (const section of sections) {
    if (section.title) {
      documentLines.push(section.title.toUpperCase());
    }

    for (const line of section.lines) {
      documentLines.push(...wrapLine(line));
    }

    documentLines.push('');
  }

  const pages = paginateLines(documentLines);
  const objects = new Map<number, string>();
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  let nextId = 4;

  for (const pageLines of pages) {
    const contentId = nextId++;
    const pageId = nextId++;
    const streamCommands = [
      'BT',
      '/F1 9 Tf',
      '11 TL',
      '50 792 Td',
      ...pageLines.flatMap((line, index) => index === 0
        ? [`<${toPdfHexString(line)}> Tj`]
        : ['T*', `<${toPdfHexString(line)}> Tj`]),
      'ET',
    ];
    const stream = streamCommands.join('\n');
    objects.set(contentId, `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    contentIds.push(contentId);
    pageIds.push(pageId);
  }

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  for (let index = 0; index < pageIds.length; index += 1) {
    objects.set(
      pageIds[index],
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
    );
  }

  const maxObjectId = Math.max(...objects.keys());
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let id = 1; id <= maxObjectId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${maxObjectId + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= maxObjectId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
