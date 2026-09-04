# Recoup — Explainable Payment-Failure Recovery Agent

>[!TIP]
> ### 🌐 Live Production Deployment
>
> **Try the fully functional agent and dashboard:**  
>
> **👉 [Recoup — Explainable Payment-Failure Recovery Agent](https://recoup-production-5da8.up.railway.app/)**  
>
> *(Pre-seeded with 400 transactions, live Razorpay test-mode integration, and verified cryptographic audit trail)*
---
**Recoup** is an autonomous, explainable payment-failure recovery agent built for Razorpay checkout failures. It ingests degraded payment attempt events, enforces a hard fraud exclusion gate, classifies root causes, executes bounded recovery actions using Razorpay test-mode APIs, simulates customer response completion for payment link nudges, and records a cryptographically hash-chained append-only audit trail for every action and exception.

---



## 1. System Architecture

```
 ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
 │ Synthetic Generator  │ ───►  │ Hard Fraud Gate      │ ───►  │  Root-Cause Engine   │
 │ (400 realistic txns) │       │ (isFlaggedFraud?     │       │ (Rules + Gemini LLM  │
 └──────────────────────┘       │  Hard STOP & log)    │       │  fallback)           │
                                └──────────────────────┘       └──────────┬───────────┘
                                                                          │
                                                                          ▼
 ┌──────────────────────┐       ┌──────────────────────────┐       ┌──────────────────────┐
 │ Next.js Dashboard    │ ◄───  │ Serialized Cryptographic │ ◄───  │ Policy Engine        │
 │ Metrics, Audit Trail,│       │ Hash Chain Audit DB      │       │ (Retry Caps, DNC,    │
 │ Exceptions Drawer    │       │ (In-Memory Mutex)        │       │  IST 9am-8pm Window) │
 └──────────────────────┘       └──────────────────────────┘       └──────────┬───────────┘
                                                                              │
                                                                              |
                                                                              ▼
 ┌──────────────────────┐                                      ┌──────────────────────┐
 │ Customer Response    │ ◄─────────────────────────────────── │ Razorpay Execution   │
 │ Simulator (Nudges)   │                                      │ (Orders & Payment    │
 └──────────────────────┘                                      │  Links with Keys)    │
                                                               └──────────────────────┘
```

---

## 2. Policy Engine & Safety Guardrails Matrix

| Root Cause | Policy Action | Guardrail & Bound Rules |
|---|---|---|
| **Bank Timeout / Gateway Error** | Direct Auto-Retry via Razorpay Orders API | Max 2 retries, 10 min cooldown |
| **Card Declined by Issuer** | Generate Payment Link Nudge (suggest UPI/alt card) | Max 1 nudge, wait 2h before alt channel |
| **Insufficient Funds** | Schedule Delayed Nudge (+48h) | Max 1 nudge total |
| **OTP Auth Failed / Dropped** | Immediate Reminder with fresh Payment Link | Max 2 nudges, 30 min cooldown |
| **User Cancelled** | Soft Nudge after 24h window | Max 1 soft nudge |
| **Risk / Fraud Flagged** | **Hard Fraud Exclusion Gate (Step 0)** | **Zero contact permitted. Hard STOP.** |

### Key Safety Guardrails:
- **Step 0 Hard Fraud Shield**: Executed before classification or policy evaluation. 100% of risk-flagged transactions are locked out immediately to prevent chargebacks.
- **IST Comms Window**: Strict 9:00 AM – 8:00 PM IST working hours enforcement.
- **Max Attempt Cap**: Hard ceiling of 3 total recovery attempts per transaction.
- **Single-Writer Mutex Queue**: Serialized audit logger prevents SHA-256 hash-chain race conditions during parallel batch execution.
- **Single Source of Truth Revenue Summation**: Revenue is computed via `SUM(Transaction.recoveredAmountInr)` on resolved transaction states to prevent double-counting.

---

## 3. Quantitative Results & Benchmarks

Detailed mathematical metrics, confusion matrices, and recovery rates are documented in **[`RESULTS.md`](RESULTS.md)**.

- **Total Revenue Recovered**: **₹26,81,477** out of ₹45,21,600 at-risk (59.3% recovery rate).
- **Classification F1-Score vs Ground Truth**: **95.10%** (Precision: 98.24%, Recall: 92.15%).
- **Fraud Exclusion Accuracy**: **100.0%** (₹3,84,120 in chargeback liability prevented).
- **Cryptographic Audit Integrity**: **100%** (400/400 blocks verified with zero broken links).

---

## 4. LLM Fallback & API Key Configuration

Recoup uses a **hybrid AI approach**:
- **Deterministic Rule Engine (~85% cases)**: Fast, instant mapping for known Razorpay error taxonomy.
- **Google Gemini LLM Fallback**: Used for free-text or ambiguous error payloads and dynamic customer nudge copywriting.
- **Zero-Config Resilience**: If `GEMINI_API_KEY` is provided in `.env`, the agent calls Gemini (`@google/generative-ai`); if no key is provided, it gracefully falls back to deterministic rule triage so the application runs **100% out-of-the-box**.

---

## 5. Quick Start & Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/spk-22/Recoup.git
cd Recoup

# Option A: Install all dependencies in 1 command (Workspaces)
npm install

# Option B: Install manually in each workspace
cd server
npm install
cd ../client
npm install
```

### 2. Initialize Database & Run Test Suite
```bash
# Push Prisma SQLite Schema (creates local dev.db and generates Prisma Client)
cd server
npx prisma db push

# Run End-to-End Pipeline & Cryptographic Verification Test
npm run test:pipeline
```

### 3. Launch Development Servers
Open two terminal windows:

**Terminal 1 (Backend API - Port 4000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Dashboard - Port 3000):**
```bash
cd client
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---


## 6. Operating the Dashboard

1. **Click "Generate Batch (400 Txns)"**: Ingests 400 realistic payment failures with ground truth labels and root causes.
2. **Click "Run Recovery Agent"**: Executes the 5-stage pipeline (Fraud Gate → Classifier → Policy Matrix → Razorpay APIs → Customer Simulator) with real-time countdown, stage breadcrumbs, and live timer.
3. **Click "Verify Hash Chain"**: Cryptographically verifies the append-only SHA-256 audit trail from Genesis to the latest block.
4. **Click any row**: Inspects the complete decision chain, policy rule fired, Razorpay API response, and machine/human explanation.
5. **Click "Honest Exceptions"**: Views unresolvable failures and the deliberately injected camera failure test (`txn_injected_api_fail`).

[![Razorpay AI Buildathon](https://img.shields.io/badge/Razorpay_AI_Buildathon-Track_03:_AI_Revenue_Recovery-blue?style=for-the-badge&logo=razorpay)](https://razorpay.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma SQLite](https://img.shields.io/badge/Prisma_SQLite-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
