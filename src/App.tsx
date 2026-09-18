import React, { useState, useEffect, useMemo } from 'react';
import { ActivePage, AppSettings, DailyJournal, TimePeriod, SellerEntry, BakeryBranch } from './types';
import { 
  loadJournals, 
  loadSettings, 
  saveJournals, 
  saveSettings, 
  DEFAULT_SETTINGS, 
  getInitialSellers,
  loadBakeries,
  saveBakeries,
  loadActiveBakeryId,
  saveActiveBakeryId
} from './utils/storage';
import { calculateJournalSummary } from './utils/calculations';
import { getLocalDateString, useLiveDateTime } from './utils/dateTime';
import { Header } from './components/Header';
import { ProfitMetricCards } from './components/ProfitMetricCards';
import { DailyJournalEditor } from './components/DailyJournalEditor';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { JournalHistoryList } from './components/JournalHistoryList';
import { GainsAndSummaryPage } from './components/GainsAndSummaryPage';
import { SettingsPage } from './components/SettingsPage';
import { ReceiptModal } from './components/ReceiptModal';
import { AddBakeryModal } from './components/AddBakeryModal';
import { autoSaveMonthlyProfitRecords } from './utils/monthlyRecords';
import { auth, saveJournalToCloud, saveSettingsToCloud, deleteJournalFromCloud, loadJournalsFromCloud } from './utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Calculator, 
  BarChart3, 
  History, 
  PlusCircle, 
  CalendarDays,
  Sparkles,
  TrendingUp,
  Calendar,
  Crown,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SubscriptionPage } from './components/SubscriptionPage';
