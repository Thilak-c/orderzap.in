'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function StaffBalancePage() {
  const staff = useQuery(api.staff.listActive);
  const orders = useQuery(api.orders.list);
  const tables = useQuery(api.tables.list);
  const updateStaff = useMutation(api.staff.update);
  const [showSuggestion, setShowSuggestion] = useState(false);

  if (!staff || !orders || !tables) {
    return <div className="p-6 text-black">LOADING...</div>;
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
      <div className="mb-6 border-b border-black pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">STAFF BALANCE</h1>
        <p className="text-black text-xs uppercase tracking-widest">Workload distribution & optimization</p>
      </div>

      {/* Balance Status */}
      <div className={`mb-6 p-4 border ${isImbalanced ? 'bg-black/5 border-black/10' : 'bg-black/5 border-black/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isImbalanced ? '⚠️' : '✓'}</span>
            <div>
              <p className={`font-bold ${isImbalanced ? 'text-black' : 'text-black'}`}>
                {isImbalanced ? 'Workload Imbalanced' : 'Workload Balanced'}
              </p>
              <p className="text-black text-xs">
                Order difference: {orderDiff} ({maxOrders} max, {minOrders} min)
              </p>
            </div>
          </div>
          {isImbalanced && suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestion(!showSuggestion)}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-white"
            >
              {showSuggestion ? 'Hide' : 'Show'} Suggestions
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestion && suggestions.length > 0 && (
        <div className="mb-6 bg-white border border-black p-4">
          <h3 className="text-xs text-black uppercase tracking-wide mb-4">Rebalance Suggestions</h3>
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/50 border border-black">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-black font-bold text-sm">{s.from.name}</p>
                    <p className="text-[9px] text-black">{s.from.totalOrders} orders</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-black">→</span>
                    <span className="px-2 py-1 bg-black/5 text-black text-xs font-bold">
                      T{s.table}
                    </span>
                    <span className="text-black">→</span>
                  </div>
                  <div className="text-center">
                    <p className="text-black font-bold text-sm">{s.to.name}</p>
                    <p className="text-[9px] text-black">{s.to.totalOrders} orders</p>
                  </div>
                </div>
                <button
                  onClick={() => applyRebalance(s)}
                  className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-bold uppercase hover:bg-green-400"
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
        <div className="bg-white border border-black p-4 text-center">
          <p className="text-2xl font-bold text-white">{staff.length}</p>
          <p className="text-[10px] text-black uppercase">Active Staff</p>
        </div>
        <div className="bg-white border border-black p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalTables}</p>
          <p className="text-[10px] text-black uppercase">Assigned Tables</p>
        </div>
        <div className="bg-white border border-black p-4 text-center">
          <p className="text-2xl font-bold text-white">{avgOrdersPerStaff.toFixed(0)}</p>
          <p className="text-[10px] text-black uppercase">Avg Orders/Staff</p>
        </div>
        <div className="bg-white border border-black p-4 text-center">
          <p className="text-2xl font-bold text-white">{avgTablesPerStaff.toFixed(1)}</p>
          <p className="text-[10px] text-black uppercase">Avg Tables/Staff</p>
        </div>
      </div>

      {/* Staff Workload Visualization */}
      <div className="bg-white border border-black p-4 mb-6">
        <h3 className="text-xs text-black uppercase tracking-wide mb-4">Workload Distribution</h3>
        <div className="space-y-4">
          {staffStats.sort((a, b) => b.totalOrders - a.totalOrders).map(s => {
            const percentage = maxOrders > 0 ? (s.totalOrders / maxOrders) * 100 : 0;
            const isOver = s.totalOrders > avgOrdersPerStaff * 1.3;
            const isUnder = s.totalOrders < avgOrdersPerStaff * 0.7;
            
            return (
              <div key={s._id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{s.name}</span>
                    <span className="text-black text-xs">({s.tableCount} tables)</span>
                    {isOver && <span className="text-[9px] px-1.5 py-0.5 bg-black/5 text-black">OVERLOADED</span>}
                    {isUnder && <span className="text-[9px] px-1.5 py-0.5 bg-black/5 text-black">UNDERLOADED</span>}
                  </div>
                  <span className="text-white font-bold">{s.totalOrders} orders</span>
                </div>
                <div className="h-6 bg-white relative">
                  <div
                    className={`h-full transition-all ${
                      isOver ? 'bg-red-500' : isUnder ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  {/* Average line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                    style={{ left: `${maxOrders > 0 ? (avgOrdersPerStaff / maxOrders) * 100 : 0}%` }}
                    title="Average"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black text-[10px] text-black">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500" /> Balanced</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500" /> Overloaded</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500" /> Underloaded</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white/50" /> Average</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-black">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-3 px-4 text-[10px] text-black uppercase">Staff</th>
              <th className="text-center py-3 px-4 text-[10px] text-black uppercase">Tables</th>
              <th className="text-center py-3 px-4 text-[10px] text-black uppercase">Orders</th>
              <th className="text-center py-3 px-4 text-[10px] text-black uppercase">Active</th>
              <th className="text-center py-3 px-4 text-[10px] text-black uppercase">Orders/Table</th>
              <th className="text-center py-3 px-4 text-[10px] text-black uppercase">Revenue</th>
              <th className="text-center py-3 px-4 text-[10px] text-black uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {staffStats.sort((a, b) => b.totalOrders - a.totalOrders).map(s => {
              const isOver = s.totalOrders > avgOrdersPerStaff * 1.3;
              const isUnder = s.totalOrders < avgOrdersPerStaff * 0.7;
              
              return (
                <tr key={s._id} className="border-b border-black/50 hover:bg-white/30">
                  <td className="py-3 px-4">
                    <p className="text-white font-medium">{s.name}</p>
                    <p className="text-black text-xs">{s.role}</p>
                  </td>
                  <td className="text-center py-3 px-4 text-black">
                    {s.assignedTables.join(', ') || '—'}
                  </td>
                  <td className="text-center py-3 px-4 text-white font-bold">{s.totalOrders}</td>
                  <td className="text-center py-3 px-4">
                    <span className={s.activeOrders > 0 ? 'text-black' : 'text-black'}>
                      {s.activeOrders}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 text-black">{s.ordersPerTable.toFixed(1)}</td>
                  <td className="text-center py-3 px-4 text-black">₹{s.totalRevenue.toLocaleString()}</td>
                  <td className="text-center py-3 px-4">
                    {isOver ? (
                      <span className="px-2 py-1 bg-black/5 text-black text-[10px] font-bold">HIGH</span>
                    ) : isUnder ? (
                      <span className="px-2 py-1 bg-black/5 text-black text-[10px] font-bold">LOW</span>
                    ) : (
                      <span className="px-2 py-1 bg-black/5 text-black text-[10px] font-bold">OK</span>
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
