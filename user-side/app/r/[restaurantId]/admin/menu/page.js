"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { clearCache, CACHE_KEYS } from "@/lib/useCache";
import { Upload, X, Image as ImageIcon, Search } from "lucide-react";

export default function AdminMenuPage() {
  const params = useParams();
  const restaurantId = params.restaurantId; // Short ID like "changu-mangu"
  
  // Get restaurant data for theme colors
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  
  // Get theme colors
  const themeColor = restaurant?.themeColors?.primary || '#000000';
  
  // Use short restaurantId for all queries
  const items = useQuery(api.menuItems.list, restaurantId ? { restaurantId } : "skip");
  const zones = useQuery(api.zones.list, restaurantId ? { restaurantId } : "skip");
  const categories = useQuery(api.categories.list, restaurantId ? { restaurantId } : "skip");
  const createItem = useMutation(api.menuItems.create);
  const updateItem = useMutation(api.menuItems.update);
  const removeItem = useMutation(api.menuItems.remove);
  const createCategory = useMutation(api.categories.create);
  const removeCategory = useMutation(api.categories.remove);
  const createZone = useMutation(api.zones.create);
  const removeZone = useMutation(api.zones.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [returnToForm, setReturnToForm] = useState(false); // Track if we should return to form
  const [isClosing, setIsClosing] = useState(false); // Track closing animation
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ name: "", price: "", category: "", image: "", description: "", allowedZones: [] });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(""); // Default icon name
  const [newCategoryIconFile, setNewCategoryIconFile] = useState(null); // Custom icon file
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneDescription, setNewZoneDescription] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingZone, setAddingZone] = useState(false);
  const [extractedColors, setExtractedColors] = useState(null);
  const fileInputRef = useRef(null);

  // Get all category names
  const allCategories = categories?.map(c => c.name) || [];

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !restaurantId) return;
    
    setAddingCategory(true);
    try {
      let iconFileUrl = null;
      let iconUrl = null;
      
      // If custom icon file is uploaded, save it
      if (newCategoryIconFile) {
        const categorySlug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        try {
          const response = await fetch('/api/save-category-icon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantId,
              categoryName: categorySlug,
              imageData: newCategoryIconFile,
            }),
          });
          
          const result = await response.json();
          if (result.success) {
            iconFileUrl = result.path;
            iconUrl = `/api/category_icon/${restaurantId}/${categorySlug}.webp`;
          }
        } catch (error) {
          console.error('Failed to save category icon:', error);
        }
      }
      
      await createCategory({
        restaurantId,
        name: newCategoryName.trim(),
        icon: newCategoryIcon || undefined,
        iconFileUrl: iconFileUrl || undefined,
        iconUrl: iconUrl || undefined,
      });
      setNewCategoryName("");
      setNewCategoryIcon("");
      setNewCategoryIconFile(null);
    } catch (error) {
      alert(error.message || "Failed to add category");
    }
    setAddingCategory(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Delete this category? Items in this category will not be deleted.")) return;
    await removeCategory({ id: categoryId });
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim() || !restaurantId) return;
    
    setAddingZone(true);
    try {
      await createZone({
        restaurantId,
        name: newZoneName.trim(),
        description: newZoneDescription.trim() || "",
      });
      setNewZoneName("");
      setNewZoneDescription("");
    } catch (error) {
      alert(error.message || "Failed to add zone");
    }
    setAddingZone(false);
  };

  const handleDeleteZone = async (zoneId) => {
    if (!confirm("Delete this zone? Tables in this zone will be unassigned.")) return;
    await removeZone({ id: zoneId });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Show preview and extract colors
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setImagePreview(dataUrl);
      
      // Extract colors from image
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          
          // Sample colors (every 10th pixel for performance)
          const colorMap = {};
          for (let i = 0; i < pixels.length; i += 40) { // RGBA = 4 values, so 40 = every 10 pixels
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            // Skip transparent or very light/dark pixels
            if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;
            
            // Round to reduce color variations
            const key = `${Math.round(r/10)*10},${Math.round(g/10)*10},${Math.round(b/10)*10}`;
            colorMap[key] = (colorMap[key] || 0) + 1;
          }
          
          // Get top 3 colors
          const sortedColors = Object.entries(colorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([color]) => {
              const [r, g, b] = color.split(',').map(Number);
              return `rgb(${r}, ${g}, ${b})`;
            });
          
          setExtractedColors({
            primary: sortedColors[0] || '#000000',
            secondary: sortedColors[1] || '#666666',
            accent: sortedColors[2] || '#999999'
          });
        };
        img.src = dataUrl;
      } catch (error) {
        console.error('Color extraction failed:', error);
      }
      
      // Mark as uploaded (we'll save to file system on submit)
      setFormData({ ...formData, image: 'pending' });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setFormData({ ...formData, image: "" });
    setImagePreview(null);
    setExtractedColors(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert("Please enter item name");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert("Please enter a valid price");
      return;
    }
    if (!formData.category) {
      alert("Please select a category");
      return;
    }
    if (!restaurantId) return;
    
    let imageUrl = editingItem?.imageUrl || null; // Keep existing if not uploading new one
    
    // Save image to file system if there's a preview (new upload)
    if (imagePreview) {
      try {
        const itemNameSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Save to file system via API
        const response = await fetch('/api/save-menu-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId,
            itemName: itemNameSlug,
            imageData: imagePreview,
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          // Set API route URL
          imageUrl = `/api/menu_item/${restaurantId}/${itemNameSlug}.webp`;
        }
      } catch (error) {
        console.error('Failed to save image to file system:', error);
      }
    }
    
    if (editingItem) {
      await updateItem({ 
        id: editingItem._id, 
        name: formData.name, 
        price: parseFloat(formData.price), 
        category: formData.category, 
        description: formData.description, 
        available: editingItem.available, 
        imageUrl: imageUrl, // Only store API route
        allowedZones: formData.allowedZones.length > 0 ? formData.allowedZones : [],
        themeColors: extractedColors || undefined,
      });
    } else {
      await createItem({ 
        restaurantId, // Use short ID like "changu-mangu"
        name: formData.name, 
        price: parseFloat(formData.price), 
        category: formData.category, 
        description: formData.description, 
        imageUrl: imageUrl, // Only store API route
        imageUrl: imageUrl, // API route
        allowedZones: formData.allowedZones.length > 0 ? formData.allowedZones : [],
        themeColors: extractedColors || undefined,
      });
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
  
  const closeModal = (modalType) => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (modalType === 'form') {
        setShowForm(false);
        setFormData({ name: "", price: "", category: "", image: "", description: "", allowedZones: [] });
        setEditingItem(null);
        setImagePreview(null);
        setExtractedColors(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else if (modalType === 'category') {
        setShowCategoryManager(false);
        if (returnToForm) {
          setTimeout(() => {
            setShowForm(true);
            setReturnToForm(false);
          }, 50);
        }
      } else if (modalType === 'zone') {
        setShowZoneManager(false);
        if (returnToForm) {
          setTimeout(() => {
            setShowForm(true);
            setReturnToForm(false);
          }, 50);
        }
      }
    }, 200); // Match animation duration
  };
  
  const resetForm = () => { 
    setFormData({ name: "", price: "", category: "", image: "", description: "", allowedZones: [] }); 
    setEditingItem(null); 
    setShowForm(false); 
    setImagePreview(null); 
    setExtractedColors(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

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

  // Filter items by category and search
  const filteredItems = items?.filter(item => {
    // Category filter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    // Search filter
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(10px); }
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOutModal {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOutBackdrop {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.2s ease-in forwards;
        }
        .animate-fade-in-modal {
          animation: fadeInModal 0.2s ease-out forwards;
        }
        .animate-fade-out-modal {
          animation: fadeOutModal 0.2s ease-in forwards;
        }
        .animate-fade-in-backdrop {
          animation: fadeInBackdrop 0.2s ease-out forwards;
        }
        .animate-fade-out-backdrop {
          animation: fadeOutBackdrop 0.2s ease-in forwards;
        }
        .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
        .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
        .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
      `}</style>
      
      {/* Modals - Rendered at root level to ensure proper z-index */}
      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`}>
          <div className={`bg-white border-2 border-black shadow-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto ${isClosing ? 'animate-fade-out-modal' : 'animate-fade-in-modal'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Manage Categories</h2>
              <button 
                onClick={() => closeModal('category')} 
                className="text-gray-600 hover:text-black text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* Add New Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">Add New Category</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all mb-3"
              />
              
              {/* Icon Selection */}
              <label className="block text-xs font-medium text-gray-600 mb-2">Select Icon (Optional)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['starters', 'mains', 'sides', 'drinks', 'desserts', 'hookah'].map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      setNewCategoryIcon(iconName);
                      setNewCategoryIconFile(null);
                    }}
                    className={`p-2 border-2 rounded transition-all ${
                      newCategoryIcon === iconName && !newCategoryIconFile
                        ? 'border-black bg-gray-100'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={`/assets/icons/categories/v2/${iconName}-active.png`}
                      alt={iconName}
                      className="w-full h-12 object-contain"
                    />
                    <p className="text-[9px] text-center mt-1 capitalize">{iconName}</p>
                  </button>
                ))}
              </div>
              
              {/* Custom Icon Upload */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-2">Or Upload Custom Icon</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewCategoryIconFile(reader.result);
                        setNewCategoryIcon(""); // Clear default selection
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-2 file:px-3 file:border-0 file:text-xs file:bg-black file:text-white hover:file:bg-gray-800"
                />
                {newCategoryIconFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={newCategoryIconFile} alt="Preview" className="w-12 h-12 object-contain border border-gray-200" />
                    <button
                      onClick={() => setNewCategoryIconFile(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="w-full bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-all disabled:bg-gray-400"
              >
                {addingCategory ? "Adding..." : "Add Category"}
              </button>
            </div>

            {/* Categories List */}
            <div>
              <label className="block text-sm font-medium text-black mb-3">Your Categories</label>
              {!categories || categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No categories yet. Add your first category above.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <div key={category._id} className="flex items-center justify-between p-3 border border-gray-200 hover:border-black transition-all animate-fade-in" style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}>
                      <span className="font-medium text-black">{category.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(category._id)}
                        className="text-sm text-gray-600 hover:text-black hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => closeModal('category')}
              className="w-full mt-6 bg-gray-200 text-black py-3 text-sm font-medium hover:bg-gray-300 transition-all"
            >
              {returnToForm ? "Back to Item Form" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Zone Manager Modal */}
      {showZoneManager && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`}>
          <div className={`bg-white border-2 border-black shadow-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto ${isClosing ? 'animate-fade-out-modal' : 'animate-fade-in-modal'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Manage Zones</h2>
              <button 
                onClick={() => closeModal('zone')} 
                className="text-gray-600 hover:text-black text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* Add New Zone */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">Add New Zone</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Zone name"
                  className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all"
                />
                <input
                  type="text"
                  value={newZoneDescription}
                  onChange={(e) => setNewZoneDescription(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
                  placeholder="Description (optional)"
                  className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all"
                />
                <button
                  onClick={handleAddZone}
                  disabled={addingZone || !newZoneName.trim()}
                  className="w-full bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-all disabled:bg-gray-400"
                >
                  {addingZone ? "Adding..." : "Add Zone"}
                </button>
              </div>
            </div>

            {/* Zones List */}
            <div>
              <label className="block text-sm font-medium text-black mb-3">Your Zones</label>
              {!zones || zones.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No zones yet. Add your first zone above.</p>
              ) : (
                <div className="space-y-2">
                  {zones.map((zone, index) => (
                    <div key={zone._id} className="p-3 border border-gray-200 hover:border-black transition-all animate-fade-in" style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-black">{zone.name}</span>
                        <button
                          onClick={() => handleDeleteZone(zone._id)}
                          className="text-sm text-gray-600 hover:text-black hover:underline font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      {zone.description && (
                        <p className="text-xs text-gray-500">{zone.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => closeModal('zone')}
              className="w-full mt-6 bg-gray-200 text-black py-3 text-sm font-medium hover:bg-gray-300 transition-all"
            >
              {returnToForm ? "Back to Item Form" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Form Modal - Add/Edit Item */}
      {showForm && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`}>
          <div className={`bg-white border-2 border-black shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col lg:flex-row gap-0 ${isClosing ? 'animate-fade-out-modal' : 'animate-fade-in-modal'}`}>
            
            {/* Left Side - Form */}
            <div className="flex-1 p-6 sm:p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-black">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black">{editingItem ? "Edit Item" : "Add Item"}</h2>
                <button onClick={() => closeModal('form')} className="text-gray-600 hover:text-black text-2xl font-bold">×</button>
              </div>
              
              <div className="space-y-4">
                <label className="block text-sm font-medium text-black mb-2">Name <span className="text-red-600">*</span></label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all" 
                  placeholder="Item name" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Price (₹) <span className="text-red-600">*</span></label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    value={formData.price} 
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                    className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all" 
                    placeholder="0.00" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Image</label>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {imagePreview || formData.image ? (
                    <div className="relative w-full h-[50px] bg-white border-2 border-gray-200 flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-10 w-10 object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-gray-400" />
                      )}
                      <button type="button" onClick={clearImage} className="absolute right-2 top-2 text-gray-600 hover:text-black">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={uploading} 
                      className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm flex items-center justify-center gap-2 hover:border-black text-black transition-all"
                    >
                      {uploading ? "Uploading..." : <><Upload size={16} /> Upload</>}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Category <span className="text-red-600">*</span></label>
                {allCategories.length === 0 ? (
                  <div className="text-sm text-gray-600 p-4 border-2 border-gray-200">
                    <p className="mb-2">No categories yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnToForm(true);
                        setShowCategoryManager(true);
                      }}
                      className="text-black underline hover:no-underline font-medium"
                    >
                      Add categories first →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select 
                      value={formData.category} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                      required
                      className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all"
                    >
                      <option value="">Select category</option>
                      {allCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnToForm(true);
                        setShowForm(false);
                        setShowCategoryManager(true);
                      }}
                      className="w-full bg-gray-100 text-black px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-all"
                    >
                      + Manage Categories
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none resize-none transition-all" 
                  rows={3} 
                  placeholder="Short description" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Available In Zones</label>
                {!zones || zones.length === 0 ? (
                  <div className="text-sm text-gray-600 p-4 border-2 border-gray-200">
                    <p className="mb-2">No zones yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnToForm(true);
                        setShowForm(false);
                        setShowZoneManager(true);
                      }}
                      className="text-black underline hover:no-underline font-medium"
                    >
                      Add zones first →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button 
                      type="button" 
                      onClick={selectAllZones} 
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-all border-2 ${
                        formData.allowedZones.length === 0 
                          ? "bg-black text-white border-black" 
                          : "bg-white text-black border-gray-200 hover:border-black"
                      }`}
                    >
                      All Zones {formData.allowedZones.length === 0 && "✓"}
                    </button>
                    {zones.map((zone) => (
                      <button 
                        key={zone._id} 
                        type="button" 
                        onClick={() => toggleZone(zone._id)} 
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-all border-2 ${
                          formData.allowedZones.includes(zone._id) 
                            ? "bg-black text-white border-black" 
                            : "bg-white text-black border-gray-200 hover:border-black"
                        }`}
                      >
                        {zone.name} {formData.allowedZones.includes(zone._id) && "✓"}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setReturnToForm(true);
                        setShowForm(false);
                        setShowZoneManager(true);
                      }}
                      className="w-full bg-gray-100 text-black px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-all"
                    >
                      + Manage Zones
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => closeModal('form')} 
                  className="flex-1 bg-gray-200 text-black py-3 text-sm font-medium hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={!formData.name.trim() || !formData.price || parseFloat(formData.price) <= 0 || !formData.category}
                  className="flex-1 bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {editingItem ? "Update" : "Add"}
                </button>
              </div>
            </div>

            {/* Right Side - Preview */}
            <div className="w-full lg:w-96 p-6 sm:p-8 bg-white flex flex-col">
              <h3 className="text-sm font-medium text-gray-600 mb-4">Preview</h3>
              
              {/* Extracted Colors */}
              {extractedColors && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Extracted Colors:</p>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center">
                      <div className="w-full h-8 rounded mb-1" style={{ backgroundColor: extractedColors.primary }}></div>
                      <p className="text-[9px] text-gray-500">Primary</p>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="w-full h-8 rounded mb-1" style={{ backgroundColor: extractedColors.secondary }}></div>
                      <p className="text-[9px] text-gray-500">Secondary</p>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="w-full h-8 rounded mb-1" style={{ backgroundColor: extractedColors.accent }}></div>
                      <p className="text-[9px] text-gray-500">Accent</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <div 
                    className="overflow-hidden flex h-32 shadow-lg hover:shadow-xl transition-all border border-white/30 relative" 
                    style={{ 
                      background: extractedColors 
                        ? `linear-gradient(135deg, ${extractedColors.primary}, ${extractedColors.secondary}, ${extractedColors.accent})`
                        : restaurant?.themeColors?.card 
                        ? restaurant.themeColors.card
                        : '#ffffff',
                    }}
                  >
                    {/* Overlay to lighten the gradient */}
                    <div className="absolute inset-0 bg-white/70 pointer-events-none"></div>
                    
                    {/* IMAGE - Left side */}
                    <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden z-10">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : formData.name ? (
                        <img 
                          src={`/api/menu_item/${restaurantId}/${formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`}
                          alt={formData.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <ImageIcon size={32} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* INFO - Right side */}
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0 relative z-10">
                      
                      <div className="flex-1 min-h-0 relative z-10">
                        <h3 
                          className="text-sm font-semibold line-clamp-2 mb-1 leading-tight" 
                          style={{ 
                            color: extractedColors ? '#1f2937' : restaurant?.themeColors?.textPrimary || '#000000',
                          }}
                        >
                          {formData.name || "Item Name"}
                        </h3>
                        <p 
                          className="text-[10px] line-clamp-2 leading-snug" 
                          style={{ 
                            color: extractedColors ? '#4b5563' : restaurant?.themeColors?.textMuted || '#6b7280',
                          }}
                        >
                          {formData.description || "Item description"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 relative z-10">
                        <span 
                          className="text-base font-bold font-['Montserrat']" 
                          style={{ 
                            color: extractedColors ? '#111827' : restaurant?.themeColors?.textPrimary || '#000000',
                          }}
                        >
                          ₹{formData.price || "0"}/-
                        </span>
                        <button 
                          className="px-4 py-2 rounded-lg text-white text-xs font-semibold pointer-events-none shadow-lg"
                          style={{ 
                            backgroundColor: extractedColors?.accent 
                              ? extractedColors.accent
                              : restaurant?.themeColors?.primary 
                              ? restaurant.themeColors.primary
                              : '#000000'
                          }}
                        >
                          Add +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      
      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto">
        
        {/* Header - Mobile Optimized */}
        <div className="sticky top-0 z-[5] bg-white border-b border-gray-200 px-3 py-2 sm:px-6 sm:py-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="animate-fade-in">
              <h1 className="text-lg sm:text-3xl font-bold text-black">Menu</h1>
              <p className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{totalItems} items</p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 animate-fade-in animate-delay-100">
              <button 
                onClick={() => setShowCategoryManager(true)} 
                className="px-2 py-1.5 sm:px-4 sm:py-3 border border-black sm:border-2 text-black text-xs sm:text-base font-medium hover:bg-black hover:text-white transition-all"
              >
                Category
              </button>
              <button 
                onClick={() => setShowForm(true)} 
                className="px-3 py-1.5 sm:px-6 sm:py-3 bg-black text-white text-xs sm:text-base font-medium hover:bg-gray-800 transition-all"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs - Horizontal Scroll on Mobile */}
        <div className="sticky top-[57px] sm:top-[97px] z-[5] bg-white border-b border-gray-200 px-3 py-2 sm:px-6 sm:py-3 animate-fade-in animate-delay-100"> </div>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2 py-1 sm:px-4 sm:py-2 font-medium text-[10px] sm:text-sm whitespace-nowrap transition-all border ${
                categoryFilter === 'all'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-black'
              }`}
            >
              All ({totalItems})
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 sm:px-4 sm:py-2 font-medium text-[10px] sm:text-sm whitespace-nowrap transition-all border ${
                  categoryFilter === cat
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-black'
                }`}
              >
                {cat} ({byCategory[cat] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-6">

      {/* Items Grid - Customer Menu Card Style */}
      {!items ? (
        <div className="bg-white border-2 border-gray-200 p-8 text-center text-gray-600 animate-fade-in">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-gray-200 p-8 text-center animate-fade-in">
          <p className="text-gray-600 mb-4">
            {categoryFilter === 'all' ? 'No menu items yet' : `No items in ${categoryFilter}`}
          </p>
          <button 
            onClick={() => setShowForm(true)} 
            className="bg-black text-white px-6 py-3 font-medium hover:bg-gray-800 transition-all"
          >
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:gap-3 animate-fade-in">
          {filteredItems.map((item, index) => (
            <div 
              key={item._id} 
              className="overflow-hidden flex h-32 md:h-32 transition-all border-2 border-gray-200 hover:border-black cursor-pointer group animate-fade-in bg-white"
              style={{ 
                animationDelay: `${index * 0.05}s`, 
                opacity: 0
              }}
              onClick={() => handleEdit(item)}
            >
              
              {/* IMAGE - Left side */}
              <div className="relative w-40 h-32 md:w-32 md:h-32 flex-shrink-0 overflow-hidden border-r-2 border-gray-200 group-hover:border-black transition-all">
                {(() => {
                  // Use stored URLs from database, fallback to constructed URL
                  const imgSrc = item.imageUrl || item.imageFileUrl || item.image || `/api/menu_item/${restaurantId}/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`;
                  
                  return (
                    <img 
                      src={imgSrc}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        console.error(`Failed to load image for ${item.name}:`, imgSrc);
                        e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg width="32" height="32"><text y="24" font-size="24">🍽️</text></svg></div>';
                      }}
                    />
                  );
                })()}
                
                {/* Zone Badge on Image */}
                {item.allowedZones && item.allowedZones.length > 0 && (
                  <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-black text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 sm:px-2 sm:py-1 font-bold">
                    {item.allowedZones.length}Z
                  </div>
                )}
              </div>

              {/* INFO - Right side */}
              <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between min-w-0 relative z-10">
                
                {/* Top Section */}
                <div className="flex-1 min-h-0">
                  <div className="flex items-start justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <h3 className="text-xs sm:text-sm font-bold text-black line-clamp-2 leading-tight flex-1 uppercase">
                      {item.name}
                    </h3>
                    {/* Category Badge */}
                    <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black text-white font-bold border border-black whitespace-nowrap uppercase">
                      {item.category}
                    </span>
                  </div>
                  
                  <p className="text-[9px] sm:text-[10px] text-gray-600 line-clamp-1 sm:line-clamp-2 leading-snug">
                    {item.description || 'No description'}
                  </p>
                </div>

                {/* Bottom Section - Price and Actions */}
                <div className="flex items-center justify-between mt-1 sm:mt-2">
                  <span className="text-sm sm:text-base font-bold text-black font-['Montserrat']">
                    ₹{item.price.toFixed(0)}
                  </span>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-1 sm:gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                      className="px-2 py-1 sm:px-3 sm:py-1.5 bg-black text-white text-[9px] sm:text-[10px] font-bold hover:bg-gray-800 transition-all uppercase"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                      className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white border-2 border-gray-200 text-black text-[9px] sm:text-[10px] font-bold hover:border-black hover:bg-black hover:text-white transition-all uppercase"
                    >
                      Del
                    </button>
                  </div>
                </div>

                {/* Color Swatches - Bottom Left Corner */}
             
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}