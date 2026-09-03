import { prisma } from '../db/client.js';
import { createAuditRecord } from './auditLogger.js';

export interface FraudGateCheckResult {
  isFraudExcluded: boolean;
  explanation?: string;
}

/**
 * Step 0: Hard Fraud Exclusion Gate
 * Runs BEFORE root-cause classification or policy engine evaluation.
 * If isFlaggedFraud === true:
 * - Updates Transaction status = 'FRAUD_EXCLUDED'
 * - Appends audit record with outcome = 'FRAUD_EXCLUDED'
 * - Returns isFraudExcluded: true to short-circuit pipeline.
 */
export async function evaluateHardFraudGate(transactionId: string): Promise<FraudGateCheckResult> {
  const transaction = await prisma.transaction.findUnique({
    where: { transactionId },
  });

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  if (transaction.isFlaggedFraud) {
    const explanation = `[HARD FRAUD GATE] Transaction flagged for fraud/risk block. Excluded at Step 0 before root-cause or policy engine. Zero contact permitted.`;

    await prisma.transaction.update({
      where: { transactionId },
      data: {
        status: 'FRAUD_EXCLUDED',
        attemptsCount: 0,
      },
    });

    await createAuditRecord({
      transactionId,
      detectedSignal: 'payment.failed (risk_flagged)',
      rootCause: 'risk_blocked',
      classifierSource: 'fraud_gate',
      confidence: 1.0,
      policyRuleFired: 'hard_fraud_exclusion_gate',
      actionTaken: 'no_action_fraud_excluded',
      apiCall: undefined,
      apiResponseStatus: 'blocked_by_guardrail',
      outcome: 'FRAUD_EXCLUDED',
      amountRecoveredInr: 0,
      explanation,
    });

    return {
      isFraudExcluded: true,
      explanation,
    };
  }

  return {
    isFraudExcluded: false,
  };
}
