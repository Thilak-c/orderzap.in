import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { restaurantId, planType, days, paymentMethod } = body;

    if (!restaurantId || !days || days < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Create subscription in Convex
    const subscriptionId = await convex.mutation(api.subscriptions.create, {
      restaurantId,
      planType: planType || 'custom',
      days,
      paymentMethod,
    });

    // Calculate price
    const priceData = await convex.query(api.subscriptions.calculatePrice, { days });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(priceData.totalPrice * 100), // Convert to paise
      currency: 'INR',
      receipt: subscriptionId,
      notes: {
        restaurantId,
        subscriptionId,
      },
    });

    // Create payment record in Convex
    const paymentId = await convex.mutation(api.payments.create, {
      restaurantId,
      subscriptionId,
      amount: priceData.totalPrice,
      currency: 'INR',
      paymentMethod: paymentMethod || 'razorpay',
      gatewayName: 'razorpay',
      gatewayOrderId: razorpayOrder.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId,
        paymentId,
        razorpayOrder,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        amount: priceData.totalPrice,
      },
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
