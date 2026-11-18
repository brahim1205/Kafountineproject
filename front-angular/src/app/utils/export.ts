/**
 * Exports de tableaux en PDF ou en Excel (.xlsx), produits dans le navigateur sans bibliothèque externe.
 *
 * - Excel : classeur Office Open XML minimal (une feuille, en-tête en gras, nombres conservés en nombres).
 * - PDF : document A4 (paysage au-delà de cinq colonnes), police Helvetica, en-tête répété et numéro de page.
 */

export type Cellule = string | number | null | undefined;
export type FormatExport = 'pdf' | 'excel';

export interface Tableau {
  /** Titre affiché en tête du PDF et nom de la feuille Excel. */
  titre: string;
  /** Nom du fichier, sans extension. */
  fichier: string;
  colonnes: string[];
  lignes: Cellule[][];
  /** Ligne d'information sous le titre (période, filtre…). */
  sousTitre?: string;
}

export function exporter(format: FormatExport, tableau: Tableau): void {
  if (format === 'excel') exporterExcel(tableau);
  else exporterPdf(tableau);
}

/** Exporte des lignes dont la première porte les en-têtes de colonnes. */
export function exporterLignes(format: FormatExport, titre: string, fichier: string, lignes: Cellule[][], sousTitre?: string): void {
  const [entete = [], ...corps] = lignes;
  exporter(format, { titre, fichier, sousTitre, colonnes: entete.map((v) => (v === null || v === undefined ? '' : String(v))), lignes: corps });
}

/** Suffixe de date (AAAA-MM-JJ) pour les noms de fichiers. */
export function dateDuJour(): string {
  return new Date().toISOString().split('T')[0];
}

/** Lit un CSV (RFC 4180, séparateur virgule ou point-virgule) : utile pour convertir les exports du serveur. */
export function lireCsv(texte: string): string[][] {
  const contenu = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte;
  const premiereLigne = contenu.split(/\r?\n/, 1)[0] ?? '';
  const separateur = (premiereLigne.match(/;/g)?.length ?? 0) > (premiereLigne.match(/,/g)?.length ?? 0) ? ';' : ',';
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = '';
  let entreGuillemets = false;
  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (entreGuillemets) {
      if (c === '"' && contenu[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === separateur) { ligne.push(cellule); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && contenu[i + 1] === '\n') i++;
      ligne.push(cellule); lignes.push(ligne); ligne = []; cellule = '';
    } else cellule += c;
  }
  if (cellule !== '' || ligne.length > 0) { ligne.push(cellule); lignes.push(ligne); }
  return lignes.filter((l) => l.some((v) => v.trim() !== ''));
}

/** Tableau prêt à exporter à partir d'un CSV dont la première ligne porte les en-têtes. */
export function tableauDepuisCsv(texte: string, titre: string, fichier: string, sousTitre?: string): Tableau {
  const [colonnes = [], ...lignes] = lireCsv(texte);
  return { titre, fichier, sousTitre, colonnes, lignes: lignes.map((l) => l.map(nombreSiPossible)) };
}

function nombreSiPossible(valeur: string): Cellule {
  const texte = valeur.trim();
  return /^-?\d+(\.\d+)?$/.test(texte) && !/^0\d/.test(texte) && texte.length < 16 ? Number(texte) : valeur;
}

