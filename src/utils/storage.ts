import { AppSettings, DailyJournal, SellerEntry, SellerInfo, BakeryBranch } from '../types';
import { calculateJournalSummary } from './calculations';
import { getLocalDateString } from './dateTime';

export const DEFAULT_BAKERIES: BakeryBranch[] = [
  {
    id: 'boulangerie-principale',
    name: 'Boulangerie Principale',
    bakerName: 'Boulanger en Chef',
    phone: '+221 77 123 45 67',
    address: 'Boutique Principale - Dakar',
    color: '#2D5A43',
    defaultProductName: 'Pain / Baguette',
    defaultSellingPrice: 175,
    defaultReturnPrice: 50,
    defaultCostPrice: 100,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

export const DEFAULT_SELLER_PROFILES: SellerInfo[] = [
  { name: 'Babacar', phone: '+221 77 123 45 67', age: 29, role: 'Vendeur Principal' },
  { name: 'moussa', phone: '+221 78 234 56 78', age: 34, role: 'Livreur / Vendeur' },
  { name: 'Pape', phone: '+221 76 345 67 89', age: 27, role: 'Vendeur' },
  { name: 'Ndaga', phone: '+221 70 456 78 90', age: 31, role: 'Livreur' },
  { name: 'Khadim', phone: '+221 77 567 89 01', age: 24, role: 'Vendeur Junior' },
  { name: 'Thierno', phone: '+221 78 678 90 12', age: 38, role: 'Responsable Tournée' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Boulangerie & Commerce',
  businessType: 'Boulangerie / Distribution / Commerce',
  currency: 'CFA',
  defaultProductName: 'Pain / Baguette',
  defaultSellingPrice: 175,
  defaultReturnPrice: 50,
  defaultCostPrice: 100,
  defaultSellers: DEFAULT_SELLER_PROFILES,
  calculationFormula: 'excel_sheet_mode',
  notificationEmail: 'papef4261@gmail.com',
  notificationPhone: '',
  autoSendMessageOnSave: false,
  autoSendChannel: 'gmail',
};

const STORAGE_KEY_JOURNALS = 'merchant_cash_journals_v2';
const STORAGE_KEY_SETTINGS = 'merchant_cash_settings_v2';
const STORAGE_KEY_BAKERIES = 'merchant_cash_bakeries_v1';
const STORAGE_KEY_ACTIVE_BAKERY = 'merchant_cash_active_bakery_v1';

export function getInitialSellers(): SellerEntry[] {
  // Directly from the user's image with rich identification
  return [
    {
      id: 'sel-1',
      name: 'Babacar',
      phone: '+221 77 123 45 67',
      age: 29,
      role: 'Vendeur Principal',
      totalGiven: 132,
      soldCount: 130,
      returnCount: 2,
      lostCount: 0,
      cashCollected: 130 * 175,
    },
    {
      id: 'sel-2',
      name: 'moussa',
      phone: '+221 78 234 56 78',
      age: 34,
      role: 'Livreur / Vendeur',
      totalGiven: 134,
      soldCount: 130,
      returnCount: 4,
      lostCount: 0,
      cashCollected: 130 * 175,
    },
    {
      id: 'sel-3',
      name: 'Pape',
      phone: '+221 76 345 67 89',
      age: 27,
      role: 'Vendeur',
      totalGiven: 134,
      soldCount: 130,
      returnCount: 4,
      lostCount: 0,
      cashCollected: 130 * 175,
    },
    {
      id: 'sel-4',
      name: 'Ndaga',
      phone: '+221 70 456 78 90',
      age: 31,
      role: 'Livreur',
      totalGiven: 148,
      soldCount: 100,
      returnCount: 10,
      lostCount: 38,
      cashCollected: 100 * 175,
    },
    {
      id: 'sel-5',
      name: 'Khadim',
      phone: '+221 77 567 89 01',
      age: 24,
      role: 'Vendeur Junior',
      totalGiven: 121,
      soldCount: 117,
      returnCount: 4,
      lostCount: 0,
      cashCollected: 117 * 175,
    },
    {
      id: 'sel-6',
      name: 'Thierno',
      phone: '+221 78 678 90 12',
      age: 38,
      role: 'Responsable Tournée',
      totalGiven: 111,
      soldCount: 108,
      returnCount: 3,
      lostCount: 0,
      cashCollected: 108 * 175,
    },
  ];
}

function generateInitialDemoJournals(): DailyJournal[] {
  const journals: DailyJournal[] = [];
  const baseSellers = getInitialSellers();

  // Le journal a débuté en Septembre 2026
  const septDays = [
    { dateStr: '2026-09-03', title: "Journal de caisse du jour", note: "Données issues de la feuille Excel de caisse." },
    { dateStr: '2026-09-02', title: "Journal de caisse - 2 Septembre", note: "Journée du 2 septembre." },
    { dateStr: '2026-09-01', title: "Journal de caisse - 1er Septembre", note: "Lancement du journal en septembre." },
  ];

  septDays.forEach((item, i) => {
    const variation = 1 - i * 0.04;
    const sellersForDay: SellerEntry[] = baseSellers.map((s, idx) => {
      if (i === 0) return { ...s };
      const given = Math.round(s.totalGiven * variation);
      const ret = Math.max(1, Math.round(s.returnCount * (0.8 + (idx % 3) * 0.2)));
      const sold = Math.max(0, given - ret - (idx === 3 ? 5 : 0));
      const lost = Math.max(0, given - sold - ret);
      return {
        id: `sel-demo-${i}-${idx}`,
        name: s.name,
        totalGiven: given,
        soldCount: sold,
        returnCount: ret,
        lostCount: lost,
        cashCollected: sold * 175,
      };
    });

    const expenses = i === 0 ? [] : [{ id: `exp-${i}`, label: 'Frais de transport & sacs', amount: 1500 }];

    const summary = calculateJournalSummary(
      sellersForDay,
      175,
      50,
      100,
      expenses,
      'excel_sheet_mode'
    );

    journals.push({
      id: `journal-${item.dateStr}`,
      date: item.dateStr,
      title: item.title,
      bakeryId: 'boulangerie-principale',
      bakeryName: 'Boulangerie Principale',
      productName: 'Pain / Baguette',
      unitSellingPrice: 175,
      unitReturnPrice: 50,
      unitCostPrice: 100,
      sellers: sellersForDay,
      expenses,
      summary,
      notes: item.note,
      createdAt: new Date(`${item.dateStr}T18:00:00`).toISOString(),
      updatedAt: new Date(`${item.dateStr}T18:00:00`).toISOString(),
    });
  });

  return journals.sort((a, b) => b.date.localeCompare(a.date));
}

export function normalizeJournal(j: any, settings: AppSettings = DEFAULT_SETTINGS): DailyJournal {
  const sellingPrice = Number(j.unitSellingPrice) || settings.defaultSellingPrice || 175;
  const returnPrice = Number(j.unitReturnPrice) || settings.defaultReturnPrice || 50;
  const costPrice = Number(j.unitCostPrice) || settings.defaultCostPrice || 100;
  const sellers = Array.isArray(j.sellers) ? j.sellers : [];
  const expenses = Array.isArray(j.expenses) ? j.expenses : [];

  let summary = j.summary;
  if (!summary || typeof summary.netGain !== 'number' || isNaN(summary.netGain)) {
    summary = calculateJournalSummary(
      sellers,
      sellingPrice,
      returnPrice,
      costPrice,
      expenses,
      settings.calculationFormula
    );
  }

  return {
    id: j.id || `journal-${j.date || Date.now()}`,
    date: j.date || getLocalDateString(),
    title: j.title || `Journal de caisse - ${j.date || ''}`,
    bakeryId: j.bakeryId || 'boulangerie-principale',
    bakeryName: j.bakeryName || 'Boulangerie Principale',
    productName: j.productName || settings.defaultProductName || 'Pain / Baguette',
    unitSellingPrice: sellingPrice,
    unitReturnPrice: returnPrice,
    unitCostPrice: costPrice,
    sellers,
    expenses,
    summary,
    notes: j.notes || '',
    createdAt: j.createdAt || new Date().toISOString(),
    updatedAt: j.updatedAt || new Date().toISOString(),
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { 
        ...DEFAULT_SETTINGS, 
        ...parsed,
        autoSendMessageOnSave: parsed.autoSendMessageOnSave ?? false
      };
    }
  } catch (err) {
    console.error('Failed to load settings from storage', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function loadJournals(): DailyJournal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JOURNALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalizedList: DailyJournal[] = parsed.map((j: any) => normalizeJournal(j));
        // Le journal a débuté en Septembre 2026 : on ne garde que les journaux à partir de Septembre 2026
        const validList = normalizedList.filter(
          (j: DailyJournal) => j.date && j.date >= '2026-09-01' && !j.id.includes('-hist-')
        );

        if (validList.length !== normalizedList.length) {
          saveJournals(validList);
        }

        if (validList.length > 0) {
          return validList.sort((a, b) => b.date.localeCompare(a.date));
        }
      }
    }
  } catch (err) {
    console.error('Failed to load journals from storage', err);
  }

  const initial = generateInitialDemoJournals();
  saveJournals(initial);
  return initial;
}

export function saveJournals(journals: DailyJournal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(journals));
  } catch (err) {
    console.error('Failed to save journals', err);
  }
}

export function loadBakeries(): BakeryBranch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BAKERIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load bakeries from storage', err);
  }
  saveBakeries(DEFAULT_BAKERIES);
  return DEFAULT_BAKERIES;
}

export function saveBakeries(bakeries: BakeryBranch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BAKERIES, JSON.stringify(bakeries));
  } catch (err) {
    console.error('Failed to save bakeries to storage', err);
  }
}

export function loadActiveBakeryId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_BAKERY);
    if (saved) return saved;
  } catch (err) {
    console.error('Failed to load active bakery id', err);
  }
  return DEFAULT_BAKERIES[0].id;
}

export function saveActiveBakeryId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_BAKERY, id);
  } catch (err) {
    console.error('Failed to save active bakery id', err);
  }
}
