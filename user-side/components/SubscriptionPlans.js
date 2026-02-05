'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';

const PLAN_PRESETS = [
  { days: 30, label: '1 Month', popular: false },
  { days: 60, label: '2 Months', popular: false },
  { days: 90, label: '3 Months', popular: true },
  { days: 180, label: '6 Months', popular: false },
  { days: 365, label: '1 Year', popular: false },
];

const PRICE_PER_DAY = 83;

export default function SubscriptionPlans({ restaurantId, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customDays, setCustomDays] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const calculatePrice = (days) => days * PRICE_PER_DAY;

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setIsCustom(false);
    setCustomDays('');
  };

  const handleCustomDaysChange = (e) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 3650)) {
      setCustomDays(value);
      setIsCustom(true);
      setSelectedPlan(null);
    }
  };

  const handleSubscribe = () => {
    const days = isCustom ? parseInt(customDays) : selectedPlan?.days;
    if (days && days > 0) {
      onSelectPlan({
        days,
        price: calculatePrice(days),
        planType: isCustom ? 'custom' : 'monthly',
      });
    }
  };

  const activeDays = isCustom ? parseInt(customDays) || 0 : selectedPlan?.days || 0;
  const activePrice = calculatePrice(activeDays);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-600 text-lg">
          ₹{PRICE_PER_DAY} per day • Flexible plans • No hidden fees
        </p>
      </div>

      {/* Preset Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {PLAN_PRESETS.map((plan) => {
          const price = calculatePrice(plan.days);
          const isSelected = selectedPlan?.days === plan.days;

          return (
            <div
              key={plan.days}
              onClick={() => handleSelectPlan(plan)}
              className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-blue-300'
              } ${plan.popular ? 'ring-2 ring-blue-400' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Zap size={12} /> POPULAR
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">{plan.label}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">₹{price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{plan.days} days</p>

                {isSelected && (
                  <div className="flex items-center justify-center text-blue-600">
                    <Check size={20} className="mr-1" />
                    <span className="font-semibold">Selected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Days Input */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold mb-4 text-center">Custom Duration</h3>
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium mb-2">Enter number of days</label>
          <input
            type="number"
            min="1"
            max="3650"
            value={customDays}
            onChange={handleCustomDaysChange}
            placeholder="e.g., 45"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
          />
          {customDays && parseInt(customDays) > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Price:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{calculatePrice(parseInt(customDays)).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {customDays} days × ₹{PRICE_PER_DAY} per day
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary & Subscribe Button */}
      {activeDays > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{activeDays} days</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Price per day:</span>
                <span className="font-semibold">₹{PRICE_PER_DAY}</span>
              </div>
              <div className="border-t-2 pt-4 flex justify-between text-2xl">
                <span className="font-bold">Total Amount:</span>
                <span className="font-bold text-blue-600">
                  ₹{activePrice.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Proceed to Payment
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Secure payment powered by Razorpay
            </p>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-blue-600" size={24} />
          </div>
          <h4 className="font-bold mb-2">Full Access</h4>
          <p className="text-sm text-gray-600">All features included</p>
        </div>
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={24} />
          </div>
          <h4 className="font-bold mb-2">No Hidden Fees</h4>
          <p className="text-sm text-gray-600">Transparent pricing</p>
        </div>
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-purple-600" size={24} />
          </div>
          <h4 className="font-bold mb-2">24/7 Support</h4>
          <p className="text-sm text-gray-600">Always here to help</p>
        </div>
      </div>
    </div>
  );
}
