export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // When deployed on cloud hosting (Railway, Render, Vercel, or custom domains), use relative path
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
    // When running Next.js dev server locally on port 3000, route API calls to Express backend on port 4000
    if (window.location.port === '3000') {
      return `${window.location.protocol}//${window.location.hostname}:4000/api`;
    }
    return '/api';
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:4000/api';
}

export const API_BASE = getApiBase();

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
  const base = getApiBase();
  const res = await fetch(`${base}/metrics`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to fetch metrics (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchTransactions(status: string = 'ALL', search: string = ''): Promise<TransactionItem[]> {
  const base = getApiBase();
  const params = new URLSearchParams({ status, search });
  const res = await fetch(`${base}/transactions?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to fetch transactions (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.transactions;
}

export async function fetchTransactionDetail(transactionId: string): Promise<TransactionItem> {
  const base = getApiBase();
  const res = await fetch(`${base}/transactions/${transactionId}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to fetch transaction detail (HTTP ${res.status})`);
  }
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
  const base = getApiBase();
  const res = await fetch(`${base}/audit/verify`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to verify audit hash chain (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchExceptions(): Promise<TransactionItem[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/exceptions`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to fetch exceptions (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.exceptions;
}

export async function generateSyntheticBatch(count: number = 400) {
  const base = getApiBase();
  const res = await fetch(`${base}/batch/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to generate batch (HTTP ${res.status})`);
  }
  return res.json();
}

export async function runRecoveryPipeline() {
  const base = getApiBase();
  const res = await fetch(`${base}/pipeline/run`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to run recovery pipeline (HTTP ${res.status})`);
  }
  return res.json();
}

export async function resetSystem() {
  const base = getApiBase();
  const res = await fetch(`${base}/reset`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to reset system (HTTP ${res.status})`);
  }
  return res.json();
}
