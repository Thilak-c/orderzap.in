'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const roles = ['Waiter', 'Manager', 'Host', 'Bartender', 'Runner'];

export default function StaffPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Get restaurant database ID
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const staff = useQuery(api.staff.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const tables = useQuery(api.tables.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const createStaff = useMutation(api.staff.create);
  const updateStaff = useMutation(api.staff.update);
  const toggleActive = useMutation(api.staff.toggleActive);
  const removeStaff = useMutation(api.staff.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'Waiter', phone: '', assignedTables: [] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !restaurantDbId) return;

    if (editingId) {
      await updateStaff({ id: editingId, ...form });
    } else {
      await createStaff({ restaurantId: restaurantDbId, ...form });
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', role: 'Waiter', phone: '', assignedTables: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (s) => {
    setForm({ name: s.name, role: s.role, phone: s.phone || '', assignedTables: s.assignedTables });
    setEditingId(s._id);
    setShowForm(true);
  };

  const toggleTable = (num) => {
    setForm(prev => ({
      ...prev,
      assignedTables: prev.assignedTables.includes(num)
        ? prev.assignedTables.filter(t => t !== num)
        : [...prev.assignedTables, num].sort((a, b) => a - b)
    }));
  };

  // Get all assigned tables to show conflicts
  const assignedTablesMap = {};
  staff?.forEach(s => {
    s.assignedTables.forEach(t => {
      if (!assignedTablesMap[t]) assignedTablesMap[t] = [];
      assignedTablesMap[t].push(s.name);
    });
  });

  if (!staff || !tables) {
    return <div className="p-6 text-slate-500">LOADING...</div>;
  }

  const activeStaff = staff.filter(s => s.active);
  const inactiveStaff = staff.filter(s => !s.active);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff</h1>
          <p className="text-slate-600 text-xs uppercase tracking-widest">Manage staff & table assignments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-colors rounded-xl"
        >
          + Add Staff
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
            {editingId ? 'Edit Staff' : 'Add New Staff'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 rounded-xl"
                  placeholder="Staff name"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 rounded-xl"
                >
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 rounded-xl"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-2">
                Assigned Tables ({form.assignedTables.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {tables.map(t => {
                  const isSelected = form.assignedTables.includes(t.number);
                  const assignedTo = assignedTablesMap[t.number]?.filter(n => editingId ? !staff.find(s => s._id === editingId && s.name === n) : true);
                  const hasConflict = assignedTo?.length > 0 && !isSelected;
                  
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggleTable(t.number)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : hasConflict
                          ? 'bg-amber-50 border border-amber-300 text-amber-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      title={hasConflict ? `Assigned to: ${assignedTo.join(', ')}` : ''}
                    >
                      {t.number}
                    </button>
                  );
                })}
              </div>
              {form.assignedTables.length > 0 && (
                <p className="text-slate-500 text-xs mt-2">
                  Tables: {form.assignedTables.join(', ')}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wide hover:bg-slate-800 rounded-xl"
              >
                {editingId ? 'Update' : 'Add Staff'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Staff */}
      <div className="mb-8">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">Active Staff ({activeStaff.length})</h2>
        {activeStaff.length === 0 ? (
          <p className="text-slate-600 text-sm">No active staff members</p>
        ) : (
          <div className="grid gap-3">
            {activeStaff.map(s => (
              <div key={s._id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 rounded-xl relative">
                    {s.name.charAt(0).toUpperCase()}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${s.isOnline === true ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 font-medium">{s.name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.isOnline === true ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {s.isOnline === true ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs">{s.role} {s.phone && `• ${s.phone}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Tables</p>
                    <p className="text-slate-900 text-sm font-mono">
                      {s.assignedTables.length > 0 ? s.assignedTables.join(', ') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/r/${restaurantId}/admin/staff/${s._id}`}
                      className="px-2 py-1 text-[10px] bg-slate-900 text-white font-bold uppercase tracking-wide hover:bg-slate-800 rounded-lg"
                    >
                      Portal
                    </Link>
                    <button
                      onClick={() => handleEdit(s)}
                      className="px-2 py-1 text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 uppercase tracking-wide rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive({ id: s._id })}
                      className="px-2 py-1 text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 uppercase tracking-wide rounded-lg"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => removeStaff({ id: s._id })}
                      className="px-2 py-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 uppercase tracking-wide rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Staff */}
      {inactiveStaff.length > 0 && (
        <div>
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">Inactive ({inactiveStaff.length})</h2>
          <div className="grid gap-2">
            {inactiveStaff.map(s => (
              <div key={s._id} className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between rounded-xl opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 rounded-lg">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">{s.name}</p>
                    <p className="text-slate-500 text-xs">{s.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleActive({ id: s._id })}
                    className="px-2 py-1 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 uppercase tracking-wide rounded-lg"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => removeStaff({ id: s._id })}
                    className="px-2 py-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 uppercase tracking-wide rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Assignment Overview */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">Table Assignment Overview</h2>
        <div className="grid grid-cols-6 gap-2">
          {tables.map(t => {
            const assigned = staff.filter(s => s.active && s.assignedTables.includes(t.number));
            return (
              <div 
                key={t._id} 
                className={`p-2 text-center border rounded-xl ${
                  assigned.length === 0 
                    ? 'bg-slate-50 border-slate-200 text-slate-500' 
                    : assigned.length > 1
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                <p className="text-lg font-mono font-bold">{t.number}</p>
                <p className="text-[9px] truncate">
                  {assigned.length === 0 ? 'Unassigned' : assigned.map(s => s.name).join(', ')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
