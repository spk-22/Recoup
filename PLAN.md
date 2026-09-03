# Recoup — Explainable Payment-Failure Recovery Agent (Track 03)

## Architecture Overview
Recoup is an agentic payment-failure recovery system. It ingests degraded payment events, enforces a hard fraud gate, classifies root causes, executes bounded interventions using Razorpay test-mode APIs, simulates customer response completion for payment link nudges, and records a cryptographically hash-chained append-only audit trail.

## Tech Stack
- Backend: Node.js + Express + TypeScript (`server/`)
- DB: SQLite + Prisma ORM (`server/prisma/schema.prisma`)
- Razorpay SDK: official `razorpay` npm package
- LLM: Google Gemini API (`@google/genai`) for free-text fallback classification & nudge copy
- Frontend: Next.js 14 + Tailwind CSS + Lucide Icons + Recharts (`client/`)

## Root-Cause & Policy Matrix

| Root Cause | Action | Policy Rules & Guardrails |
|---|---|---|
| Bank Timeout / Gateway Error | Direct Auto-Retry | Razorpay Orders API, max 2 retries, 10 min cooldown |
| Card Declined | Payment Link Nudge | Suggest UPI/alt card, max 1 nudge, wait 2h before alt channel |
| Insufficient Funds | Delayed Nudge | Scheduled +48h, max 1 nudge total |
| OTP Auth Failed | Immediate Reminder | Fresh Payment Link, max 2 nudges, 30 min cooldown |
| User Cancelled | Soft Nudge | Wait 24h window, max 1 soft nudge |
| Fraud / Risk Flagged | **Hard Fraud Exclusion Gate** | **Step 0 Hard STOP — Never contactable** |

## Key Guardrails & Audit Rules
- Hard Fraud Gate runs at Step 0 before classifier or policy evaluation.
- Working Hours Enforcement (9 AM - 8 PM IST).
- Single-Writer Async Mutex (`AuditWriterQueue`) for SHA-256 hash-chaining across audit log entries.
- Revenue metrics calculated strictly via `SUM(Transaction.recoveredAmountInr)`.
- Deliberate injected failure transaction (`txn_injected_api_fail`) logged to Exceptions List.
