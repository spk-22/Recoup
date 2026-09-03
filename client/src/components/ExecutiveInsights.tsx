'use client';

import React from 'react';
import { MetricsData } from '../lib/api';
import { Sparkles, TrendingUp, ShieldAlert, ArrowUpRight, Clock, CheckCircle, Lightbulb } from 'lucide-react';

interface ExecutiveInsightsProps {
  metrics: MetricsData | null;
}

export const ExecutiveInsights: React.FC<ExecutiveInsightsProps> = ({ metrics }) => {
  const insights = metrics?.automatedInsights || [];

  if (insights.length === 0) return null;

  const typeConfig: Record<string, { bg: string; border: string; text: string; icon: any }> = {
    high_roi: { bg: 'bg-emerald-950/40', border: 'border-emerald-500/40', text: 'text-emerald-400', icon: TrendingUp },
    risk_guardrail: { bg: 'bg-purple-950/40', border: 'border-purple-500/40', text: 'text-purple-400', icon: ShieldAlert },
    conversion_boost: { bg: 'bg-cyan-950/40', border: 'border-cyan-500/40', text: 'text-cyan-400', icon: ArrowUpRight },
    timing_strategy: { bg: 'bg-amber-950/40', border: 'border-amber-500/40', text: 'text-amber-400', icon: Clock },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
              <span>Executive Strategic Insights & Empirical Takeaways</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                AI Agent Analysis
              </span>
            </h2>
          </div>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline-block">
          Derived from current batch execution & ground-truth telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((item, idx) => {
          const config = typeConfig[item.type] || typeConfig.high_roi;
          const Icon = config.icon;

          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${config.bg} ${config.border} backdrop-blur-md flex flex-col justify-between space-y-3 transition-all hover:scale-[1.01] hover:shadow-lg`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.bg} ${config.text} ${config.border}`}>
                    <Icon className="w-3 h-3" />
                    <span>{item.badge}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                </div>
                <h3 className="text-xs font-bold text-white mt-2.5">{item.title}</h3>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed font-normal">
                  {item.observation}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80">
                <div className="flex items-start space-x-1.5 text-[10px] text-cyan-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">Policy Takeaway: </span>
                    <span>{item.recommendation}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
