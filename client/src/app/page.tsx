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
import { LayoutDashboard, BarChart2, Lock } from 'lucide-react';

type Tab = 'overview' | 'analytics' | 'audit';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);
  const [isExceptionsOpen, setIsExceptionsOpen] = useState<boolean>(false);
  const [auditVerifyResult, setAuditVerifyResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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

  const tabs: { id: Tab; label: string; num: string; subtitle: string; icon: any }[] = [
    {
      id: 'overview',
      num: '01',
      label: 'Overview',
      subtitle: 'Executive Summary & Insights',
      icon: LayoutDashboard,
    },
    {
      id: 'analytics',
      num: '02',
      label: 'Analytics & Simulation',
      subtitle: 'Payment Channels & What-If Modeler',
      icon: BarChart2,
    },
    {
      id: 'audit',
      num: '03',
      label: 'Audit Trail',
      subtitle: 'Cryptographic SHA-256 Ledger',
      icon: Lock,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans pb-16">
      {/* Top Navigation Header */}
      <DashboardHeader
        onRefresh={loadData}
        onAuditVerifyResult={(res) => setAuditVerifyResult(res)}
        auditVerifyResult={auditVerifyResult}
        onDismissAudit={() => setAuditVerifyResult(null)}
      />

      {/* Main Tab Navigation — Prominent Module Selectors */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Platform Modules & Views</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Click tab to switch view
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400/50'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold tracking-tight">
                          {tab.label}
                        </span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {tab.subtitle}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                      isActive
                        ? 'text-cyan-300 bg-cyan-950 border border-cyan-800'
                        : 'text-slate-500 bg-slate-800/50'
                    }`}
                  >
                    {tab.num}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-7">

        {/* ───────── TAB 1: OVERVIEW ───────── */}
        {activeTab === 'overview' && (
          <>
            {/* Verification Alert Banner */}
            {auditVerifyResult && (
              <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
                auditVerifyResult.isValid
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="text-base">🔐</span>
                  <span><strong>Cryptographic Audit Chain Status:</strong> {auditVerifyResult.message}</span>
                </div>
                <button onClick={() => setAuditVerifyResult(null)} className="text-slate-400 hover:text-white font-bold ml-4 text-sm">✕</button>
              </div>
            )}

            {/* Executive Metrics Cards */}
            <SummaryCards metrics={metrics} onOpenExceptions={() => setIsExceptionsOpen(true)} />

            {/* Executive Strategic Insights */}
            <ExecutiveInsights metrics={metrics} />

            {/* All Analytics Stacked Vertically */}
            <AdvancedAnalytics metrics={metrics} />
          </>
        )}

        {/* ───────── TAB 2: ANALYTICS & SIMULATION ───────── */}
        {activeTab === 'analytics' && (
          <>
            {/* Payment Method Cards */}
            <PaymentMethodCards metrics={metrics} />

            {/* What-If Simulator */}
            <WhatIfSimulator metrics={metrics} />
          </>
        )}

        {/* ───────── TAB 3: AUDIT TRAIL ───────── */}
        {activeTab === 'audit' && (
          <>
            {/* Hash Chain Visualizer */}
            <HashChainVisualizer
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTxn(txn)}
            />

            {/* Methodology Disclosure */}
            <DisclosureBanner />

            {/* Transaction Table */}
            <TransactionTable
              transactions={transactions}
              currentStatus={statusFilter}
              onStatusChange={(st) => setStatusFilter(st)}
              onSearchChange={(q) => setSearchQuery(q)}
              onSelectTransaction={(txn) => setSelectedTxn(txn)}
            />
          </>
        )}
      </main>

      {/* Audit Drawer */}
      <AuditDrawer transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />

      {/* Exceptions Drawer */}
      <ExceptionsDrawer
        isOpen={isExceptionsOpen}
        onClose={() => setIsExceptionsOpen(false)}
        onSelectTransaction={(txn) => setSelectedTxn(txn)}
      />
    </div>
  );
}

// ── Inline Payment Method Cards component ──────────────────────────────────
function PaymentMethodCards({ metrics }: { metrics: MetricsData | null }) {
  const ICONS: Record<string, string> = { UPI: '📱', CARD: '💳', NETBANKING: '🏦' };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <h3 className="text-sm font-bold text-white">Payment Method Recovery Efficacy</h3>
        <p className="text-xs text-slate-400 mt-0.5">Recovery rate & revenue retained by payment instrument</p>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(metrics?.paymentMethodBreakdown || []).map((pm, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{ICONS[pm.method] || '💳'}</span>
                <span className="font-bold text-white text-sm">{pm.method}</span>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold bg-cyan-950 text-cyan-400 rounded border border-cyan-800">
                {pm.recoveryRatePct}% Recovery
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recovered / At Risk:</span>
                <span className="font-semibold text-slate-200">{pm.recoveredCount} / {pm.atRiskCount} txns</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${pm.recoveryRatePct}%` }}
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Recovered (₹):</span>
              <span className="font-bold text-emerald-400">₹{pm.recoveredInr.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
        {(metrics?.paymentMethodBreakdown || []).length === 0 && (
          <div className="col-span-3 py-12 text-center text-slate-500 text-sm">
            Run the recovery agent to see payment channel breakdown.
          </div>
        )}
      </div>
    </div>
  );
}
