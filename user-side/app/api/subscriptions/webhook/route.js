import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    if (eventType === 'payment.captured') {
      const paymentId = payload.payment.entity.id;
      const orderId = payload.payment.entity.order_id;

      // Find payment by order ID
      const payment = await convex.query(api.payments.getByGatewayOrderId, {
        gatewayOrderId: orderId,
      });

      if (payment) {
        // Update payment status
        await convex.mutation(api.payments.updateStatus, {
          paymentId: payment._id,
          status: 'completed',
          gatewayPaymentId: paymentId,
          gatewayResponse: payload,
        });

        // Activate subscription
        if (payment.subscriptionId) {
          await convex.mutation(api.subscriptions.activate, {
            subscriptionId: payment.subscriptionId,
            paymentId: payment._id,
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      const orderId = payload.payment.entity.order_id;

      const payment = await convex.query(api.payments.getByGatewayOrderId, {
        gatewayOrderId: orderId,
      });

      if (payment) {
        await convex.mutation(api.payments.updateStatus, {
          paymentId: payment._id,
          status: 'failed',
          failedReason: payload.payment.entity.error_description,
          gatewayResponse: payload,
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
