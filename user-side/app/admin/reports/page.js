"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { useState, useMemo } from "react";

export default function AdminReportsPage() {
  const { isAuthenticated, loading } = useAdminAuth();
  const orders = useQuery(api.orders.list);
  const tables = useQuery(api.tables.list);
  const [dateRange, setDateRange] = useState('all');

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const orderDate = new Date(order._creationTime).toISOString().split('T')[0];
      switch (dateRange) {
        case 'today': return orderDate === today;
        case 'yesterday': return orderDate === yesterday;
        case 'week': return orderDate >= weekStart;
        case 'month': return orderDate >= monthStart;
        default: return true;
      }
    });
  }, [orders, dateRange, today, yesterday, weekStart, monthStart]);

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!filteredOrders.length) return null;

    // Total revenue
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalRevenue / totalOrders;

    // Table performance
    const tableStats = {};
    filteredOrders.forEach(order => {
      const tableId = order.tableId;
      if (!tableStats[tableId]) {
        tableStats[tableId] = { tableId, orders: 0, revenue: 0 };
      }
      tableStats[tableId].orders++;
      tableStats[tableId].revenue += order.total;
    });
    const tableRanking = Object.values(tableStats).sort((a, b) => b.revenue - a.revenue);

    // Item performance
    const itemStats = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.name;
        if (!itemStats[key]) {
          itemStats[key] = { name: item.name, image: item.image, quantity: 0, revenue: 0, orders: 0 };
        }
        itemStats[key].quantity += item.quantity;
        itemStats[key].revenue += item.price * item.quantity;
        itemStats[key].orders++;
      });
    });
    const itemRanking = Object.values(itemStats).sort((a, b) => b.revenue - a.revenue);
    const topItems = itemRanking.slice(0, 10);
    const bottomItems = [...itemRanking].sort((a, b) => a.revenue - b.revenue).slice(0, 10);

    // Order status breakdown
    const statusCounts = { pending: 0, preparing: 0, ready: 0, completed: 0 };
    filteredOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    // Payment method breakdown
    const paymentCounts = {};
    filteredOrders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      if (!paymentCounts[method]) paymentCounts[method] = { count: 0, revenue: 0 };
      paymentCounts[method].count++;
      paymentCounts[method].revenue += order.total;
    });

    // Hourly distribution
    const hourlyOrders = {};
    filteredOrders.forEach(order => {
      const hour = new Date(order._creationTime).getHours();
      if (!hourlyOrders[hour]) hourlyOrders[hour] = { orders: 0, revenue: 0 };
      hourlyOrders[hour].orders++;
      hourlyOrders[hour].revenue += order.total;
    });

    // Peak hour
    let peakHour = null;
    let peakOrders = 0;
    Object.entries(hourlyOrders).forEach(([hour, data]) => {
      if (data.orders > peakOrders) {
        peakOrders = data.orders;
        peakHour = parseInt(hour);
      }
    });

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      tableRanking,
      topItems,
      bottomItems,
      statusCounts,
      paymentCounts,
      hourlyOrders,
      peakHour,
      peakOrders,
    };
  }, [filteredOrders]);

  if (loading || !isAuthenticated) return null;

  const dateLabels = {
    all: 'All Time',
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This Week',
    month: 'This Month',
  };

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-black pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">REPORTS</h1>
        <p className="text-black text-xs uppercase tracking-widest">Order Analytics & Insights</p>
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'today', 'yesterday', 'week', 'month'].map(f => (
          <button
            key={f}
            onClick={() => setDateRange(f)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wide ${dateRange === f ? 'bg-white text-black font-bold' : 'bg-white text-black hover:bg-white'}`}
          >
            {f === 'all' ? 'All Time' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : f}
          </button>
        ))}
      </div>

      {!analytics ? (
        <div className="bg-white border border-black p-8 text-center">
          <p className="text-black">No orders for this period</p>
        </div>
      ) : (
        <>
          {/* Hard Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <HardNumber label="TOTAL REVENUE" value={analytics.totalRevenue} prefix="₹" highlight="green" />
            <HardNumber label="TOTAL ORDERS" value={analytics.totalOrders} />
            <HardNumber label="AVG ORDER" value={analytics.avgOrderValue.toFixed(2)} prefix="₹" />
            <HardNumber label="PEAK HOUR" value={analytics.peakHour !== null ? `${analytics.peakHour}:00` : '-'} sub={`${analytics.peakOrders} orders`} />
            <HardNumber label="PENDING" value={analytics.statusCounts.pending} highlight={analytics.statusCounts.pending > 0 ? "amber" : undefined} />
          </div>

          {/* Top Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-black">
              <div className="px-4 py-3 border-b border-black">
                <h2 className="text-xs font-bold text-black uppercase tracking-wide">▲ TOP PERFORMING TABLES</h2>
              </div>
              {analytics.tableRanking.length === 0 ? (
                <p className="text-center py-6 text-black text-sm">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-white text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left py-2 px-4 text-black">#</th>
                      <th className="text-left py-2 px-3 text-black">Table</th>
                      <th className="text-right py-2 px-3 text-black">Orders</th>
                      <th className="text-right py-2 px-4 text-black">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.tableRanking.slice(0, 5).map((table, i) => (
                      <tr key={table.tableId} className="border-t border-black/50">
                        <td className="py-2 px-4">
                          <span className={`w-5 h-5 inline-flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium">Table {table.tableId}</td>
                        <td className="py-2 px-3 text-right text-black">{table.orders}</td>
                        <td className="py-2 px-4 text-right font-bold text-black">₹{table.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment Methods */}
            <div className="bg-white border border-black">
              <div className="px-4 py-3 border-b border-black">
                <h2 className="text-xs font-bold text-black uppercase tracking-wide">PAYMENT BREAKDOWN</h2>
              </div>
              <div className="p-4 space-y-3">
                {Object.entries(analytics.paymentCounts).map(([method, data]) => {
                  const labels = {
                    'pay-now': { name: 'Paid Online', color: 'bg-emerald-600' },
                    'pay-counter': { name: 'Pay at Counter', color: 'bg-amber-600' },
                    'pay-table': { name: 'Pay at Table', color: 'bg-blue-600' },
                    'unknown': { name: 'Unknown', color: 'bg-white' },
                  };
                  const label = labels[method] || labels.unknown;
                  const percent = (data.count / analytics.totalOrders * 100).toFixed(0);
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-black">{label.name}</span>
                        <span>{data.count} orders (₹{data.revenue.toFixed(0)})</span>
                      </div>
                      <div className="h-2 bg-white">
                        <div className={`h-full ${label.color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top & Bottom Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Top Items */}
            <div className="bg-white border border-black/10">
              <div className="px-4 py-3 border-b border-black">
                <h2 className="text-xs font-bold text-black uppercase tracking-wide">★ BEST SELLERS</h2>
                <p className="text-[10px] text-black">Most ordered items by revenue</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-white text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-2 px-4 text-black">Item</th>
                    <th className="text-right py-2 px-3 text-black">Qty</th>
                    <th className="text-right py-2 px-4 text-black">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topItems.map((item, i) => (
                    <tr key={item.name} className="border-t border-black/50">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.image}</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-black">{item.quantity}</td>
                      <td className="py-2 px-4 text-right font-bold text-black">₹{item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Items */}
            <div className="bg-white border border-black/10">
              <div className="px-4 py-3 border-b border-black">
                <h2 className="text-xs font-bold text-black uppercase tracking-wide">⚠ SLOW MOVERS</h2>
                <p className="text-[10px] text-black">Least ordered items - consider removing?</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-white text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-2 px-4 text-black">Item</th>
                    <th className="text-right py-2 px-3 text-black">Qty</th>
                    <th className="text-right py-2 px-4 text-black">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.bottomItems.map((item, i) => (
                    <tr key={item.name} className="border-t border-black/50">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.image}</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-black">{item.quantity}</td>
                      <td className="py-2 px-4 text-right text-black">₹{item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Movement / History */}
          <div className="bg-white border border-black">
            <div className="px-4 py-3 border-b border-black flex justify-between items-center">
              <h2 className="text-xs font-bold text-black uppercase tracking-wide">ORDER MOVEMENT</h2>
              <span className="text-[10px] text-black">{filteredOrders.length} orders</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="text-left py-2 px-4 text-black">Time</th>
                  <th className="text-left py-2 px-3 text-black">Order</th>
                  <th className="text-left py-2 px-3 text-black">Table</th>
                  <th className="text-left py-2 px-3 text-black">Items</th>
                  <th className="text-left py-2 px-3 text-black">Status</th>
                  <th className="text-right py-2 px-4 text-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 20).map((order) => (
                  <tr key={order._id} className="border-t border-black/50 hover:bg-white/30">
                    <td className="py-2 px-4">
                      <p className="text-black">{new Date(order._creationTime).toLocaleDateString()}</p>
                      <p className="text-[10px] text-black">{new Date(order._creationTime).toLocaleTimeString()}</p>
                    </td>
                    <td className="py-2 px-3 font-medium">#{order.orderNumber || order._id.slice(-4)}</td>
                    <td className="py-2 px-3 text-black">{order.tableId}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-0.5">
                        {order.items.slice(0, 4).map((item, i) => (
                          <span key={i} className="text-sm">{item.image}</span>
                        ))}
                        {order.items.length > 4 && <span className="text-black text-xs">+{order.items.length - 4}</span>}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-2 px-4 text-right font-bold">₹{order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length > 20 && (
              <div className="px-4 py-3 border-t border-black text-center">
                <span className="text-[10px] text-black">Showing 20 of {filteredOrders.length} orders</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HardNumber({ label, value, prefix = '', sub, highlight }) {
  const colors = {
    green: 'border-l-emerald-500 text-black',
    red: 'border-l-red-500 text-black',
    amber: 'border-l-amber-500 text-black',
  };
  
  return (
    <div className={`bg-white border border-black p-4 ${highlight ? `border-l-4 ${colors[highlight]?.split(' ')[0] || ''}` : ''}`}>
      <p className="text-[10px] text-black uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? colors[highlight]?.split(' ')[1] || 'text-white' : 'text-white'}`}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[10px] text-black mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-950 text-black border-amber-800',
    preparing: 'bg-blue-950 text-black border-blue-800',
    ready: 'bg-emerald-950 text-black border-emerald-800',
    completed: 'bg-white text-black border-black',
  };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 border ${styles[status] || styles.pending}`}>
      {status?.toUpperCase()}
    </span>
  );
}
