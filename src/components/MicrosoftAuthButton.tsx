import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  signInWithMicrosoft,
  signInWithFacebook,
  signInWithGoogle, 
  logoutUser, 
  syncAllJournalsToCloud, 
  loadJournalsFromCloud 
} from '../utils/firebase';
import { DailyJournal, PhoneAccount, UserSubscription } from '../types';
import { 
  LogOut, 
  Cloud, 
  RefreshCw, 
  ShieldCheck, 
  ChevronDown, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  X,
  ListOrdered,
  User as UserIcon,
  Sparkles,
  Phone,
  Crown,
  Gift,
  KeyRound,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface AuthErrorInfo {
  type: 'unauthorized-domain' | 'provider-disabled-microsoft' | 'provider-disabled-facebook' | 'popup-blocked' | 'network-request-failed' | 'general';
  domain: string;
  message: string;
}

interface MicrosoftAuthButtonProps {
  user: User | null;
  journals: DailyJournal[];
  onJournalsLoadedFromCloud: (journals: DailyJournal[]) => void;
  phoneAccount?: PhoneAccount | null;
  subscription?: UserSubscription | null;
  onOpenPhoneAuthModal?: (mode: 'register' | 'login') => void;
  onOpenSubscribeModal?: () => void;
  onLogoutPhoneAccount?: () => void;
}

export const MicrosoftAuthButton: React.FC<MicrosoftAuthButtonProps> = ({
  user,
  journals,
  onJournalsLoadedFromCloud,
  phoneAccount,
  subscription,
  onOpenPhoneAuthModal,
  onOpenSubscribeModal,
  onLogoutPhoneAccount
}) => {
  const [loading, setLoading] = useState<string | null>(null); // 'microsoft' | 'facebook' | 'google' | null
  const [syncing, setSyncing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSignInFacebook = async () => {
    setAuthError(null);
    setShowProfileMenu(false);
    try {
      setLoading('facebook');
      const loggedUser = await signInWithFacebook();
      if (loggedUser) {
        setStatusMsg('Connecté avec succès à Facebook ! Synchronisation...');
        const cloudJournals = await loadJournalsFromCloud(loggedUser.uid);
        if (cloudJournals && cloudJournals.length > 0) {
          onJournalsLoadedFromCloud(cloudJournals);
          setStatusMsg(`${cloudJournals.length} journaux synchronisés depuis Facebook !`);
        } else if (journals.length > 0) {
          await syncAllJournalsToCloud(loggedUser.uid, journals);
          setStatusMsg(`${journals.length} journaux sauvegardés sur votre compte Facebook !`);
        }
      }
    } catch (err: any) {
      console.error('Facebook sign-in error:', err);
      const code = err?.code || '';
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'votre-domaine.github.io';

      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setAuthError({
          type: 'provider-disabled-facebook',
          domain: currentHost,
          message: 'Le fournisseur Facebook doit être activé dans votre console Firebase Authentication.'
        });
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError({
          type: 'unauthorized-domain',
          domain: currentHost,
          message: `Le domaine "${currentHost}" n'est pas encore autorisé dans Firebase pour la connexion Facebook.`
        });
      } else if (code === 'auth/popup-blocked') {
        setAuthError({
          type: 'popup-blocked',
          domain: currentHost,
          message: 'La fenêtre pop-up Facebook a été bloquée par le navigateur. Autorisez les pop-ups pour continuer.'
        });
      } else if (code === 'auth/account-exists-with-different-credential') {
        setAuthError({
          type: 'general',
          domain: currentHost,
          message: 'Un compte existe déjà avec cette adresse email sous un autre fournisseur (ex. Microsoft ou Google). Connectez-vous avec ce dernier.'
        });
      } else if (code === 'auth/network-request-failed') {
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        setAuthError({
          type: 'network-request-failed',
          domain: currentHost,
          message: isInIframe
            ? 'La connexion dans une fenêtre intégrée (iframe) est bloquée par la sécurité de votre navigateur (cookies tiers). Ouvrez l’application dans un nouvel onglet pour vous connecter sans restriction.'
            : 'La requête vers les serveurs Firebase a échoué. Cela arrive si un bloqueur de publicités (AdBlock, uBlock, Brave Shields) bloque Google Identity ou si la connexion a été interrompue.'
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setStatusMsg('Connexion Facebook annulée.');
      } else {
        setAuthError({
          type: 'general',
          domain: currentHost,
          message: err?.message || 'Erreur lors de la connexion Facebook.'
        });
      }
    } finally {
      setLoading(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleSignInMicrosoft = async () => {
    setAuthError(null);
    setShowProfileMenu(false);
    try {
      setLoading('microsoft');
      const loggedUser = await signInWithMicrosoft();
      if (loggedUser) {
        setStatusMsg('Connecté avec succès à Microsoft ! Synchronisation...');
        const cloudJournals = await loadJournalsFromCloud(loggedUser.uid);
        if (cloudJournals && cloudJournals.length > 0) {
          onJournalsLoadedFromCloud(cloudJournals);
          setStatusMsg(`${cloudJournals.length} journaux synchronisés depuis le Cloud Microsoft !`);
        } else if (journals.length > 0) {
          await syncAllJournalsToCloud(loggedUser.uid, journals);
          setStatusMsg(`${journals.length} journaux sauvegardés sur votre compte Microsoft !`);
        }
      }
    } catch (err: any) {
      console.error('Microsoft sign-in error:', err);
      const code = err?.code || '';
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'votre-domaine.github.io';

      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setAuthError({
          type: 'provider-disabled-microsoft',
          domain: currentHost,
          message: 'Le fournisseur Microsoft doit être activé dans votre console Firebase Authentication.'
        });
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError({
          type: 'unauthorized-domain',
          domain: currentHost,
          message: `Le domaine "${currentHost}" n'est pas encore autorisé dans votre projet Firebase pour la connexion Microsoft.`
        });
      } else if (code === 'auth/popup-blocked') {
        setAuthError({
          type: 'popup-blocked',
          domain: currentHost,
          message: 'La fenêtre pop-up de connexion Microsoft a été bloquée par le navigateur. Autorisez les pop-ups pour continuer.'
        });
      } else if (code === 'auth/network-request-failed') {
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        setAuthError({
          type: 'network-request-failed',
          domain: currentHost,
          message: isInIframe
            ? 'La connexion dans une fenêtre intégrée (iframe) est bloquée par la sécurité de votre navigateur (cookies tiers). Ouvrez l’application dans un nouvel onglet pour vous connecter sans restriction.'
            : 'La requête vers les serveurs Firebase a échoué. Cela arrive si un bloqueur de publicités (AdBlock, uBlock, Brave Shields) bloque Google Identity ou si la connexion a été interrompue.'
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setStatusMsg('Connexion Microsoft annulée.');
      } else {
        setAuthError({
          type: 'general',
          domain: currentHost,
          message: err?.message || 'Erreur lors de la connexion Microsoft.'
        });
      }
    } finally {
      setLoading(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleSignInGoogle = async () => {
    setAuthError(null);
    setShowProfileMenu(false);
    try {
      setLoading('google');
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setStatusMsg('Connecté avec succès ! Synchronisation...');
        const cloudJournals = await loadJournalsFromCloud(loggedUser.uid);
        if (cloudJournals && cloudJournals.length > 0) {
          onJournalsLoadedFromCloud(cloudJournals);
        } else if (journals.length > 0) {
          await syncAllJournalsToCloud(loggedUser.uid, journals);
        }
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'votre-domaine.github.io';
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError({
          type: 'unauthorized-domain',
          domain: currentHost,
          message: `Le domaine "${currentHost}" n'est pas autorisé dans Firebase.`
        });
      } else if (err?.code === 'auth/network-request-failed') {
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        setAuthError({
          type: 'network-request-failed',
          domain: currentHost,
          message: isInIframe
            ? 'La connexion dans une fenêtre intégrée (iframe) est bloquée par la sécurité de votre navigateur (cookies tiers). Ouvrez l’application dans un nouvel onglet pour vous connecter sans restriction.'
            : 'La requête vers les serveurs Firebase a échoué. Cela arrive si un bloqueur de publicités (AdBlock, uBlock, Brave Shields) bloque Google Identity ou si la connexion a été interrompue.'
        });
      } else {
        setAuthError({
          type: 'general',
          domain: currentHost,
          message: err?.message || 'Erreur de connexion.'
        });
      }
    } finally {
      setLoading(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading('signout');
      await logoutUser();
      setShowProfileMenu(false);
      setStatusMsg('Déconnecté.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    try {
      setSyncing(true);
      await syncAllJournalsToCloud(user.uid, journals);
      const cloudJournals = await loadJournalsFromCloud(user.uid);
      if (cloudJournals && cloudJournals.length > 0) {
        onJournalsLoadedFromCloud(cloudJournals);
      }
      setStatusMsg('Synchronisation réussie !');
    } catch (e) {
      setStatusMsg('Erreur de synchronisation.');
    } finally {
      setSyncing(false);
      setShowProfileMenu(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Detect which provider the user is logged in with
  const userProvider = user?.providerData?.[0]?.providerId || '';
  const isFacebookUser = userProvider.includes('facebook');
  const isMicrosoftUser = userProvider.includes('microsoft');

  return (
    <div className="relative">
      {!user ? (
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Distinct Profile Logo Button (Opens Profile & Accounts Menu) */}
          <button
            id="btn-profile-logo-menu"
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-1.5 bg-[#FAFAF7] hover:bg-[#F4F1EA] text-[#1A1A1A] border border-[#DCD6CB] hover:border-[#2D5A43] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
            title="Logo de Profil - Ouvrir les options de connexion et de compte"
          >
            <div className="relative">
              {/* Profile Avatar Logo Icon */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#EBE8E0] group-hover:bg-[#E2DDD3] border border-[#DCD6CB] flex items-center justify-center text-[#5C574F] transition-colors">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D5A43]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#7A756D] ring-2 ring-white" />
            </div>
            <span className="font-semibold text-xs text-[#1A1A1A]">Profil</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#7A756D] group-hover:text-[#1A1A1A] transition-transform" />
          </button>
        </div>
      ) : (
        /* Connected User Profile Logo Button */
        <button
          id="btn-user-profile-logo"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center space-x-2 bg-white hover:bg-[#F8F9FA] text-[#1A1A1A] border border-[#DCD6CB] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs"
          title="Mon profil et statut de synchronisation"
        >
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profil'}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#2D5A43] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2D5A43] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {user.email?.charAt(0).toUpperCase() || 'P'}
              </div>
            )}
            {/* Online Green Badge */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#27AE60] ring-2 ring-white" />
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-[#1A1A1A] truncate max-w-[110px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-[#7A756D] leading-none flex items-center gap-1">
              {isFacebookUser && (
                <span className="text-[#1877F2] font-semibold">Facebook</span>
              )}
              {isMicrosoftUser && (
                <span className="text-[#0078D4] font-semibold">Microsoft</span>
              )}
              {!isFacebookUser && !isMicrosoftUser && (
                <span className="text-[#2D5A43] font-semibold">Connecté</span>
              )}
            </span>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-[#7A756D]" />
        </button>
      )}

      {/* Profile & Accounts Dropdown Modal */}
      {showProfileMenu && (
        <div 
          className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-[#DCD6CB] p-3.5 z-50 animate-fade-in text-left"
          onMouseLeave={() => setShowProfileMenu(false)}
        >
          {/* Section 1: Phone Account Status (if logged in with phone) */}
          {phoneAccount ? (
            <div className="space-y-3 pb-3 border-b border-[#EBE8E0]">
              <div className="flex items-center space-x-3 p-3 bg-[#FAF9F5] border border-[#EBE8E0] rounded-xl">
                <div className="w-11 h-11 rounded-full bg-[#2D5A43] text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{phoneAccount.displayName}</p>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#E7EFEA] text-[#2D5A43] font-bold border border-[#C3D9CD]">
                      Tél
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#5C574F] font-semibold">{phoneAccount.displayPhone}</p>
                </div>
              </div>

              {/* Subscription Details inside Phone Account */}
              <div className="p-2.5 rounded-xl border border-[#DCD6CB] bg-[#FAFAF7] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#7A756D] font-medium flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Abonnement :</span>
                  </span>
                  {subscription?.status === 'active' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7EFEA] text-[#2D5A43] border border-[#C3D9CD] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Actif
                    </span>
                  ) : subscription?.status === 'trial' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3E8] text-[#9C6B28] border border-[#E8D9C0] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Essai gratuit ({subscription.trialDaysRemaining ?? 7}j)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0F0] text-[#8B3A3A] border border-[#8B3A3A]/30">
                      Expiré
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5C574F]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#7A756D]" />
                    <span>Date d'expiration :</span>
                  </span>
                  <span className="font-semibold text-[#1A1A1A]">
                    {subscription?.expiresAt
                      ? new Date(subscription.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </span>
                </div>

                {/* Manage / Renew button */}
                <button
                  type="button"
                  id="btn-profile-manage-sub"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenSubscribeModal?.();
                  }}
                  className="w-full mt-1 py-1.5 px-3 rounded-lg bg-[#2D5A43] hover:bg-[#234735] text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{subscription?.status === 'active' ? "Gérer l'abonnement" : "Renouveler (Wave / OM)"}</span>
                </button>
              </div>

              {/* Logout Phone Account */}
              {onLogoutPhoneAccount && (
                <button
                  type="button"
                  id="btn-logout-phone-account"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogoutPhoneAccount();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-[#8B3A3A] hover:bg-[#FAF0F0] rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnecter le compte {phoneAccount.displayPhone}</span>
                </button>
              )}
            </div>
          ) : (
            /* Phone Auth Prompt (when NOT logged in with phone) */
            <div className="space-y-2 pb-3 border-b border-[#EBE8E0]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#7A756D] uppercase tracking-wider">
                  Compte Téléphone & Abonnement
                </span>
                <span className="bg-[#FAF3E8] text-[#9C6B28] text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#E8D9C0]">
                  7 jours offerts
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {/* 1. Register with Phone (7 days free) */}
                <button
                  type="button"
                  id="menu-btn-phone-register"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenPhoneAuthModal?.('register');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234735] transition-all cursor-pointer shadow-xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-[13px] flex items-center justify-between">
                      <span>Créer un compte</span>
                      <span className="text-[10px] bg-[#D4AF37] text-[#1B382B] font-black px-1.5 rounded">7j GRATUIT</span>
                    </div>
                    <div className="text-[10px] text-white/80">Inscription rapide avec numéro de téléphone</div>
                  </div>
                </button>

                {/* 2. Login with Phone */}
                <button
                  type="button"
                  id="menu-btn-phone-login"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenPhoneAuthModal?.('login');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1A1A1A] bg-[#FAF9F5] hover:bg-[#F3F2F1] border border-[#DCD6CB] transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#2D5A43] shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-bold text-xs">Se connecter avec numéro</div>
                    <div className="text-[10px] text-[#7A756D]">Accéder à votre compte existant</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {!user ? (
            /* Guest / Profile Login Selector */
            <div className="space-y-3 pt-2">
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 p-2.5 bg-[#FAF9F5] border border-[#EBE8E0] rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[#EBE8E0] border border-[#DCD6CB] flex items-center justify-center text-[#2D5A43] shrink-0 shadow-2xs">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1A1A1A]">Profil Cloud (Optionnel)</div>
                  <div className="text-[11px] text-[#7A756D] leading-tight">
                    Synchronisez vos journaux sur plusieurs appareils
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-bold text-[#7A756D] uppercase tracking-wider block px-1 mb-1.5">
                  Autres connexions Cloud
                </span>

                <div className="space-y-1.5">
                  {/* Option 1: Facebook */}
                  <button
                    id="menu-btn-facebook"
                    onClick={handleSignInFacebook}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] transition-colors cursor-pointer shadow-2xs"
                  >
                    {loading === 'facebook' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    )}
                    <div className="text-left flex-1">
                      <div className="font-bold text-xs">Connexion Facebook</div>
                      <div className="text-[10px] text-white/80">Compte personnel ou pro</div>
                    </div>
                  </button>

                  {/* Option 2: Microsoft */}
                  <button
                    id="menu-btn-microsoft"
                    onClick={handleSignInMicrosoft}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#1A1A1A] bg-[#FAFAF7] hover:bg-[#F3F2F1] border border-[#DCD6CB] transition-colors cursor-pointer"
                  >
                    {loading === 'microsoft' ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0078D4]" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                      </svg>
                    )}
                    <div className="text-left flex-1">
                      <div className="font-bold text-xs">Connexion Microsoft</div>
                      <div className="text-[10px] text-[#7A756D]">Outlook, Hotmail, Office 365</div>
                    </div>
                  </button>

                  {/* Option 3: Google */}
                  <button
                    id="menu-btn-google"
                    onClick={handleSignInGoogle}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#5C574F] hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    {loading === 'google' ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#2D5A43]" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                    <div className="text-left flex-1">
                      <div className="font-bold text-xs">Connexion Google</div>
                      <div className="text-[10px] text-[#7A756D]">Gmail & Google Workspace</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* User Connected Card */
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2.5 bg-[#FAF9F5] border border-[#EBE8E0] rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Avatar de profil"
                    className="w-12 h-12 rounded-full border-2 border-[#2D5A43] object-cover shrink-0 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#2D5A43] text-white flex items-center justify-center text-base font-bold shrink-0 shadow-2xs">
                    {user.email?.charAt(0).toUpperCase() || 'P'}
                  </div>
                )}
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{user.displayName || 'Utilisateur'}</p>
                    {isFacebookUser && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#1877F2] text-white font-bold">FB</span>
                    )}
                    {isMicrosoftUser && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#0078D4] text-white font-bold">MS</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#7A756D] truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-[#2D5A43] font-semibold">
                    <ShieldCheck className="w-3 h-3 text-[#2D5A43]" />
                    <span>Profil Cloud vérifié</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#1A1A1A] hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <RefreshCw className={`w-4 h-4 text-[#2D5A43] ${syncing ? 'animate-spin' : ''}`} />
                    <span>Synchroniser maintenant</span>
                  </div>
                  <Cloud className="w-3.5 h-3.5 text-[#7A756D]" />
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={loading !== null}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#C0392B] hover:bg-[#FDF2E9] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Status Notification */}
      {statusMsg && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-[#1A1A1A] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
          {statusMsg}
        </div>
      )}

      {/* Authentication Help & Error Modal ("Mise sur liste" des instructions) */}
      {authError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DCD6CB] space-y-4 text-left">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] text-[#C0392B] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
                    {authError.type === 'provider-disabled-facebook'
                      ? 'Activer Facebook dans Firebase'
                      : authError.type === 'provider-disabled-microsoft'
                      ? 'Activer Microsoft dans Firebase'
                      : authError.type === 'unauthorized-domain'
                      ? 'Autoriser le domaine sur Firebase'
                      : authError.type === 'network-request-failed'
                      ? 'Erreur réseau Firebase (auth/network-request-failed)'
                      : 'Problème de connexion'}
                  </h3>
                  <p className="text-xs text-[#7A756D]">
                    Authentification Sécurisée Firebase
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAuthError(null)}
                className="p-1.5 text-[#7A756D] hover:text-[#1A1A1A] hover:bg-[#F4F1EA] rounded-lg transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Disabled: Facebook */}
            {authError.type === 'provider-disabled-facebook' && (
              <div className="space-y-3 text-xs sm:text-sm text-[#3D3A34]">
                <p>
                  Pour que la connexion avec votre compte Facebook fonctionne, le fournisseur <strong>Facebook</strong> doit être activé dans votre console Firebase.
                </p>

                <div className="p-3.5 bg-[#F0F4FA] border border-[#C5D8F7] rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1877F2]">
                    <ListOrdered className="w-4 h-4" />
                    <span>Mise sur liste des étapes d&apos;activation Facebook :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#3D3A34] leading-relaxed">
                    <li>Ouvrez la <strong>Console Firebase &gt; Authentication &gt; Sign-in method</strong>.</li>
                    <li>Cliquez sur <strong>Ajouter un nouveau fournisseur</strong> et choisissez <strong>Facebook</strong>.</li>
                    <li>Activez l&apos;interrupteur <strong>Activer</strong>.</li>
                    <li>Renseignez l&apos;<strong>App ID</strong> et l&apos;<strong>App Secret</strong> de votre application Facebook (créée gratuitement sur <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-[#1877F2] underline">developers.facebook.com</a>).</li>
                    <li>Cliquez sur <strong>Enregistrer</strong>.</li>
                  </ol>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0128035239/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1877F2] hover:bg-[#166FE5] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Ouvrir Firebase Sign-in method</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      handleSignInFacebook();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F4F1EA] hover:bg-[#EAE6DD] text-[#1A1A1A] border border-[#DCD6CB] transition-colors cursor-pointer"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Provider Disabled: Microsoft */}
            {authError.type === 'provider-disabled-microsoft' && (
              <div className="space-y-3 text-xs sm:text-sm text-[#3D3A34]">
                <p>
                  Pour que la connexion Microsoft fonctionne, le fournisseur <strong>Microsoft</strong> doit être activé dans votre console Firebase.
                </p>

                <div className="p-3.5 bg-[#F8F9FA] border border-[#DCD6CB] rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                    <ListOrdered className="w-4 h-4 text-[#0078D4]" />
                    <span>Mise sur liste des étapes d&apos;activation Microsoft :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#5C574F] leading-relaxed">
                    <li>Ouvrez la <strong>Console Firebase &gt; Authentication &gt; Sign-in method</strong>.</li>
                    <li>Sélectionnez <strong>Microsoft</strong> dans la liste.</li>
                    <li>Activez l&apos;interrupteur <strong>Activer</strong> et cliquez sur <strong>Enregistrer</strong>.</li>
                  </ol>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0128035239/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0078D4] hover:bg-[#005A9E] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Activer Microsoft sur Firebase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      handleSignInMicrosoft();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F4F1EA] hover:bg-[#EAE6DD] text-[#1A1A1A] border border-[#DCD6CB] transition-colors cursor-pointer"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Unauthorized Domain */}
            {authError.type === 'unauthorized-domain' && (
              <div className="space-y-3 text-xs sm:text-sm text-[#3D3A34]">
                <p>
                  Par mesure de sécurité, Firebase bloque la connexion depuis les nouveaux domaines web tant qu&apos;ils ne sont pas déclarés.
                </p>

                <div className="p-3 bg-[#F4F1EA] border border-[#DCD6CB] rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-[#5C574F] uppercase tracking-wider block">
                    Domaine à autoriser :
                  </span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#DCD6CB] font-mono text-xs text-[#1A1A1A]">
                    <span className="truncate">{authError.domain}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(authError.domain)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#2D5A43] hover:text-[#1E3E2E] shrink-0 ml-2 px-2.5 py-1 rounded bg-[#E7EFEA] hover:bg-[#D7E8DD] transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                    <ListOrdered className="w-4 h-4 text-[#2D5A43]" />
                    <span>Mise sur liste des étapes :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-[#5C574F] leading-relaxed">
                    <li>Ouvrez <strong>Authentication &gt; Paramètres (Settings)</strong> sur Firebase.</li>
                    <li>Dans <strong>Domaines autorisés</strong>, cliquez sur <strong>Ajouter un domaine</strong>.</li>
                    <li>Collez <strong className="font-mono text-[#1A1A1A]">{authError.domain}</strong> et validez.</li>
                  </ol>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0128035239/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#2D5A43] hover:bg-[#234734] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Ouvrir les paramètres Firebase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F4F1EA] hover:bg-[#EAE6DD] text-[#1A1A1A] border border-[#DCD6CB] transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* Network Request Failed (Iframe / Third-party cookies / Adblock) */}
            {authError.type === 'network-request-failed' && (
              <div className="space-y-3.5 text-xs sm:text-sm text-[#3D3A34]">
                <div className="p-3 bg-[#FEF3C7]/70 border border-[#F59E0B]/50 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#92400E] text-xs">
                    <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span>Pourquoi cette erreur réseau se produit-elle ?</span>
                  </div>
                  <p className="text-xs text-[#78350F] leading-relaxed">
                    {authError.message}
                  </p>
                </div>

                {/* Primary Action: Open in standalone tab */}
                <div className="p-3.5 bg-[#E7EFEA] border border-[#C3D9CD] rounded-xl space-y-2">
                  <div>
                    <h4 className="font-bold text-xs text-[#2D5A43]">
                      Solution recommandée (Résout le blocage dans 95% des cas)
                    </h4>
                    <p className="text-[11px] text-[#5C574F] mt-0.5">
                      Les navigateurs bloquent les fenêtres pop-up et les cookies tiers au sein d&apos;un aperçu intégré. Ouvrir l&apos;application dans son propre onglet débloque instantanément la connexion.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(window.location.href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#2D5A43] hover:bg-[#234735] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ouvrir l&apos;application dans un nouvel onglet</span>
                  </button>
                </div>

                {/* Step-by-step checklist */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                    <ListOrdered className="w-4 h-4 text-[#2D5A43]" />
                    <span>Mise sur liste des vérifications :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#5C574F] leading-relaxed">
                    <li>
                      <strong>Bloqueur de publicités (AdBlock, uBlock, Brave Shields)</strong> : Désactivez-le temporairement sur ce site pour autoriser les requêtes vers Firebase.
                    </li>
                    <li>
                      <strong>Autoriser les fenêtres pop-up</strong> : Assurez-vous que votre navigateur ne bloque pas l&apos;ouverture des pop-ups d&apos;authentification.
                    </li>
                    <li>
                      <strong>Domaine autorisé</strong> : Vérifiez que <code className="font-mono text-[11px] text-[#1A1A1A] bg-[#F4F1EA] px-1 py-0.5 rounded">{authError.domain}</code> figure bien dans les domaines autorisés de votre projet Firebase.
                    </li>
                  </ol>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      handleSignInFacebook();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1877F2] hover:bg-[#166FE5] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Réessayer Facebook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      handleSignInMicrosoft();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0078D4] hover:bg-[#005A9E] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Réessayer Microsoft</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthError(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F4F1EA] hover:bg-[#EAE6DD] text-[#1A1A1A] border border-[#DCD6CB] transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* General or Pop-up Blocked */}
            {authError.type !== 'provider-disabled-facebook' && 
             authError.type !== 'provider-disabled-microsoft' && 
             authError.type !== 'unauthorized-domain' &&
             authError.type !== 'network-request-failed' && (
              <div className="space-y-3 text-xs sm:text-sm text-[#3D3A34]">
                <p>{authError.message}</p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthError(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2D5A43] text-white hover:bg-[#234734] transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
