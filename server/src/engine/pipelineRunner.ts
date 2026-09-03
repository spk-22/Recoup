import { prisma } from '../db/client.js';
import { evaluateHardFraudGate, evaluateHardFraudGateCheck } from './fraudGate.js';
import { classifyTransactionRootCause } from './rootCauseClassifier.js';
import { evaluatePolicyMatrix } from './policyEngine.js';
import { executeRazorpayRetryOrder, createRazorpayPaymentLink } from '../services/razorpayService.js';
import { simulateCustomerResponse } from '../services/customerResponseSimulator.js';
import { generateNudgeCopy } from '../services/llmService.js';
import { sendOrScheduleNudge } from '../services/notificationService.js';
import { createAuditRecord, computeAuditHash } from './auditLogger.js';
import crypto from 'crypto';

export interface ProcessTransactionResult {
  transactionId: string;
  status: string;
  actionTaken: string;
  outcome: 'RECOVERED' | 'PENDING' | 'EXCEPTION' | 'FRAUD_EXCLUDED';
  recoveredAmountInr: number;
  explanation: string;
}

// ─── Internal: Computed result from pure business logic (no DB writes yet) ───
interface ComputedTxnResult {
  transactionId: string;
  outcome: 'RECOVERED' | 'PENDING' | 'EXCEPTION' | 'FRAUD_EXCLUDED';
  status: string;
  actionTaken: string;
  recoveredAmountInr: number;
  explanation: string;
  attemptsCount: number;
  razorpayOrderId?: string;
  razorpayPaymentLinkId?: string;
  razorpayPaymentLinkUrl?: string;
  // Audit record fields (written later in batch)
  auditParams: {
    detectedSignal: string;
    rootCause: string;
    classifierSource: string;
    confidence: number;
    policyRuleFired: string;
    actionTaken: string;
    apiCall?: string;
    apiResponseStatus?: string;
    outcome: 'RECOVERED' | 'PENDING' | 'EXCEPTION' | 'FRAUD_EXCLUDED';
    amountRecoveredInr: number;
    explanation: string;
    metadata?: Record<string, any>;
  };
  // Nudge record fields (written later in batch)
  nudgeParams?: {
    channel: string;
    recipient: string;
    messageBody: string;
    scheduledFor: Date;
  };
}

/**
 * Pure compute: runs all business logic for a single transaction WITHOUT any DB writes.
 * Returns a ComputedTxnResult that can be batch-written later.
 */
