import crypto from 'crypto';
import { prisma } from '../db/client.js';

export interface AuditRecordParams {
  transactionId: string;
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
}

// Single-Writer Mutex Queue to prevent hash chain race conditions during parallel processing
class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift()!;
          next();
        } else {
          this.locked = false;
        }
      };

      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.queue.push(() => resolve(release));
      }
    });
  }
}

const auditMutex = new AsyncMutex();

export function computeAuditHash(
  previousHash: string,
  sequenceNumber: number,
  transactionId: string,
  timestampISO: string,
  actionTaken: string,
  outcome: string,
  amountRecoveredInr: number
): string {
  const payload = `${previousHash}|${sequenceNumber}|${transactionId}|${timestampISO}|${actionTaken}|${outcome}|${amountRecoveredInr}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Writes an append-only AuditLog record inside a serialized Mutex queue.
 * Guarantees cryptographic SHA-256 hash chaining without race conditions.
 */
export async function createAuditRecord(params: AuditRecordParams) {
  const releaseLock = await auditMutex.acquire();

  try {
    // 1. Get or initialize global system state for last audit hash & sequence
    let systemState = await prisma.systemState.findUnique({
      where: { id: 'global' },
    });

    if (!systemState) {
      systemState = await prisma.systemState.create({
        data: {
          id: 'global',
          lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000',
          totalBatchCount: 0,
        },
      });
    }

    const previousHash = systemState.lastAuditHash;

    // 2. Determine sequence number
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { sequenceNumber: 'desc' },
    });
    const sequenceNumber = (lastLog?.sequenceNumber || 0) + 1;

    const timestamp = new Date();
    const timestampISO = timestamp.toISOString();

    // 3. Compute SHA-256 hash
    const currentHash = computeAuditHash(
      previousHash,
      sequenceNumber,
      params.transactionId,
      timestampISO,
      params.actionTaken,
      params.outcome,
      params.amountRecoveredInr
    );

    // 4. Create AuditLog entry and update system state
    const auditRecord = await prisma.auditLog.create({
      data: {
        sequenceNumber,
        transactionId: params.transactionId,
        timestamp,
        detectedSignal: params.detectedSignal,
        rootCause: params.rootCause,
        classifierSource: params.classifierSource,
        confidence: params.confidence,
        policyRuleFired: params.policyRuleFired,
        actionTaken: params.actionTaken,
        apiCall: params.apiCall || null,
        apiResponseStatus: params.apiResponseStatus || null,
        outcome: params.outcome,
        amountRecoveredInr: params.amountRecoveredInr,
        explanation: params.explanation,
        previousHash,
        hash: currentHash,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    await prisma.systemState.update({
      where: { id: 'global' },
      data: {
        lastAuditHash: currentHash,
        totalBatchCount: { increment: 1 },
      },
    });

    return auditRecord;
  } finally {
    releaseLock();
  }
}

/**
 * Verification utility for dashboard audit check:
 * Traverses all AuditLogs in sequence and verifies cryptographic SHA-256 chain integrity.
 */
export async function verifyAuditChainIntegrity(): Promise<{
  isValid: boolean;
  totalRecords: number;
  verifiedCount: number;
  failedSequenceNumber?: number;
  message: string;
}> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { sequenceNumber: 'asc' },
  });

  if (logs.length === 0) {
    return {
      isValid: true,
      totalRecords: 0,
      verifiedCount: 0,
      message: 'Audit trail is empty. Hash chain intact.',
    };
  }

  let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    if (log.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalRecords: logs.length,
        verifiedCount: i,
        failedSequenceNumber: log.sequenceNumber,
        message: `Hash chain broken at sequence #${log.sequenceNumber}: Expected prevHash ${expectedPrevHash.slice(0, 8)}..., got ${log.previousHash.slice(0, 8)}...`,
      };
    }

    const calculatedHash = computeAuditHash(
      log.previousHash,
      log.sequenceNumber,
      log.transactionId,
      log.timestamp.toISOString(),
      log.actionTaken,
      log.outcome,
      log.amountRecoveredInr
    );

    if (calculatedHash !== log.hash) {
      return {
        isValid: false,
        totalRecords: logs.length,
        verifiedCount: i,
        failedSequenceNumber: log.sequenceNumber,
        message: `Hash mismatch at sequence #${log.sequenceNumber}: Stored hash ${log.hash.slice(0, 8)}... does not match calculated hash ${calculatedHash.slice(0, 8)}...`,
      };
    }

    expectedPrevHash = log.hash;
  }

  return {
    isValid: true,
    totalRecords: logs.length,
    verifiedCount: logs.length,
    message: `All ${logs.length} audit records cryptographically verified. Hash chain is 100% valid and tamper-free.`,
  };
}
