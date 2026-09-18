import { Router, Request, Response } from 'express';
import { 
  getUserSubscription, 
  getUserTransactions, 
  createTransaction, 
  getTransaction, 
  updateTransaction, 
  activateSubscriptionForTransaction,
  getTransactionByProviderRef,
  getPendingVerificationTransactions,
  verifyAndApproveManualPayment,
  rejectManualPayment,
  registerPhoneUser,
  loginPhoneUser,
  getPhoneUser,
  activateAutomaticPhonePayment,
  normalizePhoneNumber
} from './db';
import { 
  createWaveCheckoutSession, 
  verifyWaveCheckoutSession, 
  isWaveConfigured, 
  verifyWaveWebhookSignature 
} from './wave';
import { 
  createOrangeMoneyPayment, 
  verifyOrangeMoneyPayment, 
  isOrangeMoneyConfigured 
} from './orangeMoney';

export const subscriptionRouter = Router();

// Constant configuration
const SUBSCRIPTION_PRICE = 5000;
const SUBSCRIPTION_CURRENCY = 'XOF'; // FCFA BCEAO
const MERCHANT_PHONE = '78 968 16 83'; // Numéro officiel de réception Wave / Orange Money
const TRIAL_DURATION_DAYS = 7; // 7 jours d'essai gratuit pour chaque nouvel utilisateur

/**
 * Helper to get the canonical base URL of the app
 */
function getAppUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

/**
 * GET /api/subscription/config
 * Returns public configuration and integration status (WITHOUT exposing secrets)
 */
subscriptionRouter.get('/config', (req: Request, res: Response) => {
  const appUrl = getAppUrl(req);
  const paymentMode = process.env.PAYMENT_MODE === 'production' ? 'production' : 'sandbox';

  res.json({
    plan: {
      id: 'premium_monthly',
      name: 'Premium',
      price: SUBSCRIPTION_PRICE,
      currency: 'FCFA',
      currencyCode: SUBSCRIPTION_CURRENCY,
      durationDays: 30,
      trialDurationDays: TRIAL_DURATION_DAYS,
      merchantPhone: MERCHANT_PHONE,
      description: 'Accès illimité pendant 1 mois au Journal de Caisse Pro'
    },
    merchantPhone: MERCHANT_PHONE,
    paymentMode,
    isWaveConfigured: isWaveConfigured(),
    isOrangeMoneyConfigured: isOrangeMoneyConfigured(),
    webhooks: {
      wave: `${appUrl}/api/subscription/webhook/wave`,
      orangeMoney: `${appUrl}/api/subscription/webhook/orange-money`
    }
  });
});

/**
 * GET /api/subscription/status
 * Get current subscription & transaction history for a user
 * Automatically provisions 7-day free trial on first visit (granted only once)
 */
subscriptionRouter.get('/status', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const userEmail = req.query.userEmail as string | undefined;

  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(400).json({ error: "Identifiant utilisateur (userId) manquant." });
  }

  const subscription = getUserSubscription(userId.trim(), userEmail);
  const transactions = getUserTransactions(userId.trim());

  // Active if paid 'active', or in 'trial' with days remaining
  const isPremium = subscription.status === 'active' || (subscription.status === 'trial' && (subscription.trialDaysRemaining ?? 0) > 0);

  res.json({
    isPremium,
    subscription,
    transactions
  });
});

/**
 * POST /api/subscription/auth/register
 * Create an account using a phone number with automatic 7-day free trial.
 */
subscriptionRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { phoneNumber, pin, displayName } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ error: "Le numéro de téléphone est obligatoire." });
    }

    if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
      return res.status(400).json({ error: "Le code PIN secret doit comporter au moins 4 chiffres." });
    }

    const result = registerPhoneUser(phoneNumber, pin, displayName);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Compte créé avec succès ! Vous bénéficiez de 7 jours d'essai gratuit.",
      user: result.user ? { ...result.user, userId: result.user.id } : undefined,
      subscription: result.subscription
    });
  } catch (error: any) {
    console.error('[Auth Register Error]', error);
    res.status(500).json({ error: `Erreur serveur : ${error.message}` });
  }
});

/**
 * POST /api/subscription/auth/login
 * Log in using phone number and PIN.
 */
subscriptionRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ error: "Le numéro de téléphone est obligatoire." });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: "Le code PIN est obligatoire." });
    }

    const result = loginPhoneUser(phoneNumber, pin);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Connexion réussie.",
      user: result.user ? { ...result.user, userId: result.user.id } : undefined,
      subscription: result.subscription
    });
  } catch (error: any) {
    console.error('[Auth Login Error]', error);
    res.status(500).json({ error: `Erreur serveur : ${error.message}` });
  }
});

/**
 * GET /api/subscription/auth/me
 * Get current phone user account and subscription status.
 */
subscriptionRouter.get('/auth/me', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: "Identifiant userId manquant." });
    }

    const user = getPhoneUser(userId.trim());
    const subscription = getUserSubscription(userId.trim());

    res.json({
      user: user ? { ...user, userId: user.id } : null,
      subscription
    });
  } catch (error: any) {
    console.error('[Auth Me Error]', error);
    res.status(500).json({ error: `Erreur serveur : ${error.message}` });
  }
});

/**
 * POST /api/subscription/pay-with-phone
 * Pay via Wave or Orange Money using user phone number.
 * Automatically activates 1-month (30-day) Premium subscription upon confirmation.
 */
subscriptionRouter.post('/pay-with-phone', async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber, provider, paymentReference, notes } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: "Identifiant utilisateur (userId) manquant." });
    }

    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length < 7) {
      return res.status(400).json({ error: "Veuillez renseigner votre numéro de téléphone (ex: 77 123 45 67)." });
    }

    if (provider !== 'wave' && provider !== 'orange_money') {
      return res.status(400).json({ error: "Moyen de paiement invalide. Choisissez 'wave' ou 'orange_money'." });
    }

    // Automatically activate subscription for 1 month
    const result = activateAutomaticPhonePayment({
      userId: userId.trim(),
      phoneNumber: phoneNumber.trim(),
      provider,
      amount: SUBSCRIPTION_PRICE,
      paymentReference,
      notes
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const providerLabel = provider === 'wave' ? 'Wave' : 'Orange Money';
    res.json({
      success: true,
      message: `Paiement ${providerLabel} validé avec succès ! Votre abonnement Premium de 5 000 FCFA est automatiquement activé pour 1 mois (30 jours).`,
      subscription: result.subscription,
      transaction: result.transaction
    });
  } catch (error: any) {
    console.error('[Pay With Phone Error]', error);
    res.status(500).json({ error: `Erreur serveur lors de l'activation : ${error.message}` });
  }
});


/**
 * POST /api/subscription/declare-payment
 * User submits declaration after transferring 5 000 FCFA to 78 968 16 83
 * CRITICAL: Clicking "J'ai effectué le paiement" NEVER automatically grants Premium!
 * It registers a transaction in 'pending_verification' status for operator verification.
 */
subscriptionRouter.post('/declare-payment', (req: Request, res: Response) => {
  try {
    const { userId, userEmail, provider, senderPhone, paymentReference, notes } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: "Identifiant utilisateur (userId) requis." });
    }

    if (provider && provider !== 'wave' && provider !== 'orange_money' && provider !== 'wave_om') {
      return res.status(400).json({ error: "Opérateur invalide." });
    }

    const resolvedMethod = (provider === 'wave' || provider === 'orange_money') ? provider : 'wave_om';

    if (!senderPhone || typeof senderPhone !== 'string' || senderPhone.trim().length < 7) {
      return res.status(400).json({ 
        error: "Veuillez saisir votre numéro de téléphone d'envoi (ex: 77 123 45 67, 78..., 70..., 76...)." 
      });
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tx = createTransaction({
      id: transactionId,
      userId: userId.trim(),
      userEmail: userEmail ? String(userEmail).trim() : undefined,
      amount: SUBSCRIPTION_PRICE,
      currency: SUBSCRIPTION_CURRENCY,
      paymentMethod: resolvedMethod,
      targetPhone: MERCHANT_PHONE,
      senderPhone: senderPhone.trim(),
      paymentReference: paymentReference ? String(paymentReference).trim() : undefined,
      verificationNote: notes ? String(notes).trim() : undefined,
      status: 'pending_verification'
    });

    console.log(`[Payment Declaration] Tx ${transactionId} received from ${senderPhone} for 78 968 16 83 (${provider})`);

    return res.json({
      success: true,
      message: "Votre déclaration de paiement a bien été enregistrée. Elle est en cours de vérification. L'accès Premium sera activé dès validation.",
      transaction: tx
    });
  } catch (err: any) {
    console.error('[Declare Payment Error]', err);
    res.status(500).json({ error: `Erreur lors de l'enregistrement de la déclaration: ${err.message}` });
  }
});

