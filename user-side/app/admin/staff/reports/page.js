'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function StaffReportsPage() {
  const staff = useQuery(api.staff.listActive);
  const orders = useQuery(api.orders.list);
  const staffCalls = useQuery(api.staffCalls.list);
  const [selectedStaff, setSelectedStaff] = useState([]);

  if (!staff || !orders || !staffCalls) {
    return <div className="p-6 text-black">LOADING...</div>;
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
      <div className="mb-6 border-b border-black pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">STAFF REPORTS</h1>
        <p className="text-black text-xs uppercase tracking-widest">Compare staff performance</p>
      </div>

      {/* Staff Selection */}
      <div className="mb-6 bg-white border border-black p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-black uppercase tracking-wide">Select Staff to Compare</p>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[10px] text-black hover:text-white uppercase">
              Select All
            </button>
            <button onClick={clearAll} className="text-[10px] text-black hover:text-white uppercase">
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {staff.map(s => (
            <button
              key={s._id}
              onClick={() => toggleStaff(s._id)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                selectedStaff.includes(s._id)
                  ? 'bg-white text-black font-bold'
                  : 'bg-white text-black hover:text-white'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      {compareStaff.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-3 px-4 text-[10px] text-black uppercase tracking-wide">Metric</th>
                {compareStaff.map(s => (
                  <th key={s._id} className="text-center py-3 px-4 text-xs text-white font-bold">
                    {s.name}
                    <span className="block text-[9px] text-black font-normal">{s.role}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/50">
                <td className="py-3 px-4 text-black">Assigned Tables</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-white">
                    {s.assignedTables.join(', ') || '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black/50 bg-white/50">
                <td className="py-3 px-4 text-black">Total Orders</td>
                {compareStaff.map(s => {
                  const isMax = s.totalOrders === Math.max(...compareStaff.map(x => x.totalOrders));
                  return (
                    <td key={s._id} className={`text-center py-3 px-4 font-bold ${isMax && compareStaff.length > 1 ? 'text-black' : 'text-white'}`}>
                      {s.totalOrders}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-black/50">
                <td className="py-3 px-4 text-black">Completed Orders</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-white">{s.completedOrders}</td>
                ))}
              </tr>
              <tr className="border-b border-black/50 bg-white/50">
                <td className="py-3 px-4 text-black">Pending Orders</td>
                {compareStaff.map(s => (
                  <td key={s._id} className={`text-center py-3 px-4 ${s.pendingOrders > 0 ? 'text-black' : 'text-black'}`}>
                    {s.pendingOrders}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black/50">
                <td className="py-3 px-4 text-black">Total Revenue</td>
                {compareStaff.map(s => {
                  const isMax = s.totalRevenue === Math.max(...compareStaff.map(x => x.totalRevenue));
                  return (
                    <td key={s._id} className={`text-center py-3 px-4 font-bold ${isMax && compareStaff.length > 1 ? 'text-black' : 'text-white'}`}>
                      ₹{s.totalRevenue.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-black/50 bg-white/50">
                <td className="py-3 px-4 text-black">Avg Order Value</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-white">
                    ₹{s.avgOrderValue.toFixed(0)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black/50">
                <td className="py-3 px-4 text-black">Staff Calls</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-white">{s.totalCalls}</td>
                ))}
              </tr>
              <tr className="border-b border-black/50 bg-white/50">
                <td className="py-3 px-4 text-black">Resolved Calls</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-white">{s.resolvedCalls}</td>
                ))}
              </tr>
              <tr className="border-b border-black/50">
                <td className="py-3 px-4 text-black">Top Table</td>
                {compareStaff.map(s => (
                  <td key={s._id} className="text-center py-3 px-4 text-white">
                    {s.topTable ? `T${s.topTable.table} (${s.topTable.count})` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-black">
          <p className="text-sm">Select staff members above to compare their performance</p>
        </div>
      )}

      {/* All Staff Overview */}
      <div className="mt-8 pt-6 border-t border-black">
        <h2 className="text-xs text-black uppercase tracking-widest mb-4">All Staff Overview</h2>
        <div className="grid gap-3">
          {staffStats.sort((a, b) => b.totalRevenue - a.totalRevenue).map((s, i) => (
            <div key={s._id} className="bg-white border border-black p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-amber-500 text-black' : 'bg-white text-black'
                }`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-black text-xs">{s.role} • Tables: {s.assignedTables.join(', ') || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-white font-bold">₹{s.totalRevenue.toLocaleString()}</p>
                  <p className="text-black text-[10px] uppercase">Revenue</p>
                </div>
                <div>
                  <p className="text-white font-bold">{s.totalOrders}</p>
                  <p className="text-black text-[10px] uppercase">Orders</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