async function computeTransactionResult(transaction: any): Promise<ComputedTxnResult> {
  const transactionId = transaction.transactionId;
  const nextAttemptNumber = transaction.attemptsCount + 1;

  // STEP 0: Hard Fraud Exclusion Gate (read-only — uses pre-loaded transaction object)
  const fraudCheck = await evaluateHardFraudGateCheck(transaction);
  if (fraudCheck.isFraudExcluded) {
    return {
      transactionId,
      status: 'FRAUD_EXCLUDED',
      actionTaken: 'no_action_fraud_excluded',
      outcome: 'FRAUD_EXCLUDED',
      recoveredAmountInr: 0,
      explanation: fraudCheck.explanation!,
      attemptsCount: nextAttemptNumber,
      auditParams: {
        detectedSignal: `payment.failed (${transaction.errorCode})`,
        rootCause: 'fraud_detected',
        classifierSource: 'fraud_gate',
        confidence: 1.0,
        policyRuleFired: 'HARD_FRAUD_GATE',
        actionTaken: 'no_action_fraud_excluded',
        apiCall: undefined,
        apiResponseStatus: 'fraud_excluded',
        outcome: 'FRAUD_EXCLUDED',
        amountRecoveredInr: 0,
        explanation: fraudCheck.explanation!,
      },
    };
  }

  // STEP 1: Root Cause Classification (deterministic — fast, no DB)
  const classification = await classifyTransactionRootCause(transaction.errorCode, transaction.errorReason);

  // STEP 2: Policy Engine (pure CPU — no DB)
  const policyDecision = evaluatePolicyMatrix(
    classification.rootCause,
    transaction.attemptsCount,
    transaction.lastAttemptAt
  );

  // STEP 3: Execute recovery action (Razorpay API calls + customer simulation)
  try {
    if (policyDecision.action === 'retry_payment') {
      const orderResult = await executeRazorpayRetryOrder(transactionId, transaction.amountInr, nextAttemptNumber);
      const recoveredAmount = transaction.amountInr;
      const explanation = `Direct auto-retry succeeded via Razorpay Orders API (${orderResult.orderId}). 100% of ₹${recoveredAmount} recovered.`;

      return {
        transactionId,
        status: 'RECOVERED',
        actionTaken: policyDecision.action,
        outcome: 'RECOVERED',
        recoveredAmountInr: recoveredAmount,
        explanation,
        attemptsCount: nextAttemptNumber,
        razorpayOrderId: orderResult.orderId,
        auditParams: {
          detectedSignal: `payment.failed (${transaction.errorCode})`,
          rootCause: classification.rootCause,
          classifierSource: classification.classifierSource,
          confidence: classification.confidence,
          policyRuleFired: policyDecision.ruleFired,
          actionTaken: policyDecision.action,
          apiCall: `razorpay.orders.create (${orderResult.orderId})`,
          apiResponseStatus: '200_OK_SUCCESS',
          outcome: 'RECOVERED',
          amountRecoveredInr: recoveredAmount,
          explanation,
          metadata: { orderResult, idempotencyKey: orderResult.idempotencyKey },
        },
      };
    }

    if (policyDecision.action === 'send_payment_link' || policyDecision.action === 'schedule_delayed_nudge') {
      const description = `Recovery nudge for order ${transaction.orderId}`;
      const plinkResult = await createRazorpayPaymentLink(
        transactionId,
        transaction.customerName,
        transaction.customerEmail,
        transaction.customerPhone,
        transaction.amountInr,
        description,
        nextAttemptNumber
      );

      const messageBody = await generateNudgeCopy(
        transaction.customerName,
        transaction.amountInr,
        classification.rootCause,
        plinkResult.shortUrl
      );

      const scheduledTime = new Date(Date.now() + policyDecision.delayHours * 3600 * 1000);
      const simulation = simulateCustomerResponse(
        transaction.groundTruthRecoverable,
        transaction.amountInr,
        classification.rootCause,
        nextAttemptNumber
      );

      const finalStatus = simulation.isConverted ? 'RECOVERED' : 'PENDING_NUDGE';
      const recoveredAmount = simulation.isConverted ? transaction.amountInr : 0;
      const explanation = `${policyDecision.explanation} Created Razorpay Payment Link (${plinkResult.paymentLinkId}). ${simulation.explanation}`;

      return {
        transactionId,
        status: finalStatus,
        actionTaken: policyDecision.action,
        outcome: simulation.isConverted ? 'RECOVERED' : 'PENDING',
        recoveredAmountInr: recoveredAmount,
        explanation,
        attemptsCount: nextAttemptNumber,
        razorpayPaymentLinkId: plinkResult.paymentLinkId,
        razorpayPaymentLinkUrl: plinkResult.shortUrl,
        auditParams: {
          detectedSignal: `payment.failed (${transaction.errorCode})`,
          rootCause: classification.rootCause,
          classifierSource: classification.classifierSource,
          confidence: classification.confidence,
          policyRuleFired: policyDecision.ruleFired,
          actionTaken: policyDecision.action,
          apiCall: `razorpay.paymentLink.create (${plinkResult.paymentLinkId})`,
          apiResponseStatus: '200_OK_CREATED',
          outcome: simulation.isConverted ? 'RECOVERED' : 'PENDING',
          amountRecoveredInr: recoveredAmount,
          explanation,
          metadata: { plinkResult, idempotencyKey: plinkResult.idempotencyKey, simulation, channel: transaction.customerContactChannel },
        },
        nudgeParams: {
          channel: transaction.customerContactChannel,
          recipient: transaction.customerPhone || transaction.customerEmail,
          messageBody,
          scheduledFor: scheduledTime,
        },
      };
    }

    // Default: write_off_exception
    const explanation = `[EXCEPTION LOGGED] Policy decision '${policyDecision.ruleFired}': ${policyDecision.explanation}`;
    return {
      transactionId,
      status: 'EXCEPTION',
      actionTaken: 'write_off_exception',
      outcome: 'EXCEPTION',
      recoveredAmountInr: 0,
      explanation,
      attemptsCount: nextAttemptNumber,
      auditParams: {
        detectedSignal: `payment.failed (${transaction.errorCode})`,
        rootCause: classification.rootCause,
        classifierSource: classification.classifierSource,
        confidence: classification.confidence,
        policyRuleFired: policyDecision.ruleFired,
        actionTaken: 'write_off_exception',
        apiCall: undefined,
        apiResponseStatus: 'write_off',
        outcome: 'EXCEPTION',
        amountRecoveredInr: 0,
        explanation,
      },
    };
  } catch (err: any) {
    console.error(`[Pipeline Error] Handled mid-retry API exception for ${transactionId}:`, err.message);
    const failureExplanation = `[EXCEPTION LOGGED] Gracefully caught mid-retry API failure: ${err.message}`;
    return {
      transactionId,
      status: 'EXCEPTION',
      actionTaken: 'write_off_exception',
      outcome: 'EXCEPTION',
      recoveredAmountInr: 0,
      explanation: failureExplanation,
      attemptsCount: nextAttemptNumber,
      auditParams: {
        detectedSignal: `payment.failed (${transaction.errorCode})`,
        rootCause: classification?.rootCause || 'unknown',
        classifierSource: classification?.classifierSource || 'deterministic_rule',
        confidence: classification?.confidence || 0.5,
        policyRuleFired: policyDecision?.ruleFired || 'EXCEPTION_CATCH',
        actionTaken: 'write_off_exception',
        apiCall: 'razorpay.api.timeout_error',
        apiResponseStatus: '504_API_TIMEOUT_EXCEPTION',
        outcome: 'EXCEPTION',
        amountRecoveredInr: 0,
        explanation: failureExplanation,
        metadata: { error: err.message },
      },
    };
  }
}

