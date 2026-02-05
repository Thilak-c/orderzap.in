'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function PaymentModal({ plan, restaurantId, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          planType: plan.planType,
          days: plan.days,
          paymentMethod: 'razorpay',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      const { razorpayOrder, razorpayKey } = data.data;

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'OrderZap',
        description: `Subscription for ${plan.days} days`,
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch('/api/subscriptions/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              onSuccess(verifyData.data);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            setError(error.message);
            setLoading(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6">Complete Payment</h2>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-semibold">{plan.days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price per day:</span>
              <span className="font-semibold">₹83</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg">
              <span className="font-bold">Total Amount:</span>
              <span className="font-bold text-blue-600">₹{plan.price.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Secure payment powered by Razorpay
        </p>
      </div>
    </div>
  );
}