/**
 * GET /api/subscription/pending-declarations
 * Returns list of declarations waiting for merchant verification
 */
subscriptionRouter.get('/pending-declarations', (req: Request, res: Response) => {
  const pending = getPendingVerificationTransactions();
  res.json({ pending });
});

/**
 * POST /api/subscription/verify-declaration
 * Merchant / Admin verifies and approves or rejects a declaration
 * Approving activates 1 month (30 days) of Premium
 */
subscriptionRouter.post('/verify-declaration', (req: Request, res: Response) => {
  try {
    const { transactionId, action, adminPin, note } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Identifiant transactionId manquant." });
    }

    const tx = getTransaction(transactionId);
    if (!tx) {
      return res.status(404).json({ error: "Transaction introuvable." });
    }

    if (action === 'approve') {
      const result = verifyAndApproveManualPayment(
        transactionId,
        adminPin ? `Marchand (${MERCHANT_PHONE})` : 'Vérificateur',
        note || `Transfert vérifié sur le ${MERCHANT_PHONE}`
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: "Paiement validé avec succès ! L'abonnement Premium a été activé pour 1 mois (30 jours).",
        subscription: result.subscription,
        transaction: result.transaction
      });
    }

    if (action === 'reject') {
      const result = rejectManualPayment(
        transactionId,
        note || `Aucun transfert correspondant de ${SUBSCRIPTION_PRICE} FCFA reçu sur le ${MERCHANT_PHONE}`
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: "Déclaration de paiement rejetée.",
        transaction: result.transaction
      });
    }

    return res.status(400).json({ error: "Action invalide. Utilisez 'approve' ou 'reject'." });
  } catch (err: any) {
    console.error('[Verify Declaration Error]', err);
    res.status(500).json({ error: `Erreur lors du traitement: ${err.message}` });
  }
});

/**
 * POST /api/subscription/create-checkout
 * Initiates payment session with Wave or Orange Money
 */
subscriptionRouter.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, provider } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: "Identifiant utilisateur (userId) obligatoire." });
    }

    if (provider !== 'wave' && provider !== 'orange_money') {
      return res.status(400).json({ 
        error: "Moyen de paiement invalide. Choisissez 'wave' ou 'orange_money'." 
      });
    }

    const appUrl = getAppUrl(req);
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create pending transaction in server DB
    const tx = createTransaction({
      id: transactionId,
      userId: userId.trim(),
      userEmail: userEmail ? String(userEmail).trim() : undefined,
      amount: SUBSCRIPTION_PRICE,
      currency: SUBSCRIPTION_CURRENCY,
      paymentMethod: provider,
      status: 'pending'
    });

    if (provider === 'wave') {
      const result = await createWaveCheckoutSession({
        amount: SUBSCRIPTION_PRICE,
        currency: SUBSCRIPTION_CURRENCY,
        transactionId,
        userId: userId.trim(),
        userEmail,
        appUrl
      });

      if (!result.success) {
        updateTransaction(transactionId, { 
          status: 'failed', 
          errorMessage: result.error 
        });
        return res.status(400).json({ error: result.error });
      }

      updateTransaction(transactionId, {
        providerReference: result.sessionId,
        checkoutUrl: result.checkoutUrl
      });

      return res.json({
        success: true,
        transactionId,
        provider: 'wave',
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
        isSandbox: Boolean(result.isSandboxFallback)
      });
    }

    if (provider === 'orange_money') {
      const result = await createOrangeMoneyPayment({
        amount: SUBSCRIPTION_PRICE,
        currency: SUBSCRIPTION_CURRENCY,
        transactionId,
        userId: userId.trim(),
        userEmail,
        appUrl
      });

      if (!result.success) {
        updateTransaction(transactionId, { 
          status: 'failed', 
          errorMessage: result.error 
        });
        return res.status(400).json({ error: result.error });
      }

      updateTransaction(transactionId, {
        providerReference: result.payToken,
        checkoutUrl: result.paymentUrl
      });

      return res.json({
        success: true,
        transactionId,
        provider: 'orange_money',
        payToken: result.payToken,
        checkoutUrl: result.paymentUrl,
        isSandbox: Boolean(result.isSandboxFallback)
      });
    }

  } catch (error: any) {
    console.error('[Create Checkout Error]', error);
    res.status(500).json({ error: `Erreur interne lors de la création du paiement: ${error.message}` });
  }
});

