import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Get payment by order ID
    const payment = await convex.query(api.payments.getByGatewayOrderId, {
      gatewayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update payment status
    await convex.mutation(api.payments.updateStatus, {
      paymentId: payment._id,
      status: 'completed',
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      gatewayResponse: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
    });

    // Activate subscription
    if (payment.subscriptionId) {
      await convex.mutation(api.subscriptions.activate, {
        subscriptionId: payment.subscriptionId,
        paymentId: payment._id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: { payment },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
