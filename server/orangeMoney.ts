interface CreateOrangeMoneyParams {
  amount: number;
  currency: string;
  transactionId: string;
  userId: string;
  userEmail?: string;
  appUrl: string;
}

interface OMTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: string;
}

interface OMWebPaymentResponse {
  status: number;
  message: string;
  pay_token: string;
  payment_url: string;
  notif_token: string;
}

interface OMStatusResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  message?: string;
  order_id?: string;
  amount?: number;
  txnid?: string;
}

/**
 * Returns true if Orange Money credentials are configured
 */
export function isOrangeMoneyConfigured(): boolean {
  return Boolean(
    process.env.ORANGE_MONEY_CLIENT_ID && 
    process.env.ORANGE_MONEY_CLIENT_SECRET && 
    process.env.ORANGE_MONEY_MERCHANT_KEY
  );
}

/**
 * Get OAuth2 Access Token from Orange Developer
 */
async function getOrangeOAuthToken(): Promise<string> {
  const clientId = process.env.ORANGE_MONEY_CLIENT_ID?.trim();
  const clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Identifiants Orange Money (Client ID / Client Secret) manquants.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.orange.com/oauth/v3/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Échec authentification Orange Developer (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as OMTokenResponse;
  return data.access_token;
}

/**
 * Create an Orange Money Web Payment session
 * Official documentation: https://developer.orange.com/apis/om-webpay/
 */
export async function createOrangeMoneyPayment(
  params: CreateOrangeMoneyParams
): Promise<{ success: boolean; payToken?: string; paymentUrl?: string; error?: string; isSandboxFallback?: boolean }> {
  const isSandbox = process.env.PAYMENT_MODE === 'sandbox' || !isOrangeMoneyConfigured();
  const merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY?.trim();

  // If credentials exist, call Orange API
  if (isOrangeMoneyConfigured() && merchantKey) {
    try {
      const accessToken = await getOrangeOAuthToken();
      const endpoint = isSandbox
        ? 'https://api.orange.com/orange-money-webpay/dev/v1/webpayment'
        : 'https://api.orange.com/orange-money-webpay/sn/v1/webpayment';

      const returnUrl = `${params.appUrl}?payment_status=return&provider=orange_money&order_id=${params.transactionId}`;
      const cancelUrl = `${params.appUrl}?payment_status=cancelled&provider=orange_money&order_id=${params.transactionId}`;
      const notifUrl = `${params.appUrl}/api/subscription/webhook/orange-money`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          merchant_key: merchantKey,
          currency: isSandbox ? 'OUV' : (params.currency || 'XOF'),
          order_id: params.transactionId,
          amount: params.amount,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          notif_url: notifUrl,
          lang: 'fr',
          reference: 'Abonnement Premium 1 Mois - Journal de Caisse'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Orange Money API Error]', response.status, errText);
        return {
          success: false,
          error: `Erreur Orange Money API (${response.status}): ${errText}`
        };
      }

      const data = (await response.json()) as OMWebPaymentResponse;
      return {
        success: true,
        payToken: data.pay_token,
        paymentUrl: data.payment_url,
        isSandboxFallback: false
      };
    } catch (error: any) {
      console.error('[Orange Money Exception]', error);
      return {
        success: false,
        error: `Erreur de connexion avec l'API Orange Money: ${error.message}`
      };
    }
  }

  // If in SANDBOX mode and no Orange Money keys configured yet
  if (isSandbox) {
    const sandboxPayToken = `om_sandbox_${params.transactionId}_${Date.now()}`;
    const sandboxUrl = `${params.appUrl}?sandbox_prompt=orange_money&tx_id=${params.transactionId}&pay_token=${sandboxPayToken}&amount=${params.amount}&provider=orange_money`;
    
    return {
      success: true,
      payToken: sandboxPayToken,
      paymentUrl: sandboxUrl,
      isSandboxFallback: true
    };
  }

  return {
    success: false,
    error: "Identifiants Orange Money non configurés (ORANGE_MONEY_CLIENT_ID, ORANGE_MONEY_CLIENT_SECRET, ORANGE_MONEY_MERCHANT_KEY)."
  };
}

/**
 * Verify status of an Orange Money transaction
 */
export async function verifyOrangeMoneyPayment(
  orderId: string,
  payToken?: string,
  amount: number = 5000
): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'EXPIRED' | 'CANCELLED'; error?: string }> {
  // If this was a sandbox fallback
  if (payToken && payToken.startsWith('om_sandbox_')) {
    return {
      success: true,
      status: 'SUCCESS'
    };
  }

  if (!isOrangeMoneyConfigured() || !payToken) {
    return {
      success: false,
      status: 'FAILED',
      error: "Identifiants Orange Money manquants ou jeton de paiement introuvable."
    };
  }

  try {
    const isSandbox = process.env.PAYMENT_MODE === 'sandbox';
    const accessToken = await getOrangeOAuthToken();
    const endpoint = isSandbox
      ? 'https://api.orange.com/orange-money-webpay/dev/v1/transactionstatus'
      : 'https://api.orange.com/orange-money-webpay/sn/v1/transactionstatus';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderId,
        amount,
        pay_token: payToken
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        status: 'FAILED',
        error: `Erreur statut Orange Money (${response.status}): ${errText}`
      };
    }

    const data = (await response.json()) as OMStatusResponse;
    return {
      success: true,
      status: data.status
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'FAILED',
      error: `Erreur vérification Orange Money: ${error.message}`
    };
  }
}
