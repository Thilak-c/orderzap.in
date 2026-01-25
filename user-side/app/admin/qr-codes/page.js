"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function QRCodesPage() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const tables = useQuery(api.tables.list);
  const settings = useQuery(api.settings.getAll);
  const updateSetting = useMutation(api.settings.set);
  
  // Auto-detect current domain or use saved setting
  const [baseUrl, setBaseUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize base URL
  useEffect(() => {
    if (settings?.baseUrl) {
      // Use saved setting from database
      setBaseUrl(settings.baseUrl);
    } else if (typeof window !== 'undefined' && !baseUrl) {
      // Auto-detect current domain
      const origin = window.location.origin;
      setBaseUrl(`${origin}/`);
    }
  }, [settings]);

  const handleSaveBaseUrl = async () => {
    setIsSaving(true);
    try {
      await updateSetting({ key: "baseUrl", value: baseUrl });
    } catch (error) {
      console.error("Failed to save base URL:", error);
    }
    setIsSaving(false);
  };

  const getQRCodeUrl = (tableNumber) => {
    const authUrl = `${baseUrl}a/${tableNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(authUrl)}&bgcolor=09090b&color=ffffff`;
  };

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">QR CODES</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Print for tables</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${showSettings ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
        >
          SETTINGS
        </button>
      </div>

      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-6">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Base URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={baseUrl} 
              onChange={(e) => setBaseUrl(e.target.value)} 
              className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" 
              placeholder="https://your-domain.com/" 
            />
            <button
              onClick={handleSaveBaseUrl}
              disabled={isSaving}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-zinc-200 disabled:opacity-50"
            >
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">QR codes will link to: {baseUrl}a/[table-number]</p>
          <p className="text-[10px] text-emerald-500 mt-1">
            {settings?.baseUrl ? '✓ Saved in database' : '⚠ Auto-detected (not saved)'}
          </p>
        </div>
      )}

      {!tables ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-600">Loading...</div>
      ) : tables.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
          <p className="text-zinc-600">No tables. Seed database first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table._id} className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{table.name}</h3>
                <span className="text-[10px] text-zinc-500">#{table.number}</span>
              </div>
              
              <div className="bg-zinc-950 border border-zinc-800 p-2 mb-3">
                <img 
                  src={getQRCodeUrl(table.number)} 
                  alt={`QR for ${table.name}`} 
                  className="w-full aspect-square" 
                />
              </div>
              
              <div className="flex gap-2">
                <a 
                  href={getQRCodeUrl(table.number)} 
                  download={`table-${table.number}.png`} 
                  className="flex-1 text-center bg-zinc-800 text-zinc-400 py-2 text-[10px] uppercase tracking-wide hover:bg-zinc-700 hover:text-white"
                >
                  DOWNLOAD
                </a>
                <Link 
                  href={`/a/${table.number}`} 
                  target="_blank" 
                  className="flex-1 text-center bg-white text-black py-2 text-[10px] uppercase tracking-wide hover:bg-zinc-200"
                >
                  TEST →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
