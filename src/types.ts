export interface SellerInfo {
  name: string;
  phone?: string;
  age?: number | string;
  nationalId?: string;
  role?: string;
}

export interface SellerEntry {
  id: string;
  name: string;
  phone?: string;        // Numéro de téléphone (ex: 77 123 45 67)
  age?: number | string; // Âge (ex: 28)
  nationalId?: string;   // N° CNI / Pièce d'identité
  role?: string;         // Rôle (ex: Vendeur, Livreur)
  totalGiven: number;    // Total de pain remis
  soldCount: number;     // Vente
  returnCount: number;   // Retour
  lostCount: number;     // Manquant / Écart non justifié
  cashCollected: number; // Montant théorique ou encaissé
  notes?: string;
}

export interface ExpenseEntry {
  id: string;
  label: string;
  amount: number;
}

export interface JournalSummary {
  totalProducedOrGiven: number; // Total produit (ex: 780)
  totalSold: number;            // Total vendu (ex: 715)
  totalReturned: number;        // Total retourné (ex: 27)
  totalLost: number;            // Total manquant non justifié (ex: 38 ou 0)
  lossPerReturnUnit: number;    // Perte par pain de retour : Prix Vente - Prix Retour (ex: 175 - 50 = 125 CFA)
  returnLossAmount: number;     // Perte sur retours : (retour * 175) - (retour * 50) = retour * 125 (ex: 27 * 125 = 3 375 CFA)
  missingLossAmount: number;    // Perte sur pains manquants : manquant * 175 CFA
  grossRevenue: number;         // Chiffre d'affaires brut (715 * 175 = 125 125 CFA)
  returnPriceTotal: number;     // Valeur encaissée/reprise des retours (27 * 50 = 1 350 CFA)
  lossAmount: number;           // Perte totale calculée (Pertes retours 125 CFA/pain + Pertes manquants)
  totalExpenses: number;        // Dépenses annexes
  netGain: number;              // Total Gagné net final
  salePercentage: number;       // % Ventes (ex: 91.67%)
  returnPercentage: number;     // % Retours (ex: 3.46%)
  lossPercentage: number;       // % Pertes (ex: 4.87%)
}

export interface BakeryBranch {
  id: string; // ex: "boulangerie-principale", "boulangerie-fass"
  name: string; // ex: "Boulangerie Principale"
  bakerName?: string; // Nom du boulanger / responsable (ex: "Amadou Diallo")
  phone?: string;
  address?: string;
  color?: string; // ex: "#2D5A43", "#9C6B28", "#1E40AF"
  defaultSellingPrice?: number;
  defaultReturnPrice?: number;
  defaultCostPrice?: number;
  defaultProductName?: string;
  createdAt: string;
}

export interface DailyJournal {
  id: string;
  date: string; // YYYY-MM-DD
  title?: string;
  bakeryId?: string; // ID de la boulangerie à laquelle appartient ce journal
  bakeryName?: string; // Nom de la boulangerie
  productName: string;
  unitSellingPrice: number; // ex: 175 CFA
  unitReturnPrice: number;  // ex: 50 CFA
  unitCostPrice: number;    // ex: 100 CFA (coût de revient)
  sellers: SellerEntry[];
  expenses: ExpenseEntry[];
  summary: JournalSummary;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  businessName: string;
  businessType: string;
  currency: string;
  defaultProductName: string;
  defaultSellingPrice: number;
  defaultReturnPrice: number;
  defaultCostPrice: number;
  defaultSellers: (string | SellerInfo)[];
  calculationFormula: 'excel_sheet_mode' | 'standard_profit_mode';
  notificationEmail?: string;
  notificationPhone?: string;
  autoSendMessageOnSave?: boolean;
  autoSendChannel?: 'gmail' | 'messages' | 'modal';
}

export type ActivePage = 'journal' | 'history' | 'gains_summary' | 'settings' | 'dashboard' | 'subscription';
export type TimePeriod = 'today' | '7days' | 'month' | 'year' | 'all';

export interface PhoneAccount {
  id: string;
  userId: string;
  phoneNumber: string;
  displayPhone: string;
  displayName: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSubscription {
  userId: string;
  userEmail?: string;
  phoneNumber?: string;
  status: 'trial' | 'active' | 'expired';
  plan: 'premium_monthly' | 'trial' | 'free';
  amount: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  trialUsed?: boolean;
  trialDaysRemaining?: number;
  paymentMethod: 'wave' | 'orange_money' | 'manual' | null;
  lastTransactionId?: string;
  senderPhone?: string;
  paymentReference?: string;
  updatedAt?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  currency: string;
  paymentMethod: 'wave' | 'orange_money' | 'wave_om' | 'manual';
  targetPhone?: string;
  senderPhone?: string;
  paymentReference?: string;
  status: 'pending_verification' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'rejected';
  providerReference?: string;
  checkoutUrl?: string;
  verificationNote?: string;
  verifiedBy?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  isCredited?: boolean;
}

export interface PaymentConfig {
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    currencyCode: string;
    durationDays: number;
    trialDurationDays: number;
    merchantPhone: string;
    description: string;
  };
  merchantPhone: string;
  paymentMode: 'sandbox' | 'production';
  isWaveConfigured: boolean;
  isOrangeMoneyConfigured: boolean;
  webhooks: {
    wave: string;
    orangeMoney: string;
  };
}

export interface MonthlyProfitRecord {
  id: string;              // ex: "month-2026-09"
  monthKey: string;        // ex: "2026-09"
  monthLabel: string;      // ex: "Septembre 2026"
  year: number;
  monthIndex: number;      // 0 = Janvier, 11 = Décembre
  totalNetGain: number;    // Bénéfice Net cumulé du mois
  totalGrossRevenue: number; // Chiffre d'Affaires cumulé du mois
  totalSoldUnits: number;  // Quantité totale vendue
  totalReturnUnits: number;// Quantité totale retournée
  totalReturnAmount?: number; // Montant total des retours du mois
  totalLostUnits: number;  // Pertes / manquants totaux
  totalExpenses: number;   // Dépenses annexes totales du mois
  daysCount: number;       // Nombre de journaux de caisse enregistrés
  averageDailyGain: number;// Bénéfice moyen par jour enregistré
  lastAutoSaved: string;   // Horodatage ISO du dernier enregistrement automatique
  status: 'en_cours' | 'cloture_auto';
}


