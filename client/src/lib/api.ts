const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface MetricsData {
  totalTransactions: number;
  totalAtRiskInr: number;
  totalRecoveredInr: number;
  chargebackProtectedInr: number;
  recoveryRate: number;
  precisionPct: number;
  statusCounts: {
    DEGRADED: number;
    RECOVERED: number;
    PENDING_NUDGE: number;
    EXCEPTION: number;
    FRAUD_EXCLUDED: number;
  };
  rootCauseBreakdown: {
    reason: string;
    atRiskCount: number;
    recoveredCount: number;
    atRiskInr: number;
    recoveredInr: number;
    recoveryRatePct: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    atRiskCount: number;
    recoveredCount: number;
    atRiskInr: number;
    recoveredInr: number;
    recoveryRatePct: number;
  }[];
  policyPerformance: {
    rule: string;
    triggeredCount: number;
    recoveredCount: number;
    recoveredInr: number;
    conversionRatePct: number;
  }[];
  funnel: {
    stage: string;
    count: number;
    amountInr: number;
    dropoffPct: number;
  }[];
  automatedInsights: {
    title: string;
    type: string;
    badge: string;
    observation: string;
    recommendation: string;
  }[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  orderId: string;
  amountInr: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  attemptTimestamp: string;
  errorCode: string;
  errorReason: string;
  groundTruthRecoverable: boolean;
  customerContactChannel: string;
  isFlaggedFraud: boolean;
  status: 'DEGRADED' | 'RECOVERED' | 'PENDING_NUDGE' | 'EXCEPTION' | 'FRAUD_EXCLUDED';
  attemptsCount: number;
  recoveredAmountInr: number;
  razorpayOrderId?: string;
  razorpayPaymentLinkId?: string;
  razorpayPaymentLinkUrl?: string;
  updatedAt: string;
  auditLogs?: AuditLogItem[];
  nudges?: any[];
}

export interface AuditLogItem {
  id: string;
  sequenceNumber: number;
  transactionId: string;
  timestamp: string;
  detectedSignal: string;
  rootCause: string;
  classifierSource: string;
  confidence: number;
  policyRuleFired: string;
  actionTaken: string;
  apiCall?: string;
  apiResponseStatus?: string;
  outcome: string;
  amountRecoveredInr: number;
  explanation: string;
  previousHash: string;
  hash: string;
  metadata?: string;
}

export async function fetchMetrics(): Promise<MetricsData> {
  const res = await fetch(`${API_BASE}/metrics`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchTransactions(status: string = 'ALL', search: string = ''): Promise<TransactionItem[]> {
  const params = new URLSearchParams({ status, search });
  const res = await fetch(`${API_BASE}/transactions?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();
  return data.transactions;
}

export async function fetchTransactionDetail(transactionId: string): Promise<TransactionItem> {
  const res = await fetch(`${API_BASE}/transactions/${transactionId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch transaction detail');
  const data = await res.json();
  return data.transaction;
}

export async function verifyAuditHashChain(): Promise<{
  isValid: boolean;
  totalRecords: number;
  verifiedCount: number;
  failedSequenceNumber?: number;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/audit/verify`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to verify audit hash chain');
  return res.json();
}

export async function fetchExceptions(): Promise<TransactionItem[]> {
  const res = await fetch(`${API_BASE}/exceptions`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch exceptions');
  const data = await res.json();
  return data.exceptions;
}

export async function generateSyntheticBatch(count: number = 400) {
  const res = await fetch(`${API_BASE}/batch/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) throw new Error('Failed to generate batch');
  return res.json();
}

export async function runRecoveryPipeline() {
  const res = await fetch(`${API_BASE}/pipeline/run`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to run recovery pipeline');
  return res.json();
}

export async function resetSystem() {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset system');
  return res.json();
}
