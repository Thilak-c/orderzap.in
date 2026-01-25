'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const roles = ['Waiter', 'Manager', 'Host', 'Bartender', 'Runner'];

export default function StaffPage() {
  const staff = useQuery(api.staff.list);
  const tables = useQuery(api.tables.list);
  const createStaff = useMutation(api.staff.create);
  const updateStaff = useMutation(api.staff.update);
  const toggleActive = useMutation(api.staff.toggleActive);
  const removeStaff = useMutation(api.staff.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'Waiter', phone: '', assignedTables: [] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      await updateStaff({ id: editingId, ...form });
    } else {
      await createStaff(form);
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
    return <div className="p-6 text-zinc-500">LOADING...</div>;
  }

  const activeStaff = staff.filter(s => s.active);
  const inactiveStaff = staff.filter(s => !s.active);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">STAFF</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Manage staff & table assignments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-zinc-200 transition-colors"
        >
          + Add Staff
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-zinc-900 border border-zinc-800 p-4">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">
            {editingId ? 'Edit Staff' : 'Add New Staff'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
                  placeholder="Staff name"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
                >
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wide mb-2">
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
                      className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                        isSelected
                          ? 'bg-white text-black'
                          : hasConflict
                          ? 'bg-zinc-800 border border-amber-500/50 text-amber-500'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                      title={hasConflict ? `Assigned to: ${assignedTo.join(', ')}` : ''}
                    >
                      {t.number}
                    </button>
                  );
                })}
              </div>
              {form.assignedTables.length > 0 && (
                <p className="text-zinc-500 text-xs mt-2">
                  Tables: {form.assignedTables.join(', ')}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-zinc-200"
              >
                {editingId ? 'Update' : 'Add Staff'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Staff */}
      <div className="mb-8">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Active Staff ({activeStaff.length})</h2>
        {activeStaff.length === 0 ? (
          <p className="text-zinc-600 text-sm">No active staff members</p>
        ) : (
          <div className="grid gap-3">
            {activeStaff.map(s => (
              <div key={s._id} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center text-lg relative">
                    {s.name.charAt(0).toUpperCase()}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${s.isOnline === true ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{s.name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 ${s.isOnline === true ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-500'}`}>
                        {s.isOnline === true ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs">{s.role} {s.phone && `• ${s.phone}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Tables</p>
                    <p className="text-white text-sm font-mono">
                      {s.assignedTables.length > 0 ? s.assignedTables.join(', ') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/admin/staff/${s._id}`}
                      className="px-2 py-1 text-[10px] bg-white text-black font-bold uppercase tracking-wide hover:bg-zinc-200"
                    >
                      Portal
                    </Link>
                    <button
                      onClick={() => handleEdit(s)}
                      className="px-2 py-1 text-[10px] bg-zinc-800 text-zinc-400 hover:text-white uppercase tracking-wide"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive({ id: s._id })}
                      className="px-2 py-1 text-[10px] bg-zinc-800 text-amber-500 hover:text-amber-400 uppercase tracking-wide"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => removeStaff({ id: s._id })}
                      className="px-2 py-1 text-[10px] bg-zinc-800 text-red-500 hover:text-red-400 uppercase tracking-wide"
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
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Inactive ({inactiveStaff.length})</h2>
          <div className="grid gap-2">
            {inactiveStaff.map(s => (
              <div key={s._id} className="bg-zinc-900/50 border border-zinc-800/50 p-3 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-sm">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">{s.name}</p>
                    <p className="text-zinc-600 text-xs">{s.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleActive({ id: s._id })}
                    className="px-2 py-1 text-[10px] bg-zinc-800 text-green-500 hover:text-green-400 uppercase tracking-wide"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => removeStaff({ id: s._id })}
                    className="px-2 py-1 text-[10px] bg-zinc-800 text-red-500 hover:text-red-400 uppercase tracking-wide"
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
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Table Assignment Overview</h2>
        <div className="grid grid-cols-6 gap-2">
          {tables.map(t => {
            const assigned = staff.filter(s => s.active && s.assignedTables.includes(t.number));
            return (
              <div 
                key={t._id} 
                className={`p-2 text-center border ${
                  assigned.length === 0 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-600' 
                    : assigned.length > 1
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    : 'bg-zinc-900 border-zinc-700 text-white'
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
