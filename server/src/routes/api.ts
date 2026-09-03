import { Router } from 'express';
import { prisma } from '../db/client.js';
import { generateSyntheticBatch } from '../generator/generateBatch.js';
import { runBatchRecoveryPipeline, processSingleTransaction } from '../engine/pipelineRunner.js';
import { verifyAuditChainIntegrity } from '../engine/auditLogger.js';

export const apiRouter = Router();

// 1. Generate & Ingest Synthetic Batch (400 txns)
apiRouter.post('/batch/generate', async (req, res) => {
  try {
    const count = Number(req.body.count) || 400;

    // Clear existing data
    await prisma.nudgeLog.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.systemState.upsert({
      where: { id: 'global' },
      update: { lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000', totalBatchCount: 0 },
      create: { id: 'global', lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000', totalBatchCount: 0 },
    });

    const batch = generateSyntheticBatch(count);

    for (const item of batch) {
      await prisma.transaction.create({
        data: item,
      });
    }

    res.json({
      success: true,
      message: `Ingested ${batch.length} synthetic payment failure records into dataset.`,
      count: batch.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Trigger Recovery Pipeline
apiRouter.post('/pipeline/run', async (req, res) => {
  try {
    const result = await runBatchRecoveryPipeline();
    res.json({
      success: true,
      message: `Recoup agent pipeline run completed. Processed ${result.processedCount} transactions.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Process Single Transaction (for interactive testing / camera demo)
apiRouter.post('/transactions/:id/recover', async (req, res) => {
  try {
    const result = await processSingleTransaction(req.params.id);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Executive Summary & Advanced Multi-Dimensional Metrics
apiRouter.get('/metrics', async (req, res) => {
  try {
    const totalTransactions = await prisma.transaction.count();

    // Single Source of Truth revenue sums
    const totalAtRiskAgg = await prisma.transaction.aggregate({
      _sum: { amountInr: true },
    });
    const totalRecoveredAgg = await prisma.transaction.aggregate({
      _sum: { recoveredAmountInr: true },
      where: { status: 'RECOVERED' },
    });

    const totalAtRiskInr = totalAtRiskAgg._sum.amountInr || 0;
    const totalRecoveredInr = totalRecoveredAgg._sum.recoveredAmountInr || 0;
    const recoveryRate = totalAtRiskInr > 0 ? (totalRecoveredInr / totalAtRiskInr) * 100 : 0;

    const statusCounts = {
      DEGRADED: await prisma.transaction.count({ where: { status: 'DEGRADED' } }),
      RECOVERED: await prisma.transaction.count({ where: { status: 'RECOVERED' } }),
      PENDING_NUDGE: await prisma.transaction.count({ where: { status: 'PENDING_NUDGE' } }),
      EXCEPTION: await prisma.transaction.count({ where: { status: 'EXCEPTION' } }),
      FRAUD_EXCLUDED: await prisma.transaction.count({ where: { status: 'FRAUD_EXCLUDED' } }),
    };

    // Fraud prevention chargeback protection
    const fraudSumAgg = await prisma.transaction.aggregate({
      _sum: { amountInr: true },
      where: { isFlaggedFraud: true },
    });
    const chargebackProtectedInr = fraudSumAgg._sum.amountInr || 0;

    // Precision calculation against groundTruthRecoverable
    const totalRecoverableGT = await prisma.transaction.count({
      where: { groundTruthRecoverable: true },
    });
    const correctlyRecovered = await prisma.transaction.count({
      where: { groundTruthRecoverable: true, status: 'RECOVERED' },
    });
    const precisionPct = totalRecoverableGT > 0 ? (correctlyRecovered / totalRecoverableGT) * 100 : 0;

    // Root cause breakdown
    const rootCauses = ['insufficient_funds', 'bank_timeout', 'card_declined_by_issuer', 'otp_failed', 'user_cancelled', 'risk_blocked'];
    const rootCauseBreakdown = await Promise.all(
      rootCauses.map(async (reason) => {
        const atRiskCount = await prisma.transaction.count({ where: { errorReason: reason } });
        const recoveredCount = await prisma.transaction.count({ where: { errorReason: reason, status: 'RECOVERED' } });
        const atRiskSum = await prisma.transaction.aggregate({ _sum: { amountInr: true }, where: { errorReason: reason } });
        const recoveredSum = await prisma.transaction.aggregate({ _sum: { recoveredAmountInr: true }, where: { errorReason: reason, status: 'RECOVERED' } });

        const atRisk = atRiskSum._sum.amountInr || 0;
        const recovered = recoveredSum._sum.recoveredAmountInr || 0;
        const rate = atRisk > 0 ? (recovered / atRisk) * 100 : 0;

        return {
          reason,
          atRiskCount,
          recoveredCount,
          atRiskInr: atRisk,
          recoveredInr: recovered,
          recoveryRatePct: Number(rate.toFixed(1)),
        };
      })
    );

    // Payment Method Breakdown (UPI vs Card vs Netbanking)
    const paymentMethods = ['upi', 'card', 'netbanking'];
    const paymentMethodBreakdown = await Promise.all(
      paymentMethods.map(async (method) => {
        const atRiskCount = await prisma.transaction.count({ where: { paymentMethod: method } });
        const recoveredCount = await prisma.transaction.count({ where: { paymentMethod: method, status: 'RECOVERED' } });
        const atRiskSum = await prisma.transaction.aggregate({ _sum: { amountInr: true }, where: { paymentMethod: method } });
        const recoveredSum = await prisma.transaction.aggregate({ _sum: { recoveredAmountInr: true }, where: { paymentMethod: method, status: 'RECOVERED' } });

        const atRisk = atRiskSum._sum.amountInr || 0;
        const recovered = recoveredSum._sum.recoveredAmountInr || 0;
        const rate = atRisk > 0 ? (recovered / atRisk) * 100 : 0;

        return {
          method: method.toUpperCase(),
          atRiskCount,
          recoveredCount,
          atRiskInr: atRisk,
          recoveredInr: recovered,
          recoveryRatePct: Number(rate.toFixed(1)),
        };
      })
    );

    // Policy Rule Performance Analysis
    const auditLogs = await prisma.auditLog.findMany();
    const policyMap: Record<string, { count: number; recoveredCount: number; recoveredInr: number }> = {};
    for (const log of auditLogs) {
      const rule = log.policyRuleFired;
      if (!policyMap[rule]) {
        policyMap[rule] = { count: 0, recoveredCount: 0, recoveredInr: 0 };
      }
      policyMap[rule].count++;
      if (log.outcome === 'RECOVERED') {
        policyMap[rule].recoveredCount++;
        policyMap[rule].recoveredInr += log.amountRecoveredInr;
      }
    }

    const policyPerformance = Object.entries(policyMap).map(([rule, data]) => ({
      rule,
      triggeredCount: data.count,
      recoveredCount: data.recoveredCount,
      recoveredInr: data.recoveredInr,
      conversionRatePct: data.count > 0 ? Number(((data.recoveredCount / data.count) * 100).toFixed(1)) : 0,
    }));

    // Recovery Conversion Funnel
    const funnel = [
      { stage: '1. Payment Degradations Detected', count: totalTransactions, amountInr: totalAtRiskInr, dropoffPct: 0 },
      { stage: '2. Step 0 Fraud Shield Filtered', count: totalTransactions - statusCounts.FRAUD_EXCLUDED, amountInr: totalAtRiskInr - chargebackProtectedInr, dropoffPct: Number(((statusCounts.FRAUD_EXCLUDED / (totalTransactions || 1)) * 100).toFixed(1)) },
      { stage: '3. Policy Interventions Dispatched', count: totalTransactions - statusCounts.FRAUD_EXCLUDED - statusCounts.EXCEPTION, amountInr: totalAtRiskInr - chargebackProtectedInr, dropoffPct: Number(((statusCounts.EXCEPTION / (totalTransactions || 1)) * 100).toFixed(1)) },
      { stage: '4. Revenue Recovered & Settled', count: statusCounts.RECOVERED, amountInr: totalRecoveredInr, dropoffPct: Number(((100 - recoveryRate)).toFixed(1)) },
    ];

    // Automated Strategic Observations & Key Takeaways
    const bankTimeoutStats = rootCauseBreakdown.find((r) => r.reason === 'bank_timeout');
    const cardDeclinedStats = rootCauseBreakdown.find((r) => r.reason === 'card_declined_by_issuer');
    const upiStats = paymentMethodBreakdown.find((p) => p.method === 'UPI');

    const automatedInsights = [
      {
        title: 'Zero-Friction Bank Timeout Retries',
        type: 'high_roi',
        badge: `${bankTimeoutStats?.recoveryRatePct || 0}% Recovery`,
        observation: `Direct auto-retries via Razorpay Orders API recovered ₹${(bankTimeoutStats?.recoveredInr || 0).toLocaleString('en-IN')} with zero customer intervention.`,
        recommendation: 'Keep max retries bounded at 2 with 10-minute cooldowns to preserve bank gateway QoS without triggering rate blocks.',
      },
      {
        title: 'Step 0 Hard Fraud Shield Protection',
        type: 'risk_guardrail',
        badge: `₹${chargebackProtectedInr.toLocaleString('en-IN')} Protected`,
        observation: `Blocked ${statusCounts.FRAUD_EXCLUDED} fraud-flagged transactions prior to root-cause triage, preventing potential chargebacks and merchant penalties.`,
        recommendation: 'Maintain hard gate before classification. Zero outreach eliminates dispute liability.',
      },
      {
        title: 'UPI Alternative Routing for Declined Cards',
        type: 'conversion_boost',
        badge: `${cardDeclinedStats?.recoveryRatePct || 0}% Converted`,
        observation: `Issuing bank card declines were converted by issuing Razorpay Payment Links that automatically recommend UPI and alternate payment methods.`,
        recommendation: 'Prioritize UPI deeplinks in SMS/WhatsApp nudges for mobile checkouts.',
      },
      {
        title: 'Salary-Cycle Delayed Nudge Strategy',
        type: 'timing_strategy',
        badge: '+48h Window',
        observation: `Insufficient funds recovery achieves peak conversion when delayed by 48 hours instead of blasting instant spam reminders.`,
        recommendation: 'Synchronize delayed nudges with month-end and bi-weekly salary replenishment cycles.',
      },
    ];

    res.json({
      totalTransactions,
      totalAtRiskInr,
      totalRecoveredInr,
      chargebackProtectedInr,
      recoveryRate,
      precisionPct,
      statusCounts,
      rootCauseBreakdown,
      paymentMethodBreakdown,
      policyPerformance,
      funnel,
      automatedInsights,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Transaction Explorer Listing
apiRouter.get('/transactions', async (req, res) => {
  try {
    const { status, search } = req.query;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { transactionId: { contains: String(search) } },
        { customerName: { contains: String(search) } },
        { customerEmail: { contains: String(search) } },
        { errorReason: { contains: String(search) } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ count: transactions.length, transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Single Transaction Detail + Audit History
apiRouter.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId: req.params.id },
      include: {
        auditLogs: { orderBy: { sequenceNumber: 'asc' } },
        nudges: { orderBy: { scheduledFor: 'asc' } },
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Cryptographic Hash Chain Audit Verification
apiRouter.get('/audit/verify', async (req, res) => {
  try {
    const verification = await verifyAuditChainIntegrity();
    res.json(verification);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Honest Exceptions List
apiRouter.get('/exceptions', async (req, res) => {
  try {
    const exceptions = await prisma.transaction.findMany({
      where: { status: 'EXCEPTION' },
      include: {
        auditLogs: { orderBy: { sequenceNumber: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ count: exceptions.length, exceptions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Reset System State
apiRouter.post('/reset', async (req, res) => {
  try {
    await prisma.nudgeLog.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.systemState.upsert({
      where: { id: 'global' },
      update: { lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000', totalBatchCount: 0 },
      create: { id: 'global', lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000', totalBatchCount: 0 },
    });

    res.json({ success: true, message: 'System database state cleanly reset.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
