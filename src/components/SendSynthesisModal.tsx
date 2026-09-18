import React, { useState, useEffect } from 'react';
import { DailyJournal, AppSettings } from '../types';
import { 
  X, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Smartphone, 
  Save, 
  Sparkles,
  Send
} from 'lucide-react';
import { 
  generateSynthesisText, 
  generateSynthesisSubject, 
  getGmailComposeUrl, 
  getMailtoUrl, 
  getSmsUrl, 
  getWhatsAppUrl 
} from '../utils/summaryMessaging';

interface SendSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: DailyJournal;
  settings: AppSettings;
  onUpdateSettings?: (updatedSettings: AppSettings) => void;
}

export const SendSynthesisModal: React.FC<SendSynthesisModalProps> = ({
  isOpen,
  onClose,
  journal,
  settings,
  onUpdateSettings,
}) => {
  const [email, setEmail] = useState(settings.notificationEmail || 'papef4261@gmail.com');
  const [phone, setPhone] = useState(settings.notificationPhone || '');
  const [autoSend, setAutoSend] = useState(settings.autoSendMessageOnSave !== false);
  const [autoChannel, setAutoChannel] = useState<'gmail' | 'messages' | 'modal'>(settings.autoSendChannel || 'gmail');
  const [copied, setCopied] = useState(false);
  const [savedPreference, setSavedPreference] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  if (!isOpen) return null;

  const subject = generateSynthesisSubject(journal, settings);
  const body = generateSynthesisText(journal, settings);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleOpenGmail = () => {
    const url = getGmailComposeUrl(email, subject, body);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenDefaultMail = () => {
    const url = getMailtoUrl(email, subject, body);
    window.location.href = url;
  };

  const handleOpenSms = () => {
    const url = getSmsUrl(phone, body);
    window.location.href = url;
  };

  const handleOpenWhatsApp = () => {
    const url = getWhatsAppUrl(phone, body);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: subject,
          text: body,
        });
      } catch (e) {
        // User cancelled or share failed
      }
    }
  };

  const handleSaveContactInfo = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        notificationEmail: email.trim(),
        notificationPhone: phone.trim(),
        autoSendMessageOnSave: autoSend,
        autoSendChannel: autoChannel,
      });
      setSavedPreference(true);
      setTimeout(() => setSavedPreference(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-[#FAFAF7] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#DCD6CB] space-y-4 my-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#EBE8E0]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#E7EFEA] border border-[#C3D9CD] text-[#2D5A43]">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] font-editorial">
                  Envoyer la Synthèse de Caisse
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E7EFEA] text-[#2D5A43] border border-[#C3D9CD]">
                  {journal.date}
                </span>
              </div>
              <p className="text-xs text-[#7A756D]">
                Envoyez le rapport complet sur votre compte Gmail ou via Messages (SMS / WhatsApp)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A756D] hover:text-[#1A1A1A] hover:bg-[#EBE8E0] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact info inputs */}
        <div className="bg-[#F4F1EA] rounded-xl p-3.5 border border-[#DCD6CB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider font-editorial">
              Destinataires configurés
            </span>
            {savedPreference ? (
              <span className="text-[11px] font-semibold text-[#2D5A43] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Mémorisé
              </span>
            ) : onUpdateSettings ? (
              <button
                type="button"
                onClick={handleSaveContactInfo}
                className="text-[11px] text-[#2D5A43] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                title="Enregistrer ces coordonnées dans les paramètres de l'application"
              >
                <Save className="w-3 h-3" />
                Mémoriser par défaut
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email / Gmail */}
            <div>
              <label className="block text-xs font-medium text-[#5C574F] mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#C5221F]" />
                <span>Adresse Gmail / Google :</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: papef4261@gmail.com"
                className="w-full text-xs bg-white border border-[#DCD6CB] rounded-lg px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#2D5A43] font-mono"
              />
            </div>

            {/* Phone / Messages */}
            <div>
              <label className="block text-xs font-medium text-[#5C574F] mb-1 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>N° Téléphone (Messages / SMS) :</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ex: +221 77 123 45 67"
                className="w-full text-xs bg-white border border-[#DCD6CB] rounded-lg px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#2D5A43] font-mono"
              />
            </div>
          </div>

          {/* Option d'envoi automatique à l'enregistrement */}
          <div className="pt-2 border-t border-[#E5E0D5]">
            <label className="text-xs text-[#1A1A1A] font-semibold flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="w-4 h-4 text-[#2D5A43] rounded border-[#DCD6CB] focus:ring-[#2D5A43] cursor-pointer"
              />
              <span>Envoi automatique dès qu'on enregistre le journal</span>
            </label>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider font-editorial block">
            Choisir le canal d'envoi :
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Gmail Web */}
            <button
              id="btn-send-to-gmail"
              type="button"
              onClick={handleOpenGmail}
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#FDF2F2] border border-[#F5C2C2] text-[#1A1A1A] transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-[#FDF2F2] text-[#C5221F] group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#1A1A1A]">Ouvrir dans Gmail</div>
                  <div className="text-[11px] text-[#7A756D]">Compte Google ({email.split('@')[0] || 'email'})</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#C5221F]" />
            </button>

            {/* 2. Messages (SMS) */}
            <button
              id="btn-send-to-messages"
              type="button"
              onClick={handleOpenSms}
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#EFF6FF] border border-[#BFDBFE] text-[#1A1A1A] transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#1A1A1A]">Envoyer par Messages</div>
                  <div className="text-[11px] text-[#7A756D]">Application SMS du téléphone</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#2563EB]" />
            </button>

            {/* 3. WhatsApp */}
            <button
              id="btn-send-to-whatsapp"
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#E7EFEA] border border-[#C3D9CD] text-[#1A1A1A] transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-[#E7EFEA] text-[#2D5A43] group-hover:scale-105 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#1A1A1A]">Envoyer sur WhatsApp</div>
                  <div className="text-[11px] text-[#7A756D]">Discussion instantanée</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#2D5A43]" />
            </button>

            {/* 4. Copier dans le presse-papier */}
            <button
              id="btn-copy-synthesis-text"
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#EBE8E0] border border-[#DCD6CB] text-[#1A1A1A] transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-lg transition-transform ${copied ? 'bg-[#2D5A43] text-white' : 'bg-[#EBE8E0] text-[#5C574F]'}`}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#1A1A1A]">
                    {copied ? 'Texte copié !' : 'Copier le message'}
                  </div>
                  <div className="text-[11px] text-[#7A756D]">Pour coller n'importe où</div>
                </div>
              </div>
              {copied ? (
                <span className="text-[11px] font-bold text-[#2D5A43]">✓ Prêt</span>
              ) : (
                <Copy className="w-4 h-4 text-[#7A756D]" />
              )}
            </button>
          </div>

          {/* Additional fallback actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {canShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="text-xs font-semibold text-[#2D5A43] hover:text-[#1B3628] flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-[#E7EFEA] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partager via le menu système (Android / iOS / Mac)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenDefaultMail}
              className="text-[11px] text-[#7A756D] hover:text-[#1A1A1A] underline ml-auto cursor-pointer"
            >
              Ou ouvrir le client e-mail par défaut (Outlook, Apple Mail)
            </button>
          </div>
        </div>

        {/* Message Preview */}
        <div className="space-y-1.5 pt-2 border-t border-[#EBE8E0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7A756D] uppercase tracking-wider font-editorial">
              Aperçu du texte envoyé :
            </span>
            <span className="text-[11px] text-[#7A756D]">
              Formaté pour une lecture rapide
            </span>
          </div>

          <div className="bg-[#262421] text-[#EBE8E0] rounded-xl p-3 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-[#3D3A34] select-all">
            {body}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#1A1A1A] bg-[#EBE8E0] hover:bg-[#DCD6CB] transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
