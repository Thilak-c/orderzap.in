"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { Upload, X } from "lucide-react";

export default function AdminSettingsPage() {
  const { isAuthenticated, loading } = useAdminAuth();
  const settings = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);
  const initDefaults = useMutation(api.settings.initDefaults);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useQuery(api.files.getUrl, 
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );

  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setBrandName(settings.brandName || "BTS DISC");
      // Use storage URL if available, otherwise use the path
      if (getFileUrl) {
        setBrandLogo(getFileUrl);
      } else {
        setBrandLogo(settings.brandLogo || "/assets/logos/favicon_io/android-chrome-192x192.png");
      }
    }
  }, [settings, getFileUrl]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be less than 5MB");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Save storage ID to settings
      await setSetting({ key: "brandLogoStorageId", value: storageId });
      
      // Clear branding cache so changes appear immediately
      localStorage.removeItem("branding_cache");
      
      setMessage("Logo uploaded successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Error uploading logo");
      setTimeout(() => setMessage(""), 3000);
    }

    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    try {
      await setSetting({ key: "brandLogoStorageId", value: "" });
      await setSetting({ key: "brandLogo", value: "/assets/logos/favicon_io/android-chrome-192x192.png" });
      setBrandLogo("/assets/logos/favicon_io/android-chrome-192x192.png");
      
      // Clear branding cache so changes appear immediately
      localStorage.removeItem("branding_cache");
      
      setMessage("Logo removed");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error removing logo");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setSetting({ key: "brandName", value: brandName });
      // Only update brandLogo path if it's not using storage
      if (!settings?.brandLogoStorageId) {
        await setSetting({ key: "brandLogo", value: brandLogo });
      }
      
      // Clear branding cache so changes appear immediately
      localStorage.removeItem("branding_cache");
      
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving settings");
    }
    setSaving(false);
  };

  const handleInitDefaults = async () => {
    await initDefaults();
    setMessage("Default settings initialized!");
    setTimeout(() => setMessage(""), 3000);
  };

  if (loading) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">SETTINGS</h1>
        <p className="text-zinc-600 text-xs uppercase tracking-widest">Brand Configuration</p>
      </div>

      <div className="max-w-2xl">
        {/* Preview */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 mb-6">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Preview</p>
          <div className="flex items-center gap-4 bg-zinc-950 p-4 border border-zinc-800">
            <img 
              src={brandLogo || "/assets/logos/favicon_io/android-chrome-192x192.png"} 
              alt={brandName} 
              className="h-12 w-12 rounded-full object-contain"
              onError={(e) => {
                e.target.src = "/assets/logos/favicon_io/android-chrome-192x192.png";
              }}
            />
            <div>
              <h2 className="text-lg font-bold text-white">{brandName || "BTS DISC"}</h2>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-2">
              Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              placeholder="Enter brand name"
            />
            <p className="text-[9px] text-zinc-600 mt-1">This will appear throughout the app</p>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-2">
              Brand Logo
            </label>
            
            {/* Current Logo Display */}
            <div className="mb-3 flex items-center gap-3">
              <img 
                src={brandLogo || "/assets/logos/favicon_io/android-chrome-192x192.png"} 
                alt="Current logo" 
                className="h-16 w-16 rounded-full object-contain bg-zinc-950 border border-zinc-800 p-2"
                onError={(e) => {
                  e.target.src = "/assets/logos/favicon_io/android-chrome-192x192.png";
                }}
              />
              {settings?.brandLogoStorageId && (
                <button
                  onClick={handleRemoveLogo}
                  className="p-2 bg-red-950 border border-red-900 text-red-400 hover:bg-red-900 text-xs"
                  title="Remove logo"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? "UPLOADING..." : "UPLOAD NEW LOGO"}
            </button>
            <p className="text-[9px] text-zinc-600 mt-1">
              Upload an image file (max 5MB). Recommended: square image, 512x512px or larger
            </p>

            {/* Or use URL */}
            <div className="mt-4">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2">Or use URL</p>
              <input
                type="text"
                value={settings?.brandLogoStorageId ? "" : brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                disabled={!!settings?.brandLogoStorageId}
                className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="/assets/logos/favicon_io/android-chrome-192x192.png"
              />
              <p className="text-[9px] text-zinc-600 mt-1">
                {settings?.brandLogoStorageId 
                  ? "Remove uploaded logo to use URL instead" 
                  : "Path to logo image (e.g., /assets/logos/favicon_io/android-chrome-192x192.png)"}
              </p>
            </div>
          </div>

          {message && (
            <div className={`p-3 text-xs ${message.includes("Error") || message.includes("must") ? "bg-red-950 border border-red-900 text-red-400" : "bg-emerald-950 border border-emerald-900 text-emerald-400"}`}>
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <button
              onClick={handleInitDefaults}
              className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700 hover:text-white"
            >
              RESET TO DEFAULTS
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-zinc-900 border border-zinc-800 p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Note</p>
          <p className="text-xs text-zinc-400">
            Changes will be reflected across the entire application including customer-facing pages, 
            admin panel, and staff interfaces. Uploaded images are stored securely in the database.
          </p>
        </div>
      </div>
    </div>
  );
}
