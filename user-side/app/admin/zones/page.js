"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminZonesPage() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const zones = useQuery(api.zones.list);
  const tables = useQuery(api.tables.list);
  const createZone = useMutation(api.zones.create);
  const updateZone = useMutation(api.zones.update);
  const removeZone = useMutation(api.zones.remove);
  const seedZones = useMutation(api.zones.seed);

  const [editingZone, setEditingZone] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  if (authLoading || !isAuthenticated) return null;

  const handleSave = async () => {
    if (!formData.name) return;
    if (editingZone) await updateZone({ id: editingZone._id, name: formData.name, description: formData.description });
    else await createZone({ name: formData.name, description: formData.description });
    resetForm();
  };

  const handleEdit = (zone) => { setFormData({ name: zone.name, description: zone.description }); setEditingZone(zone); setShowForm(true); };
  const handleDelete = async (id) => { if (confirm("Delete this zone?")) await removeZone({ id }); };
  const resetForm = () => { setFormData({ name: "", description: "" }); setEditingZone(null); setShowForm(false); };
  const getTablesInZone = (zoneId) => tables?.filter((t) => t.zoneId === zoneId) || [];

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-black pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">ZONES</h1>
          <p className="text-black text-xs uppercase tracking-widest">{zones?.length || 0} zones</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => seedZones()} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-white hover:text-white">
            SEED
          </button>
          <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-white">
            + ADD ZONE
          </button>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">{editingZone ? "Edit Zone" : "Add Zone"}</h2>
              <button onClick={resetForm} className="text-black hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-black uppercase tracking-wide mb-1">Zone Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white border border-black px-3 py-2 text-sm" placeholder="e.g. Smoking Zone" />
              </div>
              <div>
                <label className="block text-[10px] text-black uppercase tracking-wide mb-1">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white border border-black px-3 py-2 text-sm" placeholder="e.g. Hookah allowed" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-white">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-white">{editingZone ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zones List */}
      {!zones ? (
        <div className="bg-white border border-black p-8 text-center text-black">Loading...</div>
      ) : zones.length === 0 ? (
        <div className="bg-white border border-black p-8 text-center">
          <p className="text-black mb-4">No zones yet</p>
          <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide">Add First Zone</button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => {
            const zoneTables = getTablesInZone(zone._id);
            return (
              <div key={zone._id} className="bg-white border border-black p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white border border-black flex items-center justify-center">
                      <span className="text-lg">◎</span>
                    </div>
                    <div>
                      <h3 className="font-medium">{zone.name}</h3>
                      <p className="text-xs text-black">{zone.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-black">{zoneTables.length} tables</span>
                        {zoneTables.length > 0 && (
                          <span className="text-[10px] text-black">({zoneTables.map((t) => t.name).join(", ")})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(zone)} className="text-xs text-black hover:text-white">EDIT</button>
                    <button onClick={() => handleDelete(zone._id)} className="text-xs text-black hover:text-black">DELETE</button>
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
