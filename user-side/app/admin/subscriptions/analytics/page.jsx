'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ArrowLeft, TrendingUp, DollarSign, CreditCard, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  
  const analytics = useQuery(api.admin.getRevenueAnalytics, { days });

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
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Revenue Analytics</h1>
              <p className="text-gray-600">Track revenue and transaction metrics</p>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={365}>Last Year</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Revenue</span>
              <DollarSign className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-600">
              ₹{(analytics?.totalRevenue || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Transactions</span>
              <CreditCard className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold">{analytics?.totalTransactions || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Completed</span>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {analytics?.completedTransactions || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Failed</span>
              <XCircle className="text-red-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {analytics?.failedTransactions || 0}
            </p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Revenue Over Time</h2>
          
          {analytics?.chartData && analytics.chartData.length > 0 ? (
            <div className="space-y-2">
              {analytics.chartData.map((item) => (
                <div key={item.date} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-gray-600">
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center justify-end pr-3 text-white text-sm font-semibold"
                        style={{
                          width: `${Math.min(100, (item.revenue / Math.max(...analytics.chartData.map(d => d.revenue))) * 100)}%`,
                        }}
                      >
                        ₹{item.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No revenue data available for this period
            </div>
          )}
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-6">Transaction Success Rate</h2>
          
          {analytics && analytics.totalTransactions > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">Success Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  {((analytics.completedTransactions / analytics.totalTransactions) * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="bg-gray-200 rounded-full h-4 overflow-hidden mb-6">
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${(analytics.completedTransactions / analytics.totalTransactions) * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.completedTransactions}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {analytics.failedTransactions}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No transaction data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
