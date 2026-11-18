import { describe, expect, it } from 'vitest';
import { classeurXlsx, documentPdf, lireCsv, Tableau, tableauDepuisCsv } from './export';

const tableau: Tableau = {
  titre: 'Recettes été 2026',
  fichier: 'recettes',
  colonnes: ['N° Ticket', 'Contribuable', 'Montant'],
  lignes: [['TK-1', 'Aïssatou Ndiaye (marché)', 12000], ['TK-2', 'Élève « sans CNI »', 500]],
};

const texte = (octets: Uint8Array) => new TextDecoder('latin1').decode(octets);

describe('lireCsv', () => {
  it('lit guillemets, virgules et sauts de ligne dans les cellules', () => {
    expect(lireCsv('﻿a,b\r\n"x, y","dit ""oui""\nfin"\r\n')).toEqual([['a', 'b'], ['x, y', 'dit "oui"\nfin']]);
  });

  it('reconnaît le point-virgule comme séparateur', () => {
    expect(lireCsv('Nom;Montant\nFall;2000')).toEqual([['Nom', 'Montant'], ['Fall', '2000']]);
  });

  it('garde les numéros en texte et convertit les montants en nombres', () => {
    const t = tableauDepuisCsv('Téléphone,Montant\n0771234567,2500', 'T', 'f');
    expect(t.lignes).toEqual([['0771234567', 2500]]);
  });
});

describe('classeurXlsx', () => {
  it('produit une archive ZIP contenant la feuille et ses cellules', () => {
    const octets = classeurXlsx(tableau);
    expect([...octets.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const contenu = new TextDecoder().decode(octets);
    expect(contenu).toContain('xl/worksheets/sheet1.xml');
    expect(contenu).toContain('Aïssatou Ndiaye (marché)');
    expect(contenu).toContain('<v>12000</v>');
  });

  it('échappe les caractères spéciaux XML', () => {
    const contenu = new TextDecoder().decode(classeurXlsx({ ...tableau, lignes: [['A & B <C>', 'x', 1]] }));
    expect(contenu).toContain('A &amp; B &lt;C&gt;');
  });
});

describe('documentPdf', () => {
  it('produit un PDF dont la table des objets pointe au bon endroit', () => {
    const pdf = texte(documentPdf(tableau));
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    const debutXref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.slice(debutXref, debutXref + 4)).toBe('xref');
    const positions = [...pdf.slice(debutXref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    positions.forEach((position, i) => expect(pdf.slice(position).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });

  it('encode les accents en WinAnsi et répartit les lignes sur plusieurs pages', () => {
    const long = { ...tableau, lignes: Array.from({ length: 120 }, (_, i) => [`TK-${i}`, 'Élève', i]) };
    const pdf = texte(documentPdf(long));
    expect(pdf).toContain('\\311l\\350ve');
    expect(Number(pdf.match(/\/Count (\d+)/)?.[1])).toBeGreaterThan(1);
  });
});
