'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function StaffReportsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const staff = useQuery(api.staff.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const orders = useQuery(api.orders.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const staffCalls = useQuery(api.staffCalls.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const [selectedStaff, setSelectedStaff] = useState([]);

  if (!staff || !orders || !staffCalls) {
    return <div className="p-6 text-slate-600">Loading...</div>;
  }

  const toggleStaff = (id) => {
    setSelectedStaff(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedStaff(staff.map(s => s._id));
  const clearAll = () => setSelectedStaff([]);

  // Calculate stats for each staff
  const staffStats = staff.map(s => {
    const myTables = s.assignedTables;
    const myOrders = orders.filter(o => myTables.includes(parseInt(o.tableId)));
    const myCalls = staffCalls.filter(c => myTables.includes(c.tableNumber));
    
    const completedOrders = myOrders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const resolvedCalls = myCalls.filter(c => c.status === 'resolved');
    
    // Orders by table
    const ordersByTable = {};
    myOrders.forEach(o => {
      ordersByTable[o.tableId] = (ordersByTable[o.tableId] || 0) + 1;
    });
    const topTable = Object.entries(ordersByTable).sort((a, b) => b[1] - a[1])[0];

    return {
      ...s,
      totalOrders: myOrders.length,
      completedOrders: completedOrders.length,
      pendingOrders: myOrders.filter(o => o.status !== 'completed').length,
      totalRevenue,
      avgOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
      totalCalls: myCalls.length,
      resolvedCalls: resolvedCalls.length,
      topTable: topTable ? { table: topTable[0], count: topTable[1] } : null,
      ordersByTable,
    };
  });

  const compareStaff = staffStats.filter(s => selectedStaff.includes(s._id));

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Reports</h1>
        <p className="text-slate-600 text-xs">Compare staff performance</p>
      </div>

      {/* Staff Selection */}
      <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-600 font-semibold">Select Staff to Compare</p>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold">
              Select All
            </button>
            <button onClick={clearAll} className="text-[10px] text-slate-600 hover:text-slate-900 font-semibold">
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {staff.map(s => (
            <button
              key={s._id}
              onClick={() => toggleStaff(s._id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedStaff.includes(s._id)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      {compareStaff.length > 0 ? (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-[10px] text-slate-600 font-semibold">Metric</th>
                {compareStaff.map(s => (
                  <th key={s._id} className="text-center py-3 px-4 text-xs text-slate-900 font-bold">
                    {s.name}
                    <span className="block text-[9px] text-slate-500 font-normal">{s.role}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Assigned Tables</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-slate-900">
                    {s.assignedTables.join(', ') || '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="py-3 px-4 text-slate-600">Total Orders</td>
                {compareStaff.map(s => {
                  const isMax = s.totalOrders === Math.max(...compareStaff.map(x => x.totalOrders));
                  return (
                    <td key={s._id} className={`text-center py-3 px-4 font-bold ${isMax && compareStaff.length > 1 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {s.totalOrders}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Completed Orders</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-slate-900">{s.completedOrders}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="py-3 px-4 text-slate-600">Pending Orders</td>
                {compareStaff.map(s => (
                  <td key={s._id} className={`text-center py-3 px-4 ${s.pendingOrders > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                    {s.pendingOrders}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Total Revenue</td>
                {compareStaff.map(s => {
                  const isMax = s.totalRevenue === Math.max(...compareStaff.map(x => x.totalRevenue));
                  return (
                    <td key={s._id} className={`text-center py-3 px-4 font-bold ${isMax && compareStaff.length > 1 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      ₹{s.totalRevenue.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="py-3 px-4 text-slate-600">Avg Order Value</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-slate-900">
                    ₹{s.avgOrderValue.toFixed(0)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Staff Calls</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-slate-900">{s.totalCalls}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="py-3 px-4 text-slate-600">Resolved Calls</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-slate-900">{s.resolvedCalls}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Top Table</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-slate-900">
                    {s.topTable ? `T${s.topTable.table} (${s.topTable.count})` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600">
          <p className="text-sm">Select staff members above to compare their performance</p>
        </div>
      )}

      {/* All Staff Overview */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h2 className="text-xs text-slate-600 font-semibold mb-4">All Staff Overview</h2>
        <div className="grid gap-3">
          {staffStats.sort((a, b) => b.totalRevenue - a.totalRevenue).map((s, i) => (
            <div key={s._id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-slate-900 font-medium">{s.name}</p>
                  <p className="text-slate-500 text-xs">{s.role} • Tables: {s.assignedTables.join(', ') || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-slate-900 font-bold">₹{s.totalRevenue.toLocaleString()}</p>
                  <p className="text-slate-500 text-[10px] font-semibold">Revenue</p>
                </div>
                <div>
                  <p className="text-slate-900 font-bold">{s.totalOrders}</p>
                  <p className="text-slate-500 text-[10px] font-semibold">Orders</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
