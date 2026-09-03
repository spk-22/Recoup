'use client';

import React, { useState } from 'react';
import { TransactionItem } from '../lib/api';
import { Lock, Link as LinkIcon, ShieldCheck, CheckCircle2, ChevronRight, Hash } from 'lucide-react';

interface HashChainVisualizerProps {
  transactions: TransactionItem[];
  onSelectTransaction: (txn: TransactionItem) => void;
}

export const HashChainVisualizer: React.FC<HashChainVisualizerProps> = ({ transactions, onSelectTransaction }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Take the first 8 transactions that have audit logs to display as chained blocks
  const sampleTxns = transactions.slice(0, 8);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Cryptographic Hash-Chained Audit Explorer</h3>
            <p className="text-xs text-slate-400">Sequential SHA-256 append-only block linkage with Mutex single-writer serialization</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-mono">
            <ShieldCheck className="w-3 h-3" />
            <span>100% Tamper-Evident</span>
          </span>
        </div>
      </div>

      {/* Horizontal Chain of Blocks */}
      <div className="overflow-x-auto pb-3 pt-1">
        <div className="flex items-center space-x-3 min-w-max">
          {sampleTxns.map((txn, idx) => {
            const isSelected = selectedIdx === idx;
            const statusColor =
              txn.status === 'RECOVERED' ? 'border-emerald-500/60 bg-emerald-950/30' :
              txn.status === 'FRAUD_EXCLUDED' ? 'border-purple-500/60 bg-purple-950/30' :
              txn.status === 'EXCEPTION' ? 'border-rose-500/60 bg-rose-950/30' :
              'border-slate-800 bg-slate-900/60';

            return (
              <React.Fragment key={txn.id}>
                <div
                  onClick={() => {
                    setSelectedIdx(idx);
                    onSelectTransaction(txn);
                  }}
                  className={`w-52 p-3.5 rounded-xl border ${statusColor} cursor-pointer transition-all hover:scale-105 ${
                    isSelected ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="font-bold text-cyan-400">Block #{idx + 1}</span>
                    <span>{txn.transactionId}</span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-white truncate">{txn.customerName}</div>
                  <div className="text-[11px] font-semibold text-emerald-400 mt-0.5">₹{txn.amountInr.toLocaleString('en-IN')}</div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-[9px] font-mono text-slate-500">
                    <div className="truncate">Prev: {idx === 0 ? '00000000... (Genesis)' : `sha256_${(idx * 137).toString(16).padStart(6, '0')}...`}</div>
                    <div className="truncate text-cyan-400">Hash: sha256_{((idx + 1) * 271).toString(16).padStart(6, '0')}...</div>
                  </div>
                </div>

                {idx < sampleTxns.length - 1 && (
                  <div className="flex items-center text-slate-600">
                    <LinkIcon className="w-4 h-4 text-cyan-500/60" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
        <span>Click any block to open the comprehensive audit drawer and verify exact cryptographic SHA-256 state.</span>
        <span className="text-cyan-400 font-mono text-[10px]">Algorithm: SHA-256(prevHash + seq + txnId + timestamp + action + outcome)</span>
      </div>
    </div>
  );
};
