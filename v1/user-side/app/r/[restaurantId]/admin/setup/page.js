"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { User, Phone, Lock, Mail } from "lucide-react";

export default function AdminSetupPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  const staff = useQuery(api.staffManagement.listStaff, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const createStaff = useMutation(api.staffManagement.createStaff);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if owner already exists
  const ownerExists = staff?.some(s => s.role === "Owner");

  // Redirect to login if owner already exists
  if (ownerExists) {
    router.push(`/r/${restaurantId}/admin/login`);
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!restaurantDbId) {
      setError("Restaurant not found");
      return;
    }

    setLoading(true);

    try {
      const staffId = await createStaff({
        restaurantId: restaurantDbId,
        name: formData.name,
        role: "Owner",
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password, // In production, hash this
        assignedTables: [], // Owner has access to all tables
        salary: undefined,
        salaryType: "monthly",
      });

      // Auto-login the owner
      localStorage.setItem("adminAuth", JSON.stringify({
        staffId: staffId,
        name: formData.name,
        role: "Owner",
        restaurantId: restaurantDbId,
        loginTime: Date.now(),
      }));

      // Redirect to admin dashboard
      router.push(`/r/${restaurantId}/admin`);
    } catch (err) {
      setError(err.message || "Failed to create owner account");
    } finally {
      setLoading(false);
    }
  };

  if (staff === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {restaurant?.id ? (
            <img
              src={`/api/logo/${restaurant.id}/full_logo.webp`}
              alt="Logo"
              className="h-20 mx-auto mb-4 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-20 h-20 bg-black text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4 border-2 border-black"
            style={{ display: restaurant?.id ? 'none' : 'flex' }}
          >
            {restaurant?.brandName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">Setup Admin</h1>
          <p className="text-sm text-gray-600">{restaurant?.brandName || restaurant?.name || 'Restaurant'}</p>
          <p className="text-xs text-gray-500 mt-2">Create the first owner account</p>
        </div>

        {/* Setup Form */}
        <div className="border-2 border-black p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-500 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Email (Optional)
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-black outline-none"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white font-bold uppercase hover:bg-gray-800 disabled:bg-gray-400 transition-all border-2 border-black"
            >
              {loading ? "Creating Account..." : "Create Owner Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="text-xs text-gray-500 space-y-2">
              <p>✓ This will be the main admin account</p>
              <p>✓ You can add managers and staff later</p>
              <p>✓ Keep your credentials safe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