function telecharger(nom: string, type: string, contenu: Uint8Array): void {
  const copie = new Uint8Array(contenu.length);
  copie.set(contenu);
  const url = URL.createObjectURL(new Blob([copie.buffer], { type }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Excel -----------------------------------------------------------------------------------------

function xml(texte: string): string {
  // Les caractères de contrôle (hors tabulation et sauts de ligne) sont interdits en XML.
  const propre = Array.from(texte).filter((c) => { const code = c.charCodeAt(0); return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d; }).join('');
  return propre
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nomColonne(index: number): string {
  let nom = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) nom = String.fromCharCode(65 + ((n - 1) % 26)) + nom;
  return nom;
}

function celluleXlsx(valeur: Cellule, ref: string, style: number): string {
  if (typeof valeur === 'number' && Number.isFinite(valeur)) return `<c r="${ref}" s="${style}"><v>${valeur}</v></c>`;
  const texte = valeur === null || valeur === undefined ? '' : String(valeur);
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(texte)}</t></is></c>`;
}

export function classeurXlsx(tableau: Tableau): Uint8Array {
  const toutes = [tableau.colonnes, ...tableau.lignes];
  const largeurs = tableau.colonnes.map((_, c) =>
    Math.min(60, Math.max(10, ...toutes.map((l) => String(l[c] ?? '').length + 2))));
  const lignesXml = toutes.map((ligne, r) =>
    `<row r="${r + 1}">${ligne.map((v, c) => celluleXlsx(v, `${nomColonne(c)}${r + 1}`, r === 0 ? 1 : typeof v === 'number' ? 2 : 0)).join('')}</row>`).join('');
  const feuille = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${largeurs.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${lignesXml}</sheetData></worksheet>`;
  const nomFeuille = xml(tableau.titre.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Export');
  const fichiers: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nomFeuille}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F5EE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`],
    ['xl/worksheets/sheet1.xml', feuille],
  ];
  const encodeur = new TextEncoder();
  return zipSansCompression(fichiers.map(([nom, contenu]) => [nom, encodeur.encode(contenu)]));
}

export function exporterExcel(tableau: Tableau): void {
  telecharger(`${tableau.fichier}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', classeurXlsx(tableau));
}

const TABLE_CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(donnees: Uint8Array): number {
  let crc = 0xffffffff;
  for (const octet of donnees) crc = TABLE_CRC[(crc ^ octet) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Archive ZIP « stockée » (sans compression) : suffisante et lue par Excel, LibreOffice et Google Sheets. */
function zipSansCompression(fichiers: [string, Uint8Array][]): Uint8Array {
  const encodeur = new TextEncoder();
  const morceaux: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let decalage = 0;
  for (const [nom, donnees] of fichiers) {
    const nomOctets = encodeur.encode(nom);
    const crc = crc32(donnees);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, donnees.length, true);
    local.setUint32(22, donnees.length, true);
    local.setUint16(26, nomOctets.length, true);
    morceaux.push(new Uint8Array(local.buffer), nomOctets, donnees);
    const entree = new DataView(new ArrayBuffer(46));
    entree.setUint32(0, 0x02014b50, true);
    entree.setUint16(4, 20, true);
    entree.setUint16(6, 20, true);
    entree.setUint16(8, 0x0800, true);
    entree.setUint32(16, crc, true);
    entree.setUint32(20, donnees.length, true);
    entree.setUint32(24, donnees.length, true);
    entree.setUint16(28, nomOctets.length, true);
    entree.setUint32(42, decalage, true);
    central.push(new Uint8Array(entree.buffer), nomOctets);
    decalage += 30 + nomOctets.length + donnees.length;
  }
  const tailleCentral = central.reduce((t, m) => t + m.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, decalage, true);
  return concatener([...morceaux, ...central, new Uint8Array(fin.buffer)]);
}

function concatener(morceaux: Uint8Array[]): Uint8Array {
  const total = new Uint8Array(morceaux.reduce((t, m) => t + m.length, 0));
  let position = 0;
  for (const m of morceaux) { total.set(m, position); position += m.length; }
  return total;
}

// --- PDF -------------------------------------------------------------------------------------------

/** Largeurs Helvetica (unités pour 1000) des caractères 32 à 126 ; les lettres accentuées prennent celle de leur base. */
const LARGEURS_HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Correspondance Windows-1252 des caractères Unicode de la plage 0x80–0x9F. */
const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b,
  'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99,
  'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
};

function codeWinAnsi(caractere: string): number {
  if (caractere === ' ' || caractere === ' ') return 0x20;
  const code = caractere.codePointAt(0) ?? 0x3f;
  if (code >= 0x20 && code < 0x7f) return code;
  if (code >= 0xa0 && code <= 0xff) return code;
  return CP1252[caractere] ?? 0x3f;
}

function largeurCaractere(caractere: string): number {
  const base = caractere.normalize('NFD')[0] ?? caractere;
  const code = base.charCodeAt(0);
  return code >= 32 && code <= 126 ? LARGEURS_HELVETICA[code - 32] : 556;
}

function largeurTexte(texte: string, taille: number, gras = false): number {
  let total = 0;
  for (const c of texte) total += largeurCaractere(c);
  return (total * taille * (gras ? 1.06 : 1)) / 1000;
}

function tronquer(texte: string, largeurMax: number, taille: number, gras = false): string {
  if (largeurTexte(texte, taille, gras) <= largeurMax) return texte;
  let resultat = texte;
  while (resultat.length > 1 && largeurTexte(`${resultat}…`, taille, gras) > largeurMax) resultat = resultat.slice(0, -1);
  return `${resultat}…`;
}

/** Chaîne PDF littérale encodée en WinAnsi, en échappant ( ) et \. */
function chainePdf(texte: string): string {
  let sortie = '';
  for (const c of texte) {
    const code = codeWinAnsi(c);
    if (code === 0x28 || code === 0x29 || code === 0x5c) sortie += `\\${String.fromCharCode(code)}`;
    else if (code < 0x80) sortie += String.fromCharCode(code);
    else sortie += `\\${code.toString(8).padStart(3, '0')}`;
  }
  return `(${sortie})`;
}

function texteCellule(valeur: Cellule): string {
  if (typeof valeur === 'number') return Number.isInteger(valeur) ? valeur.toLocaleString('fr-FR') : valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return valeur === null || valeur === undefined ? '' : String(valeur).replace(/\s+/g, ' ').trim();
}

export function documentPdf(tableau: Tableau): Uint8Array {
  const paysage = tableau.colonnes.length > 5;
  const [largeurPage, hauteurPage] = paysage ? [842, 595] : [595, 842];
  const marge = 36;
  const taille = 8.5;
  const hauteurLigne = 16;
  const utile = largeurPage - 2 * marge;
  const lignes = tableau.lignes.map((l) => tableau.colonnes.map((_, c) => texteCellule(l[c])));
  const numerique = tableau.colonnes.map((_, c) => tableau.lignes.length > 0 && tableau.lignes.every((l) => typeof l[c] === 'number' || l[c] === null || l[c] === undefined || l[c] === ''));

  // Largeur de colonne proportionnelle au contenu (bornée), ramenée à la largeur utile.
  const besoins = tableau.colonnes.map((titre, c) => Math.min(220, Math.max(40,
    largeurTexte(titre, taille, true), ...lignes.slice(0, 300).map((l) => largeurTexte(l[c], taille))) + 8));
  const somme = besoins.reduce((a, b) => a + b, 0);
  const largeurs = besoins.map((b) => (b * utile) / somme);

  const hautTableau = hauteurPage - marge - 62;
  const parPage = Math.max(1, Math.floor((hautTableau - marge - 20) / hauteurLigne) - 1);
  const pages: string[][][] = [];
  for (let i = 0; i < Math.max(1, lignes.length); i += parPage) pages.push(lignes.slice(i, i + parPage));

  const edition = `Commune de Kafountine · édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const flux = pages.map((contenu, p) => {
    const ops: string[] = [];
    const texte = (x: number, y: number, t: string, police: 'F1' | 'F2', corps: number, gris = 0) =>
      ops.push(`BT ${gris} g /${police} ${corps} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${chainePdf(t)} Tj ET`);
    texte(marge, hauteurPage - marge - 10, tronquer(tableau.titre, utile, 15, true), 'F2', 15);
    texte(marge, hauteurPage - marge - 28, tronquer(tableau.sousTitre ? `${tableau.sousTitre} · ${edition}` : edition, utile, 9), 'F1', 9, 0.35);
    let y = hautTableau;
    ops.push(`0.91 0.96 0.93 rg ${marge} ${y - hauteurLigne + 4} ${utile} ${hauteurLigne} re f`);
    let x = marge;
    tableau.colonnes.forEach((titre, c) => {
      texte(x + 4, y - 7, tronquer(titre, largeurs[c] - 8, taille, true), 'F2', taille);
      x += largeurs[c];
    });
    y -= hauteurLigne;
    contenu.forEach((ligne, r) => {
      if (r % 2 === 1) ops.push(`0.97 0.97 0.97 rg ${marge} ${y - hauteurLigne + 4} ${utile} ${hauteurLigne} re f`);
      x = marge;
      ligne.forEach((valeur, c) => {
        const t = tronquer(valeur, largeurs[c] - 8, taille);
        const decalage = numerique[c] ? largeurs[c] - 4 - largeurTexte(t, taille) : 4;
        texte(x + decalage, y - 7, t, 'F1', taille);
        x += largeurs[c];
      });
      y -= hauteurLigne;
    });
    if (lignes.length === 0) texte(marge + 4, y - 7, 'Aucune donnée à exporter.', 'F1', taille, 0.4);
    ops.push(`0.8 0.8 0.8 RG 0.5 w ${marge} ${marge + 6} m ${largeurPage - marge} ${marge + 6} l S`);
    texte(marge, marge - 6, `${tableau.lignes.length} ligne${tableau.lignes.length > 1 ? 's' : ''}`, 'F1', 8, 0.4);
    const pagination = `Page ${p + 1} / ${pages.length}`;
    texte(largeurPage - marge - largeurTexte(pagination, 8), marge - 6, pagination, 'F1', 8, 0.4);
    return ops.join('\n');
  });

  // Objets : 1 catalogue, 2 pages, 3-4 polices, puis (page, contenu) pour chaque page.
  const objets: string[] = [];
  const idsPages = pages.map((_, i) => 5 + i * 2);
  objets[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objets[2] = `<< /Type /Pages /Kids [${idsPages.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objets[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objets[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  flux.forEach((contenu, i) => {
    const idPage = idsPages[i];
    objets[idPage] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${largeurPage} ${hauteurPage}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idPage + 1} 0 R >>`;
    objets[idPage + 1] = `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`;
  });

  // Tout le contenu est en ASCII (accents échappés en octal) : un caractère = un octet pour la table xref.
  let sortie = '%PDF-1.4\n';
  const positions: number[] = [];
  for (let id = 1; id < objets.length; id++) {
    positions[id] = sortie.length;
    sortie += `${id} 0 obj\n${objets[id]}\nendobj\n`;
  }
  const debutXref = sortie.length;
  sortie += `xref\n0 ${objets.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objets.length; id++) sortie += `${String(positions[id]).padStart(10, '0')} 00000 n \n`;
  sortie += `trailer\n<< /Size ${objets.length} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`;
  return new TextEncoder().encode(sortie);
}

export function exporterPdf(tableau: Tableau): void {
  telecharger(`${tableau.fichier}.pdf`, 'application/pdf', documentPdf(tableau));
}
