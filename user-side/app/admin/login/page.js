"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Phone, Lock, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: restaurant name, 2: phone number

  // Get restaurant data when restaurant ID is entered
  const restaurant = useQuery(
    api.restaurants.getByShortId,
    restaurantId && step === 2 ? { id: restaurantId } : "skip"
  );

  // Theme colors
  const themeColors = restaurant?.themeColors;
  const darkColor = themeColors?.darkVibrant || '#dc2626'; // Default red
  const lightColor = themeColors?.lightVibrant || '#ef4444'; // Default light red
  const brandLogo = restaurant?.logo_url;
  const brandName = restaurant?.name || "Restaurant";

  const handleRestaurantSubmit = (e) => {
    e.preventDefault();
    if (!restaurantId.trim()) {
      setError("Please enter restaurant name");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    // Check if restaurant exists
    if (!restaurant) {
      setError("Restaurant not found");
      setLoading(false);
      return;
    }

    // Check if phone matches restaurant admin phone
    const adminPhone = restaurant.adminPhone || restaurant.phone;
    const enteredPhone = `+91${phone}`;
    
    if (adminPhone && enteredPhone === adminPhone) {
      // Store auth in sessionStorage
      sessionStorage.setItem("admin-auth", "true");
      sessionStorage.setItem("admin-restaurant", restaurantId);
      
      // Redirect to restaurant admin dashboard
      router.push(`/r/${restaurantId}/admin`);
    } else {
      setError("Invalid phone number for this restaurant");
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setPhone("");
    setError("");
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 transition-all duration-500"
      style={{ 
        backgroundColor: step === 2 && restaurant ? lightColor : '#dc2626' // Default red background
      }}
    >
      <div className="w-full max-w-md">
        <div 
          className="backdrop-blur-xl rounded-2xl p-8 shadow-2xl transition-all duration-500"
          style={{
            backgroundColor: step === 2 && restaurant ? darkColor : '#b91c1c', // Default dark red
            border: `1px solid rgba(255,255,255,0.2)`
          }}
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            {step === 2 && brandLogo ? (
              <div className="flex items-center justify-center mb-4 animate-scale-in">
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="h-20 w-20 rounded-full object-cover border-2 border-white/20"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center mb-4">
                <img
                  src="/assets/logos/orderzap-logo.png"
                  alt="OrderZap"
                  className="h-12 w-auto"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 2 && restaurant ? brandName : "Restaurant Admin"}
            </h1>
            <p className="text-white/60 text-sm">
              {step === 1 ? "Enter your restaurant name to continue" : "Verify your phone number"}
            </p>
          </div>

          {/* Step 1: Restaurant Name */}
          {step === 1 && (
            <form onSubmit={handleRestaurantSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Restaurant Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-white/40" />
                  </div>
                  <input
                    type="text"
                    value={restaurantId}
                    onChange={(e) => {
                      // Convert to lowercase and replace spaces with hyphens
                      const formatted = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, ''); // Remove special characters except hyphens
                      setRestaurantId(formatted);
                      setError("");
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:border-white/40 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all"
                    placeholder="e.g., Changu Mangu"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">
                  Type your restaurant name (e.g., "Changu Mangu" → "changu-mangu")
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 animate-scale-in">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* Step 2: Phone Number */}
          {step === 2 && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Admin Phone Number
                </label>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: lightColor, border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div className="pl-4 pr-3 py-3 flex items-center border-r" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Phone size={18} className="text-white/80 mr-2" />
                    <span className="text-white/80 text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setError("");
                    }}
                    className="flex-1 bg-transparent px-4 py-3 text-white placeholder-white/50 focus:outline-none"
                    placeholder="10 digit number"
                    maxLength={10}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">
                  Enter the phone number registered with this restaurant
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 animate-scale-in">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Login
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <Link
              href="/"
              className="block text-sm text-white/60 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
            <Link
              href="/signup"
              className="block text-sm text-white/80 hover:text-white transition-colors"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
