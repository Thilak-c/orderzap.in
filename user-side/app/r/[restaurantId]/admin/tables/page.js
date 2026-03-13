"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouteProtection } from "@/lib/useRouteProtection";
import { AlertCircle } from "lucide-react";

export default function AdminTablesPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Route protection - only Owner and Manager can access Tables
  const { authUser, isAuthorized, isChecking } = useRouteProtection(restaurantId, ['Owner', 'Manager']);
  
  // Show access denied if not authorized
  if (!isChecking && !isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-black mb-3 uppercase">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access Tables & Zones. Only owners and managers can manage tables.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to Orders page...
          </p>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking permissions...</div>
      </div>
    );
  }
  
  // Get restaurant database ID (for operations that need it)
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  // Use short ID for both tables and zones (consistent across all pages)
  const tables = useQuery(api.tables.list, restaurantId ? { restaurantId } : "skip");
  const zones = useQuery(api.zones.list, restaurantId ? { restaurantId } : "skip");
  const orders = useQuery(api.orders.list, restaurantId ? { restaurantId } : "skip");
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
      restaurantId: restaurantId,
      name: tableFormData.name, 
      number: parseInt(tableFormData.number), 
      capacity: tableFormData.capacity ? parseInt(tableFormData.capacity) : undefined,
      zoneId: tableFormData.zoneId || undefined 
    };
    console.log("Saving table with data:", data);
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
    if (!zoneFormData.name || !restaurantId) return;
    if (editingZone) {
      await updateZone({ id: editingZone._id, name: zoneFormData.name, description: zoneFormData.description });
    } else {
      await createZone({ restaurantId, name: zoneFormData.name, description: zoneFormData.description || "" });
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

  // Compute per-table stats (sales, order count, active)
  const tableStats = (tables || []).map((table) => {
    const tableOrders = (orders || []).filter(o => o.tableId === table._id);
    const totalSales = tableOrders.reduce((s, o) => s + (o.total || o.totalAmount || 0), 0);
    const orderCount = tableOrders.length;
    const active = tableOrders.some(o => o.status && o.status !== 'completed');
    const lastOrder = tableOrders.sort((a,b) => new Date(b._creationTime) - new Date(a._creationTime))[0];
    return { tableId: table._id, totalSales, orderCount, active, lastOrder };
  });

  const bestTableStat = tableStats.reduce((best, s) => (s.totalSales > (best?.totalSales || 0) ? s : best), null);
  const activeCount = tableStats.filter(s => s.active).length;
  const inactiveCount = (tables?.length || 0) - activeCount;

  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 md:mb-6 pb-3 md:pb-4">
        <div className="flex justify-between items-start mb-3 md:mb-4">
          <div>
            <h1 className="text-lg md:text-3xl font-bold text-black tracking-wider uppercase">Tables & Zones</h1>
            <p className="text-gray-600 text-xs mt-1">
              {activeTab === 'tables' && `${tables?.length || 0} tables`}
              {activeTab === 'zones' && `${zones?.length || 0} zones`}
              {activeTab === 'qr-codes' && 'Print QR codes for tables'}
              {activeTab === 'reservations' && 'Table bookings'}
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'tables' && (
              <button onClick={() => setShowTableForm(true)} className="bg-black text-white px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">
                + Add Table
              </button>
            )}
            {activeTab === 'zones' && (
              <>
                <button onClick={() => seedZones()} className="bg-white text-black px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-gray-300 hover:border-black transition-all">
                  Seed
                </button>
                <button onClick={() => setShowZoneForm(true)} className="bg-black text-white px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">
                  + Add Zone
                </button>
              </>
            )}
            {activeTab === 'qr-codes' && (
              <button 
                onClick={() => setShowQRSettings(!showQRSettings)} 
                className={`px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${showQRSettings ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'}`}
              >
                Settings
              </button>
            )}
            {activeTab === 'reservations' && (
              <button onClick={() => { setReservationFormData({ ...reservationFormData, date: selectedDate }); setShowReservationForm(true); }} className="bg-black text-white px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">
                + New Booking
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 md:px-4 py-2 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === 'tables'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-3 md:px-4 py-2 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === 'zones'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            Zones
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-3 md:px-4 py-2 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === 'reservations'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            Reservations
          </button>
          <button
            onClick={() => setActiveTab('qr-codes')}
            className={`px-3 md:px-4 py-2 font-bold text-xs md:text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === 'qr-codes'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            QR Codes
          </button>
        </div>
      </div>

      {/* Table Form Modal */}
      {showTableForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">{editingTable ? "Edit Table" : "Add Table"}</h2>
              <button onClick={resetTableForm} className="text-gray-500 hover:text-black text-lg font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Name</label>
                  <input type="text" value={tableFormData.name} onChange={(e) => setTableFormData({ ...tableFormData, name: e.target.value })} className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none" placeholder="Table 1" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Number</label>
                  <input type="number" value={tableFormData.number} onChange={(e) => setTableFormData({ ...tableFormData, number: e.target.value })} className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none" placeholder="1" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Capacity (seats)</label>
                <input type="number" value={tableFormData.capacity} onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })} className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none" placeholder="4" min="1" max="20" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Zone</label>
                <select value={tableFormData.zoneId} onChange={(e) => setTableFormData({ ...tableFormData, zoneId: e.target.value })} className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none">
                  <option value="">All Zones</option>
                  {zones?.map((zone) => (<option key={zone._id} value={zone._id}>{zone.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetTableForm} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide border-2 border-gray-300 hover:border-black transition-all">Cancel</button>
              <button onClick={handleSaveTable} className="flex-1 bg-black text-white py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">{editingTable ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Form Modal */}
      {showZoneForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">{editingZone ? "Edit Zone" : "Add Zone"}</h2>
              <button onClick={resetZoneForm} className="text-gray-500 hover:text-black text-lg font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Zone Name</label>
                <input type="text" value={zoneFormData.name} onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })} className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none" placeholder="e.g. Smoking Zone" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Description</label>
                <input type="text" value={zoneFormData.description} onChange={(e) => setZoneFormData({ ...zoneFormData, description: e.target.value })} className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none" placeholder="e.g. Hookah allowed" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetZoneForm} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide border-2 border-gray-300 hover:border-black transition-all">Cancel</button>
              <button onClick={handleSaveZone} className="flex-1 bg-black text-white py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">{editingZone ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Form Modal */}
      {showReservationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">New Reservation</h2>
              <button onClick={resetReservationForm} className="text-gray-500 hover:text-black text-lg font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Table *</label>
                <select
                  value={reservationFormData.tableId}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, tableId: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
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
                  <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Customer Name *</label>
                  <input
                    type="text"
                    value={reservationFormData.customerName}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, customerName: e.target.value })}
                    className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Phone</label>
                  <input
                    type="tel"
                    value={reservationFormData.customerPhone}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, customerPhone: e.target.value })}
                    className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Date *</label>
                <input
                  type="date"
                  value={reservationFormData.date}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, date: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  min={today}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Start Time *</label>
                  <input
                    type="time"
                    value={reservationFormData.startTime}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, startTime: e.target.value })}
                    className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">End Time *</label>
                  <input
                    type="time"
                    value={reservationFormData.endTime}
                    onChange={(e) => setReservationFormData({ ...reservationFormData, endTime: e.target.value })}
                    className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Party Size</label>
                <input
                  type="number"
                  value={reservationFormData.partySize}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, partySize: parseInt(e.target.value) || 1 })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Notes</label>
                <textarea
                  value={reservationFormData.notes}
                  onChange={(e) => setReservationFormData({ ...reservationFormData, notes: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none resize-none"
                  rows={2}
                  placeholder="Special requests..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetReservationForm} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide border-2 border-gray-300 hover:border-black transition-all">Cancel</button>
              <button onClick={handleCreateReservation} className="flex-1 bg-black text-white py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">Book Table</button>
            </div>
          </div>
        </div>
      )}

      {/* Tables Tab Content */}
      {activeTab === 'tables' && (
        <>
          {!tables ? (
            <div className="bg-white border-2 border-gray-300 p-8 text-center text-gray-600">Loading...</div>
          ) : tables.length === 0 ? (
            <div className="bg-white border-2 border-gray-300 p-8 text-center">
              <p className="text-gray-600 mb-4">No tables yet</p>
              <button onClick={() => setShowTableForm(true)} className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">Add First Table</button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white border-2 border-gray-300 p-4">
                  <p className="text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Best Table</p>
                  <p className="text-lg font-bold text-black">{bestTableStat ? (tables.find(t => t._id === bestTableStat.tableId)?.name || '—') : '—'}</p>
                  <p className="text-xs text-gray-600">₹{bestTableStat ? bestTableStat.totalSales.toFixed(2) : '0.00'}</p>
                </div>
                <div className="bg-white border-2 border-gray-300 p-4">
                  <p className="text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Active Tables</p>
                  <p className="text-2xl font-bold text-black">{activeCount}</p>
                </div>
                <div className="bg-white border-2 border-gray-300 p-4">
                  <p className="text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Inactive Tables</p>
                  <p className="text-2xl font-bold text-black">{inactiveCount}</p>
                </div>
                <div className="bg-white border-2 border-gray-300 p-4">
                  <p className="text-[10px] text-gray-600 font-bold mb-1 uppercase tracking-wide">Total Tables</p>
                  <p className="text-2xl font-bold text-black">{tables.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tables.map((table) => (
                <div key={table._id} className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center">
                      <span className="text-xl font-bold text-black">{table.number}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditTable(table)} className="text-[10px] text-black hover:bg-black hover:text-white font-bold px-2 py-1 border border-black transition-all">EDIT</button>
                      <button onClick={() => handleDeleteTable(table._id)} className="text-[10px] text-black hover:bg-black hover:text-white font-bold px-2 py-1 border border-black transition-all">✕</button>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-black uppercase tracking-wide">{table.name}</h3>
                  <p className="text-gray-600 text-xs mt-1">{table.capacity ? `${table.capacity} seats` : 'No limit'}</p>
                  {table.zone ? (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-black text-white font-bold uppercase tracking-wide">{table.zone.name}</span>
                  ) : (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-white text-black border border-black font-bold uppercase tracking-wide">ALL ZONES</span>
                  )}

                  {/* Table stats */}
                  {(() => {
                    const stat = tableStats.find(s => s.tableId === table._id) || { totalSales: 0, orderCount: 0, active: false };
                    return (
                      <div className="mt-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Sales</span>
                          <span className="text-xs font-bold">₹{stat.totalSales.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">Orders</span>
                          <span className="text-xs font-bold">{stat.orderCount}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">Status</span>
                          <span className={`text-xs font-bold uppercase ${stat.active ? 'text-green-700' : 'text-gray-500'}`}>{stat.active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Zones Tab Content */}
      {activeTab === 'zones' && (
        <>
          {!zones ? (
            <div className="bg-white border-2 border-gray-300 p-8 text-center text-gray-600">Loading...</div>
          ) : zones.length === 0 ? (
            <div className="bg-white border-2 border-gray-300 p-8 text-center">
              <p className="text-gray-600 mb-4">No zones yet</p>
              <button onClick={() => setShowZoneForm(true)} className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all">Add First Zone</button>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => {
                const zoneTables = getTablesInZone(zone._id);
                return (
                  <div key={zone._id} className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center">
                          <span className="text-lg text-black font-bold">◎</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-black uppercase tracking-wide">{zone.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{zone.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-black font-bold uppercase tracking-wide">{zoneTables.length} tables</span>
                            {zoneTables.length > 0 && (
                              <span className="text-[10px] text-gray-500">({zoneTables.map((t) => t.name).join(", ")})</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditZone(zone)} className="text-xs text-black hover:bg-black hover:text-white font-bold px-2 py-1 border border-black transition-all">EDIT</button>
                        <button onClick={() => handleDeleteZone(zone._id)} className="text-xs text-black hover:bg-black hover:text-white font-bold px-2 py-1 border border-black transition-all">DELETE</button>
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
            <div className="bg-white border-2 border-gray-300 p-4 mb-6">
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">Base URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={baseUrl} 
                  onChange={(e) => setBaseUrl(e.target.value)} 
                  className="flex-1 bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none" 
                  placeholder="https://your-domain.com/" 
                />
                <button
                  onClick={handleSaveBaseUrl}
                  disabled={isSaving}
                  className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">QR codes will link to: {baseUrl}r/{restaurantId}/a/[table-number]</p>
              <p className="text-[10px] text-black mt-1 font-bold">
                {settings?.baseUrl ? '✓ Saved in database' : '⚠ Auto-detected (not saved)'}
              </p>
            </div>
          )}

          {!tables ? (
            <div className="bg-white border-2 border-gray-300 p-8 text-center text-gray-600">Loading...</div>
          ) : tables.length === 0 ? (
            <div className="bg-white border-2 border-gray-300 p-8 text-center">
              <p className="text-gray-600">No tables. Add tables first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => (
                <div key={table._id} className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-black uppercase tracking-wide">{table.name}</h3>
                    <span className="text-[10px] text-gray-500">#{table.number}</span>
                  </div>
                  
                  <div className="bg-white border-2 border-black p-2 mb-3">
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
                      className="flex-1 text-center bg-white text-black py-2 text-[10px] font-bold uppercase tracking-wide border-2 border-gray-300 hover:border-black transition-all"
                    >
                      Download
                    </a>
                    <Link 
                      href={`/r/${restaurantId}/a/${table.number}`} 
                      target="_blank" 
                      className="flex-1 text-center bg-black text-white py-2 text-[10px] font-bold uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all"
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
        <div className="bg-white border-2 border-gray-300 p-8 text-center">
          <p className="text-lg font-semibold text-gray-600">Some work is going on...</p>
        </div>
      )}
    </div>
  );
}
