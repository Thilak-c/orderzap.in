'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, DollarSign, Clock, 
  Ban, CheckCircle, Plus, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

export default function RestaurantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId;

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [extendDays, setExtendDays] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const details = useQuery(api.admin.getRestaurantDetails, { restaurantId });
  const extendSubscription = useMutation(api.subscriptions.extend);
  const updateStatus = useMutation(api.admin.updateRestaurantStatus);
  const refundPayment = useMutation(api.payments.refund);

  const handleExtend = async () => {
    if (!extendDays || parseInt(extendDays) < 1) return;

    try {
      await extendSubscription({
        restaurantId,
        days: parseInt(extendDays),
        extendedBy: 'admin@orderzap.com', // TODO: Get from auth
        reason: extendReason,
      });
      setShowExtendModal(false);
      setExtendDays('');
      setExtendReason('');
    } catch (error) {
      alert('Failed to extend subscription: ' + error.message);
    }
  };

  const handleBlock = async () => {
    try {
      await updateStatus({
        restaurantId,
        status: 'blocked',
        reason: blockReason,
        adminEmail: 'admin@orderzap.com', // TODO: Get from auth
      });
      setShowBlockModal(false);
      setBlockReason('');
    } catch (error) {
      alert('Failed to block restaurant: ' + error.message);
    }
  };

  const handleUnblock = async () => {
    try {
      await updateStatus({
        restaurantId,
        status: 'active',
        adminEmail: 'admin@orderzap.com', // TODO: Get from auth
      });
    } catch (error) {
      alert('Failed to unblock restaurant: ' + error.message);
    }
  };

  const handleRefund = async (paymentId, amount) => {
    const reason = prompt('Enter refund reason:');
    if (!reason) return;

    try {
      await refundPayment({
        paymentId,
        refundAmount: amount,
        refundReason: reason,
        processedBy: 'admin@orderzap.com', // TODO: Get from auth
      });
      alert('Refund processed successfully');
    } catch (error) {
      alert('Failed to process refund: ' + error.message);
    }
  };

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { restaurant, subscriptions, payments, activityLogs, notifications, daysRemaining } = details;

  const getStatusBadge = (status) => {
    const styles = {
      trial: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      blocked: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Subscriptions
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
              <p className="text-gray-600">{restaurant.email}</p>
              <p className="text-sm text-gray-500">ID: {restaurant.id}</p>
            </div>
            <div className="flex gap-3">
              {restaurant.status === 'blocked' ? (
                <button
                  onClick={handleUnblock}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle size={20} />
                  Unblock
                </button>
              ) : (
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Ban size={20} />
                  Block
                </button>
              )}
              <button
                onClick={() => setShowExtendModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Extend Subscription
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Status</span>
              <CheckCircle className="text-gray-400" size={20} />
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(restaurant.status)}`}>
              {restaurant.status || 'trial'}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Days Remaining</span>
              <Clock className="text-gray-400" size={20} />
            </div>
            <p className="text-2xl font-bold">{daysRemaining}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Spent</span>
              <DollarSign className="text-gray-400" size={20} />
            </div>
            <p className="text-2xl font-bold">
              ₹{payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Member Since</span>
              <Calendar className="text-gray-400" size={20} />
            </div>
            <p className="text-sm font-semibold">
              {new Date(restaurant.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button className="px-6 py-4 border-b-2 border-blue-600 text-blue-600 font-semibold">
                Subscriptions
              </button>
              <button className="px-6 py-4 text-gray-600 hover:text-gray-900">
                Payments
              </button>
              <button className="px-6 py-4 text-gray-600 hover:text-gray-900">
                Activity Logs
              </button>
              <button className="px-6 py-4 text-gray-600 hover:text-gray-900">
                Notifications
              </button>
            </nav>
          </div>

          {/* Subscriptions Tab */}
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4">Subscription History</h3>
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div key={sub._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold">{sub.days} days</span>
                      <span className="text-gray-500 ml-2">({sub.planType})</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      sub.status === 'active' ? 'bg-green-100 text-green-700' :
                      sub.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Start:</span> {new Date(sub.startDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">End:</span> {new Date(sub.endDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> ₹{sub.totalPrice.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Payment:</span> {sub.paymentStatus}
                    </div>
                  </div>
                  {sub.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {sub.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-6">Extend Subscription</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Number of Days</label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 7"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
              <textarea
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="e.g., Promotional extension"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Extend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-6">Block Restaurant</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                rows="3"
                placeholder="Enter reason for blocking..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
