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
      if (e.key === '5') setFilter('cancelled');
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

  const handlePrintKOT = async (order) => {
    // Auto-update status from pending to preparing
    if (order.status === 'pending') {
      await updateStatus({ id: order._id, status: 'preparing' });
      setToastMessage('✓ Order sent to kitchen');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>KOT #${order.orderNumber || order._id.slice(-4)}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 10px; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              padding: 15px; 
              max-width: 300px; 
              margin: 0 auto;
              font-size: 14px;
            }
            h1 { 
              text-align: center; 
              font-size: 24px; 
              margin: 10px 0;
              font-weight: bold;
              text-transform: uppercase;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px dashed #000; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 13px;
            }
            .item { 
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px dashed #ccc;
            }
            .item-name {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 3px;
            }
            .item-qty {
              font-size: 20px;
              font-weight: bold;
            }
            .notes {
              margin-top: 15px;
              padding: 10px;
              border: 2px solid #000;
              background: #f5f5f5;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 11px;
              border-top: 2px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KOT ${order.orderNumber || order._id.slice(-4)}</h1>
            <div class="info-row">
              <strong>Order #:</strong>
              <span>${order.orderNumber || order._id.slice(-4)}</span>
            </div>
            <div class="info-row">
              <strong>Table:</strong>
              <span>${order.tableId}</span>
            </div>
            <div class="info-row">
              <strong>Time:</strong>
              <span>${new Date(order._creationTime).toLocaleTimeString()}</span>
            </div>
            <div class="info-row">
              <strong>Date:</strong>
              <span>${new Date(order._creationTime).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="items">
            ${order.items.map(item => `
              <div class="item">
                <div class="item-name">${item.name}</div>
                <div class="info-row">
                  <span>Quantity:</span>
                  <span class="item-qty">x${item.quantity}</span>
                </div>
              </div>
            `).join('')}
          </div>
          ${order.notes ? `
            <div class="notes">
              <strong>SPECIAL INSTRUCTIONS:</strong><br/>
              ${order.notes}
            </div>
          ` : ''}
          <div class="footer">
            <p>Kitchen Order Ticket</p>
            <p>${restaurant?.brandName || 'Restaurant'} X OrderZap</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintBill = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${order.orderNumber || order._id.slice(-4)}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 10px; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              padding: 15px; 
              max-width: 300px; 
              margin: 0 auto;
              font-size: 13px;
            }
            h1 { 
              text-align: center; 
              font-size: 22px; 
              margin: 10px 0;
              font-weight: bold;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px dashed #000; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .item { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0;
              font-size: 13px;
            }
            .item-name {
              flex: 1;
            }
            .item-qty {
              width: 40px;
              text-align: center;
            }
            .item-price {
              width: 70px;
              text-align: right;
            }
            .subtotal {
              border-top: 1px dashed #000;
              margin-top: 10px;
              padding-top: 10px;
            }
            .total { 
              border-top: 2px solid #000; 
              margin-top: 10px; 
              padding-top: 10px; 
              font-weight: bold; 
              font-size: 18px; 
            }
            .payment-info {
              margin-top: 10px;
              padding: 8px;
              background: #f5f5f5;
              border: 1px solid #ccc;
              font-size: 12px;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 11px;
              border-top: 2px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurant?.name || 'Restaurant'}</h1>
            <p style="font-size: 11px; margin: 5px 0;">${restaurant?.address || ''}</p>
            <div class="info-row">
              <strong>Bill #:</strong>
              <span>${order.orderNumber || order._id.slice(-4)}</span>
            </div>
            <div class="info-row">
              <strong>Table:</strong>
              <span>${order.tableId}</span>
            </div>
            <div class="info-row">
              <strong>Date:</strong>
              <span>${new Date(order._creationTime).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <strong>Time:</strong>
              <span>${new Date(order._creationTime).toLocaleTimeString()}</span>
            </div>
            ${order.customerPhone ? `
              <div class="info-row">
                <strong>Phone:</strong>
                <span>${order.customerPhone}</span>
              </div>
            ` : ''}
          </div>
          <div class="items">
            <div class="item" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
              <span class="item-name">ITEM</span>
              <span class="item-qty">QTY</span>
              <span class="item-price">AMOUNT</span>
            </div>
            ${order.items.map(item => `
              <div class="item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">x${item.quantity}</span>
                <span class="item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="subtotal">
            <div class="item">
              <span>Subtotal</span>
              <span></span>
              <span class="item-price">₹${order.total.toFixed(2)}</span>
            </div>
            ${order.depositUsed > 0 ? `
              <div class="item" style="color: green;">
                <span>Deposit Used</span>
                <span></span>
                <span class="item-price">-₹${order.depositUsed.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
          <div class="total">
            <div class="item">
              <span>TOTAL</span>
              <span></span>
              <span class="item-price">₹${(order.total - (order.depositUsed || 0)).toFixed(2)}</span>
            </div>
          </div>
          ${order.paymentMethod ? `
            <div class="payment-info">
              <strong>Payment Method:</strong> ${
                order.paymentMethod === 'pay-now' ? 'Paid Online' :
                order.paymentMethod === 'pay-counter' ? 'Pay at Counter' :
                order.paymentMethod === 'pay-table' ? 'Pay at Table' : order.paymentMethod
              }
            </div>
          ` : ''}
          ${order.notes ? `
            <p style="margin-top: 10px; font-size: 11px; padding: 8px; background: #f5f5f5; border: 1px solid #ccc;">
              <strong>Note:</strong> ${order.notes}
            </p>
          ` : ''}
          <div class="footer">
            <p style="font-weight: bold; margin-bottom: 5px;">Thank you for dining with us!</p>
            <p>Visit again soon 😊</p>
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
  const cancelledCount = orders?.filter(o => o.status === 'cancelled').length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-black text-white px-6 py-4 border-2 border-black font-bold uppercase tracking-wide">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h1 className="text-lg md:text-3xl font-bold text-black uppercase tracking-wider">Orders</h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                {orders?.length || 0} total • ₹{totalRevenue.toLocaleString()} revenue
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm whitespace-nowrap uppercase tracking-wider border-2 transition-all ${
                filter === 'all'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:border-black'
              }`}
            >
              All ({orders?.length || 0})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm whitespace-nowrap uppercase tracking-wider border-2 transition-all ${
                filter === 'pending'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:border-black'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-3 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm whitespace-nowrap uppercase tracking-wider border-2 transition-all ${
                filter === 'preparing'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:border-black'
              }`}
            >
              Cooking ({preparingCount})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm whitespace-nowrap uppercase tracking-wider border-2 transition-all ${
                filter === 'ready'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:border-black'
              }`}
            >
              Ready ({readyCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm whitespace-nowrap uppercase tracking-wider border-2 transition-all ${
                filter === 'completed'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:border-black'
              }`}
            >
              Done ({completedCount})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-3 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm whitespace-nowrap uppercase tracking-wider border-2 transition-all ${
                filter === 'cancelled'
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-white text-black border-gray-300 hover:border-red-500'
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-gray-300 mb-2 uppercase tracking-wider">No {filter !== 'all' ? filter : ''} orders</p>
            <p className="text-gray-500">Orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order._id} className="bg-white border-2 border-gray-300 overflow-hidden hover:border-black transition-all">
                
                {/* Order Header */}
                <div className="px-4 md:px-6 py-3 md:py-4 bg-white border-b-2 border-gray-300 flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div>
                      <p className="text-xl md:text-2xl font-bold text-black">#{order.orderNumber || order._id.slice(-4)}</p>
                      <p className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Table {order.tableId}</p>
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      {new Date(order._creationTime).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl md:text-3xl font-bold text-black">₹{order.total.toFixed(0)}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-4 md:px-6 py-4 md:py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white border-2 border-gray-300">
                        <MenuItemImage 
                          storageId={item.imageUrl || item.image} 
                          alt={item.name} 
                          className="w-12 h-12 md:w-14 md:h-14 object-cover border-2 border-black" 
                        />
                        <div className="flex-1">
                          <p className="font-bold text-black text-sm md:text-base uppercase tracking-wide">{item.name}</p>
                          <p className="text-xs md:text-sm text-gray-600">Qty: {item.quantity} • ₹{(item.price * item.quantity).toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="p-4 bg-white border-2 border-black mb-5">
                      <p className="text-sm font-bold text-black uppercase tracking-wide">Special Instructions:</p>
                      <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
                    </div>
                  )}

                  {/* Waiter Assignment Status */}
                  {order.status === 'ready' && (
                    <div className={`p-4 border-2 mb-5 ${
                      order.assignmentStatus === 'accepted' ? 'bg-green-50 border-green-600' :
                      order.assignmentStatus === 'pending' ? 'bg-yellow-50 border-yellow-600 animate-pulse' :
                      order.assignmentStatus === 'timeout' || order.assignmentStatus === 'rejected' ? 'bg-red-50 border-red-600' :
                      !order.assignedWaiterId ? 'bg-red-50 border-red-600' :
                      'bg-gray-50 border-gray-300'
                    }`}>
                      <p className="text-sm font-bold text-black uppercase tracking-wide mb-2">Waiter Assignment:</p>
                      {order.assignmentStatus === 'accepted' && order.assignedWaiter && (
                        <p className="text-sm text-green-700">
                          ✓ Accepted by {order.assignedWaiter.name}
                        </p>
                      )}
                      {order.assignmentStatus === 'pending' && order.assignedWaiter && (
                        <p className="text-sm text-yellow-700">
                          ⏳ Waiting for {order.assignedWaiter.name} to accept...
                        </p>
                      )}
                      {order.assignmentStatus === 'timeout' && (
                        <p className="text-sm text-red-700">
                          ⚠ Assignment timed out - Reassigning...
                        </p>
                      )}
                      {order.assignmentStatus === 'rejected' && (
                        <p className="text-sm text-red-700">
                          ✗ Waiter rejected - Reassigning...
                        </p>
                      )}
                      {!order.assignedWaiterId && !order.assignmentStatus && (
                        <div>
                          <p className="text-sm text-red-700 font-bold mb-2">
                            ⚠ Unable to assign waiter
                          </p>
                          <p className="text-xs text-red-600">
                            No waiters are currently online and inside the restaurant. 
                            Waiters must be online and within 100m to receive orders.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status Change Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'pending')}
                        className={`px-3 md:px-4 py-2 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
                          order.status === 'pending'
                            ? 'bg-yellow-500 text-white border-yellow-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-yellow-500'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'preparing')}
                        className={`px-3 md:px-4 py-2 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
                          order.status === 'preparing'
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        Preparing
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'ready')}
                        className={`px-3 md:px-4 py-2 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
                          order.status === 'ready'
                            ? 'bg-green-500 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                        }`}
                      >
                        Ready
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'completed')}
                        className={`px-3 md:px-4 py-2 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
                          order.status === 'completed'
                            ? 'bg-gray-700 text-white border-gray-800'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-700'
                        }`}
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                        className={`px-3 md:px-4 py-2 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
                          order.status === 'cancelled'
                            ? 'bg-red-500 text-white border-red-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-red-500'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Print Buttons */}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => handlePrintKOT(order)}
                        className="px-4 md:px-6 py-2 md:py-3 bg-orange-500 text-white font-bold uppercase tracking-wider border-2 border-orange-600 hover:bg-orange-600 transition-all text-xs md:text-sm"
                      >
                        Print KOT
                      </button>
                      <button
                        onClick={() => handlePrintBill(order)}
                        className="px-4 md:px-6 py-2 md:py-3 bg-white text-black font-bold uppercase tracking-wider border-2 border-gray-300 hover:border-black transition-all text-xs md:text-sm"
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

          
    </div>
  );
}
