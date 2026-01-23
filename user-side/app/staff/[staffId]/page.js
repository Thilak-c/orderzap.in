'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useNotificationAlert } from '@/lib/useNotificationAlert';
import { Bell, X, Check, Phone, ArrowRight } from 'lucide-react';

const statusConfig = {
  pending: { label: 'NEW', cls: 'bg-black/5 text-black border-black/10' },
  preparing: { label: 'PREPARING', cls: 'bg-black/5 text-black border-black/10' },
  ready: { label: 'READY', cls: 'bg-black/5 text-black border-black/10' },
  completed: { label: 'DONE', cls: 'bg-white/20 text-black border-black/30' },
};

export default function StaffPortalPage() {
  const { staffId } = useParams();
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const staff = useQuery(api.staff.list);
  const orders = useQuery(api.orders.list);
  const staffCalls = useQuery(api.staffCalls.list);
  const notifications = useQuery(api.staffNotifications.listUnreadForStaff, staffId ? { staffId } : "skip");
  const updateOrderStatus = useMutation(api.orders.updateStatus);
  const updateCallStatus = useMutation(api.staffCalls.updateStatus);
  const setOffline = useMutation(api.staff.setOffline);
  const updateLastSeen = useMutation(api.staff.updateLastSeen);
  const markNotificationRead = useMutation(api.staffNotifications.markRead);
  const markAllRead = useMutation(api.staffNotifications.markAllReadForStaff);

  const currentStaff = staff?.find(s => s._id === staffId);
  
  // Compute alert count at top level (before any returns) for hooks
  const myTables = currentStaff?.assignedTables || [];
  const myOrders = orders?.filter(o => myTables.includes(parseInt(o.tableId))) || [];
  const myCalls = staffCalls?.filter(c => 
    myTables.includes(c.tableNumber) || c.reassignedTo === staffId
  ) || [];
  const activeOrders = myOrders.filter(o => o.status !== 'completed');
  const pendingCalls = myCalls.filter(c => c.status !== 'resolved');
  
  // Sound + vibration + push notification alert for new orders/calls (must be called unconditionally)
  const totalAlerts = activeOrders.filter(o => o.status === 'pending').length + pendingCalls.length;
  useNotificationAlert(isAuthed ? totalAlerts : 0, {
    title: '🔔 Staff Alert',
    body: `${pendingCalls.length} calls, ${activeOrders.filter(o => o.status === 'pending').length} new orders`
  });

  const handleLogout = async () => {
    // Set staff as offline
    await setOffline({ id: staffId });
    sessionStorage.removeItem('staff-auth');
    router.replace('/staff');
  };

  // Check auth and auto-logout at midnight
  useEffect(() => {
    const checkAuth = () => {
      const auth = sessionStorage.getItem('staff-auth');
      if (!auth) {
        router.replace('/staff');
        return false;
      }
      
      const { id, loginDate } = JSON.parse(auth);
      const today = new Date().toDateString();
      
      // Auto logout if login was on a different day (past midnight)
      if (loginDate !== today) {
        setOffline({ id: staffId });
        sessionStorage.removeItem('staff-auth');
        router.replace('/staff');
        return false;
      }
      
      if (id !== staffId) {
        router.replace('/staff');
        return false;
      }
      
      return true;
    };

    if (checkAuth()) {
      setIsAuthed(true);
    }

    // Check every minute for midnight logout
    const interval = setInterval(() => {
      const auth = sessionStorage.getItem('staff-auth');
      if (auth) {
        const { loginDate } = JSON.parse(auth);
        const today = new Date().toDateString();
        if (loginDate !== today) {
          handleLogout();
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [staffId, router]);

  // Update last seen every 30 seconds
  useEffect(() => {
    if (!isAuthed || !staffId) return;
    
    const interval = setInterval(() => {
      updateLastSeen({ id: staffId });
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthed, staffId, updateLastSeen]);
  
  if (!isAuthed || !staff || !orders || !staffCalls) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black font-mono text-sm">LOADING...</div>
      </div>
    );
  }

  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-mono">
        <div className="text-center">
          <p className="text-black text-sm mb-4">STAFF NOT FOUND</p>
          <button onClick={handleLogout} className="text-white text-xs underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleOrderStatus = async (orderId, newStatus) => {
    await updateOrderStatus({ id: orderId, status: newStatus });
  };

  const handleCallStatus = async (callId, newStatus) => {
    await updateCallStatus({ id: callId, status: newStatus });
  };

  const handleMarkAllRead = async () => {
    await markAllRead({ staffId });
    setShowNotifications(false);
  };

  return (
    <div className="min-h-screen bg-white text-white font-mono">
      {/* Header - Compact for mobile */}
      <header className="bg-white border-b border-black px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white flex items-center justify-center text-sm font-bold relative shrink-0">
              {currentStaff.name.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-none border-2 border-black" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-xs truncate">{currentStaff.name}</p>
              <p className="text-black text-[9px] uppercase tracking-wide truncate">
                T: {myTables.join(', ') || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Quick stats */}
            <div className="flex items-center gap-1">
              <div className="px-1.5 py-0.5 bg-white rounded">
                <span className="text-black font-bold text-xs">{activeOrders.length}</span>
              </div>
              <div className="px-1.5 py-0.5 bg-white rounded">
                <span className="text-black font-bold text-xs">{pendingCalls.length}</span>
              </div>
            </div>
            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-white text-black active:bg-white rounded"
            >
              <Bell size={16} />
              {notifications && notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-none text-[8px] flex items-center justify-center text-white font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-[9px] bg-white text-black active:bg-white uppercase tracking-wide rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Dropdown - Full width on mobile */}
      {showNotifications && notifications && (
        <>
          <div className="fixed inset-0 bg-black/50 z-10" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-12 left-2 right-2 bg-white border border-black z-20 shadow-none rounded max-h-[60vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-black">
              <span className="text-xs text-black uppercase">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] text-black active:text-white px-2 py-1">
                  Clear all
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-black text-sm text-center">No new notifications</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto">
                {notifications.map(n => (
                  <div 
                    key={n._id} 
                    className="p-3 border-b border-black/50 active:bg-white/50"
                    onClick={() => markNotificationRead({ id: n._id })}
                  >
                    <p className="text-sm text-black">{n.message}</p>
                    <p className="text-[10px] text-black mt-1">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="p-3 space-y-2 pb-20">
        {/* Staff Calls - Show first if any pending */}
        {pendingCalls.map(call => (
          <div key={call._id} className={`p-3 rounded ${call.reassignedTo === staffId ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-black/5 border border-black/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Phone size={14} className={call.reassignedTo === staffId ? 'text-purple-400' : 'text-black'} />
                <span className="text-base font-bold">T{call.tableNumber}</span>
                <span className={`px-1.5 py-0.5 text-[9px] border rounded ${call.reassignedTo === staffId ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-black/5 text-black border-black/10'}`}>
                  {call.reassignedTo === staffId ? 'REDIRECT' : 'CALL'}
                </span>
              </div>
              <span className="text-black text-[10px]">
                {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {call.reassignReason && (
              <p className="text-purple-300 text-[10px] mb-2 italic">{call.reassignReason}</p>
            )}
            {call.reason && (
              <p className="text-black text-xs mb-2">"{call.reason}"</p>
            )}
            <div className="flex gap-2">
              {call.status === 'pending' && (
                <button
                  onClick={() => handleCallStatus(call._id, 'acknowledged')}
                  className="flex-1 py-2.5 bg-amber-500 text-black text-xs font-bold uppercase rounded active:bg-amber-600"
                >
                  Acknowledge
                </button>
              )}
              <button
                onClick={() => handleCallStatus(call._id, 'resolved')}
                className="flex-1 py-2.5 bg-green-500 text-white text-xs font-bold uppercase rounded active:bg-green-600"
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
            <div key={order._id} className="bg-white border border-black p-3 rounded">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">T{order.tableId}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] border rounded ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-black text-[10px]">
                    #{order.orderNumber || order._id.slice(-4)} • {new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-base font-bold">₹{order.total}</p>
              </div>

              <div className="space-y-0.5 mb-2 pb-2 border-b border-black">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-black">{item.quantity}x {item.name}</span>
                    <span className="text-black">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mb-2 p-2 bg-black/5 border border-black/10 text-black text-[10px] rounded">
                  <span className="font-bold">NOTE:</span> {order.notes}
                </div>
              )}

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleOrderStatus(order._id, 'preparing')}
                    className="flex-1 py-2.5 bg-blue-500 text-white text-xs font-bold uppercase rounded active:bg-blue-600"
                  >
                    Start
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => handleOrderStatus(order._id, 'ready')}
                    className="flex-1 py-2.5 bg-green-500 text-white text-xs font-bold uppercase rounded active:bg-green-600"
                  >
                    Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => handleOrderStatus(order._id, 'completed')}
                    className="flex-1 py-2.5 bg-white text-white text-xs font-bold uppercase rounded active:bg-white"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {activeOrders.length === 0 && pendingCalls.length === 0 && (
          <div className="text-center py-12 text-black">
            <Check size={32} className="mx-auto mb-2" />
            <p className="text-xs">All clear!</p>
          </div>
        )}
      </div>
    </div>
  );
}
