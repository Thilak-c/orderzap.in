"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MapPin, LogOut, Bell, CheckCircle, XCircle, Clock, Package, Menu, X, Calendar, ClipboardList, BarChart3 } from "lucide-react";

export default function WaiterDashboard() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId;
  
  const [waiter, setWaiter] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("orders"); // orders, attendance, stats
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [distanceFromRestaurant, setDistanceFromRestaurant] = useState(null);

  // Get restaurant data
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });

  // Get waiter data from localStorage
  useEffect(() => {
    const authData = localStorage.getItem("adminAuth");
    if (!authData) {
      router.push(`/r/${restaurantId}/admin/login`);
      return;
    }

    try {
      const parsed = JSON.parse(authData);
      if (parsed.role !== "Waiter") {
        router.push(`/r/${restaurantId}/admin/orders`);
        return;
      }
      setWaiter(parsed);
      setIsOnline(parsed.isOnline || false);
      setChecking(false);
    } catch (e) {
      router.push(`/r/${restaurantId}/admin/login`);
    }
  }, [router, restaurantId]);

  // Get location continuously
  useEffect(() => {
    if (!waiter) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        setLocation(newLocation);
        setLocationError(null);

        // Calculate distance from restaurant
        if (restaurant?.location) {
          const distance = calculateDistance(
            newLocation.latitude,
            newLocation.longitude,
            restaurant.location.latitude,
            restaurant.location.longitude
          );
          setDistanceFromRestaurant(distance);
        }

        // Update location in database
        if (waiter.staffId) {
          updateLocation({
            staffId: waiter.staffId,
            location: newLocation,
          });
        }
      },
      (error) => {
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [waiter, restaurant]);

  // Haversine formula to calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const updateLocation = useMutation(api.staffManagement.updateStaffLocation);
  const toggleOnlineStatus = useMutation(api.staffManagement.toggleWaiterOnlineStatus);
  const acceptOrder = useMutation(api.staffManagement.acceptOrderAssignment);
  const rejectOrder = useMutation(api.staffManagement.rejectOrderAssignment);
  const staffLogout = useMutation(api.staffManagement.staffLogout);

  // Get assigned orders (pending acceptance)
  const pendingOrders = useQuery(
    api.staffManagement.getWaiterPendingOrders,
    waiter?.staffId ? { waiterId: waiter.staffId } : "skip"
  );

  // Get accepted orders
  const activeOrders = useQuery(
    api.staffManagement.getWaiterActiveOrders,
    waiter?.staffId ? { waiterId: waiter.staffId } : "skip"
  );

  const handleToggleOnline = async () => {
    if (!waiter?.staffId || !location) return;

    try {
      const result = await toggleOnlineStatus({
        staffId: waiter.staffId,
        location: location,
      });

      setIsOnline(result.isOnline);
      
      // Update localStorage
      const authData = JSON.parse(localStorage.getItem("adminAuth"));
      authData.isOnline = result.isOnline;
      authData.isInRestaurant = result.isInRestaurant;
      localStorage.setItem("adminAuth", JSON.stringify(authData));

      // Vibrate on toggle
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (!waiter?.staffId) return;

    try {
      await acceptOrder({
        orderId: orderId,
        waiterId: waiter.staffId,
      });

      // Vibrate on accept
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRejectOrder = async (orderId) => {
    if (!waiter?.staffId) return;

    try {
      await rejectOrder({
        orderId: orderId,
        waiterId: waiter.staffId,
      });

      // Vibrate on reject
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    if (!waiter?.staffId) return;

    try {
      await staffLogout({ staffId: waiter.staffId });
      localStorage.removeItem("adminAuth");
      router.push(`/r/${restaurantId}/admin/login`);
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("adminAuth");
      router.push(`/r/${restaurantId}/admin/login`);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!waiter) {
    return null;
  }

  // Calculate if waiter is in restaurant based on current distance
  const isInRestaurant = location && distanceFromRestaurant !== null && distanceFromRestaurant <= 100;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:w-64 bg-white flex-col border-r-2 border-black">
        {/* Logo/Header */}
        <div className="p-4 border-b-2 border-black">
          <h1 className="text-sm font-bold uppercase tracking-wider text-black">Waiter Panel</h1>
          <p className="text-xs text-gray-600 mt-1">{waiter.name}</p>
          <p className="text-[10px] text-gray-500 uppercase">{restaurant?.name}</p>
        </div>

        {/* Online/Offline Status */}
        <div className="p-4 border-b-2 border-black">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs font-bold uppercase text-black">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          
          <button
            onClick={handleToggleOnline}
            disabled={!location || !isInRestaurant}
            className={`w-full px-3 py-2 text-xs font-bold uppercase border-2 transition-all ${
              isOnline
                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                : "bg-black text-white border-black hover:bg-gray-800"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isOnline ? "Go Offline" : "Go Online"}
          </button>

          {/* Location Status */}
          <div className="mt-3 p-2 bg-gray-100 border-2 border-gray-300">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} className={isInRestaurant ? "text-green-600" : "text-red-600"} />
              <p className="text-[10px] font-bold uppercase text-black">
                {isInRestaurant ? "In Restaurant" : "Outside"}
              </p>
            </div>
            {location && (
              <p className="text-[9px] text-gray-600">
                ±{Math.round(location.accuracy)}m accuracy
              </p>
            )}
            {locationError && (
              <p className="text-[9px] text-red-600">{locationError}</p>
            )}
            
            <button
              onClick={() => setShowLocationDetails(!showLocationDetails)}
              className="w-full mt-2 px-2 py-1 text-[10px] font-bold uppercase border border-black hover:bg-black hover:text-white transition-all"
            >
              Check My Location
            </button>

            {showLocationDetails && location && (
              <div className="mt-2 p-2 bg-white border border-gray-400 text-[9px] space-y-1">
                <div>
                  <span className="font-bold">Your Location:</span>
                  <p className="text-gray-600">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
                {restaurant?.location && (
                  <>
                    <div>
                      <span className="font-bold">Restaurant:</span>
                      <p className="text-gray-600">
                        {restaurant.location.latitude.toFixed(6)}, {restaurant.location.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold">Distance:</span>
                      <p className={distanceFromRestaurant <= 100 ? "text-green-600" : "text-red-600"}>
                        {Math.round(distanceFromRestaurant)}m away
                        {distanceFromRestaurant <= 100 ? " ✓" : " (need ≤100m)"}
                      </p>
                    </div>
                  </>
                )}
                {!restaurant?.location && (
                  <p className="text-red-600">Restaurant location not set!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-3 py-2 mb-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
              activeTab === "orders"
                ? "bg-black text-white border-black"
                : "bg-white text-black border-gray-300 hover:border-black"
            }`}
          >
            <ClipboardList size={16} />
            Orders
            {pendingOrders && pendingOrders.length > 0 && (
              <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`w-full flex items-center gap-3 px-3 py-2 mb-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
              activeTab === "attendance"
                ? "bg-black text-white border-black"
                : "bg-white text-black border-gray-300 hover:border-black"
            }`}
          >
            <Calendar size={16} />
            Attendance
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
              activeTab === "stats"
                ? "bg-black text-white border-black"
                : "bg-white text-black border-gray-300 hover:border-black"
            }`}
          >
            <BarChart3 size={16} />
            Stats
          </button>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t-2 border-black">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-bold uppercase border-2 border-red-600 hover:bg-red-700 transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b-2 border-black p-4 z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wide text-black">Waiter Panel</h1>
            <p className="text-xs text-gray-600">{waiter.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 transition-all border-2 border-black"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 overflow-y-auto">
          <div className="p-4">
            {/* Online/Offline Toggle */}
            <div className="mb-6 p-4 bg-gray-100 border-2 border-black">
              <button
                onClick={handleToggleOnline}
                disabled={!location || !isInRestaurant}
                className={`w-full px-4 py-3 text-sm font-bold uppercase border-2 transition-all ${
                  isOnline
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-black text-white border-black"
                } disabled:opacity-50`}
              >
                {isOnline ? "Go Offline" : "Go Online"}
              </button>
              <div className="mt-3 flex items-center gap-2 text-xs text-black">
                <MapPin size={12} className={isInRestaurant ? "text-green-600" : "text-red-600"} />
                <span>{isInRestaurant ? "In Restaurant" : "Outside Restaurant"}</span>
              </div>
              
              <button
                onClick={() => setShowLocationDetails(!showLocationDetails)}
                className="w-full mt-3 px-3 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-black hover:text-white transition-all"
              >
                Check My Location
              </button>

              {showLocationDetails && location && (
                <div className="mt-3 p-3 bg-white border-2 border-gray-400 text-xs space-y-2">
                  <div>
                    <span className="font-bold">Your Location:</span>
                    <p className="text-gray-600 text-[10px]">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </div>
                  {restaurant?.location && (
                    <>
                      <div>
                        <span className="font-bold">Restaurant:</span>
                        <p className="text-gray-600 text-[10px]">
                          {restaurant.location.latitude.toFixed(6)}, {restaurant.location.longitude.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold">Distance:</span>
                        <p className={`text-sm ${distanceFromRestaurant <= 100 ? "text-green-600" : "text-red-600"}`}>
                          {Math.round(distanceFromRestaurant)}m away
                          {distanceFromRestaurant <= 100 ? " ✓" : " (need ≤100m)"}
                        </p>
                      </div>
                    </>
                  )}
                  {!restaurant?.location && (
                    <p className="text-red-600">Restaurant location not set!</p>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <button
                onClick={() => { setActiveTab("orders"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase border-2 ${
                  activeTab === "orders" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                }`}
              >
                <ClipboardList size={16} />
                Orders
                {pendingOrders && pendingOrders.length > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("attendance"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase border-2 ${
                  activeTab === "attendance" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                }`}
              >
                <Calendar size={16} />
                Attendance
              </button>

              <button
                onClick={() => { setActiveTab("stats"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase border-2 ${
                  activeTab === "stats" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                }`}
              >
                <BarChart3 size={16} />
                Stats
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-bold uppercase border-2 border-red-600 mt-6"
              >
                <LogOut size={16} />
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 md:ml-0 pt-16 md:pt-0">
        {/* Header Bar */}
        <div className="bg-white border-b-2 border-black p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider">
                {activeTab === "orders" && "Orders"}
                {activeTab === "attendance" && "Attendance"}
                {activeTab === "stats" && "Statistics"}
              </h2>
              <p className="text-xs text-gray-600 mt-1 uppercase tracking-wide">
                {activeTab === "orders" && `${(pendingOrders?.length || 0) + (activeOrders?.length || 0)} Active`}
                {activeTab === "attendance" && "Today's Record"}
                {activeTab === "stats" && "Performance Overview"}
              </p>
            </div>
            {!isInRestaurant && location && (
              <div className="hidden md:block px-3 py-2 bg-red-100 border-2 border-red-600 text-red-700 text-xs font-bold uppercase">
                Outside Range
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-6">
          {/* Orders Tab */}
          {activeTab === "orders" && (
            <>
              {/* Pending Orders (Need Acceptance) */}
              {pendingOrders && pendingOrders.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-black">
                    <Bell size={18} className="text-black" />
                    <h3 className="text-sm font-bold uppercase tracking-wide">
                      New Orders ({pendingOrders.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pendingOrders.map((order) => {
                      const timeLeft = order.assignmentTimeoutAt
                        ? Math.max(0, Math.ceil((order.assignmentTimeoutAt - Date.now()) / 1000))
                        : 0;

                      return (
                        <div
                          key={order._id}
                          className="border-2 border-red-600 bg-red-50 p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-black text-lg">
                                #{order.orderNumber}
                              </h4>
                              <p className="text-xs text-gray-600 uppercase tracking-wide">
                                Table {order.tableId || "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-red-600">
                                <Clock size={16} />
                                <span className="text-lg font-bold">{timeLeft}s</span>
                              </div>
                              <p className="text-[10px] text-gray-600 uppercase">Timeout</p>
                            </div>
                          </div>

                          <div className="mb-4 p-3 bg-white border border-gray-300">
                            <p className="text-xs font-bold text-black uppercase mb-2">Items:</p>
                            {order.items?.map((item, idx) => (
                              <p key={idx} className="text-sm text-gray-700">
                                {item.quantity}x {item.name}
                              </p>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleAcceptOrder(order._id)}
                              className="flex items-center justify-center gap-2 bg-black text-white px-4 py-3 text-xs font-bold uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
                            >
                              <CheckCircle size={16} />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order._id)}
                              className="flex items-center justify-center gap-2 bg-white text-black px-4 py-3 text-xs font-bold uppercase border-2 border-black hover:bg-black hover:text-white transition-all"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Orders */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-black">
                  <Package size={18} className="text-black" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">
                    Active Orders ({activeOrders?.length || 0})
                  </h3>
                </div>

                {!activeOrders || activeOrders.length === 0 ? (
                  <div className="border-2 border-gray-300 p-12 text-center">
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-bold text-gray-400 uppercase">No Active Orders</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {isOnline ? "Waiting for new orders..." : "Go online to receive orders"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeOrders.map((order) => (
                      <div
                        key={order._id}
                        className="border-2 border-black bg-white p-4 hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-black text-lg">
                              #{order.orderNumber}
                            </h4>
                            <p className="text-xs text-gray-600 uppercase tracking-wide">
                              Table {order.tableId || "N/A"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold uppercase px-2 py-1 border-2 ${
                              order.status === 'ready'
                                ? 'bg-green-100 text-green-700 border-green-700'
                                : 'bg-yellow-100 text-yellow-700 border-yellow-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 border-2 border-gray-300">
                          <p className="text-xs font-bold text-black uppercase mb-2">Items:</p>
                          {order.items?.map((item, idx) => (
                            <p key={idx} className="text-sm text-gray-700">
                              {item.quantity}x {item.name}
                            </p>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="mt-3 p-2 bg-yellow-50 border-2 border-yellow-600">
                            <p className="text-xs text-yellow-900">
                              <span className="font-bold">Note:</span> {order.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="border-2 border-gray-300 p-8 text-center">
              <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-bold text-gray-400 uppercase">Attendance Records</p>
              <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border-2 border-black p-6">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Orders Today</p>
                  <p className="text-4xl font-bold text-black">{waiter.ordersServedToday || 0}</p>
                </div>
                <div className="border-2 border-black p-6">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Active Now</p>
                  <p className="text-4xl font-bold text-black">{activeOrders?.length || 0}</p>
                </div>
                <div className="border-2 border-black p-6">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Total Served</p>
                  <p className="text-4xl font-bold text-black">{waiter.totalOrdersServed || 0}</p>
                </div>
              </div>

              <div className="border-2 border-gray-300 p-8 text-center">
                <BarChart3 size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-bold text-gray-400 uppercase">Detailed Statistics</p>
                <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
