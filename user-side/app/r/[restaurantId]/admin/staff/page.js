"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, User, Phone, Mail, DollarSign, Calendar, MapPin, X, AlertCircle } from "lucide-react";
import { useRouteProtection } from "@/lib/useRouteProtection";

export default function StaffManagementPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId;
  
  // Route protection - only Owner can access Staff Management
  const { authUser, isAuthorized, isChecking } = useRouteProtection(restaurantId, ['Owner']);

  // If not owner, show access denied message
  if (!isChecking && !isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-black mb-3 uppercase">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access Staff Management. Only owners can manage staff members.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to Orders page...
          </p>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking permissions...</div>
      </div>
    );
  }
  
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  const staff = useQuery(api.staffManagement.listStaff, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const createStaff = useMutation(api.staffManagement.createStaff);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "Waiter",
    phone: "",
    email: "",
    password: "",
    assignedTables: [],
    salary: "",
    salaryType: "monthly",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!restaurantDbId) return;

    try {
      await createStaff({
        restaurantId: restaurantDbId,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password, // In production, hash this
        assignedTables: formData.assignedTables,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        salaryType: formData.salaryType,
      });

      setShowAddModal(false);
      setFormData({
        name: "",
        role: "Waiter",
        phone: "",
        email: "",
        password: "",
        assignedTables: [],
        salary: "",
        salaryType: "monthly",
      });
    } catch (error) {
      alert("Error creating staff: " + error.message);
    }
  };

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-wide">Staff Management</h1>
            <p className="text-sm text-gray-600 mt-1">{staff.length} team members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
          >
            <Plus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <div
            key={member._id}
            className="border-2 border-gray-200 p-4 hover:border-black transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-lg font-bold">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-black">{member.name}</h3>
                  <p className="text-xs text-gray-600 uppercase">{member.role}</p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>

            <div className="space-y-2 text-sm">
              {member.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.salary && (
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign size={14} />
                  <span>₹{member.salary}/{member.salaryType}</span>
                </div>
              )}
              {member.assignedTables.length > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} />
                  <span>Tables: {member.assignedTables.join(", ")}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {member.totalOrdersServed || 0} orders served
              </span>
              <span className={`px-2 py-1 ${member.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {member.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {staff.length === 0 && (
        <div className="max-w-6xl mx-auto text-center py-20">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-2">No staff members yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add your first team member to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-black text-white text-sm font-bold uppercase"
          >
            Add Staff Member
          </button>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold uppercase">Add Staff Member</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 focus:border-black outline-none"
                  >
                    <option value="Waiter">Waiter</option>
                    <option value="Manager">Manager</option>
                    <option value="Chef">Chef</option>
                    <option value="Host">Host</option>
                    <option value="Cleaner">Cleaner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 focus:border-black outline-none"
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 focus:border-black outline-none"
                    placeholder="Login password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                    Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 focus:border-black outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-sm font-bold uppercase hover:border-black"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-black text-white text-sm font-bold uppercase hover:bg-gray-800"
                  >
                    Add Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
