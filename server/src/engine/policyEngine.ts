export interface PolicyDecision {
  action: 'retry_payment' | 'send_payment_link' | 'schedule_delayed_nudge' | 'write_off_exception';
  ruleFired: string;
  delayHours: number;
  explanation: string;
  isBlockedByGuardrail: boolean;
  guardrailReason?: string;
}

export function isWithinISTWorkingHours(date: Date = new Date()): boolean {
  // Convert UTC to IST (+5:30)
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utcTime + 360 * 60000);
  const istHours = istDate.getHours();

  // Working hours: 9 AM (9) to 8 PM (20)
  return istHours >= 9 && istHours < 20;
}

/**
 * Step 2: Policy Engine Matrix & Guardrail Evaluation
 */
export function evaluatePolicyMatrix(
  rootCause: string,
  attemptsCount: number,
  lastAttemptAt?: Date | null,
  overrideWorkingHours: boolean = true // Set true for hackathon demo runs
): PolicyDecision {
  // 1. Guardrail Check: Max Attempt Cap (Max 3 total attempts across all rules)
  if (attemptsCount >= 3) {
    return {
      action: 'write_off_exception',
      ruleFired: 'guardrail_max_attempts_reached',
      delayHours: 0,
      explanation: `Attempt cap reached (${attemptsCount}/3 attempts). Policy requires write-off to Exceptions List.`,
      isBlockedByGuardrail: true,
      guardrailReason: 'Max attempts cap (3) reached',
    };
  }

  // 2. Guardrail Check: Working Hours (9 AM - 8 PM IST)
  if (!overrideWorkingHours && !isWithinISTWorkingHours()) {
    return {
      action: 'write_off_exception',
      ruleFired: 'guardrail_outside_ist_working_hours',
      delayHours: 0,
      explanation: `Current time is outside IST working hours window (9 AM - 8 PM). Action blocked by DNC guardrail.`,
      isBlockedByGuardrail: true,
      guardrailReason: 'Outside IST working hours (9 AM - 8 PM)',
    };
  }

  // 3. Policy Matrix Evaluation by Root Cause
  switch (rootCause) {
    case 'bank_timeout':
      // Bank timeout / server error -> Auto-retry same method (Max 2 retries, 10 min apart)
      if (attemptsCount >= 2) {
        return {
          action: 'write_off_exception',
          ruleFired: 'bank_timeout_max_retry_cap',
          delayHours: 0,
          explanation: `Bank timeout retry cap reached (2 retries max). Transferring to Exceptions List.`,
          isBlockedByGuardrail: true,
          guardrailReason: 'Max 2 retries reached for bank_timeout',
        };
      }
      return {
        action: 'retry_payment',
        ruleFired: 'auto_retry_bank_timeout',
        delayHours: 0,
        explanation: `Bank server timeout detected on attempt #${attemptsCount + 1}. Policy permits immediate direct auto-retry via Razorpay Orders API.`,
        isBlockedByGuardrail: false,
      };

    case 'card_declined_by_issuer':
      // Card declined -> Send payment-link nudge suggesting UPI/alt card (Max 1 nudge, wait 2h before next channel)
      if (attemptsCount >= 1) {
        return {
          action: 'write_off_exception',
          ruleFired: 'card_declined_max_nudge_cap',
          delayHours: 0,
          explanation: `Card declined nudge cap reached (1 nudge max). Written off to Exceptions List.`,
          isBlockedByGuardrail: true,
          guardrailReason: 'Max 1 nudge reached for card_declined',
        };
      }
      return {
        action: 'send_payment_link',
        ruleFired: 'nudge_card_declined_alt_payment',
        delayHours: 0,
        explanation: `Card declined by issuing bank. Policy issues a Razorpay Payment Link recommending UPI/alt card payment.`,
        isBlockedByGuardrail: false,
      };

    case 'insufficient_funds':
      // Insufficient funds -> Delay-nudge scheduled +48h (Max 1 nudge total)
      if (attemptsCount >= 1) {
        return {
          action: 'write_off_exception',
          ruleFired: 'insufficient_funds_max_nudge_cap',
          delayHours: 0,
          explanation: `Insufficient funds nudge cap reached. Written off to Exceptions List.`,
          isBlockedByGuardrail: true,
          guardrailReason: 'Max 1 nudge reached for insufficient_funds',
        };
      }
      return {
        action: 'schedule_delayed_nudge',
        ruleFired: 'delayed_nudge_insufficient_funds',
        delayHours: 48,
        explanation: `Insufficient funds detected. Policy schedules a delayed nudge (+48 hours) to match salary/replenishment cycle.`,
        isBlockedByGuardrail: false,
      };

    case 'otp_failed':
      // OTP failed / dropped at auth -> Immediate reminder with fresh payment link (Max 2 nudges, 30 min apart)
      if (attemptsCount >= 2) {
        return {
          action: 'write_off_exception',
          ruleFired: 'otp_failed_max_nudge_cap',
          delayHours: 0,
          explanation: `OTP auth reminder cap reached (2 nudges max). Written off to Exceptions List.`,
          isBlockedByGuardrail: true,
          guardrailReason: 'Max 2 nudges reached for otp_failed',
        };
      }
      return {
        action: 'send_payment_link',
        ruleFired: 'immediate_reminder_otp_dropped',
        delayHours: 0,
        explanation: `OTP authentication dropped. Policy fires an immediate reminder nudge with a fresh Razorpay Payment Link.`,
        isBlockedByGuardrail: false,
      };

    case 'user_cancelled':
      // User cancelled -> No action for 24h, then single soft nudge
      if (attemptsCount >= 1) {
        return {
          action: 'write_off_exception',
          ruleFired: 'user_cancelled_max_nudge_cap',
          delayHours: 0,
          explanation: `User cancelled soft nudge cap reached. Written off to Exceptions List.`,
          isBlockedByGuardrail: true,
          guardrailReason: 'Max 1 nudge reached for user_cancelled',
        };
      }
      return {
        action: 'send_payment_link',
        ruleFired: 'soft_nudge_user_cancelled',
        delayHours: 24,
        explanation: `User cancelled checkout modal. Policy schedules a single soft recovery nudge after 24 hours.`,
        isBlockedByGuardrail: false,
      };

    default:
      return {
        action: 'write_off_exception',
        ruleFired: 'unhandled_root_cause',
        delayHours: 0,
        explanation: `Unmapped root cause '${rootCause}'. Transferred to Exceptions List.`,
        isBlockedByGuardrail: true,
        guardrailReason: 'Unhandled root cause',
      };
  }
}
