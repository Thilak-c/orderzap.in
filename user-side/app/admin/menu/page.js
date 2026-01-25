"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { clearCache, CACHE_KEYS } from "@/lib/useCache";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";

const categories = ["Starters", "Mains", "Sides", "Drinks", "Desserts", "Hookah"];

export default function AdminMenuPage() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const items = useQuery(api.menuItems.list);
  const zones = useQuery(api.zones.list);
  const createItem = useMutation(api.menuItems.create);
  const updateItem = useMutation(api.menuItems.update);
  const removeItem = useMutation(api.menuItems.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", category: "Mains", image: "", description: "", allowedZones: [] });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  if (authLoading || !isAuthenticated) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setFormData({ ...formData, image: storageId });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, image: "" });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (authLoading || !isAuthenticated) return null;

  const handleSave = async () => {
    if (!formData.name || !formData.price) return;
    if (editingItem) {
      await updateItem({ id: editingItem._id, name: formData.name, price: parseFloat(formData.price), category: formData.category, image: formData.image, description: formData.description, available: editingItem.available, allowedZones: formData.allowedZones.length > 0 ? formData.allowedZones : [] });
    } else {
      await createItem({ name: formData.name, price: parseFloat(formData.price), category: formData.category, image: formData.image, description: formData.description, allowedZones: formData.allowedZones.length > 0 ? formData.allowedZones : [] });
    }
    
    // Clear menu cache for all zones
    zones?.forEach(zone => {
      clearCache(`${CACHE_KEYS.MENU_ITEMS}_${zone._id}`);
    });
    clearCache(CACHE_KEYS.MENU_ITEMS);
    
    resetForm();
  };

  const handleEdit = (item) => {
    setFormData({ name: item.name, price: item.price.toString(), category: item.category, image: item.image, description: item.description, allowedZones: item.allowedZones || [] });
    setEditingItem(item);
    setImagePreview(null); // Will be loaded from storage
    setShowForm(true);
  };

  const toggleZone = (zoneId) => setFormData((prev) => ({ ...prev, allowedZones: prev.allowedZones.includes(zoneId) ? prev.allowedZones.filter((id) => id !== zoneId) : [...prev.allowedZones, zoneId] }));
  const selectAllZones = () => setFormData((prev) => ({ ...prev, allowedZones: [] }));
  const handleDelete = async (id) => { 
    if (confirm("Delete this item?")) {
      await removeItem({ id });
      // Clear menu cache
      zones?.forEach(zone => {
        clearCache(`${CACHE_KEYS.MENU_ITEMS}_${zone._id}`);
      });
      clearCache(CACHE_KEYS.MENU_ITEMS);
    }
  };
  const resetForm = () => { setFormData({ name: "", price: "", category: "Mains", image: "", description: "", allowedZones: [] }); setEditingItem(null); setShowForm(false); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const totalItems = items?.length || 0;
  const byCategory = categories.reduce((acc, cat) => {
    acc[cat] = items?.filter(i => i.category === cat).length || 0;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">MENU</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">{totalItems} items</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200">
          + ADD ITEM
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">{editingItem ? "Edit Item" : "Add Item"}</h2>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Item name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Price (₹)</label>
                  <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Image</label>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {imagePreview || formData.image ? (
                    <div className="relative w-full h-[42px] bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <ImageIcon size={20} className="text-zinc-500" />
                      )}
                      <button type="button" onClick={clearImage} className="absolute right-1 top-1 text-zinc-500 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm flex items-center justify-center gap-2 hover:border-zinc-600">
                      {uploading ? "Uploading..." : <><Upload size={14} /> Upload</>}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm">
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm resize-none" rows={2} placeholder="Short description" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Available In Zones</label>
                <div className="space-y-1">
                  <button type="button" onClick={selectAllZones} className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wide ${formData.allowedZones.length === 0 ? "bg-white text-black font-bold" : "bg-zinc-800 text-zinc-500 hover:text-white"}`}>
                    All Zones {formData.allowedZones.length === 0 && "✓"}
                  </button>
                  {zones?.map((zone) => (
                    <button key={zone._id} type="button" onClick={() => toggleZone(zone._id)} className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wide ${formData.allowedZones.includes(zone._id) ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-white"}`}>
                      {zone.name} {formData.allowedZones.includes(zone._id) && "✓"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200">{editingItem ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      {!items ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-600">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
          <p className="text-zinc-600 mb-4">No menu items</p>
          <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide">Add First Item</button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4 text-zinc-500">Item</th>
                <th className="text-left py-3 px-3 text-zinc-500">Category</th>
                <th className="text-left py-3 px-3 text-zinc-500">Zones</th>
                <th className="text-right py-3 px-3 text-zinc-500">Price</th>
                <th className="text-right py-3 px-4 text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <MenuItemImage storageId={item.image} alt={item.name} className="w-10 h-10 object-cover rounded" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-[10px] text-zinc-600 truncate max-w-[200px]">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5">{item.category}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] px-2 py-0.5 ${(!item.allowedZones || item.allowedZones.length === 0) ? 'bg-white text-black' : 'bg-blue-900 text-blue-300'}`}>
                      {(!item.allowedZones || item.allowedZones.length === 0) ? "ALL" : `${item.allowedZones.length} ZONE${item.allowedZones.length > 1 ? 'S' : ''}`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold">₹{item.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleEdit(item)} className="text-xs text-zinc-500 hover:text-white mr-3">EDIT</button>
                    <button onClick={() => handleDelete(item._id)} className="text-xs text-red-500 hover:text-red-400">DELETE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
