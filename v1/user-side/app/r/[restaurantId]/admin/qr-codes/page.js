"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function QRCodesPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const tables = useQuery(api.tables.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
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
    const authUrl = `${baseUrl}r/${restaurantId}/a/${tableNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(authUrl)}&bgcolor=09090b&color=ffffff`;
  };

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">QR Codes</h1>
          <p className="text-slate-600 text-xs">Print for tables</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${showSettings ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          Settings
        </button>
      </div>

      {showSettings && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <label className="block text-[10px] text-slate-600 font-semibold mb-2">Base URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={baseUrl} 
              onChange={(e) => setBaseUrl(e.target.value)} 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
              placeholder="https://your-domain.com/" 
            />
            <button
              onClick={handleSaveBaseUrl}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">QR codes will link to: {baseUrl}r/{restaurantId}/a/[table-number]</p>
          <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
            {settings?.baseUrl ? '✓ Saved in database' : '⚠ Auto-detected (not saved)'}
          </p>
        </div>
      )}

      {!tables ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading...</div>
      ) : tables.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">No tables. Seed database first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table._id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-slate-900">{table.name}</h3>
                <span className="text-[10px] text-slate-500">#{table.number}</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3">
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
                  className="flex-1 text-center bg-slate-100 text-slate-700 py-2 text-[10px] font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Download
                </a>
                <Link 
                  href={`/r/${restaurantId}/a/${table.number}`} 
                  target="_blank" 
                  className="flex-1 text-center bg-emerald-500 text-white py-2 text-[10px] font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Test →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
