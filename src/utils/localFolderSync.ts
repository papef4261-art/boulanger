import JSZip from 'jszip';
import { DailyJournal, AppSettings } from '../types';
import { formatCurrency, formatNumber, formatDateFrench } from './calculations';
import { getLocalDateString } from './dateTime';
import { generateJournalDocxBlob } from './docxExport';
import { generateExcelWorkbook, generateSingleJournalWorkbook } from './excelWorkbookExport';

// Global reference for active directory handle across session
let activeDirectoryHandle: any = null;
const STORAGE_KEY_FOLDER_NAME = 'merchant_pc_folder_name';
const STORAGE_KEY_AUTOSAVE_ENABLED = 'merchant_pc_autosave_enabled';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function getSavedLocalFolderName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_FOLDER_NAME);
  } catch {
    return null;
  }
}

export function isAutoSaveToPcEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTOSAVE_ENABLED);
    return val !== 'false'; // Enabled by default
  } catch {
    return true;
  }
}

export function setAutoSaveToPcEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTOSAVE_ENABLED, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function getActiveDirectoryHandle(): any {
  return activeDirectoryHandle;
}

/**
 * Ask user to select a folder on their PC (e.g. Documents/Journaux_Boulangerie)
 */
export async function connectLocalPcFolder(): Promise<{ success: boolean; folderName?: string; error?: string }> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      error: "Votre navigateur ne supporte pas l'accès direct aux dossiers locaux. Utilisez le bouton 'Télécharger le dossier complet en ZIP' pour enregistrer dans Documents.",
    };
  }

  try {
    // Open directory picker for user to select e.g. Documents/Boulangerie
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });

    activeDirectoryHandle = dirHandle;
    const folderName = dirHandle.name || 'Dossier Documents';
    localStorage.setItem(STORAGE_KEY_FOLDER_NAME, folderName);

    return {
      success: true,
      folderName,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Sélection du dossier annulée.' };
    }
    return { success: false, error: err.message || 'Impossible d’accéder au dossier.' };
  }
}

export function disconnectLocalPcFolder(): void {
  activeDirectoryHandle = null;
  localStorage.removeItem(STORAGE_KEY_FOLDER_NAME);
}

/**
 * Format journal text report
 */
