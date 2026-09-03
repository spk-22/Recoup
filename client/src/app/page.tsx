'use client';

import React, { useEffect, useState } from 'react';
import { fetchMetrics, fetchTransactions, MetricsData, TransactionItem } from '../lib/api';
import { DashboardHeader } from '../components/DashboardHeader';
import { SummaryCards } from '../components/SummaryCards';
import { ExecutiveInsights } from '../components/ExecutiveInsights';
import { AdvancedAnalytics } from '../components/AdvancedAnalytics';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { HashChainVisualizer } from '../components/HashChainVisualizer';
import { DisclosureBanner } from '../components/DisclosureBanner';
import { TransactionTable } from '../components/TransactionTable';
import { AuditDrawer } from '../components/AuditDrawer';
import { ExceptionsDrawer } from '../components/ExceptionsDrawer';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);
  const [isExceptionsOpen, setIsExceptionsOpen] = useState<boolean>(false);
  const [auditVerifyResult, setAuditVerifyResult] = useState<any>(null);

  const loadData = async () => {
    try {
      const [metricsRes, txnsRes] = await Promise.all([
        fetchMetrics(),
        fetchTransactions(statusFilter, searchQuery),
      ]);
      setMetrics(metricsRes);
      setTransactions(txnsRes);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans pb-16">
      {/* Top Navigation Header */}
      <DashboardHeader
        onRefresh={loadData}
        onAuditVerifyResult={(res) => setAuditVerifyResult(res)}
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-7">
        {/* Verification Alert Banner if Audit Check Triggered */}
        {auditVerifyResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
              auditVerifyResult.isValid
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">🔐</span>
              <span><strong>Cryptographic Audit Chain Status:</strong> {auditVerifyResult.message}</span>
            </div>
            <button
              onClick={() => setAuditVerifyResult(null)}
              className="text-slate-400 hover:text-white font-bold ml-4 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Executive Metrics Cards */}
        <SummaryCards
          metrics={metrics}
          onOpenExceptions={() => setIsExceptionsOpen(true)}
        />

        {/* 2. Executive Strategic Insights & Takeaways */}
        <ExecutiveInsights metrics={metrics} />

        {/* 3. Multi-Dimensional Deep-Dive Analytics & Plots */}
        <AdvancedAnalytics metrics={metrics} />

        {/* 4. Interactive "What-If" Policy Simulator */}
        <WhatIfSimulator metrics={metrics} />

        {/* 5. Cryptographic Hash-Chain Visualizer */}
        <HashChainVisualizer
          transactions={transactions}
          onSelectTransaction={(txn) => setSelectedTxn(txn)}
        />

        {/* 6. Methodology & Measurement Transparency Banner */}
        <DisclosureBanner />

        {/* 7. Interactive Transaction Table Explorer */}
        <TransactionTable
          transactions={transactions}
          currentStatus={statusFilter}
          onStatusChange={(st) => setStatusFilter(st)}
          onSearchChange={(q) => setSearchQuery(q)}
          onSelectTransaction={(txn) => setSelectedTxn(txn)}
        />
      </main>

      {/* Selected Transaction Cryptographic Audit Drawer */}
      <AuditDrawer
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
      />

      {/* Honest Exceptions List Drawer */}
      <ExceptionsDrawer
        isOpen={isExceptionsOpen}
        onClose={() => setIsExceptionsOpen(false)}
        onSelectTransaction={(txn) => setSelectedTxn(txn)}
      />
    </div>
  );
}
