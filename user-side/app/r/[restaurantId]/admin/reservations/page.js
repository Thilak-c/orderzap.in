"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminReservationsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
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

  const tables = useQuery(api.tables.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const reservations = useQuery(api.reservations.list, restaurantDbId ? { restaurantId: restaurantDbId, date: selectedDate } : "skip");
  const todayStats = useQuery(api.reservations.getTodayStats, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const createReservation = useMutation(api.reservations.create);
  const cancelReservation = useMutation(api.reservations.cancel);

  const handleCreate = async () => {
    if (!formData.tableId || !formData.customerName || !formData.date || !formData.startTime || !formData.endTime || !restaurantDbId) {
      alert("Please fill all required fields");
      return;
    }
    try {
      await createReservation({
        restaurantId: restaurantDbId,
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
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reservations</h1>
          <p className="text-slate-600 text-xs">Table Bookings</p>
        </div>
        <button onClick={() => { setFormData({ ...formData, date: selectedDate }); setShowForm(true); }} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
          + New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-600 font-semibold mb-1">Today's Bookings</p>
          <p className="text-2xl font-bold text-slate-900">{todayStats?.total || 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-600 font-semibold mb-1">Upcoming Today</p>
          <p className="text-2xl font-bold text-amber-600">{todayStats?.upcoming || 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-600 font-semibold mb-1">Selected Date</p>
          <p className="text-lg font-bold text-slate-900">{confirmedReservations.length} bookings</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 mb-6 items-center">
        <button
          onClick={() => setSelectedDate(today)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${selectedDate === today ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          Today
        </button>
        <button
          onClick={() => {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            setSelectedDate(tomorrow);
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Tomorrow
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">New Reservation</h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Table *</label>
                <select
                  value={formData.tableId}
                  onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  min={today}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Party Size</label>
                <input
                  type="number"
                  value={formData.partySize}
                  onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                  rows={2}
                  placeholder="Special requests..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-slate-100 text-slate-700 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="flex-1 bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">Book Table</button>
            </div>
          </div>
        </div>
      )}

      {/* Reservations List */}
      {confirmedReservations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">No reservations for {selectedDate}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-semibold">
              <tr>
                <th className="text-left py-3 px-4 text-slate-600">Time</th>
                <th className="text-left py-3 px-3 text-slate-600">Table</th>
                <th className="text-left py-3 px-3 text-slate-600">Customer</th>
                <th className="text-center py-3 px-3 text-slate-600">Party</th>
                <th className="text-left py-3 px-3 text-slate-600">Notes</th>
                <th className="text-right py-3 px-4 text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {confirmedReservations.map((res) => {
                const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const isNow = selectedDate === today && now >= res.startTime && now <= res.endTime;
                const isPast = selectedDate === today && now > res.endTime;
                return (
                  <tr key={res._id} className={`border-t border-slate-100 ${isNow ? 'bg-amber-50' : isPast ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isNow && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                        <span className="font-medium text-slate-900">{res.startTime} - {res.endTime}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-900">🪑 {res.table?.name || `Table ${res.tableNumber}`}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900">{res.customerName}</p>
                      {res.customerPhone && <p className="text-[10px] text-slate-500">{res.customerPhone}</p>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-slate-100 px-2 py-0.5 text-xs rounded text-slate-700">{res.partySize} pax</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs">{res.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {!isPast && (
                        <button onClick={() => handleCancel(res._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Cancel</button>
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
          <h3 className="text-xs text-slate-600 font-semibold mb-2">Cancelled ({cancelledReservations.length})</h3>
          <div className="bg-white border border-slate-200 rounded-xl p-4 opacity-50">
            {cancelledReservations.map((res) => (
              <div key={res._id} className="flex justify-between text-sm py-1 text-slate-700">
                <span>{res.startTime} - {res.table?.name} - {res.customerName}</span>
                <span className="text-red-600 text-xs font-semibold">CANCELLED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
