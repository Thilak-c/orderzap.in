"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import MenuItemImage from "@/components/MenuItemImage";
import { useState, useEffect, useRef } from "react";

export default function AdminDashboard() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const audioRef = useRef(null);
  
  // Get restaurant info first
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;

  // Fetch data filtered by restaurant
  const stats = useQuery(api.orders.getStats, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const orders = useQuery(api.orders.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const staffCalls = useQuery(api.staffCalls.listPending, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const zoneRequests = useQuery(api.zoneRequests.listPending, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const resolveStaffCall = useMutation(api.staffCalls.updateStatus);
  const resolveZoneRequest = useMutation(api.zoneRequests.updateStatus);
  const updateRestaurant = useMutation(api.restaurants.update);
  const updateOrderStatus = useMutation(api.orders.updateStatus);

  // Play sound for new orders
  useEffect(() => {
    if (stats?.pendingOrders > 0) {
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [stats?.pendingOrders]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      // Cmd/Ctrl + O for orders
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        window.location.href = `/r/${restaurantId}/admin/orders`;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [restaurantId]);

  const toggleRestaurantStatus = async () => {
    if (!restaurantDbId) return;
    const newStatus = !restaurant?.active;
    await updateRestaurant({ 
      restaurantId: restaurantDbId, 
      active: newStatus 
    });
    showToast(newStatus ? "✓ Restaurant opened" : "✓ Restaurant closed");
  };

  const showToast = (message) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleQuickAction = async (orderId, newStatus) => {
    await updateOrderStatus({ id: orderId, status: newStatus });
    showToast(`✓ Order marked as ${newStatus}`);
  };

  const handlePrintKOT = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>KOT #${order.orderNumber || order._id.slice(-4)}</title>
          <style>
            body { font-family: monospace; padding: 16px; max-width: 280px; margin: 0 auto; font-size: 14px; }
            .kot-header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .kot-header h1 { font-size: 22px; margin: 0 0 4px 0; }
            .kot-meta { font-size: 16px; font-weight: bold; margin: 4px 0; }
            .kot-item { font-size: 15px; margin: 6px 0; padding: 4px 0; border-bottom: 1px dashed #ccc; }
            .kot-item .qty { font-weight: bold; margin-right: 8px; }
            .kot-notes { margin-top: 12px; padding: 8px; background: #f5f5f5; font-size: 13px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="kot-header">
            <h1>KITCHEN ORDER</h1>
            <p class="kot-meta">#${order.orderNumber || order._id.slice(-4)} | Table ${order.tableId}</p>
            <p style="font-size: 12px;">${new Date(order._creationTime).toLocaleString()}</p>
          </div>
          <div class="kot-items">
            ${order.items.map(item => `
              <div class="kot-item"><span class="qty">${item.quantity}x</span> ${item.name}</div>
            `).join('')}
          </div>
          ${order.notes ? `<div class="kot-notes"><strong>Note:</strong> ${order.notes}</div>` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintBill = (order) => {
    const billNumber = order.orderNumber || order._id.slice(-6).toUpperCase();
    const dateTime = new Date(order._creationTime);
    const dateStr = dateTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const depositUsed = order.depositUsed ?? 0;
    const paymentLabel = { 'pay-now': 'Paid Online', 'pay-later': 'Pay Later', 'pay-counter': 'Pay at Counter', 'pay-table': 'Pay at Table' }[order.paymentMethod] || order.paymentMethod;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${billNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; max-width: 380px; margin: 0 auto; font-size: 13px; color: #111; }
            .bill { border: 2px solid #000; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
            .header h1 { font-size: 20px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: 0.5px; }
            .bill-no { font-size: 18px; font-weight: 700; margin: 8px 0 4px 0; }
            .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; }
            .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; padding: 6px 4px; font-weight: 600; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ddd; }
            td { padding: 6px 4px; border-bottom: 1px dotted #eee; }
            td.num { text-align: center; }
            td.amt { text-align: right; font-weight: 500; }
            .summary { margin-top: 12px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .summary-row.total { font-size: 16px; font-weight: 700; border-top: 2px solid #000; margin-top: 8px; padding-top: 10px; }
            .notes { margin-top: 12px; padding: 10px; background: #f8f8f8; border: 1px solid #eee; font-size: 12px; }
            .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 2px dashed #000; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="header">
              <h1>${(restaurant?.name || restaurant?.brandName || 'Restaurant').toUpperCase()}</h1>
              <p class="bill-no">BILL NO. ${billNumber}</p>
              <div class="meta">
                <span>Date: ${dateStr}</span>
                <span>Time: ${timeStr}</span>
              </div>
              <div class="meta">
                <span>Table: ${order.tableId}</span>
                <span>Order ID: ${order._id.slice(-8)}</span>
              </div>
            </div>

            <div class="section-title">Itemised Bill</div>
            <table>
              <thead>
                <tr>
                  <th class="num">#</th>
                  <th>Item</th>
                  <th class="num">Qty</th>
                  <th class="amt">Rate (₹)</th>
                  <th class="amt">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((item, idx) => {
                  const amt = item.price * item.quantity;
                  return `<tr>
                    <td class="num">${idx + 1}</td>
                    <td>${item.name}</td>
                    <td class="num">${item.quantity}</td>
                    <td class="amt">${item.price.toFixed(2)}</td>
                    <td class="amt">${amt.toFixed(2)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>

            <div class="section-title">Bill Summary</div>
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>₹${subtotal.toFixed(2)}</span>
              </div>
              ${depositUsed > 0 ? `
              <div class="summary-row">
                <span>Deposit / Credit applied</span>
                <span>- ₹${depositUsed.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="summary-row total">
                <span>TOTAL</span>
                <span>₹${order.total.toFixed(2)}</span>
              </div>
            </div>

            <div class="section-title">Payment</div>
            <div class="summary">
              <div class="summary-row">
                <span>Payment method</span>
                <span>${paymentLabel}</span>
              </div>
            </div>

            ${order.notes ? `
            <div class="section-title">Order Notes</div>
            <div class="notes">${order.notes}</div>
            ` : ''}

            <div class="footer">
              <p style="margin: 0 0 4px 0;"><strong>Thank you for dining with us!</strong></p>
              <p style="margin: 0;">Generated on ${new Date().toLocaleString('en-IN')}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const pendingOrders = stats?.pendingOrders ?? 0;
  const preparingOrders = stats?.preparingOrders ?? 0;
  const todayRevenue = stats?.todayRevenue ?? 0;
  const pendingCalls = staffCalls?.length ?? 0;
  const pendingRequests = zoneRequests?.length ?? 0;
  
  const totalOrders = orders?.length ?? 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length ?? 0;
  const avgOrderValue = totalOrders > 0 ? todayRevenue / totalOrders : 0;

  // Priority calculation
  const hasUrgentIssues = pendingOrders > 5 || pendingCalls > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-medium">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Top Bar - Always Visible */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                id="global-search"
                type="text"
                placeholder="Search orders, tables, menu... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleRestaurantStatus}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  restaurant?.active 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {restaurant?.active ? 'OPEN' : 'CLOSED'}
              </button>
              
              <Link
                href={`/r/${restaurantId}/admin/orders`}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all"
              >
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* URGENT SECTION - Priority Pyramid */}
        {hasUrgentIssues && (
          <div className="mb-8">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-red-900 mb-4">⚠️ URGENT ATTENTION NEEDED</h2>
              
              {/* Pending Orders Alert */}
              {pendingOrders > 5 && (
                <div className="bg-white rounded-xl p-5 mb-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{pendingOrders} orders waiting</p>
                      <p className="text-sm text-slate-600">Some orders are over 10 minutes old</p>
                    </div>
                    <Link
                      href={`/r/${restaurantId}/admin/orders`}
                      className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                    >
                      Handle Now
                    </Link>
                  </div>
                </div>
              )}

              {/* Staff Calls */}
              {pendingCalls > 0 && (
                <div className="bg-white rounded-xl p-5 border border-red-200">
                  <p className="text-lg font-bold text-slate-900 mb-4">{pendingCalls} staff calls waiting</p>
                  <div className="space-y-3">
                    {staffCalls?.slice(0, 3).map((call) => (
                      <div key={call._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900">Table {call.tableNumber}</p>
                          {call.reason && <p className="text-sm text-slate-600 mt-1">{call.reason}</p>}
                        </div>
                        <button
                          onClick={() => {
                            resolveStaffCall({ id: call._id, status: "resolved" });
                            showToast("✓ Call resolved");
                          }}
                          className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all"
                        >
                          Resolve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TODAY'S NUMBERS - Simple & Clear */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Today's Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-2">Revenue</p>
              <p className="text-4xl font-bold text-slate-900 mb-1">₹{todayRevenue.toLocaleString()}</p>
              <p className="text-sm text-emerald-600 font-semibold">+23% from yesterday</p>
            </div>

            <div className={`bg-gradient-to-br ${pendingOrders > 5 ? 'from-red-50 to-white border-red-200' : 'from-amber-50 to-white border-amber-200'} border rounded-2xl p-6`}>
              <p className="text-sm text-slate-600 mb-2">Pending Orders</p>
              <p className="text-4xl font-bold text-slate-900 mb-1">{pendingOrders}</p>
              <p className="text-sm text-slate-600">{preparingOrders} in kitchen</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-2">Completed</p>
              <p className="text-4xl font-bold text-slate-900 mb-1">{completedOrders}</p>
              <p className="text-sm text-slate-600">{totalOrders} total orders</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-2">Avg Order Value</p>
              <p className="text-4xl font-bold text-slate-900 mb-1">₹{avgOrderValue.toFixed(0)}</p>
              <p className="text-sm text-purple-600 font-semibold">+12% from average</p>
            </div>

          </div>
        </div>

        {/* RECENT ORDERS - Simplified Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Orders</h2>
              <p className="text-sm text-slate-600 mt-1">{totalOrders} orders today</p>
            </div>
            <Link
              href={`/r/${restaurantId}/admin/orders`}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All →
            </Link>
          </div>

          {!orders || orders.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-2xl font-bold text-slate-300 mb-2">No orders yet</p>
              <p className="text-slate-500">Orders will appear here once customers start ordering</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 10).map((order) => (
                <div key={order._id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-6">
                    
                    {/* Order Info */}
                    <div className="flex items-center gap-6 flex-1">
                      <div className="min-w-[100px]">
                        <p className="text-lg font-bold text-slate-900">#{order.orderNumber || order._id.slice(-4)}</p>
                        <p className="text-sm text-slate-500">Table {order.tableId}</p>
                      </div>

                      {/* Items Preview */}
                      <div className="flex items-center gap-2">
                        {order.items.slice(0, 3).map((item, i) => (
                          <MenuItemImage 
                            key={i} 
                            storageId={item.image} 
                            alt={item.name} 
                            className="w-12 h-12 rounded-xl object-cover border-2 border-slate-200" 
                          />
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-sm text-slate-500 font-semibold">+{order.items.length - 3} more</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="min-w-[120px]">
                      <StatusBadge status={order.status} />
                    </div>

                    {/* Amount */}
                    <div className="min-w-[100px] text-right">
                      <p className="text-xl font-bold text-slate-900">₹{order.total.toFixed(0)}</p>
                    </div>

                    {/* Quick Actions + Print */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.status !== 'completed' && (
                        <>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleQuickAction(order._id, 'preparing')}
                              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all"
                            >
                              Start
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleQuickAction(order._id, 'ready')}
                              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all"
                            >
                              Ready
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleQuickAction(order._id, 'completed')}
                              className="px-4 py-2 bg-slate-500 text-white rounded-xl text-sm font-semibold hover:bg-slate-600 transition-all"
                            >
                              Complete
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => handlePrintKOT(order)}
                        className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all"
                      >
                        Print KOT
                      </button>
                      <button
                        onClick={() => handlePrintBill(order)}
                        className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all"
                      >
                        Print Bill
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <p className="text-sm font-semibold text-slate-900 mb-3">Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono">⌘K</kbd>
              <span className="ml-2 text-slate-600">Search</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono">⌘O</kbd>
              <span className="ml-2 text-slate-600">Orders</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono">⌘M</kbd>
              <span className="ml-2 text-slate-600">Menu</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono">⌘R</kbd>
              <span className="ml-2 text-slate-600">Reports</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Simplified Status Badge
function StatusBadge({ status }) {
  const styles = {
    pending: {
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      label: 'PENDING'
    },
    preparing: {
      bg: 'bg-blue-100',
      text: 'text-blue-900',
      label: 'COOKING'
    },
    ready: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-900',
      label: 'READY'
    },
    completed: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      label: 'DONE'
    },
  };
  
  const style = styles[status] || styles.pending;
  
  return (
    <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
