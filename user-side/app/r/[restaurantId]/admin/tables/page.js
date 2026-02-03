"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminTablesPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const tables = useQuery(api.tables.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const zones = useQuery(api.zones.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const settings = useQuery(api.settings.getAll);
  const createTable = useMutation(api.tables.create);
  const updateTable = useMutation(api.tables.update);
  const removeTable = useMutation(api.tables.remove);
  const createZone = useMutation(api.zones.create);
  const updateZone = useMutation(api.zones.update);
  const removeZone = useMutation(api.zones.remove);
  const seedZones = useMutation(api.zones.seed);
  const updateSetting = useMutation(api.settings.set);
  const createReservation = useMutation(api.reservations.create);
  const cancelReservation = useMutation(api.reservations.cancel);

  const [activeTab, setActiveTab] = useState("tables");
  const [editingTable, setEditingTable] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [showTableForm, setShowTableForm] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [tableFormData, setTableFormData] = useState({ name: "", number: "", capacity: "", zoneId: "" });
  const [zoneFormData, setZoneFormData] = useState({ name: "", description: "" });
  const [baseUrl, setBaseUrl] = useState("");
  const [showQRSettings, setShowQRSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Reservations state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservationFormData, setReservationFormData] = useState({
    tableId: "",
    customerName: "",
    customerPhone: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "18:00",
    endTime: "20:00",
    partySize: 2,
    notes: "",
  });

  const reservations = useQuery(api.reservations.list, restaurantDbId && activeTab === 'reservations' ? { restaurantId: restaurantDbId, date: selectedDate } : "skip");
  const todayStats = useQuery(api.reservations.getTodayStats, restaurantDbId && activeTab === 'reservations' ? { restaurantId: restaurantDbId } : "skip");

  // Initialize base URL for QR codes
  useEffect(() => {
    if (settings?.baseUrl) {
      setBaseUrl(settings.baseUrl);
    } else if (typeof window !== 'undefined' && !baseUrl) {
      const origin = window.location.origin;
      setBaseUrl(`${origin}/`);
    }
  }, [settings]);

  // Table handlers
  const handleSaveTable = async () => {
    if (!tableFormData.name || !tableFormData.number || !restaurantDbId) return;
    const data = { 
      restaurantId: restaurantDbId,
      name: tableFormData.name, 
      number: parseInt(tableFormData.number), 
      capacity: tableFormData.capacity ? parseInt(tableFormData.capacity) : undefined,
      zoneId: tableFormData.zoneId || undefined 
    };
    if (editingTable) await updateTable({ id: editingTable._id, ...data });
    else await createTable(data);
    resetTableForm();
  };

  const handleEditTable = (table) => { 
    setTableFormData({ name: table.name, number: table.number.toString(), capacity: table.capacity?.toString() || "", zoneId: table.zoneId || "" }); 
    setEditingTable(table); 
    setShowTableForm(true); 
  };

  const handleDeleteTable = async (id) => { 
    if (confirm("Delete this table?")) await removeTable({ id }); 
  };

  const resetTableForm = () => { 
    setTableFormData({ name: "", number: "", capacity: "", zoneId: "" }); 
    setEditingTable(null); 
    setShowTableForm(false); 
  };

  // Zone handlers
  const handleSaveZone = async () => {
    if (!zoneFormData.name || !restaurantDbId) return;
    if (editingZone) {
      await updateZone({ id: editingZone._id, name: zoneFormData.name, description: zoneFormData.description });
    } else {
      await createZone({ restaurantId: restaurantDbId, name: zoneFormData.name, description: zoneFormData.description });
    }
    resetZoneForm();
  };

  const handleEditZone = (zone) => { 
    setZoneFormData({ name: zone.name, description: zone.description }); 
    setEditingZone(zone); 
    setShowZoneForm(true); 
  };

  const handleDeleteZone = async (id) => { 
    if (confirm("Delete this zone?")) await removeZone({ id }); 
  };

  const resetZoneForm = () => { 
    setZoneFormData({ name: "", description: "" }); 
    setEditingZone(null); 
    setShowZoneForm(false); 
  };

  const getTablesInZone = (zoneId) => tables?.filter((t) => t.zoneId === zoneId) || [];

  // QR Code handlers
  const handleSaveBaseUrl = async () => {
    setIsSaving(true);
    try {
      await updateSetting({ key: "baseUrl", value: baseUrl });
    } catch (error) {
      console.error("Failed to save base URL:", error);
    }
    setIsSaving(false);
  };

  const getQRCodeUrl = (tableNumber) => {
    const authUrl = `${baseUrl}r/${restaurantId}/a/${tableNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(authUrl)}&bgcolor=09090b&color=ffffff`;
  };

  // Reservation handlers
  const handleCreateReservation = async () => {
    if (!reservationFormData.tableId || !reservationFormData.customerName || !reservationFormData.date || !reservationFormData.startTime || !reservationFormData.endTime || !restaurantDbId) {
      alert("Please fill all required fields");
      return;
    }
    try {
      await createReservation({
        restaurantId: restaurantDbId,
        tableId: reservationFormData.tableId,
        customerName: reservationFormData.customerName,
        customerPhone: reservationFormData.customerPhone || undefined,
        date: reservationFormData.date,
        startTime: reservationFormData.startTime,
        endTime: reservationFormData.endTime,
        partySize: reservationFormData.partySize,
        notes: reservationFormData.notes || undefined,
      });
      resetReservationForm();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCancelReservation = async (id) => {
    if (confirm("Cancel this reservation?")) {
      await cancelReservation({ id });
    }
  };

  const resetReservationForm = () => {
    setReservationFormData({
      tableId: "",
      customerName: "",
      customerPhone: "",
      date: selectedDate,
      startTime: "18:00",
      endTime: "20:00",
      partySize: 2,
      notes: "",
    });
    setShowReservationForm(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const confirmedReservations = reservations?.filter(r => r.status === "confirmed") || [];
  const cancelledReservations = reservations?.filter(r => r.status === "cancelled") || [];

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tables & Zones</h1>
            <p className="text-slate-600 text-xs">
              {activeTab === 'tables' && `${tables?.length || 0} tables`}
              {activeTab === 'zones' && `${zones?.length || 0} zones`}
              {activeTab === 'qr-codes' && 'Print QR codes for tables'}
              {activeTab === 'reservations' && 'Table bookings'}
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'tables' && (
              <button onClick={() => setShowTableForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
                + Add Table
              </button>
            )}
            {activeTab === 'zones' && (
              <>
                <button onClick={() => seedZones()} className="bg-slate-100 text-slate-700 px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">
                  Seed
                </button>
                <button onClick={() => setShowZoneForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
                  + Add Zone
                </button>
              </>
            )}
            {activeTab === 'qr-codes' && (
              <button 
                onClick={() => setShowQRSettings(!showQRSettings)} 
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${showQRSettings ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Settings
              </button>
            )}
            {activeTab === 'reservations' && (
              <button onClick={() => { setReservationFormData({ ...reservationFormData, date: selectedDate }); setShowReservationForm(true); }} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
                + New Booking
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'tables'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'zones'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Zones
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'reservations'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Reservations
          </button>
          <button
            onClick={() => setActiveTab('qr-codes')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'qr-codes'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            QR Codes
          </button>
        </div>
      </div>

      {/* Table Form Modal */}
      {showTableForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">{editingTable ? "Edit Table" : "Add Table"}</h2>
              <button onClick={resetTableForm} className="text-slate-500 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Name</label>
                  <input type="text" value={tableFormData.name} onChange={(e) => setTableFormData({ ...tableFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Table 1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Number</label>
                  <input type="number" value={tableFormData.number} onChange={(e) => setTableFormData({ ...tableFormData, number: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="1" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Capacity (seats)</label>
                <input type="number" value={tableFormData.capacity} onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="4" min="1" max="20" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Zone</label>
                <select value={tableFormData.zoneId} onChange={(e) => setTableFormData({ ...tableFormData, zoneId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none">
                  <option value="">All Zones</option>
                  {zones?.map((zone) => (<option key={zone._id} value={zone._id}>{zone.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetTableForm} className="flex-1 bg-slate-100 text-slate-700 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSaveTable} className="flex-1 bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">{editingTable ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Form Modal */}
      {showZoneForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">{editingZone ? "Edit Zone" : "Add Zone"}</h2>
              <button onClick={resetZoneForm} className="text-slate-500 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Zone Name</label>
                <input type="text" value={zoneFormData.name} onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Smoking Zone" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Description</label>
                <input type="text" value={zoneFormData.description} onChange={(e) => setZoneFormData({ ...zoneFormData, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Hookah allowed" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetZoneForm} className="flex-1 bg-slate-100 text-slate-700 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSaveZone} className="flex-1 bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">{editingZone ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Form Modal */}
      {showReservationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">New Reservation</h2>
              <button onClick={resetReservationForm} className="text-slate-500 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Table *</label>
                <select
                  value={reservationFormData.tableId}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, tableId: e.target.value })}
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
                    value={reservationFormData.customerName}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={reservationFormData.customerPhone}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  value={reservationFormData.date}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  min={today}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={reservationFormData.startTime}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">End Time *</label>
                  <input
                    type="time"
                    value={reservationFormData.endTime}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Party Size</label>
                <input
                  type="number"
                  value={reservationFormData.partySize}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, partySize: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Notes</label>
                <textarea
                  value={reservationFormData.notes}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                  rows={2}
                  placeholder="Special requests..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetReservationForm} className="flex-1 bg-slate-100 text-slate-700 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleCreateReservation} className="flex-1 bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">Book Table</button>
            </div>
          </div>
        </div>
      )}

      {/* Tables Tab Content */}
      {activeTab === 'tables' && (
        <>
          {!tables ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading...</div>
          ) : tables.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-600 mb-4">No tables yet</p>
              <button onClick={() => setShowTableForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600">Add First Table</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tables.map((table) => (
                <div key={table._id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-900">{table.number}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditTable(table)} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium px-2 py-1">Edit</button>
                      <button onClick={() => handleDeleteTable(table._id)} className="text-[10px] text-red-600 hover:text-red-700 font-medium px-2 py-1">✕</button>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm text-slate-900">{table.name}</h3>
                  <p className="text-slate-600 text-xs mt-1">{table.capacity ? `${table.capacity} seats` : 'No limit'}</p>
                  {table.zone ? (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">{table.zone.name}</span>
                  ) : (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-semibold">ALL ZONES</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Zones Tab Content */}
      {activeTab === 'zones' && (
        <>
          {!zones ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading...</div>
          ) : zones.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-600 mb-4">No zones yet</p>
              <button onClick={() => setShowZoneForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600">Add First Zone</button>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => {
                const zoneTables = getTablesInZone(zone._id);
                return (
                  <div key={zone._id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center">
                          <span className="text-lg text-slate-700">◎</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{zone.name}</h3>
                          <p className="text-xs text-slate-600">{zone.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-emerald-600 font-semibold">{zoneTables.length} tables</span>
                            {zoneTables.length > 0 && (
                              <span className="text-[10px] text-slate-500">({zoneTables.map((t) => t.name).join(", ")})</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditZone(zone)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                        <button onClick={() => handleDeleteZone(zone._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* QR Codes Tab Content */}
      {activeTab === 'qr-codes' && (
        <>
          {showQRSettings && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <label className="block text-[10px] text-slate-600 font-semibold mb-2">Base URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={baseUrl} 
                  onChange={(e) => setBaseUrl(e.target.value)} 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                  placeholder="https://your-domain.com/" 
                />
                <button
                  onClick={handleSaveBaseUrl}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">QR codes will link to: {baseUrl}r/{restaurantId}/a/[table-number]</p>
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
                {settings?.baseUrl ? '✓ Saved in database' : '⚠ Auto-detected (not saved)'}
              </p>
            </div>
          )}

          {!tables ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading...</div>
          ) : tables.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-600">No tables. Add tables first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => (
                <div key={table._id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm text-slate-900">{table.name}</h3>
                    <span className="text-[10px] text-slate-500">#{table.number}</span>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3">
                    <img 
                      src={getQRCodeUrl(table.number)} 
                      alt={`QR for ${table.name}`} 
                      className="w-full aspect-square" 
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <a 
                      href={getQRCodeUrl(table.number)} 
                      download={`table-${table.number}.png`} 
                      className="flex-1 text-center bg-slate-100 text-slate-700 py-2 text-[10px] font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Download
                    </a>
                    <Link 
                      href={`/r/${restaurantId}/a/${table.number}`} 
                      target="_blank" 
                      className="flex-1 text-center bg-emerald-500 text-white py-2 text-[10px] font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      Test →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reservations Tab Content */}
      {activeTab === 'reservations' && (
        <>
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
                            <button onClick={() => handleCancelReservation(res._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Cancel</button>
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
        </>
      )}
    </div>
  );
}
