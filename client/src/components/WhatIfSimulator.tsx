'use client';

import React, { useState } from 'react';
import { MetricsData } from '../lib/api';
import { Sliders, TrendingUp, AlertTriangle, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

interface WhatIfSimulatorProps {
  metrics: MetricsData | null;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ metrics }) => {
  const [retryCap, setRetryCap] = useState<number>(2);
  const [primaryChannel, setPrimaryChannel] = useState<'sms' | 'whatsapp' | 'omnichannel'>('whatsapp');
  const [delayedWindowHours, setDelayedWindowHours] = useState<number>(48);

  const baseRecovered = metrics?.totalRecoveredInr || 2600000;
  const baseAtRisk = metrics?.totalAtRiskInr || 4500000;

  // Calculate simulated uplift
  let upliftMultiplier = 1.0;

  // Retry cap impact
  if (retryCap === 3) upliftMultiplier += 0.04;
  if (retryCap === 1) upliftMultiplier -= 0.06;

  // Channel impact
  if (primaryChannel === 'whatsapp') upliftMultiplier += 0.07;
  if (primaryChannel === 'omnichannel') upliftMultiplier += 0.12;

  // Timing impact
  if (delayedWindowHours === 48) upliftMultiplier += 0.05; // sweet spot
  if (delayedWindowHours === 24) upliftMultiplier -= 0.02;
  if (delayedWindowHours === 72) upliftMultiplier += 0.02;

  const simulatedRecovered = Math.round(baseRecovered * upliftMultiplier);
  const simulatedRate = baseAtRisk > 0 ? (simulatedRecovered / baseAtRisk) * 100 : 0;
  const deltaRevenue = simulatedRecovered - baseRecovered;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Interactive Policy "What-If" Scenario Modeler</h3>
            <p className="text-xs text-slate-400">Simulate revenue impact under altered policy bounds and channel dynamics</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80 self-start sm:self-auto font-mono">
          Interactive Triage Playground
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Retry Cap */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Auto-Retry Attempt Cap
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  onClick={() => setRetryCap(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    retryCap === val
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val} {val === 1 ? 'Retry' : 'Retries'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Current policy: <strong>2 retries</strong> with 10m cooldown.
            </p>
          </div>

          {/* 2. Communication Channel */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Nudge Channel Priority
            </label>
            <div className="flex flex-col space-y-1.5">
              {[
                { id: 'sms', label: 'SMS Only' },
                { id: 'whatsapp', label: 'WhatsApp + Rich Link' },
                { id: 'omnichannel', label: 'Omnichannel (WA + SMS)' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setPrimaryChannel(ch.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium text-left transition-all ${
                    primaryChannel === ch.id
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Delay Window */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Insufficient Funds Delay
            </label>
            <div className="flex items-center space-x-2">
              {[24, 48, 72].map((hours) => (
                <button
                  key={hours}
                  onClick={() => setDelayedWindowHours(hours)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    delayedWindowHours === hours
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  +{hours}h
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Aligns outreach with customer salary replenishment cycles.
            </p>
          </div>
        </div>

        {/* Projected Outcome Metric Card */}
        <div className="bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-500/30 p-5 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Simulated Projected Recovery</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white">₹{simulatedRecovered.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-300 font-semibold mt-0.5">
                {simulatedRate.toFixed(1)}% Recovery Rate
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Projected Delta vs Base:</span>
              <span className={`font-bold font-mono ${deltaRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {deltaRevenue >= 0 ? `+₹${deltaRevenue.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaRevenue).toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Customer Drop-off Risk:</span>
              <span className={`font-semibold ${retryCap === 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {retryCap === 3 ? 'Moderate (Retry Rate Limit Risk)' : 'Low (Safe Bounded Zone)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
