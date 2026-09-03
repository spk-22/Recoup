'use client';

import React, { useState } from 'react';
import { MetricsData } from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, Filter, Zap, CreditCard, ShieldCheck, TrendingUp, CheckCircle2 } from 'lucide-react';

interface AdvancedAnalyticsProps {
  metrics: MetricsData | null;
}

const ROOT_CAUSE_LABELS: Record<string, string> = {
  bank_timeout: 'Bank Timeout',
  card_declined_by_issuer: 'Card Declined',
  insufficient_funds: 'Insufficient Funds',
  otp_failed: 'OTP Dropped',
  user_cancelled: 'User Cancelled',
  risk_blocked: 'Fraud Shield',
};

const PIE_COLORS = {
  RECOVERED: '#10B981',
  PENDING_NUDGE: '#F59E0B',
  EXCEPTION: '#EF4444',
  FRAUD_EXCLUDED: '#8B5CF6',
  DEGRADED: '#64748B',
};

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ metrics }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'policy' | 'channels'>('overview');

  const rootCauseBarData = (metrics?.rootCauseBreakdown || []).map((item) => ({
    name: ROOT_CAUSE_LABELS[item.reason] || item.reason,
    atRisk: Math.round(item.atRiskInr / 1000),
    recovered: Math.round(item.recoveredInr / 1000),
    ratePct: item.recoveryRatePct,
  }));

  const pieData = [
    { name: 'Recovered', value: metrics?.statusCounts.RECOVERED || 0, color: PIE_COLORS.RECOVERED },
    { name: 'Pending Nudge', value: metrics?.statusCounts.PENDING_NUDGE || 0, color: PIE_COLORS.PENDING_NUDGE },
    { name: 'Exceptions', value: metrics?.statusCounts.EXCEPTION || 0, color: PIE_COLORS.EXCEPTION },
    { name: 'Fraud Shield', value: metrics?.statusCounts.FRAUD_EXCLUDED || 0, color: PIE_COLORS.FRAUD_EXCLUDED },
  ].filter((d) => d.value > 0);

  const funnelData = (metrics?.funnel || []).map((f) => ({
    stage: f.stage.split('. ')[1] || f.stage,
    volume: f.count,
    amountK: Math.round(f.amountInr / 1000),
    dropoff: f.dropoffPct,
  }));

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
      {/* Tab Navigation Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Multi-Dimensional Recovery Analytics</h3>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Root Cause Matrix
          </button>

          <button
            onClick={() => setActiveTab('funnel')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'funnel'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Conversion Funnel
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'policy'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Policy Rule ROI
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'channels'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Payment Channels
          </button>
        </div>
      </div>

      {/* Tab 1: Overview & Root Cause Matrix */}
      {activeTab === 'overview' && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Revenue at Risk vs Recovered by Root Cause (₹ '000s)</span>
              <span className="text-[11px] font-mono text-cyan-400">Total ₹{((metrics?.totalRecoveredInr || 0) / 1000).toFixed(0)}k Recovered</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rootCauseBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                    formatter={(val: number) => [`₹${val}k`, '']}
                  />
                  <Bar dataKey="atRisk" fill="#334155" radius={[4, 4, 0, 0]} name="At Risk (₹k)" />
                  <Bar dataKey="recovered" fill="#00D2FF" radius={[4, 4, 0, 0]} name="Recovered (₹k)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-slate-700 rounded-sm" />
                <span>At-Risk Volume</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-cyan-400 rounded-sm" />
                <span>Recovered by Recoup Agent</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-300">Resolution Status Distribution</span>
              <div className="h-56 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px', color: '#94A3B8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Chargeback Protection:</span>
                <span className="font-bold text-purple-400">₹{(metrics?.chargebackProtectedInr || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Recovery Conversion Funnel */}
      {activeTab === 'funnel' && (
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">End-to-End Recovery Conversion Funnel</h4>
            <p className="text-xs text-slate-400 mt-0.5">Tracking volume and revenue retention across each pipeline stage</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {funnelData.map((stage, idx) => (
              <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                <div className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">Stage 0{idx + 1}</div>
                <div className="text-xs font-bold text-white mt-1">{stage.stage}</div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xl font-bold text-slate-100">{stage.volume} txns</span>
                  <span className="text-xs font-semibold text-cyan-400">₹{stage.amountK}k</span>
                </div>
                {idx > 0 && (
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span>Dropoff / Shielded:</span>
                    <span className="font-semibold text-amber-400">{stage.dropoff}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnelData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="funnelColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00D2FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="stage" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                  formatter={(val: number) => [`${val} Transactions`, '']}
                />
                <Area type="monotone" dataKey="volume" stroke="#00D2FF" fillOpacity={1} fill="url(#funnelColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Policy Rule Performance & ROI */}
      {activeTab === 'policy' && (
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Policy Engine Rule Performance & ROI Matrix</h4>
            <p className="text-xs text-slate-400 mt-0.5">Empirical conversion efficiency for each bounded intervention rule</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Policy Rule Fired</th>
                  <th className="py-3 px-4">Triggered Volume</th>
                  <th className="py-3 px-4">Recovered Txns</th>
                  <th className="py-3 px-4">Recovered Revenue (₹)</th>
                  <th className="py-3 px-4 text-right">Conversion Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(metrics?.policyPerformance || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                      Run recovery agent to generate policy execution telemetry.
                    </td>
                  </tr>
                ) : (
                  metrics?.policyPerformance.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-cyan-300">{p.rule}</td>
                      <td className="py-3 px-4 text-slate-200">{p.triggeredCount}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{p.recoveredCount}</td>
                      <td className="py-3 px-4 font-bold text-white">₹{p.recoveredInr.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          p.conversionRatePct >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          p.conversionRatePct >= 50 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {p.conversionRatePct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Payment Channels (UPI vs Card vs Netbanking) */}
      {activeTab === 'channels' && (
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Payment Method Recovery Efficacy</h4>
            <p className="text-xs text-slate-400 mt-0.5">Recovery rate & revenue retained by payment instrument</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(metrics?.paymentMethodBreakdown || []).map((pm, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
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
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pm.recoveryRatePct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Recovered (₹):</span>
                  <span className="font-bold text-emerald-400">₹{pm.recoveredInr.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
