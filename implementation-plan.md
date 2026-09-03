# Razorpay AI Buildathon — Implementation Plan
## Track 03: AI Revenue Recovery
## Project: "Recoup" — Explainable Payment-Failure Recovery Agent

---

## 0. The problem, stated precisely

Every payments platform loses revenue in a specific, repeatable pattern:

1. A payment attempt **degrades or fails** (bank timeout, card declined, insufficient funds, OTP drop, gateway error).
2. The merchant **does nothing**, or does something generic (a blanket "complete your payment" email, sent to everyone, on no schedule, with no reasoning).
3. Some of that revenue was recoverable with the *right* nudge at the *right* time — a retry, a different payment method, a reminder — and some wasn't (fraud, genuine no-funds, buyer's remorse). Nobody separates the two.

**Recoup is an agent that closes this loop end-to-end**: it ingests a batch of at-risk revenue events, diagnoses *why* each one failed, decides the *one* bounded intervention most likely to recover it, executes that intervention against Razorpay's test-mode APIs, and reports — honestly, with an audit trail — how much money it got back and what it couldn't fix and why.

This is the whole submission. Not three loss types. **One loss type, done completely**, with room to gesture at more in the "what's next" section of your pitch.

---

## 1. Exact scope (what you are building, nothing vaguer)

**In scope (build this):**
- Loss type: **failed/degraded card & UPI payment attempts** at checkout (the "Payment degradation → root cause → recovery action" example direction from the track).
- Synthetic batch of 300–500 realistic at-risk transactions (schema below).
- Root-cause classifier: buckets every failure into one of ~6 causes.
- Policy engine: deterministic rule table (not just an LLM) that maps root cause + context → one of 4 bounded actions.
- Execution: real calls against **Razorpay test-mode APIs** (Orders, Payment Links, Payments) — not just simulated in a database.
- Guardrails: max-retry caps, cooldown windows, do-not-contact rules, working-hours-only comms, fraud-flag exclusion.
- Full structured audit trail per transaction, queryable in a dashboard.
- One deliberately injected failure (e.g., Razorpay API timeout mid-retry) handled gracefully on camera.
- A results dashboard reporting ₹ at risk, ₹ recovered, recovery rate, root-cause breakdown, and an **honest exceptions list**.

