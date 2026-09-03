import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

export interface LlmClassificationResult {
  rootCause: string;
  confidence: number;
  explanation: string;
  source: 'llm_fallback' | 'deterministic_rule';
}

export async function classifyAmbiguousRootCause(
  errorCode: string,
  errorReason: string,
  rawPayload?: string
): Promise<LlmClassificationResult> {
  if (!apiKey) {
    // Standard deterministic fallback if key is missing
    return {
      rootCause: mapErrorReasonToRootCause(errorReason),
      confidence: 0.88,
      explanation: `Rule-based classifier mapped '${errorReason}' to '${mapErrorReasonToRootCause(errorReason)}'.`,
      source: 'deterministic_rule',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert payment failure triage engine for Razorpay checkout transactions.
Analyze the following payment attempt failure:
- Error Code: ${errorCode}
- Error Reason: ${errorReason}
- Raw Payload: ${rawPayload || 'N/A'}

Classify the root cause into EXACTLY ONE of the following 6 buckets:
1. BANK_TIMEOUT (bank server or gateway timeout)
2. CARD_DECLINED (card declined by issuing bank)
3. INSUFFICIENT_FUNDS (insufficient balance in account/card)
4. OTP_AUTH_FAILED (user failed OTP or dropped during auth)
5. USER_CANCELLED (user explicitly closed or cancelled payment modal)
6. RISK_FRAUD (suspected fraud, risk block, or blacklisted card)

Return ONLY valid JSON matching this exact format:
{
  "rootCause": "BANK_TIMEOUT",
  "confidence": 0.95,
  "explanation": "Brief 1-sentence technical reason for this classification"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        rootCause: parsed.rootCause.toLowerCase(),
        confidence: parsed.confidence || 0.9,
        explanation: parsed.explanation || 'Classified via Gemini AI.',
        source: 'llm_fallback',
      };
    }
  } catch (err: any) {
    console.warn(`[Gemini LLM] Fallback triggered due to API notice:`, err.message);
  }

  return {
    rootCause: mapErrorReasonToRootCause(errorReason),
    confidence: 0.85,
    explanation: `Fallback rule classification for '${errorReason}'.`,
    source: 'deterministic_rule',
  };
}

export function mapErrorReasonToRootCause(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes('bank') || lower.includes('timeout') || lower.includes('gateway') || lower.includes('network')) {
    return 'bank_timeout';
  }
  if (lower.includes('decline') || lower.includes('card_declined')) {
    return 'card_declined_by_issuer';
  }
  if (lower.includes('funds') || lower.includes('insufficient')) {
    return 'insufficient_funds';
  }
  if (lower.includes('otp') || lower.includes('auth') || lower.includes('drop')) {
    return 'otp_failed';
  }
  if (lower.includes('cancel') || lower.includes('closed')) {
    return 'user_cancelled';
  }
  if (lower.includes('risk') || lower.includes('fraud') || lower.includes('block')) {
    return 'risk_blocked';
  }
  return 'bank_timeout';
}

export async function generateNudgeCopy(
  customerName: string,
  amountInr: number,
  rootCause: string,
  paymentLinkUrl: string
): Promise<string> {
  const shortName = customerName.split(' ')[0];

  switch (rootCause) {
    case 'card_declined_by_issuer':
      return `Hi ${shortName}, your payment of ₹${amountInr} via card was declined by your bank. Try completing via UPI instantly here: ${paymentLinkUrl} - Recoup Support`;
    case 'otp_failed':
      return `Hi ${shortName}, looks like your OTP verification timed out for ₹${amountInr}. Click here to retry instantly with a fresh session: ${paymentLinkUrl}`;
    case 'insufficient_funds':
      return `Hi ${shortName}, reminder: your order of ₹${amountInr} is reserved. Complete your payment anytime using UPI/Card: ${paymentLinkUrl}`;
    case 'user_cancelled':
      return `Hi ${shortName}, did you run into any issues during payment of ₹${amountInr}? Easily complete your order here: ${paymentLinkUrl}`;
    default:
      return `Hi ${shortName}, complete your payment of ₹${amountInr} securely via Razorpay: ${paymentLinkUrl}`;
  }
}
