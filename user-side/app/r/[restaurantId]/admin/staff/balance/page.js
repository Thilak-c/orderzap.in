'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function StaffBalancePage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const staff = useQuery(api.staff.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const orders = useQuery(api.orders.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const tables = useQuery(api.tables.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const updateStaff = useMutation(api.staff.update);
  const [showSuggestion, setShowSuggestion] = useState(false);

  if (!staff || !orders || !tables) {
    return <div className="p-6 text-slate-600">Loading...</div>;
  }

  // Calculate stats for each staff
  const staffStats = staff.map(s => {
    const myTables = s.assignedTables;
    const myOrders = orders.filter(o => myTables.includes(parseInt(o.tableId)));
    const completedOrders = myOrders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const activeOrders = myOrders.filter(o => o.status !== 'completed').length;

    return {
      ...s,
      tableCount: myTables.length,
      totalOrders: myOrders.length,
      activeOrders,
      totalRevenue,
      ordersPerTable: myTables.length > 0 ? myOrders.length / myTables.length : 0,
    };
  });

  // Calculate averages
  const totalOrders = staffStats.reduce((sum, s) => sum + s.totalOrders, 0);
  const totalTables = staffStats.reduce((sum, s) => sum + s.tableCount, 0);
  const avgOrdersPerStaff = staff.length > 0 ? totalOrders / staff.length : 0;
  const avgTablesPerStaff = staff.length > 0 ? totalTables / staff.length : 0;

  // Find imbalances
  const maxOrders = Math.max(...staffStats.map(s => s.totalOrders));
  const minOrders = Math.min(...staffStats.map(s => s.totalOrders));
  const orderDiff = maxOrders - minOrders;
  const isImbalanced = orderDiff > avgOrdersPerStaff * 0.5 && staff.length > 1;

  // Get overloaded and underloaded staff
  const overloaded = staffStats.filter(s => s.totalOrders > avgOrdersPerStaff * 1.3).sort((a, b) => b.totalOrders - a.totalOrders);
  const underloaded = staffStats.filter(s => s.totalOrders < avgOrdersPerStaff * 0.7).sort((a, b) => a.totalOrders - b.totalOrders);

  // Generate suggestions
  const suggestions = [];
  if (overloaded.length > 0 && underloaded.length > 0) {
    overloaded.forEach(over => {
      // Find tables with most orders for this staff
      const tableOrders = {};
      orders.filter(o => over.assignedTables.includes(parseInt(o.tableId))).forEach(o => {
        tableOrders[o.tableId] = (tableOrders[o.tableId] || 0) + 1;
      });
      
      const sortedTables = Object.entries(tableOrders).sort((a, b) => b[1] - a[1]);
      
      underloaded.forEach(under => {
        if (sortedTables.length > 0 && over.assignedTables.length > 1) {
          const tableToMove = sortedTables[sortedTables.length - 1]; // Move least busy table
          suggestions.push({
            from: over,
            to: under,
            table: parseInt(tableToMove[0]),
            tableOrders: tableToMove[1],
          });
        }
      });
    });
  }

  const applyRebalance = async (suggestion) => {
    // Remove table from overloaded staff
    await updateStaff({
      id: suggestion.from._id,
      name: suggestion.from.name,
      role: suggestion.from.role,
      phone: suggestion.from.phone,
      assignedTables: suggestion.from.assignedTables.filter(t => t !== suggestion.table),
    });

    // Add table to underloaded staff
    await updateStaff({
      id: suggestion.to._id,
      name: suggestion.to.name,
      role: suggestion.to.role,
      phone: suggestion.to.phone,
      assignedTables: [...suggestion.to.assignedTables, suggestion.table].sort((a, b) => a - b),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Balance</h1>
        <p className="text-slate-600 text-xs">Workload distribution & optimization</p>
      </div>

      {/* Balance Status */}
      <div className={`mb-6 p-4 border rounded-xl ${isImbalanced ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isImbalanced ? '⚠️' : '✓'}</span>
            <div>
              <p className={`font-bold ${isImbalanced ? 'text-red-700' : 'text-emerald-700'}`}>
                {isImbalanced ? 'Workload Imbalanced' : 'Workload Balanced'}
              </p>
              <p className="text-slate-600 text-xs">
                Order difference: {orderDiff} ({maxOrders} max, {minOrders} min)
              </p>
            </div>
          </div>
          {isImbalanced && suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestion(!showSuggestion)}
              className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              {showSuggestion ? 'Hide' : 'Show'} Suggestions
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestion && suggestions.length > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs text-slate-600 font-semibold mb-4">Rebalance Suggestions</h3>
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-red-600 font-bold text-sm">{s.from.name}</p>
                    <p className="text-[9px] text-slate-500">{s.from.totalOrders} orders</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">→</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                      T{s.table}
                    </span>
                    <span className="text-slate-500">→</span>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-600 font-bold text-sm">{s.to.name}</p>
                    <p className="text-[9px] text-slate-500">{s.to.totalOrders} orders</p>
                  </div>
                </div>
                <button
                  onClick={() => applyRebalance(s)}
                  className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{staff.length}</p>
          <p className="text-[10px] text-slate-600 font-semibold">Active Staff</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalTables}</p>
          <p className="text-[10px] text-slate-600 font-semibold">Assigned Tables</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{avgOrdersPerStaff.toFixed(0)}</p>
          <p className="text-[10px] text-slate-600 font-semibold">Avg Orders/Staff</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{avgTablesPerStaff.toFixed(1)}</p>
          <p className="text-[10px] text-slate-600 font-semibold">Avg Tables/Staff</p>
        </div>
      </div>

      {/* Staff Workload Visualization */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <h3 className="text-xs text-slate-600 font-semibold mb-4">Workload Distribution</h3>
        <div className="space-y-4">
          {staffStats.sort((a, b) => b.totalOrders - a.totalOrders).map(s => {
            const percentage = maxOrders > 0 ? (s.totalOrders / maxOrders) * 100 : 0;
            const isOver = s.totalOrders > avgOrdersPerStaff * 1.3;
            const isUnder = s.totalOrders < avgOrdersPerStaff * 0.7;
            
            return (
              <div key={s._id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-medium text-sm">{s.name}</span>
                    <span className="text-slate-500 text-xs">({s.tableCount} tables)</span>
                    {isOver && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold">OVERLOADED</span>}
                    {isUnder && <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">UNDERLOADED</span>}
                  </div>
                  <span className="text-slate-900 font-bold">{s.totalOrders} orders</span>
                </div>
                <div className="h-6 bg-slate-100 relative rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isOver ? 'bg-red-500' : isUnder ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  {/* Average line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900/50"
                    style={{ left: `${maxOrders > 0 ? (avgOrdersPerStaff / maxOrders) * 100 : 0}%` }}
                    title="Average"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> Balanced</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> Overloaded</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded" /> Underloaded</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-900/50" /> Average</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 text-[10px] text-slate-600 font-semibold">Staff</th>
              <th className="text-center py-3 px-4 text-[10px] text-slate-600 font-semibold">Tables</th>
              <th className="text-center py-3 px-4 text-[10px] text-slate-600 font-semibold">Orders</th>
              <th className="text-center py-3 px-4 text-[10px] text-slate-600 font-semibold">Active</th>
              <th className="text-center py-3 px-4 text-[10px] text-slate-600 font-semibold">Orders/Table</th>
              <th className="text-center py-3 px-4 text-[10px] text-slate-600 font-semibold">Revenue</th>
              <th className="text-center py-3 px-4 text-[10px] text-slate-600 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {staffStats.sort((a, b) => b.totalOrders - a.totalOrders).map(s => {
              const isOver = s.totalOrders > avgOrdersPerStaff * 1.3;
              const isUnder = s.totalOrders < avgOrdersPerStaff * 0.7;
              
              return (
                <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-slate-900 font-medium">{s.name}</p>
                    <p className="text-slate-500 text-xs">{s.role}</p>
                  </td>
                  <td className="text-center py-3 px-4 text-slate-700">
                    {s.assignedTables.join(', ') || '—'}
                  </td>
                  <td className="text-center py-3 px-4 text-slate-900 font-bold">{s.totalOrders}</td>
                  <td className="text-center py-3 px-4">
                    <span className={s.activeOrders > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                      {s.activeOrders}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 text-slate-700">{s.ordersPerTable.toFixed(1)}</td>
                  <td className="text-center py-3 px-4 text-emerald-600 font-semibold">₹{s.totalRevenue.toLocaleString()}</td>
                  <td className="text-center py-3 px-4">
                    {isOver ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded">HIGH</span>
                    ) : isUnder ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">LOW</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