/**
 * POST /api/subscription/verify-payment
 * Verifies real payment with provider, guards against replay attacks, and activates 1-month Premium
 */
subscriptionRouter.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const { transactionId, sessionId, payToken, provider } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Identifiant de transaction (transactionId) manquant." });
    }

    const tx = getTransaction(transactionId);
    if (!tx) {
      return res.status(404).json({ error: "Transaction introuvable sur le serveur." });
    }

    // Check anti-replay defense
    if (tx.isCredited) {
      const sub = getUserSubscription(tx.userId);
      return res.status(400).json({ 
        error: "Cette transaction a déjà été validée et créditée (anti-rejeu).",
        subscription: sub 
      });
    }

    const targetProvider = provider || tx.paymentMethod;

    if (targetProvider === 'wave') {
      const waveSessionId = sessionId || tx.providerReference;
      if (!waveSessionId) {
        return res.status(400).json({ error: "Jeton de session Wave manquant pour vérification." });
      }

      const check = await verifyWaveCheckoutSession(waveSessionId);

      if (!check.success || check.status !== 'complete') {
        if (check.status === 'cancelled') {
          updateTransaction(transactionId, { status: 'cancelled' });
          return res.status(400).json({ error: "Le paiement Wave a été annulé par l'utilisateur.", status: 'cancelled' });
        }
        return res.status(400).json({ 
          error: check.error || `Le paiement Wave n'est pas encore complété (statut: ${check.status}).`,
          status: check.status 
        });
      }

      // Verification passed: mark completed
      updateTransaction(transactionId, { status: 'completed' });

      // Activate 1-month subscription
      const activation = activateSubscriptionForTransaction(transactionId);
      if (!activation.success) {
        return res.status(400).json({ error: activation.error });
      }

      return res.json({
        success: true,
        message: "Paiement Wave vérifié et validé avec succès ! Votre abonnement Premium est actif pour 1 mois.",
        subscription: activation.subscription,
        transaction: getTransaction(transactionId)
      });
    }

    if (targetProvider === 'orange_money') {
      const omPayToken = payToken || tx.providerReference;
      const check = await verifyOrangeMoneyPayment(transactionId, omPayToken, tx.amount);

      if (!check.success || check.status !== 'SUCCESS') {
        if (check.status === 'CANCELLED') {
          updateTransaction(transactionId, { status: 'cancelled' });
          return res.status(400).json({ error: "Le paiement Orange Money a été annulé.", status: 'CANCELLED' });
        }
        if (check.status === 'FAILED' || check.status === 'EXPIRED') {
          updateTransaction(transactionId, { status: 'failed' });
          return res.status(400).json({ error: "Le paiement Orange Money a échoué ou a expiré.", status: check.status });
        }
        return res.status(400).json({ 
          error: check.error || `Paiement Orange Money en cours ou non confirmé (statut: ${check.status}).`,
          status: check.status 
        });
      }

      // Verification passed
      updateTransaction(transactionId, { status: 'completed' });

      // Activate 1-month subscription
      const activation = activateSubscriptionForTransaction(transactionId);
      if (!activation.success) {
        return res.status(400).json({ error: activation.error });
      }

      return res.json({
        success: true,
        message: "Paiement Orange Money vérifié avec succès ! Votre abonnement Premium est actif pour 1 mois.",
        subscription: activation.subscription,
        transaction: getTransaction(transactionId)
      });
    }

    return res.status(400).json({ error: "Moyen de paiement non pris en charge." });

  } catch (error: any) {
    console.error('[Verify Payment Error]', error);
    res.status(500).json({ error: `Erreur serveur lors de la vérification du paiement: ${error.message}` });
  }
});

/**
 * POST /api/subscription/sandbox-simulate
 * Controlled developer sandbox simulator to test all payment outcomes before going to production
 */