import { PhoneAuthModal } from './components/PhoneAuthModal';
import { UserSubscription, PaymentTransaction, PaymentConfig, PhoneAccount } from './types';
import { fetchSubscriptionStatus, fetchPaymentConfig, verifyPayment, fetchPhoneAccount } from './utils/subscriptionApi';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'editor' | 'charts' | 'history'>('editor');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [journals, setJournals] = useState<DailyJournal[]>(loadJournals);
  const [bakeries, setBakeries] = useState<BakeryBranch[]>(loadBakeries);
  const [activeBakeryId, setActiveBakeryId] = useState<string>(loadActiveBakeryId);
  const [isAddBakeryModalOpen, setIsAddBakeryModalOpen] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7days');
  const [activePrintJournal, setActivePrintJournal] = useState<DailyJournal | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Phone Account & Subscription state
  const [phoneAccount, setPhoneAccount] = useState<PhoneAccount | null>(null);
  const [isPhoneAuthModalOpen, setIsPhoneAuthModalOpen] = useState<boolean>(false);
  const [phoneAuthInitialMode, setPhoneAuthInitialMode] = useState<'register' | 'login'>('register');

  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Restore phone account from storage on load
  useEffect(() => {
    const savedUserId = localStorage.getItem('phone_user_id');
    if (savedUserId) {
      fetchPhoneAccount(savedUserId)
        .then((acc) => {
          if (acc) setPhoneAccount(acc);
        })
        .catch(() => {
          // Quietly handle storage restore when backend reloads
        });
    }
  }, []);

  // Listen to Auth state (Microsoft / Cloud)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Automatically sync from cloud
        const cloudData = await loadJournalsFromCloud(user.uid);
        if (cloudData && cloudData.length > 0) {
          setJournals(cloudData);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Global Keyboard Shortcuts (Échap, Ctrl/Cmd+S, Ctrl/Cmd+P, Ctrl+1..4)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          const saveBtn = document.getElementById('btn-save-journal');
          if (saveBtn) {
            saveBtn.click();
          }
          return;
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          const printBtn = document.getElementById('btn-print-receipt');
          if (printBtn) {
            printBtn.click();
          }
          return;
        }

        if (!isInput) {
          if (e.key === '1') {
            e.preventDefault();
            setActivePage('journal');
            return;
          }
          if (e.key === '2') {
            e.preventDefault();
            setActivePage('history');
            return;
          }
          if (e.key === '3') {
            e.preventDefault();
            setActivePage('gains_summary');
            return;
          }
          if (e.key === '4') {
            e.preventDefault();
            setActivePage('settings');
            return;
          }
        }
      }

      if (e.key === 'Escape') {
        if (activePrintJournal) {
          setActivePrintJournal(null);
        } else if (isAddBakeryModalOpen) {
          setIsAddBakeryModalOpen(false);
        } else if (isSubscribeModalOpen) {
          setIsSubscribeModalOpen(false);
        } else if (isPhoneAuthModalOpen) {
          setIsPhoneAuthModalOpen(false);
        } else if (activePage !== 'journal' && activePage !== 'dashboard') {
          setActivePage('journal');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activePrintJournal, isAddBakeryModalOpen, isSubscribeModalOpen, isPhoneAuthModalOpen, activePage]);

  const getEffectiveUserId = (): string => {
    if (phoneAccount) return phoneAccount.userId;
    const savedPhoneUserId = localStorage.getItem('phone_user_id');
    if (savedPhoneUserId) return savedPhoneUserId;
    if (currentUser) return currentUser.uid;
    let localUid = localStorage.getItem('journal_local_uid');
    if (!localUid) {
      localUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('journal_local_uid', localUid);
    }
    return localUid;
  };

  const loadSubscriptionData = async () => {
    try {
      const uid = getEffectiveUserId();
      const data = await fetchSubscriptionStatus(uid);
      setSubscription(data.subscription);
      setTransactions(data.transactions);
    } catch {
      // Graceful fallback without console clutter
    }
  };

  const handleOpenPhoneAuthModal = (mode: 'register' | 'login' = 'register') => {
    setPhoneAuthInitialMode(mode);
    setIsPhoneAuthModalOpen(true);
  };

  const handlePhoneAuthSuccess = (account: PhoneAccount) => {
    setPhoneAccount(account);
    localStorage.setItem('phone_user_id', account.userId);
    localStorage.setItem('user_contact_phone', account.displayPhone);
    loadSubscriptionData();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setPaymentBanner({
      type: 'success',
      message: `Bienvenue ${account.displayName} ! Votre compte a été configuré avec vos 7 jours d'essai gratuit.`
    });
  };

  const handleLogoutPhoneAccount = () => {
    localStorage.removeItem('phone_user_id');
    setPhoneAccount(null);
    loadSubscriptionData();
  };

  // Load payment config and subscription data
  useEffect(() => {
    fetchPaymentConfig()
      .then(cfg => setPaymentConfig(cfg))
      .catch(() => {
        // Fallback silently if server is rebooting
      });
    loadSubscriptionData();
  }, [currentUser]);

  // Handle return URLs from Wave / Orange Money callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const txId = urlParams.get('tx_id') || urlParams.get('order_id');
    const sessionId = urlParams.get('session_id');
    const provider = urlParams.get('provider');
    const sandboxPrompt = urlParams.get('sandbox_prompt');

    if (sandboxPrompt) {
      setIsSubscribeModalOpen(true);
    }

    if (paymentStatus && txId) {
      if (paymentStatus === 'success' || paymentStatus === 'return') {
        verifyPayment(txId, sessionId || undefined, undefined, provider || undefined)
          .then((res) => {
            if (res.success) {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              setPaymentBanner({
                type: 'success',
                message: "Paiement validé avec succès ! Votre abonnement Premium de 5 000 FCFA a été activé pour 1 mois."
              });
              loadSubscriptionData();
            }
          })
          .catch((err) => {
            setPaymentBanner({
              type: 'error',
              message: err.message || "Impossible de confirmer le paiement. Vérifiez votre solde ou contactez le support."
            });
          })
          .finally(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      } else if (paymentStatus === 'cancelled') {
        setPaymentBanner({
          type: 'error',
          message: "Le paiement a été annulé par l'utilisateur."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [currentUser]);

  const { todayStr: liveTodayStr } = useLiveDateTime();

  // Helper to create a new daily journal for any given date and bakery
  const createNewJournalForDate = (
    dateStr: string,
    existingJournals: DailyJournal[],
    targetBakery?: BakeryBranch
  ): DailyJournal => {
    const activeTarget = targetBakery || bakeries.find((b) => b.id === activeBakeryId) || bakeries[0];
    const targetBakeryId = activeTarget?.id || 'boulangerie-principale';
    const targetBakeryName = activeTarget?.name || 'Boulangerie Principale';
    const sellingPrice = activeTarget?.defaultSellingPrice || settings.defaultSellingPrice;
    const returnPrice = activeTarget?.defaultReturnPrice || settings.defaultReturnPrice;
    const costPrice = activeTarget?.defaultCostPrice || settings.defaultCostPrice;
    const prodName = activeTarget?.defaultProductName || settings.defaultProductName;

    // Inherit sellers and contact numbers from the most recent journal of THIS bakery if exists
    const previousBakeryJournals = existingJournals.filter((j) => (j.bakeryId || 'boulangerie-principale') === targetBakeryId);
    const latestWithSellers = previousBakeryJournals.find((j) => j.sellers && j.sellers.length > 0) || existingJournals.find((j) => j.sellers && j.sellers.length > 0);
    let sellersToUse: SellerEntry[] = [];

    if (latestWithSellers && latestWithSellers.sellers && latestWithSellers.sellers.length > 0) {
      sellersToUse = latestWithSellers.sellers.map((s, idx) => ({
        id: `sel-${targetBakeryId}-${dateStr}-${idx}-${Date.now()}`,
        name: s.name,
        phone: s.phone,
        age: s.age,
        nationalId: s.nationalId,
        role: s.role,
        totalGiven: s.totalGiven || 100,
        soldCount: s.soldCount || s.totalGiven || 95,
        returnCount: s.returnCount || 0,
        lostCount: 0,
        cashCollected: (s.soldCount || s.totalGiven || 95) * sellingPrice,
        notes: '',
      }));
    } else {
      sellersToUse = getInitialSellers();
    }

    // Also ensure all sellers currently registered in settings.defaultSellers are included
    const existingSellerNames = new Set(sellersToUse.map((s) => s.name.trim().toLowerCase()));
    settings.defaultSellers.forEach((item, idx) => {
      const sName = typeof item === 'string' ? item.trim() : item.name.trim();
      if (sName && !existingSellerNames.has(sName.toLowerCase())) {
        existingSellerNames.add(sName.toLowerCase());
        const phone = typeof item === 'object' && item.phone ? item.phone : '+221 77 000 00 00';
        const age = typeof item === 'object' && item.age ? item.age : 25;
        const role = typeof item === 'object' && item.role ? item.role : 'Vendeur';
        sellersToUse.push({
          id: `sel-${targetBakeryId}-${dateStr}-def-${idx}-${Date.now()}`,
          name: sName,
          phone,
          age,
          role,
          totalGiven: 0,
          soldCount: 0,
          returnCount: 0,
          lostCount: 0,
          cashCollected: 0,
          notes: '',
        });
      }
    });

    const summary = calculateJournalSummary(
      sellersToUse,
      sellingPrice,
      returnPrice,
      costPrice,
      [],
      settings.calculationFormula
    );

    return {
      id: `journal-${targetBakeryId}-${dateStr}`,
      date: dateStr,
      title: `Journal de caisse - ${targetBakeryName}`,
      bakeryId: targetBakeryId,
      bakeryName: targetBakeryName,
      productName: prodName,
      unitSellingPrice: sellingPrice,
      unitReturnPrice: returnPrice,
      unitCostPrice: costPrice,
      sellers: sellersToUse,
      expenses: [],
      summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Active Bakery Perimeter and its filtered journals
  const activeBakery = useMemo(() => {
    return bakeries.find((b) => b.id === activeBakeryId) || bakeries[0];
  }, [bakeries, activeBakeryId]);

  const isAllBakeries = activeBakeryId === 'all';

  const activeBakeryJournals = useMemo(() => {
    if (isAllBakeries) return journals;
    return journals.filter((j) => (j.bakeryId || 'boulangerie-principale') === activeBakeryId);
  }, [journals, activeBakeryId, isAllBakeries]);

  // Initialize or pick the current journal
  const [currentJournal, setCurrentJournal] = useState<DailyJournal>(() => {
    const todayStr = getLocalDateString();
    const existingToday = journals.find((j) => j.date === todayStr && (j.bakeryId || 'boulangerie-principale') === activeBakeryId);
    if (existingToday) return existingToday;

    const anyToday = journals.find((j) => j.date === todayStr);
    if (anyToday) return anyToday;

    // Create a new daily journal for today so it appears automatically
    const newToday = createNewJournalForDate(todayStr, journals);
    return newToday;
  });

  // Automatically ensure that each day, a new journal appears in Historique des Journaux for active bakery
  useEffect(() => {
    if (!liveTodayStr) return;
    const targetBakery = bakeries.find((b) => b.id === activeBakeryId) || bakeries[0];
    const targetBakeryId = targetBakery?.id || 'boulangerie-principale';

    const hasToday = journals.some((j) => j.date === liveTodayStr && (j.bakeryId || 'boulangerie-principale') === targetBakeryId);
    if (!hasToday) {
      const newToday = createNewJournalForDate(liveTodayStr, journals, targetBakery);
      setJournals((prev) => {
        if (prev.some((j) => j.date === liveTodayStr && (j.bakeryId || 'boulangerie-principale') === targetBakeryId)) return prev;
        return [newToday, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      });
      setCurrentJournal(newToday);
    }
  }, [liveTodayStr, journals.length, activeBakeryId]);

  // Keep localStorage in sync and auto-save monthly profit records every 1 month
  useEffect(() => {
    saveJournals(journals);
    if (journals.length > 0) {
      autoSaveMonthlyProfitRecords(journals, currentUser?.uid).catch(() => {});
    }
  }, [journals, currentUser?.uid]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Bakery management handlers
  const handleSelectBakery = (bakeryId: string) => {
    setActiveBakeryId(bakeryId);
    saveActiveBakeryId(bakeryId);

    if (bakeryId !== 'all') {
      const bJournals = journals.filter((j) => (j.bakeryId || 'boulangerie-principale') === bakeryId);
      const todayJ = bJournals.find((j) => j.date === liveTodayStr);
      if (todayJ) {
        setCurrentJournal(todayJ);
      } else if (bJournals.length > 0) {
        setCurrentJournal(bJournals[0]);
      } else {
        const targetB = bakeries.find((b) => b.id === bakeryId);
        const newJ = createNewJournalForDate(liveTodayStr, journals, targetB);
        setJournals((prev) => [newJ, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
        setCurrentJournal(newJ);
      }
    }
  };

  const handleAddBakery = (newBakery: BakeryBranch) => {
    const updatedBakeries = [...bakeries, newBakery];
    setBakeries(updatedBakeries);
    saveBakeries(updatedBakeries);

    setActiveBakeryId(newBakery.id);
    saveActiveBakeryId(newBakery.id);

    // Create a fresh journal for today for this new bakery
    const todayStr = getLocalDateString();
    const newJ = createNewJournalForDate(todayStr, journals, newBakery);
    const updatedJournals = [newJ, ...journals].sort((a, b) => b.date.localeCompare(a.date));
    setJournals(updatedJournals);
    saveJournals(updatedJournals);
    setCurrentJournal(newJ);

    setActivePage('journal');
    setDashboardTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBakery = (bakeryId: string) => {
    if (bakeryId === 'boulangerie-principale') return;
    const updated = bakeries.filter((b) => b.id !== bakeryId);
    setBakeries(updated);
    saveBakeries(updated);

    setActiveBakeryId('boulangerie-principale');
    saveActiveBakeryId('boulangerie-principale');

    const primaryJournals = journals.filter((j) => (j.bakeryId || 'boulangerie-principale') === 'boulangerie-principale');
    if (primaryJournals.length > 0) {
      setCurrentJournal(primaryJournals[0]);
    }
  };

  // Handle saving a journal: saves and updates Historique des Journaux
  const handleSaveJournal = async (updatedJournal: DailyJournal) => {
    const journalId = updatedJournal.id && updatedJournal.id.includes(updatedJournal.date)
      ? updatedJournal.id
      : `journal-${updatedJournal.bakeryId || 'boulangerie-principale'}-${updatedJournal.date}`;

    const finalJournal: DailyJournal = {
      ...updatedJournal,
      id: journalId,
      updatedAt: new Date().toISOString(),
    };

    setJournals((prev) => {
      const existsIndex = prev.findIndex((j) => (j.id === finalJournal.id) || (j.date === finalJournal.date && (j.bakeryId || 'boulangerie-principale') === (finalJournal.bakeryId || 'boulangerie-principale')));
      let next: DailyJournal[];
      if (existsIndex >= 0) {
        next = [...prev];
        next[existsIndex] = finalJournal;
      } else {
        next = [finalJournal, ...prev];
      }
      return next.sort((a, b) => b.date.localeCompare(a.date));
    });
    setCurrentJournal(finalJournal);

    // If logged in, also sync to Cloud (Firestore)
    if (currentUser) {
      try {
        await saveJournalToCloud(currentUser.uid, finalJournal);
      } catch (err) {
        console.error('Failed to sync saved journal to cloud', err);
      }
    }
  };

  // Handle creating a blank/new journal for today or specific date
  const handleNewJournal = () => {
    const todayStr = getLocalDateString();
    const targetBakery = bakeries.find((b) => b.id === activeBakeryId) || bakeries[0];
    const targetBakeryId = targetBakery?.id || 'boulangerie-principale';
    const newJ = createNewJournalForDate(todayStr, journals, targetBakery);

    setJournals((prev) => {
      const exists = prev.find((j) => j.date === todayStr && (j.bakeryId || 'boulangerie-principale') === targetBakeryId);
      if (exists) return prev;
      return [newJ, ...prev].sort((a, b) => b.date.localeCompare(a.date));
    });

    setCurrentJournal(newJ);
    setActivePage('journal');
    setDashboardTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJournal = async (id: string) => {
    setJournals((prev) => prev.filter((j) => j.id !== id));
    if (currentJournal.id === id && journals.length > 1) {
      setCurrentJournal(journals.filter((j) => j.id !== id)[0]);
    }

    if (currentUser) {
      try {
        await deleteJournalFromCloud(currentUser.uid, id);
      } catch (err) {
        console.error('Failed to delete journal from cloud', err);
      }
    }
  };

  const handleDeleteMultipleJournals = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setJournals((prev) => prev.filter((j) => !idSet.has(j.id)));
    if (idSet.has(currentJournal.id)) {
      const remaining = journals.filter((j) => !idSet.has(j.id));
      if (remaining.length > 0) {
        setCurrentJournal(remaining[0]);
      }
    }

    if (currentUser) {
      for (const id of ids) {
        try {
          await deleteJournalFromCloud(currentUser.uid, id);
        } catch (err) {
          console.error(`Failed to delete journal ${id} from cloud`, err);
        }
      }
    }
  };

  const handleSelectJournalFromHistory = (journal: DailyJournal) => {
    setCurrentJournal(journal);
    setActivePage('journal');
    setDashboardTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSellerInfo = (
    sellerName: string,
    updatedInfo: { phone?: string; age?: number | string; role?: string }
  ) => {
    // 1. Update matching seller info across all journals
    setJournals((prevJournals) =>
      prevJournals.map((j) => ({
        ...j,
        sellers: j.sellers.map((s) => {
          if (s.name.trim().toLowerCase() === sellerName.trim().toLowerCase()) {
            return {
              ...s,
              phone: updatedInfo.phone !== undefined ? updatedInfo.phone : s.phone,
              age: updatedInfo.age !== undefined ? updatedInfo.age : s.age,
              role: updatedInfo.role !== undefined ? updatedInfo.role : s.role,
            };
          }
          return s;
        }),
      }))
    );

    // 2. Update current active journal
    setCurrentJournal((prev) => ({
      ...prev,
      sellers: prev.sellers.map((s) => {
        if (s.name.trim().toLowerCase() === sellerName.trim().toLowerCase()) {
          return {
            ...s,
            phone: updatedInfo.phone !== undefined ? updatedInfo.phone : s.phone,
            age: updatedInfo.age !== undefined ? updatedInfo.age : s.age,
            role: updatedInfo.role !== undefined ? updatedInfo.role : s.role,
          };
        }
        return s;
      }),
    }));

    // 3. Update settings defaultSellers list
    setSettings((prevSettings) => {
      const updatedDefaults = prevSettings.defaultSellers.map((item) => {
        const name = typeof item === 'string' ? item : item.name;
        if (name.trim().toLowerCase() === sellerName.trim().toLowerCase()) {
          if (typeof item === 'string') {
            return {
              name,
              phone: updatedInfo.phone || '+221 77 000 00 00',
              age: updatedInfo.age || 25,
              role: updatedInfo.role || 'Vendeur',
            };
          }
          return {
            ...item,
            phone: updatedInfo.phone !== undefined ? updatedInfo.phone : item.phone,
            age: updatedInfo.age !== undefined ? updatedInfo.age : item.age,
            role: updatedInfo.role !== undefined ? updatedInfo.role : item.role,
          };
        }
        return item;
      });

      return {
        ...prevSettings,
        defaultSellers: updatedDefaults,
      };
    });
  };

  // Handle saving settings and automatically propagate new sellers to current journal and seller accounting
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);

    // Automatically synchronize new sellers from Identification de l'Équipe into currentJournal
    setCurrentJournal((prevJournal) => {
      const existingNames = new Set(prevJournal.sellers.map((s) => s.name.trim().toLowerCase()));
      const newEntries: SellerEntry[] = [];

      newSettings.defaultSellers.forEach((item, idx) => {
        const sName = typeof item === 'string' ? item.trim() : item.name.trim();
        if (sName && !existingNames.has(sName.toLowerCase())) {
          existingNames.add(sName.toLowerCase());
          const phone = typeof item === 'object' && item.phone ? item.phone : '+221 77 000 00 00';
          const age = typeof item === 'object' && item.age ? item.age : 25;
          const role = typeof item === 'object' && item.role ? item.role : 'Vendeur';

          newEntries.push({
            id: `sel-auto-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: sName,
            phone,
            age,
            role,
            totalGiven: 0,
            soldCount: 0,
            returnCount: 0,
            lostCount: 0,
            cashCollected: 0,
            notes: '',
          });
        }
      });

      if (newEntries.length === 0) return prevJournal;

      const updatedSellers = [...prevJournal.sellers, ...newEntries];
      const updatedSummary = calculateJournalSummary(
        updatedSellers,
        prevJournal.unitSellingPrice,
        prevJournal.unitReturnPrice,
        prevJournal.unitCostPrice,
        prevJournal.expenses,
        newSettings.calculationFormula
      );

      const updatedJournal: DailyJournal = {
        ...prevJournal,
        sellers: updatedSellers,
        summary: updatedSummary,
        updatedAt: new Date().toISOString(),
      };

      // Also update in journals list
      setJournals((prev) => {
        return prev.map((j) => {
          if (j.id === updatedJournal.id || j.date === updatedJournal.date) {
            return updatedJournal;
          }
          return j;
        });
      });

      if (currentUser) {
        saveJournalToCloud(currentUser.uid, updatedJournal).catch(() => {});
      }

      return updatedJournal;
    });
  };

  const handleResetAllData = () => {
    localStorage.clear();
    const loadedS = DEFAULT_SETTINGS;
    setSettings(loadedS);
    const initialJ = loadJournals();
    setJournals(initialJ);
    setCurrentJournal(initialJ[0]);
    setActivePage('dashboard');
    setDashboardTab('editor');
  };

  const todayGain = currentJournal?.summary?.netGain || 0;

  const isAccessAllowed = subscription?.status === 'active' || (subscription?.status === 'trial' && (subscription?.trialDaysRemaining ?? 0) > 0);
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 7;

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1A1A1A] flex flex-col selection:bg-[#2D5A43] selection:text-white">
      
      {/* Top Main Navigation Header */}
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        settings={settings}
        onNewJournal={handleNewJournal}
        todayGain={todayGain}
        user={currentUser}
        journals={journals}
        onJournalsLoadedFromCloud={(cloudJournals) => {
          setJournals(cloudJournals);
          if (cloudJournals.length > 0) {
            setCurrentJournal(cloudJournals[0]);
          }
        }}
        isPremium={isAccessAllowed}
        onOpenSubscribeModal={() => setIsSubscribeModalOpen(true)}
        phoneAccount={phoneAccount}
        subscription={subscription}
        onOpenPhoneAuthModal={handleOpenPhoneAuthModal}
        onLogoutPhoneAccount={handleLogoutPhoneAccount}
        bakeries={bakeries}
        activeBakeryId={activeBakeryId}
        onSelectBakery={handleSelectBakery}
        onOpenAddBakeryModal={() => setIsAddBakeryModalOpen(true)}
        onSelectJournal={handleSelectJournalFromHistory}
        onDeleteBakery={handleDeleteBakery}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Payment notification banner */}
        {paymentBanner && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
            paymentBanner.type === 'success'
              ? 'bg-[#E7EFEA] border-[#2D5A43] text-[#2D5A43]'
              : 'bg-[#FAF0F0] border-[#8B3A3A] text-[#8B3A3A]'
          }`}>
            <div className="flex items-center space-x-3 text-xs sm:text-sm font-semibold">
              {paymentBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#2D5A43]" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-[#8B3A3A]" />
              )}
              <span>{paymentBanner.message}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActivePage('subscription');
                  setPaymentBanner(null);
                }}
                className="px-3 py-1 bg-white rounded-lg text-xs font-bold border border-current shadow-xs cursor-pointer hover:opacity-80"
              >
                Voir mon abonnement
              </button>
              <button
                type="button"
                onClick={() => setPaymentBanner(null)}
                className="p-1 rounded-lg hover:bg-black/10 text-current cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* PAGE 1: JOURNAL DE CAISSE (SAISIE QUOTIDIENNE & HISTORIQUE) */}
        {(activePage === 'journal' || activePage === 'dashboard') && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick Banner Linking to Gains & Synthèse de Caisse Page */}
            <div className="bg-[#2D5A43] text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/15 text-[#D8EADB]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base font-editorial">
                    Calcul des Gains & Synthèse Journalière de Caisse
                  </h3>
                  <p className="text-xs text-[#D8EADB]/90 font-editorial">
                    Bénéfices calculés sur Aujourd'hui, Tous les Jours, 1 Mois, 1 An avec analyse complète des retours.
                  </p>
                </div>
              </div>

              <button
                id="btn-goto-gains-summary"
                onClick={() => setActivePage('gains_summary')}
                className="bg-white text-[#2D5A43] hover:bg-[#F4F1EA] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Voir Gains & Synthèse Caisse →
              </button>
            </div>

            {/* SAISIE DU JOURNAL DE CAISSE DU JOUR */}
            <section id="section-saisie-journal" className="space-y-4">
              <DailyJournalEditor
                currentJournal={currentJournal}
                settings={settings}
                journals={activeBakeryJournals}
                onSelectJournal={handleSelectJournalFromHistory}
                onSaveJournal={handleSaveJournal}
                onPrintJournal={(j) => setActivePrintJournal(j)}
                onNewJournal={handleNewJournal}
                onUpdateSettings={handleSaveSettings}
              />
            </section>
          </div>
        )}

        {/* PAGE HISTORIQUE DÉDIÉE */}
        {activePage === 'history' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Full Journal History List with Multi-Select & Search */}
            <JournalHistoryList
              journals={activeBakeryJournals}
              currency={settings.currency}
              activeJournalId={currentJournal.id}
              onSelectJournal={handleSelectJournalFromHistory}
              onDeleteJournal={handleDeleteJournal}
              onDeleteMultipleJournals={handleDeleteMultipleJournals}
              onPrintJournal={(j) => setActivePrintJournal(j)}
              onSaveJournal={handleSaveJournal}
              onBackToEditor={() => {
                setActivePage('journal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* PAGE 2: NOUVELLE PAGE DÉDIÉE - CALCUL DES GAINS & BÉNÉFICES & SYNTHÈSE DE CAISSE */}
        {activePage === 'gains_summary' && (
          <GainsAndSummaryPage
            journals={journals}
            currentJournal={currentJournal}
            settings={settings}
            selectedPeriod={selectedPeriod}
            currentUserId={currentUser?.uid}
            onSelectPeriod={setSelectedPeriod}
            onUpdateSellerInfo={handleUpdateSellerInfo}
            bakeries={bakeries}
            activeBakeryId={activeBakeryId}
            onSelectBakery={handleSelectBakery}
            onSelectJournal={(j) => {
              setCurrentJournal(j);
              setActivePage('journal');
            }}
          />
        )}

        {/* PAGE 3: PARAMÈTRES DE LA BOULANGERIE */}
        {activePage === 'settings' && (
          <div className="animate-fadeIn">
            <SettingsPage
              settings={settings}
              onSaveSettings={handleSaveSettings}
              journals={journals}
              onImportJournals={(imported) => {
                setJournals(imported);
                if (imported.length > 0) setCurrentJournal(imported[0]);
              }}
              onResetAllData={handleResetAllData}
            />
          </div>
        )}

        {/* PAGE 4: MON ABONNEMENT (OFFRE PREMIUM 5 000 FCFA - WAVE & ORANGE MONEY) */}
        {activePage === 'subscription' && (
          <div className="animate-fadeIn">
            <SubscriptionPage
              user={currentUser}
              subscription={subscription}
              transactions={transactions}
              paymentConfig={paymentConfig}
              onOpenSubscribeModal={() => setIsSubscribeModalOpen(true)}
              onRefresh={loadSubscriptionData}
              phoneAccount={phoneAccount}
              onOpenPhoneAuthModal={handleOpenPhoneAuthModal}
              onLogoutPhoneAccount={handleLogoutPhoneAccount}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#DCD6CB] bg-[#FAFAF7] py-6 text-center text-xs text-[#7A756D] print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-[#4A463F] font-editorial text-sm">
            {settings.businessName} — Gestion commerciale, Journal de caisse & Calcul des bénéfices
          </p>
          <p className="text-[#8C877E]">
            Calculs automatiques Aujourd'hui, Tous les Jours, 1 Mois et 1 An • Paiements Wave & Orange Money certifiés
          </p>
        </div>
      </footer>

      {/* Printable Receipt Modal */}
      {activePrintJournal && (
        <ReceiptModal
          journal={activePrintJournal}
          settings={settings}
          onClose={() => setActivePrintJournal(null)}
        />
      )}

      {/* Subscription Modal for Wave & Orange Money */}
      <SubscriptionModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        user={currentUser}
        subscription={subscription}
        paymentConfig={paymentConfig}
        onSubscriptionUpdated={() => {
          loadSubscriptionData();
        }}
      />

      {/* Phone Account Authentication Modal (7-day free trial on registration) */}
      <PhoneAuthModal
        isOpen={isPhoneAuthModalOpen}
        onClose={() => setIsPhoneAuthModalOpen(false)}
        initialMode={phoneAuthInitialMode}
        onSuccess={handlePhoneAuthSuccess}
      />

      {/* Modal: Ajouter une nouvelle boulangerie & Périmètre */}
      <AddBakeryModal
        isOpen={isAddBakeryModalOpen}
        onClose={() => setIsAddBakeryModalOpen(false)}
        onAddBakery={handleAddBakery}
        currency={settings.currency}
        defaultSellingPrice={settings.defaultSellingPrice}
        defaultReturnPrice={settings.defaultReturnPrice}
        defaultCostPrice={settings.defaultCostPrice}
      />

    </div>
  );
}
