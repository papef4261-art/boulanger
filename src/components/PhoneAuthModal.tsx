import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Gift, 
  Store, 
  ShieldCheck 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PhoneAccount, UserSubscription } from '../types';
import { registerPhoneAccount, loginPhoneAccount } from '../utils/subscriptionApi';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: PhoneAccount, subscription: UserSubscription) => void;
  initialMode?: 'register' | 'login';
}

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register'
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+221');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const rawPhoneDigits = phone.replace(/\s+/g, '');
    if (!rawPhoneDigits || rawPhoneDigits.length < 7) {
      setError('Veuillez saisir un numéro de téléphone valide (ex: 77 123 45 67).');
      return;
    }

    if (!pin || pin.trim().length < 4) {
      setError('Le code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    // Compose full phone string
    const fullPhone = phone.trim().startsWith('+') ? phone.trim() : `${countryCode}${rawPhoneDigits}`;

    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await registerPhoneAccount(fullPhone, pin.trim(), displayName.trim() || undefined);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setSuccessMessage('Compte créé avec succès ! Vos 7 jours d’essai gratuit sont activés.');
        setTimeout(() => {
          onSuccess(res.user, res.subscription);
          onClose();
        }, 1200);
      } else {
        const res = await loginPhoneAccount(fullPhone, pin.trim());
        setSuccessMessage('Connexion réussie ! Bienvenue sur votre Journal de Caisse.');
        setTimeout(() => {
          onSuccess(res.user, res.subscription);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l’opération.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-[#FAFAF7] rounded-3xl border border-[#DCD6CB] w-full max-w-md shadow-2xl overflow-hidden relative my-6"
        id="modal-phone-auth"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1B382B] via-[#2D5A43] to-[#1B382B] p-6 text-white relative">
          <button
            type="button"
            id="btn-close-phone-auth"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#E8D9C0] mb-2 font-editorial">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Compte & Abonnement Téléphone</span>
          </div>

          <h3 className="text-2xl font-bold font-editorial">
            {mode === 'register' ? 'Créer un Compte Commerçant' : 'Se Connecter'}
          </h3>
          <p className="text-xs text-white/80 mt-1">
            {mode === 'register' 
              ? 'Accédez immédiatement à vos 7 jours d’essai 100% gratuit'
              : 'Retrouvez votre journal de caisse et votre abonnement'}
          </p>
        </div>

        {/* Free trial highlight banner */}
        {mode === 'register' && (
          <div className="bg-[#E7EFEA] border-b border-[#C3D9CD] p-3.5 px-6 flex items-center space-x-3 text-xs text-[#2D5A43]">
            <div className="p-1.5 rounded-lg bg-[#2D5A43] text-white shrink-0">
              <Gift className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="leading-snug">
              <strong className="font-bold">7 jours gratuits inclus :</strong> Découvrez toutes les fonctionnalités sans carte bancaire ni engagement.
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-[#EBE8E0] p-1 border border-[#DCD6CB] text-xs font-semibold">
            <button
              type="button"
              id="tab-auth-register"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
                mode === 'register'
                  ? 'bg-white text-[#2D5A43] font-bold shadow-xs'
                  : 'text-[#7A756D] hover:text-[#1A1A1A]'
              }`}
            >
              Nouveau compte (7j offerts)
            </button>
            <button
              type="button"
              id="tab-auth-login"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
                mode === 'login'
                  ? 'bg-white text-[#2D5A43] font-bold shadow-xs'
                  : 'text-[#7A756D] hover:text-[#1A1A1A]'
              }`}
            >
              Déjà un compte (Connexion)
            </button>
          </div>

          {/* Success message banner */}
          {successMessage && (
            <div className="p-3.5 bg-[#E7EFEA] border border-[#2D5A43] text-[#2D5A43] rounded-xl text-xs flex items-center space-x-2 font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-[#2D5A43] shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error message banner */}
          {error && (
            <div className="p-3.5 bg-[#FAF0F0] border border-[#8B3A3A]/30 text-[#8B3A3A] rounded-xl text-xs flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-[#8B3A3A] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePhoneSubmit} className="space-y-4 text-xs">
            {/* Store / Merchant Name (only in register mode) */}
            {mode === 'register' && (
              <div>
                <label className="font-bold text-[#3D3A34] block mb-1">
                  Nom de votre Boutique ou Commerce <span className="text-[#7A756D] font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="input-phone-auth-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex : Boulangerie Médina, Boutique Al-Baraka"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#DCD6CB] bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20"
                  />
                  <Store className="w-4 h-4 text-[#7A756D] absolute left-3 top-3" />
                </div>
              </div>
            )}

            {/* Phone Number with Country Prefix Selector */}
            <div>
              <label className="font-bold text-[#3D3A34] block mb-1">
                Numéro de téléphone <span className="text-[#8B3A3A]">*</span>
              </label>
              <div className="flex rounded-xl border border-[#DCD6CB] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#2D5A43]/20">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-[#FAF9F5] border-r border-[#DCD6CB] px-2.5 py-2.5 text-xs font-semibold text-[#1A1A1A] focus:outline-hidden cursor-pointer"
                  id="select-phone-auth-country"
                >
                  <option value="+221">🇸🇳 +221 (Sénégal)</option>
                  <option value="+225">🇨🇮 +225 (Côte d'Ivoire)</option>
                  <option value="+223">🇲🇱 +223 (Mali)</option>
                  <option value="+224">🇬🇳 +224 (Guinée)</option>
                  <option value="+226">🇧🇫 +226 (Burkina Faso)</option>
                  <option value="+228">🇹🇬 +228 (Togo)</option>
                  <option value="+229">🇧🇯 +229 (Bénin)</option>
                  <option value="+227">🇳🇪 +227 (Niger)</option>
                  <option value="+237">🇨🇲 +237 (Cameroun)</option>
                  <option value="+33">🇫🇷 +33 (France)</option>
                </select>
                <div className="relative flex-1">
                  <input
                    type="tel"
                    id="input-phone-auth-number"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex : 77 123 45 67"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent focus:outline-hidden"
                  />
                  <Phone className="w-4 h-4 text-[#7A756D] absolute left-3 top-3" />
                </div>
              </div>
              <span className="text-[11px] text-[#7A756D] mt-1 block">
                Ce numéro servira à vous identifier et à activer vos paiements Wave ou Orange Money.
              </span>
            </div>

            {/* Secret PIN Code */}
            <div>
              <label className="font-bold text-[#3D3A34] block mb-1">
                Code PIN secret (4 à 6 chiffres) <span className="text-[#8B3A3A]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  id="input-phone-auth-pin"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Ex : 1234"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#DCD6CB] bg-white text-sm font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43]/20"
                />
                <Lock className="w-4 h-4 text-[#7A756D] absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-[#7A756D] hover:text-[#1A1A1A] p-0.5 cursor-pointer"
                  title={showPin ? 'Masquer' : 'Afficher'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-[#7A756D] mt-1 block">
                Code secret simple pour sécuriser votre compte sur cet appareil.
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-phone-auth-submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#2D5A43] hover:bg-[#234735] active:bg-[#1B382B] text-white rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Traitement en cours...</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {mode === 'register' ? 'Créer mon compte (7 jours offerts)' : 'Se connecter'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security footnote */}
          <div className="text-[11px] text-[#7A756D] text-center flex items-center justify-center space-x-1 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
            <span>Vos données sont sécurisées sur serveur privé et jamais partagées.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
