"use client";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import MenuItemImage from "@/components/MenuItemImage";

export default function AdminDashboard() {
  const { isAuthenticated, loading } = useAdminAuth();
  const stats = useQuery(api.orders.getStats);
  const orders = useQuery(api.orders.list);
  const staffCalls = useQuery(api.staffCalls.listPending);
  const zoneRequests = useQuery(api.zoneRequests.listPending);
  const resolveStaffCall = useMutation(api.staffCalls.updateStatus);
  const resolveZoneRequest = useMutation(api.zoneRequests.updateStatus);
  const seedMenu = useMutation(api.menuItems.seed);
  const seedZones = useMutation(api.zones.seed);
  const seedTables = useMutation(api.tables.seed);

  const handleSeed = async () => {
    await seedZones();
    await seedMenu();
    await seedTables();
    alert("Database seeded!");
  };

  if (loading) return null;
  if (!isAuthenticated) return null;

  const pendingOrders = stats?.pendingOrders ?? 0;
  const preparingOrders = stats?.preparingOrders ?? 0;
  const todayRevenue = stats?.todayRevenue ?? 0;
  const pendingCalls = staffCalls?.length ?? 0;
  const pendingRequests = zoneRequests?.length ?? 0;

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">DASHBOARD</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">System Overview</p>
        </div>
        <button onClick={handleSeed} className="bg-zinc-800 text-zinc-400 px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700 hover:text-white">
          SEED DB
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <MetricCard label="PENDING" value={pendingOrders} highlight={pendingOrders > 0 ? "amber" : undefined} />
        <MetricCard label="PREPARING" value={preparingOrders} highlight={preparingOrders > 0 ? "blue" : undefined} />
        <MetricCard label="TODAY REVENUE" value={`₹${todayRevenue.toFixed(0)}`} highlight="green" />
        <MetricCard label="STAFF CALLS" value={pendingCalls} highlight={pendingCalls > 0 ? "red" : undefined} />
        <MetricCard label="ZONE REQUESTS" value={pendingRequests} highlight={pendingRequests > 0 ? "amber" : undefined} />
      </div>

      {/* Staff Calls & Zone Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Staff Calls */}
        <div className="bg-zinc-900 border border-zinc-800">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">! STAFF CALLS</h2>
            {pendingCalls > 0 && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5">{pendingCalls}</span>}
          </div>
          {!staffCalls || staffCalls.length === 0 ? (
            <p className="text-center py-6 text-zinc-600 text-sm">No pending calls</p>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
              {staffCalls.map((call) => (
                <div key={call._id} className="p-3 flex justify-between items-center hover:bg-zinc-800/50">
                  <div>
                    <p className="font-medium text-sm">Table {call.tableNumber}</p>
                    <p className="text-[10px] text-zinc-600">{call.zoneName || "Unknown zone"}</p>
                    {call.reason && <p className="text-[10px] text-amber-400 mt-1">{call.reason}</p>}
                  </div>
                  <button
                    onClick={() => resolveStaffCall({ id: call._id, status: "resolved" })}
                    className="text-[10px] bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-500"
                  >
                    RESOLVE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone Requests */}
        <div className="bg-zinc-900 border border-zinc-800">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">◎ ZONE REQUESTS</h2>
            {pendingRequests > 0 && <span className="text-[10px] bg-amber-600 text-black px-2 py-0.5">{pendingRequests}</span>}
          </div>
          {!zoneRequests || zoneRequests.length === 0 ? (
            <p className="text-center py-6 text-zinc-600 text-sm">No pending requests</p>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
              {zoneRequests.map((req) => (
                <div key={req._id} className="p-3 flex justify-between items-center hover:bg-zinc-800/50">
                  <div>
                    <p className="font-medium text-sm">Table {req.tableNumber}</p>
                    <p className="text-[10px] text-zinc-600">{req.currentZone || "Current"} → <span className="text-amber-400">{req.requestedZone}</span></p>
                  </div>
                  <button
                    onClick={() => resolveZoneRequest({ id: req._id, status: "approved" })}
                    className="text-[10px] bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-500"
                  >
                    APPROVE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-zinc-900 border border-zinc-800">
        <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">▤ RECENT ORDERS</h2>
          <Link href="/admin/orders" className="text-[10px] text-zinc-500 hover:text-white">VIEW ALL →</Link>
        </div>
        {!orders || orders.length === 0 ? (
          <p className="text-center py-8 text-zinc-600 text-sm">No orders yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="text-left py-2 px-4 text-zinc-500">Order</th>
                <th className="text-left py-2 px-3 text-zinc-500">Table</th>
                <th className="text-left py-2 px-3 text-zinc-500">Items</th>
                <th className="text-left py-2 px-3 text-zinc-500">Status</th>
                <th className="text-right py-2 px-4 text-zinc-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order._id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 px-4 font-medium">#{order.orderNumber || order._id.slice(-4)}</td>
                  <td className="py-2 px-3 text-zinc-500">{order.tableId}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {order.items.slice(0, 3).map((item, i) => (
                        <MenuItemImage key={i} storageId={item.image} alt={item.name} className="w-6 h-6 rounded object-cover" />
                      ))}
                      {order.items.length > 3 && <span className="text-zinc-600 text-xs">+{order.items.length - 3}</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-2 px-4 text-right font-medium">₹{order.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight }) {
  const colors = {
    green: 'border-l-emerald-500 text-emerald-400',
    red: 'border-l-red-500 text-red-400',
    amber: 'border-l-amber-500 text-amber-400',
    blue: 'border-l-blue-500 text-blue-400',
  };
  
  return (
    <div className={`bg-zinc-900 border border-zinc-800 p-4 ${highlight ? `border-l-4 ${colors[highlight].split(' ')[0]}` : ''}`}>
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? colors[highlight].split(' ')[1] : 'text-white'}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-950 text-amber-400 border-amber-800',
    preparing: 'bg-blue-950 text-blue-400 border-blue-800',
    ready: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    completed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 border ${styles[status] || styles.pending}`}>
      {status.toUpperCase()}
    </span>
  );
}
