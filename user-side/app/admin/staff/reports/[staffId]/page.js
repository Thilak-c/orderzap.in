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
    return <div className="p-6 text-black">LOADING...</div>;
  }

  const currentStaff = staff.find(s => s._id === staffId);

  if (!currentStaff) {
    return (
      <div className="p-6">
        <p className="text-black">Staff not found</p>
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
      <div className="mb-6 border-b border-black pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white flex items-center justify-center text-2xl font-bold">
            {currentStaff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{currentStaff.name}</h1>
            <p className="text-black text-xs uppercase tracking-wide">
              {currentStaff.role} • Tables: {myTables.join(', ') || 'None assigned'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-black p-4">
          <p className="text-3xl font-bold text-white">{myOrders.length}</p>
          <p className="text-[10px] text-black uppercase tracking-wide">Total Orders</p>
        </div>
        <div className="bg-white border border-black p-4">
          <p className="text-3xl font-bold text-black">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-black uppercase tracking-wide">Total Revenue</p>
        </div>
        <div className="bg-white border border-black p-4">
          <p className="text-3xl font-bold text-white">₹{avgOrderValue.toFixed(0)}</p>
          <p className="text-[10px] text-black uppercase tracking-wide">Avg Order Value</p>
        </div>
        <div className="bg-white border border-black p-4">
          <p className="text-3xl font-bold text-white">{myCalls.length}</p>
          <p className="text-[10px] text-black uppercase tracking-wide">Staff Calls</p>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-black p-4">
          <h3 className="text-xs text-black uppercase tracking-wide mb-4">Order Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-black text-sm">Completed</span>
              <span className="text-black font-bold">{completedOrders.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-black text-sm">Ready</span>
              <span className="text-black font-bold">{readyOrders.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-black text-sm">Preparing</span>
              <span className="text-black font-bold">{preparingOrders.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-black text-sm">Pending</span>
              <span className="text-black font-bold">{pendingOrders.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-black p-4">
          <h3 className="text-xs text-black uppercase tracking-wide mb-4">Staff Calls</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-black text-sm">Resolved</span>
              <span className="text-black font-bold">{resolvedCalls.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-black text-sm">Pending</span>
              <span className="text-black font-bold">{pendingCalls.length}</span>
            </div>
            <div className="border-t border-black pt-3 mt-3">
              <p className="text-[10px] text-black uppercase mb-2">Top Reasons</p>
              {Object.entries(callReasons).slice(0, 3).map(([reason, count]) => (
                <div key={reason} className="flex justify-between text-xs text-black">
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
        <div className="bg-white border border-black p-4">
          <h3 className="text-xs text-black uppercase tracking-wide mb-4">Orders by Table</h3>
          {Object.keys(ordersByTable).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(ordersByTable)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([table, data]) => (
                  <div key={table} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-white flex items-center justify-center text-xs font-bold">
                        {table}
                      </span>
                      <span className="text-black text-sm">{data.count} orders</span>
                    </div>
                    <span className="text-white font-medium">₹{data.revenue.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-black text-sm">No orders yet</p>
          )}
        </div>

        <div className="bg-white border border-black p-4">
          <h3 className="text-xs text-black uppercase tracking-wide mb-4">Top Items Sold</h3>
          {topItems.length > 0 ? (
            <div className="space-y-2">
              {topItems.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-500 text-black' : 'bg-white text-black'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-black text-sm truncate">{name}</span>
                  </div>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-black text-sm">No items sold yet</p>
          )}
        </div>
      </div>

      {/* Peak Hour */}
      {peakHour && (
        <div className="bg-white border border-black p-4">
          <h3 className="text-xs text-black uppercase tracking-wide mb-2">Peak Hour</h3>
          <p className="text-2xl font-bold text-white">
            {peakHour[0]}:00 - {parseInt(peakHour[0]) + 1}:00
          </p>
          <p className="text-black text-sm">{peakHour[1]} orders during this hour</p>
        </div>
      )}

      {/* Back Link */}
      <div className="mt-6 pt-4 border-t border-black">
        <Link href="/admin/staff/reports" className="text-black hover:text-white text-xs uppercase tracking-wide">
          ← Back to Compare Reports
        </Link>
      </div>
    </div>
  );
}
