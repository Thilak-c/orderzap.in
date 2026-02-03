'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function StaffLoginPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params?.restaurantId;

  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  const staff = useQuery(api.staff.listActive, restaurantDbId ? { restaurantId: restaurantDbId } : 'skip');
  const setOnline = useMutation(api.staff.setOnline);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!staff || !restaurantId) return;

    const found = staff.find(
      (s) => s.name.toLowerCase() === name.toLowerCase().trim() && s.phone === phone.trim()
    );

    if (found) {
      await setOnline({ id: found._id });
      const today = new Date().toDateString();
      sessionStorage.setItem('staff-auth', JSON.stringify({
        id: found._id,
        name: found.name,
        loginDate: today,
      }));
      router.push(`/r/${restaurantId}/admin/staff/${found._id}`);
    } else {
      setError('Invalid name or phone number');
    }
  };

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-500 text-sm">Invalid link</p>
      </div>
    );
  }

  if (restaurant === undefined || staff === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  const brandName = restaurant?.name || restaurant?.brandName || 'Restaurant';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl shadow-sm">
            👤
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Login</h1>
          <p className="text-slate-500 text-xs mt-0.5">{brandName}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-3 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">Phone (password)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError('');
              }}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-3 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              placeholder="Your phone number"
              autoComplete="tel"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center py-1">{error}</p>}

          <button
            type="submit"
            disabled={!staff || staff.length === 0}
            className="w-full py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {staff && staff.length > 0 ? 'Login' : 'No staff configured'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-4">Auto-logout at midnight</p>

        <div className="mt-6 text-center">
          <Link
            href={`/r/${restaurantId}`}
            className="text-slate-500 text-sm hover:text-slate-700 font-medium"
          >
            ← Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
}
