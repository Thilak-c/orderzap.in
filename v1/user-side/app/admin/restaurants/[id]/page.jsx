"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdmin } from "@/lib/AdminContext";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";

export default function RestaurantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneDescription, setNewZoneDescription] = useState("");
  const [addingZone, setAddingZone] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    phone: "",
    password: "",
    email: "",
  });
  const [creatingOwner, setCreatingOwner] = useState(false);
  const { adminUser } = useAdmin();

  const restaurantDetails = useQuery(api.admin.getRestaurantDetails, {
    restaurantId: params.id,
  });
  // ALWAYS use restaurant.id (short ID) - never fall back to database ID
  const restaurantId = restaurantDetails?.restaurant?.id;
  const tables = useQuery(api.tables.list, restaurantId ? { restaurantId } : "skip");
  const zones = useQuery(api.zones.list, restaurantId ? { restaurantId } : "skip");
  const staff = useQuery(api.staff.list, restaurantId ? { restaurantId } : "skip");
  const menuItems = useQuery(api.menuItems.list, restaurantId ? { restaurantId } : "skip");
  const orders = useQuery(api.orders.list, restaurantId ? { restaurantId } : "skip");
  const updateStatus = useMutation(api.admin.updateRestaurantStatus);
  const createZone = useMutation(api.zones.create);
  const removeZone = useMutation(api.zones.remove);
  const createOwnerAccount = useMutation(api.adminStaff.createOwnerAccount);

  const handleStatusToggle = async () => {
    if (!restaurantDetails?.restaurant) return;

    const nextStatus =
      restaurantDetails.restaurant.status === "active" ? "blocked" : "active";

    try {
      await updateStatus({
        restaurantId: restaurantDetails.restaurant._id,
        status: nextStatus,
        reason:
          nextStatus === "blocked"
            ? "Manually blocked by admin"
            : "Manually unblocked by admin",
        adminEmail: adminUser?.email || "admin@orderzap.com",
      });
    } catch (error) {
      alert("Failed to update restaurant status");
    }
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim() || !restaurantId) return;

    setAddingZone(true);
    try {
      await createZone({
        restaurantId,
        name: newZoneName.trim(),
        description: newZoneDescription.trim() || "",
      });
      setNewZoneName("");
      setNewZoneDescription("");
    } catch (error) {
      alert(error.message || "Failed to add zone");
    } finally {
      setAddingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;

    try {
      await removeZone({ id: zoneId });
    } catch (error) {
      alert(error.message || "Failed to delete zone");
    }
  };

  const handleCreateOwner = async (e) => {
    e.preventDefault();
    if (!restaurantDetails?.restaurant?._id) return;

    setCreatingOwner(true);
    try {
      await createOwnerAccount({
        restaurantId: restaurantDetails.restaurant._id,
        ownerName: ownerForm.name,
        ownerPhone: ownerForm.phone,
        ownerPassword: ownerForm.password,
        email: ownerForm.email || undefined,
      });
      setShowOwnerForm(false);
      setOwnerForm({ name: "", phone: "", password: "", email: "" });
      alert("Owner account created successfully!");
    } catch (error) {
      alert(error.message || "Failed to create owner account");
    } finally {
      setCreatingOwner(false);
    }
  };

  if (!restaurantDetails) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-neutral-600">Loading restaurant…</p>
      </div>
    );
  }

  if (!restaurantDetails.restaurant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-base font-semibold">Restaurant not found</p>
          <button
            onClick={() => router.push("/admin/restaurants")}
            className="border border-black px-3 py-1.5 text-sm rounded-sm hover:bg-black hover:text-white transition-colors"
          >
            Back to restaurants
          </button>
        </div>
      </div>
    );
  }

  const { restaurant, subscriptions, payments, daysRemaining } =
    restaurantDetails;
  const tableCount = tables ? tables.length : 0;
  const staffCount = staff ? staff.length : 0;
  const menuCount = menuItems ? menuItems.length : 0;
  const zoneCount = zones ? zones.length : 0;
  const orderCount = orders ? orders.length : 0;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="border border-black/40 rounded-sm p-1 hover:bg-black hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{restaurant.name}</h1>
              <p className="text-xs text-neutral-600">
                ID: {restaurant.id} ·{" "}
                {restaurant.status ? restaurant.status.toUpperCase() : "UNKNOWN"}
              </p>
            </div>
          </div>
          <button
            onClick={handleStatusToggle}
            className="border border-black px-3 py-1.5 text-xs rounded-sm hover:bg-black hover:text-white transition-colors"
          >
            {restaurant.status === "active" ? "Block restaurant" : "Mark active"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="border border-black/20 rounded-sm px-3 py-2">
            <p className="text-neutral-600">Days remaining</p>
            <p className="text-base font-semibold">{daysRemaining}</p>
          </div>
          <div className="border border-black/20 rounded-sm px-3 py-2">
            <p className="text-neutral-600">Total payments</p>
            <p className="text-base font-semibold">
              ₹
              {(
                payments
                  .filter((p) => p.status === "completed")
                  .reduce((sum, p) => sum + p.amount, 0) / 100
              ).toLocaleString()}
            </p>
          </div>
          <div className="border border-black/20 rounded-sm px-3 py-2">
            <p className="text-neutral-600">Subscriptions</p>
            <p className="text-base font-semibold">{subscriptions.length}</p>
          </div>
          <div className="border border-black/20 rounded-sm px-3 py-2">
            <p className="text-neutral-600">Tables</p>
            <p className="text-base font-semibold">
              {tables ? tableCount : "…"}
            </p>
          </div>
          <div className="border border-black/20 rounded-sm px-3 py-2">
            <p className="text-neutral-600">Staff</p>
            <p className="text-base font-semibold">
              {staff ? staffCount : "…"}
            </p>
          </div>
        </div>

        <div className="border-b border-black/10">
          <nav className="flex gap-4 text-xs">
            {["overview", "menu", "tables", "zones", "staff", "subscriptions", "payments", "orders"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 ${
                  activeTab === tab
                    ? "border-b border-black font-medium"
                    : "text-neutral-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-xs">Contact</p>
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>{restaurant.email || "no email set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>{restaurant.phone || "no phone set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{restaurant.address || "no address set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>
                  Created{" "}
                  {new Date(restaurant.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-xs">Basic info</p>
              <div className="flex justify-between">
                <span className="text-neutral-600">Owner</span>
                <span>{restaurant.ownerName || "not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Manager</span>
                <span>{restaurant.managerName || "not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Current status</span>
                <span>{restaurant.status || "unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Open now</span>
                <span>{restaurant.isOpen ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Zones</span>
                <span>{zones ? zoneCount : "…"}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "menu" && (
          <div className="text-xs space-y-3">
            <div className="flex justify-between">
              <p className="font-semibold">Menu items ({menuCount})</p>
            </div>
            {!menuItems && <p className="text-neutral-600">Loading menu…</p>}
            {menuItems && menuItems.length === 0 && (
              <p className="text-neutral-600">No menu items yet.</p>
            )}
            {menuItems &&
              menuItems.map((item) => {
                // Get zone names for this item
                const zoneNames = item.allowedZones && item.allowedZones.length > 0 
                  ? zones?.filter(z => item.allowedZones.includes(z._id)).map(z => z.name).join(", ")
                  : "All zones";
                
                return (
                  <div
                    key={item._id}
                    className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.name} · ₹{item.price?.toLocaleString() ?? 0}
                      </p>
                      <p className="text-neutral-600">
                        {item.category}{" "}
                        {item.available === false ? "· not available" : ""}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-neutral-600">
                      <p>{item.description}</p>
                      <p>Zone: {zoneNames}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {activeTab === "tables" && (
          <div className="text-xs space-y-3">
            <div className="flex justify-between">
              <p className="font-semibold">Tables ({tableCount})</p>
            </div>
            {!tables && <p className="text-neutral-600">Loading tables…</p>}
            {tables && tables.length === 0 && (
              <p className="text-neutral-600">No tables yet.</p>
            )}
            {tables &&
              tables.map((table) => (
                <div
                  key={table._id}
                  className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold">
                      Table {table.number} {table.name && `· ${table.name}`}
                    </p>
                    <p className="text-neutral-600">
                      Capacity {table.capacity || "-"}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-neutral-600">
                    <p>
                      Zone:{" "}
                      {table.zone?.name
                        ? table.zone.name
                        : table.zoneId
                        ? "Unknown zone"
                        : "No zone"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === "zones" && (
          <div className="text-xs space-y-3">
            <div className="flex justify-between">
              <p className="font-semibold">Zones ({zones ? zones.length : 0})</p>
              <button
                onClick={() => setShowZoneManager(true)}
                className="border border-black px-3 py-1.5 text-xs rounded-sm hover:bg-black hover:text-white transition-colors"
              >
                Manage Zones
              </button>
            </div>
            {!zones && <p className="text-neutral-600">Loading zones…</p>}
            {zones && zones.length === 0 && (
              <p className="text-neutral-600">No zones yet.</p>
            )}
            {zones &&
              zones.map((zone) => (
                <div
                  key={zone._id}
                  className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold">{zone.name}</p>
                    {zone.description && (
                      <p className="text-neutral-600">{zone.description}</p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-neutral-600">
                    <p>
                      Tables: {tables ? tables.filter(t => t.zoneId === zone._id).length : "…"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === "staff" && (
          <div className="text-xs space-y-3">
            <div className="flex justify-between">
              <p className="font-semibold">Staff ({staffCount})</p>
              {staff && !staff.some(s => s.role === "Owner") && (
                <button
                  onClick={() => setShowOwnerForm(true)}
                  className="border border-black px-3 py-1.5 text-xs rounded-sm hover:bg-black hover:text-white transition-colors"
                >
                  Add Owner Account
                </button>
              )}
            </div>
            
            {showOwnerForm && (
              <div className="border-2 border-black p-4 space-y-3">
                <h3 className="font-semibold">Create Owner Account</h3>
                <form onSubmit={handleCreateOwner} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Owner Name *</label>
                    <input
                      type="text"
                      required
                      value={ownerForm.name}
                      onChange={(e) => setOwnerForm({...ownerForm, name: e.target.value})}
                      className="w-full px-2 py-1.5 border border-black/20 rounded-sm"
                      placeholder="Enter owner name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={ownerForm.phone}
                      onChange={(e) => setOwnerForm({...ownerForm, phone: e.target.value})}
                      className="w-full px-2 py-1.5 border border-black/20 rounded-sm"
                      placeholder="+91XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={ownerForm.password}
                      onChange={(e) => setOwnerForm({...ownerForm, password: e.target.value})}
                      className="w-full px-2 py-1.5 border border-black/20 rounded-sm"
                      placeholder="Create login password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={ownerForm.email}
                      onChange={(e) => setOwnerForm({...ownerForm, email: e.target.value})}
                      className="w-full px-2 py-1.5 border border-black/20 rounded-sm"
                      placeholder="owner@email.com"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOwnerForm(false)}
                      className="flex-1 px-3 py-1.5 border border-black/20 rounded-sm hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingOwner}
                      className="flex-1 px-3 py-1.5 bg-black text-white rounded-sm hover:bg-gray-800 disabled:opacity-50"
                    >
                      {creatingOwner ? "Creating..." : "Create Owner"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {!staff && <p className="text-neutral-600">Loading staff…</p>}
            {staff && staff.length === 0 && (
              <p className="text-neutral-600">No staff added yet.</p>
            )}
            {staff &&
              staff.map((member) => (
                <div
                  key={member._id}
                  className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold">
                      {member.name} · {member.role}
                    </p>
                    <p className="text-neutral-600">
                      {member.phone || "no phone"}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-neutral-600">
                    <p>Active: {member.active ? "yes" : "no"}</p>
                    <p>Online: {member.isOnline ? "yes" : "no"}</p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="text-xs space-y-3">
            {subscriptions.length === 0 && (
              <p className="text-neutral-600">No subscriptions yet.</p>
            )}
            {subscriptions.map((sub) => (
              <div
                key={sub._id}
                className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">
                    {sub.planType} · {sub.days} days
                  </p>
                  <p className="text-neutral-600">
                    {new Date(sub.startDate).toLocaleDateString()} –{" "}
                    {new Date(sub.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p>₹{(sub.totalPrice / 100).toLocaleString()}</p>
                  <p className="text-neutral-600">{sub.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="text-xs space-y-3">
            {payments.length === 0 && (
              <p className="text-neutral-600">No payments yet.</p>
            )}
            {payments.map((payment) => (
              <div
                key={payment._id}
                className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">
                    ₹{(payment.amount / 100).toLocaleString()}
                  </p>
                  <p className="text-neutral-600">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p>{payment.status}</p>
                  <p className="text-neutral-600 text-[10px]">
                    {payment.gatewayOrderId || "no gateway id"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="text-xs space-y-3">
            <div className="flex justify-between">
              <p className="font-semibold">Orders ({orderCount})</p>
            </div>
            {!orders && <p className="text-neutral-600">Loading orders…</p>}
            {orders && orders.length === 0 && (
              <p className="text-neutral-600">No orders yet.</p>
            )}
            {orders &&
              orders.map((order) => (
                <div
                  key={order._id}
                  className="border border-black/15 rounded-sm px-3 py-2 flex justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold">
                      #{order.orderNumber || order._id} · ₹
                      {(order.total || order.totalAmount || 0).toLocaleString()}
                    </p>
                    <p className="text-neutral-600">
                      Table {order.tableId} · {order.status}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-neutral-600">
                    <p>
                      {new Date(order._creationTime).toLocaleDateString()}
                    </p>
                    <p>{order.paymentStatus}</p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Zone Manager Modal */}
        {showZoneManager && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white border-2 border-black shadow-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black">Manage Zones</h2>
                <button 
                  onClick={() => setShowZoneManager(false)} 
                  className="text-gray-600 hover:text-black text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Add New Zone */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-2">Add New Zone</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="Zone name"
                    className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={newZoneDescription}
                    onChange={(e) => setNewZoneDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
                    placeholder="Description (optional)"
                    className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-sm text-black focus:border-black focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleAddZone}
                    disabled={addingZone || !newZoneName.trim()}
                    className="w-full bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-all disabled:bg-gray-400"
                  >
                    {addingZone ? "Adding..." : "Add Zone"}
                  </button>
                </div>
              </div>

              {/* Zones List */}
              <div>
                <label className="block text-sm font-medium text-black mb-3">Your Zones</label>
                {!zones || zones.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No zones yet. Add your first zone above.</p>
                ) : (
                  <div className="space-y-2">
                    {zones.map((zone) => (
                      <div key={zone._id} className="p-3 border border-gray-200 hover:border-black transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-black">{zone.name}</span>
                          <button
                            onClick={() => handleDeleteZone(zone._id)}
                            className="text-sm text-gray-600 hover:text-black hover:underline font-medium"
                          >
                            Delete
                          </button>
                        </div>
                        {zone.description && (
                          <p className="text-xs text-gray-500">{zone.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowZoneManager(false)}
                className="w-full mt-6 bg-gray-200 text-black py-3 text-sm font-medium hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}