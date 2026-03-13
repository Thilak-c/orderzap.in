"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Phone, Lock, User } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const staffLogin = useMutation(api.staffManagement.staffLogin);
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await staffLogin({
        phone,
        password,
      });

      // Store auth info in localStorage
      localStorage.setItem("adminAuth", JSON.stringify({
        staffId: result.staff._id,
        name: result.staff.name,
        role: result.staff.role,
        restaurantId: result.staff.restaurantId,
        loginTime: Date.now(),
      }));

      // Redirect to admin dashboard
      router.push(`/r/${restaurantId}/admin`);
      router.refresh();
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
          {restaurant?.id ? (
            <img
              src={`/api/logo/${restaurant.id}/full_logo.webp`}
              alt="Logo"
              className="h-20 mx-auto mb-4 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-20 h-20 bg-black text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4 border-2 border-black"
            style={{ display: restaurant?.id ? 'none' : 'flex' }}
          >
            {restaurant?.brandName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">Admin Login</h1>
          <p className="text-sm text-gray-600">{restaurant?.brandName || restaurant?.name || 'Restaurant'}</p>
        </div>

        {/* Login Form */}
        <div className="border-2 border-black p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-500 text-sm text-red-700 font-medium">
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
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
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
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white font-bold uppercase hover:bg-gray-800 disabled:bg-gray-400 transition-all border-2 border-black"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="text-xs text-gray-500 space-y-2">
              <p className="flex items-center gap-2">
                <User size={14} />
                <span>Owner, Manager, or Staff can login</span>
              </p>
              <p className="text-gray-400">Contact your administrator if you need access</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