**Explicitly out of scope (mention as roadmap, don't build):**
- B2B receivables / promise-to-pay tracking
- Mandate retry sequencing
- Hinglish voice recovery
- Real SMS/WhatsApp delivery (stub it — see §4)

Judges will respect a narrow, fully-executed slice far more than five half-built loss types. The track description itself says "don't just identify the problem" — the money-recovered number is what they're grading.

---

## 2. System architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Data Generator   │──▶ │  Ingestion Layer  │──▶ │ Root-Cause Engine   │
│  (synthetic batch) │    │ (batch runner /   │    │ (rules + LLM        │
│                    │    │  Razorpay webhook  │    │  fallback for       │
│                    │    │  simulator)        │    │  ambiguous cases)   │
└─────────────────┘     └──────────────────┘     └──────────┬─────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │   Policy Engine      │
                                                   │ (deterministic rule  │
                                                   │  table + guardrails: │
                                                   │  retry caps, cooldown│
                                                   │  DNC, work hours)    │
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │  Execution Layer     │
                                                   │ - Retry via Orders/  │
                                                   │   Payment Link API   │
                                                   │ - Nudge via stub     │
                                                   │   comms service      │
                                                   │ - Give-up / write-off│
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │   Audit Log (DB)     │
                                                   │ every decision +     │
                                                   │ action + API result  │
                                                   │ + explanation string │
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │   Dashboard (Next.js)│
                                                   │ batch summary, ₹     │
                                                   │ recovered, root-cause│
                                                   │ breakdown, per-txn   │
                                                   │ audit drill-down,    │
                                                   │ exceptions list      │
                                                   └─────────────────────┘
```

**Tech stack (pick this, don't debate it — you have 4 days):**
- Backend: Node.js + TypeScript, Express or Fastify
- DB: SQLite (via Prisma) — zero setup, good enough for a hackathon, still "real" persistence
- Razorpay SDK: official `razorpay` npm package, **test mode keys**
- LLM calls: whichever model you already have API access to (Gemini via Antigravity's built-in access, or Claude/GPT) — used ONLY for the ambiguous root-cause fallback and for drafting the customer nudge copy. Everything else is deterministic code. This split is your strongest "AI Judgment" answer.
- Frontend: Next.js + Tailwind, single dashboard page + a per-transaction detail drawer
- Comms stub: a local "NotificationService" that logs what *would* be sent (channel, recipient, message, timestamp) into the same audit DB — call this out explicitly as simulated in your README, don't pretend it's real. Judges respect honesty here more than a fake Twilio badge.

---

## 3. Synthetic data design (this is not filler — this is graded)

Build a generator that produces 300–500 rows with this schema, modeled on Razorpay's real error taxonomy:

```
transaction_id, order_id, amount_inr, customer_id, payment_method
  (card/upi/netbanking), attempt_timestamp, error_code
  (BAD_REQUEST_ERROR / GATEWAY_ERROR / SERVER_ERROR),
  error_reason (insufficient_funds / card_declined_by_issuer /
  timeout / otp_failed / user_cancelled / risk_blocked / network_drop),
  ground_truth_recoverable (bool),  -- YOU set this when generating,
                                     -- so you can measure classifier accuracy honestly
  customer_contact_channel, is_flagged_fraud (bool)
```

**Why `ground_truth_recoverable` matters:** it lets you report a real number — "the classifier correctly identified recoverable failures with X% precision" — instead of a vague "it works." That single field is what turns your dashboard from a demo into a measurement, which is exactly what Track 03's "bar" and the "Failure Recovery" judging criterion are asking for.

Distribute root causes realistically (don't make it uniform):
- ~35% insufficient funds (mostly unrecoverable now, recoverable later)
- ~20% bank timeout / server error (highly recoverable via retry)
- ~15% card declined by issuer (recoverable via alt payment method)
- ~10% OTP failed / user dropped at auth (recoverable via reminder)
- ~10% user cancelled (low recoverability)
- ~10% risk-flagged (must NOT be touched — this is your guardrail proof)

---

## 4. Root-cause engine + policy table (the actual "agent" logic)

**Root-cause engine:**
1. Deterministic mapping for known Razorpay `error_code`/`error_reason` pairs → root-cause bucket (covers ~85% of cases).
2. For anything unmapped or with free-text ambiguity, call the LLM with the raw error payload and ask it to classify into the same fixed bucket set, with a confidence score. Log the raw response.

**Policy table (deterministic — this is what "bounded and explainable" means in practice):**

| Root cause | Action | Guardrail |
|---|---|---|
| Bank timeout / server error | Auto-retry same method, immediately | Max 2 retries, 10 min apart |
| Card declined by issuer | Send payment-link nudge suggesting UPI/alt card | Max 1 nudge, wait 2h before next channel |
| Insufficient funds | Delay-nudge scheduled +48h | Max 1 nudge total |
| OTP failed / dropped at auth | Immediate reminder with fresh payment link | Max 2 nudges, 30 min apart |
| User cancelled | No action for 24h, then single soft nudge | Max 1 nudge |
| Risk-flagged fraud | **No action. Ever.** Log and exclude. | Hard stop — never contactable by this agent |
| Any transaction | — | No contact outside 9am–8pm IST; stop entirely after 3 total attempts; write off and log to exceptions after cap reached |

This table *is* your "every money action explainable, bounded and gated" answer for the track bar. Put it in your README verbatim.

---

## 5. The audit trail (this is what separates a toy from a submission)

Every single decision writes one structured record:

```json
{
  "transaction_id": "txn_00231",
  "timestamp": "2026-09-03T14:22:01Z",
  "detected_signal": "payment.failed",
  "root_cause": "bank_timeout",
  "classifier_source": "deterministic_rule",
  "confidence": 1.0,
  "policy_rule_fired": "auto_retry_bank_timeout",
  "action_taken": "retry_payment",
  "api_call": "razorpay.orders.create + payment_link",
  "api_response_status": "success",
  "outcome": "recovered",
  "amount_recovered_inr": 1499,
  "explanation": "Bank server timeout detected on first attempt. Policy allows immediate retry (attempt 1 of 2). Retry succeeded."
}
```

Every row in your dashboard should link to this record. This is what "explainable" means to a judge — not a paragraph of prose, a machine-readable decision log they can click into.

---

## 6. The required failure, handled gracefully

Don't leave this to chance — script it. In your data generator, inject **one transaction where the Razorpay test API call itself fails or times out mid-retry** (you can force this with a bad test amount or by mocking a 500 response). Your execution layer must:
1. Catch the exception (not crash the batch run)
2. Apply one retry with backoff
3. If it still fails, log it to the **exceptions list** with a clear reason, not silently drop it
4. Continue processing the rest of the batch

Show this exact transaction in your pitch video — pause on it, click into its audit trail, and say out loud "this is the failure we handle gracefully." This single moment answers the track's explicit ask and the "Failure Recovery" judging criterion directly. Don't bury it — feature it.

---

## 7. Dashboard requirements

One page, three sections:
1. **Batch summary**: ₹ at risk detected, ₹ recovered, recovery rate %, count of exceptions, broken down by root cause (a bar chart is enough).
2. **Transaction table**: filterable by outcome (recovered / pending / exception / excluded-fraud), each row expandable into its full audit trail.
3. **Exceptions list**: every transaction the agent could NOT resolve, with the honest reason — this is explicitly what Track 04/03's "bar" language calls out ("an honest exception list. One cherry-picked match proves nothing" — same spirit applies here).

---

## 8. Building it in Antigravity — concrete workflow

Antigravity's value here is parallelism: use the **Manager surface** to run multiple agents at once instead of building serially.

1. **Set up a project** in Antigravity pointing at a fresh repo. Write one clear root-level `PLAN.md` (paste the architecture and policy table from this doc) — Antigravity's agents will use this as shared context, so make it precise, not vague.
2. **Spawn 3 parallel agents** in the Manager surface, each scoped to a folder:
   - **Agent A — Backend**: Razorpay SDK integration, root-cause engine, policy engine, execution layer, SQLite/Prisma schema.
   - **Agent B — Data generator**: synthetic batch script producing the CSV/JSON described in §3, with the ground-truth field.
   - **Agent C — Frontend**: Next.js dashboard consuming the backend's API.
3. Use the **Editor view** yourself for the one piece that needs your judgment and can't be delegated: the policy table and guardrail thresholds (§4) — this is the part a panel will grill you on, so write and understand it yourself rather than fully delegating it.
4. Once agents finish their first pass, use Antigravity's **browser-in-the-loop verification** (Agent C's task) to actually click through the dashboard and confirm it renders real data — this produces a verification artifact (screenshot/recording) you can drop straight into your README as proof of a working build.
5. Run a **verification/testing agent** last: point it at the full pipeline, have it run the batch end-to-end, assert the audit log has one row per transaction, and assert the exceptions list isn't empty (if it's empty, your data or guardrails are unrealistic — fix that before demo day).
6. Keep commits granular and readable — a panel will open your repo. Squash-merge noisy WIP commits before submission; a clean commit history is part of "Build Quality."

---
