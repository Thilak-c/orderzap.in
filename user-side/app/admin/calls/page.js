'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function StaffCallsPage() {
  const staffCalls = useQuery(api.staffCalls.list);
  const staff = useQuery(api.staff.list);
  const updateCallStatus = useMutation(api.staffCalls.updateStatus);

  if (!staffCalls || !staff) {
    return <div className="p-6 text-black">LOADING...</div>;
  }

  const pendingCalls = staffCalls.filter(c => c.status === 'pending');
  const acknowledgedCalls = staffCalls.filter(c => c.status === 'acknowledged');
  const resolvedCalls = staffCalls.filter(c => c.status === 'resolved');

  const getStaffName = (staffId) => {
    const s = staff.find(st => st._id === staffId);
    return s?.name || 'Unknown';
  };

  const handleStatus = async (id, status) => {
    await updateCallStatus({ id, status });
  };

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-black pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">STAFF CALLS</h1>
        <p className="text-black text-xs uppercase tracking-widest">Customer assistance requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-black/5 border border-black/10 p-4 text-center">
          <p className="text-3xl font-bold text-black">{pendingCalls.length}</p>
          <p className="text-[10px] text-black uppercase">Pending</p>
        </div>
        <div className="bg-black/5 border border-black/10 p-4 text-center">
          <p className="text-3xl font-bold text-black">{acknowledgedCalls.length}</p>
          <p className="text-[10px] text-black uppercase">Acknowledged</p>
        </div>
        <div className="bg-black/5 border border-black/10 p-4 text-center">
          <p className="text-3xl font-bold text-black">{resolvedCalls.length}</p>
          <p className="text-[10px] text-black uppercase">Resolved</p>
        </div>
      </div>

      {/* Pending Calls */}
      {pendingCalls.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs text-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-none animate-pulse" />
            Pending ({pendingCalls.length})
          </h2>
          <div className="space-y-2">
            {pendingCalls.map(call => (
              <div key={call._id} className="bg-black/5 border border-black/10 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">T{call.tableNumber}</span>
                    {call.reassignedTo && (
                      <span className="text-[9px] px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        REDIRECTED
                      </span>
                    )}
                  </div>
                  <p className="text-black text-sm mt-1">{call.reason || 'Assistance needed'}</p>
                  {call.reassignReason && (
                    <p className="text-purple-400 text-xs mt-1">{call.reassignReason}</p>
                  )}
                  <p className="text-black text-xs mt-1">
                    {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {call.originalStaffId && ` • Assigned: ${getStaffName(call.originalStaffId)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatus(call._id, 'acknowledged')}
                    className="px-4 py-2 bg-amber-500 text-black text-xs font-bold uppercase"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleStatus(call._id, 'resolved')}
                    className="px-4 py-2 bg-green-500 text-white text-xs font-bold uppercase"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged Calls */}
      {acknowledgedCalls.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs text-black uppercase tracking-widest mb-3">
            Acknowledged ({acknowledgedCalls.length})
          </h2>
          <div className="space-y-2">
            {acknowledgedCalls.map(call => (
              <div key={call._id} className="bg-black/5 border border-black/10 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-white">T{call.tableNumber}</span>
                  </div>
                  <p className="text-black text-sm">{call.reason || 'Assistance needed'}</p>
                  <p className="text-black text-xs mt-1">
                    {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleStatus(call._id, 'resolved')}
                  className="px-4 py-2 bg-green-500 text-white text-xs font-bold uppercase"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Calls */}
      {resolvedCalls.length > 0 && (
        <div>
          <h2 className="text-xs text-black uppercase tracking-widest mb-3">
            Resolved ({resolvedCalls.length})
          </h2>
          <div className="space-y-2">
            {resolvedCalls.slice(0, 10).map(call => (
              <div key={call._id} className="bg-white border border-black p-3 flex items-center justify-between opacity-60">
                <div>
                  <span className="text-white font-medium">T{call.tableNumber}</span>
                  <span className="text-black text-sm ml-3">{call.reason || 'Assistance'}</span>
                </div>
                <span className="text-black text-xs">
                  {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {staffCalls.length === 0 && (
        <div className="text-center py-12 text-black">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-sm">No staff calls yet</p>
        </div>
      )}
    </div>
  );
}
