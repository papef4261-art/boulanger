import React, { useState, useEffect } from 'react';
import { AppSettings, DailyJournal, ExpenseEntry, SellerEntry, SellerInfo } from '../types';
import { calculateJournalSummary, formatCurrency, formatNumber, formatDateFrench } from '../utils/calculations';
import { DEFAULT_SELLER_PROFILES } from '../utils/storage';
import { 
  getLocalDateString, 
  getOffsetDateString, 
  formatFrenchDateLong, 
  useLiveDateTime 
} from '../utils/dateTime';
import { 
  Save, 
  Printer, 
  Plus, 
  PlusCircle,
  Trash2, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Receipt, 
  UserPlus, 
  TrendingUp, 
  Percent, 
  Copy, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  RefreshCw,
  Zap,
  Phone,
  UserCheck,
  Edit3,
  FolderDown,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Send,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  saveJournalToLocalFolder, 
  getActiveDirectoryHandle, 
  getSavedLocalFolderName 
} from '../utils/localFolderSync';
import { downloadJournalDocx } from '../utils/docxExport';
import { SendSynthesisModal } from './SendSynthesisModal';
import { 
  generateSynthesisSubject, 
  generateSynthesisText, 
  getGmailComposeUrl, 
  getSmsUrl 
} from '../utils/summaryMessaging';

interface DailyJournalEditorProps {
  currentJournal: DailyJournal;
  settings: AppSettings;
  onSaveJournal: (journal: DailyJournal) => void;
  onPrintJournal: (journal: DailyJournal) => void;
  onNewJournal: () => void;
  onUpdateSettings?: (settings: AppSettings) => void;
  journals?: DailyJournal[];
  onSelectJournal?: (journal: DailyJournal) => void;
}

