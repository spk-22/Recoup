'use client';

import React from 'react';
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
} from 'recharts';

interface ChartsSectionProps {
  metrics: MetricsData | null;
}

const REASON_LABELS: Record<string, string> = {
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

export const ChartsSection: React.FC<ChartsSectionProps> = ({ metrics }) => {
  const barData = (metrics?.rootCauseBreakdown || []).map((item) => ({
    name: REASON_LABELS[item.reason] || item.reason,
    atRisk: Math.round(item.atRiskInr / 1000), // in Thousands ₹
    recovered: Math.round(item.recoveredInr / 1000),
  }));

  const pieData = [
    { name: 'Recovered', value: metrics?.statusCounts.RECOVERED || 0, color: PIE_COLORS.RECOVERED },
    { name: 'Pending Nudge', value: metrics?.statusCounts.PENDING_NUDGE || 0, color: PIE_COLORS.PENDING_NUDGE },
    { name: 'Exceptions', value: metrics?.statusCounts.EXCEPTION || 0, color: PIE_COLORS.EXCEPTION },
    { name: 'Fraud Shield', value: metrics?.statusCounts.FRAUD_EXCLUDED || 0, color: PIE_COLORS.FRAUD_EXCLUDED },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Root Cause Revenue Recovery Bar Chart */}
      <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white tracking-wide">Revenue Recovery by Root Cause (₹ '000s)</h3>
            <span className="text-xs text-slate-400">At-Risk vs Recovered</span>
          </div>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                  formatter={(val: number) => [`₹${val}k`, 'Revenue']}
                />
                <Bar dataKey="atRisk" fill="#334155" radius={[4, 4, 0, 0]} name="At Risk (₹k)" />
                <Bar dataKey="recovered" fill="#00D2FF" radius={[4, 4, 0, 0]} name="Recovered (₹k)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 mt-2">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-slate-700 rounded-sm" />
            <span>At-Risk Revenue</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-cyan-400 rounded-sm" />
            <span>Recovered Revenue</span>
          </div>
        </div>
      </div>

      {/* Status Distribution Pie Chart */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide mb-2">Outcome Status Distribution</h3>
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }} />
                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-xs text-center text-slate-400 mt-2">
          Total: {metrics?.totalTransactions || 0} payment attempts evaluated
        </p>
      </div>
    </div>
  );
};
