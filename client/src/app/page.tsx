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

  const tabs: { id: Tab; label: string; tag: string; icon: any }[] = [
    {
      id: 'overview',
      label: 'Overview',
      tag: 'Executive Summary',
      icon: LayoutDashboard,
    },
    {
      id: 'analytics',
      label: 'Analytics & Simulation',
      tag: 'What-If Modeler & Channels',
      icon: BarChart2,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      tag: 'SHA-256 Ledger',
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

      {/* Main Tab Navigation — Prominent Interactive Button Bar */}
      <div className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-20 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Attention-Attracting Graphic Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/40 border border-cyan-800/40 rounded-xl px-4 py-2">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-bold text-cyan-300 tracking-wide uppercase flex items-center space-x-1">
                <span>Interactive Navigation:</span>
                <span className="text-slate-300 font-normal normal-case">Click a button below to switch dashboard view</span>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Currently Viewing:</span>
              <span className="text-cyan-300 font-bold uppercase">{activeTab === 'overview' ? 'Overview' : activeTab === 'analytics' ? 'Analytics & Simulation' : 'Cryptographic Audit Trail'}</span>
            </div>
          </div>

          {/* Actual Prominent Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1.5 bg-slate-900/90 rounded-2xl border-2 border-slate-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={`group relative flex items-center justify-between px-5 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 border-2 border-cyan-300 ring-2 ring-cyan-400/40 scale-[1.01]'
                      : 'bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border-2 border-slate-700/80 hover:border-cyan-400/80 shadow-md hover:shadow-cyan-500/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-extrabold tracking-tight leading-none">{tab.label}</div>
                      <div className={`text-[10px] font-medium mt-1 ${isActive ? 'text-cyan-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                        {tab.tag}
                      </div>
                    </div>
                  </div>

                  {/* Right side click status/indicator */}
                  {isActive ? (
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white shadow-inner border border-white/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                      <span>ACTIVE</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400 group-hover:text-cyan-300 transition-colors">
                      <span>Select</span>
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  )}
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