export const DailyJournalEditor: React.FC<DailyJournalEditorProps> = ({
  currentJournal,
  settings,
  onSaveJournal,
  onPrintJournal,
  onNewJournal,
  onUpdateSettings,
  journals = [],
  onSelectJournal,
}) => {
  const { todayStr: liveTodayStr, timeStr: liveTimeStr } = useLiveDateTime();
  const [date, setDate] = useState(currentJournal.date || getLocalDateString());
  const [isAutoDate, setIsAutoDate] = useState<boolean>(() => {
    return currentJournal.date === getLocalDateString();
  });
  const [productName, setProductName] = useState(currentJournal.productName || settings.defaultProductName);
  const [unitSellingPrice, setUnitSellingPrice] = useState(currentJournal.unitSellingPrice || settings.defaultSellingPrice);
  const [unitReturnPrice, setUnitReturnPrice] = useState(currentJournal.unitReturnPrice || settings.defaultReturnPrice);
  const [unitCostPrice, setUnitCostPrice] = useState(currentJournal.unitCostPrice || settings.defaultCostPrice);
  const [sellers, setSellers] = useState<SellerEntry[]>(currentJournal.sellers);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(currentJournal.expenses || []);
  const [notes, setNotes] = useState(currentJournal.notes || '');
  const [showExpenses, setShowExpenses] = useState(expenses.length > 0);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [pcSaveMsg, setPcSaveMsg] = useState<string | null>(null);
  const [autoSentNotice, setAutoSentNotice] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);
  
  // Calculation mode for seller lines: 'return_from_sold' calculates Return = Total Confié - Vente automatically
  const [sellerAutoCalcMode, setSellerAutoCalcMode] = useState<'return_from_sold' | 'sold_from_return' | 'manual'>('return_from_sold');

  // If auto-date mode is enabled and the day changes (e.g. at midnight), update date automatically
  useEffect(() => {
    if (isAutoDate && liveTodayStr && date !== liveTodayStr) {
      setDate(liveTodayStr);
    }
  }, [isAutoDate, liveTodayStr, date]);

  // Sync state when currentJournal changes from external selection (e.g. clicking a history item)
  useEffect(() => {
    setDate(currentJournal.date);
    setIsAutoDate(currentJournal.date === getLocalDateString());
    setProductName(currentJournal.productName || settings.defaultProductName);
    setUnitSellingPrice(currentJournal.unitSellingPrice || settings.defaultSellingPrice);
    setUnitReturnPrice(currentJournal.unitReturnPrice || settings.defaultReturnPrice);
    setUnitCostPrice(currentJournal.unitCostPrice || settings.defaultCostPrice);
    setSellers(currentJournal.sellers);
    setExpenses(currentJournal.expenses || []);
    setNotes(currentJournal.notes || '');
    setShowExpenses((currentJournal.expenses || []).length > 0);
  }, [currentJournal.id, currentJournal.updatedAt]);

  // Automatically sync newly added sellers from settings (Identification de l'Équipe) directly into Comptabilité des Vendeurs / Livreurs
  useEffect(() => {
    if (!settings?.defaultSellers?.length) return;

    setSellers((prevSellers) => {
      const existingNames = new Set(prevSellers.map((s) => s.name.trim().toLowerCase()));
      const toAdd: SellerEntry[] = [];

      settings.defaultSellers.forEach((item, index) => {
        const sName = typeof item === 'string' ? item.trim() : item.name.trim();
        if (sName && !existingNames.has(sName.toLowerCase())) {
          existingNames.add(sName.toLowerCase());
          const phone = typeof item === 'object' && item.phone ? item.phone : '+221 77 000 00 00';
          const age = typeof item === 'object' && item.age ? item.age : 25;
          const role = typeof item === 'object' && item.role ? item.role : 'Vendeur';

          toAdd.push({
            id: `sel-auto-${Date.now()}-${index}`,
            name: sName,
            phone,
            age,
            role,
            totalGiven: 0,
            soldCount: 0,
            returnCount: 0,
            lostCount: 0,
            cashCollected: 0,
          });
        }
      });

      if (toAdd.length === 0) return prevSellers;
      return [...prevSellers, ...toAdd];
    });
  }, [settings.defaultSellers]);

  // Live calculation of summary
  const summary = calculateJournalSummary(
    sellers,
    unitSellingPrice,
    unitReturnPrice,
    unitCostPrice,
    expenses,
    settings.calculationFormula
  );

  // Handlers for Seller rows with Automatic Calculation support (Total confié - Vente = Retour)
  const handleSellerChange = (id: string, field: keyof SellerEntry, value: any) => {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        const given = Number(updated.totalGiven) || 0;
        let sold = Number(updated.soldCount) || 0;
        let returned = Number(updated.returnCount) || 0;

        // Auto calculate based on chosen mode
        if (sellerAutoCalcMode === 'return_from_sold') {
          if (field === 'totalGiven' || field === 'soldCount') {
            returned = Math.max(0, given - sold);
            updated.returnCount = returned;
          }
        } else if (sellerAutoCalcMode === 'sold_from_return') {
          if (field === 'totalGiven' || field === 'returnCount') {
            sold = Math.max(0, given - returned);
            updated.soldCount = sold;
          }
        }

        const lost = Math.max(0, given - (sold + returned));
        return {
          ...updated,
          lostCount: lost,
          cashCollected: sold * unitSellingPrice,
        };
      })
    );
  };

  // Bulk calculate all returns as: Total confié - Vente = Retour
  const handleRecalculateAllReturns = () => {
    setSellers((prev) =>
      prev.map((s) => {
        const given = Number(s.totalGiven) || 0;
        const sold = Number(s.soldCount) || 0;
        const returned = Math.max(0, given - sold);
        return {
          ...s,
          returnCount: returned,
          lostCount: 0,
          cashCollected: sold * unitSellingPrice,
        };
      })
    );
  };

  // Bulk calculate all sales as: Total confié - Retour = Vente
  const handleRecalculateAllSales = () => {
    setSellers((prev) =>
      prev.map((s) => {
        const given = Number(s.totalGiven) || 0;
        const returned = Number(s.returnCount) || 0;
        const sold = Math.max(0, given - returned);
        return {
          ...s,
          soldCount: sold,
          lostCount: 0,
          cashCollected: sold * unitSellingPrice,
        };
      })
    );
  };

  const handleAddSeller = (name: string = '', phone: string = '', age: number = 25, role: string = 'Vendeur') => {
    const newId = `sel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const given = 100;
    const sold = 95;
    const returned = sellerAutoCalcMode === 'return_from_sold' ? Math.max(0, given - sold) : 5;
    const newSeller: SellerEntry = {
      id: newId,
      name: name || `Vendeur ${sellers.length + 1}`,
      phone: phone || '+221 77 000 00 00',
      age: age || 25,
      role: role || 'Vendeur',
      totalGiven: given,
      soldCount: sold,
      returnCount: returned,
      lostCount: 0,
      cashCollected: sold * unitSellingPrice,
    };
    setSellers((prev) => [...prev, newSeller]);
  };

  const handleRemoveSeller = (id: string) => {
    if (sellers.length <= 1) return;
    setSellers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleMarkAllSold = () => {
    setSellers((prev) =>
      prev.map((s) => {
        const given = Number(s.totalGiven) || 0;
        return {
          ...s,
          soldCount: given,
          returnCount: 0,
          lostCount: 0,
          cashCollected: given * unitSellingPrice,
        };
      })
    );
  };

  const handleResetAllSold = () => {
    setSellers((prev) =>
      prev.map((s) => ({
        ...s,
        soldCount: 0,
        returnCount: 0,
        lostCount: 0,
        cashCollected: 0,
      }))
    );
  };

  const handlePopulateDefaultSellers = () => {
    const newSellers: SellerEntry[] = settings.defaultSellers.map((sellerItem, index) => {
      const sellerName = typeof sellerItem === 'string' ? sellerItem : sellerItem.name;
      const existing = sellers.find((s) => s.name.toLowerCase() === sellerName.toLowerCase());
      if (existing) return existing;

      // Find profile in DEFAULT_SELLER_PROFILES if available
      const matchedProfile = DEFAULT_SELLER_PROFILES.find(
        (p) => p.name.toLowerCase() === sellerName.toLowerCase()
      );

      const phone = typeof sellerItem === 'object' && sellerItem.phone 
        ? sellerItem.phone 
        : matchedProfile?.phone || '+221 77 000 00 00';
      const age = typeof sellerItem === 'object' && sellerItem.age 
        ? sellerItem.age 
        : matchedProfile?.age || 25;
      const role = typeof sellerItem === 'object' && sellerItem.role 
        ? sellerItem.role 
        : matchedProfile?.role || 'Vendeur';

      return {
        id: `sel-def-${Date.now()}-${index}`,
        name: sellerName,
        phone,
        age,
        role,
        totalGiven: 120,
        soldCount: 115,
        returnCount: 5,
        lostCount: 0,
        cashCollected: 115 * unitSellingPrice,
      };
    });
    setSellers(newSellers);
  };

  // Handlers for Expenses
  const handleAddExpense = () => {
    const newExpense: ExpenseEntry = {
      id: `exp-${Date.now()}`,
      label: 'Autre charge (farine, sacs, transport...)',
      amount: 1000,
    };
    setExpenses((prev) => [...prev, newExpense]);
    setShowExpenses(true);
  };

  const handleExpenseChange = (id: string, field: 'label' | 'amount', value: any) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) || 0 : value } : e))
    );
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Date change handler: if an archived journal already exists for this date, switch to it
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setIsAutoDate(newDate === liveTodayStr);
    if (onSelectJournal && journals && journals.length > 0) {
      const existing = journals.find((j) => j.date === newDate);
      if (existing) {
        onSelectJournal(existing);
      }
    }
  };

  // Save handler: saves and adds to Historique des Journaux
  const handleSave = async () => {
    const journalId = currentJournal.id && currentJournal.id.includes(date)
      ? currentJournal.id
      : `journal-${date}`;

    const journalToSave: DailyJournal = {
      ...currentJournal,
      id: journalId,
      date,
      productName,
      unitSellingPrice,
      unitReturnPrice,
      unitCostPrice,
      sellers,
      expenses,
      summary,
      notes,
      updatedAt: new Date().toISOString(),
    };

    onSaveJournal(journalToSave);

    // Envoi automatique de la synthèse de caisse (Gmail Google ou Messages SMS) si activé dans les paramètres
    const autoSendEnabled = !!settings.autoSendMessageOnSave;
    if (autoSendEnabled) {
      try {
        const email = (settings.notificationEmail || 'papef4261@gmail.com').trim();
        const phone = (settings.notificationPhone || '').trim();
        const subject = generateSynthesisSubject(journalToSave, settings);
        const body = generateSynthesisText(journalToSave, settings);

        if (settings.autoSendChannel === 'messages') {
          const smsUrl = getSmsUrl(phone, body);
          window.location.href = smsUrl;
          setAutoSentNotice('Synthèse ouverte dans Messages (SMS) !');
        } else if (settings.autoSendChannel === 'modal') {
          setShowSendModal(true);
        } else {
          // Par défaut : Gmail (Compte Google)
          const gmailUrl = getGmailComposeUrl(email, subject, body);
          window.open(gmailUrl, '_blank', 'noopener,noreferrer');
          setAutoSentNotice(`Synthèse ouverte dans Gmail (${email}) !`);
        }
        setTimeout(() => setAutoSentNotice(null), 5000);
      } catch (err) {
        console.warn('Auto-send notice error:', err);
      }
    }

    // If PC folder is connected, save directly to PC in real-time
    const dirHandle = getActiveDirectoryHandle();
    const folderName = getSavedLocalFolderName();
    if (dirHandle) {
      const pcRes = await saveJournalToLocalFolder(journalToSave, dirHandle);
      if (pcRes.success) {
        setPcSaveMsg(`Enregistré sur PC dans le dossier "${folderName}" !`);
        setTimeout(() => setPcSaveMsg(null), 4000);
      }
    }

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // safe fallback
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 4000);
  };

  const handleManualSaveToPc = async () => {
    const journalToSave: DailyJournal = {
      ...currentJournal,
      date,
      productName,
      unitSellingPrice,
      unitReturnPrice,
      unitCostPrice,
      sellers,
      expenses,
      summary,
      notes,
      updatedAt: new Date().toISOString(),
    };

    // 1. Download official Word (.docx) document
    try {
      await downloadJournalDocx(journalToSave, settings);
    } catch (docErr) {
      console.error('Word export error', docErr);
    }

    // 2. If PC folder is connected, also write to the local directory
    const dirHandle = getActiveDirectoryHandle();
    const folderName = getSavedLocalFolderName();
    if (dirHandle) {
      const res = await saveJournalToLocalFolder(journalToSave, dirHandle, settings);
      if (res.success) {
        setPcSaveMsg(`Fiche Word (.docx) téléchargée et enregistrée dans "${folderName}" !`);
        setTimeout(() => setPcSaveMsg(null), 4000);
        return;
      }
    }

    setPcSaveMsg(`Fiche journal générée et téléchargée avec succès au format Word (.docx) !`);
    setTimeout(() => setPcSaveMsg(null), 4000);
  };

  const currentJournalSnapshot: DailyJournal = {
    ...currentJournal,
    date,
    productName,
    unitSellingPrice,
    unitReturnPrice,
    unitCostPrice,
    sellers,
    expenses,
    summary,
    notes,
    updatedAt: new Date().toISOString(),
  };

  const handleOpenGmailDirect = () => {
    const subject = generateSynthesisSubject(currentJournalSnapshot, settings);
    const body = generateSynthesisText(currentJournalSnapshot, settings);
    const email = settings.notificationEmail || 'papef4261@gmail.com';
    const url = getGmailComposeUrl(email, subject, body);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMessagesDirect = () => {
    const body = generateSynthesisText(currentJournalSnapshot, settings);
    const phone = settings.notificationPhone || '';
    const url = getSmsUrl(phone, body);
    window.location.href = url;
  };

  const handleCopySynthesisDirect = async () => {
    const body = generateSynthesisText(currentJournalSnapshot, settings);
    try {
      await navigator.clipboard.writeText(body);
      setCopiedSynthesis(true);
      setTimeout(() => setCopiedSynthesis(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" id="daily-journal-container">
      
      {/* 1. SYNTHÈSE JOURNALIÈRE DE CAISSE (AU-DESSUS) */}
      <div className="bg-[#1F1E1C] text-[#F4F1EA] rounded-2xl p-5 shadow-md border border-[#383530] space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#383530] pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3D9970]"></span>
            <h3 className="font-bold text-base font-editorial text-[#F4F1EA] tracking-wide">
              Synthèse Journalière de Caisse
            </h3>
            {currentJournal.bakeryName && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2D5A43] text-[#E7EFEA] border border-[#3D7A5C] font-semibold">
                🥖 {currentJournal.bakeryName}
              </span>
            )}
          </div>

          {/* Quick Messaging & Copy Actions (Copier, Gmail, Options) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-copy-synthesis-direct"
              type="button"
              onClick={handleCopySynthesisDirect}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2D2A26] hover:bg-[#383530] text-[#E7EFEA] border border-[#48443D] shadow-2xs transition-all cursor-pointer"
              title="Copier le texte de la synthèse de caisse dans le presse-papier"
            >
              {copiedSynthesis ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3D9970]" />
                  <span className="text-[#3D9970] font-bold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#A6A095]" />
                  <span>Copier résumé</span>
                </>
              )}
            </button>

            <button
              id="btn-synthesis-gmail-header"
              type="button"
              onClick={handleOpenGmailDirect}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EA4335] hover:bg-[#D93025] text-white shadow-xs transition-all cursor-pointer"
              title={`Ouvrir dans Gmail (${settings.notificationEmail || 'papef4261@gmail.com'}) avec la synthèse rédigée`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail (Google)</span>
            </button>

            <button
              id="btn-synthesis-options-header"
              type="button"
              onClick={() => setShowSendModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3D9970] hover:bg-[#2E7A58] text-white shadow-xs transition-all cursor-pointer"
              title="Toutes les options d'envoi (WhatsApp, modification destinataire, etc.)"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Envoyer...</span>
            </button>
          </div>
        </div>

        {/* 5 Key Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Total produit */}
          <div className="bg-[#2D2A26] hover:bg-[#33302B] rounded-xl p-3.5 border border-[#423E37] transition-all duration-150 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#A6A095] font-medium font-editorial">Total produit</span>
              <span className="text-[10px] text-[#A6A095]/70 font-mono px-1.5 py-0.5 rounded bg-[#201E1C]">Confié</span>
            </div>
            <p className="text-2xl font-bold text-white font-mono-num">
              {formatNumber(summary.totalProducedOrGiven)}
            </p>
          </div>

          {/* Prix Vente */}
          <div className="bg-[#1C3325] hover:bg-[#203B2A] rounded-xl p-3.5 border border-[#2B543D] transition-all duration-150 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#A3D9BC] font-medium font-editorial">Prix Vente</span>
              <span className="text-[10px] text-[#A3D9BC]/80 font-mono px-1.5 py-0.5 rounded bg-[#13241A]">{summary.salePercentage}%</span>
            </div>
            <p className="text-2xl font-bold text-[#C8EAD8] font-mono-num">
              {formatCurrency(summary.grossRevenue, settings.currency)}
            </p>
          </div>

          {/* Prix Retour */}
          <div className="bg-[#382B17] hover:bg-[#40311A] rounded-xl p-3.5 border border-[#634E27] transition-all duration-150 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#F2D69B] font-medium font-editorial">Prix retour</span>
              <span className="text-[10px] text-[#F2D69B]/80 font-mono px-1.5 py-0.5 rounded bg-[#241B0E]">{summary.returnPercentage}%</span>
            </div>
            <p className="text-2xl font-bold text-[#F7E5C0] font-mono-num">
              {formatCurrency(summary.returnPriceTotal, settings.currency)}
            </p>
          </div>

          {/* Perte sur Retours */}
          <div className="bg-[#381B1B] hover:bg-[#401F1F] rounded-xl p-3.5 border border-[#6B2F2F] transition-all duration-150 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#F29B9B] font-medium font-editorial">Perte Retours</span>
              <span className="text-[10px] text-[#F29B9B]/80 font-mono px-1.5 py-0.5 rounded bg-[#241010]">{summary.lossPerReturnUnit} CFA/u</span>
            </div>
            <p className="text-2xl font-bold text-[#F8C4C4] font-mono-num">
              {formatCurrency(summary.returnLossAmount, settings.currency)}
            </p>
          </div>

          {/* Gagné (Bénéfice Net) */}
          <div className="bg-[#2D5A43] hover:bg-[#34674D] rounded-xl p-3.5 border border-[#488765] col-span-2 sm:col-span-1 shadow-md transition-all duration-150">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#D8EADB] font-bold uppercase tracking-wider font-editorial">
                Gagné Net
              </span>
              <span className="text-[10px] text-white/90 font-mono px-1.5 py-0.5 rounded bg-[#1B3628]">Bénéfice</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono-num">
              {formatCurrency(summary.netGain, settings.currency)}
            </p>
          </div>

        </div>

        {/* Visual Ratio Progress Bar (Ventes vs Retours) */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full bg-[#201E1C] rounded-full h-2.5 overflow-hidden flex border border-[#383530]">
            <div 
              className="bg-[#3D9970] h-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(0, summary.salePercentage))}%` }} 
              title={`Ventes : ${summary.salePercentage}%`} 
            />
            <div 
              className="bg-[#D97706] h-full transition-all duration-300" 
              style={{ width: `${Math.min(100 - summary.salePercentage, Math.max(0, summary.returnPercentage))}%` }} 
              title={`Retours : ${summary.returnPercentage}%`} 
            />
            {Math.max(0, 100 - summary.salePercentage - summary.returnPercentage) > 0 && (
              <div 
                className="bg-[#5C574F] h-full transition-all duration-300" 
                style={{ width: `${Math.max(0, 100 - summary.salePercentage - summary.returnPercentage)}%` }} 
                title={`Reste non comptabilisé : ${(100 - summary.salePercentage - summary.returnPercentage).toFixed(1)}%`} 
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#A6A095] font-editorial">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3D9970]"></span>
              <span>Ventes : <strong>{summary.salePercentage}%</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
              <span>Retours : <strong>{summary.returnPercentage}%</strong></span>
            </span>
            {Math.max(0, 100 - summary.salePercentage - summary.returnPercentage) > 0.1 && (
              <span className="flex items-center gap-1 text-[#8C877E]">
                <span className="w-2 h-2 rounded-full bg-[#5C574F]"></span>
                <span>Reste : <strong>{(100 - summary.salePercentage - summary.returnPercentage).toFixed(1)}%</strong></span>
              </span>
            )}
          </div>
        </div>

        {/* Secondary rates table */}
        <div className="pt-2 border-t border-[#383530] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center justify-between bg-[#2D2A26] px-3 py-2 rounded-lg border border-[#3D3A34]">
            <span className="text-[#A6A095] font-medium">Taux de Vente :</span>
            <span className="font-bold text-[#A3D9BC] font-mono-num">{summary.salePercentage}%</span>
          </div>
          <div className="flex items-center justify-between bg-[#2D2A26] px-3 py-2 rounded-lg border border-[#3D3A34]">
            <span className="text-[#A6A095] font-medium">Taux de Retour :</span>
            <span className="font-bold text-[#F2D69B] font-mono-num">{summary.returnPercentage}%</span>
          </div>
          <div className="flex items-center justify-between bg-[#2D2A26] px-3 py-2 rounded-lg border border-[#3D3A34]">
            <span className="text-[#A6A095] font-medium">Perte Retours ({summary.lossPerReturnUnit} CFA/u) :</span>
            <span className="font-bold text-[#F8C4C4] font-mono-num">
              {formatCurrency(summary.returnLossAmount, settings.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-[#2D2A26] px-3 py-2 rounded-lg border border-[#3D3A34]">
            <span className="text-[#A6A095] font-medium">Gain Net :</span>
            <span className="font-bold text-[#A3D9BC] font-mono-num">
              {formatCurrency(summary.netGain, settings.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. EN-TÊTE DU JOURNAL DE CAISSE (ACTIONS, DATE & PRODUIT) */}
      <div className="bg-[#FAFAF7] rounded-2xl border border-[#DCD6CB] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EBE8E0]">
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#1A1A1A] text-[#F4F1EA] uppercase tracking-wider font-mono-num">
                Journal de Caisse
              </span>
              <span className="text-xs text-[#7A756D] font-medium font-editorial italic">
                Saisie & Calculs en temps réel
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#1A1A1A] tracking-tight">
              {formatDateFrench(date)}
            </h2>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-save-journal"
              onClick={handleSave}
              className="flex items-center space-x-2 bg-[#2D5A43] hover:bg-[#234735] active:bg-[#1B3628] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#A3D9BC]" />
                  <span>Enregistré & Ajouté à l'Historique !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Enregistrer et ajouter à l'Historique</span>
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-mono">⌘S</kbd>
                </>
              )}
            </button>

            <button
              id="btn-save-pc"
              type="button"
              onClick={handleManualSaveToPc}
              title="Générer et sauvegarder la fiche journal au format Word (.docx) sur votre ordinateur"
              className="flex items-center space-x-1.5 bg-[#EAEFF8] hover:bg-[#D7E3F4] text-[#1E3A8A] px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors border border-[#BFDBFE] cursor-pointer shadow-2xs"
            >
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <span>Word (.docx)</span>
            </button>

            <button
              id="btn-send-synthesis-actionbar"
              type="button"
              onClick={() => setShowSendModal(true)}
              title="Envoyer la synthèse journalière par Gmail ou Messages (SMS)"
              className="flex items-center space-x-1.5 bg-[#FDF2F2] hover:bg-[#FCE8E6] text-[#C5221F] px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors border border-[#F5C2C2] cursor-pointer shadow-2xs"
            >
              <Send className="w-4 h-4 text-[#EA4335]" />
              <span>Envoyer Synthèse</span>
            </button>

            <button
              id="btn-print-receipt"
              onClick={() => onPrintJournal({
                ...currentJournal,
                date,
                productName,
                unitSellingPrice,
                unitReturnPrice,
                unitCostPrice,
                sellers,
                expenses,
                summary,
                notes,
                updatedAt: new Date().toISOString(),
              })}
              className="flex items-center space-x-2 bg-[#EBE8E0] hover:bg-[#DCD6CB] text-[#1A1A1A] px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors border border-[#DCD6CB] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#5C574F]" />
              <span>Imprimer / Ticket</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-black/10 rounded font-mono">⌘P</kbd>
            </button>
          </div>
        </div>

        {/* Feedback message when saved to history */}
        {savedFeedback && (
          <div className="mt-3 p-3 bg-[#E7EFEA] border border-[#C3D9CD] rounded-xl text-xs font-semibold text-[#1B3628] flex items-center justify-between animate-fadeIn shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
              <span>Le journal du <strong>{formatDateFrench(date)}</strong> a été enregistré et ajouté avec succès à l'Historique des Journaux !</span>
            </div>
            <button onClick={() => setSavedFeedback(false)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">✕</button>
          </div>
        )}

        {/* Feedback message when saved to PC folder */}
        {pcSaveMsg && (
          <div className="mt-3 p-3 bg-[#E7EFEA] border border-[#C3D9CD] rounded-xl text-xs font-semibold text-[#1B3628] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
              <span>{pcSaveMsg}</span>
            </div>
            <button onClick={() => setPcSaveMsg(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Feedback message when auto-sent synthesis */}
        {autoSentNotice && (
          <div className="mt-3 p-3 bg-[#FDF2F2] border border-[#F5C2C2] rounded-xl text-xs font-semibold text-[#C5221F] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#EA4335]" />
              <span>{autoSentNotice}</span>
            </div>
            <button onClick={() => setAutoSentNotice(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Configurations rapides du jour (Date) */}
        <div className="pt-4 border-t border-[#EBE8E0]">
          {/* Colonne Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#4A463F] flex items-center gap-1.5 font-editorial">
                <Calendar className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>Date du journal</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="input-journal-date"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex-1 bg-[#F4F1EA] border border-[#DCD6CB] rounded-lg px-3 py-1.5 text-[#1A1A1A] font-semibold font-mono-num focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D5A43]"
              />

              {/* Quick shortcut to live today's date */}
              <button
                id="btn-set-today-date"
                type="button"
                onClick={() => handleDateChange(liveTodayStr)}
                title="Mettre à jour sur la date actuelle du jour"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                  date === liveTodayStr
                    ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs'
                    : 'bg-[#EBE8E0] text-[#3D3A34] hover:bg-[#DCD6CB] border-[#DCD6CB]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Aujourd'hui (Auto)</span>
              </button>
            </div>

            {/* Quick date chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] text-[#7A756D] font-editorial">Raccourcis :</span>
              <button
                type="button"
                id="btn-quick-yesterday"
                onClick={() => handleDateChange(getOffsetDateString(-1))}
                className="px-2 py-0.5 rounded-md bg-[#EBE8E0] hover:bg-[#DCD6CB] text-[#4A463F] text-[11px] font-medium border border-[#DCD6CB] transition-colors cursor-pointer"
              >
                Hier
              </button>
              <button
                type="button"
                id="btn-quick-today"
                onClick={() => handleDateChange(liveTodayStr)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                  date === liveTodayStr
                    ? 'bg-[#E7EFEA] text-[#2D5A43] border-[#C3D9CD]'
                    : 'bg-[#FAFAF7] hover:bg-[#EBE8E0] text-[#2D5A43] border-[#DCD6CB]'
                }`}
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                id="btn-quick-tomorrow"
                onClick={() => handleDateChange(getOffsetDateString(1))}
                className="px-2 py-0.5 rounded-md bg-[#EBE8E0] hover:bg-[#DCD6CB] text-[#4A463F] text-[11px] font-medium border border-[#DCD6CB] transition-colors cursor-pointer"
              >
                Demain
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SELLERS ACCOUNTING TABLE (TABLEAU COMPTABILITÉ DU CAHIER) */}
      <div className="bg-[#FAFAF7] rounded-2xl border border-[#DCD6CB] shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-[#DCD6CB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EBE8E0]/70">
          <div>
            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-[#2D5A43]" />
              <h3 className="font-bold text-[#1A1A1A] font-editorial text-lg">
                Comptabilité des Vendeurs / Livreurs
              </h3>
            </div>
            <p className="text-xs text-[#7A756D] font-editorial italic mt-0.5">
              Saisissez vos quantités : les calculs de caisse sont mis à jour en direct.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode de calcul selector */}
            <div className="flex items-center bg-[#FAFAF7] border border-[#DCD6CB] rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setSellerAutoCalcMode('return_from_sold')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  sellerAutoCalcMode === 'return_from_sold'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
                title="Confié - Vente = Retour automatique"
              >
                Retour Auto
              </button>
              <button
                type="button"
                onClick={() => setSellerAutoCalcMode('sold_from_return')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  sellerAutoCalcMode === 'sold_from_return'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
                title="Confié - Retour = Vente automatique"
              >
                Vente Auto
              </button>
              <button
                type="button"
                onClick={() => setSellerAutoCalcMode('manual')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  sellerAutoCalcMode === 'manual'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#5C574F] hover:text-[#1A1A1A]'
                }`}
                title="Saisie manuelle des deux valeurs"
              >
                Manuel
              </button>
            </div>

            {/* Quick batch fill button */}
            <button
              type="button"
              id="btn-mark-all-sold"
              onClick={handleMarkAllSold}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#E7EFEA] hover:bg-[#D4E8DC] text-[#2D5A43] border border-[#C3D9CD] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Remplir automatiquement Vente = Confié et Retours = 0 pour tous les vendeurs"
            >
              <Zap className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>Tout Vendu (100%)</span>
            </button>

            {/* Add seller button */}
            <button
              type="button"
              id="btn-add-seller-header"
              onClick={() => handleAddSeller()}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ajouter un vendeur</span>
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" id="table-sellers-accounting">
            <thead className="bg-[#EBE8E0] text-[#4A463F] font-bold text-xs uppercase tracking-wider border-b border-[#DCD6CB]">
              <tr>
                <th className="py-3 px-4 font-editorial">Nom du Vendeur</th>
                <th className="py-3 px-3 text-center font-editorial">Total Confié</th>
                <th className="py-3 px-3 text-center text-[#2D5A43] font-editorial">
                  Vente {sellerAutoCalcMode === 'sold_from_return' ? '(Auto)' : ''}
                </th>
                <th className="py-3 px-3 text-center text-[#9C6B28] font-editorial">
                  Retour {sellerAutoCalcMode === 'return_from_sold' ? '(Confié - Vente)' : ''}
                </th>
                <th className="py-3 px-4 text-right font-editorial">Prix Vente</th>
                <th className="py-3 px-2 text-center w-10"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EBE8E0]">
              {sellers.map((seller, index) => {
                const sold = Number(seller.soldCount) || 0;
                const returnCount = Number(seller.returnCount) || 0;
                const totalGiven = Number(seller.totalGiven) || 0;
                const accounted = sold + returnCount;
                const diff = accounted - totalGiven;
                const lineRevenue = sold * unitSellingPrice;

                return (
                  <tr 
                    key={seller.id} 
                    className="hover:bg-[#F4F1EA]/70 transition-colors"
                  >
                    {/* Nom du Vendeur (Fixe / Inmodifiable) */}
                    <td className="py-2.5 px-4 font-semibold text-[#1A1A1A]">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#EBE8E0] text-[#4A463F] text-xs flex items-center justify-center font-bold font-mono-num shrink-0 select-none">
                          {index + 1}
                        </span>
                        
                        <div className="flex flex-col min-w-0">
                          <span 
                            className="font-bold text-[#1A1A1A] text-sm py-0.5 select-none truncate block max-w-[200px]"
                            title={`Vendeur officiel : ${seller.name}`}
                          >
                            {seller.name}
                          </span>
                          {totalGiven > 0 && (
                            <div className="flex items-center gap-1">
                              {diff === 0 ? (
                                <span className="text-[10px] font-mono-num font-semibold text-[#2D5A43] flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 inline" /> Justifié ({accounted}/{totalGiven})
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-[10px] font-mono-num font-semibold text-[#8B3A3A] bg-[#FAF0F0] px-1.5 py-0.2 rounded border border-[#F5C2C2]">
                                  Surplus +{diff}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono-num font-medium text-[#9C6B28] bg-[#FAF3E8] px-1.5 py-0.2 rounded border border-[#E8D9C0]">
                                  Reste {Math.abs(diff)} non pointé
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Total confié */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={seller.totalGiven}
                        onChange={(e) => handleSellerChange(seller.id, 'totalGiven', Number(e.target.value) || 0)}
                        className="w-20 text-center font-bold text-[#2D2A26] bg-[#F4F1EA] border border-[#DCD6CB] rounded-lg py-1 px-1.5 focus:bg-white focus:ring-1 focus:ring-[#2D5A43] font-mono-num"
                      />
                    </td>

                    {/* Vente */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={seller.soldCount}
                        onChange={(e) => handleSellerChange(seller.id, 'soldCount', Number(e.target.value) || 0)}
                        className="w-20 text-center font-bold text-[#2D5A43] bg-[#E7EFEA] border border-[#C3D9CD] rounded-lg py-1 px-1.5 focus:bg-white focus:ring-1 focus:ring-[#2D5A43] font-mono-num"
                      />
                    </td>

                    {/* Retour */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={seller.returnCount}
                        onChange={(e) => handleSellerChange(seller.id, 'returnCount', Number(e.target.value) || 0)}
                        className="w-20 text-center font-bold text-[#9C6B28] bg-[#FAF3E8] border border-[#E8D9C0] rounded-lg py-1 px-1.5 focus:bg-white focus:ring-1 focus:ring-[#9C6B28] font-mono-num"
                      />
                    </td>

                    {/* Recette Encaissée */}
                    <td className="py-2.5 px-4 text-right font-bold text-[#1A1A1A] font-mono-num">
                      {formatCurrency(lineRevenue, settings.currency)}
                    </td>

                    {/* Delete row */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleRemoveSeller(seller.id)}
                        disabled={sellers.length <= 1}
                        title="Supprimer cette ligne"
                        className="text-[#8C877E] hover:text-[#8B3A3A] disabled:opacity-30 disabled:hover:text-[#8C877E] p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Totals Footer */}
            <tfoot className="bg-[#EBE8E0] font-bold border-t-2 border-[#DCD6CB] text-[#1A1A1A]">
              <tr>
                <td className="py-3 px-4 font-editorial text-base">TOTAL DU JOUR</td>
                <td className="py-3 px-3 text-center font-mono-num text-base">{formatNumber(summary.totalProducedOrGiven)}</td>
                <td className="py-3 px-3 text-center font-mono-num text-base text-[#2D5A43]">{formatNumber(summary.totalSold)}</td>
                <td className="py-3 px-3 text-center font-mono-num text-base text-[#9C6B28]">{formatNumber(summary.totalReturned)}</td>
                <td className="py-3 px-4 text-right font-mono-num text-base text-[#2D5A43]">
                  {formatCurrency(summary.grossRevenue, settings.currency)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Barre d'action sous le tableau */}
        <div className="p-3 bg-[#EBE8E0]/50 border-t border-[#DCD6CB] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            id="btn-add-seller-footer"
            onClick={() => handleAddSeller()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#F4F1EA] text-[#2D5A43] border border-[#DCD6CB] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajouter une ligne de vendeur</span>
          </button>

          <span className="text-xs text-[#7A756D] font-editorial italic">
            {sellers.length} vendeur(s) comptabilisé(s) dans le journal
          </span>
        </div>

      </div>

      {/* 4. DÉPENSES & CHARGES DU JOUR & NOTES / OBSERVATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Dépenses / Frais du jour */}
        <div className="bg-[#FAFAF7] rounded-2xl border border-[#DCD6CB] p-4 sm:p-5 shadow-xs space-y-3" id="section-daily-expenses">
          <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-[#8B3A3A]" />
              <h4 className="font-bold text-[#1A1A1A] font-editorial text-sm sm:text-base">
                Dépenses & Frais du Jour
              </h4>
            </div>

            <span className="text-xs font-bold font-mono-num px-2.5 py-0.5 rounded-full bg-[#FAF3E8] text-[#9C6B28] border border-[#E8D9C0]">
              Total : {formatCurrency(summary.totalExpenses, settings.currency)}
            </span>
          </div>

          <p className="text-xs text-[#7A756D] font-editorial italic">
            Transport, sacs, carburant ou petites réparations à déduire du bénéfice net.
          </p>

          {expenses.length === 0 ? (
            <div className="py-4 text-center bg-[#F4F1EA] rounded-xl border border-dashed border-[#DCD6CB]">
              <p className="text-xs text-[#7A756D]">Aucune dépense enregistrée pour cette journée.</p>
              <button
                type="button"
                onClick={handleAddExpense}
                className="mt-2 inline-flex items-center space-x-1 px-3 py-1 bg-white text-[#2D5A43] border border-[#DCD6CB] rounded-lg text-xs font-bold hover:bg-[#F4F1EA] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une dépense</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-2 bg-[#F4F1EA] p-2 rounded-xl border border-[#DCD6CB]">
                  <input
                    type="text"
                    value={expense.label}
                    onChange={(e) => handleExpenseChange(expense.id, 'label', e.target.value)}
                    placeholder="Libellé (ex: Carburant, Sacs...)"
                    className="flex-1 bg-white border border-[#DCD6CB] rounded-lg px-2.5 py-1 text-xs text-[#1A1A1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#2D5A43]"
                  />
                  <div className="flex items-center w-28 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={expense.amount}
                      onChange={(e) => handleExpenseChange(expense.id, 'amount', e.target.value)}
                      className="w-full bg-white border border-[#DCD6CB] rounded-lg px-2 py-1 text-xs font-bold font-mono-num text-right text-[#8B3A3A] focus:outline-none focus:ring-1 focus:ring-[#8B3A3A]"
                    />
                    <span className="text-[10px] font-semibold text-[#7A756D] ml-1 shrink-0">{settings.currency}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExpense(expense.id)}
                    title="Supprimer cette dépense"
                    className="p-1 text-[#8C877E] hover:text-[#8B3A3A] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="flex items-center space-x-1 px-3 py-1 bg-white text-[#2D5A43] border border-[#DCD6CB] rounded-lg text-xs font-bold hover:bg-[#F4F1EA] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ajouter une autre dépense</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes & Observations du jour */}
        <div className="bg-[#FAFAF7] rounded-2xl border border-[#DCD6CB] p-4 sm:p-5 shadow-xs space-y-3" id="section-daily-notes">
          <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#2D5A43]" />
              <h4 className="font-bold text-[#1A1A1A] font-editorial text-sm sm:text-base">
                Notes & Observations du Jour
              </h4>
            </div>
            <span className="text-[10px] text-[#7A756D] font-editorial italic">
              Sauvegardées avec le journal
            </span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Ex : Pluie le matin ayant ralenti les ventes, commande spéciale école livrée par Moussa, panne de four résolue à 10h..."
            className="w-full bg-[#F4F1EA] border border-[#DCD6CB] rounded-xl p-3 text-xs text-[#1A1A1A] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D5A43] resize-none"
          />

          <div className="flex items-center justify-between text-[11px] text-[#7A756D] font-editorial">
            <span>Ces remarques figureront dans l'historique et sur les impressions.</span>
          </div>
        </div>

      </div>

      {/* MODAL D'ENVOI DE LA SYNTHÈSE (GMAIL GOOGLE & MESSAGES SMS) */}
      <SendSynthesisModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        journal={currentJournalSnapshot}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

    </div>
  );
};

