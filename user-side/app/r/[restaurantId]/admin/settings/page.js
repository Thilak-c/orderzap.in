"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, Save, Palette, Image as ImageIcon } from "lucide-react";

export default function SettingsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const updateRestaurant = useMutation(api.restaurants.update);
  
  const [formData, setFormData] = useState({
    name: "",
    brandName: "",
    primaryColor: "#ff2530",
    description: "",
    phone: "",
    address: "",
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Load restaurant data
  useEffect(() => {
    if (restaurant) {
      console.log("Restaurant data from database:", restaurant);
      console.log("Logo URL:", restaurant.logo_url);
      console.log("Theme Colors:", restaurant.themeColors);
      
      setFormData({
        name: restaurant.name || "",
        brandName: restaurant.brandName || restaurant.name || "",
        primaryColor: restaurant.themeColors?.dominant || restaurant.primaryColor || "#ff2530",
        description: restaurant.description || "",
        phone: restaurant.phone || "",
        address: restaurant.address || "",
      });
    }
  }, [restaurant]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!restaurantDbId) return;
    
    setIsSaving(true);
    try {
      let logoUrl = restaurant.logo;
      
      // Upload logo if changed
      if (logoFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('logo', logoFile);
        formDataToSend.append('restaurant', restaurantId);
        
        const response = await fetch('/api/upload-logo', {
          method: 'POST',
          body: formDataToSend,
        });
        
        if (response.ok) {
          const data = await response.json();
          logoUrl = data.logoUrl;
        }
      }
      
      // Update restaurant
      await updateRestaurant({
        restaurantId: restaurantDbId,
        name: formData.name,
        brandName: formData.brandName,
        primaryColor: formData.primaryColor,
        description: formData.description,
        phone: formData.phone,
        address: formData.address,
        logo_url: logoUrl,
      });
      
      setToastMessage("✓ Settings saved successfully");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setToastMessage("✗ Failed to save settings");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    setIsSaving(false);
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loader-4">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-3 md:p-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-black text-white px-6 py-4 border-2 border-black font-bold uppercase tracking-wide">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg md:text-3xl font-bold text-black uppercase tracking-wider mb-2">Settings</h1>
        <p className="text-gray-600 text-xs md:text-sm">Manage your restaurant details and branding</p>
      </div>

      <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Settings Forms */}
        <div className="lg:col-span-3 space-y-6">
        {/* Logo Section */}
        <div className="bg-white border-2 border-gray-300 p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={20} className="text-black" />
            <h2 className="text-sm md:text-base font-bold text-black uppercase tracking-wide">Restaurant Logo</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Current Logo */}
            <div className="flex-shrink-0">
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Current Logo
              </label>
              <div className="w-32 h-32 border-2 border-black bg-white flex items-center justify-center overflow-hidden">
                {restaurant.logo_url ? (
                  <img 
                    src={restaurant.logo_url} 
                    alt="Current Logo" 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <span className="text-4xl">🍽️</span>
                )}
              </div>
            </div>
            
            {/* New Logo Preview */}
            {logoPreview && (
              <div className="flex-shrink-0">
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                  New Logo Preview
                </label>
                <div className="w-32 h-32 border-2 border-black bg-white flex items-center justify-center overflow-hidden">
                  <img src={logoPreview} alt="New Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            )}
            
            {/* Upload Button */}
            <div className="flex-1">
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Upload New Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black border-2 border-gray-300 hover:border-black font-bold text-xs uppercase tracking-wide cursor-pointer transition-all"
              >
                <Upload size={16} />
                Choose File
              </label>
              <p className="text-xs text-gray-500 mt-2">Recommended: Square image, at least 200x200px</p>
              {logoFile && (
                <p className="text-xs text-black font-bold mt-2">✓ {logoFile.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Brand Color */}
        <div className="bg-white border-2 border-gray-300 p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={20} className="text-black" />
            <h2 className="text-sm md:text-base font-bold text-black uppercase tracking-wide">Brand Color</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Picker */}
            <div>
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Primary Color
              </label>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-16 h-16 border-2 border-black cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none uppercase font-mono"
                  placeholder="#ff2530"
                />
              </div>
              
              {/* Current vs New */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                    Current
                  </label>
                  <div 
                    className="w-full h-16 border-2 border-black"
                    style={{ backgroundColor: restaurant.themeColors?.dominant || restaurant.primaryColor || "#ff2530" }}
                  />
                  <p className="text-xs text-gray-600 mt-1 font-mono">{restaurant.themeColors?.dominant || restaurant.primaryColor || "#ff2530"}</p>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                    New
                  </label>
                  <div 
                    className="w-full h-16 border-2 border-black"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                  <p className="text-xs text-gray-600 mt-1 font-mono">{formData.primaryColor}</p>
                </div>
              </div>
            </div>
            
            {/* Theme Preview */}
            <div>
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Preview in App
              </label>
              <div className="border-2 border-black p-4 bg-white">
                <div 
                  className="p-3 mb-3 flex items-center justify-between"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  <div className="flex items-center gap-2">
                    {(logoPreview || restaurant.logo_url) ? (
                      <img 
                        src={logoPreview || restaurant.logo_url} 
                        alt="Logo" 
                        className="w-8 h-8 object-contain bg-white rounded-full p-1" 
                      />
                    ) : (
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">🍽️</div>
                    )}
                    <span className="text-white font-bold text-sm">{formData.brandName || formData.name}</span>
                  </div>
                  <span className="text-white text-xs">TABLE 1</span>
                </div>
                
                {/* Mock Menu Item */}
                <div className="border-2 border-gray-300 p-2 flex gap-2">
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">
                    🍕
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-black mb-1">Sample Menu Item</p>
                    <p className="text-[10px] text-gray-600 mb-2">Delicious food item</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">₹299</span>
                      <button 
                        className="px-3 py-1 text-[10px] font-bold text-white"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        Add +
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Mock Cart Bar */}
                <div className="mt-3 p-2 bg-white border-2 border-gray-300 flex items-center justify-between">
                  <span className="text-xs font-bold">2 Items</span>
                  <div 
                    className="px-3 py-1 text-white text-xs font-bold"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    ₹598 →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant Details */}
        <div className="bg-white border-2 border-gray-300 p-4 md:p-6 mb-6">
          <h2 className="text-sm md:text-base font-bold text-black uppercase tracking-wide mb-4">Restaurant Details</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  placeholder="My Restaurant"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  placeholder="Brand Name"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none resize-none"
                rows={3}
                placeholder="Tell customers about your restaurant..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  placeholder="+91 1234567890"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none"
                  placeholder="123 Main St, City"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.name}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold text-sm uppercase tracking-wide border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Right Column - Live Previews */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-black uppercase tracking-wide">Live Preview</h2>
            <p className="text-[10px] text-gray-600">Real-time updates</p>
          </div>
          
          {/* Preview Grid - 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preview 1: Landing Page */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] text-gray-600 font-bold uppercase tracking-wide">
                  Landing Page
                </label>
                <a 
                  href={`/r/${restaurantId}`}
                  target="_blank"
                  className="text-[10px] text-black hover:underline font-bold uppercase flex items-center gap-1"
                >
                  Open →
                </a>
              </div>
              <div className="border-2 border-black bg-gray-100 overflow-hidden aspect-[9/16] relative">
                <iframe 
                  src={`/r/${restaurantId}`}
                  className="absolute inset-0 w-full h-full"
                  title="Landing Page Preview"
                  style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                />
              </div>
            </div>

            {/* Preview 2: Menu Page */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] text-gray-600 font-bold uppercase tracking-wide">
                  Menu Page
                </label>
                <a 
                  href={`/r/${restaurantId}/m/1?key=preview`}
                  target="_blank"
                  className="text-[10px] text-black hover:underline font-bold uppercase flex items-center gap-1"
                >
                  Open →
                </a>
              </div>
              <div className="border-2 border-black bg-gray-100 overflow-hidden aspect-[9/16] relative">
                <iframe 
                  src={`/r/${restaurantId}/m/1?key=preview`}
                  className="absolute inset-0 w-full h-full"
                  title="Menu Page Preview"
                  style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                />
              </div>
            </div>

            {/* Preview 3: Cart Page */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] text-gray-600 font-bold uppercase tracking-wide">
                  Cart Page
                </label>
                <a 
                  href={`/r/${restaurantId}/m/1/c/1`}
                  target="_blank"
                  className="text-[10px] text-black hover:underline font-bold uppercase flex items-center gap-1"
                >
                  Open →
                </a>
              </div>
              <div className="border-2 border-black bg-gray-100 overflow-hidden aspect-[9/16] relative">
                <iframe 
                  src={`/r/${restaurantId}/m/1/c/1`}
                  className="absolute inset-0 w-full h-full"
                  title="Cart Page Preview"
                  style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                />
              </div>
            </div>

            {/* Preview 4: Order Status */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] text-gray-600 font-bold uppercase tracking-wide">
                  Order Status
                </label>
                <a 
                  href={`/r/${restaurantId}/order-status/demo`}
                  target="_blank"
                  className="text-[10px] text-black hover:underline font-bold uppercase flex items-center gap-1"
                >
                  Open →
                </a>
              </div>
              <div className="border-2 border-black bg-gray-100 overflow-hidden aspect-[9/16] relative">
                <iframe 
                  src={`/r/${restaurantId}/order-status/demo`}
                  className="absolute inset-0 w-full h-full"
                  title="Order Status Preview"
                  style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                />
              </div>
            </div>
          </div>

          {/* Refresh Note */}
          <div className="bg-white border-2 border-gray-300 p-3">
            <p className="text-[10px] text-gray-600 text-center mb-2">
              💡 <span className="font-bold">Tip:</span> After saving changes, refresh the previews to see updates
            </p>
            <p className="text-[10px] text-gray-500 text-center">
              Preview mode shows demo data for testing
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