/**
 * Single-transaction API (used for the individual "Recover" button on a row).
 * Keeps original behaviour with per-record DB writes for correctness.
 */
export async function processSingleTransaction(transactionId: string): Promise<ProcessTransactionResult> {
  const transaction = await prisma.transaction.findUnique({
    where: { transactionId },
  });

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  const computed = await computeTransactionResult(transaction);

  // Write immediately (single transaction — mutex-safe via createAuditRecord)
  await prisma.transaction.update({
    where: { transactionId },
    data: {
      status: computed.status,
      attemptsCount: computed.attemptsCount,
      lastAttemptAt: new Date(),
      recoveredAmountInr: computed.recoveredAmountInr,
      ...(computed.razorpayOrderId && { razorpayOrderId: computed.razorpayOrderId }),
      ...(computed.razorpayPaymentLinkId && { razorpayPaymentLinkId: computed.razorpayPaymentLinkId }),
      ...(computed.razorpayPaymentLinkUrl && { razorpayPaymentLinkUrl: computed.razorpayPaymentLinkUrl }),
    },
  });

  await createAuditRecord({ transactionId, ...computed.auditParams });

  if (computed.nudgeParams) {
    await sendOrScheduleNudge({
      transactionId,
      channel: computed.nudgeParams.channel as 'sms' | 'whatsapp' | 'email',
      recipient: computed.nudgeParams.recipient,
      messageBody: computed.nudgeParams.messageBody,
      scheduledFor: computed.nudgeParams.scheduledFor,
    });
  }

  return {
    transactionId,
    status: computed.status,
    actionTaken: computed.actionTaken,
    outcome: computed.outcome,
    recoveredAmountInr: computed.recoveredAmountInr,
    explanation: computed.explanation,
  };
}

/**
 * Batch recovery pipeline — optimised for ~2s on 400 transactions.
 *
 * Strategy:
 *   1. Load all DEGRADED transactions in ONE query.
 *   2. Run ALL business logic (fraud gate, classifier, policy, Razorpay, simulator)
 *      fully in PARALLEL via Promise.all — zero DB writes during compute phase.
 *   3. Flush all results in a SINGLE prisma.$transaction() — bypasses the
 *      per-record mutex and SQLite write-lock overhead.
 */
