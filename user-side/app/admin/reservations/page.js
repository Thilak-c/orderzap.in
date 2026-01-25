"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminReservationsPage() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tableId: "",
    customerName: "",
    customerPhone: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "18:00",
    endTime: "20:00",
    partySize: 2,
    notes: "",
  });

  const tables = useQuery(api.tables.list);
  const reservations = useQuery(api.reservations.list, { date: selectedDate });
  const todayStats = useQuery(api.reservations.getTodayStats);
  const createReservation = useMutation(api.reservations.create);
  const cancelReservation = useMutation(api.reservations.cancel);

  if (authLoading || !isAuthenticated) return null;

  const handleCreate = async () => {
    if (!formData.tableId || !formData.customerName || !formData.date || !formData.startTime || !formData.endTime) {
      alert("Please fill all required fields");
      return;
    }
    try {
      await createReservation({
        tableId: formData.tableId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || undefined,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        partySize: formData.partySize,
        notes: formData.notes || undefined,
      });
      resetForm();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCancel = async (id) => {
    if (confirm("Cancel this reservation?")) {
      await cancelReservation({ id });
    }
  };

  const resetForm = () => {
    setFormData({
      tableId: "",
      customerName: "",
      customerPhone: "",
      date: selectedDate,
      startTime: "18:00",
      endTime: "20:00",
      partySize: 2,
      notes: "",
    });
    setShowForm(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const confirmedReservations = reservations?.filter(r => r.status === "confirmed") || [];
  const cancelledReservations = reservations?.filter(r => r.status === "cancelled") || [];

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">RESERVATIONS</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Table Bookings</p>
        </div>
        <button onClick={() => { setFormData({ ...formData, date: selectedDate }); setShowForm(true); }} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200">
          + NEW BOOKING
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">TODAY'S BOOKINGS</p>
          <p className="text-2xl font-bold text-white">{todayStats?.total || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">UPCOMING TODAY</p>
          <p className="text-2xl font-bold text-amber-400">{todayStats?.upcoming || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">SELECTED DATE</p>
          <p className="text-lg font-bold text-white">{confirmedReservations.length} bookings</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 mb-6 items-center">
        <button
          onClick={() => setSelectedDate(today)}
          className={`px-3 py-1.5 text-xs uppercase tracking-wide ${selectedDate === today ? 'bg-white text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
        >
          Today
        </button>
        <button
          onClick={() => {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            setSelectedDate(tomorrow);
          }}
          className={`px-3 py-1.5 text-xs uppercase tracking-wide bg-zinc-900 text-zinc-400 hover:bg-zinc-800`}
        >
          Tomorrow
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs"
        />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">New Reservation</h2>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Table *</label>
                <select
                  value={formData.tableId}
                  onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                >
                  <option value="">Select table...</option>
                  {tables?.map((table) => (
                    <option key={table._id} value={table._id}>
                      {table.name} (#{table.number}) {table.zone ? `- ${table.zone.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                  min={today}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Party Size</label>
                <input
                  type="number"
                  value={formData.partySize}
                  onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm resize-none"
                  rows={2}
                  placeholder="Special requests..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700">Cancel</button>
              <button onClick={handleCreate} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200">Book Table</button>
            </div>
          </div>
        </div>
      )}

      {/* Reservations List */}
      {confirmedReservations.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
          <p className="text-zinc-600">No reservations for {selectedDate}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4 text-zinc-500">Time</th>
                <th className="text-left py-3 px-3 text-zinc-500">Table</th>
                <th className="text-left py-3 px-3 text-zinc-500">Customer</th>
                <th className="text-center py-3 px-3 text-zinc-500">Party</th>
                <th className="text-left py-3 px-3 text-zinc-500">Notes</th>
                <th className="text-right py-3 px-4 text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {confirmedReservations.map((res) => {
                const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const isNow = selectedDate === today && now >= res.startTime && now <= res.endTime;
                const isPast = selectedDate === today && now > res.endTime;
                return (
                  <tr key={res._id} className={`border-t border-zinc-800/50 ${isNow ? 'bg-amber-950/30' : isPast ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isNow && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                        <span className="font-medium">{res.startTime} - {res.endTime}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium">🪑 {res.table?.name || `Table ${res.tableNumber}`}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium">{res.customerName}</p>
                      {res.customerPhone && <p className="text-[10px] text-zinc-600">{res.customerPhone}</p>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-zinc-800 px-2 py-0.5 text-xs">{res.partySize} pax</span>
                    </td>
                    <td className="py-3 px-3 text-zinc-500 text-xs">{res.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {!isPast && (
                        <button onClick={() => handleCancel(res._id)} className="text-xs text-red-500 hover:text-red-400">CANCEL</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancelled */}
      {cancelledReservations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs text-zinc-600 uppercase tracking-wide mb-2">Cancelled ({cancelledReservations.length})</h3>
          <div className="bg-zinc-900 border border-zinc-800 p-4 opacity-50">
            {cancelledReservations.map((res) => (
              <div key={res._id} className="flex justify-between text-sm py-1">
                <span>{res.startTime} - {res.table?.name} - {res.customerName}</span>
                <span className="text-red-500 text-xs">CANCELLED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
