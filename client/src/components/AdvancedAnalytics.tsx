'use client';

import React from 'react';
import { MetricsData } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface AdvancedAnalyticsProps {
  metrics: MetricsData | null;
}

const ROOT_CAUSE_LABELS: Record<string, string> = {
  bank_timeout: 'Bank Timeout',
  card_declined_by_issuer: 'Card Declined',
  insufficient_funds: 'Insuf. Funds',
  otp_failed: 'OTP Dropped',
  user_cancelled: 'Cancelled',
  risk_blocked: 'Fraud Shield',
};

const PIE_COLORS: Record<string, string> = {
  RECOVERED: '#10B981',
  PENDING_NUDGE: '#F59E0B',
  EXCEPTION: '#EF4444',
  FRAUD_EXCLUDED: '#8B5CF6',
  DEGRADED: '#64748B',
};

const SECTION_HEADER = (title: string, subtitle: string) => (
  <div className="mb-4">
    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h4>
    <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
  </div>
);

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ metrics }) => {
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
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-white tracking-wide">Multi-Dimensional Recovery Analytics</h3>
      </div>

      {/* ─── SECTION 1: Root Cause Matrix ─── */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        {SECTION_HEADER('Root Cause Matrix', 'Revenue at Risk vs Recovered by failure root-cause (₹ \'000s)')}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rootCauseBarData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F1F5F9' }}
                    itemStyle={{ color: '#F8FAFC', fontWeight: 600 }}
                    labelStyle={{ color: '#38BDF8', fontWeight: 700 }}
                    formatter={(val: number) => [`₹${val}k`, '']}
                  />
                  <Bar dataKey="atRisk" fill="#334155" radius={[4, 4, 0, 0]} name="At Risk (₹k)" />
                  <Bar dataKey="recovered" fill="#00D2FF" radius={[4, 4, 0, 0]} name="Recovered (₹k)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 pt-3 border-t border-slate-800/60 mt-3">
              <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-slate-700 rounded-sm" /><span>At-Risk Volume</span></div>
              <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-cyan-400 rounded-sm" /><span>Recovered by Agent</span></div>
            </div>
          </div>
          <div className="flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-2">Resolution Status Distribution</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F1F5F9' }}
                    itemStyle={{ color: '#F8FAFC', fontWeight: 600 }}
                    labelStyle={{ color: '#38BDF8', fontWeight: 700 }}
                  />
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

        {/* Root-cause recovery rate table inline */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-2 pr-4">Root Cause</th>
                <th className="pb-2 pr-4 text-right">At-Risk Txns</th>
                <th className="pb-2 pr-4 text-right">Recovered</th>
                <th className="pb-2 pr-4 text-right">At-Risk ₹</th>
                <th className="pb-2 text-right">Recovery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {(metrics?.rootCauseBreakdown || []).map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/20">
                  <td className="py-2 pr-4 font-medium text-slate-200">{ROOT_CAUSE_LABELS[r.reason] || r.reason}</td>
                  <td className="py-2 pr-4 text-right font-mono">{r.atRiskCount}</td>
                  <td className="py-2 pr-4 text-right font-mono text-emerald-400 font-bold">{r.recoveredCount}</td>
                  <td className="py-2 pr-4 text-right font-mono">₹{Math.round(r.atRiskInr / 1000)}k</td>
                  <td className="py-2 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.recoveryRatePct >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      r.recoveryRatePct >= 50 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                      'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {r.recoveryRatePct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(metrics?.rootCauseBreakdown || []).length === 0 && (
            <p className="text-center text-slate-500 text-xs py-6">Run the recovery agent to generate root-cause data.</p>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: Conversion Funnel ─── */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        {SECTION_HEADER('Conversion Funnel', 'Stage-by-stage transaction volume and ₹ revenue retention through the full pipeline')}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {funnelData.map((stage, idx) => (
            <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] font-mono text-cyan-400 font-semibold">Stage 0{idx + 1}</div>
              <div className="text-xs font-bold text-white mt-1">{stage.stage}</div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-100">{stage.volume}</span>
                <span className="text-xs font-semibold text-cyan-400">₹{stage.amountK}k</span>
              </div>
              {idx > 0 && (
                <div className="mt-2 text-[10px] text-slate-400 flex justify-between pt-1.5 border-t border-slate-800">
                  <span>Dropoff/Shielded:</span>
                  <span className="font-semibold text-amber-400">{stage.dropoff}%</span>
                </div>
              )}
            </div>
          ))}
          {funnelData.length === 0 && (
            <div className="col-span-4 py-8 text-center text-slate-500 text-xs">Run the recovery agent to see conversion funnel.</div>
          )}
        </div>
        {funnelData.length > 0 && (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnelData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00D2FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="stage" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F1F5F9' }}
                  itemStyle={{ color: '#F8FAFC', fontWeight: 600 }}
                  labelStyle={{ color: '#38BDF8', fontWeight: 700 }}
                  formatter={(v: number) => [`${v} Txns`, 'Volume']}
                />
                <Area type="monotone" dataKey="volume" stroke="#00D2FF" fillOpacity={1} fill="url(#funnelGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── SECTION 3: Policy Rule ROI ─── */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        {SECTION_HEADER('Policy Rule ROI', 'Empirical conversion efficiency and revenue attribution per bounded intervention rule')}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Policy Rule Fired</th>
                <th className="py-3 px-4">Triggered</th>
                <th className="py-3 px-4">Recovered</th>
                <th className="py-3 px-4">Recovered (₹)</th>
                <th className="py-3 px-4 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {(metrics?.policyPerformance || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">Run recovery agent to generate policy execution telemetry.</td>
                </tr>
              ) : (
                metrics?.policyPerformance.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-cyan-300">{p.rule}</td>
                    <td className="py-3 px-4 text-slate-200">{p.triggeredCount}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{p.recoveredCount}</td>
                    <td className="py-3 px-4 font-bold text-white">₹{p.recoveredInr.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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

      {/* ─── SECTION 4: Payment Channels (in overview context) ─── */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        {SECTION_HEADER('Payment Channels', 'Recovery rate and revenue retained by payment instrument (UPI, Card, Netbanking)')}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(metrics?.paymentMethodBreakdown || []).length === 0 ? (
            <div className="col-span-3 py-8 text-center text-slate-500 text-xs">Run the recovery agent to see payment channel data.</div>
          ) : (
            metrics?.paymentMethodBreakdown.map((pm, i) => {
              const icons: Record<string, string> = { UPI: '📱', CARD: '💳', NETBANKING: '🏦' };
              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{icons[pm.method] || '💳'}</span>
                      <span className="font-bold text-white text-sm">{pm.method}</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-bold bg-cyan-950 text-cyan-400 rounded border border-cyan-800">
                      {pm.recoveryRatePct}% Rec.
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{pm.recoveredCount} / {pm.atRiskCount} txns</span>
                      <span className="text-emerald-400 font-bold">₹{(pm.recoveredInr / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full" style={{ width: `${pm.recoveryRatePct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
