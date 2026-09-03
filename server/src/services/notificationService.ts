import { prisma } from '../db/client.js';

export interface NotificationPayload {
  transactionId: string;
  channel: 'sms' | 'whatsapp' | 'email';
  recipient: string;
  messageBody: string;
  scheduledFor: Date;
}

export async function sendOrScheduleNudge(payload: NotificationPayload): Promise<{ success: boolean; nudgeId: string }> {
  const nudge = await prisma.nudgeLog.create({
    data: {
      transactionId: payload.transactionId,
      channel: payload.channel,
      recipient: payload.recipient,
      messageBody: payload.messageBody,
      scheduledFor: payload.scheduledFor,
      sentAt: payload.scheduledFor <= new Date() ? new Date() : null,
      status: payload.scheduledFor <= new Date() ? 'SENT' : 'SCHEDULED',
    },
  });

  return {
    success: true,
    nudgeId: nudge.id,
  };
}