export async function runBatchRecoveryPipeline(degradedTxnIds?: string[]): Promise<{
  processedCount: number;
  recoveredCount: number;
  recoveredAmountTotal: number;
  exceptionCount: number;
  fraudExcludedCount: number;
}> {
  // ── Phase 1: Load all transactions in one query ──────────────────────────
  let transactions: any[];
  if (degradedTxnIds && degradedTxnIds.length > 0) {
    transactions = await prisma.transaction.findMany({
      where: { transactionId: { in: degradedTxnIds } },
    });
  } else {
    transactions = await prisma.transaction.findMany({
      where: { status: 'DEGRADED' },
    });
  }

  if (transactions.length === 0) {
    return { processedCount: 0, recoveredCount: 0, recoveredAmountTotal: 0, exceptionCount: 0, fraudExcludedCount: 0 };
  }

  // ── Phase 2: Compute all results in parallel (NO DB writes) ──────────────
  const computedResults = await Promise.all(
    transactions.map((txn) => computeTransactionResult(txn))
  );

  // ── Phase 3: Build hash chain deterministically (CPU-only) ───────────────
  // Get current chain state once
  const systemState = await prisma.systemState.findUnique({ where: { id: 'global' } });
  const lastLog = await prisma.auditLog.findFirst({ orderBy: { sequenceNumber: 'desc' } });

  let prevHash = systemState?.lastAuditHash ?? '0000000000000000000000000000000000000000000000000000000000000000';
  let seqNum = (lastLog?.sequenceNumber ?? 0);

  const now = Date.now();
  const auditRecordsToInsert: any[] = [];

  for (const r of computedResults) {
    seqNum++;
    const timestamp = new Date(now);
    const timestampISO = timestamp.toISOString();
    const currentHash = computeAuditHash(prevHash, seqNum, r.transactionId, timestampISO, r.auditParams.actionTaken, r.auditParams.outcome, r.auditParams.amountRecoveredInr);
    auditRecordsToInsert.push({
      sequenceNumber: seqNum,
      transactionId: r.transactionId,
      timestamp,
      detectedSignal: r.auditParams.detectedSignal,
      rootCause: r.auditParams.rootCause,
      classifierSource: r.auditParams.classifierSource,
      confidence: r.auditParams.confidence,
      policyRuleFired: r.auditParams.policyRuleFired,
      actionTaken: r.auditParams.actionTaken,
      apiCall: r.auditParams.apiCall ?? null,
      apiResponseStatus: r.auditParams.apiResponseStatus ?? null,
      outcome: r.auditParams.outcome,
      amountRecoveredInr: r.auditParams.amountRecoveredInr,
      explanation: r.auditParams.explanation,
      previousHash: prevHash,
      hash: currentHash,
      metadata: r.auditParams.metadata ? JSON.stringify(r.auditParams.metadata) : null,
    });
    prevHash = currentHash;
  }

  const finalHash = prevHash;

  // ── Phase 4: Single atomic batch write ───────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // Bulk update all transaction statuses
    await Promise.all(
      computedResults.map((r) =>
        tx.transaction.update({
          where: { transactionId: r.transactionId },
          data: {
            status: r.status,
            attemptsCount: r.attemptsCount,
            lastAttemptAt: new Date(),
            recoveredAmountInr: r.recoveredAmountInr,
            ...(r.razorpayOrderId && { razorpayOrderId: r.razorpayOrderId }),
            ...(r.razorpayPaymentLinkId && { razorpayPaymentLinkId: r.razorpayPaymentLinkId }),
            ...(r.razorpayPaymentLinkUrl && { razorpayPaymentLinkUrl: r.razorpayPaymentLinkUrl }),
          },
        })
      )
    );

    // Bulk insert all audit logs
    await tx.auditLog.createMany({ data: auditRecordsToInsert });

    // Bulk insert nudge logs
    const nudgeRecords = computedResults
      .filter((r) => r.nudgeParams)
      .map((r) => ({
        transactionId: r.transactionId,
        channel: r.nudgeParams!.channel,
        recipient: r.nudgeParams!.recipient,
        messageBody: r.nudgeParams!.messageBody,
        scheduledFor: r.nudgeParams!.scheduledFor,
        status: 'SCHEDULED',
      }));
    if (nudgeRecords.length > 0) {
      await tx.nudgeLog.createMany({ data: nudgeRecords });
    }

    // Update system state with final hash
    await tx.systemState.update({
      where: { id: 'global' },
      data: { lastAuditHash: finalHash, totalBatchCount: { increment: computedResults.length } },
    });
  }, { timeout: 30000 });

  // ── Phase 5: Tally results ────────────────────────────────────────────────
  let recoveredCount = 0;
  let exceptionCount = 0;
  let fraudExcludedCount = 0;
  let recoveredAmountTotal = 0;

  for (const r of computedResults) {
    if (r.outcome === 'RECOVERED') { recoveredCount++; recoveredAmountTotal += r.recoveredAmountInr; }
    else if (r.outcome === 'EXCEPTION') exceptionCount++;
    else if (r.outcome === 'FRAUD_EXCLUDED') fraudExcludedCount++;
  }

  return {
    processedCount: computedResults.length,
    recoveredCount,
    recoveredAmountTotal,
    exceptionCount,
    fraudExcludedCount,
  };
}
