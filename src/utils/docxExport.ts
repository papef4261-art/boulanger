import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber
} from 'docx';
import { DailyJournal, AppSettings } from '../types';
import { formatCurrency, formatNumber, formatDateFrench } from './calculations';

/**
 * Generate a complete, beautifully styled Microsoft Word (.docx) document Blob for a daily journal
 */
export async function generateJournalDocxBlob(
  journal: DailyJournal,
  settings?: AppSettings
): Promise<Blob> {
  const currency = settings?.currency || 'CFA';
  const businessName = settings?.businessName || 'BOULANGERIE';
  const dateFormatted = formatDateFrench(journal.date);

  // Table cell borders style
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'DCD6CB' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DCD6CB' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'DCD6CB' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'DCD6CB' },
  };

  const headerBorders = {
    top: { style: BorderStyle.SINGLE, size: 2, color: '2D5A43' },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: '2D5A43' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '2D5A43' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '2D5A43' },
  };

  // Header row for Sellers Table
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        shading: { fill: '2D5A43', type: ShadingType.CLEAR },
        borders: headerBorders,
        width: { size: 3200, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: 'VENDEUR', bold: true, color: 'FFFFFF', size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: '2D5A43', type: ShadingType.CLEAR },
        borders: headerBorders,
        width: { size: 1500, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'CONFIÉ', bold: true, color: 'FFFFFF', size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: '2D5A43', type: ShadingType.CLEAR },
        borders: headerBorders,
        width: { size: 1500, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'VENTE', bold: true, color: 'FFFFFF', size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: '2D5A43', type: ShadingType.CLEAR },
        borders: headerBorders,
        width: { size: 1500, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'RETOUR', bold: true, color: 'FFFFFF', size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: '2D5A43', type: ShadingType.CLEAR },
        borders: headerBorders,
        width: { size: 2100, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'RECETTE', bold: true, color: 'FFFFFF', size: 20 })],
          }),
        ],
      }),
    ],
  });

  // Seller rows
  const sellerRows = journal.sellers.map((s, idx) => {
    const isEven = idx % 2 === 0;
    const bgFill = isEven ? 'FAFAF7' : 'FFFFFF';

    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. `, bold: true, color: '7A756D', size: 19 }),
                new TextRun({ text: s.name, bold: true, color: '1A1A1A', size: 20 }),
              ],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: formatNumber(s.totalGiven), size: 20 })],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: formatNumber(s.soldCount), bold: true, color: '1B3628', size: 20 })],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: formatNumber(s.returnCount), size: 20 })],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: formatCurrency(s.cashCollected, currency), bold: true, color: '1A1A1A', size: 20 })],
            }),
          ],
        }),
      ],
    });
  });

  // Table total row
  const tableTotalRow = new TableRow({
    children: [
      new TableCell({
        shading: { fill: 'EBE8E0', type: ShadingType.CLEAR },
        borders: headerBorders,
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'TOTAL GENERAL', bold: true, color: '1A1A1A', size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: 'EBE8E0', type: ShadingType.CLEAR },
        borders: headerBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: formatNumber(journal.summary.totalProducedOrGiven), bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: 'EBE8E0', type: ShadingType.CLEAR },
        borders: headerBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: formatNumber(journal.summary.totalSold), bold: true, color: '2D5A43', size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: 'EBE8E0', type: ShadingType.CLEAR },
        borders: headerBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: formatNumber(journal.summary.totalReturned), bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: 'EBE8E0', type: ShadingType.CLEAR },
        borders: headerBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: formatCurrency(journal.summary.grossRevenue, currency), bold: true, color: '2D5A43', size: 20 })],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${businessName} — Journal Officiel de Caisse`,
                    italics: true,
                    size: 16,
                    color: '8C877E',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '8C877E' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '8C877E',
                  }),
                  new TextRun({ text: ' sur ', size: 16, color: '8C877E' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '8C877E',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: businessName.toUpperCase(),
                bold: true,
                size: 32,
                color: '2D5A43',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `JOURNAL DE CAISSE DU ${dateFormatted.toUpperCase()}`,
                bold: true,
                size: 24,
                color: '1A1A1A',
              }),
            ],
          }),

          // Information Bar
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'Article vendu : ', bold: true }),
              new TextRun({ text: `${journal.productName}    |    ` }),
              new TextRun({ text: 'Prix unitaire vente : ', bold: true }),
              new TextRun({ text: `${formatCurrency(journal.unitSellingPrice, currency)}    |    ` }),
              new TextRun({ text: 'Prix reprise retour : ', bold: true }),
              new TextRun({ text: `${formatCurrency(journal.unitReturnPrice, currency)}` }),
            ],
          }),

          // Space
          new Paragraph({ spacing: { after: 120 }, children: [] }),

          // Sellers Table
          new Table({
            width: { size: 9800, type: WidthType.DXA },
            rows: [tableHeaderRow, ...sellerRows, tableTotalRow],
          }),

          // Space
          new Paragraph({ spacing: { after: 200, before: 200 }, children: [] }),

          // Financial Summary Box
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'SYNTHÈSE FINANCIÈRE DE LA JOURNÉE',
                bold: true,
                size: 22,
                color: '2D5A43',
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              new TextRun({ text: '• Total Produits Confiés : ', bold: true }),
              new TextRun({ text: `${formatNumber(journal.summary.totalProducedOrGiven)} unités` }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Total Produits Vendus : ', bold: true }),
              new TextRun({ text: `${formatNumber(journal.summary.totalSold)} unités (${Math.round((journal.summary.totalSold / (journal.summary.totalProducedOrGiven || 1)) * 100)}% d\'écoulement)` }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Total Produits Retours : ', bold: true }),
              new TextRun({ text: `${formatNumber(journal.summary.totalReturned)} unités` }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Chiffre d\'Affaires Brut Encaissé : ', bold: true }),
              new TextRun({ text: `${formatCurrency(journal.summary.grossRevenue, currency)}`, bold: true, color: '1B3628' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Montant Retours (Reprise) : ', bold: true }),
              new TextRun({ text: `${formatCurrency(journal.summary.returnPriceTotal, currency)}` }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '• Dépenses & Charges du jour : ', bold: true }),
              new TextRun({ text: `${formatCurrency(journal.summary.totalExpenses, currency)}` }),
            ],
          }),

          // Gain net highlight
          new Paragraph({
            spacing: { before: 100, after: 300 },
            children: [
              new TextRun({
                text: `>>> GAIN NET FINAL DE CAISSE : ${formatCurrency(journal.summary.netGain, currency)} <<<`,
                bold: true,
                size: 24,
                color: '2D5A43',
              }),
            ],
          }),

          // Notes if any
          ...(journal.notes
            ? [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({ text: 'Observations / Notes : ', bold: true, italics: true }),
                    new TextRun({ text: journal.notes, italics: true }),
                  ],
                }),
              ]
            : []),

          // Signatures section
          new Paragraph({ spacing: { before: 300 }, children: [] }),
          new Table({
            width: { size: 9800, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    width: { size: 4900, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Le Responsable de Caisse :', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { before: 400 },
                        children: [
                          new TextRun({ text: 'Signature : ...................................', size: 18, color: '7A756D' }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    width: { size: 4900, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Le Gérant / Propriétaire :', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { before: 400 },
                        children: [
                          new TextRun({ text: 'Signature : ...................................', size: 18, color: '7A756D' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Trigger browser download for a Journal as Microsoft Word (.docx)
 */
export async function downloadJournalDocx(
  journal: DailyJournal,
  settings?: AppSettings
): Promise<void> {
  const blob = await generateJournalDocxBlob(journal, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Journal_Caisse_${journal.date}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
