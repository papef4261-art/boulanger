import { UserSubscription, PaymentTransaction, PaymentConfig, PhoneAccount } from '../types';

export interface SubscriptionStatusResponse {
  isPremium: boolean;
  subscription: UserSubscription;
  transactions: PaymentTransaction[];
}

export interface AuthPhoneResponse {
  success: boolean;
  message: string;
  user: PhoneAccount;
  subscription: UserSubscription;
}

export interface PayWithPhoneResponse {
  success: boolean;
  message: string;
  subscription: UserSubscription;
  transaction: PaymentTransaction;
}

export interface CheckoutResponse {
  success: boolean;
  transactionId: string;
  provider: 'wave' | 'orange_money';
  sessionId?: string;
  payToken?: string;
  checkoutUrl?: string;
  isSandbox?: boolean;
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  subscription?: UserSubscription;
  transaction?: PaymentTransaction;
  status?: string;
  error?: string;
}

/**
 * Fetch subscription status and payment history for a user from the backend
 */
export async function fetchSubscriptionStatus(userId: string): Promise<SubscriptionStatusResponse> {
  const response = await fetch(`/api/subscription/status?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Erreur serveur (${response.status})`);
  }
  return response.json();
}

/**
 * Fetch server payment configuration (Wave / OM active, sandbox mode, etc.)
 */
export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const response = await fetch('/api/subscription/config');
  if (!response.ok) {
    throw new Error('Impossible de charger la configuration de paiement');
  }
  return response.json();
}

/**
 * Create a new checkout session on the server
 */
export async function createCheckout(
  userId: string,
  userEmail: string | undefined,
  provider: 'wave' | 'orange_money'
): Promise<CheckoutResponse> {
  const response = await fetch('/api/subscription/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userEmail, provider })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de la création du paiement');
  }
  return data;
}

/**
 * Verify payment with backend (which calls Wave / OM API)
 */
export async function verifyPayment(
  transactionId: string,
  sessionId?: string,
  payToken?: string,
  provider?: string
): Promise<VerifyPaymentResponse> {
  const response = await fetch('/api/subscription/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, sessionId, payToken, provider })
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error || 'Paiement non confirmé');
    (err as any).data = data;
    throw err;
  }
  return data;
}

/**
 * User declares payment after transferring 5 000 FCFA to 78 968 16 83
 * Records transaction with status 'pending_verification'
 */
export async function declarePayment(params: {
  userId: string;
  userEmail?: string;
  provider?: 'wave' | 'orange_money' | 'wave_om';
  senderPhone: string;
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; transaction: PaymentTransaction }> {
  const response = await fetch('/api/subscription/declare-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      provider: params.provider || 'wave_om'
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur lors de l'enregistrement de la déclaration");
  }
  return data;
}

/**
 * Fetch pending declarations waiting for verification
 */
export async function fetchPendingDeclarations(): Promise<{ pending: PaymentTransaction[] }> {
  const response = await fetch('/api/subscription/pending-declarations');
  if (!response.ok) {
    throw new Error("Impossible de charger les déclarations en attente");
  }
  return response.json();
}

/**
 * Merchant / Admin verifies and approves or rejects a declaration
 */
export async function verifyDeclaration(params: {
  transactionId: string;
  action: 'approve' | 'reject';
  adminPin?: string;
  note?: string;
}): Promise<{ success: boolean; message: string; subscription?: UserSubscription; transaction?: PaymentTransaction }> {
  const response = await fetch('/api/subscription/verify-declaration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur lors de la vérification");
  }
  return data;
}

/**
 * Trigger controlled sandbox testing scenarios on backend
 */
export async function triggerSandboxSimulation(
  transactionId: string,
  outcome: 'success' | 'cancelled' | 'refused' | 'expired' | 'network_error' | 'already_used'
): Promise<any> {
  const response = await fetch('/api/subscription/sandbox-simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, outcome })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur simulation sandbox');
  }
  return data;
}

/**
 * Register account with phone number and PIN (grants 7-day free trial)
 */
export async function registerPhoneAccount(
  phoneNumber: string,
  pin: string,
  displayName?: string
): Promise<AuthPhoneResponse> {
  const response = await fetch('/api/subscription/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, pin, displayName })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de la création du compte');
  }
  return data;
}

/**
 * Login with phone number and PIN
 */
export async function loginPhoneAccount(
  phoneNumber: string,
  pin: string
): Promise<AuthPhoneResponse> {
  const response = await fetch('/api/subscription/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, pin })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de la connexion');
  }
  return data;
}

/**
 * Fetch current phone account details and subscription
 */
export async function fetchPhoneAccount(userId: string): Promise<{ user: PhoneAccount | null; subscription: UserSubscription }> {
  const response = await fetch(`/api/subscription/auth/me?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error('Impossible de charger les données du compte');
  }
  return response.json();
}

/**
 * Pay with Wave or Orange Money using phone number
 * Automatically activates 1-month Premium subscription upon confirmation
 */
export async function payWithPhone(params: {
  userId: string;
  phoneNumber: string;
  provider: 'wave' | 'orange_money';
  paymentReference?: string;
  notes?: string;
}): Promise<PayWithPhoneResponse> {
  const response = await fetch('/api/subscription/pay-with-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur lors de l'activation du paiement");
  }
  return data;
}

