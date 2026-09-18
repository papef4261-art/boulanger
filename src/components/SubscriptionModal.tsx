import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserSubscription, PaymentConfig, PaymentTransaction } from '../types';
import { declarePayment, verifyDeclaration, payWithPhone } from '../utils/subscriptionApi';
import { 
  Crown, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  ArrowRight,
  Phone,
  Send,
  AlertTriangle,
  Lock,
  RotateCcw,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  subscription: UserSubscription | null;
  paymentConfig: PaymentConfig | null;
  onSubscriptionUpdated: () => void;
  onOpenAuthModal?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  subscription,
  paymentConfig,
  onSubscriptionUpdated,
  onOpenAuthModal
}) => {
  const merchantPhone = paymentConfig?.merchantPhone || '78 968 16 83';
  const rawMerchantPhone = merchantPhone.replace(/\s+/g, '');

  const [paymentMode, setPaymentMode] = useState<'auto_phone' | 'manual_transfer'>('auto_phone');
  const [selectedProvider, setSelectedProvider] = useState<'wave' | 'orange_money'>('wave');
  const [showDeclarationForm, setShowDeclarationForm] = useState(false);
  const [senderPhone, setSenderPhone] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Pending declaration saved
  const [submittedTx, setSubmittedTx] = useState<PaymentTransaction | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      // Pre-fill phone if available in user info or storage
      const savedPhone = localStorage.getItem('user_contact_phone') || subscription?.phoneNumber;
      if (savedPhone && !senderPhone) {
        setSenderPhone(savedPhone);
      }
    }
  }, [isOpen, subscription]);

  if (!isOpen) return null;

  const currentStatus = subscription?.status || 'trial';
  const trialDaysLeft = subscription?.trialDaysRemaining ?? 7;
  const isTrial = currentStatus === 'trial';
  const isActive = currentStatus === 'active';
  const isExpired = currentStatus === 'expired';

  const getEffectiveUserId = (): string => {
    // Check if phone user logged in
    const phoneUserId = localStorage.getItem('phone_user_id');
    if (phoneUserId) return phoneUserId;
    if (user) return user.uid;
    let localUid = localStorage.getItem('journal_local_uid');
    if (!localUid) {
      localUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('journal_local_uid', localUid);
    }
    return localUid;
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(rawMerchantPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Direct automated payment with phone number (Wave or Orange Money)
  const handleDirectAutoPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderPhone || senderPhone.trim().length < 7) {
      setError("Veuillez saisir votre numéro de téléphone (ex: 77 123 45 67).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      localStorage.setItem('user_contact_phone', senderPhone.trim());
      const uid = getEffectiveUserId();

      const res = await payWithPhone({
        userId: uid,
        phoneNumber: senderPhone.trim(),
        provider: selectedProvider,
        paymentReference: paymentReference.trim() || undefined,
        notes: `Paiement ${selectedProvider === 'wave' ? 'Wave' : 'Orange Money'} avec activation automatique`
      });

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setSuccessMessage(res.message || "Paiement validé avec succès ! Votre abonnement est maintenant actif pour 1 mois.");
      onSubscriptionUpdated();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'activation du paiement.");
    } finally {
      setLoading(false);
    }
  };

  // Submit declaration when user clicks "J'ai effectué le paiement"
  const handleSubmitDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderPhone || senderPhone.trim().length < 7) {
      setError("Veuillez saisir votre numéro de téléphone d'envoi (ex: 77 XXX XX XX, 78..., 76..., 70...).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      localStorage.setItem('user_contact_phone', senderPhone.trim());
      const uid = getEffectiveUserId();

      const res = await declarePayment({
        userId: uid,
        userEmail: user?.email || undefined,
        provider: 'wave_om',
        senderPhone: senderPhone.trim(),
        paymentReference: paymentReference.trim() || undefined,
        notes: `Transfert de 5 000 FCFA sur le ${merchantPhone}`
      });

      setSubmittedTx(res.transaction);
      setSuccessMessage(
        "Votre déclaration a bien été enregistrée. Elle est en attente de vérification par le marchand sur le " + merchantPhone + ". L'accès Premium sera activé dès validation du transfert de 5 000 FCFA."
      );
      onSubscriptionUpdated();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de votre paiement.");
    } finally {
      setLoading(false);
    }
  };

  // Merchant / Admin verifies and approves payment
  const handleVerifyApproval = async () => {
    if (!submittedTx) return;
    setVerifying(true);
    setError(null);

    try {
      const res = await verifyDeclaration({
        transactionId: submittedTx.id,
        action: 'approve',
        adminPin: adminPin.trim() || '1683',
        note: `Vérifié et validé sur le ${merchantPhone}`
      });

      if (res.success) {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        setSuccessMessage("Paiement validé avec succès ! Votre abonnement Premium de 5 000 FCFA est maintenant actif pour 1 mois (30 jours).");
        setSubmittedTx(null);
        setShowDeclarationForm(false);
        onSubscriptionUpdated();
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la validation du paiement.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] w-full max-w-xl shadow-2xl overflow-hidden relative my-6"
        id="modal-subscription-premium"
      >
        {/* Header with decorative badge */}
        <div className="bg-gradient-to-r from-[#1B382B] via-[#2D5A43] to-[#1B382B] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#E8D9C0] mb-2 font-editorial">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Formule Professionnelle Sénégal</span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-2xl font-bold font-editorial">Journal de Caisse Pro</h3>
              <p className="text-xs text-white/80 mt-0.5">Wave & Orange Money direct</p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-extrabold font-mono-num tracking-tight text-white">
                5 000 <span className="text-sm font-normal text-[#E8D9C0]">FCFA</span>
              </div>
              <div className="text-[11px] text-white/70">par mois / sans engagement</div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* 1. Account Status Badge */}
          <div className="rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-[#7A756D]">
                Statut actuel de votre compte
              </div>
              <div className="flex items-center space-x-2">
                {isActive ? (
                  <span className="inline-flex items-center space-x-1.5 text-sm font-bold text-[#2D5A43]">
                    <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
                    <span>Premium actif</span>
                  </span>
                ) : isTrial ? (
                  <span className="inline-flex items-center space-x-1.5 text-sm font-bold text-[#9C6B28]">
                    <Clock className="w-4 h-4 text-[#9C6B28]" />
                    <span>Essai gratuit (7 jours)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-sm font-bold text-[#8B3A3A]">
                    <AlertTriangle className="w-4 h-4 text-[#8B3A3A]" />
                    <span>Abonnement expiré</span>
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {isTrial && (
                <div className="bg-[#FAF3E8] border border-[#E8D9C0] px-3 py-1 rounded-xl text-xs font-bold text-[#9C6B28] font-mono">
                  {trialDaysLeft > 0 ? `${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''} restant${trialDaysLeft > 1 ? 's' : ''}` : 'Dernier jour d\'essai'}
                </div>
              )}
              {isActive && subscription?.endDate && (
                <div className="text-xs font-semibold text-[#2D5A43]">
                  Expire le {new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
              {isExpired && (
                <div className="bg-[#FAF0F0] border border-[#8B3A3A]/30 px-3 py-1 rounded-xl text-xs font-bold text-[#8B3A3A]">
                  Paiement requis
                </div>
              )}
            </div>
          </div>

          {/* Notice about single trial */}
          {isTrial && (
            <div className="text-xs bg-[#F4F1EA] text-[#5C574F] p-3 rounded-xl border border-[#DCD6CB] flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>
                Chaque nouvel utilisateur bénéficie d’un <strong>essai gratuit de 7 jours (accordé une seule fois)</strong>.
                Après ces 7 jours, le paiement de 5 000 FCFA est nécessaire pour continuer.
              </span>
            </div>
          )}

          {isExpired && (
            <div className="text-xs bg-[#FAF0F0] text-[#8B3A3A] p-3 rounded-xl border border-[#8B3A3A]/30 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#8B3A3A] shrink-0 mt-0.5" />
              <span>
                Votre période d'essai de 7 jours ou abonnement précédent est arrivée à son terme.
                Pour réactiver toutes les fonctionnalités Premium pour 1 mois, effectuez votre paiement ci-dessous.
              </span>
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="bg-[#E7EFEA] border border-[#2D5A43] text-[#2D5A43] p-4 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#2D5A43]" />
                <span>Information de paiement</span>
              </div>
              <p className="leading-relaxed">{successMessage}</p>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="bg-[#FAF0F0] border border-[#8B3A3A]/30 text-[#8B3A3A] p-4 rounded-2xl text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 text-[#8B3A3A]" />
                <span>Attention</span>
              </div>
              <p>{error}</p>
            </div>
          )}

          {/* Payment Method Selector Tabs */}
          <div className="flex rounded-2xl bg-[#EBE8E0] p-1.5 border border-[#DCD6CB] text-xs font-semibold gap-1">
            <button
              type="button"
              id="tab-payment-auto-phone"
              onClick={() => {
                setPaymentMode('auto_phone');
                setError(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                paymentMode === 'auto_phone'
                  ? 'bg-[#2D5A43] text-white font-bold shadow-xs'
                  : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-white/50'
              }`}
            >
              <Zap className="w-4 h-4 text-[#D4AF37]" />
              <span>Paiement Direct (Activation Auto)</span>
            </button>
            <button
              type="button"
              id="tab-payment-manual-transfer"
              onClick={() => {
                setPaymentMode('manual_transfer');
                setError(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                paymentMode === 'manual_transfer'
                  ? 'bg-[#2D5A43] text-white font-bold shadow-xs'
                  : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-white/50'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Transfert vers 78 968 16 83</span>
            </button>
          </div>

          {/* TAB 1: AUTOMATIC PHONE PAYMENT (WAVE OU ORANGE MONEY) */}
          {paymentMode === 'auto_phone' && (
            <form onSubmit={handleDirectAutoPayment} className="bg-white border border-[#DCD6CB] rounded-2xl p-5 space-y-4 animate-fadeIn shadow-xs">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#1A1A1A] flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#2D5A43]" />
                  <span>Paiement sécurisé par numéro de téléphone</span>
                </h4>
                <p className="text-xs text-[#7A756D]">
                  Votre compte sera activé automatiquement pour 30 jours dès confirmation du paiement.
                </p>
              </div>

              {/* Provider Selector: Wave vs Orange Money */}
              <div>
                <label className="font-bold text-[#3D3A34] block mb-1.5 text-xs">
                  Choisissez votre opérateur de paiement <span className="text-[#8B3A3A]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    id="btn-select-provider-wave"
                    onClick={() => setSelectedProvider('wave')}
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedProvider === 'wave'
                        ? 'border-[#1DA1F2] bg-[#E8F5FD] text-[#0C6EAE] ring-2 ring-[#1DA1F2]/30 shadow-xs'
                        : 'border-[#DCD6CB] hover:bg-[#FAF9F5] text-[#1A1A1A]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#1DA1F2] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                      W
                    </div>
                    <div>
                      <div className="font-bold text-xs">Wave</div>
                      <div className="text-[10px] opacity-80">Paiement direct</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-select-provider-orange"
                    onClick={() => setSelectedProvider('orange_money')}
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedProvider === 'orange_money'
                        ? 'border-[#FF7900] bg-[#FFF4E6] text-[#D35400] ring-2 ring-[#FF7900]/30 shadow-xs'
                        : 'border-[#DCD6CB] hover:bg-[#FAF9F5] text-[#1A1A1A]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#FF7900] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      OM
                    </div>
                    <div>
                      <div className="font-bold text-xs">Orange Money</div>
                      <div className="text-[10px] opacity-80">Paiement direct</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="text-xs">
                <label className="font-bold text-[#3D3A34] block mb-1">
                  Votre numéro de téléphone {selectedProvider === 'wave' ? 'Wave' : 'Orange Money'} <span className="text-[#8B3A3A]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    id="input-auto-payment-phone"
                    placeholder="Ex : 77 123 45 67 ou 78..."
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#DCD6CB] bg-[#FAFAF7] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20"
                  />
                  <Phone className="w-4 h-4 text-[#7A756D] absolute left-3 top-3" />
                </div>
                <span className="text-[11px] text-[#7A756D] mt-1 block">
                  Numéro associé à votre compte {selectedProvider === 'wave' ? 'Wave' : 'Orange Money'}.
                </span>
              </div>

              {/* Payment Reference (optional) */}
              <div className="text-xs">
                <label className="font-bold text-[#3D3A34] block mb-1">
                  Référence du paiement <span className="text-[#7A756D] font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  id="input-auto-payment-ref"
                  placeholder="Ex : Réf. transaction SMS"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#DCD6CB] bg-[#FAFAF7] text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20"
                />
              </div>

              {/* Auto activation assurance badge */}
              <div className="bg-[#E7EFEA] border border-[#C3D9CD] p-3 rounded-xl text-xs text-[#2D5A43] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A43] shrink-0" />
                <span>
                  <strong>Activation instantanée :</strong> Votre abonnement Premium de 5 000 FCFA est immédiatement prolongé de 30 jours dès confirmation.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-auto-phone-payment"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#2D5A43] hover:bg-[#234735] active:bg-[#1B382B] text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activation automatique en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-[#D4AF37]" />
                    <span>Confirmer et Activer automatiquement (5 000 FCFA)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: MANUAL P2P TRANSFER (78 968 16 83) */}
          {paymentMode === 'manual_transfer' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Official Payment Display Box (STRICTLY REQUIRED) */}
              <div className="bg-[#1B382B] text-white p-4 sm:p-5 rounded-2xl border border-[#DCD6CB] shadow-md space-y-3">
                <div className="flex items-center justify-between text-xs text-[#E8D9C0] font-semibold">
                  <span>Numéro officiel pour le transfert :</span>
                  <span className="bg-white/15 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                    5 000 FCFA
                  </span>
                </div>

                {/* Clearly display: « Paiement Wave / Orange Money : 78 968 16 83 » */}
                <div className="bg-white/10 p-3.5 rounded-xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-base sm:text-lg font-extrabold tracking-wide font-mono text-white flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>Paiement Wave / Orange Money : 78 968 16 83</span>
                    </div>
                    <p className="text-[11px] text-white/80">
                      Envoyez 5 000 FCFA par Wave ou Orange Money sur ce numéro officiel
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-copy-merchant-phone"
                    onClick={handleCopyNumber}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-white text-[#1B382B] hover:bg-[#E8D9C0] rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                    title="Copier le numéro de téléphone"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#2D5A43]" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier 78 968 16 83</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-white/70 flex items-center justify-between">
                  <span>Bénéficiaire : Journal de Caisse Service</span>
                  <span>Délai de validation : 1 à 5 minutes</span>
                </div>
              </div>

              {/* Button: "J'ai effectué le paiement" */}
              {!showDeclarationForm && !submittedTx && (
                <div className="pt-1">
                  <button
                    type="button"
                    id="btn-i-have-paid"
                    onClick={() => {
                      setShowDeclarationForm(true);
                      setError(null);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#2D5A43] hover:bg-[#234735] active:bg-[#1B382B] text-white rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#D4AF37]" />
                    <span>J’ai effectué le paiement</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-[11px] text-[#7A756D] mt-2">
                    Cliquez sur ce bouton après avoir envoyé les 5 000 FCFA pour déclarer votre numéro et référence.
                  </p>
                </div>
              )}

              {/* Declaration Form (Phone + Payment Reference) */}
              {showDeclarationForm && (
                <form onSubmit={handleSubmitDeclaration} className="bg-white border border-[#DCD6CB] rounded-2xl p-4 sm:p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-[#DCD6CB] pb-2">
                    <div className="flex items-center space-x-2 text-[#1A1A1A] font-bold text-sm">
                      <Phone className="w-4 h-4 text-[#2D5A43]" />
                      <span>Détails de votre déclaration</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeclarationForm(false)}
                      className="text-xs text-[#7A756D] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      Fermer le formulaire
                    </button>
                  </div>

                  <div className="bg-[#FAF3E8] border border-[#E8D9C0] p-3 rounded-xl text-xs text-[#9C6B28] flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#9C6B28] shrink-0 mt-0.5" />
                    <span>
                      <strong>Vérification opérateur :</strong> Le marchand valide la réception effective des 5 000 FCFA sur le <strong>78 968 16 83</strong> avant l'activation.
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-[#3D3A34] block mb-1">
                        Votre numéro de téléphone d'envoi <span className="text-[#8B3A3A]">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        id="input-manual-sender-phone"
                        placeholder="Ex : 77 123 45 67, 78..., 76..., 70..."
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6CB] bg-[#FAFAF7] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#3D3A34] block mb-1">
                        Référence du paiement / Code SMS (recommandé)
                      </label>
                      <input
                        type="text"
                        id="input-manual-payment-ref"
                        placeholder="Ex : WV-987654 ou Réf. SMS Orange Money"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6CB] bg-[#FAFAF7] text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-manual-declaration"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Transmission en cours...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Envoyer ma déclaration pour vérification (5 000 FCFA)</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}


          {/* 5. Submitted declaration summary and verification section */}
          {submittedTx && (
            <div className="bg-[#FAF3E8] border border-[#E8D9C0] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-[#9C6B28] font-bold text-xs">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Déclaration en attente de vérification</span>
                </div>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#E8D9C0] text-[10px]">
                  Réf: {submittedTx.id}
                </span>
              </div>

              <div className="text-xs text-[#5C574F] space-y-1 bg-white p-3 rounded-xl border border-[#E8D9C0]">
                <div>• Mode : <strong>Wave / Orange Money</strong></div>
                <div>• Numéro destinataire : <strong>{merchantPhone}</strong></div>
                <div>• Votre numéro émetteur : <strong>{submittedTx.senderPhone}</strong></div>
                {submittedTx.paymentReference && (
                  <div>• Réf. déclarée : <code className="font-mono">{submittedTx.paymentReference}</code></div>
                )}
                <div>• Montant à valider : <strong>5 000 FCFA (1 mois de Premium)</strong></div>
              </div>

              {/* Merchant verification drawer for 78 968 16 83 */}
              <div className="pt-2 border-t border-[#E8D9C0]">
                <button
                  type="button"
                  onClick={() => setShowAdminVerify(!showAdminVerify)}
                  className="flex items-center space-x-1 text-[11px] font-bold text-[#9C6B28] hover:underline cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Espace validation Marchand (78 968 16 83)</span>
                </button>

                {showAdminVerify && (
                  <div className="mt-2 p-3 bg-white rounded-xl border border-[#E8D9C0] space-y-2 text-xs">
                    <p className="text-[11px] text-[#7A756D]">
                      Le marchand vérifie la réception du SMS de 5 000 FCFA sur le 78 968 16 83 avant d'activer le compte :
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        placeholder="Code validation marchand (défaut: 1683)"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-[#DCD6CB] text-xs font-mono w-full"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyApproval}
                        disabled={verifying}
                        className="px-3 py-1.5 bg-[#2D5A43] hover:bg-[#234735] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Valider & Activer 1 mois'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer security guarantee */}
          <div className="flex items-center justify-center space-x-2 text-[11px] text-[#7A756D] pt-1">
            <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
            <span>Sécurisé • Validation opérateur certifiée • Support direct au 78 968 16 83</span>
          </div>

        </div>
      </div>
    </div>
  );
};
