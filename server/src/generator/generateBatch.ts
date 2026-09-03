export interface RawTransactionInput {
  transactionId: string;
  orderId: string;
  amountInr: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: 'card' | 'upi' | 'netbanking';
  attemptTimestamp: Date;
  errorCode: 'BAD_REQUEST_ERROR' | 'GATEWAY_ERROR' | 'SERVER_ERROR';
  errorReason:
    | 'insufficient_funds'
    | 'bank_timeout'
    | 'card_declined_by_issuer'
    | 'otp_failed'
    | 'user_cancelled'
    | 'risk_blocked'
    | 'network_drop';
  groundTruthRecoverable: boolean;
  customerContactChannel: 'sms' | 'whatsapp' | 'email';
  isFlaggedFraud: boolean;
}

const FIRST_NAMES = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Neha', 'Aditya', 'Kavya', 'Rahul', 'Sneha', 'Siddharth', 'Meera', 'Arjun', 'Pooja', 'Deepak'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patel', 'Rao', 'Gupta', 'Singh', 'Kumar', 'Iyer', 'Joshi', 'Nair', 'Reddy', 'Deshmukh', 'Chopra', 'Mehta', 'Bhat'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSyntheticBatch(count: number = 400): RawTransactionInput[] {
  const transactions: RawTransactionInput[] = [];

  // Define root cause distribution weights (total 100%)
  // 35% insufficient_funds, 20% bank_timeout, 15% card_declined, 10% otp_failed, 10% user_cancelled, 10% risk_blocked
  const rootCausePool: { reason: RawTransactionInput['errorReason']; code: RawTransactionInput['errorCode']; count: number }[] = [
    { reason: 'insufficient_funds', code: 'BAD_REQUEST_ERROR', count: Math.round(count * 0.35) },
    { reason: 'bank_timeout', code: 'GATEWAY_ERROR', count: Math.round(count * 0.20) },
    { reason: 'card_declined_by_issuer', code: 'BAD_REQUEST_ERROR', count: Math.round(count * 0.15) },
    { reason: 'otp_failed', code: 'BAD_REQUEST_ERROR', count: Math.round(count * 0.10) },
    { reason: 'user_cancelled', code: 'BAD_REQUEST_ERROR', count: Math.round(count * 0.10) },
    { reason: 'risk_blocked', code: 'SERVER_ERROR', count: Math.round(count * 0.10) },
  ];

  let currentIdx = 1;

  for (const pool of rootCausePool) {
    for (let i = 0; i < pool.count; i++) {
      const isFraud = pool.reason === 'risk_blocked';
      const txnId = `txn_${String(currentIdx).padStart(5, '0')}`;
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(10, 99)}@gmail.com`;
      const phone = `+9198${getRandomInt(10000000, 99999999)}`;

      let groundTruth = false;
      if (!isFraud) {
        if (pool.reason === 'bank_timeout') groundTruth = Math.random() < 0.95;
        else if (pool.reason === 'card_declined_by_issuer') groundTruth = Math.random() < 0.80;
        else if (pool.reason === 'otp_failed') groundTruth = Math.random() < 0.85;
        else if (pool.reason === 'insufficient_funds') groundTruth = Math.random() < 0.60;
        else if (pool.reason === 'user_cancelled') groundTruth = Math.random() < 0.30;
      }

      // Amounts: ₹499 to ₹18,500
      const amount = getRandomInt(49, 185) * 100 - 1;

      // Payment method preference
      let paymentMethod: RawTransactionInput['paymentMethod'] = 'upi';
      if (pool.reason === 'card_declined_by_issuer') {
        paymentMethod = 'card';
      } else {
        paymentMethod = getRandomElement(['upi', 'upi', 'card', 'netbanking']);
      }

      // Timestamps: random within past 24 hours
      const timestamp = new Date(Date.now() - getRandomInt(5, 1440) * 60 * 1000);

      transactions.push({
        transactionId: txnId,
        orderId: `order_${String(currentIdx).padStart(5, '0')}`,
        amountInr: amount,
        customerId: `cust_${getRandomInt(1000, 9999)}`,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        paymentMethod,
        attemptTimestamp: timestamp,
        errorCode: pool.code,
        errorReason: pool.reason,
        groundTruthRecoverable: groundTruth,
        customerContactChannel: getRandomElement(['whatsapp', 'sms', 'whatsapp', 'email']),
        isFlaggedFraud: isFraud,
      });

      currentIdx++;
    }
  }

  // Inject 1 explicit API Mid-Retry Failure transaction for pitch/demo camera verification
  const injectedIdx = Math.floor(count / 2);
  transactions[injectedIdx] = {
    transactionId: 'txn_injected_api_fail',
    orderId: 'order_injected_fail_999',
    amountInr: 4999,
    customerId: 'cust_fail_demo',
    customerName: 'Demo Camera Failure',
    customerEmail: 'demo.camera@recoup-test.internal',
    customerPhone: '+919900009999',
    paymentMethod: 'card',
    attemptTimestamp: new Date(),
    errorCode: 'GATEWAY_ERROR',
    errorReason: 'bank_timeout',
    groundTruthRecoverable: true,
    customerContactChannel: 'whatsapp',
    isFlaggedFraud: false,
  };

  return transactions;
}
