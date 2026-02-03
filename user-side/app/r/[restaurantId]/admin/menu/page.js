"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { clearCache, CACHE_KEYS } from "@/lib/useCache";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";

const defaultCategories = ["Starters", "Mains", "Sides", "Drinks", "Desserts", "Hookah"];

export default function AdminMenuPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const items = useQuery(api.menuItems.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const zones = useQuery(api.zones.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const createItem = useMutation(api.menuItems.create);
  const updateItem = useMutation(api.menuItems.update);
  const removeItem = useMutation(api.menuItems.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formData, setFormData] = useState({ name: "", price: "", category: "Mains", image: "", description: "", allowedZones: [] });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const fileInputRef = useRef(null);

  // Get all unique categories from items (including custom ones)
  const allCategories = [...new Set([...defaultCategories, ...(items?.map(item => item.category) || [])])].sort();

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

  const handleSave = async () => {
    if (!formData.name || !formData.price || !restaurantDbId) return;
    if (editingItem) {
      await updateItem({ id: editingItem._id, name: formData.name, price: parseFloat(formData.price), category: formData.category, image: formData.image, description: formData.description, available: editingItem.available, allowedZones: formData.allowedZones.length > 0 ? formData.allowedZones : [] });
    } else {
      await createItem({ restaurantId: restaurantDbId, name: formData.name, price: parseFloat(formData.price), category: formData.category, image: formData.image, description: formData.description, allowedZones: formData.allowedZones.length > 0 ? formData.allowedZones : [] });
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
  const byCategory = allCategories.reduce((acc, cat) => {
    acc[cat] = items?.filter(i => i.category === cat).length || 0;
    return acc;
  }, {});

  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      setFormData({ ...formData, category: customCategory.trim() });
      setCustomCategory("");
      setShowCustomCategory(false);
    }
  };

  // Filter items by category
  const filteredItems = items?.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  }) || [];

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Menu</h1>
          <p className="text-slate-600 text-xs">{totalItems} items</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
          + Add Item
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({totalItems})
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              categoryFilter === cat
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {cat} ({byCategory[cat] || 0})
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">{editingItem ? "Edit Item" : "Add Item"}</h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-900 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Item name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Price (₹)</label>
                  <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-semibold mb-1">Image</label>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {imagePreview || formData.image ? (
                    <div className="relative w-full h-[42px] bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <ImageIcon size={20} className="text-slate-400" />
                      )}
                      <button type="button" onClick={clearImage} className="absolute right-1 top-1 text-slate-500 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 hover:border-slate-300 text-slate-700">
                      {uploading ? "Uploading..." : <><Upload size={14} /> Upload</>}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Category</label>
                {showCustomCategory ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Enter custom category"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="bg-emerald-500 text-white px-3 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCustomCategory(false); setCustomCategory(""); }}
                      className="bg-slate-100 text-slate-700 px-3 py-2 text-xs font-bold rounded-lg hover:bg-slate-200"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none">
                      {allCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(true)}
                      className="w-full bg-blue-50 text-blue-700 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      + Add Custom Category
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none" rows={2} placeholder="Short description" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-semibold mb-2">Available In Zones</label>
                <div className="space-y-1">
                  <button type="button" onClick={selectAllZones} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${formData.allowedZones.length === 0 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    All Zones {formData.allowedZones.length === 0 && "✓"}
                  </button>
                  {zones?.map((zone) => (
                    <button key={zone._id} type="button" onClick={() => toggleZone(zone._id)} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${formData.allowedZones.includes(zone._id) ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                      {zone.name} {formData.allowedZones.includes(zone._id) && "✓"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={resetForm} className="flex-1 bg-slate-100 text-slate-700 py-2 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">{editingItem ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      {!items ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600 mb-4">No menu items</p>
          <button onClick={() => setShowForm(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-emerald-600">Add First Item</button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-semibold">
              <tr>
                <th className="text-left py-3 px-4 text-slate-600">Item</th>
                <th className="text-left py-3 px-3 text-slate-600">Category</th>
                <th className="text-left py-3 px-3 text-slate-600">Zones</th>
                <th className="text-right py-3 px-3 text-slate-600">Price</th>
                <th className="text-right py-3 px-4 text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <MenuItemImage storageId={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg" />
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.category}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${(!item.allowedZones || item.allowedZones.length === 0) ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {(!item.allowedZones || item.allowedZones.length === 0) ? "ALL" : `${item.allowedZones.length} ZONE${item.allowedZones.length > 1 ? 'S' : ''}`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">₹{item.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleEdit(item)} className="text-xs text-blue-600 hover:text-blue-700 font-medium mr-3">Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
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
