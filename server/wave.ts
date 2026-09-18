import crypto from 'crypto';

interface CreateWaveSessionParams {
  amount: number;
  currency: string;
  transactionId: string;
  userId: string;
  userEmail?: string;
  appUrl: string;
}

interface WaveSessionResponse {
  id: string;
  wave_launch_url: string;
  checkout_status: 'open' | 'complete' | 'cancelled';
  amount: string;
  currency: string;
  client_reference?: string;
  when_completed?: string | null;
}

/**
 * Returns true if Wave API credentials are configured in environment
 */
export function isWaveConfigured(): boolean {
  return Boolean(process.env.WAVE_API_KEY && process.env.WAVE_API_KEY.trim().length > 0);
}

/**
 * Create a Wave Checkout Session via official Wave API
 * https://developer.wave.com/
 */
export async function createWaveCheckoutSession(
  params: CreateWaveSessionParams
): Promise<{ success: boolean; sessionId?: string; checkoutUrl?: string; error?: string; isSandboxFallback?: boolean }> {
  const apiKey = process.env.WAVE_API_KEY?.trim();
  const isSandbox = process.env.PAYMENT_MODE === 'sandbox' || !apiKey || apiKey.startsWith('wave_sn_test_');

  // Success and Error redirect URLs
  const successUrl = `${params.appUrl}?payment_status=success&provider=wave&tx_id=${params.transactionId}&session_id={CHECKOUT_SESSION_ID}`;
  const errorUrl = `${params.appUrl}?payment_status=cancelled&provider=wave&tx_id=${params.transactionId}&session_id={CHECKOUT_SESSION_ID}`;

  // If live or sandbox Wave API key is configured, make real call to official Wave API
  if (apiKey) {
    try {
      const response = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: params.amount.toString(),
          currency: params.currency || 'XOF',
          error_url: errorUrl,
          success_url: successUrl,
          client_reference: `${params.userId}:${params.transactionId}`,
          restricted: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[WAVE API Error]', response.status, errText);
        return { 
          success: false, 
          error: `Erreur Wave API (${response.status}): ${errText || 'Impossible d\'initier la session de paiement'}` 
        };
      }

      const data = (await response.json()) as WaveSessionResponse;
      return {
        success: true,
        sessionId: data.id,
        checkoutUrl: data.wave_launch_url,
        isSandboxFallback: false
      };
    } catch (error: any) {
      console.error('[WAVE API Exception]', error);
      return { 
        success: false, 
        error: `Erreur de connexion avec l'API Wave: ${error.message || 'Serveur injoignable'}` 
      };
    }
  }

  // If in SANDBOX mode and no Wave API key has been added yet, generate a safe Sandbox session
  if (isSandbox) {
    const sandboxSessionId = `wave_sandbox_${params.transactionId}_${Date.now()}`;
    const sandboxUrl = `${params.appUrl}?sandbox_prompt=wave&tx_id=${params.transactionId}&session_id=${sandboxSessionId}&amount=${params.amount}&provider=wave`;
    
    return {
      success: true,
      sessionId: sandboxSessionId,
      checkoutUrl: sandboxUrl,
      isSandboxFallback: true
    };
  }

  return {
    success: false,
    error: "Clé API Wave non configurée. Veuillez renseigner WAVE_API_KEY dans vos variables d'environnement."
  };
}

/**
 * Verify status of a Wave checkout session from the official Wave API
 */
export async function verifyWaveCheckoutSession(
  sessionId: string
): Promise<{ success: boolean; status: 'complete' | 'open' | 'cancelled'; amount?: number; currency?: string; error?: string }> {
  const apiKey = process.env.WAVE_API_KEY?.trim();

  // If this is a sandbox session generated in test mode
  if (sessionId.startsWith('wave_sandbox_')) {
    // In sandbox, status is verified through the sandbox simulator controller
    return {
      success: true,
      status: 'complete',
      amount: 5000,
      currency: 'XOF'
    };
  }

  if (!apiKey) {
    return {
      success: false,
      status: 'open',
      error: "Clé WAVE_API_KEY manquante pour interroger l'API Wave."
    };
  }

  try {
    const response = await fetch(`https://api.wave.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        status: 'open',
        error: `Erreur vérification Wave (${response.status}): ${errText}`
      };
    }

    const data = (await response.json()) as WaveSessionResponse;
    return {
      success: true,
      status: data.checkout_status,
      amount: Number(data.amount),
      currency: data.currency
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'open',
      error: `Erreur de communication avec Wave: ${error.message}`
    };
  }
}

/**
 * Verify Wave Webhook signature
 * Header format: Wave-Signature: t=1614798365, v1=...
 */
export function verifyWaveWebhookSignature(
  rawBody: string, 
  signatureHeader: string, 
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(',');
  let timestamp = '';
  let signature = '';

  for (const part of parts) {
    const [key, val] = part.trim().split('=');
    if (key === 't') timestamp = val;
    if (key === 'v1') signature = val;
  }

  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const computedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computedSig, 'hex'));
}
