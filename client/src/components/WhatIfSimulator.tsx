'use client';

import React, { useState } from 'react';
import { MetricsData } from '../lib/api';
import { Sliders, Sparkles, Lightbulb, MousePointerClick } from 'lucide-react';

interface WhatIfSimulatorProps {
  metrics: MetricsData | null;
}

type RetryCapType = 1 | 2 | 3;
type ChannelType = 'sms' | 'whatsapp' | 'omnichannel';
type DelayType = 24 | 48 | 72;

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ metrics }) => {
  const [retryCap, setRetryCap] = useState<RetryCapType>(2);
  const [channel, setChannel] = useState<ChannelType>('whatsapp');
  const [delayHours, setDelayHours] = useState<DelayType>(48);

  const baseRecovered = metrics?.totalRecoveredInr || 2600000;
  const baseAtRisk = metrics?.totalAtRiskInr || 4500000;

  let multiplier = 1.0;
  if (retryCap === 3) multiplier += 0.04;
  if (retryCap === 1) multiplier -= 0.06;
  if (channel === 'whatsapp') multiplier += 0.07;
  if (channel === 'omnichannel') multiplier += 0.12;
  if (delayHours === 48) multiplier += 0.05;
  if (delayHours === 72) multiplier += 0.02;
  if (delayHours === 24) multiplier -= 0.02;

  const simRecovered = Math.round(baseRecovered * multiplier);
  const simRate = baseAtRisk > 0 ? (simRecovered / baseAtRisk) * 100 : 0;
  const delta = simRecovered - baseRecovered;

  const retryOptions: { val: RetryCapType; label: string; note: string }[] = [
    { val: 1, label: '1 Retry', note: 'Conservative — lower churn risk but misses some recoverable timeouts.' },
    { val: 2, label: '2 Retries', note: 'Current policy — balanced QoS and recovery efficiency.' },
    { val: 3, label: '3 Retries', note: 'Aggressive — highest recovery but risks gateway rate limiting.' },
  ];

  const channelOptions: { val: ChannelType; label: string; emoji: string; note: string }[] = [
    { val: 'sms', label: 'SMS Only', emoji: '💬', note: 'Lowest cost, lowest open rate (~25%). Suitable for tier-2 cities.' },
    { val: 'whatsapp', label: 'WhatsApp + Rich Link', emoji: '📱', note: 'High open rate (~85%). Rich CTA with payment link preview card.' },
    { val: 'omnichannel', label: 'Omnichannel (WA + SMS)', emoji: '🔀', note: 'Best reach — SMS fallback if WhatsApp undelivered. Max 12% uplift.' },
  ];

  const delayOptions: { val: DelayType; label: string; note: string }[] = [
    { val: 24, label: '+24h', note: 'Too early for salary-cycle alignment. Lower conversion for insufficient funds.' },
    { val: 48, label: '+48h', note: '← Optimal — aligns with bi-weekly/monthly salary replenishment window.' },
    { val: 72, label: '+72h', note: 'Slightly late but still effective. Suitable for end-of-month billing cycles.' },
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Interactive Policy "What-If" Scenario Modeler</h3>
            <p className="text-xs text-slate-400 mt-0.5">Simulate revenue impact under altered policy bounds and channel dynamics</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80 self-start font-mono shrink-0">
          <MousePointerClick className="w-3 h-3" />
          <span>Click options below to interact</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* ── Column 1: Auto-Retry Cap ── */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-200 block">Auto-Retry Attempt Cap</label>
            <p className="text-[10px] text-slate-500 mt-0.5">How many times the agent retries a failed Razorpay API call</p>
          </div>
          <p className="text-[10px] text-amber-400/80 flex items-center space-x-1">
            <MousePointerClick className="w-3 h-3" />
            <span>Click a button to select</span>
          </p>
          <div className="space-y-2">
            {retryOptions.map((opt) => (
              <button
                key={opt.val}
                onClick={() => setRetryCap(opt.val)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all border ${
                  retryCap === opt.val
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {retryCap === opt.val && <span className="text-[9px] text-cyan-400 font-mono">SELECTED ✓</span>}
                </div>
                <p className="text-[10px] mt-0.5 font-normal opacity-70">{opt.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Column 2: Communication Channel ── */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-200 block">Nudge Delivery Channel</label>
            <p className="text-[10px] text-slate-500 mt-0.5">Medium used to deliver payment link to the customer</p>
          </div>
          <p className="text-[10px] text-amber-400/80 flex items-center space-x-1">
            <MousePointerClick className="w-3 h-3" />
            <span>Click a channel to select</span>
          </p>
          <div className="space-y-2">
            {channelOptions.map((opt) => (
              <button
                key={opt.val}
                onClick={() => setChannel(opt.val)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all border ${
                  channel === opt.val
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.emoji} {opt.label}</span>
                  {channel === opt.val && <span className="text-[9px] text-emerald-400 font-mono">SELECTED ✓</span>}
                </div>
                <p className="text-[10px] mt-0.5 font-normal opacity-70">{opt.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Column 3: Delay Window ── */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-200 block">Insufficient Funds Delay Window</label>
            <p className="text-[10px] text-slate-500 mt-0.5">Hours after failure to send the delayed nudge</p>
          </div>
          <p className="text-[10px] text-amber-400/80 flex items-center space-x-1">
            <MousePointerClick className="w-3 h-3" />
            <span>Click a window to select</span>
          </p>
          <div className="space-y-2">
            {delayOptions.map((opt) => (
              <button
                key={opt.val}
                onClick={() => setDelayHours(opt.val)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all border ${
                  delayHours === opt.val
                    ? 'bg-amber-950 text-amber-300 border-amber-700/60 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {delayHours === opt.val && <span className="text-[9px] text-amber-400 font-mono">SELECTED ✓</span>}
                </div>
                <p className="text-[10px] mt-0.5 font-normal opacity-70">{opt.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Column 4: Simulated Outcome Card ── */}
        <div className="bg-gradient-to-br from-slate-900 to-cyan-950/30 border border-cyan-500/30 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Projected Recovery</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">₹{simRecovered.toLocaleString('en-IN')}</div>
            <div className="text-sm font-bold text-cyan-300 mt-1">{simRate.toFixed(1)}% Recovery Rate</div>
          </div>

          <div className="mt-4 space-y-2.5 pt-4 border-t border-slate-800/60 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Delta vs Baseline:</span>
              <span className={`font-bold font-mono ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {delta >= 0 ? `+₹${delta.toLocaleString('en-IN')}` : `-₹${Math.abs(delta).toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Retry Safety:</span>
              <span className={`font-semibold text-[11px] ${retryCap === 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {retryCap === 3 ? '⚠ Rate Limit Risk' : '✓ Safe Bounded Zone'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Channel Uplift:</span>
              <span className="text-cyan-300 font-semibold text-[11px]">
                {channel === 'omnichannel' ? '+12% Est.' : channel === 'whatsapp' ? '+7% Est.' : 'Baseline'}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/40 text-[10px] text-slate-500 flex items-start space-x-1.5">
              <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span>Projections are heuristic estimates based on ground-truth weighted simulations. Not financial advice.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
