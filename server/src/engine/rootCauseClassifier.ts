import { classifyAmbiguousRootCause, LlmClassificationResult, mapErrorReasonToRootCause } from '../services/llmService.js';

export interface RootCauseClassification {
  rootCause: string;
  classifierSource: 'deterministic_rule' | 'llm_fallback';
  confidence: number;
  explanation: string;
}

/**
 * Step 1: Root Cause Classifier Engine
 * Deterministic mapping for standard Razorpay error codes/reasons,
 * falling back to Gemini LLM for free-text or ambiguous reasons.
 */
export async function classifyTransactionRootCause(
  errorCode: string,
  errorReason: string
): Promise<RootCauseClassification> {
  const normalizedReason = errorReason.toLowerCase();

  // Known deterministic Razorpay taxonomy mappings
  const knownMap: Record<string, string> = {
    bank_timeout: 'bank_timeout',
    gateway_error: 'bank_timeout',
    server_error: 'bank_timeout',
    network_drop: 'bank_timeout',
    card_declined_by_issuer: 'card_declined_by_issuer',
    card_declined: 'card_declined_by_issuer',
    insufficient_funds: 'insufficient_funds',
    otp_failed: 'otp_failed',
    auth_timeout: 'otp_failed',
    user_cancelled: 'user_cancelled',
    risk_blocked: 'risk_blocked',
  };

  if (knownMap[normalizedReason]) {
    const rootCause = knownMap[normalizedReason];
    return {
      rootCause,
      classifierSource: 'deterministic_rule',
      confidence: 1.0,
      explanation: `Deterministic taxonomy rule matched Razorpay error_reason '${errorReason}' -> '${rootCause}'.`,
    };
  }

  // Fallback to LLM Triage for free-text or custom gateway codes
  const llmResult: LlmClassificationResult = await classifyAmbiguousRootCause(errorCode, errorReason);
  return {
    rootCause: llmResult.rootCause,
    classifierSource: llmResult.source,
    confidence: llmResult.confidence,
    explanation: llmResult.explanation,
  };
}
