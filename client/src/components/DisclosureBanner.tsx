'use client';

import React from 'react';
import { Info, ExternalLink } from 'lucide-react';

export const DisclosureBanner: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-300">
      <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="flex items-center space-x-2 font-semibold text-slate-100">
          <span>Methodology & Measurement Disclosure</span>
          <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded border border-cyan-800/60 font-mono">
            Track 03 Submission
          </span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          <strong className="text-slate-200">1. Synchronous Auto-Retries (Bank Timeout):</strong> Executed live against Razorpay test-mode Orders API (<code className="text-cyan-300">razorpay.orders.create</code>). Outcomes reflect real test API execution results.<br />
          <strong className="text-slate-200">2. Payment Link Nudges (Card Declined, OTP, Insufficient Funds):</strong> Razorpay Payment Links (<code className="text-cyan-300">razorpay.paymentLink.create</code>) are created live in test mode. Since no real customer exists in a synthetic batch, conversion outcomes are evaluated by the <strong className="text-cyan-300">Customer Response Simulator</strong> weighted by ground-truth probability.
        </p>
      </div>
    </div>
  );
};
