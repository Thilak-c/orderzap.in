"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, X, Store, Palette, Save, RefreshCw } from "lucide-react";
import ImageThemeUploader from "@/components/ImageThemeUploader";
import { useRestaurant } from "@/lib/restaurant";

export default function AdminSettingsPage() {
  const { restaurant } = useRestaurant();
  const updateRestaurant = useMutation(api.restaurants.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getRestaurantLogoUrl = useQuery(
    api.files.getUrl,
    restaurant?.logo ? { storageId: restaurant.logo } : "skip"
  );

  const [restaurantName, setRestaurantName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (restaurant) {
      setRestaurantName(restaurant.name || "");
    }
  }, [restaurant]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("error", "Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      if (restaurant?._id) {
        await updateRestaurant({
          restaurantId: restaurant._id,
          logo: storageId,
        });
        showMessage("success", "Logo uploaded successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showMessage("error", "Failed to upload logo");
    }

    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    try {
      if (restaurant?._id) {
        await updateRestaurant({
          restaurantId: restaurant._id,
          logo: "",
        });
        showMessage("success", "Logo removed");
      }
    } catch (error) {
      showMessage("error", "Failed to remove logo");
    }
  };

  const handleSave = async () => {
    if (!restaurantName.trim()) {
      showMessage("error", "Restaurant name is required");
      return;
    }

    setSaving(true);

    try {
      if (restaurant?._id) {
        await updateRestaurant({
          restaurantId: restaurant._id,
          name: restaurantName,
        });
        showMessage("success", "Settings saved successfully!");
      }
    } catch (error) {
      showMessage("error", "Failed to save settings");
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your restaurant information and branding</p>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl border animate-fade-in ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Restaurant Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Store className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Restaurant Information</h2>
                  <p className="text-sm text-slate-600">Basic details about your restaurant</p>
                </div>
              </div>

              {/* Restaurant Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="Enter restaurant name"
                />
              </div>

              {/* Restaurant Logo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Restaurant Logo
                </label>

                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                      {getRestaurantLogoUrl ? (
                        <img
                          src={getRestaurantLogoUrl}
                          alt="Restaurant logo"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Upload size={32} className="text-slate-400" />
                      )}
                    </div>
                    {getRestaurantLogoUrl && (
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                        title="Remove logo"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Upload size={18} />
                      {uploading ? "Uploading..." : "Upload Logo"}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                      PNG, JPG or WebP (max 5MB). Square images work best.
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Theme Customization */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="text-purple-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Theme Customization</h2>
                  <p className="text-sm text-slate-600">Generate colors from your logo</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                Upload an image to automatically extract colors and create a custom theme for your restaurant.
              </p>

              <ImageThemeUploader restaurantId={restaurant?._id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Preview</h3>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getRestaurantLogoUrl ? (
                      <img
                        src={getRestaurantLogoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Store size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">
                      {restaurantName || "Your Restaurant"}
                    </h4>
                    <p className="text-xs text-slate-500">Admin Panel</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Use a high-quality logo for best results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Square images (512x512px) work perfectly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Theme colors update across your entire app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Changes are saved automatically</span>
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = `/r/${restaurant?.id}/admin/theme`}
                  className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium transition-colors text-left flex items-center gap-2"
                >
                  <Palette size={16} />
                  Advanced Theme Editor
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium transition-colors text-left flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
