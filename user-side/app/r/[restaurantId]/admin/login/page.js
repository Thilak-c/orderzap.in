"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ADMIN_ID = "admin";
const ADMIN_PASS = "admin123";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  const settings = useQuery(api.settings.getAll);
  const logoUrl = useQuery(
    api.files.getUrl,
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const brandName = settings?.brandName || "BTS DISC";
  const brandLogo = logoUrl || settings?.brandLogo || "/assets/logos/favicon_io/android-chrome-192x192.png";
  const brandingLoading = settings === undefined;

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (username === ADMIN_ID && password === ADMIN_PASS) {
        sessionStorage.setItem("admin-auth", "true");
        router.push(`/r/${restaurantId}/admin`);
      } else {
        setError("Invalid credentials");
      }
      setLoading(false);
    }, 500);
  };

  if (brandingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={brandLogo} alt={brandName} className="h-10 w-10 rounded-full object-contain" />
              <div className="text-left">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{brandName}</h1>
                <p className="text-[10px] text-slate-600 font-semibold">Admin Login</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-600 font-semibold mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                placeholder="Username" 
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-semibold mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                placeholder="Password" 
                required 
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-emerald-500 text-white py-2 text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>
          
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[10px] text-slate-600 text-center">Demo: admin / admin123</p>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <Link href={`/r/${restaurantId}`} className="text-[10px] text-slate-600 hover:text-slate-900 font-semibold">
            ← Customer View
          </Link>
        </div>
      </div>
    </div>
  );
}
