"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Loader2, Store, Phone, Check } from "lucide-react";
import { mapColorsToTheme, applyTheme } from "@/lib/theme-utils";

export default function RestaurantForm() {
  const router = useRouter();
  const createRestaurant = useMutation(api.restaurants.create);

  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoStorageId] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Generate restaurant ID from name
  const generateRestaurantId = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    console.log("File selected:", file);
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be less than 2MB");
      return;
    }

    setLogoFile(file);
    setLogo(URL.createObjectURL(file));
    setError("");
    console.log("Logo preview set");

    // Extract colors from logo for theme generation
    setExtractingColors(true);
    console.log("Starting color extraction...");
    try {
      const colorFormData = new FormData();
      colorFormData.append('image', file);

      const colorResponse = await fetch('/api/extract-colors', {
        method: 'POST',
        body: colorFormData,
      });

      console.log("Color extraction response status:", colorResponse.status);

      if (colorResponse.ok) {
        const colorData = await colorResponse.json();
        console.log("Colors extracted:", colorData.colors);
        setThemeColors(colorData.colors);
        
        // Apply theme immediately for preview
        const theme = mapColorsToTheme(colorData.colors);
        console.log("Theme mapped:", theme);
        applyTheme(theme);
        console.log("Theme applied!");
      } else {
        const errorData = await colorResponse.json();
        console.error("Color extraction failed:", errorData);
      }
    } catch (colorError) {
      console.error("Color extraction failed:", colorError);
      // Don't show error to user, theme is optional
    } finally {
      setExtractingColors(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle phone number with locked +91
    if (name === 'phone') {
      // Remove +91 prefix if user tries to type it
      let phoneValue = value.replace(/^\+91\s*/, '');
      // Only allow numbers
      phoneValue = phoneValue.replace(/[^0-9]/g, '');
      // Limit to 10 digits
      phoneValue = phoneValue.slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: phoneValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation checks
    if (!formData.name.trim()) {
      setError("Restaurant name is required");
      return;
    }
    
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    
    if (formData.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    
    if (!logoFile) {
      setError("❌ Please upload a logo");
      return;
    }
    
    if (!themeColors) {
      setError("Please wait for color extraction to complete");
      return;
    }

    // Start fade out
    setIsTransitioning(true);
    
    // Wait for fade out to complete, then start loading
    setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        // Upload logo to file system during loading animation
        let uploadedLogoUrl = "";
        if (logoFile) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', logoFile);
          uploadFormData.append('restaurantName', formData.name);

          const uploadResponse = await fetch('/api/upload-logo', {
            method: 'POST',
            body: uploadFormData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedLogoUrl = uploadData.logoUrl;
            console.log("Logo uploaded to file system:", uploadedLogoUrl);
          } else {
            console.error("Logo upload failed, continuing without file system URL");
          }
        }

        // Generate ID from restaurant name
        let restaurantId = generateRestaurantId(formData.name);
        
        // Validate ID is not empty
        if (!restaurantId) {
          setError("❌ Restaurant name must contain letters or numbers");
          setLoading(false);
          setIsTransitioning(false);
          return;
        }
        
        // Wait for minimum 5 seconds to show the animation
        const minAnimationTime = 5000; // 5 seconds
        const startTime = Date.now();
        
        // Create restaurant with uploaded logo URL and theme colors
        await createRestaurant({
          id: restaurantId,
          name: formData.name,
          phone: `+91${formData.phone}`,
          logo: logoStorageId || "", // Keep for backward compatibility
          logo_url: uploadedLogoUrl || "", // New: file system URL
          brandName: formData.name,
          themeColors: themeColors || null,
        });

        // Calculate remaining time to reach 5 seconds
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minAnimationTime - elapsedTime);
        
        // Wait for remaining time if needed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        setGeneratedId(restaurantId);
        setSuccess(true);

        // Redirect to admin panel after 3 seconds
        setTimeout(() => {
          router.push(`/r/${restaurantId}/admin`);
        }, 3000);

      } catch (err) {
        // If ID exists, add a number suffix
        if (err.message?.includes("already exists")) {
          const randomNum = Math.floor(Math.random() * 999) + 1;
          const newId = `${generateRestaurantId(formData.name)}-${randomNum}`;
          
          try {
            await createRestaurant({
              id: newId,
              name: formData.name,
              phone: `+91${formData.phone}`,
              logo: logoStorageId || "", // Keep for backward compatibility
              logo_url: logoUrl || "", // New: file system URL
              brandName: formData.name,
              themeColors: themeColors || null,
            });
            
            setGeneratedId(newId);
            setSuccess(true);
            
            setTimeout(() => {
              router.push(`/r/${newId}/admin`);
            }, 3000);
          } catch (retryErr) {
            setError(retryErr.message || "Failed to create restaurant");
            setLoading(false);
            setIsTransitioning(false);
          }
        } else {
          setError(err.message || "Failed to create restaurant");
          setLoading(false);
          setIsTransitioning(false);
        }
      }
    }, 500);
  };

  // Loading/Creating screen
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          backgroundColor: themeColors?.dominant ? `${themeColors.dominant}10` : '#fafafa'
        }}
      >
        <div className="text-center max-w-lg">
          {/* Header Text */}
          <h2 
            className="text-3xl font-bold mb-2"
            style={{ color: themeColors?.darkVibrant || '#111827' }}
          >
            Creating your new era
          </h2>
          <p className="text-gray-600 mb-12">
            A new start with OrderZap, Always gonna be with <span className="font-semibold" style={{ color: themeColors?.darkVibrant || '#111827' }}>{formData.name || 'your brand'}</span>
          </p>

          {/* Logos with Data Animation */}
          <div className="relative flex items-center justify-center gap-32 mb-8 h-24">
            {/* Brand Logo */}
            <div className="relative">
              {logo ? (
                <img
                  src={logo}
                  alt="Brand"
                  className="w-20 h-20 rounded-xl object-cover relative z-10"
                />
              ) : (
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center relative z-10"
                  // style={{ backgroundColor: themeColors?.lightVibrant || '#fee2e2' }}
                >
                  <Store size={32} style={{ color: themeColors?.darkVibrant || '#dc2626' }} />
                </div>
              )}
              
              {/* Data particles from left logo */}
              <div className="absolute top-1/2 left-full w-32 h-1 -translate-y-1/2 overflow-visible">
                <div 
                  className="particle-right"
                  style={{ 
                    backgroundColor: themeColors?.darkVibrant || '#dc2626',
                    boxShadow: `0 0 10px ${themeColors?.darkVibrant || '#dc2626'}`
                  }}
                ></div>
                <div 
                  className="particle-right delay-1"
                  style={{ 
                    backgroundColor: themeColors?.lightVibrant || '#f87171',
                    boxShadow: `0 0 10px ${themeColors?.lightVibrant || '#f87171'}`
                  }}
                ></div>
                <div 
                  className="particle-right delay-2"
                  style={{ 
                    backgroundColor: themeColors?.muted || '#fca5a5',
                    boxShadow: `0 0 10px ${themeColors?.muted || '#fca5a5'}`
                  }}
                ></div>
              </div>
            </div>

            {/* Center - Admin Panel Icon */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-lg flex items-center justify-center z-20 pulse-glow"
              style={{ 
                backgroundColor: themeColors?.darkVibrant || '#dc2626',
                boxShadow: `0 0 30px ${themeColors?.darkVibrant || '#dc2626'}80`
              }}
            >
              <svg 
                width="28" 
                height="28" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>

            {/* OrderZap Logo */}
            <div className="relative">
              <img
                src="/assets/logos/s-logo-sq.webp"
                alt="OrderZap"
                className="w-20 h-20 rounded-xl object-cover relative z-10"
              />
              
              {/* Data particles from right logo */}
              <div className="absolute top-1/2 right-full w-32 h-1 -translate-y-1/2 overflow-visible">
                <div 
                  className="particle-left"
                  style={{ 
                    backgroundColor: '#dc2626',
                    boxShadow: '0 0 10px #dc2626'
                  }}
                ></div>
                <div 
                  className="particle-left delay-1"
                  style={{ 
                    backgroundColor: '#f87171',
                    boxShadow: '0 0 10px #f87171'
                  }}
                ></div>
                <div 
                  className="particle-left delay-2"
                  style={{ 
                    backgroundColor: '#fca5a5',
                    boxShadow: '0 0 10px #fca5a5'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Spinner */}
          <div className="mb-4">
            <Loader2 
              size={32} 
              className="animate-spin mx-auto"
              style={{ color: themeColors?.darkVibrant || '#dc2626' }}
            />
          </div>

          {/* Text */}
          <h3 
            className="text-xl font-semibold mb-2"
            style={{ color: themeColors?.darkVibrant || '#111827' }}
          >
            Creating your restaurant
          </h3>
          <p className="text-gray-500 text-sm">
            This will only take a moment...
          </p>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes shoot-right {
            0% {
              transform: translateX(0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translateX(120px) scale(0.3);
              opacity: 0;
            }
          }
          
          @keyframes shoot-left {
            0% {
              transform: translateX(0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translateX(-120px) scale(0.3);
              opacity: 0;
            }
          }
          
          @keyframes pulse-glow {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.15);
              opacity: 0.85;
            }
          }
          
          .particle-right {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: shoot-right 1.5s ease-in infinite;
            left: 0;
          }
          
          .particle-left {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: shoot-left 1.5s ease-in infinite;
            right: 0;
          }
          
          .delay-1 {
            animation-delay: 0.3s;
            top: -10px;
          }
          
          .delay-2 {
            animation-delay: 0.6s;
            top: 10px;
          }
          
          .pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

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
    <div 
      className={`min-h-screen flex items-center justify-center px-4 transition-all duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      style={{
        background: themeColors 
          ? `linear-gradient(to bottom right, ${themeColors.lightVibrant}20, ${themeColors.dominant}10)`
          : 'linear-gradient(to bottom right, rgb(254 242 242), white)'
      }}
    >
      <div className={`w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 transition-all duration-500 ${isTransitioning ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>

        {/* Header */}
        <h1 
          className="text-2xl font-bold text-center transition-colors duration-500"
          style={{ color: themeColors?.darkVibrant || '#111827' }}
        >
          Create Your Restaurant
        </h1>
        <p className="text-center text-gray-500 text-sm mt-1">
          Setup your restaurant in 60 seconds
        </p>

        {/* Logo Upload */}
        <div className="mt-6 flex flex-col items-center">
          <label className="cursor-pointer group">
            <div 
              className="w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden group-hover:scale-105 transition-all relative"
              style={{
                borderColor: themeColors?.darkVibrant || '#f87171',
                backgroundColor: themeColors ? `${themeColors.lightVibrant}20` : '#fef2f2'
              }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <Store 
                    size={32} 
                    className="mb-1 transition-colors"
                    style={{ color: themeColors?.darkVibrant || '#ef4444' }}
                  />
                  <span 
                    className="text-xs text-center px-2 transition-colors"
                    style={{ color: themeColors?.darkVibrant || '#ef4444' }}
                  >
                    Upload Logo
                  </span>
                </div>
              )}
              
              {/* Extracting colors overlay */}
              {extractingColors && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 
                      size={24} 
                      className="animate-spin mx-auto mb-1"
                      style={{ color: themeColors?.darkVibrant || '#ef4444' }}
                    />
                    <span 
                      className="text-xs"
                      style={{ color: themeColors?.darkVibrant || '#dc2626' }}
                    >
                      Extracting colors...
                    </span>
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

          {/* OR divider */}
     

          {/* Logo URL Input */}
     

          {/* Theme colors preview */}
          {themeColors && !extractingColors && (
            <div className="mt- p-3 w-full max-w-xs animate-fade-in">
             
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
            
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* Restaurant Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Restaurant Name <span style={{ color: themeColors?.darkVibrant || '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <Store size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Changu Mangu"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-white transition-all"
                style={{
                  '--tw-ring-color': themeColors?.darkVibrant || '#f87171'
                }}
                required
              />
            </div>
            {formData.name && (
              <p className="text-xs mt-1 text-gray-500">
                Your URL: <span className="font-semibold" style={{ color: themeColors?.darkVibrant || '#ef4444' }}>
                  orderzap.in/r/{generateRestaurantId(formData.name) || 'your-restaurant'}
                </span>
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Phone Number <span style={{ color: themeColors?.darkVibrant || '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {/* Locked country code */}
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-700 font-medium pointer-events-none">
                +91
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="98765 43210"
                className="w-full pl-20 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent outline-none bg-white transition-all"
                style={{
                  '--tw-ring-color': themeColors?.darkVibrant || '#f87171'
                }}
                maxLength={10}
                required
              />
            </div>
            {formData.phone && (
              <p className="text-xs mt-1 text-gray-500">
                Full number: <span className="font-semibold">+91 {formData.phone}</span>
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3  border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 text-white py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              backgroundColor: themeColors?.darkVibrant || '#dc2626',
              boxShadow: themeColors ? `0 4px 14px ${themeColors.darkVibrant}40` : '0 4px 14px rgba(220, 38, 38, 0.25)'
            }}
            onMouseEnter={(e) => {
              if (!loading && themeColors) {
                e.currentTarget.style.backgroundColor = themeColors.dominant;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && themeColors) {
                e.currentTarget.style.backgroundColor = themeColors.darkVibrant;
              }
            }}
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