export function generateJournalTextReport(journal: DailyJournal, currency: string = 'CFA'): string {
  const dateStr = formatDateFrench(journal.date);
  const divider = '=======================================================';
  const subDivider = '-------------------------------------------------------';

  let lines: string[] = [];
  lines.push(divider);
  lines.push(`JOURNAL DE CAISSE DU ${dateStr.toUpperCase()}`);
  lines.push(`Article : ${journal.productName}`);
  lines.push(`Prix de Vente : ${formatCurrency(journal.unitSellingPrice, currency)} | Prix Reprise Retour : ${formatCurrency(journal.unitReturnPrice, currency)}`);
  lines.push(divider);
  lines.push('');
  lines.push('DETAIL DES VENDEURS :');
  lines.push(subDivider);
  lines.push(
    'N° | Vendeur'.padEnd(20) + 
    '| Confié'.padEnd(10) + 
    '| Vente'.padEnd(10) + 
    '| Retour'.padEnd(10) + 
    '| Recette'
  );
  lines.push(subDivider);

  journal.sellers.forEach((s, idx) => {
    const num = `${idx + 1}. ${s.name}`.padEnd(20);
    const given = `${s.totalGiven}`.padEnd(10);
    const sold = `${s.soldCount}`.padEnd(10);
    const ret = `${s.returnCount}`.padEnd(10);
    const rev = formatCurrency(s.cashCollected, currency);
    lines.push(`${num}| ${given}| ${sold}| ${ret}| ${rev}`);
  });

  lines.push(subDivider);
  lines.push('');
  lines.push('SYNTHESE COMPTABLE :');
  lines.push(subDivider);
  lines.push(`Total Confié / Produit : ${formatNumber(journal.summary.totalProducedOrGiven)} unités`);
  lines.push(`Total Vendu : ${formatNumber(journal.summary.totalSold)} unités`);
  lines.push(`Total Retours : ${formatNumber(journal.summary.totalReturned)} unités`);
  lines.push(`Chiffre d'Affaires Brut : ${formatCurrency(journal.summary.grossRevenue, currency)}`);
  lines.push(`Montant Retours Reprise : ${formatCurrency(journal.summary.returnPriceTotal, currency)}`);
  lines.push(`Dépenses / Charges : ${formatCurrency(journal.summary.totalExpenses, currency)}`);
  lines.push(`>> GAIN NET DE CAISSE : ${formatCurrency(journal.summary.netGain, currency)} <<`);
  lines.push(divider);
  lines.push(`Enregistré le : ${new Date(journal.updatedAt || journal.createdAt).toLocaleString('fr-FR')}`);
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Generate CSV for a single journal
 */
export function generateSingleJournalCSV(journal: DailyJournal): string {
  const headers = ['Vendeur', 'Total Confié', 'Vente', 'Retour', 'Perte', 'Recette Encaissée (CFA)'];
  const rows = journal.sellers.map((s) => [
    `"${s.name}"`,
    s.totalGiven,
    s.soldCount,
    s.returnCount,
    s.lostCount || 0,
    s.cashCollected,
  ]);

  const summaryRows = [
    [],
    ['SYNTHESE DU JOURNAL', `"${journal.date}"`],
    ['Article', `"${journal.productName}"`],
    ['Prix Vente Unitaire', journal.unitSellingPrice],
    ['Prix Retour Unitaire', journal.unitReturnPrice],
    ['Total Confié', journal.summary.totalProducedOrGiven],
    ['Total Vendu', journal.summary.totalSold],
    ['Total Retours', journal.summary.totalReturned],
    ['Chiffre Affaires Brut', journal.summary.grossRevenue],
    ['Montant Retours', journal.summary.returnPriceTotal],
    ['Dépenses', journal.summary.totalExpenses],
    ['Gain Net Final', journal.summary.netGain],
  ];

  return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';')), ...summaryRows.map((r) => r.join(';'))].join('\n');
}

/**
 * Generate global CSV of all journals
 */
export function generateAllJournalsCSV(journals: DailyJournal[]): string {
  const headers = [
    'Date',
    'Article',
    'Total Produit Confié',
    'Total Vendu',
    'Total Retour',
    'Prix Vente Unitaire',
    'Prix Retour Unitaire',
    'Chiffre Affaires Brut',
    'Total Retours (Reprise)',
    'Dépenses',
    'Gain Net',
    'Nombre Vendeurs',
  ];

  const rows = journals.map((j) => [
    j.date,
    `"${j.productName}"`,
    j.summary.totalProducedOrGiven,
    j.summary.totalSold,
    j.summary.totalReturned,
    j.unitSellingPrice,
    j.unitReturnPrice,
    j.summary.grossRevenue,
    j.summary.returnPriceTotal,
    j.summary.totalExpenses,
    j.summary.netGain,
    j.sellers.length,
  ]);

  return '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
}

/**
 * Save a single journal directly into the user's connected PC folder (JSON, CSV, TXT, and DOCX)
 */
