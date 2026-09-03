'use client';

import React, { useState } from 'react';
import { Play, RefreshCw, ShieldCheck, Database, Zap, AlertTriangle } from 'lucide-react';
import { generateSyntheticBatch, runRecoveryPipeline, resetSystem, verifyAuditHashChain } from '../lib/api';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onAuditVerifyResult: (result: any) => void;
  auditVerifyResult: any;
  onDismissAudit: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onRefresh,
  onAuditVerifyResult,
  auditVerifyResult,
  onDismissAudit,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  const handleGenerateBatch = async () => {
    setLoading(true);
    setStatusType('info');
    setStatusMessage('Generating 400 synthetic at-risk payment transactions...');
    try {
      const res = await generateSyntheticBatch(400);
      setStatusType('success');
      setStatusMessage(`✓ ${res.message}`);
      onRefresh();
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setLoading(true);
    setStatusType('info');
    setStatusMessage('Executing Recoup agent pipeline (Fraud Gate → Classifier → Policy Engine → Razorpay APIs → Customer Simulator)...');
    try {
      const res = await runRecoveryPipeline();
      setStatusType('success');
      setStatusMessage(`✓ Pipeline Complete: Recovered ₹${res.result.recoveredAmountTotal.toLocaleString('en-IN')} across ${res.result.recoveredCount} transactions.`);
      onRefresh();
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage(`Error running pipeline: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    setLoading(true);
    setStatusType('info');
    setStatusMessage('Traversing cryptographic SHA-256 hash chain...');
    try {
      const res = await verifyAuditHashChain();
      onAuditVerifyResult(res);
      setStatusType(res.isValid ? 'success' : 'error');
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage(`Audit verification failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all dataset transactions and audit logs?')) return;
    setLoading(true);
    try {
      await resetSystem();
      setStatusType('success');
      setStatusMessage('✓ System state cleanly reset.');
      onRefresh();
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    info: 'bg-cyan-950/60 border-cyan-800/50 text-cyan-200',
    success: 'bg-emerald-950/60 border-emerald-800/50 text-emerald-200',
    error: 'bg-rose-950/60 border-rose-800/50 text-rose-200',
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur px-6 py-4 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top Row: Brand + Buttons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand */}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0 mt-0.5">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Recoup</h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  Track 03: AI Revenue Recovery
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  ● Razorpay Test Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Explainable Payment-Failure Recovery Agent with Hash-Chained Audit Trail
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                Ingests degraded payment events, enforces a hard fraud gate, classifies root causes via deterministic rules + Gemini LLM, executes bounded recovery actions on Razorpay test-mode APIs, and logs every decision into a cryptographic SHA-256 hash chain.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              onClick={handleGenerateBatch}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Generate Batch (400 Txns)</span>
            </button>

            <button
              onClick={handleRunPipeline}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-white fill-white" />
              <span>Run Recovery Agent</span>
            </button>

            <button
              onClick={handleVerifyAuditChain}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Hash Chain</span>
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="p-2 text-xs rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 transition-all disabled:opacity-50 cursor-pointer"
              title="Reset Dataset"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        {statusMessage && (
          <div className={`px-3 py-1.5 text-xs border rounded-md flex items-center justify-between ${statusColors[statusType]}`}>
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="font-bold ml-2 opacity-60 hover:opacity-100">×</button>
          </div>
        )}
      </div>
    </header>
  );
};
