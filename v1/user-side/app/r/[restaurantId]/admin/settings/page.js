"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, Save, Palette, Image as ImageIcon, AlertCircle } from "lucide-react";
import { squareLogoUrl, fullLogoUrl } from "@/lib/logo-utils";
import { useRouteProtection } from "@/lib/useRouteProtection";

export default function SettingsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Route protection - only Owner and Manager can access Settings
  const { authUser, isAuthorized, isChecking } = useRouteProtection(restaurantId, ['Owner', 'Manager']);
  
  // Get restaurant database ID - MUST be called before any conditional returns
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
    latitude: "",
    longitude: "",
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [fullLogoFile, setFullLogoFile] = useState(null);
  const [fullLogoPreview, setFullLogoPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Load restaurant data
  useEffect(() => {
    if (restaurant) {
      console.log("Restaurant data from database:", restaurant);
      console.log("Theme Colors:", restaurant.themeColors);
      
      setFormData({
        name: restaurant.name || "",
        brandName: restaurant.brandName || restaurant.name || "",
        primaryColor: restaurant.themeColors?.dominant || restaurant.primaryColor || "#ff2530",
        description: restaurant.description || "",
        phone: restaurant.phone || "",
        address: restaurant.address || "",
        latitude: restaurant.location?.latitude?.toString() || "",
        longitude: restaurant.location?.longitude?.toString() || "",
      });
    }
  }, [restaurant]);
  
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
            You don't have permission to access Settings. Only owners and managers can modify restaurant settings.
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

  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleFullLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFullLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFullLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!restaurantDbId) return;
    
    setIsSaving(true);
    try {
      // prepare URLs for DB update (start with existing values)
      let newFaviconUrl = restaurant.favicon_url || restaurant.logo_url || null;

      // Upload favicon if changed (backend filesystem only)
      if (logoFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('favicon', logoFile);
        formDataToSend.append('restaurant', restaurantId);

        const resp = await fetch('/api/upload-logo', {
          method: 'POST',
          body: formDataToSend,
        });
        if (resp.ok) {
          const d = await resp.json();
          newFaviconUrl = d.logoUrl;
        }
      }

      // Upload full-width logo if provided
      if (fullLogoFile) {
        const fd = new FormData();
        fd.append('full_logo', fullLogoFile);
        fd.append('restaurant', restaurantId);
        const resp = await fetch('/api/upload-logo', {
          method: 'POST',
          body: fd,
        });
        // Logo uploaded to filesystem, no need to store URL in Convex
        if (resp.ok) {
          // Clear the preview and file to show the newly uploaded logo
          setFullLogoFile(null);
          setFullLogoPreview(null);
        }
      }
      
      // Prepare location object if coordinates are provided
      let location = undefined;
      if (formData.latitude && formData.longitude) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          location = { latitude: lat, longitude: lng };
        }
      }
      
      // Update restaurant details
      await updateRestaurant({
        restaurantId: restaurantDbId,
        name: formData.name,
        brandName: formData.brandName,
        primaryColor: formData.primaryColor,
        description: formData.description,
        phone: formData.phone,
        address: formData.address,
        favicon_url: newFaviconUrl,
        location: location,
      });
      
      // Clear logo preview after successful save to show the uploaded version
      if (logoFile) {
        setLogoFile(null);
        setLogoPreview(null);
      }
      
      // Update timestamp to bust cache for current logo display
      setLogoTimestamp(Date.now());
      
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setDetectingLocation(false);
        setToastMessage("✓ Location detected successfully");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      },
      (error) => {
        setDetectingLocation(false);
        alert(`Error detecting location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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
        {/* Logo Section - improved layout */}
        <section className="bg-white border-2 border-gray-300 p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={20} className="text-black" />
              <h2 className="text-sm md:text-base font-bold text-black uppercase tracking-wide">Branding & Logos</h2>
            </div>
            <p className="text-xs text-gray-600">Manage favicon and full-width logo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Current Logos Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">Current Square Logo</label>
                <div className="w-32 h-32 border-2 border-gray-200 bg-white flex items-center justify-center overflow-hidden rounded-lg">
                  <img src={`${squareLogoUrl(restaurant, restaurantId)}?t=${logoTimestamp}`} alt="Current Logo" className="w-full h-full object-contain p-2" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">Current Full Logo</label>
                <div className="w-full h-20 border-2 border-gray-200 bg-white flex items-center justify-center overflow-hidden rounded-md">
                  <img src={`${fullLogoUrl(restaurant, restaurantId)}?t=${logoTimestamp}`} alt="Full Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            {/* New Previews Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">New Square Logo Preview</label>
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden rounded-lg">
                  {logoPreview ? (
                    <img src={logoPreview} alt="New Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-gray-400">No new square logo selected</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">New Full Logo Preview</label>
                <div className="w-full h-20 border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden rounded-md">
                  {fullLogoPreview ? (
                    <img src={fullLogoPreview} alt="New Full Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No new full logo selected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Controls Column */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">Upload Favicon</label>
                <input id="favicon-upload" type="file" accept="image/*" onChange={handleFaviconChange} className="hidden" />
                <label htmlFor="favicon-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black border border-gray-300 rounded-md cursor-pointer">
                  <Upload size={14} /> Choose Favicon
                </label>
                {logoFile && <p className="text-xs mt-2">✓ {logoFile.name}</p>}
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">Upload Full Logo</label>
                <input id="full-logo-upload" type="file" accept="image/*" onChange={handleFullLogoChange} className="hidden" />
                <label htmlFor="full-logo-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black border border-gray-300 rounded-md cursor-pointer">
                  <Upload size={14} /> Choose Full Logo
                </label>
                {fullLogoFile && <p className="text-xs mt-2">✓ {fullLogoFile.name}</p>}
              </div>

              <p className="text-xs text-gray-500 mt-2">Tips: Square logo for app chrome; full logo for banners. Recommended: PNG/WebP with transparent background.</p>
            </div>
          </div>
        </section>

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
                    {(logoPreview || squareLogoUrl(restaurant, restaurantId)) ? (
                      <img 
                        src={logoPreview || squareLogoUrl(restaurant, restaurantId)} 
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

        {/* Restaurant Location */}
        <div className="bg-white border-2 border-gray-300 p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm md:text-base font-bold text-black uppercase tracking-wide">Restaurant Location</h2>
            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="flex items-center gap-2 px-3 py-2 bg-black text-white text-xs font-bold uppercase border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50"
            >
              {detectingLocation ? "Detecting..." : "Auto-Detect"}
            </button>
          </div>
          
          <p className="text-xs text-gray-600 mb-4">
            Set your restaurant's GPS coordinates for waiter proximity tracking. Waiters must be within 100m to go online.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Latitude
              </label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none font-mono"
                placeholder="28.6139"
              />
            </div>
            
            <div>
              <label className="block text-[10px] text-gray-600 font-bold mb-2 uppercase tracking-wide">
                Longitude
              </label>
              <input
                type="text"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full bg-white border-2 border-gray-300 px-3 py-2 text-sm text-black focus:border-black outline-none font-mono"
                placeholder="77.2090"
              />
            </div>
          </div>
          
          {formData.latitude && formData.longitude && (
            <div className="mt-4 p-3 bg-green-50 border-2 border-green-600">
              <p className="text-xs text-green-700">
                ✓ Location set: {formData.latitude}, {formData.longitude}
              </p>
              <a
                href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 underline mt-1 inline-block"
              >
                View on Google Maps →
              </a>
            </div>
          )}
          
          {!formData.latitude && !formData.longitude && (
            <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-600">
              <p className="text-xs text-yellow-700">
                ⚠ No location set. Waiter proximity tracking will not work until you set coordinates.
              </p>
            </div>
          )}
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
