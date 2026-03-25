"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Phone, Lock, MapPin } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
  const staffLogin = useMutation(api.staffManagement.staffLogin);
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState(null);

  // Get location on mount
  useState(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.log("Location error:", error);
        }
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await staffLogin({
        phone,
        password,
        location,
      });

      // Store staff info in localStorage
      localStorage.setItem("staffId", result.staff._id);
      localStorage.setItem("staffName", result.staff.name);
      localStorage.setItem("staffRole", result.staff.role);
      localStorage.setItem("restaurantId", result.staff.restaurantId);

      // Redirect to staff dashboard
      router.push(`/staff/dashboard`);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Staff Login</h1>
          <p className="text-sm text-gray-600 mt-2">Sign in to access your dashboard</p>
        </div>

        {/* Location Status */}
        {location && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-700">
            <MapPin size={16} />
            <span>Location detected</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-black outline-none"
                placeholder="+91XXXXXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-black outline-none"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white font-bold uppercase hover:bg-gray-800 disabled:bg-gray-400 transition-all"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Contact your manager if you forgot your password</p>
        </div>
      </div>
    </div>
  );
}
