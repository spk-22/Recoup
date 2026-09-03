export interface SimulationResult {
  isConverted: boolean;
  recoveredAmountInr: number;
  explanation: string;
}

/**
 * Customer Response Simulator:
 * Evaluates whether simulated customer completes payment on test-mode payment link,
 * weighted by groundTruthRecoverable probability and intervention quality.
 */
export function simulateCustomerResponse(
  groundTruthRecoverable: boolean,
  amountInr: number,
  rootCause: string,
  attemptNumber: number
): SimulationResult {
  // If ground truth is recoverable, customer has high conversion probability upon nudge
  let conversionProbability = 0.0;

  if (groundTruthRecoverable) {
    switch (rootCause) {
      case 'card_declined_by_issuer':
        conversionProbability = 0.85; // High conversion when nudged with UPI alternative
        break;
      case 'otp_failed':
        conversionProbability = 0.90; // High conversion on immediate reminder link
        break;
      case 'insufficient_funds':
        conversionProbability = 0.70; // Good conversion on delayed nudge (+48h)
        break;
      case 'user_cancelled':
        conversionProbability = 0.40; // Moderate conversion on soft nudge
        break;
      default:
        conversionProbability = 0.75;
    }
  } else {
    // Unrecoverable ground truth has near-zero conversion
    conversionProbability = 0.05;
  }

  // Slight boost for first attempt vs subsequent
  if (attemptNumber === 1) {
    conversionProbability += 0.05;
  }

  const roll = Math.random();
  const isConverted = roll < conversionProbability;

  if (isConverted) {
    return {
      isConverted: true,
      recoveredAmountInr: amountInr,
      explanation: `Simulated customer completed payment link successfully (Ground-truth recoverable: ${groundTruthRecoverable}, Roll: ${roll.toFixed(2)} <= Prob: ${conversionProbability.toFixed(2)}).`,
    };
  } else {
    return {
      isConverted: false,
      recoveredAmountInr: 0,
      explanation: `Customer did not complete payment link within response window (Ground-truth recoverable: ${groundTruthRecoverable}, Roll: ${roll.toFixed(2)} > Prob: ${conversionProbability.toFixed(2)}).`,
    };
  }
}