export async function saveJournalToLocalFolder(
  journal: DailyJournal,
  dirHandle: any = activeDirectoryHandle,
  settings?: AppSettings
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!dirHandle) {
    return { success: false, error: 'Aucun dossier PC connecté' };
  }

  try {
    // 1. Save JSON
    const jsonFileName = `Journal_${journal.date}.json`;
    const jsonHandle = await dirHandle.getFileHandle(jsonFileName, { create: true });
    const writableJson = await jsonHandle.createWritable();
    await writableJson.write(JSON.stringify(journal, null, 2));
    await writableJson.close();

    // 2. Save CSV (Excel)
    const csvFileName = `Journal_${journal.date}.csv`;
    const csvHandle = await dirHandle.getFileHandle(csvFileName, { create: true });
    const writableCsv = await csvHandle.createWritable();
    await writableCsv.write(generateSingleJournalCSV(journal));
    await writableCsv.close();

    // 3. Save Text Report
    const txtFileName = `Recu_Caisse_${journal.date}.txt`;
    const txtHandle = await dirHandle.getFileHandle(txtFileName, { create: true });
    const writableTxt = await txtHandle.createWritable();
    await writableTxt.write(generateJournalTextReport(journal));
    await writableTxt.close();

    // 4. Save Word Document (.docx)
    try {
      const docxBlob = await generateJournalDocxBlob(journal, settings);
      const docxFileName = `Journal_${journal.date}.docx`;
      const docxHandle = await dirHandle.getFileHandle(docxFileName, { create: true });
      const writableDocx = await docxHandle.createWritable();
      await writableDocx.write(docxBlob);
      await writableDocx.close();
    } catch (docxErr) {
      console.warn('Could not write docx file to PC directory', docxErr);
    }

    // 5. Save Classeur Excel (.xlsx)
    try {
      const xlsxBlob = generateSingleJournalWorkbook(journal, settings);
      const xlsxFileName = `Classeur_Journal_${journal.date}.xlsx`;
      const xlsxHandle = await dirHandle.getFileHandle(xlsxFileName, { create: true });
      const writableXlsx = await xlsxHandle.createWritable();
      await writableXlsx.write(xlsxBlob);
      await writableXlsx.close();
    } catch (xlsxErr) {
      console.warn('Could not write xlsx file to PC directory', xlsxErr);
    }

    return {
      success: true,
      message: `Enregistré dans le dossier PC sous Journal_${journal.date}.docx et .xlsx`,
    };
  } catch (err: any) {
    console.error('Failed to write to local PC folder', err);
    return {
      success: false,
      error: err.message || 'Erreur d’écriture dans le dossier PC',
    };
  }
}

/**
 * Save all journals and global index into the connected PC folder
 */
export async function syncAllJournalsToLocalFolder(
  journals: DailyJournal[],
  dirHandle: any = activeDirectoryHandle,
  settings?: AppSettings
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!dirHandle) {
    return { success: false, error: 'Aucun dossier PC connecté' };
  }

  try {
    for (const j of journals) {
      await saveJournalToLocalFolder(j, dirHandle, settings);
    }

    // Save global database
    const allJsonHandle = await dirHandle.getFileHandle('HISTORIQUE_COMPLET_BOULANGERIE.json', { create: true });
    const writableAll = await allJsonHandle.createWritable();
    await writableAll.write(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          totalJournals: journals.length,
          journals,
        },
        null,
        2
      )
    );
    await writableAll.close();

    // Save global CSV
    const allCsvHandle = await dirHandle.getFileHandle('HISTORIQUE_COMPLET_EXCEL.csv', { create: true });
    const writableCsv = await allCsvHandle.createWritable();
    await writableCsv.write(generateAllJournalsCSV(journals));
    await writableCsv.close();

    // Save global multi-sheet Excel Workbook (Classeur Comptable Général)
    try {
      const wbBlob = generateExcelWorkbook(journals, settings);
      const wbHandle = await dirHandle.getFileHandle('CLASSEUR_COMPTABLE_GENERAL.xlsx', { create: true });
      const writableWb = await wbHandle.createWritable();
      await writableWb.write(wbBlob);
      await writableWb.close();
    } catch (wbErr) {
      console.warn('Could not write global workbook to PC', wbErr);
    }

    return {
      success: true,
      count: journals.length,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erreur lors de la synchronisation complète du dossier',
    };
  }
}

/**
 * Create a complete ZIP folder with all journals structured neatly for Documents
 */
