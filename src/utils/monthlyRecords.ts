import { DailyJournal, MonthlyProfitRecord } from '../types';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MONTH_SHORT_NAMES_FR = [
  'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'
];

const STORAGE_KEY_MONTHLY_RECORDS = 'merchant_cash_monthly_records_v1';
const STORAGE_KEY_LAST_AUTO_SAVE = 'merchant_cash_last_monthly_autosave';

/**
 * Consolidates all journals into monthly profit & revenue records (1-month blocks)
 */
export function calculateMonthlyProfitRecords(journals: DailyJournal[]): MonthlyProfitRecord[] {
  const map: Record<string, {
    year: number;
    monthIndex: number;
    totalNetGain: number;
    totalGrossRevenue: number;
    totalSoldUnits: number;
    totalReturnUnits: number;
    totalReturnAmount: number;
    totalLostUnits: number;
    totalExpenses: number;
    daysCount: number;
  }> = {};

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  journals.forEach((j) => {
    if (!j.date) return;
    const parts = j.date.split('-');
    if (parts.length < 2) return;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (isNaN(y) || isNaN(m) || m < 0 || m > 11) return;

    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

    if (!map[monthKey]) {
      map[monthKey] = {
        year: y,
        monthIndex: m,
        totalNetGain: 0,
        totalGrossRevenue: 0,
        totalSoldUnits: 0,
        totalReturnUnits: 0,
        totalReturnAmount: 0,
        totalLostUnits: 0,
        totalExpenses: 0,
        daysCount: 0,
      };
    }

    const returnAmt = j.summary?.returnPriceTotal || ((j.summary?.totalReturned || 0) * (j.unitReturnPrice || 0));

    map[monthKey].totalNetGain += (j.summary?.netGain || 0);
    map[monthKey].totalGrossRevenue += (j.summary?.grossRevenue || 0);
    map[monthKey].totalSoldUnits += (j.summary?.totalSold || 0);
    map[monthKey].totalReturnUnits += (j.summary?.totalReturned || 0);
    map[monthKey].totalReturnAmount += returnAmt;
    map[monthKey].totalLostUnits += (j.summary?.totalLost || 0);
    map[monthKey].totalExpenses += (j.summary?.totalExpenses || 0);
    map[monthKey].daysCount += 1;
  });

  // Ensure the current active month exists even if journals are empty
  if (!map[currentMonthKey]) {
    map[currentMonthKey] = {
      year: currentYear,
      monthIndex: currentMonthIdx,
      totalNetGain: 0,
      totalGrossRevenue: 0,
      totalSoldUnits: 0,
      totalReturnUnits: 0,
      totalReturnAmount: 0,
      totalLostUnits: 0,
      totalExpenses: 0,
      daysCount: 0,
    };
  }

  const existingStored = loadMonthlyRecordsFromStorage();
  const storedMap = new Map(existingStored.map((r) => [r.monthKey, r]));

  // Sort keys chronologically
  const sortedKeys = Object.keys(map).sort();

  return sortedKeys.map((monthKey) => {
    const data = map[monthKey];
    const monthLabel = `${MONTH_NAMES_FR[data.monthIndex]} ${data.year}`;
    const averageDailyGain = data.daysCount > 0 ? Math.round(data.totalNetGain / data.daysCount) : 0;
    const isPastMonth = monthKey < currentMonthKey;
    const previousSaved = storedMap.get(monthKey);

    return {
      id: `monthly-${monthKey}`,
      monthKey,
      monthLabel,
      year: data.year,
      monthIndex: data.monthIndex,
      totalNetGain: data.totalNetGain,
      totalGrossRevenue: data.totalGrossRevenue,
      totalSoldUnits: data.totalSoldUnits,
      totalReturnUnits: data.totalReturnUnits,
      totalReturnAmount: data.totalReturnAmount,
      totalLostUnits: data.totalLostUnits,
      totalExpenses: data.totalExpenses,
      daysCount: data.daysCount,
      averageDailyGain,
      lastAutoSaved: previousSaved?.lastAutoSaved || new Date().toISOString(),
      status: isPastMonth ? 'cloture_auto' : 'en_cours',
    };
  });
}

/**
 * Loads monthly records from localStorage
 */
export function loadMonthlyRecordsFromStorage(): MonthlyProfitRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MONTHLY_RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load monthly records from storage', err);
  }
  return [];
}

/**
 * Saves monthly records to localStorage
 */
export function saveMonthlyRecordsToStorage(records: MonthlyProfitRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MONTHLY_RECORDS, JSON.stringify(records));
    localStorage.setItem(STORAGE_KEY_LAST_AUTO_SAVE, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save monthly records to storage', err);
  }
}

/**
 * Saves monthly records to Firebase Firestore under the user's account
 */
export async function syncMonthlyRecordsToCloud(userId: string, records: MonthlyProfitRecord[]): Promise<void> {
  if (!userId) return;
  try {
    for (const record of records) {
      const recordRef = doc(db, 'users', userId, 'monthly_records', record.monthKey);
      await setDoc(recordRef, {
        ...record,
        userId,
        syncedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Cloud sync of monthly records skipped or failed:', err);
  }
}

/**
 * Performs full automated monthly consolidation and persistent save
 */
export async function autoSaveMonthlyProfitRecords(
  journals: DailyJournal[],
  userId?: string
): Promise<MonthlyProfitRecord[]> {
  const records = calculateMonthlyProfitRecords(journals);
  saveMonthlyRecordsToStorage(records);

  if (userId) {
    syncMonthlyRecordsToCloud(userId, records).catch(() => {
      // Graceful offline fallback
    });
  }

  return records;
}
