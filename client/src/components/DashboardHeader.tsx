'use client';

import React, { useState } from 'react';
import { Play, RefreshCw, ShieldCheck, Database, Zap, AlertTriangle } from 'lucide-react';
import { generateSyntheticBatch, runRecoveryPipeline, resetSystem, verifyAuditHashChain } from '../lib/api';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onAuditVerifyResult: (result: any) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onRefresh, onAuditVerifyResult }) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGenerateBatch = async () => {
    setLoading(true);
    setStatusMessage('Generating 400 synthetic at-risk payment transactions...');
    try {
      const res = await generateSyntheticBatch(400);
      setStatusMessage(`Success: ${res.message}`);
      onRefresh();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setLoading(true);
    setStatusMessage('Executing Recoup agent recovery pipeline (Fraud Gate -> Classifier -> Policy -> Razorpay Execution -> Customer Simulator)...');
    try {
      const res = await runRecoveryPipeline();
      setStatusMessage(`Pipeline Completed: Recovered ₹${res.result.recoveredAmountTotal.toLocaleString('en-IN')} across ${res.result.recoveredCount} transactions.`);
      onRefresh();
    } catch (err: any) {
      setStatusMessage(`Error running pipeline: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    setLoading(true);
    setStatusMessage('Traversing cryptographic SHA-256 hash chain...');
    try {
      const res = await verifyAuditHashChain();
      onAuditVerifyResult(res);
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(`Audit verification failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all dataset transactions and audit logs?')) return;
    setLoading(true);
    try {
      await resetSystem();
      setStatusMessage('System state cleanly reset.');
      onRefresh();
    } catch (err: any) {
      setStatusMessage(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-4 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Recoup</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                Track 03: AI Revenue Recovery
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Razorpay Test Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">Explainable Payment-Failure Recovery Agent with Hash-Chained Audit Trail</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleGenerateBatch}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate Batch (400 Txns)</span>
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-white fill-white" />
            <span>Run Recovery Agent</span>
          </button>

          <button
            onClick={handleVerifyAuditChain}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify Hash Chain</span>
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="p-2 text-xs font-medium rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 transition-all disabled:opacity-50"
            title="Reset Dataset"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="max-w-7xl mx-auto mt-3 px-3 py-1.5 text-xs bg-cyan-950/50 border border-cyan-800/40 text-cyan-200 rounded-md flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-cyan-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}
    </header>
  );
};
