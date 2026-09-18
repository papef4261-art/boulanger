import { DailyJournal, AppSettings } from '../types';
import { formatCurrency, formatNumber, formatDateFrench } from './calculations';

/**
 * Formats a clean, readable text synthesis of the daily cash journal
 * suitable for SMS, Google Messages, WhatsApp, or Email bodies.
 */
export function generateSynthesisText(
  journal: DailyJournal,
  settings: AppSettings
): string {
  const currency = settings.currency || 'CFA';
  const { summary } = journal;
  const dateFormatted = formatDateFrench(journal.date);

  const lines: string[] = [
    `📊 SYNTHÈSE JOURNALIÈRE DE CAISSE`,
    `🏢 ${settings.businessName || 'Boulangerie & Commerce'}`,
    `📅 Date : ${dateFormatted}`,
    `────────────────────────────────`,
    `📦 Total Produit Confié : ${formatNumber(summary.totalProducedOrGiven)}`,
    `💰 Prix Vente : ${formatCurrency(summary.grossRevenue, currency)} (${formatNumber(summary.totalSold)} vendus)`,
    `🔄 Prix Retour : ${formatCurrency(summary.returnPriceTotal, currency)} (${formatNumber(summary.totalReturned)} retours)`,
    `⚠️ Perte sur Retours : ${formatCurrency(summary.returnLossAmount, currency)}`,
  ];

  if (summary.totalLost && summary.totalLost > 0) {
    lines.push(`❌ Pains Manquants : ${formatNumber(summary.totalLost)} (-${formatCurrency(summary.missingLossAmount || 0, currency)})`);
  }

  if (summary.totalExpenses > 0) {
    lines.push(`🧾 Dépenses Annexes : ${formatCurrency(summary.totalExpenses, currency)}`);
  }

  lines.push(
    `────────────────────────────────`,
    `✅ GAGNÉ NET : ${formatCurrency(summary.netGain, currency)}`,
    `────────────────────────────────`
  );

  if (journal.expenses && journal.expenses.length > 0) {
    lines.push(``, `🧾 DÉTAIL DES DÉPENSES :`);
    journal.expenses.forEach((exp) => {
      lines.push(`• ${exp.label} : ${formatCurrency(exp.amount, currency)}`);
    });
  }

  if (journal.notes && journal.notes.trim()) {
    lines.push(``, `📝 Notes : ${journal.notes.trim()}`);
  }

  lines.push(``, `*Généré automatiquement par le Journal de Caisse*`);

  return lines.join('\n');
}

/**
 * Generates an email subject for the daily cash journal synthesis.
 */
export function generateSynthesisSubject(
  journal: DailyJournal,
  settings: AppSettings
): string {
  const currency = settings.currency || 'CFA';
  return `[Synthèse Caisse] ${journal.date} - Gain Net : ${formatCurrency(journal.summary.netGain, currency)} - ${settings.businessName || 'Boulangerie'}`;
}

/**
 * Direct link to Gmail web compose with pre-filled To, Subject, and Body.
 */
export function getGmailComposeUrl(
  recipientEmail: string,
  subject: string,
  body: string
): string {
  const encodedTo = encodeURIComponent(recipientEmail.trim());
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Direct mailto URL for default system email clients.
 */
export function getMailtoUrl(
  recipientEmail: string,
  subject: string,
  body: string
): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${recipientEmail.trim()}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Direct SMS URL for Messages on iOS and Android.
 */
export function getSmsUrl(phoneNumber: string, body: string): string {
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^\d+]/g, '') : '';
  const encodedBody = encodeURIComponent(body);
  const isApple = typeof navigator !== 'undefined' && /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
  const separator = isApple ? '&' : '?';
  return cleanPhone ? `sms:${cleanPhone}${separator}body=${encodedBody}` : `sms:${separator}body=${encodedBody}`;
}

/**
 * Direct WhatsApp URL.
 */
export function getWhatsAppUrl(phoneNumber: string, body: string): string {
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^\d]/g, '') : '';
  const encodedBody = encodeURIComponent(body);
  return cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedBody}`
    : `https://api.whatsapp.com/send?text=${encodedBody}`;
}
