'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { 
  Users, DollarSign, TrendingUp, AlertCircle, 
  Clock, CheckCircle, XCircle, Ban, Search 
} from 'lucide-react';
import Link from 'next/link';

export default function AdminSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useQuery(api.admin.getDashboardStats);
  const restaurants = useQuery(api.admin.getRestaurants, {
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const statCards = [
    {
      title: 'Total Restaurants',
      value: stats?.totalRestaurants || 0,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.activeRestaurants || 0,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'Trial Accounts',
      value: stats?.trialRestaurants || 0,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
    },
    {
      title: 'Expired',
      value: stats?.expiredRestaurants || 0,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Expiring Soon',
      value: stats?.expiringSoon || 0,
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ];

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
          <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-gray-600">Manage all restaurant subscriptions and billing</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={stat.iconColor} size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants?.map((restaurant) => (
                  <tr key={restaurant._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-semibold text-gray-900">{restaurant.name}</div>
                        <div className="text-sm text-gray-500">{restaurant.email}</div>
                        <div className="text-xs text-gray-400">ID: {restaurant.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(restaurant.status)}`}>
                        {restaurant.status || 'trial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-semibold">{restaurant.daysRemaining} days</div>
                        {restaurant.daysRemaining <= 3 && restaurant.daysRemaining > 0 && (
                          <div className="text-xs text-orange-600">Expiring soon</div>
                        )}
                        {restaurant.daysRemaining === 0 && (
                          <div className="text-xs text-red-600">Expired</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(restaurant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/subscriptions/${restaurant._id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {restaurants && restaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No restaurants found</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/subscriptions/payments"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <DollarSign className="text-green-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-2">Payment History</h3>
            <p className="text-sm text-gray-600">View all payment transactions</p>
          </Link>

          <Link
            href="/admin/subscriptions/analytics"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <TrendingUp className="text-blue-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-2">Revenue Analytics</h3>
            <p className="text-sm text-gray-600">View revenue charts and insights</p>
          </Link>

          <Link
            href="/admin/subscriptions/logs"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <AlertCircle className="text-purple-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-2">Activity Logs</h3>
            <p className="text-sm text-gray-600">View all system activities</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
