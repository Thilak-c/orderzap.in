"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function QRCodesPage() {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const tables = useQuery(api.tables.list);
  const [baseUrl, setBaseUrl] = useState("https://bts-club-one.vercel.app/");
  const [showSettings, setShowSettings] = useState(false);

  const getQRCodeUrl = (tableNumber) => {
    const menuUrl = `${baseUrl}/menu/${tableNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(menuUrl)}&bgcolor=09090b&color=ffffff`;
  };

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="p-6">
      <div className="mb-6 border-b border-black pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">QR CODES</h1>
          <p className="text-black text-xs uppercase tracking-widest">Print for tables</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${showSettings ? 'bg-white text-black' : 'bg-white text-black hover:bg-white hover:text-white'}`}
        >
          SETTINGS
        </button>
      </div>

      {showSettings && (
        <div className="bg-white border border-black p-4 mb-6">
          <label className="block text-[10px] text-black uppercase tracking-wide mb-2">Base URL</label>
          <input 
            type="text" 
            value={baseUrl} 
            onChange={(e) => setBaseUrl(e.target.value)} 
            className="w-full bg-white border border-black px-3 py-2 text-sm" 
            placeholder="https://your-domain.com" 
          />
          <p className="text-[10px] text-black mt-2">QR codes will link to: {baseUrl}/menu/[table-number]</p>
        </div>
      )}

      {!tables ? (
        <div className="bg-white border border-black p-8 text-center text-black">Loading...</div>
      ) : tables.length === 0 ? (
        <div className="bg-white border border-black p-8 text-center">
          <p className="text-black">No tables. Seed database first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table._id} className="bg-white border border-black p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{table.name}</h3>
                <span className="text-[10px] text-black">#{table.number}</span>
              </div>
              
              <div className="bg-white border border-black p-2 mb-3">
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
                  className="flex-1 text-center bg-white text-black py-2 text-[10px] uppercase tracking-wide hover:bg-white hover:text-white"
                >
                  DOWNLOAD
                </a>
                <Link 
                  href={`/menu/${table.number}`} 
                  target="_blank" 
                  className="flex-1 text-center bg-white text-black py-2 text-[10px] uppercase tracking-wide hover:bg-white"
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
