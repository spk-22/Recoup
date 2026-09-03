'use client';

import React, { useEffect, useState } from 'react';
import { fetchExceptions, TransactionItem } from '../lib/api';
import { X, AlertOctagon, RefreshCw, FileText } from 'lucide-react';

interface ExceptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransaction: (txn: TransactionItem) => void;
}

export const ExceptionsDrawer: React.FC<ExceptionsDrawerProps> = ({ isOpen, onClose, onSelectTransaction }) => {
  const [exceptions, setExceptions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchExceptions()
        .then((data) => setExceptions(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Honest Exceptions List</h2>
                <p className="text-xs text-slate-400">Unresolvable transactions & API timeout exceptions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="my-5 space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading exceptions...</span>
              </div>
            ) : exceptions.length === 0 ? (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No active exceptions logged in current batch.
              </div>
            ) : (
              exceptions.map((txn) => {
                const latestLog = txn.auditLogs && txn.auditLogs.length > 0 ? txn.auditLogs[0] : null;

                return (
                  <div
                    key={txn.id}
                    onClick={() => {
                      onClose();
                      onSelectTransaction(txn);
                    }}
                    className="bg-slate-900/90 border border-rose-900/40 hover:border-rose-500/60 p-4 rounded-xl space-y-2 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-rose-400 text-xs">{txn.transactionId}</span>
                        {txn.transactionId === 'txn_injected_api_fail' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-700 rounded">
                            Injected Camera Failure Test
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">({txn.errorReason})</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-200">₹{txn.amountInr.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium">{txn.customerName} ({txn.customerEmail})</div>

                    {latestLog && (
                      <div className="bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg text-xs text-rose-200 leading-relaxed font-mono">
                        <strong className="text-rose-400">Reason: </strong>
                        {latestLog.explanation}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Attempts: {txn.attemptsCount}/3</span>
                      <span className="text-cyan-400 group-hover:underline flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>Inspect Full Audit Log →</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Close Exceptions List
          </button>
        </div>
      </div>
    </div>
  );
};
