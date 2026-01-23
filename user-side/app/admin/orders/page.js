"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import MenuItemImage from "@/components/MenuItemImage";

const statusOptions = [
  { value: "pending", label: "PENDING" },
  { value: "preparing", label: "PREP" },
  { value: "ready", label: "READY" },
  { value: "completed", label: "DONE" },
];

const paymentLabels = {
  "pay-now": { label: "PAID", color: "text-black" },
  "pay-counter": { label: "COUNTER", color: "text-black" },
  "pay-table": { label: "TABLE", color: "text-black" },
};

export default function AdminOrdersPage() {
  const { isAuthenticated, loading } = useAdminAuth();
  const orders = useQuery(api.orders.list);
  const updateStatus = useMutation(api.orders.updateStatus);

  if (loading || !isAuthenticated) return null;

  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-black pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">ORDERS</h1>
        <p className="text-black text-xs uppercase tracking-widest">{orders?.length || 0} total • {pendingCount} pending • ₹{totalRevenue.toFixed(0)} revenue</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white border border-black p-8 text-center">
          <p className="text-black">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="bg-white border border-black">
              {/* Header */}
              <div className="px-4 py-3 border-b border-black flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold">#{order.orderNumber || order._id.slice(-4)}</span>
                  <span className="text-[10px] text-black bg-white px-2 py-0.5">TABLE {order.tableId}</span>
                  {order.paymentMethod && paymentLabels[order.paymentMethod] && (
                    <span className={`text-[10px] ${paymentLabels[order.paymentMethod].color}`}>
                      {paymentLabels[order.paymentMethod].label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {statusOptions.map((status) => {
                    const isActive = order.status === status.value;
                    return (
                      <button
                        key={status.value}
                        onClick={() => updateStatus({ id: order._id, status: status.value })}
                        className={`px-3 py-1 text-[10px] uppercase tracking-wide transition-colors ${
                          isActive
                            ? status.value === 'pending' ? 'bg-amber-600 text-black'
                            : status.value === 'preparing' ? 'bg-blue-600 text-white'
                            : status.value === 'ready' ? 'bg-emerald-600 text-white'
                            : 'bg-white text-white'
                            : 'bg-white text-black hover:text-white'
                        }`}
                      >
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white border border-black px-3 py-1.5">
                      <MenuItemImage storageId={item.image} alt={item.name} className="w-6 h-6 rounded object-cover" />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-black text-xs">×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="p-2 bg-black/5 border border-black/10 text-xs text-black mb-3">
                    📝 {order.notes}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-black">{new Date(order._creationTime).toLocaleString()}</span>
                  <span className="font-bold text-lg">₹{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
