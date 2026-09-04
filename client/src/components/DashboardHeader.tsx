'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, ShieldCheck, Database, Zap, AlertTriangle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { generateSyntheticBatch, runRecoveryPipeline, resetSystem, verifyAuditHashChain } from '../lib/api';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onAuditVerifyResult: (result: any) => void;
  auditVerifyResult: any;
  onDismissAudit: () => void;
}

interface PipelineProgressState {
  isActive: boolean;
  actionTitle: string;
  estimatedSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  currentStageIndex: number;
  stages: string[];
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
  const [progress, setProgress] = useState<PipelineProgressState | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startProgress = (title: string, estimatedSeconds: number, stages: string[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setProgress({
      isActive: true,
      actionTitle: title,
      estimatedSeconds,
      elapsedSeconds: 0,
      remainingSeconds: estimatedSeconds,
      currentStageIndex: 0,
      stages,
    });

    timerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSec = Math.round((elapsedMs / 1000) * 10) / 10;
      const remainingSec = Math.max(0, Math.ceil(estimatedSeconds - elapsedSec));

      const stageCount = stages.length;
      const stageDuration = estimatedSeconds / (stageCount || 1);
      const stageIdx = Math.min(stageCount - 1, Math.floor(elapsedSec / stageDuration));

      setProgress((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elapsedSeconds: elapsedSec,
          remainingSeconds: remainingSec,
          currentStageIndex: stageIdx,
        };
      });
    }, 100);
  };

  const stopProgress = (): string => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const totalElapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    setProgress(null);
    return totalElapsed;
  };

  const handleGenerateBatch = async () => {
    setLoading(true);
    setStatusType('info');
    setStatusMessage(null);
    const stages = [
      'Purging existing dataset',
      'Synthesizing 400 failure profiles',
      'Writing transactions to database',
    ];
    startProgress('Generating Synthetic Failure Batch (400 Txns)', 3, stages);
    try {
      const res = await generateSyntheticBatch(400);
      const elapsed = stopProgress();
      setStatusType('success');
      setStatusMessage(`✓ ${res.message} (Completed in ${elapsed}s)`);
      onRefresh();
    } catch (err: any) {
      stopProgress();
      setStatusType('error');
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setLoading(true);
    setStatusType('info');
    setStatusMessage(null);
    const stages = [
      'Fraud Gate (Step 0 Hard Shield)',
      'Root-Cause Classifier (Gemini AI + Rules)',
      'Policy Matrix Engine',
      'Razorpay APIs (Orders & Links)',
      'Customer Simulator & Hash Chain',
    ];
    startProgress('Executing Recoup Recovery Pipeline', 4, stages);
    try {
      const res = await runRecoveryPipeline();
      const elapsed = stopProgress();
      setStatusType('success');
      setStatusMessage(`✓ Pipeline Complete: Recovered ₹${res.result.recoveredAmountTotal.toLocaleString('en-IN')} across ${res.result.recoveredCount} transactions (Finished in ${elapsed}s).`);
      onRefresh();
    } catch (err: any) {
      stopProgress();
      setStatusType('error');
      setStatusMessage(`Error running pipeline: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    setLoading(true);
    setStatusType('info');
    setStatusMessage(null);
    const stages = [
      'Retrieving audit log sequence',
      'Traversing SHA-256 cryptographic chain',
      'Verifying tamper-evident integrity',
    ];
    startProgress('Traversing SHA-256 Cryptographic Hash Chain', 2, stages);
    try {
      const res = await verifyAuditHashChain();
      const elapsed = stopProgress();
      onAuditVerifyResult(res);
      setStatusType(res.isValid ? 'success' : 'error');
      setStatusMessage(`${res.message} (Verified in ${elapsed}s)`);
    } catch (err: any) {
      stopProgress();
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

        {/* Live Multi-Stage Countdown & Progress Tracker */}
        {progress?.isActive && (
          <div className="border border-cyan-500/40 bg-cyan-950/40 rounded-xl p-3.5 space-y-2.5 shadow-lg shadow-cyan-950/50">
            {/* Header row: Action title, Countdown pill, and Elapsed timer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                <span className="font-semibold text-white tracking-wide">{progress.actionTitle}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Stage {progress.currentStageIndex + 1} of {progress.stages.length}
                </span>
              </div>

              {/* Countdown and Elapsed pill */}
              <div className="flex items-center space-x-2 text-[11px]">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-900/60 border border-cyan-700/60 text-cyan-200 font-mono font-semibold">
                  <Clock className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>
                    {progress.remainingSeconds > 0
                      ? `Est. ~${progress.remainingSeconds}s remaining`
                      : 'Finalizing database & hash chain...'}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[11px]">
                  Elapsed: {progress.elapsedSeconds.toFixed(1)}s
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-500/50"
                style={{
                  width: `${Math.min(98, Math.max(8, Math.round((progress.elapsedSeconds / progress.estimatedSeconds) * 92)))}%`,
                }}
              />
            </div>

            {/* Pipeline Stage Steps Breadcrumb */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 pt-1 text-[10px]">
              {progress.stages.map((stage, idx) => {
                const isPast = idx < progress.currentStageIndex;
                const isCurrent = idx === progress.currentStageIndex;
                return (
                  <div
                    key={stage}
                    className={`px-2 py-1 rounded border flex items-center space-x-1.5 transition-all ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-sm shadow-cyan-500/30 ring-1 ring-cyan-500/40'
                        : isPast
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300/80'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold bg-slate-800">
                      {isPast ? '✓' : idx + 1}
                    </span>
                    <span className="truncate">{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed / Error Status Banner */}
        {statusMessage && !progress?.isActive && (
          <div className={`px-3.5 py-2 text-xs border rounded-lg flex items-center justify-between shadow-sm transition-all ${statusColors[statusType]}`}>
            <div className="flex items-center space-x-2">
              {statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {statusType === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              {statusType === 'info' && <Clock className="w-4 h-4 text-cyan-400 shrink-0" />}
              <span className="font-medium">{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-bold ml-2 opacity-60 hover:opacity-100 text-sm">×</button>
          </div>
        )}
      </div>
    </header>
  );
};

