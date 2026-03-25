"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminZonesPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const zones = useQuery(api.zones.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const tables = useQuery(api.tables.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const createZone = useMutation(api.zones.create);
  const updateZone = useMutation(api.zones.update);
  const removeZone = useMutation(api.zones.remove);
  const seedZones = useMutation(api.zones.seed);

  const [editingZone, setEditingZone] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleSave = async () => {
    if (!formData.name || !restaurantDbId) return;
    if (editingZone) {
      await updateZone({ id: editingZone._id, name: formData.name, description: formData.description });
    } else {
      await createZone({ restaurantId: restaurantDbId, name: formData.name, description: formData.description });
    }
    resetForm();
  };

  const handleEdit = (zone) => { setFormData({ name: zone.name, description: zone.description }); setEditingZone(zone); setShowForm(true); };
  const handleDelete = async (id) => { if (confirm("Delete this zone?")) await removeZone({ id }); };
  const resetForm = () => { setFormData({ name: "", description: "" }); setEditingZone(null); setShowForm(false); };
  const getTablesInZone = (zoneId) => tables?.filter((t) => t.zoneId === zoneId) || [];

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Zones</h1>
          <p className="text-slate-600 text-xs">{zones?.length || 0} zones</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => seedZones()} className="bg-slate-100 text-slate-700 px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">
            Seed
          </button>
          <button onClick={() => setShowForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
            + Add Zone
          </button>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">{editingZone ? "Edit Zone" : "Add Zone"}</h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Zone Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Smoking Zone" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Hookah allowed" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-slate-100 text-slate-700 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">{editingZone ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zones List */}
      {!zones ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading...</div>
      ) : zones.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600 mb-4">No zones yet</p>
          <button onClick={() => setShowForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600">Add First Zone</button>
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
                    <button onClick={() => handleEdit(zone)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                    <button onClick={() => handleDelete(zone._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
