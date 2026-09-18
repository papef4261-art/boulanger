import * as XLSX from 'xlsx';
import { DailyJournal, AppSettings } from '../types';
import { formatCurrency, formatNumber, formatDateFrench } from './calculations';

/**
 * Generate a complete, multi-sheet Microsoft Excel Workbook (.xlsx) / Classeur Excel
 */
export function generateExcelWorkbook(
  journals: DailyJournal[],
  settings?: AppSettings
): Blob {
  const wb = XLSX.utils.book_new();
  const currency = settings?.currency || 'CFA';
  const businessName = settings?.businessName || 'BOULANGERIE';

  // -------------------------------------------------------------
  // FEUILLE 1: SYNTHÈSE GLOBALE DU CLASSEUR
  // -------------------------------------------------------------
  const summaryRows: any[][] = [
    [`CLASSEUR COMPTABLE - ${businessName.toUpperCase()}`],
    [`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`],
    [`Nombre total de journaux enregistrés : ${journals.length}`],
    [],
    [
      'Date',
      'Article',
      'Prix Vente Unitaire',
      'Prix Reprise Retour',
      'Total Confié (Unités)',
      'Total Vendu (Unités)',
      'Total Retour (Unités)',
      'Taux Écoulement (%)',
      `CA Brut Encaissé (${currency})`,
      `Montant Retours Reprise (${currency})`,
      `Total Dépenses (${currency})`,
      `GAIN NET FINAL (${currency})`,
      'Nombre de Vendeurs',
      'Observations'
    ]
  ];

  let totalConfiAll = 0;
  let totalSoldAll = 0;
  let totalReturnAll = 0;
  let totalGrossAll = 0;
  let totalReturnValAll = 0;
  let totalExpAll = 0;
  let totalNetAll = 0;

  journals.forEach((j) => {
    const totalGiven = j.summary.totalProducedOrGiven || 0;
    const totalSold = j.summary.totalSold || 0;
    const totalRet = j.summary.totalReturned || 0;
    const gross = j.summary.grossRevenue || 0;
    const retVal = j.summary.returnPriceTotal || 0;
    const exp = j.summary.totalExpenses || 0;
    const net = j.summary.netGain || 0;
    const rate = totalGiven > 0 ? Math.round((totalSold / totalGiven) * 100) : 0;

    totalConfiAll += totalGiven;
    totalSoldAll += totalSold;
    totalReturnAll += totalRet;
    totalGrossAll += gross;
    totalReturnValAll += retVal;
    totalExpAll += exp;
    totalNetAll += net;

    summaryRows.push([
      j.date,
      j.productName,
      j.unitSellingPrice,
      j.unitReturnPrice,
      totalGiven,
      totalSold,
      totalRet,
      `${rate}%`,
      gross,
      retVal,
      exp,
      net,
      j.sellers.length,
      j.notes || ''
    ]);
  });

  // Total Ligne de clôture
  summaryRows.push([]);
  summaryRows.push([
    'TOTAL GÉNÉRAL DU CLASSEUR',
    '',
    '',
    '',
    totalConfiAll,
    totalSoldAll,
    totalReturnAll,
    totalConfiAll > 0 ? `${Math.round((totalSoldAll / totalConfiAll) * 100)}%` : '0%',
    totalGrossAll,
    totalReturnValAll,
    totalExpAll,
    totalNetAll,
    '',
    ''
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  
  // Column widths
  wsSummary['!cols'] = [
    { wch: 14 }, // Date
    { wch: 20 }, // Article
    { wch: 16 }, // Prix Vente
    { wch: 18 }, // Prix Retour
    { wch: 18 }, // Total Confié
    { wch: 18 }, // Total Vendu
    { wch: 18 }, // Total Retour
    { wch: 18 }, // Taux Écoulement
    { wch: 22 }, // CA Brut
    { wch: 22 }, // Montant Retours
    { wch: 20 }, // Total Dépenses
    { wch: 22 }, // Gain Net
    { wch: 16 }, // Nb Vendeurs
    { wch: 30 }, // Observations
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, '1_Synthese_Globale');

  // -------------------------------------------------------------
  // FEUILLE 2: DÉTAIL DES VENDEURS PAR JOUR
  // -------------------------------------------------------------
  const sellerRows: any[][] = [
    [`HISTORIQUE DÉTAILLÉ DES LIGNES VENDEURS - ${businessName.toUpperCase()}`],
    [],
    [
      'Date du Journal',
      'Article',
      'Nom du Vendeur',
      'Téléphone',
      'Total Confié',
      'Quantité Vendue',
      'Quantité Retour',
      'Pertes / Écart',
      'Taux Vente (%)',
      `Recette Encaissée (${currency})`
    ]
  ];

  journals.forEach((j) => {
    j.sellers.forEach((s) => {
      const rate = s.totalGiven > 0 ? Math.round((s.soldCount / s.totalGiven) * 100) : 0;
      sellerRows.push([
        j.date,
        j.productName,
        s.name,
        s.phone || '',
        s.totalGiven,
        s.soldCount,
        s.returnCount,
        s.lostCount || 0,
        `${rate}%`,
        s.cashCollected
      ]);
    });
  });

  const wsSellers = XLSX.utils.aoa_to_sheet(sellerRows);
  wsSellers['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSellers, '2_Detail_Vendeurs');

  // -------------------------------------------------------------
  // FEUILLE 3: DÉTAIL DES DÉPENSES ET CHARGES
  // -------------------------------------------------------------
  const expenseRows: any[][] = [
    [`REGISTRE DES DÉPENSES & FRAIS - ${businessName.toUpperCase()}`],
    [],
    [
      'Date du Journal',
      'Intitulé / Libellé de la Dépense',
      'Catégorie',
      `Montant (${currency})`,
      'Bénéficiaire / Motif'
    ]
  ];

  journals.forEach((j) => {
    if (j.expenses && j.expenses.length > 0) {
      j.expenses.forEach((e) => {
        expenseRows.push([
          j.date,
          e.label || (e as any).description || 'Dépense diverse',
          (e as any).category || 'Exploitation',
          e.amount || 0,
          (e as any).notes || ''
        ]);
      });
    }
  });

  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
  wsExpenses['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, '3_Registre_Depenses');

  // Generate Excel buffer and Blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate a single Journal Classeur (.xlsx)
 */
export function generateSingleJournalWorkbook(
  journal: DailyJournal,
  settings?: AppSettings
): Blob {
  const wb = XLSX.utils.book_new();
  const currency = settings?.currency || 'CFA';
  const businessName = settings?.businessName || 'BOULANGERIE';

  const rows: any[][] = [
    [`CLASSEUR DE CAISSE JOURNALIER - ${businessName.toUpperCase()}`],
    [`Date : ${formatDateFrench(journal.date)} (${journal.date})`],
    [`Article : ${journal.productName} | Prix Vente : ${formatCurrency(journal.unitSellingPrice, currency)} | Prix Reprise : ${formatCurrency(journal.unitReturnPrice, currency)}`],
    [],
    ['N°', 'Nom du Vendeur', 'Total Confié', 'Quantité Vendue', 'Quantité Retour', `Recette Encaissée (${currency})`]
  ];

  journal.sellers.forEach((s, idx) => {
    rows.push([
      idx + 1,
      s.name,
      s.totalGiven,
      s.soldCount,
      s.returnCount,
      s.cashCollected
    ]);
  });

  rows.push([]);
  rows.push([
    'TOTAL',
    'TOTAL GÉNÉRAL',
    journal.summary.totalProducedOrGiven,
    journal.summary.totalSold,
    journal.summary.totalReturned,
    journal.summary.grossRevenue
  ]);

  rows.push([]);
  rows.push(['SYNTHÈSE DU BILAN FINANCIER']);
  rows.push(['Chiffre d\'Affaires Brut', journal.summary.grossRevenue]);
  rows.push(['Montant Retours Reprise', journal.summary.returnPriceTotal]);
  rows.push(['Total Dépenses & Charges', journal.summary.totalExpenses]);
  rows.push(['GAIN NET FINAL DE CAISSE', journal.summary.netGain]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Journal_${journal.date}`);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Trigger download of the Full Accounting Workbook (.xlsx)
 */
export function downloadExcelWorkbook(
  journals: DailyJournal[],
  settings?: AppSettings
): void {
  const blob = generateExcelWorkbook(journals, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Classeur_Comptable_${settings?.businessName || 'Boulangerie'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of a single Journal Workbook (.xlsx)
 */
export function downloadSingleJournalWorkbook(
  journal: DailyJournal,
  settings?: AppSettings
): void {
  const blob = generateSingleJournalWorkbook(journal, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Classeur_Journal_${journal.date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
