# Recoup — Explainable Payment-Failure Recovery Agent Implementation Plan

**Track 03: AI Revenue Recovery** | **Project: Recoup**

Recoup is an agentic payment-failure recovery system that ingests degraded payment events, classifies root causes, executes bounded interventions using Razorpay test-mode APIs with strict safety guardrails, and records an unalterable, structured audit trail for every action and exception.

---

## 1. Architecture & Tech Stack

```
 ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
 │ Synthetic Generator  │ ───►  │  Ingestion Pipeline  │ ───►  │  Root-Cause Engine   │
 │ (400 realistic txns) │       │  (Batch API / CSV)   │       │ (Rules + Gemini LLM) │
 └──────────────────────┘       └──────────────────────┘       └──────────┬───────────┘
                                                                          │
                                                                          ▼
 ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
 │ Next.js Dashboard    │ ◄───  │ SQLite Audit DB      │ ◄───  │ Policy & Guardrails  │
 │ Metrics, Audit Trail,│       │ (Prisma ORM)         │       │ (Retry Caps, Fraud,  │
 │ Exceptions Drawer    │       │                      │       │  DNC, IST Hours)     │
 └──────────────────────┘       └──────────────────────┘       └──────────┬───────────┘
                                                                          │
                                                                          ▼
                                                               ┌──────────────────────┐
                                                               │   Execution Layer    │
                                                               │ Razorpay Test-Mode   │
                                                               │ Orders & PaymentLinks│
                                                               └──────────────────────┘
```

### Stack Components:
- **Backend Core**: Node.js + TypeScript + Express (`server/`)
- **Database & ORM**: SQLite + Prisma ORM (`server/prisma/schema.prisma`)
- **Razorpay SDK**: Official `razorpay` npm package with test-mode credentials & resilient mock fallback.
- **LLM Fallback & Copywriter**: Google Gemini API (`@google/genai`) for ambiguous failure classification & dynamic customer nudge personalization.
- **Frontend Dashboard**: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons + Recharts (`client/`)
- **Comms Stub**: `NotificationService` writing simulated SMS/WhatsApp delivery receipts directly into `NudgeLog` audit tables.

---

## 2. Core Modules & Data Models

### Prisma Schema (`server/prisma/schema.prisma`)
```prisma
model Transaction {
  id                      String     @id @default(cuid())
  transactionId           String     @unique
  orderId                 String
  amountInr               Float
  customerId              String
  customerName            String
  customerEmail           String
  customerPhone           String
  paymentMethod           String     // card, upi, netbanking
  attemptTimestamp        DateTime
  errorCode               String     // BAD_REQUEST_ERROR, GATEWAY_ERROR, SERVER_ERROR
  errorReason             String     // insufficient_funds, bank_timeout, card_declined_by_issuer, otp_failed, user_cancelled, risk_blocked, network_drop
  groundTruthRecoverable  Boolean
  customerContactChannel  String     // sms, whatsapp, email
  isFlaggedFraud          Boolean    @default(false)
  status                  String     @default("DEGRADED") // DEGRADED, RECOVERED, PENDING_NUDGE, EXCEPTION, FRAUD_EXCLUDED
  attemptsCount           Int        @default(0)
  lastAttemptAt           DateTime?
  recoveredAmountInr      Float      @default(0)
  auditLogs               AuditLog[]
  nudges                  NudgeLog[]
  createdAt               DateTime   @default(now())
  updatedAt               DateTime   @updatedAt
}

model AuditLog {
  id                  String      @id @default(cuid())
  transactionId       String
  transaction         Transaction @relation(fields: [transactionId], references: [transactionId])
  timestamp           DateTime    @default(now())
  detectedSignal      String
  rootCause           String
  classifierSource    String      // deterministic_rule | llm_fallback
  confidence          Float
  policyRuleFired     String
  actionTaken         String      // retry_payment | send_payment_link | schedule_delayed_nudge | no_action_fraud_excluded | write_off_exception
  apiCall             String?
  apiResponseStatus   String?
  outcome             String      // RECOVERED | PENDING | EXCEPTION | FRAUD_EXCLUDED
  amountRecoveredInr  Float       @default(0)
  explanation         String
  metadata            String?     // JSON string of extended details
}

model NudgeLog {
  id            String      @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [transactionId])
  channel       String
  recipient     String
  messageBody   String
  scheduledFor  DateTime
  sentAt        DateTime?
  status        String      // SENT | SCHEDULED | BLOCKED_DNC
}
```

---

## 3. Detailed Subsystem Specifications

### A. Data Generator (`server/src/generator/generateBatch.ts`)
Generates 400 realistic payment attempts with exact ground-truth labelling:
- **35% Insufficient Funds**: Ground-truth unrecoverable immediately, recoverable via delay nudge (+48h).
- **20% Bank Timeout / Gateway Error**: 95% ground-truth recoverable via auto-retry.
- **15% Card Declined by Issuer**: 80% ground-truth recoverable via payment link nudge (UPI/alt card).
- **10% OTP Failed / Dropped**: 85% ground-truth recoverable via immediate reminder link.
- **10% User Cancelled**: 30% ground-truth recoverable via soft nudge.
- **10% Fraud Risk Flagged**: Ground-truth **0% recoverable** (Strict guardrail: hard stop).
- **Injected Failure Case**: `txn_injected_api_fail` deliberately configured to trigger mid-retry Razorpay test API timeout to prove graceful exception handling.

