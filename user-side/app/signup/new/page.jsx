"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Loader2, Store, Phone, Check, Palette } from "lucide-react";
import { mapColorsToTheme, applyTheme } from "@/lib/theme-utils";

export default function RestaurantForm() {
  const router = useRouter();
  const createRestaurant = useMutation(api.restaurants.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoStorageId, setLogoStorageId] = useState(null);
  const [themeColors, setThemeColors] = useState(null);
  const [extractingColors, setExtractingColors] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState("");

  // Generate random restaurant ID (3-4 chars)
  const generateRestaurantId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const length = Math.random() > 0.5 ? 3 : 4;
    let id = "";
    for (let i = 0; i < length; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be less than 2MB");
      return;
    }

    setLogoFile(file);
    setLogo(URL.createObjectURL(file));
    setError("");

    // Upload to Convex storage
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setLogoStorageId(storageId);

      // Extract colors from logo for theme generation
      setExtractingColors(true);
      try {
        const formData = new FormData();
        formData.append('image', file);

        const colorResponse = await fetch('/api/extract-colors', {
          method: 'POST',
          body: formData,
        });

        if (colorResponse.ok) {
          const colorData = await colorResponse.json();
          setThemeColors(colorData.colors);
          
          // Apply theme immediately for preview
          const theme = mapColorsToTheme(colorData.colors);
          applyTheme(theme);
        }
      } catch (colorError) {
        console.error("Color extraction failed:", colorError);
        // Don't show error to user, theme is optional
      } finally {
        setExtractingColors(false);
      }
    } catch (error) {
      console.error("Logo upload failed:", error);
      setError("Failed to upload logo. You can continue without it.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError("Restaurant name is required");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate unique ID
      let restaurantId = generateRestaurantId();
      
      // Create restaurant with uploaded logo storage ID and theme colors
      await createRestaurant({
        id: restaurantId,
        name: formData.name,
        phone: formData.phone,
        logo: logoStorageId || "", // Use storage ID if uploaded
        brandName: formData.name, // Use restaurant name as brand name
        themeColors: themeColors || null, // Save extracted theme colors
      });

      setGeneratedId(restaurantId);
      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/r/${restaurantId}`);
      }, 3000);

    } catch (err) {
      // If ID exists, try again with new ID
      if (err.message?.includes("already exists")) {
        handleSubmit(e); // Retry with new ID
      } else {
        setError(err.message || "Failed to create restaurant");
        setLoading(false);
      }
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border-2 border-green-500 mb-4 animate-bounce-in">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to OrderZap!
          </h2>
          <p className="text-gray-600 mb-6">
            Your restaurant has been created successfully
          </p>
          <div className="p-4 bg-red-50 rounded-xl mb-6 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Your restaurant URL</p>
            <p className="text-red-600 font-mono font-semibold text-lg">
              orderzap.in/r/{generatedId}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 animate-fade-in">

        {/* Header */}
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Create Your Restaurant
        </h1>
        <p className="text-center text-gray-500 text-sm mt-1">
          Setup your restaurant in 60 seconds
        </p>

        {/* Logo Upload */}
        <div className="mt-6 flex flex-col items-center">
          <label className="cursor-pointer group">
            <div className="w-28 h-28 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center overflow-hidden bg-red-50 group-hover:bg-red-100 transition relative">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <Store size={32} className="text-red-500 mb-1" />
                  <span className="text-xs text-red-500 text-center px-2">
                    Upload Logo
                  </span>
                </div>
              )}
              
              {/* Extracting colors overlay */}
              {extractingColors && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 size={24} className="text-red-500 animate-spin mx-auto mb-1" />
                    <span className="text-xs text-red-600">Extracting colors...</span>
                  </div>
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleLogoUpload}
            />
          </label>

          <p className="text-xs text-gray-400 mt-2">
            PNG / JPG (Max 2MB)
          </p>

          {/* Theme colors preview */}
          {themeColors && !extractingColors && (
            <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 w-full max-w-xs animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Palette size={14} className="text-purple-600" />
                <p className="text-xs font-semibold text-purple-900">Theme Generated!</p>
              </div>
              <div className="flex gap-2 justify-center">
                <div 
                  className="w-8 h-8 rounded-lg shadow-sm border border-white"
                  style={{ backgroundColor: themeColors.dominant }}
                  title="Background"
                ></div>
                <div 
                  className="w-8 h-8 rounded-lg shadow-sm border border-white"
                  style={{ backgroundColor: themeColors.darkVibrant }}
                  title="Primary"
                ></div>
                <div 
                  className="w-8 h-8 rounded-lg shadow-sm border border-white"
                  style={{ backgroundColor: themeColors.lightVibrant }}
                  title="Secondary"
                ></div>
                <div 
                  className="w-8 h-8 rounded-lg shadow-sm border border-white"
                  style={{ backgroundColor: themeColors.muted }}
                  title="Accent"
                ></div>
              </div>
              <p className="text-xs text-purple-700 text-center mt-2">
                Your custom theme will be applied
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* Restaurant Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Restaurant Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Store size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Royal Biryani House"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none bg-white"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none bg-white"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Restaurant...
              </>
            ) : (
              <>
                Create Restaurant →
              </>
            )}
          </button>

        </form>

        {/* Footer */}
        <p className="text-xs text-center text-gray-400 mt-6">
          By continuing, you agree to OrderZap Terms
        </p>

      </div>
    </div>
  );
}
