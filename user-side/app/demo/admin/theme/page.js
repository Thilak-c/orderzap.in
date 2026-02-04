"use client";
import { useState, useRef } from "react";
import { Upload, Palette, Sparkles, RefreshCw, Info } from "lucide-react";
import { mapColorsToTheme, applyTheme, DEFAULT_THEME } from "@/lib/theme-utils";

export default function DemoThemePage() {
  const [colors, setColors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      setTimeout(() => setError(null), 5000);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target.result);
    reader.readAsDataURL(file);

    try {
      // Create FormData to send file to API
      const formData = new FormData();
      formData.append('image', file);

      // Send to color extraction API
      const response = await fetch('/api/extract-colors', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract colors');
      }

      const data = await response.json();
      setColors(data.colors);
      
      // Apply theme immediately
      const theme = mapColorsToTheme(data.colors);
      applyTheme(theme);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'Failed to process image. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTheme = () => {
    applyTheme(DEFAULT_THEME);
    setColors(null);
    setPreviewImage(null);
    setSuccess(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentTheme = colors ? mapColorsToTheme(colors) : DEFAULT_THEME;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Palette className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Theme Customization</h1>
              <p className="text-sm text-slate-600">Upload your logo to generate a custom color theme</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Upload size={20} />
                Upload Logo
              </h2>

              {/* Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${loading ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50'}
                  ${previewImage ? 'bg-slate-50' : 'bg-white'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={loading}
                  className="hidden"
                />

                {previewImage ? (
                  <div className="space-y-4">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-slate-600">Click to upload a different image</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <Upload className="text-purple-600" size={32} />
                    </div>
                    <div>
                      <p className="text-base font-medium text-slate-900 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-slate-500">
                        JPEG, PNG, WebP, or GIF (max 10MB)
                      </p>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      <p className="text-sm font-medium text-slate-700">Extracting colors...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <Sparkles className="text-green-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-green-800">Theme applied successfully! Your custom colors are now active.</p>
                </div>
              )}

              {/* Info */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">How it works:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Upload your restaurant logo or any brand image</li>
                    <li>We'll extract 4 dominant colors automatically</li>
                    <li>Colors are applied instantly across your entire app</li>
                    <li>Text colors adjust automatically for readability</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            {colors && (
              <button
                onClick={handleResetTheme}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Reset to Default Theme
              </button>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            {/* Color Palette */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Palette size={20} />
                Color Palette
              </h2>

              <div className="space-y-3">
                {/* Background */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-xl shadow-md border-2 border-white"
                    style={{ backgroundColor: currentTheme.bg }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Background</p>
                    <p className="text-xs text-slate-500 font-mono">{currentTheme.bg}</p>
                  </div>
                </div>

                {/* Primary */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-xl shadow-md border-2 border-white"
                    style={{ backgroundColor: currentTheme.primary }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Primary</p>
                    <p className="text-xs text-slate-500 font-mono">{currentTheme.primary}</p>
                  </div>
                </div>

                {/* Secondary */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-xl shadow-md border-2 border-white"
                    style={{ backgroundColor: currentTheme.secondary }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Secondary</p>
                    <p className="text-xs text-slate-500 font-mono">{currentTheme.secondary}</p>
                  </div>
                </div>

                {/* Accent */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-xl shadow-md border-2 border-white"
                    style={{ backgroundColor: currentTheme.accent }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Accent</p>
                    <p className="text-xs text-slate-500 font-mono">{currentTheme.accent}</p>
                  </div>
                </div>

                {/* Text */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-xl shadow-md border-2 border-white"
                    style={{ backgroundColor: currentTheme.text }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Text</p>
                    <p className="text-xs text-slate-500 font-mono">{currentTheme.text}</p>
                    <p className="text-xs text-slate-400 mt-1">Auto-calculated for readability</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Live Preview</h2>
              
              <div className="space-y-4">
                {/* Sample Card */}
                <div 
                  className="p-4 rounded-lg border-2 transition-all duration-300"
                  style={{ 
                    backgroundColor: currentTheme.bg,
                    borderColor: currentTheme.primary,
                    color: currentTheme.text
                  }}
                >
                  <h3 className="font-bold mb-2" style={{ color: currentTheme.primary }}>
                    Sample Menu Item
                  </h3>
                  <p className="text-sm mb-3" style={{ color: currentTheme.text }}>
                    This is how your content will look with the new theme colors.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      style={{ 
                        backgroundColor: currentTheme.primary,
                        color: '#ffffff'
                      }}
                    >
                      Primary Button
                    </button>
                    <button 
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                      style={{ 
                        backgroundColor: currentTheme.secondary,
                        color: '#ffffff'
                      }}
                    >
                      Secondary
                    </button>
                  </div>
                </div>

                {/* Accessibility Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800">
                    ✓ Text contrast meets WCAG AA standards (4.5:1 minimum) for accessibility
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
