"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ADMIN_ID = "admin";
const ADMIN_PASS = "admin123";

export default function AdminLoginPage() {
  const router = useRouter();
  const settings = useQuery(api.settings.getAll);
  const logoUrl = useQuery(
    api.files.getUrl,
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const brandName = settings?.brandName || "OrderZap";
  const brandLogo = logoUrl || settings?.brandLogo || "/assets/logos/orderzap-logo.png";
  const brandingLoading = settings === undefined;

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (username === ADMIN_ID && password === ADMIN_PASS) {
        sessionStorage.setItem("admin-auth", "true");
        router.push("/demo/admin");
      } else {
        setError("Invalid credentials");
      }
      setLoading(false);
    }, 500);
  };

  if (brandingLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-xs">
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={brandLogo} alt={brandName} className="h-10 w-10 rounded-full object-contain" />
              <div className="text-left">
                <h1 className="text-lg font-bold text-white tracking-tight">{brandName}</h1>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Admin Login</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none" 
                placeholder="Username" 
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none" 
                placeholder="Password" 
                required 
              />
            </div>
            {error && (
              <div className="bg-red-950 border border-red-900 text-red-400 text-xs p-3">
                {error}
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-white text-black py-2 text-xs font-bold uppercase tracking-wide hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? "LOGGING IN..." : "LOGIN →"}
            </button>
          </form>
          
          <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800">
            <p className="text-[10px] text-zinc-600 text-center">Demo: admin / admin123</p>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <Link href="/" className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-wide">
            ← Customer View
          </Link>
        </div>
      </div>
    </div>
  );
}
