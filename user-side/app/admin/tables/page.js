"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminTablesPage() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const tables = useQuery(api.tables.list);
  const zones = useQuery(api.zones.list);
  const createTable = useMutation(api.tables.create);
  const updateTable = useMutation(api.tables.update);
  const removeTable = useMutation(api.tables.remove);

  const [editingTable, setEditingTable] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", number: "", capacity: "", zoneId: "" });

  if (authLoading || !isAuthenticated) return null;

  const handleSave = async () => {
    if (!formData.name || !formData.number) return;
    const data = { 
      name: formData.name, 
      number: parseInt(formData.number), 
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      zoneId: formData.zoneId || undefined 
    };
    if (editingTable) await updateTable({ id: editingTable._id, ...data });
    else await createTable(data);
    resetForm();
  };

  const handleEdit = (table) => { setFormData({ name: table.name, number: table.number.toString(), capacity: table.capacity?.toString() || "", zoneId: table.zoneId || "" }); setEditingTable(table); setShowForm(true); };
  const handleDelete = async (id) => { if (confirm("Delete this table?")) await removeTable({ id }); };
  const resetForm = () => { setFormData({ name: "", number: "", capacity: "", zoneId: "" }); setEditingTable(null); setShowForm(false); };

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">TABLES</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">{tables?.length || 0} tables</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200">
          + ADD TABLE
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">{editingTable ? "Edit Table" : "Add Table"}</h2>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Table 1" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Number</label>
                  <input type="number" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="1" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Capacity (seats)</label>
                <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="4" min="1" max="20" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Zone</label>
                <select value={formData.zoneId} onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm">
                  <option value="">All Zones</option>
                  {zones?.map((zone) => (<option key={zone._id} value={zone._id}>{zone.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200">{editingTable ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      {!tables ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-600">Loading...</div>
      ) : tables.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
          <p className="text-zinc-600 mb-4">No tables yet</p>
          <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide">Add First Table</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((table) => (
            <div key={table._id} className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  <span className="text-xl font-bold">{table.number}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(table)} className="text-[10px] text-zinc-500 hover:text-white px-2 py-1">EDIT</button>
                  <button onClick={() => handleDelete(table._id)} className="text-[10px] text-red-500 hover:text-red-400 px-2 py-1">✕</button>
                </div>
              </div>
              <h3 className="font-medium text-sm">{table.name}</h3>
              <p className="text-zinc-500 text-xs mt-1">{table.capacity ? `${table.capacity} seats` : 'No limit'}</p>
              {table.zone ? (
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-blue-900 text-blue-300">{table.zone.name}</span>
              ) : (
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-white text-black">ALL ZONES</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
