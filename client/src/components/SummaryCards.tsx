'use client';

import React from 'react';
import { MetricsData } from '../lib/api';
import { DollarSign, ShieldAlert, CheckCircle2, AlertOctagon, ShieldCheck, Shield } from 'lucide-react';

interface SummaryCardsProps {
  metrics: MetricsData | null;
  onOpenExceptions: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ metrics, onOpenExceptions }) => {
  const atRisk = metrics?.totalAtRiskInr || 0;
  const recovered = metrics?.totalRecoveredInr || 0;
  const chargebackProtected = metrics?.chargebackProtectedInr || 0;
  const rate = metrics?.recoveryRate || 0;
  const precision = metrics?.precisionPct || 0;
  const exceptions = metrics?.statusCounts.EXCEPTION || 0;
  const fraudExcluded = metrics?.statusCounts.FRAUD_EXCLUDED || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Revenue At Risk */}
      <div className="glass-panel p-5 rounded-2xl glass-card-hover border-l-4 border-l-amber-500 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue at Risk</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-white tracking-tight">₹{atRisk.toLocaleString('en-IN')}</span>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">{metrics?.totalTransactions || 0} at-risk attempts</p>
            <span className="text-[10px] font-mono text-amber-400/90 font-semibold">100% Ingested</span>
          </div>
        </div>
      </div>

      {/* 2. Recovered Revenue */}
      <div className="glass-panel p-5 rounded-2xl glass-card-hover border-l-4 border-l-emerald-500 relative overflow-hidden group bg-gradient-to-br from-slate-900/90 to-emerald-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovered Revenue</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-emerald-400 tracking-tight">₹{recovered.toLocaleString('en-IN')}</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs font-bold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-700/80">
              {rate.toFixed(1)}% recovery rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. Classifier Precision vs Ground Truth */}
      <div className="glass-panel p-5 rounded-2xl glass-card-hover border-l-4 border-l-cyan-500 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classifier Precision</span>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-cyan-400 tracking-tight">{precision.toFixed(1)}%</span>
          <p className="text-xs text-slate-400 mt-1">Accuracy vs ground-truth recoverable</p>
        </div>
      </div>

      {/* 4. Active Exceptions List */}
      <div
        onClick={onOpenExceptions}
        className="glass-panel p-5 rounded-2xl glass-card-hover border-l-4 border-l-rose-500 cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 group-hover:text-rose-400 uppercase tracking-wider transition-colors">
            Honest Exceptions
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-400 tracking-tight">{exceptions}</span>
            <span className="text-xs text-slate-400 group-hover:text-rose-300 underline">View list →</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Failed retries & API timeout limits</p>
        </div>
      </div>

      {/* 5. Fraud Shield (Step 0) & Chargeback Protection */}
      <div className="glass-panel p-5 rounded-2xl glass-card-hover border-l-4 border-l-purple-500 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fraud Shield (Step 0)</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-purple-400 tracking-tight">{fraudExcluded}</span>
            <span className="text-xs font-semibold text-purple-300 font-mono">₹{chargebackProtected.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Dispute liability prevented at Step 0</p>
        </div>
      </div>
    </div>
  );
};
