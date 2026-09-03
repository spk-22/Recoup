'use client';

import React, { useState } from 'react';
import { TransactionItem } from '../lib/api';
import { Search, Filter, ShieldAlert, CheckCircle2, Clock, AlertOctagon, FileText, ChevronRight } from 'lucide-react';

interface TransactionTableProps {
  transactions: TransactionItem[];
  currentStatus: string;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onSelectTransaction: (txn: TransactionItem) => void;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  RECOVERED: { label: 'RECOVERED', bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-800/80', icon: CheckCircle2 },
  PENDING_NUDGE: { label: 'PENDING NUDGE', bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-800/80', icon: Clock },
  EXCEPTION: { label: 'EXCEPTION', bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-800/80', icon: AlertOctagon },
  FRAUD_EXCLUDED: { label: 'FRAUD SHIELD', bg: 'bg-purple-950/80', text: 'text-purple-400', border: 'border-purple-800/80', icon: ShieldAlert },
  DEGRADED: { label: 'DEGRADED', bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-800', icon: Clock },
};

const ROOT_CAUSE_LABELS: Record<string, string> = {
  bank_timeout: 'Bank Timeout',
  card_declined_by_issuer: 'Card Declined',
  insufficient_funds: 'Insufficient Funds',
  otp_failed: 'OTP Auth Failed',
  user_cancelled: 'User Cancelled',
  risk_blocked: 'Fraud Shield',
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  currentStatus,
  onStatusChange,
  onSearchChange,
  onSelectTransaction,
}) => {
  const [searchVal, setSearchVal] = useState('');

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearchChange(e.target.value);
  };

  const tabs = [
    { id: 'ALL', label: 'All Txns' },
    { id: 'RECOVERED', label: 'Recovered' },
    { id: 'PENDING_NUDGE', label: 'Pending Nudges' },
    { id: 'EXCEPTION', label: 'Exceptions' },
    { id: 'FRAUD_EXCLUDED', label: 'Fraud Shield' },
  ];

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Header controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                currentStatus === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchInput}
            placeholder="Search txn ID, name, cause..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Transaction ID</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Amount (₹)</th>
              <th className="py-3.5 px-4">Payment Method</th>
              <th className="py-3.5 px-4">Root Cause</th>
              <th className="py-3.5 px-4">Outcome Status</th>
              <th className="py-3.5 px-4">Razorpay Resource</th>
              <th className="py-3.5 px-4 text-right">Audit Trail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  No payment attempts found matching filter. Click "Generate Batch (400 Txns)" to populate dataset.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const badge = STATUS_BADGES[txn.status] || STATUS_BADGES.DEGRADED;
                const BadgeIcon = badge.icon;
                const rzpResource = txn.razorpayOrderId || txn.razorpayPaymentLinkId || 'N/A';

                return (
                  <tr
                    key={txn.id}
                    onClick={() => onSelectTransaction(txn)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-100 flex items-center space-x-1.5">
                      <span>{txn.transactionId}</span>
                      {txn.transactionId === 'txn_injected_api_fail' && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-rose-950 text-rose-400 border border-rose-800 rounded font-sans">
                          Injected Failure Test
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{txn.customerName}</div>
                      <div className="text-[10px] text-slate-500">{txn.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      ₹{txn.amountInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] tracking-wider text-slate-400">
                      {txn.paymentMethod}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {ROOT_CAUSE_LABELS[txn.errorReason] || txn.errorReason}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-400 truncate max-w-[140px]">
                      {rzpResource}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="px-2.5 py-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded flex items-center space-x-1 ml-auto transition-all group-hover:border-cyan-400/50">
                        <FileText className="w-3 h-3" />
                        <span>Audit Log</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