export async function downloadAllJournalsZip(
  journals: DailyJournal[],
  settings?: AppSettings
): Promise<void> {
  const zip = new JSZip();
  const todayStr = getLocalDateString();
  const folderName = `Boulangerie_Documents_Journaux_${todayStr}`;

  const mainFolder = zip.folder(folderName);
  if (!mainFolder) return;

  const docxFolder = mainFolder.folder('1_Journaux_Word_DOCX');
  const xlsxFolder = mainFolder.folder('2_Classeurs_Excel_XLSX');
  const csvFolder = mainFolder.folder('3_Exports_Excel_CSV');
  const txtFolder = mainFolder.folder('4_Recus_Texte_Imprimables');
  const jsonFolder = mainFolder.folder('5_Donnees_JSON_Individuels');

  // Add individual daily files
  for (const j of journals) {
    jsonFolder?.file(`Journal_${j.date}.json`, JSON.stringify(j, null, 2));
    csvFolder?.file(`Journal_${j.date}.csv`, generateSingleJournalCSV(j));
    txtFolder?.file(`Recu_Caisse_${j.date}.txt`, generateJournalTextReport(j, settings?.currency || 'CFA'));
    
    try {
      const docxBlob = await generateJournalDocxBlob(j, settings);
      docxFolder?.file(`Journal_${j.date}.docx`, docxBlob);
    } catch (e) {
      console.warn('Docx error in zip', e);
    }

    try {
      const xlsxBlob = generateSingleJournalWorkbook(j, settings);
      xlsxFolder?.file(`Classeur_Journal_${j.date}.xlsx`, xlsxBlob);
    } catch (e) {
      console.warn('Xlsx error in zip', e);
    }
  }

  // Global complete files
  try {
    const mainWbBlob = generateExcelWorkbook(journals, settings);
    mainFolder.file('CLASSEUR_COMPTABLE_GENERAL.xlsx', mainWbBlob);
  } catch (e) {
    console.warn('Global workbook zip error', e);
  }

  mainFolder.file(
    'SAUVEGARDE_COMPLETE_HISTORIQUE.json',
    JSON.stringify(
      {
        version: 2,
        business: settings?.businessName || 'Boulangerie',
        exportedAt: new Date().toISOString(),
        totalJournals: journals.length,
        settings,
        journals,
      },
      null,
      2
    )
  );

  mainFolder.file('HISTORIQUE_GLOBAL_EXCEL.csv', generateAllJournalsCSV(journals));

  // Instructions readme
  mainFolder.file(
    'LISEZ-MOI_INSTRUCTIONS.txt',
    `DOSSIER DE SAUVEGARDE AUTOMATIQUE DES JOURNAUX DE CAISSE
Date de sauvegarde : ${new Date().toLocaleString('fr-FR')}
Établissement : ${settings?.businessName || 'Boulangerie'}

Contenu de ce dossier :
- CLASSEUR_COMPTABLE_GENERAL.xlsx : Le Grand Classeur Comptable consolidé multi-feuilles (Synthèse, Vendeurs, Dépenses).
- 1_Journaux_Word_DOCX : Tous vos journaux au format Microsoft Word (.docx) avec tableaux et bilans officiels.
- 2_Classeurs_Excel_XLSX : Tous vos classeurs journaliers au format Microsoft Excel (.xlsx).
- 3_Exports_Excel_CSV : Les fichiers tabulaires CSV compatibles tout tableur.
- 4_Recus_Texte_Imprimables : Les bilans et reçus imprimables pour chaque date.
- 5_Donnees_JSON_Individuels : Tous les journaux jour par jour au format de données.
- SAUVEGARDE_COMPLETE_HISTORIQUE.json : Sauvegarde complète réimportable dans l'application.

Vous pouvez placer ce dossier dans votre dossier 'Documents' sur votre PC pour conserver vos archives en toute sécurité.`
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
