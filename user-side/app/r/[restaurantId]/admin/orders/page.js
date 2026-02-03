"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import MenuItemImage from "@/components/MenuItemImage";
import { useState, useEffect } from "react";

export default function AdminOrdersPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  const [filter, setFilter] = useState("all");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const orders = useQuery(api.orders.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const updateStatus = useMutation(api.orders.updateStatus);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '1') setFilter('pending');
      if (e.key === '2') setFilter('preparing');
      if (e.key === '3') setFilter('ready');
      if (e.key === '4') setFilter('completed');
      if (e.key === '0') setFilter('all');
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    await updateStatus({ id: orderId, status: newStatus });
    setToastMessage(`✓ Order marked as ${newStatus}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${order.orderNumber || order._id.slice(-4)}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurant?.name || 'Restaurant'}</h1>
            <p>Bill #${order.orderNumber || order._id.slice(-4)}</p>
            <p>Table ${order.tableId}</p>
            <p>${new Date(order._creationTime).toLocaleString()}</p>
          </div>
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
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Filter orders
  const filteredOrders = orders?.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  }) || [];

  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;
  const preparingCount = orders?.filter(o => o.status === 'preparing').length || 0;
  const readyCount = orders?.filter(o => o.status === 'ready').length || 0;
  const completedCount = orders?.filter(o => o.status === 'completed').length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-medium">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
              <p className="text-sm text-slate-600 mt-1">
                {orders?.length || 0} total • ₹{totalRevenue.toLocaleString()} revenue
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({orders?.length || 0})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === 'preparing'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Cooking ({preparingCount})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === 'ready'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Ready ({readyCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === 'completed'
                  ? 'bg-slate-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Done ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-slate-300 mb-2">No {filter !== 'all' ? filter : ''} orders</p>
            <p className="text-slate-500">Orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order._id} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all">
                
                {/* Order Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">#{order.orderNumber || order._id.slice(-4)}</p>
                      <p className="text-sm text-slate-600">Table {order.tableId}</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(order._creationTime).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">₹{order.total.toFixed(0)}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <MenuItemImage 
                          storageId={item.image} 
                          alt={item.name} 
                          className="w-14 h-14 rounded-lg object-cover border-2 border-slate-200" 
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-600">Qty: {item.quantity} • ₹{(item.price * item.quantity).toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
                      <p className="text-sm font-semibold text-amber-900">Special Instructions:</p>
                      <p className="text-sm text-amber-800 mt-1">{order.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'preparing')}
                        className="flex-1 min-w-[200px] px-6 py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-all"
                      >
                        Start Cooking
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'ready')}
                        className="flex-1 min-w-[200px] px-6 py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'completed')}
                        className="flex-1 min-w-[200px] px-6 py-4 bg-slate-500 text-white rounded-xl font-bold text-lg hover:bg-slate-600 transition-all"
                      >
                        Complete Order
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(order)}
                      className="px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
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
      <div className="fixed bottom-6 right-6 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl text-sm">
        <p className="font-semibold mb-2">Quick Filters</p>
        <div className="space-y-1 text-xs">
          <div><kbd className="px-2 py-1 bg-slate-700 rounded">0</kbd> All</div>
          <div><kbd className="px-2 py-1 bg-slate-700 rounded">1</kbd> Pending</div>
          <div><kbd className="px-2 py-1 bg-slate-700 rounded">2</kbd> Cooking</div>
          <div><kbd className="px-2 py-1 bg-slate-700 rounded">3</kbd> Ready</div>
          <div><kbd className="px-2 py-1 bg-slate-700 rounded">4</kbd> Done</div>
        </div>
      </div>
    </div>
  );
}
