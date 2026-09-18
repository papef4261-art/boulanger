import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserSubscription, PaymentTransaction, PaymentConfig, PhoneAccount } from '../types';
import { fetchPendingDeclarations, verifyDeclaration } from '../utils/subscriptionApi';
import { 
  Crown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Lock,
  Smartphone,
  Phone,
  CheckCheck,
  AlertCircle,
  Gift,
  KeyRound,
  Calendar,
  LogOut,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SubscriptionPageProps {
  user: User | null;
  subscription: UserSubscription | null;
  transactions: PaymentTransaction[];
  paymentConfig: PaymentConfig | null;
  onOpenSubscribeModal: () => void;
  onRefresh: () => void;
  onOpenAuthModal?: () => void;
  phoneAccount?: PhoneAccount | null;
  onOpenPhoneAuthModal?: (mode: 'register' | 'login') => void;
  onLogoutPhoneAccount?: () => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  user,
  subscription,
  transactions,
  paymentConfig,
  onOpenSubscribeModal,
  onRefresh,
  onOpenAuthModal,
  phoneAccount,
  onOpenPhoneAuthModal,
  onLogoutPhoneAccount
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'merchant_verification' | 'merchant_guide'>('status');

  const merchantPhone = paymentConfig?.merchantPhone || '78 968 16 83';
  const rawMerchantPhone = merchantPhone.replace(/\s+/g, '');

  // Merchant verification tab states
  const [pendingDeclarations, setPendingDeclarations] = useState<PaymentTransaction[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const currentStatus = subscription?.status || 'trial';
  const isTrial = currentStatus === 'trial';
  const isPremium = currentStatus === 'active';
  const isExpired = currentStatus === 'expired';
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 7;

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Days remaining calculation for active subscription
  const getActiveDaysRemaining = (endDateStr?: string | null) => {
    if (!endDateStr) return 0;
    const now = new Date();
    const end = new Date(endDateStr);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const activeDaysLeft = isPremium ? getActiveDaysRemaining(subscription?.endDate) : 0;

  // Load pending declarations for the merchant verification tab
  const loadPendingDeclarations = async () => {
    setLoadingPending(true);
    try {
      const data = await fetchPendingDeclarations();
      setPendingDeclarations(data.pending || []);
    } catch (err: any) {
      console.error('Error fetching pending declarations:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'merchant_verification') {
      loadPendingDeclarations();
    }
  }, [activeTab]);

  // Handle merchant validation or rejection
  const handleProcessDeclaration = async (transactionId: string, action: 'approve' | 'reject') => {
    setActionLoadingId(transactionId);
    setFeedbackMessage(null);
    try {
      const res = await verifyDeclaration({
        transactionId,
        action,
        adminPin: adminPin.trim() || '1683',
        note: action === 'approve' ? `Validé manuellement sur le ${merchantPhone}` : 'Rejeté : aucun virement reçu'
      });

      if (res.success) {
        if (action === 'approve') {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          setFeedbackMessage(`Succès : Le paiement a été validé et l'abonnement Premium activé pour 1 mois (30 jours) !`);
        } else {
          setFeedbackMessage(`La déclaration a été rejetée.`);
        }
        await loadPendingDeclarations();
        onRefresh();
      }
    } catch (err: any) {
      setFeedbackMessage(`Erreur : ${err.message || 'Action impossible'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6" id="page-subscription">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#DCD6CB]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#D4AF37]"></span>
            <h1 className="text-2xl font-bold font-editorial text-[#1A1A1A]">
              Mon Abonnement
            </h1>

            {/* Status Badge */}
            {isPremium ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7EFEA] text-[#2D5A43] border border-[#2D5A43]/30 flex items-center space-x-1">
                <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Premium Actif</span>
              </span>
            ) : isTrial ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF3E8] text-[#9C6B28] border border-[#E8D9C0] flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#9C6B28]" />
                <span>Essai gratuit ({trialDaysRemaining} j restant{trialDaysRemaining > 1 ? 's' : ''})</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF0F0] text-[#8B3A3A] border border-[#8B3A3A]/30 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#8B3A3A]" />
                <span>Abonnement Expiré</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#5C574F] mt-1 font-editorial">
            Tarif officiel : <strong>5 000 FCFA / mois</strong> • Numéro officiel : <strong>{merchantPhone}</strong> (Wave & Orange Money)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center space-x-1 px-3 py-2 bg-[#FAFAF7] hover:bg-[#EBE8E0] text-[#5C574F] border border-[#DCD6CB] rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Rafraîchir les informations de l'abonnement"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            id="btn-page-pass-to-premium"
            onClick={onOpenSubscribeModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span>{isPremium ? 'Prolonger mon abonnement' : 'Passer à Premium (5 000 FCFA)'}</span>
          </button>
        </div>
      </div>

      {/* Official Payment Display Banner (STRICTLY REQUIRED) */}
      <div className="bg-[#1B382B] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#DCD6CB] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-[#E8D9C0] flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-[#D4AF37]" />
            <span>Numéro de paiement officiel au Sénégal</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-wide text-white">
            Paiement Wave / Orange Money : 78 968 16 83
          </div>
          <p className="text-xs text-white/80">
            Montant : <strong>5 000 FCFA / mois</strong> • Transfert direct depuis Wave ou Orange Money (#144# ou App OM)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => copyToClipboard(rawMerchantPhone, 'merchant_phone_header')}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/20"
          >
            {copiedKey === 'merchant_phone_header' ? (
              <>
                <Check className="w-4 h-4 text-[#D4AF37]" />
                <span>Numéro copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier 78 968 16 83</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSubscribeModal}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c29e2f] text-[#1B382B] rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>J’ai effectué le paiement</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center space-x-2 border-b border-[#DCD6CB] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'status'
              ? 'bg-[#2D5A43] text-white shadow-xs'
              : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#EBE8E0]'
          }`}
        >
          Vue d'ensemble & Statut
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-[#2D5A43] text-white shadow-xs'
              : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#EBE8E0]'
          }`}
        >
          <span>Historique & Déclarations</span>
          {transactions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#FAFAF7] text-[#2D5A43] font-mono-num text-[10px] font-bold border border-[#DCD6CB]">
              {transactions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('merchant_verification')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'merchant_verification'
              ? 'bg-[#2D5A43] text-white shadow-xs'
              : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#EBE8E0]'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Vérification Marchand (78 968 16 83)</span>
          {pendingDeclarations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#D4AF37] text-[#1B382B] font-mono-num text-[10px] font-extrabold">
              {pendingDeclarations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('merchant_guide')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'merchant_guide'
              ? 'bg-[#2D5A43] text-white shadow-xs'
              : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#EBE8E0]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guide Technique & API</span>
        </button>
      </div>

      {/* TAB 1: STATUS & OVERVIEW */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          
          {/* Phone Account Status Card */}
          {phoneAccount ? (
            <div className="bg-white border-2 border-[#2D5A43]/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2D5A43] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#1A1A1A]">{phoneAccount.displayName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7EFEA] text-[#2D5A43] border border-[#C3D9CD]">
                      Compte Téléphone
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5C574F] mt-0.5">
                    <span className="font-mono font-bold text-[#1A1A1A]">{phoneAccount.displayPhone}</span>
                    <span>•</span>
                    <span>
                      Expiration : <strong className="text-[#1A1A1A]">{subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  id="btn-page-renew-phone-sub"
                  onClick={onOpenSubscribeModal}
                  className="px-4 py-2 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4 text-[#D4AF37]" />
                  <span>Payer par Wave / Orange Money</span>
                </button>
                {onLogoutPhoneAccount && (
                  <button
                    type="button"
                    onClick={onLogoutPhoneAccount}
                    className="p-2 text-[#7A756D] hover:text-[#8B3A3A] hover:bg-[#FAF0F0] rounded-xl transition-colors cursor-pointer"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#FAF3E8] to-[#F4F1EA] border border-[#E8D9C0] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#9C6B28] flex items-center justify-center shrink-0 mt-0.5">
                  <Gift className="w-5 h-5 text-[#9C6B28]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A]">
                      Création de compte avec numéro de téléphone
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D4AF37] text-[#1B382B]">
                      7 JOURS GRATUITS
                    </span>
                  </div>
                  <p className="text-xs text-[#5C574F] max-w-xl">
                    Inscrivez-vous simplement avec votre numéro (Wave ou Orange Money). Profitez de 7 jours offerts pour tester l’application, puis activez votre abonnement mensuel de 5 000 FCFA en un clic.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="btn-subpage-open-register"
                  onClick={() => onOpenPhoneAuthModal?.('register')}
                  className="px-4 py-2.5 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Gift className="w-4 h-4 text-[#D4AF37]" />
                  <span>Créer mon compte (7j gratuits)</span>
                </button>
                <button
                  type="button"
                  id="btn-subpage-open-login"
                  onClick={() => onOpenPhoneAuthModal?.('login')}
                  className="px-3.5 py-2.5 bg-white hover:bg-[#FAF9F5] text-[#1A1A1A] border border-[#DCD6CB] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4 text-[#2D5A43]" />
                  <span>Connexion</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Status Hero Card */}
          <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2D5A43]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9C6B28] font-editorial flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Statut de votre compte</span>
                  </span>
                </div>

                <h2 className="text-3xl font-extrabold text-[#1A1A1A] font-editorial flex items-center gap-3">
                  <span>
                    {isPremium ? 'Premium actif' : isTrial ? 'Essai gratuit' : 'Abonnement expiré'}
                  </span>
                  <span className="text-xs font-mono-num font-bold px-3 py-1 bg-[#2D5A43] text-white rounded-full">
                    5 000 FCFA / mois
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-[#5C574F] max-w-xl leading-relaxed">
                  {isPremium ? (
                    `Votre compte bénéficie de l'accès Premium complet pendant 1 mois. Il vous reste ${activeDaysLeft} jour(s) d'accès.`
                  ) : isTrial ? (
                    `Vous bénéficiez de l'essai gratuit de 7 jours (accordé une seule fois par utilisateur). Il vous reste ${trialDaysRemaining} jour(s) pour tester toutes les fonctionnalités sans restriction.`
                  ) : (
                    `Votre période d'essai ou votre abonnement précédent est expiré. Veuillez envoyer 5 000 FCFA au 78 968 16 83 pour réactiver l'accès pour 1 mois.`
                  )}
                </p>

                {/* Status metrics bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-[#F4F1EA] p-3 rounded-2xl border border-[#DCD6CB]">
                    <span className="text-[10px] text-[#7A756D] uppercase font-bold block">Statut du compte</span>
                    <span className={`text-sm font-bold flex items-center gap-1 mt-0.5 ${
                      isPremium ? 'text-[#2D5A43]' : isTrial ? 'text-[#9C6B28]' : 'text-[#8B3A3A]'
                    }`}>
                      {isPremium ? <CheckCircle2 className="w-3.5 h-3.5" /> : isTrial ? <Clock className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isPremium ? 'Premium actif' : isTrial ? 'Essai gratuit' : 'Abonnement expiré'}
                    </span>
                  </div>

                  <div className="bg-[#F4F1EA] p-3 rounded-2xl border border-[#DCD6CB]">
                    <span className="text-[10px] text-[#7A756D] uppercase font-bold block">Temps restant</span>
                    <span className="text-xs font-bold font-mono-num text-[#1A1A1A] block mt-0.5">
                      {isPremium ? `${activeDaysLeft} jour(s)` : isTrial ? `${trialDaysRemaining} jour(s) d'essai` : '0 jour (Expiré)'}
                    </span>
                  </div>

                  <div className="bg-[#F4F1EA] p-3 rounded-2xl border border-[#DCD6CB]">
                    <span className="text-[10px] text-[#7A756D] uppercase font-bold block">Échéance</span>
                    <span className="text-xs font-bold font-mono-num text-[#1A1A1A] block mt-0.5">
                      {isPremium && subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString('fr-FR') : isTrial && subscription?.trialEndDate ? new Date(subscription.trialEndDate).toLocaleDateString('fr-FR') : 'Expiré'}
                    </span>
                  </div>

                  <div className="bg-[#F4F1EA] p-3 rounded-2xl border border-[#DCD6CB]">
                    <span className="text-[10px] text-[#7A756D] uppercase font-bold block">Numéro Réception</span>
                    <span className="text-xs font-bold text-[#1A1A1A] block mt-0.5 font-mono">
                      {merchantPhone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Callout */}
              <div className="bg-white p-5 rounded-2xl border border-[#DCD6CB] shadow-xs shrink-0 flex flex-col justify-between space-y-4 max-w-xs w-full">
                <div>
                  <span className="text-[11px] text-[#7A756D] font-bold uppercase tracking-wider block font-editorial">
                    Abonnement Mensuel
                  </span>
                  <div className="text-2xl font-black font-mono-num text-[#1A1A1A] mt-1">
                    5 000 <span className="text-xs font-semibold text-[#5C574F]">FCFA / mois</span>
                  </div>
                  <p className="text-[11px] text-[#7A756D] mt-1">
                    Wave ou Orange Money au {merchantPhone}
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-page-cta"
                  onClick={onOpenSubscribeModal}
                  className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-[#D4AF37]" />
                  <span>J’ai effectué le paiement</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-step payment instructions card */}
          <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A] font-editorial flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#2D5A43]" />
              <span>Comment payer et activer votre abonnement en 3 étapes ?</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#DCD6CB] space-y-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2D5A43] text-white font-bold text-xs">
                  1
                </span>
                <h4 className="font-bold text-[#1A1A1A] text-sm">Transfert 5 000 FCFA</h4>
                <p className="text-[#5C574F]">
                  Ouvrez votre application Wave ou faites un transfert Orange Money vers le numéro :
                  <strong className="block font-mono text-[#1A1A1A] mt-1">{merchantPhone}</strong>
                </p>
              </div>

              <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#DCD6CB] space-y-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2D5A43] text-white font-bold text-xs">
                  2
                </span>
                <h4 className="font-bold text-[#1A1A1A] text-sm">Cliquez « J’ai effectué le paiement »</h4>
                <p className="text-[#5C574F]">
                  Renseignez votre numéro d'envoi et la référence SMS du transfert.
                  <em> (Le simple clic ne valide pas automatiquement sans contrôle réel).</em>
                </p>
              </div>

              <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#DCD6CB] space-y-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2D5A43] text-white font-bold text-xs">
                  3
                </span>
                <h4 className="font-bold text-[#1A1A1A] text-sm">Validation & Activation 1 mois</h4>
                <p className="text-[#5C574F]">
                  Dès confirmation de la réception des 5 000 FCFA sur le {merchantPhone}, votre compte passe automatiquement en <strong>Premium actif pour 1 mois (30 jours)</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Features Comparison */}
          <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A] font-editorial">
              Fonctionnalités incluses dans le Pack Premium
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#DCD6CB] space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center">
                  <Crown className="w-4 h-4 text-[#2D5A43]" />
                </div>
                <h4 className="font-bold text-[#1A1A1A] text-sm">Gestion Multi-Vendeurs Illimitée</h4>
                <p className="text-[#5C574F]">
                  Ajoutez autant de livreurs et vendeurs que nécessaire. Calculs instantanés des retours et manquants.
                </p>
              </div>

              <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#DCD6CB] space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
                </div>
                <h4 className="font-bold text-[#1A1A1A] text-sm">Sauvegarde Cloud Sécurisée</h4>
                <p className="text-[#5C574F]">
                  Vos journaux de caisse sont archivés de façon pérenne et restaurables sur n'importe quel appareil.
                </p>
              </div>

              <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#DCD6CB] space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-[#2D5A43]" />
                </div>
                <h4 className="font-bold text-[#1A1A1A] text-sm">Reçus & Exports Pro</h4>
                <p className="text-[#5C574F]">
                  Impressions thermiques pour vos équipes de vente, partages WhatsApp et exports Excel complets.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: TRANSACTION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD6CB]">
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-editorial">
                Historique des déclarations et paiements
              </h3>
              <p className="text-xs text-[#7A756D]">
                Traçabilité certifiée côté serveur avec protection anti-rejeu.
              </p>
            </div>
            <span className="text-xs font-mono-num font-bold text-[#5C574F]">
              {transactions.length} opération(s)
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-[#7A756D] space-y-3 bg-[#F4F1EA] rounded-2xl border border-dashed border-[#DCD6CB]">
              <Clock className="w-8 h-8 text-[#9C6B28] mx-auto opacity-60" />
              <p className="text-xs">Aucune déclaration ou transaction pour le moment.</p>
              <button
                type="button"
                onClick={onOpenSubscribeModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#2D5A43] text-white rounded-xl text-xs font-bold hover:bg-[#234735] cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Effectuer un paiement (5 000 FCFA)</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#DCD6CB] text-[#7A756D] font-editorial">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Réf.</th>
                    <th className="py-2.5 px-3">Opérateur</th>
                    <th className="py-2.5 px-3">N° Émetteur</th>
                    <th className="py-2.5 px-3">Montant</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE8E0]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#F4F1EA] transition-colors">
                      <td className="py-3 px-3 font-mono-num text-[#1A1A1A]">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#5C574F]">
                        {tx.paymentReference || tx.id}
                      </td>
                      <td className="py-3 px-3">
                        {tx.paymentMethod === 'wave' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#EBF7FD] text-[#009FE3] font-bold text-[10px] border border-[#009FE3]/20">
                            <span>Wave</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#FFF5EB] text-[#FF7900] font-bold text-[10px] border border-[#FF7900]/20">
                            <span>Orange Money</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#1A1A1A]">
                        {tx.senderPhone || '—'}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono-num text-[#1A1A1A]">
                        {tx.amount.toLocaleString()} {tx.currency || 'FCFA'}
                      </td>
                      <td className="py-3 px-3">
                        {tx.status === 'completed' ? (
                          <span className="inline-flex items-center space-x-1 text-[#2D5A43] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Validé (1 mois actif)</span>
                          </span>
                        ) : tx.status === 'pending_verification' ? (
                          <span className="inline-flex items-center space-x-1 text-[#9C6B28] font-bold">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>En cours de vérification</span>
                          </span>
                        ) : tx.status === 'rejected' ? (
                          <span className="inline-flex items-center space-x-1 text-[#8B3A3A] font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejeté</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[#7A756D]">
                            <span>{tx.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#5C574F]">
                        {tx.verificationNote || (tx.isCredited ? 'Crédité' : 'En attente')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MERCHANT VERIFICATION TAB (FOR 78 968 16 83) */}
      {activeTab === 'merchant_verification' && (
        <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DCD6CB]">
            <div>
              <div className="flex items-center space-x-2 text-[#2D5A43]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-base font-bold font-editorial text-[#1A1A1A]">
                  Espace Marchand : Contrôle et Validation des transferts (78 968 16 83)
                </h3>
              </div>
              <p className="text-xs text-[#5C574F] mt-0.5">
                Vérifiez que le SMS de transfert de 5 000 FCFA a bien été reçu sur le téléphone <strong>78 968 16 83</strong> avant de valider.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPendingDeclarations}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EBE8E0] text-[#1A1A1A] rounded-xl text-xs font-bold border border-[#DCD6CB] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser les déclarations</span>
            </button>
          </div>

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div className="p-3.5 bg-[#E7EFEA] border border-[#2D5A43] text-[#2D5A43] rounded-2xl text-xs flex items-center justify-between">
              <span>{feedbackMessage}</span>
              <button 
                type="button" 
                onClick={() => setFeedbackMessage(null)}
                className="text-xs font-bold underline cursor-pointer ml-2"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Security rule notice */}
          <div className="bg-[#FAF3E8] border border-[#E8D9C0] p-4 rounded-2xl text-xs text-[#9C6B28] space-y-1">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-[#9C6B28]" />
              <span>Règle de sécurité fondamentale :</span>
            </div>
            <p>
              Le simple fait qu’un utilisateur ait cliqué sur « J’ai effectué le paiement » ne lui accorde aucun droit immédiat.
              Chaque déclaration ci-dessous doit correspondre à une réception réelle de <strong>5 000 FCFA</strong> sur le <strong>78 968 16 83</strong>.
              Dès que vous cliquez sur « Valider et Activer », l'abonnement du client est immédiatement activé pour 1 mois (30 jours).
            </p>
          </div>

          {/* Optional PIN security */}
          <div className="flex items-center space-x-2 max-w-sm">
            <label className="text-xs font-bold text-[#4A463F] shrink-0">Code PIN Marchand :</label>
            <input
              type="password"
              placeholder="1683 (PIN par défaut)"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#DCD6CB] text-xs font-mono w-full bg-white"
            />
          </div>

          {/* Pending list */}
          {loadingPending ? (
            <div className="py-8 text-center text-xs text-[#7A756D]">
              Chargement des déclarations en attente...
            </div>
          ) : pendingDeclarations.length === 0 ? (
            <div className="py-10 text-center text-[#7A756D] space-y-2 bg-[#F4F1EA] rounded-2xl border border-dashed border-[#DCD6CB]">
              <CheckCircle2 className="w-8 h-8 text-[#2D5A43] mx-auto opacity-70" />
              <p className="text-xs font-bold text-[#1A1A1A]">Aucune déclaration en attente de vérification</p>
              <p className="text-[11px] text-[#7A756D]">Tous les paiements ont été traités.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeclarations.map((pending) => (
                <div 
                  key={pending.id} 
                  className="bg-white border border-[#DCD6CB] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        pending.paymentMethod === 'wave' 
                          ? 'bg-[#EBF7FD] text-[#009FE3] border border-[#009FE3]/20' 
                          : 'bg-[#FFF5EB] text-[#FF7900] border border-[#FF7900]/20'
                      }`}>
                        {pending.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
                      </span>
                      <strong className="text-sm text-[#1A1A1A] font-mono">{pending.senderPhone}</strong>
                      <span className="text-xs text-[#7A756D]">({formatDate(pending.createdAt)})</span>
                    </div>

                    <div className="text-xs text-[#5C574F] space-x-2">
                      <span>Montant : <strong className="font-mono text-[#1A1A1A]">5 000 FCFA</strong></span>
                      {pending.paymentReference && (
                        <span>• Réf. déclarée : <code className="font-mono bg-[#F4F1EA] px-1 rounded">{pending.paymentReference}</code></span>
                      )}
                      <span>• Utilisateur : <code className="text-[11px]">{pending.userEmail || pending.userId}</code></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionLoadingId === pending.id}
                      onClick={() => handleProcessDeclaration(pending.id, 'reject')}
                      className="px-3 py-2 bg-[#FAF0F0] hover:bg-[#8B3A3A] hover:text-white text-[#8B3A3A] rounded-xl text-xs font-bold border border-[#8B3A3A]/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Rejeter
                    </button>

                    <button
                      type="button"
                      disabled={actionLoadingId === pending.id}
                      onClick={() => handleProcessDeclaration(pending.id, 'approve')}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === pending.id ? 'Validation...' : 'Valider & Activer 1 mois'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MERCHANT GUIDE (WAVE & ORANGE MONEY SENEGAL) */}
      {activeTab === 'merchant_guide' && (
        <div className="space-y-6">
          
          <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-[#2D5A43]">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base font-bold font-editorial text-[#1A1A1A]">
                Guide Technique pour le Propriétaire du Site (Configuration Wave & OM Sénégal)
              </h3>
            </div>
            
            <p className="text-xs text-[#5C574F] leading-relaxed">
              Pour encaisser des paiements au Sénégal :<br />
              1. En mode standard manuel : Les clients envoient <strong>5 000 FCFA</strong> au numéro <strong>{merchantPhone}</strong> et déclarent leur numéro. Vous validez en 1 clic dans l'onglet <strong>Vérification Marchand</strong>.<br />
              2. En mode API automatique : Vous pouvez également renseigner vos clés marchandes officielles Wave et Sonatel Orange Money dans les variables d'environnement du serveur.
            </p>

            {/* Alert on current configuration status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              
              <div className={`p-4 rounded-2xl border ${
                paymentConfig?.isWaveConfigured 
                  ? 'bg-[#E7EFEA] border-[#2D5A43]/30 text-[#2D5A43]' 
                  : 'bg-[#FAF3E8] border-[#E8D9C0] text-[#9C6B28]'
              }`}>
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold uppercase font-editorial">API Wave Sénégal</strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white font-bold">
                    {paymentConfig?.isWaveConfigured ? 'Clé Détectée' : 'Mode Sandbox Actif'}
                  </span>
                </div>
                <p className="text-[11px] mt-1">
                  {paymentConfig?.isWaveConfigured 
                    ? 'WAVE_API_KEY est active côté serveur.' 
                    : 'Fonctionne avec le transfert direct au 78 968 16 83 et simulateur sandbox.'}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${
                paymentConfig?.isOrangeMoneyConfigured 
                  ? 'bg-[#E7EFEA] border-[#2D5A43]/30 text-[#2D5A43]' 
                  : 'bg-[#FAF3E8] border-[#E8D9C0] text-[#9C6B28]'
              }`}>
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold uppercase font-editorial">API Orange Money Sénégal</strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white font-bold">
                    {paymentConfig?.isOrangeMoneyConfigured ? 'Clés Détectées' : 'Mode Sandbox Actif'}
                  </span>
                </div>
                <p className="text-[11px] mt-1">
                  {paymentConfig?.isOrangeMoneyConfigured 
                    ? 'Identifiants Sonatel OM Webpay configurés côté serveur.' 
                    : 'Fonctionne avec le transfert direct au 78 968 16 83 et simulateur sandbox.'}
                </p>
              </div>

            </div>
          </div>

          {/* Section 1: Wave Senegal Setup */}
          <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-[#009FE3]">
              <span className="w-6 h-6 rounded-full bg-[#009FE3] text-white flex items-center justify-center font-bold text-xs">
                W
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A]">1. Procédure pour Wave Sénégal (Checkout API)</h4>
            </div>

            <ol className="list-decimal list-inside text-xs text-[#5C574F] space-y-2 leading-relaxed">
              <li>
                Rendez-vous sur le portail développeur officiel Wave :{' '}
                <a 
                  href="https://developer.wave.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#009FE3] font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  <span>developer.wave.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>Créez ou connectez votre compte marchand Wave Business (Sénégal).</li>
              <li>Dans la section <strong>API Keys</strong>, générez une clé secrète.</li>
              <li>
                URL de Webhook Wave :
                <div className="mt-1 flex items-center gap-2 bg-[#F4F1EA] p-2 rounded-xl border border-[#DCD6CB] font-mono text-[11px]">
                  <span className="flex-1 truncate">{paymentConfig?.webhooks.wave || '/api/subscription/webhook/wave'}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentConfig?.webhooks.wave || '', 'wave_webhook')}
                    className="p-1 text-[#5C574F] hover:text-[#1A1A1A] cursor-pointer shrink-0"
                    title="Copier l'URL du webhook"
                  >
                    {copiedKey === 'wave_webhook' ? <Check className="w-4 h-4 text-[#2D5A43]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </li>
            </ol>
          </div>

          {/* Section 2: Orange Money Senegal Setup */}
          <div className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-[#FF7900]">
              <span className="w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center font-bold text-xs">
                OM
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A]">2. Procédure pour Orange Money Sénégal (OM Web Payment)</h4>
            </div>

            <ol className="list-decimal list-inside text-xs text-[#5C574F] space-y-2 leading-relaxed">
              <li>
                Créez un compte développeur sur le portail Orange Africa :{' '}
                <a 
                  href="https://developer.orange.com/apis/om-webpay/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#FF7900] font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  <span>developer.orange.com/apis/om-webpay</span>
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>Souscrivez à l'API <strong>Orange Money Web Payment</strong> pour le pays <strong>Sénégal (SN)</strong>.</li>
              <li>
                URL de notification IPN Orange Money :
                <div className="mt-1 flex items-center gap-2 bg-[#F4F1EA] p-2 rounded-xl border border-[#DCD6CB] font-mono text-[11px]">
                  <span className="flex-1 truncate">{paymentConfig?.webhooks.orangeMoney || '/api/subscription/webhook/orange-money'}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentConfig?.webhooks.orangeMoney || '', 'om_webhook')}
                    className="p-1 text-[#5C574F] hover:text-[#1A1A1A] cursor-pointer shrink-0"
                    title="Copier l'URL du webhook OM"
                  >
                    {copiedKey === 'om_webhook' ? <Check className="w-4 h-4 text-[#2D5A43]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </li>
            </ol>
          </div>

          {/* Section 3: Where to put the keys */}
          <div className="bg-[#FAF3E8] rounded-3xl border border-[#E8D9C0] p-6 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-[#9C6B28]">
              <Lock className="w-5 h-5" />
              <h4 className="text-sm font-bold">3. Configuration des clés secrètes serveur</h4>
            </div>

            <pre className="bg-[#1A1A1A] text-[#E8D9C0] p-4 rounded-xl font-mono text-xs overflow-x-auto">
{`# Numéro officiel Wave / Orange Money
MERCHANT_PHONE=78 968 16 83

# Wave Sénégal API (optionnel si utilisation directe du numéro 78 968 16 83)
WAVE_API_KEY=wave_sn_test_votre_cle_ici
WAVE_WEBHOOK_SECRET=votre_secret_webhook_wave

# Orange Money Sénégal API (optionnel si utilisation directe du numéro 78 968 16 83)
ORANGE_MONEY_CLIENT_ID=votre_client_id_orange
ORANGE_MONEY_CLIENT_SECRET=votre_client_secret_orange
ORANGE_MONEY_MERCHANT_KEY=votre_merchant_key_sonatel`}
            </pre>
          </div>

        </div>
      )}

    </div>
  );
};
