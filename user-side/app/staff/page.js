'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useBranding } from '@/lib/useBranding';

export default function StaffLoginPage() {
  const router = useRouter();
  const { brandName, isLoading: brandingLoading } = useBranding();
  const staff = useQuery(api.staff.listActive);
  const setOnline = useMutation(api.staff.setOnline);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!staff) return;

    // Find staff by name (case insensitive) and phone
    const found = staff.find(
      s => s.name.toLowerCase() === name.toLowerCase().trim() && s.phone === phone.trim()
    );

    if (found) {
      // Set staff as online
      await setOnline({ id: found._id });
      
      // Store in sessionStorage with login date
      const today = new Date().toDateString();
      sessionStorage.setItem('staff-auth', JSON.stringify({ 
        id: found._id, 
        name: found.name,
        loginDate: today 
      }));
      router.push(`/staff/${found._id}`);
    } else {
      setError('Invalid name or phone number');
    }
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
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 mx-auto mb-3 flex items-center justify-center text-xl">
            👤
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">STAFF LOGIN</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-0.5">{brandName}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-3 text-white text-sm focus:border-zinc-600 outline-none rounded"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
              Phone (Password)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-3 text-white text-sm focus:border-zinc-600 outline-none rounded"
              placeholder="Your phone number"
              autoComplete="tel"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center py-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={!staff}
            className="w-full py-3.5 bg-white text-black text-xs font-bold uppercase tracking-wide active:bg-zinc-300 transition-colors disabled:opacity-50 rounded"
          >
            {staff ? 'Login' : 'Loading...'}
          </button>
        </form>

        <p className="text-center text-zinc-700 text-[10px] mt-4">
          Auto-logout at midnight
        </p>
      </div>
    </div>
  );
}
