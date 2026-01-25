'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function SingleStaffReportPage() {
  const { staffId } = useParams();
  const staff = useQuery(api.staff.list);
  const orders = useQuery(api.orders.list);
  const staffCalls = useQuery(api.staffCalls.list);

  if (!staff || !orders || !staffCalls) {
    return <div className="p-6 text-zinc-500">LOADING...</div>;
  }

  const currentStaff = staff.find(s => s._id === staffId);

  if (!currentStaff) {
    return (
      <div className="p-6">
        <p className="text-zinc-500">Staff not found</p>
        <Link href="/admin/staff/reports" className="text-white text-xs underline mt-2 inline-block">
          Back to Reports
        </Link>
      </div>
    );
  }

  const myTables = currentStaff.assignedTables;
  const myOrders = orders.filter(o => myTables.includes(parseInt(o.tableId)));
  const myCalls = staffCalls.filter(c => myTables.includes(c.tableNumber));

  const completedOrders = myOrders.filter(o => o.status === 'completed');
  const pendingOrders = myOrders.filter(o => o.status === 'pending');
  const preparingOrders = myOrders.filter(o => o.status === 'preparing');
  const readyOrders = myOrders.filter(o => o.status === 'ready');

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  const resolvedCalls = myCalls.filter(c => c.status === 'resolved');
  const pendingCalls = myCalls.filter(c => c.status !== 'resolved');

  // Orders by table
  const ordersByTable = {};
  myOrders.forEach(o => {
    if (!ordersByTable[o.tableId]) {
      ordersByTable[o.tableId] = { count: 0, revenue: 0 };
    }
    ordersByTable[o.tableId].count++;
    if (o.status === 'completed') {
      ordersByTable[o.tableId].revenue += o.total;
    }
  });

  // Orders by hour
  const ordersByHour = {};
  myOrders.forEach(o => {
    const hour = new Date(o._creationTime).getHours();
    ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
  });
  const peakHour = Object.entries(ordersByHour).sort((a, b) => b[1] - a[1])[0];

  // Top items
  const itemCounts = {};
  myOrders.forEach(o => {
    o.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Call reasons
  const callReasons = {};
  myCalls.forEach(c => {
    const reason = c.reason || 'No reason';
    callReasons[reason] = (callReasons[reason] || 0) + 1;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-zinc-800 flex items-center justify-center text-2xl font-bold">
            {currentStaff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{currentStaff.name}</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-wide">
              {currentStaff.role} • Tables: {myTables.join(', ') || 'None assigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-3xl font-bold text-white">{myOrders.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total Orders</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-3xl font-bold text-green-400">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total Revenue</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-3xl font-bold text-white">₹{avgOrderValue.toFixed(0)}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Avg Order Value</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-3xl font-bold text-white">{myCalls.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Staff Calls</p>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Order Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Completed</span>
              <span className="text-green-400 font-bold">{completedOrders.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Ready</span>
              <span className="text-blue-400 font-bold">{readyOrders.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Preparing</span>
              <span className="text-amber-400 font-bold">{preparingOrders.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Pending</span>
              <span className="text-red-400 font-bold">{pendingOrders.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Staff Calls</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Resolved</span>
              <span className="text-green-400 font-bold">{resolvedCalls.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Pending</span>
              <span className="text-red-400 font-bold">{pendingCalls.length}</span>
            </div>
            <div className="border-t border-zinc-800 pt-3 mt-3">
              <p className="text-[10px] text-zinc-600 uppercase mb-2">Top Reasons</p>
              {Object.entries(callReasons).slice(0, 3).map(([reason, count]) => (
                <div key={reason} className="flex justify-between text-xs text-zinc-500">
                  <span className="truncate">{reason}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders by Table */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Orders by Table</h3>
          {Object.keys(ordersByTable).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(ordersByTable)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([table, data]) => (
                  <div key={table} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-xs font-bold">
                        {table}
                      </span>
                      <span className="text-zinc-400 text-sm">{data.count} orders</span>
                    </div>
                    <span className="text-white font-medium">₹{data.revenue.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">No orders yet</p>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Top Items Sold</h3>
          {topItems.length > 0 ? (
            <div className="space-y-2">
              {topItems.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-zinc-300 text-sm truncate">{name}</span>
                  </div>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">No items sold yet</p>
          )}
        </div>
      </div>

      {/* Peak Hour */}
      {peakHour && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Peak Hour</h3>
          <p className="text-2xl font-bold text-white">
            {peakHour[0]}:00 - {parseInt(peakHour[0]) + 1}:00
          </p>
          <p className="text-zinc-500 text-sm">{peakHour[1]} orders during this hour</p>
        </div>
      )}

      {/* Back Link */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <Link href="/admin/staff/reports" className="text-zinc-500 hover:text-white text-xs uppercase tracking-wide">
          ← Back to Compare Reports
        </Link>
      </div>
    </div>
  );
}