### B. Root Cause Classifier (`server/src/engine/rootCauseClassifier.ts`)
1. **Deterministic Rule Matrix**:
   - `bank_timeout`, `gateway_timeout`, `SERVER_ERROR` -> `BANK_TIMEOUT`
   - `card_declined_by_issuer`, `insufficient_funds_issuer` -> `CARD_DECLINED`
   - `insufficient_funds` -> `INSUFFICIENT_FUNDS`
   - `otp_failed`, `auth_timeout`, `user_dropped` -> `OTP_AUTH_FAILED`
   - `user_cancelled` -> `USER_CANCELLED`
   - `risk_blocked`, `suspected_fraud` -> `RISK_FRAUD`
2. **LLM Fallback (Gemini API)**: Used when `error_reason` is ambiguous or free-text. Returns structured JSON containing `{ rootCause, confidence, rationale }`.

### C. Policy Engine & Guardrails (`server/src/engine/policyEngine.ts`)

| Root Cause | Policy Action | Guardrails & Bounds |
|---|---|---|
| **Bank Timeout / Server Error** | Auto-retry via Razorpay Orders API | Max 2 retries, 10 min cooldown |
| **Card Declined** | Generate Razorpay Payment Link & nudge | Max 1 nudge, 2h cooldown |
| **Insufficient Funds** | Schedule delayed nudge (+48h) | Max 1 nudge total |
| **OTP Auth Failed** | Immediate reminder with fresh Payment Link | Max 2 nudges, 30 min cooldown |
| **User Cancelled** | Soft nudge after 24h window | Max 1 nudge |
| **Risk / Fraud Flagged** | **Hard Exclusion (DO NOT CONTACT)** | Zero attempts permitted |

**Global Guardrails**:
- IST Comms Window (9:00 AM - 8:00 PM IST enforcement).
- Maximum 3 total recovery actions across all rules per transaction.
- Permanent write-off to Exceptions List once cap is reached.

### D. Execution Layer & Razorpay Integration (`server/src/engine/executionLayer.ts`)
- Calls official `razorpay.orders.create()` and `razorpay.paymentLink.create()`.
- Captures Razorpay response IDs (`order_id`, `plink_id`, `short_url`).
- Handles API exceptions with backoff retry; logs permanent API failures to Audit Exceptions.

### E. Next.js Dashboard (`client/`)
- **Header**: Recoup agent status, Razorpay Test Mode badge, Quick Action buttons (Ingest Batch, Run Pipeline, Inject API Failure, Reset DB).
- **Executive Summary Panel**:
  - Total Revenue at Risk (₹)
  - Recovered Revenue (₹) & Recovery Rate (%)
  - Active Exceptions Count
  - Fraud Excluded Shield Count
- **Root Cause & Recovery Breakdown**: Visual charts comparing Ground Truth vs Actual Recovered.
- **Interactive Transaction Explorer**:
  - Status filters: `ALL`, `RECOVERED`, `PENDING_NUDGE`, `EXCEPTION`, `FRAUD_EXCLUDED`.
  - Detailed Audit Log Drawer for every row showing the complete decision chain.
- **Honest Exceptions List Drawer**: Dedicated audit view explaining why unrecovered transactions failed or were capped.

---

## 4. Verification & Quality Assurance Plan

### Automated Verification
1. **Batch Runner Test (`npm run test:pipeline`)**:
   - Executes batch generation of 400 transactions.
   - Triggers the Recoup agent recovery engine.
   - Asserts precision against `ground_truth_recoverable`.
   - Asserts 100% fraud exclusion for `is_flagged_fraud` rows.
   - Asserts `txn_injected_api_fail` appears cleanly in the Exceptions List with full error traceback.
2. **Dashboard UI Verification**:
   - Run Next.js build (`npm run build`).
   - Launch browser subagent to verify dashboard loads metrics, opens audit drawers, and interacts with action buttons cleanly.

---

## Proposed File Structure

```
d:/recoup/
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── db/
│   │   │   └── client.ts
│   │   ├── engine/
│   │   │   ├── rootCauseClassifier.ts
│   │   │   ├── policyEngine.ts
│   │   │   ├── executionLayer.ts
│   │   │   └── auditLogger.ts
│   │   ├── generator/
│   │   │   └── generateBatch.ts
│   │   ├── services/
│   │   │   ├── razorpayService.ts
│   │   │   ├── notificationService.ts
│   │   │   └── llmService.ts
│   │   ├── routes/
│   │   │   └── api.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── ChartsSection.tsx
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── AuditDrawer.tsx
│   │   │   └── ExceptionsList.tsx
│   │   └── lib/
│   │       └── api.ts
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── package.json
└── README.md
```

---

## User Review Required

> [!IMPORTANT]
> - We will implement a full Express TypeScript backend (`server/`) and Next.js 14 dashboard frontend (`client/`).
> - Razorpay SDK will use official `razorpay` test credentials if provided in `.env`, or a realistic test-mode wrapper if no live keys are configured.
> - Gemini LLM API will be integrated for dynamic nudge drafting and ambiguous failure fallback classification.
