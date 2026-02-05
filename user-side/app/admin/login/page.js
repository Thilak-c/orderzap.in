"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const restaurants = useQuery(api.restaurants.list);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      // Demo credentials
      if (username === "admin" && password === "admin123") {
        sessionStorage.setItem("admin-auth", "true");
        
        if (selectedRestaurant) {
          router.push(`/r/${selectedRestaurant}/admin`);
        } else {
          router.push("/demo/admin");
        }
      } else {
        setError("Invalid credentials");
      }
      setLoading(false);
    }, 500);
  };

  const isLoading = restaurants === undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Image
                src="/assets/logos/logo_full.png"
                alt="OrderZap"
                width={180}
                height={50}
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Restaurant Login</h1>
            <p className="text-gray-400 text-sm">Access your restaurant dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Restaurant Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Restaurant
              </label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
              >
                <option value="" className="bg-gray-900">Demo Restaurant</option>
                {restaurants?.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id} className="bg-gray-900">
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                placeholder="Enter username"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                placeholder="Enter password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-xs text-center font-medium">
              Demo Credentials: admin / admin123
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <Link
              href="/"
              className="block text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
            <Link
              href="/signup"
              className="block text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
