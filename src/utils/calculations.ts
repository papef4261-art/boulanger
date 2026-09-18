import { DailyJournal, JournalSummary, SellerEntry, ExpenseEntry } from '../types';
import { getLocalDateString } from './dateTime';

export function calculateJournalSummary(
  sellers: SellerEntry[],
  unitSellingPrice: number,
  unitReturnPrice: number,
  unitCostPrice: number,
  expenses: ExpenseEntry[] = [],
  calculationFormula: 'excel_sheet_mode' | 'standard_profit_mode' = 'excel_sheet_mode'
): JournalSummary {
  let totalProducedOrGiven = 0;
  let totalSold = 0;
  let totalReturned = 0;
  let totalLost = 0;

  for (const seller of sellers) {
    const given = Number(seller.totalGiven) || 0;
    const sold = Number(seller.soldCount) || 0;
    const returned = Number(seller.returnCount) || 0;
    const lost = Math.max(0, given - (sold + returned));

    totalProducedOrGiven += given;
    totalSold += sold;
    totalReturned += returned;
    totalLost += lost;
  }

  const grossRevenue = totalSold * unitSellingPrice;
  const returnPriceTotal = totalReturned * unitReturnPrice;

  // Calcul automatique de la perte sur retours :
  // Formule : retour * Prix_Vente - retour * Prix_Retour = retour * (Prix_Vente - Prix_Retour)
  // Ex: 27 * 175 - 27 * 50 = 27 * 125 = 3 375 CFA (soit 125 CFA de perte par pain retourné)
  const lossPerReturnUnit = Math.max(0, unitSellingPrice - unitReturnPrice);
  const returnLossAmount = totalReturned * lossPerReturnUnit;
  
  // Perte sur pains manquants / écarts non justifiés
  const missingLossAmount = totalLost * unitSellingPrice;

  // Total des pertes constatées
  const lossAmount = returnLossAmount + missingLossAmount;
  const totalExpenses = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Dans le cahier de caisse :
  // "Prix Vente" = 125 125 CFA (715 * 175)
  // "Prix Retour" = 1 350 CFA (27 * 50)
  // "Perte sur Retours" = 3 375 CFA (27 * 175 - 27 * 50 = 27 * 125)
  // "Gagné Net" = 126 475 CFA (125 125 + 1 350 - dépenses)
  let netGain = 0;
  if (calculationFormula === 'excel_sheet_mode') {
    netGain = grossRevenue + returnPriceTotal - totalExpenses;
  } else {
    // Standard profit: Revenue + Return value - Cost of Goods Sold - Losses - Expenses
    const cogs = totalSold * unitCostPrice;
    netGain = grossRevenue + returnPriceTotal - cogs - lossAmount - totalExpenses;
  }

  const salePercentage = totalProducedOrGiven > 0 ? (totalSold / totalProducedOrGiven) * 100 : 0;
  const returnPercentage = totalProducedOrGiven > 0 ? (totalReturned / totalProducedOrGiven) * 100 : 0;
  const lossPercentage = totalProducedOrGiven > 0 ? ((totalReturned + totalLost) / totalProducedOrGiven) * 100 : 0;

  return {
    totalProducedOrGiven,
    totalSold,
    totalReturned,
    totalLost,
    lossPerReturnUnit,
    returnLossAmount,
    missingLossAmount,
    grossRevenue,
    returnPriceTotal,
    lossAmount,
    totalExpenses,
    netGain,
    salePercentage: Number(salePercentage.toFixed(2)),
    returnPercentage: Number(returnPercentage.toFixed(2)),
    lossPercentage: Number(lossPercentage.toFixed(2)),
  };
}

export function formatNumberWithDots(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const rounded = Math.round(num);
  const isNegative = rounded < 0;
  const absStr = Math.abs(rounded).toString();
  const dotted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-${dotted}` : dotted;
}

export function formatCurrency(amount: number, currency: string = 'CFA'): string {
  const formatted = formatNumberWithDots(amount);
  const trimmedCurr = currency ? currency.trim() : '';
  return trimmedCurr ? `${formatted} ${trimmedCurr}` : formatted;
}

export function formatNumber(num: number): string {
  return formatNumberWithDots(num);
}

export function formatDateFrench(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const date = new Date(year, month - 1, day);
        return new Intl.DateTimeFormat('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
      }
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function filterJournalsByPeriod(journals: DailyJournal[], period: 'today' | '7days' | 'month' | 'year' | 'all'): DailyJournal[] {
  if (journals.length === 0) return [];
  
  // Sort journals by date descending
  const sorted = [...journals].sort((a, b) => b.date.localeCompare(a.date));
  if (period === 'all') return sorted;

  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (period === 'today') {
    // If today is in journals, return today; otherwise return the most recent entry
    const todayMatch = sorted.filter(j => j.date === todayStr);
    return todayMatch.length > 0 ? todayMatch : sorted.slice(0, 1);
  }

  const cutoff = new Date();
  if (period === '7days') {
    cutoff.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    cutoff.setDate(now.getDate() - 30);
  } else if (period === 'year') {
    cutoff.setDate(now.getDate() - 365);
  }

  const cutoffStr = getLocalDateString(cutoff);
  const filtered = sorted.filter(j => j.date >= cutoffStr);
  const fallbackCount = period === '7days' ? 7 : period === 'year' ? 365 : 30;
  return filtered.length > 0 ? filtered : sorted.slice(0, fallbackCount);
}
