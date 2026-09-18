import React from 'react';
import { ActivePage, AppSettings, DailyJournal, PhoneAccount, UserSubscription, BakeryBranch } from '../types';
import { 
  Calculator, 
  Settings as SettingsIcon, 
  Store, 
  PlusCircle, 
  Sparkles,
  ReceiptText,
  TrendingUp,
  BookOpen,
  ExternalLink,
  Camera
} from 'lucide-react';
import { MicrosoftAuthButton } from './MicrosoftAuthButton';
import { BakeryPerimeterSelector } from './BakeryPerimeterSelector';
import { User } from 'firebase/auth';
import defaultStoreLogo from '../assets/images/store_profile_logo_1788716413614.jpg';

interface HeaderProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  settings: AppSettings;
  onNewJournal: () => void;
  todayGain: number;
  user: User | null;
  journals: DailyJournal[];
  onJournalsLoadedFromCloud: (journals: DailyJournal[]) => void;
  isPremium?: boolean;
  onOpenSubscribeModal: () => void;
  phoneAccount?: PhoneAccount | null;
  subscription?: UserSubscription | null;
  onOpenPhoneAuthModal?: (mode: 'register' | 'login') => void;
  onLogoutPhoneAccount?: () => void;
  bakeries?: BakeryBranch[];
  activeBakeryId?: string;
  onSelectBakery?: (bakeryId: string) => void;
  onOpenAddBakeryModal?: () => void;
  onSelectJournal?: (journal: DailyJournal) => void;
  onDeleteBakery?: (bakeryId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  settings,
  onNewJournal,
  todayGain,
  user,
  journals,
  onJournalsLoadedFromCloud,
  isPremium,
  onOpenSubscribeModal,
  phoneAccount,
  subscription,
  onOpenPhoneAuthModal,
  onLogoutPhoneAccount,
  bakeries = [],
  activeBakeryId = 'boulangerie-principale',
  onSelectBakery,
  onOpenAddBakeryModal,
  onSelectJournal,
  onDeleteBakery,
}) => {
  const [profileLogo, setProfileLogo] = React.useState<string>(() => {
    return localStorage.getItem('app_custom_profile_logo') || defaultStoreLogo;
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('app_custom_profile_logo');
      setProfileLogo(saved || defaultStoreLogo);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profile-logo-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profile-logo-updated', handleStorageChange);
    };
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfileLogo(dataUrl);
      localStorage.setItem('app_custom_profile_logo', dataUrl);
      window.dispatchEvent(new Event('profile-logo-updated'));
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="bg-[#FAFAF7] border-b border-[#DCD6CB] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Store Name */}
          <div className="flex items-center space-x-3.5">
            <button
              type="button"
              onClick={() => setActivePage('journal')}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-xs border border-[#2D5A43]/20 bg-[#1B382B] flex items-center justify-center shrink-0 transition-transform hover:scale-105 cursor-pointer group"
              title="Journal de Caisse & Calculateur de Gains - Revenir au Journal (Survolez pour modifier la photo)"
            >
              <img
                src={profileLogo}
                alt="Logo Journal de Caisse & Calculateur de Gains"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = defaultStoreLogo;
                }}
              />
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-semibold"
                title="Changer la photo de profil"
              >
                <Camera className="w-3.5 h-3.5 mb-0.5" />
                <span>Changer</span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setActivePage('journal')}
                  className="text-left cursor-pointer group"
                >
                  <h1 className="text-xl sm:text-2xl font-bold font-editorial text-[#1A1A1A] tracking-tight group-hover:text-[#2D5A43] transition-colors">
                    {settings.businessName || 'Journal de Caisse'}
                  </h1>
                </button>
              </div>
            </div>

            {/* Bakery Perimeter Switcher & Management */}
            {bakeries.length > 0 && onSelectBakery && onOpenAddBakeryModal && (
              <div className="ml-1 sm:ml-2">
                <BakeryPerimeterSelector
                  bakeries={bakeries}
                  activeBakeryId={activeBakeryId}
                  journals={journals}
                  onSelectBakery={onSelectBakery}
                  onOpenAddBakeryModal={onOpenAddBakeryModal}
                  onNewJournalForActiveBakery={onNewJournal}
                  onNavigateToGains={() => setActivePage('gains_summary')}
                  onSelectJournal={(j) => {
                    if (onSelectJournal) onSelectJournal(j);
                    setActivePage('journal');
                  }}
                  onDeleteBakery={onDeleteBakery}
                />
              </div>
            )}
          </div>

            {/* Main Pages Navigation & Quick Action */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <nav className="flex items-center bg-[#EBE8E0] p-1 rounded-xl border border-[#DCD6CB] gap-0.5 max-w-full overflow-x-auto">
              <button
                id="nav-btn-journal"
                onClick={() => setActivePage('journal')}
                title="Journal de caisse quotidien (Raccourci: Ctrl+1 ou ⌘1)"
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePage === 'journal' || activePage === 'dashboard'
                    ? 'bg-[#FAFAF7] text-[#2D5A43] shadow-xs border border-[#DCD6CB]'
                    : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#F4F1EA]'
                }`}
              >
                <ReceiptText className="w-4 h-4 text-[#2D5A43] shrink-0" />
                <span>Journal</span>
              </button>

              <button
                id="nav-btn-history"
                onClick={() => setActivePage('history')}
                title="Historique des journaux (Raccourci: Ctrl+2 ou ⌘2)"
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePage === 'history'
                    ? 'bg-[#FAFAF7] text-[#2D5A43] shadow-xs border border-[#DCD6CB]'
                    : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#F4F1EA]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#2D5A43] shrink-0" />
                <span>Historique</span>
                {journals.length > 0 && (
                  <span className="text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded-full bg-[#E7EFEA] text-[#2D5A43] border border-[#C3D9CD] ml-0.5">
                    {journals.length}
                  </span>
                )}
              </button>

              <button
                id="nav-btn-gains-summary"
                onClick={() => setActivePage('gains_summary')}
                title="Gains, métriques et analyses (Raccourci: Ctrl+3 ou ⌘3)"
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePage === 'gains_summary'
                    ? 'bg-[#FAFAF7] text-[#2D5A43] shadow-xs border border-[#DCD6CB]'
                    : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#F4F1EA]'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#2D5A43] shrink-0" />
                <span>Gains & Analyses</span>
              </button>

              <button
                id="nav-btn-settings"
                onClick={() => setActivePage('settings')}
                title="Paramètres de l'application (Raccourci: Ctrl+4 ou ⌘4)"
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePage === 'settings'
                    ? 'bg-[#FAFAF7] text-[#1A1A1A] shadow-xs border border-[#DCD6CB]'
                    : 'text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#F4F1EA]'
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-[#7A756D] shrink-0" />
                <span className="hidden sm:inline">Paramètres</span>
              </button>
            </nav>

            <MicrosoftAuthButton
              user={user}
              journals={journals}
              onJournalsLoadedFromCloud={onJournalsLoadedFromCloud}
              phoneAccount={phoneAccount}
              subscription={subscription}
              onOpenPhoneAuthModal={onOpenPhoneAuthModal}
              onOpenSubscribeModal={onOpenSubscribeModal}
              onLogoutPhoneAccount={onLogoutPhoneAccount}
            />

            {/* If in iframe (e.g. preview mode), show new tab button */}
            {typeof window !== 'undefined' && window.self !== window.top && (
              <a
                id="btn-open-new-tab-header"
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#5C574F] hover:text-[#1A1A1A] hover:bg-[#F4F1EA] transition-colors border border-[#DCD6CB] bg-[#FAFAF7]"
                title="Ouvrir dans un nouvel onglet autonome (recommandé pour la connexion)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>Nouvel onglet</span>
              </a>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
