'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';

const statusConfig = {
  pending: { label: 'NEW', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  preparing: { label: 'PREPARING', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ready: { label: 'READY', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  completed: { label: 'DONE', cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

export default function StaffPortalPage() {
  const { staffId } = useParams();
  
  const staff = useQuery(api.staff.list);
  const orders = useQuery(api.orders.list);
  const staffCalls = useQuery(api.staffCalls.list);
  const updateOrderStatus = useMutation(api.orders.updateStatus);
  const updateCallStatus = useMutation(api.staffCalls.updateStatus);

  const currentStaff = staff?.find(s => s._id === staffId);
  
  if (!staff || !orders || !staffCalls) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">LOADING...</div>
      </div>
    );
  }

  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-500 font-mono text-sm mb-4">STAFF NOT FOUND</p>
          <Link href="/admin/staff" className="text-white text-xs underline">
            Back to Staff List
          </Link>
        </div>
      </div>
    );
  }

  const myTables = currentStaff.assignedTables;
  const myOrders = orders.filter(o => myTables.includes(parseInt(o.tableId)));
  const myCalls = staffCalls.filter(c => myTables.includes(c.tableNumber));

  const activeOrders = myOrders.filter(o => o.status !== 'completed');
  const pendingCalls = myCalls.filter(c => c.status !== 'resolved');

  const handleOrderStatus = async (orderId, newStatus) => {
    await updateOrderStatus({ id: orderId, status: newStatus });
  };

  const handleCallStatus = async (callId, newStatus) => {
    await updateCallStatus({ id: callId, status: newStatus });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center text-lg font-bold">
              {currentStaff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{currentStaff.name}</p>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wide">{currentStaff.role} • Tables: {myTables.join(', ') || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-3 py-1 bg-zinc-800">
              <span className="text-amber-400 font-bold">{activeOrders.length}</span>
              <span className="text-zinc-500 text-xs ml-1">orders</span>
            </div>
            <div className="text-center px-3 py-1 bg-zinc-800">
              <span className="text-red-400 font-bold">{pendingCalls.length}</span>
              <span className="text-zinc-500 text-xs ml-1">calls</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {/* Staff Calls - Show first if any pending */}
        {pendingCalls.map(call => (
          <div key={call._id} className="bg-red-500/10 border border-red-500/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-lg">🔔</span>
                <span className="text-lg font-bold">T{call.tableNumber}</span>
                <span className="px-2 py-0.5 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                  CALL
                </span>
              </div>
              <span className="text-zinc-500 text-xs">
                {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {call.reason && (
              <p className="text-zinc-300 text-sm mb-3">"{call.reason}"</p>
            )}
            <div className="flex gap-2">
              {call.status === 'pending' && (
                <button
                  onClick={() => handleCallStatus(call._id, 'acknowledged')}
                  className="flex-1 py-2 bg-amber-500 text-black text-xs font-bold uppercase"
                >
                  Acknowledge
                </button>
              )}
              <button
                onClick={() => handleCallStatus(call._id, 'resolved')}
                className="flex-1 py-2 bg-green-500 text-white text-xs font-bold uppercase"
              >
                Resolve
              </button>
            </div>
          </div>
        ))}

        {/* Orders */}
        {activeOrders.map(order => {
          const status = statusConfig[order.status];
          return (
            <div key={order._id} className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">T{order.tableId}</span>
                    <span className={`px-2 py-0.5 text-[10px] border ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs">
                    #{order.orderNumber || order._id.slice(-4)} • {new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-lg font-bold">₹{order.total}</p>
              </div>

              <div className="space-y-1 mb-3 pb-3 border-b border-zinc-800">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-zinc-300">{item.quantity}x {item.name}</span>
                    <span className="text-zinc-500">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <span className="font-bold">NOTE:</span> {order.notes}
                </div>
              )}

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleOrderStatus(order._id, 'preparing')}
                    className="flex-1 py-2 bg-blue-500 text-white text-xs font-bold uppercase"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => handleOrderStatus(order._id, 'ready')}
                    className="flex-1 py-2 bg-green-500 text-white text-xs font-bold uppercase"
                  >
                    Mark Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => handleOrderStatus(order._id, 'completed')}
                    className="flex-1 py-2 bg-zinc-700 text-white text-xs font-bold uppercase"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {activeOrders.length === 0 && pendingCalls.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">All clear! No pending orders or calls.</p>
          </div>
        )}
      </div>
    </div>
  );
}