subscriptionRouter.post('/sandbox-simulate', (req: Request, res: Response) => {
  const { transactionId, outcome } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: "Identifiant transactionId manquant." });
  }

  const tx = getTransaction(transactionId);
  if (!tx) {
    return res.status(404).json({ error: "Transaction introuvable." });
  }

  switch (outcome) {
    case 'success': {
      if (tx.isCredited) {
        return res.status(400).json({ error: "Cette transaction a déjà été utilisée (anti-rejeu)." });
      }
      updateTransaction(transactionId, { status: 'completed' });
      const activation = activateSubscriptionForTransaction(transactionId);
      return res.json({
        success: true,
        message: "Simulation SANDBOX réussie : Abonnement 1 mois activé.",
        subscription: activation.subscription,
        transaction: getTransaction(transactionId)
      });
    }

    case 'cancelled': {
      updateTransaction(transactionId, { status: 'cancelled', errorMessage: "Paiement annulé par l'utilisateur." });
      return res.json({
        success: false,
        status: 'cancelled',
        message: "Simulation : Le client a annulé la transaction.",
        transaction: getTransaction(transactionId)
      });
    }

    case 'refused':
    case 'failed': {
      updateTransaction(transactionId, { status: 'failed', errorMessage: "Solde insuffisant ou refus de l'opérateur." });
      return res.json({
        success: false,
        status: 'failed',
        message: "Simulation : Paiement refusé par l'opérateur mobile.",
        transaction: getTransaction(transactionId)
      });
    }

    case 'expired': {
      updateTransaction(transactionId, { status: 'expired', errorMessage: "Délai de validation du paiement dépassé." });
      return res.json({
        success: false,
        status: 'expired',
        message: "Simulation : La session de paiement a expiré.",
        transaction: getTransaction(transactionId)
      });
    }

    case 'network_error': {
      return res.status(503).json({
        success: false,
        error: "Erreur de connexion : Impossible de joindre les serveurs de paiement."
      });
    }

    default:
      return res.status(400).json({ error: "Résultat de simulation non reconnu." });
  }
});

/**
 * POST /api/subscription/webhook/wave
 * Official Wave Webhook Handler
 */
subscriptionRouter.post('/webhook/wave', (req: Request, res: Response) => {
  try {
    const signature = req.get('wave-signature') || req.get('Wave-Signature');
    const secret = process.env.WAVE_WEBHOOK_SECRET?.trim();

    if (secret && signature) {
      const isValid = verifyWaveWebhookSignature(JSON.stringify(req.body), signature, secret);
      if (!isValid) {
        console.warn('[Wave Webhook] Signature invalide rejetée.');
        return res.status(401).json({ error: "Signature Wave invalide." });
      }
    }

    const event = req.body;
    console.log('[Wave Webhook Event]', event?.type);

    if (event?.type === 'checkout.session.completed') {
      const session = event.data;
      const sessionId = session?.id;
      const clientRef = session?.client_reference; // Format: userId:transactionId

      let tx = sessionId ? getTransactionByProviderRef(sessionId) : null;

      if (!tx && clientRef && clientRef.includes(':')) {
        const [, txId] = clientRef.split(':');
        tx = getTransaction(txId);
      }

      if (tx && !tx.isCredited) {
        updateTransaction(tx.id, { status: 'completed' });
        activateSubscriptionForTransaction(tx.id);
        console.log(`[Wave Webhook] Abonnement activé avec succès pour tx ${tx.id}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Wave Webhook Exception]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/subscription/webhook/orange-money
 * Orange Money IPN (Instant Payment Notification)
 */
subscriptionRouter.post('/webhook/orange-money', (req: Request, res: Response) => {
  try {
    const { order_id, status, pay_token } = req.body;
    console.log('[Orange Money Webhook]', order_id, status);

    if (order_id) {
      const tx = getTransaction(order_id);
      if (tx && !tx.isCredited) {
        if (status === 'SUCCESS') {
          updateTransaction(tx.id, { status: 'completed', providerReference: pay_token || tx.providerReference });
          activateSubscriptionForTransaction(tx.id);
          console.log(`[Orange Money Webhook] Abonnement activé avec succès pour tx ${tx.id}`);
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          updateTransaction(tx.id, { status: status === 'CANCELLED' ? 'cancelled' : 'failed' });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Orange Money Webhook Exception]', err);
    res.status(500).json({ error: err.message });
  }
});
