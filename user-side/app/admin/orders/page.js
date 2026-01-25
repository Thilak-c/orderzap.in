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
  "pay-now": { label: "PAID", color: "text-emerald-400" },
  "pay-counter": { label: "COUNTER", color: "text-amber-400" },
  "pay-table": { label: "TABLE", color: "text-blue-400" },
};

export default function AdminOrdersPage() {
  const { isAuthenticated, loading } = useAdminAuth();
  const orders = useQuery(api.orders.list);
  const updateStatus = useMutation(api.orders.updateStatus);

  if (loading || !isAuthenticated) return null;

  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight">ORDERS</h1>
        <p className="text-zinc-600 text-[10px] lg:text-xs uppercase tracking-widest">
          {orders?.length || 0} total • {pendingCount} pending • ₹{totalRevenue.toFixed(0)} revenue
        </p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-6 lg:p-8 text-center">
          <p className="text-zinc-600">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="bg-zinc-900 border border-zinc-800">
              {/* Header */}
              <div className="px-3 lg:px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
                  <span className="font-bold text-sm lg:text-base">#{order.orderNumber || order._id.slice(-4)}</span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5">TABLE {order.tableId}</span>
                  {order.paymentMethod && paymentLabels[order.paymentMethod] && (
                    <span className={`text-[10px] ${paymentLabels[order.paymentMethod].color}`}>
                      {paymentLabels[order.paymentMethod].label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 w-full lg:w-auto overflow-x-auto">
                  {statusOptions.map((status) => {
                    const isActive = order.status === status.value;
                    return (
                      <button
                        key={status.value}
                        onClick={() => updateStatus({ id: order._id, status: status.value })}
                        className={`px-2 lg:px-3 py-1 text-[9px] lg:text-[10px] uppercase tracking-wide transition-colors whitespace-nowrap ${
                          isActive
                            ? status.value === 'pending' ? 'bg-amber-600 text-black'
                            : status.value === 'preparing' ? 'bg-blue-600 text-white'
                            : status.value === 'ready' ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-600 text-white'
                            : 'bg-zinc-800 text-zinc-500 hover:text-white'
                        }`}
                      >
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items */}
              <div className="p-3 lg:p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-2 lg:px-3 py-1.5">
                      <MenuItemImage storageId={item.image} alt={item.name} className="w-5 h-5 lg:w-6 lg:h-6 rounded object-cover" />
                      <span className="text-xs lg:text-sm">{item.name}</span>
                      <span className="text-zinc-500 text-[10px] lg:text-xs">×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="p-2 bg-amber-950/30 border border-amber-900/50 text-[10px] lg:text-xs text-amber-400 mb-3">
                    📝 {order.notes}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="text-zinc-600 text-[10px] lg:text-xs">{new Date(order._creationTime).toLocaleString()}</span>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <span className="font-bold text-base lg:text-lg">₹{order.total.toFixed(2)}</span>
                    <button
                      onClick={() => {
                        // Create print content
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Bill #${order.orderNumber || order._id.slice(-4)}</title>
                              <style>
                                body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                                h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
                                .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                                .customer { margin-bottom: 10px; font-size: 12px; }
                                .item { display: flex; justify-content: space-between; margin: 5px 0; }
                                .total { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 16px; }
                                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>OrderZap</h1>
                                <p>Bill #${order.orderNumber || order._id.slice(-4)}</p>
                                <p>Table ${order.tableId}</p>
                                <p>${new Date(order._creationTime).toLocaleString()}</p>
                              </div>
                              ${order.customerName || order.customerPhone ? `
                                <div class="customer">
                                  ${order.customerName ? `<p><strong>Customer:</strong> ${order.customerName}</p>` : ''}
                                  ${order.customerPhone ? `<p><strong>Customer Number:</strong> ${order.customerPhone}</p>` : ''}
                                </div>
                              ` : ''}
                              <div class="items">
                                ${order.items.map(item => `
                                  <div class="item">
                                    <span>${item.name} x${item.quantity}</span>
                                    <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                `).join('')}
                              </div>
                              <div class="total">
                                <div class="item">
                                  <span>TOTAL</span>
                                  <span>₹${order.total.toFixed(2)}</span>
                                </div>
                              </div>
                              ${order.notes ? `<p style="margin-top: 10px; font-size: 12px;">Note: ${order.notes}</p>` : ''}
                              <div class="footer">
                                <p>Thank you for dining with us!</p>
                                <p>Powered by OrderZap</p>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }}
                      className="px-2 lg:px-3 py-1.5 bg-[#d4af7d] text-black text-[9px] lg:text-[10px] uppercase tracking-wide font-semibold hover:bg-[#c49d6b] transition-colors whitespace-nowrap"
                    >
                      Print Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
