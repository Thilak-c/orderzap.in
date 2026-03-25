'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import PaymentModal from '@/components/PaymentModal';

export default function SubscriptionPage() {
  const router = useRouter();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // TODO: Get actual restaurant ID from auth/session
  const restaurantId = 'demo-restaurant-id';

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (data) => {
    console.log('Payment successful:', data);
    setShowPayment(false);
    // Redirect to dashboard or success page
    router.push('/subscription/success');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriptionPlans
        restaurantId={restaurantId}
        onSelectPlan={handleSelectPlan}
      />

      {showPayment && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          restaurantId={restaurantId}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
