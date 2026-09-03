'use client';

import React from 'react';
import { TransactionItem, AuditLogItem } from '../lib/api';
import { X, ShieldCheck, CheckCircle2, AlertOctagon, ShieldAlert, Cpu, ArrowRight, Lock } from 'lucide-react';

interface AuditDrawerProps {
  transaction: TransactionItem | null;
  onClose: () => void;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const auditLogs = transaction.auditLogs || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-cyan-400 font-semibold">{transaction.transactionId}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300">
                  {transaction.paymentMethod.toUpperCase()}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">Audit Trail & Explanation Log</h2>
              <p className="text-xs text-slate-400">Customer: {transaction.customerName} ({transaction.customerEmail})</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-3 gap-3 my-5">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Amount</span>
              <div className="text-base font-bold text-white mt-0.5">₹{transaction.amountInr.toLocaleString('en-IN')}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Status</span>
              <div className="text-sm font-semibold text-cyan-400 mt-0.5">{transaction.status}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Attempts</span>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{transaction.attemptsCount} / 3 cap</div>
            </div>
          </div>

          {/* Audit Logs Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cryptographic Hash-Chained Audit Log Records ({auditLogs.length})</span>
            </h3>

            {auditLogs.length === 0 ? (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                No audit records generated yet. Run the recovery agent pipeline to evaluate this transaction.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 font-mono text-[10px] font-bold rounded border border-cyan-800">
                        Seq #{log.sequenceNumber}
                      </span>
                      <span className="font-semibold text-slate-200">{log.actionTaken}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* Machine-Readable Decision Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px] uppercase font-semibold">Detected Signal</span>
                      <span className="text-slate-200 font-mono">{log.detectedSignal}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px] uppercase font-semibold">Root Cause Engine</span>
                      <span className="text-cyan-300 font-medium">{log.rootCause} ({log.classifierSource})</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px] uppercase font-semibold">Policy Rule Fired</span>
                      <span className="text-emerald-400 font-medium">{log.policyRuleFired}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px] uppercase font-semibold">Razorpay API Response</span>
                      <span className="text-amber-300 font-mono">{log.apiCall || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Human-Readable Explanation String */}
                  <div className="bg-cyan-950/30 border border-cyan-900/50 p-3 rounded-lg text-xs text-cyan-200 leading-relaxed">
                    <strong className="text-cyan-400">Agent Explanation: </strong>
                    {log.explanation}
                  </div>

                  {/* Cryptographic SHA-256 Hash Verification Footer */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1 text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Previous Hash:</span>
                      <span className="text-slate-500 truncate max-w-[280px]">{log.previousHash}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400">Current SHA-256 Hash:</span>
                      <span className="text-cyan-400 truncate max-w-[280px]">{log.hash}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Close Audit Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
