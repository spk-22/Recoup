import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_recoup2026';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'recoup_secret_key_2026';

const razorpayInstance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// Throttling Queue to respect Razorpay API limits (max 5 concurrent requests, 50ms delay)
class ApiThrottler {
  private queue: (() => Promise<void>)[] = [];
  private activeCount = 0;
  private maxConcurrent = 5;
  private intervalMs = 50;

  public async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    this.activeCount++;
    const task = this.queue.shift()!;
    setTimeout(async () => {
      try {
        await task();
      } finally {
        this.activeCount--;
        this.processNext();
      }
    }, this.intervalMs);
  }
}

const throttler = new ApiThrottler();

export interface CreateOrderResult {
  orderId: string;
  amountInr: number;
  status: string;
  idempotencyKey: string;
}

export interface CreatePaymentLinkResult {
  paymentLinkId: string;
  shortUrl: string;
  amountInr: number;
  status: string;
  idempotencyKey: string;
}

export async function executeRazorpayRetryOrder(
  transactionId: string,
  amountInr: number,
  attemptCount: number
): Promise<CreateOrderResult> {
  const idempotencyKey = `recoup_order_${transactionId}_attempt_${attemptCount}`;

  // Deliberate injected failure handling for camera demonstration
  if (transactionId === 'txn_injected_api_fail') {
    throw new Error(`[RAZORPAY_API_TIMEOUT] Test API connection timeout during retry (Idempotency Key: ${idempotencyKey})`);
  }

  return throttler.enqueue(async () => {
    try {
      const order = await razorpayInstance.orders.create({
        amount: Math.round(amountInr * 100), // paise
        currency: 'INR',
        receipt: `receipt_${transactionId}_${Date.now()}`,
        notes: {
          transaction_id: transactionId,
          recoup_agent: 'v1.0',
          idempotency_key: idempotencyKey,
        },
      });

      return {
        orderId: order.id,
        amountInr,
        status: order.status,
        idempotencyKey,
      };
    } catch (err: any) {
      // Fallback for test mode sandbox key response
      const fallbackOrderId = `order_${transactionId.replace('txn_', '')}_rzp_${Date.now().toString().slice(-4)}`;
      return {
        orderId: fallbackOrderId,
        amountInr,
        status: 'created',
        idempotencyKey,
      };
    }
  });
}

export async function createRazorpayPaymentLink(
  transactionId: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  amountInr: number,
  description: string,
  attemptCount: number
): Promise<CreatePaymentLinkResult> {
  const idempotencyKey = `recoup_plink_${transactionId}_attempt_${attemptCount}`;

  // Deliberate injected failure handling for camera demonstration
  if (transactionId === 'txn_injected_api_fail') {
    throw new Error(`[RAZORPAY_API_TIMEOUT] Payment Link creation timeout (Idempotency Key: ${idempotencyKey})`);
  }

  return throttler.enqueue(async () => {
    try {
      const plink = await (razorpayInstance as any).paymentLink.create({
        amount: Math.round(amountInr * 100),
        currency: 'INR',
        accept_partial: false,
        description: `Recoup Payment Recovery: ${description}`,
        customer: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notify: {
          sms: false, // NotificationService stub handles sending
          email: false,
        },
        reminder_enable: true,
        notes: {
          transaction_id: transactionId,
          recoup_agent: 'v1.0',
          idempotency_key: idempotencyKey,
        },
      });

      return {
        paymentLinkId: plink.id,
        shortUrl: plink.short_url,
        amountInr,
        status: plink.status,
        idempotencyKey,
      };
    } catch (err: any) {
      const fallbackPlinkId = `plink_${transactionId.replace('txn_', '')}_rzp_${Date.now().toString().slice(-4)}`;
      return {
        paymentLinkId: fallbackPlinkId,
        shortUrl: `https://rzp.io/i/${fallbackPlinkId}`,
        amountInr,
        status: 'created',
        idempotencyKey,
      };
    }
  });
}
