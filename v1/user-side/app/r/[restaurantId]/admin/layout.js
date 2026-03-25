'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useNotificationAlert } from '@/lib/useNotificationAlert';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Grid3X3, Calendar, MapPin, QrCode, BarChart3, Users, ChevronDown, Check, ArrowLeft, Settings, Menu, X, Package } from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const params = useParams();
  const restaurantId = params.restaurantId;
  const router = useRouter();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const hasRedirected = useRef(false);

  // Check authentication on mount
  useEffect(() => {
    const authData = localStorage.getItem("adminAuth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        setAuthUser(parsed);
        
        // If waiter, redirect to waiter dashboard
        if (parsed.role === "Waiter" && !pathname?.includes('/staff/waiter')) {
          router.replace(`/r/${restaurantId}/admin/staff/waiter`);
        }
      } catch (e) {
        console.error("Invalid auth data");
        localStorage.removeItem("adminAuth");
      }
    }
    setAuthChecked(true);
  }, [pathname, restaurantId, router]);

  // Redirect to login if not authenticated (only once)
  useEffect(() => {
    if (authChecked && !authUser && !pathname?.includes('/login') && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace(`/r/${restaurantId}/admin/login`);
    }
  }, [authChecked, authUser, pathname, restaurantId, router]);
  
  // Get restaurant info first
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  
  // Load all data in parallel with restaurant filter
  const staff = useQuery(api.staff.listActive, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const pendingCalls = useQuery(api.staffCalls.listPending, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const orders = useQuery(api.orders.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const settings = useQuery(api.settings.getAll);
  const logoUrl = useQuery(
    api.files.getUrl,
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );

  // Get branding from restaurant or settings
  const brandName = restaurant?.brandName || restaurant?.name || settings?.brandName || "Restaurant";
  const brandLogo = restaurant?.logo || logoUrl || settings?.brandLogo;
  
  // Handle logo loading state
  const [logoError, setLogoError] = useState(false);
  const displayLogo = logoError ? null : brandLogo;

  // Get pending/new orders
  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

  // Sound + vibration + push notification alert for new orders/calls
  const totalAlerts = (pendingCalls?.length || 0) + pendingOrders.length;
  useNotificationAlert(totalAlerts, {
    title: '🔔 New Activity',
    body: `${pendingCalls?.length || 0} calls, ${pendingOrders.length} orders pending`
  });

  // Don't show sidebar on login page or waiter dashboard
  if (pathname?.includes('/login') || pathname?.includes('/staff/waiter')) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // Redirect handled by useEffect above
  if (!authUser) {
    return null;
  }

  // Global admin intro / loading animation before any page
  const isBootLoading =
    restaurant === undefined ||
    settings === undefined ||
    staff === undefined ||
    pendingCalls === undefined ||
    orders === undefined;

  if (isBootLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <style jsx>{`
          @keyframes adminPulse {
            0% { transform: translateY(0); box-shadow: 0 10px 30px rgba(0,0,0,0.10); }
            50% { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.16); }
            100% { transform: translateY(0); box-shadow: 0 10px 30px rgba(0,0,0,0.10); }
          }
          @keyframes stripeSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .admin-loader-card {
            animation: adminPulse 1.8s ease-in-out infinite;
          }
          .admin-loader-stripe::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
            transform: translateX(-100%);
            animation: stripeSlide 1.8s infinite;
          }
        `}</style>
        <div className="w-full max-w-md px-8">
          <div className="border-2 border-black bg-white px-6 py-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Loading</p>
              <h1 className="text-xl font-bold tracking-wide text-black">OrderZap Admin</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold">
                {restaurantId?.slice(0, 3)?.toUpperCase() || 'R'}
              </div>
            </div>
          </div>
          <div className="admin-loader-card border-2 border-black bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="h-2 w-24 bg-gray-200 relative overflow-hidden admin-loader-stripe" />
                <div className="h-3 w-40 bg-gray-100 mt-2" />
              </div>
              <div className="h-6 px-3 border border-black flex items-center justify-center text-[10px] font-semibold tracking-wide">
                DASHBOARD
              </div>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-[10px] text-gray-600">
                <span>New Orders</span>
                <div className="h-4 w-10 bg-gray-100 relative overflow-hidden admin-loader-stripe" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-600">
                <span>Staff Calls</span>
                <div className="h-4 w-10 bg-gray-100 relative overflow-hidden admin-loader-stripe" />
              </div>
              <div className="mt-3 border-t border-gray-200 pt-3 flex justify-between text-[9px] text-gray-500 uppercase tracking-[0.18em]">
                <span>Preparing workspace</span>
                <span>···</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Build nav items based on user role
  const getNavItems = () => {
    const userRole = authUser?.role?.toLowerCase();
    
    // Staff (Waiter, Chef, etc.) - Only Orders
    if (userRole === 'waiter' || userRole === 'chef' || userRole === 'host' || userRole === 'cleaner') {
      return [
        { href: `/r/${restaurantId}/admin/orders`, label: 'ORDERS', icon: ClipboardList },
      ];
    }
    
    // Manager - All except Staff management
    if (userRole === 'manager') {
      return [
        { href: `/r/${restaurantId}/admin`, label: 'DASHBOARD', icon: LayoutDashboard },
        { href: `/r/${restaurantId}/admin/orders`, label: 'ORDERS', icon: ClipboardList },
        { href: `/r/${restaurantId}/admin/menu`, label: 'MENU', icon: UtensilsCrossed },
        { href: `/r/${restaurantId}/admin/tables`, label: 'TABLES', icon: Grid3X3 },
        { href: `/r/${restaurantId}/admin/raw-items`, label: 'RAW ITEMS', icon: Package },
        { href: `/r/${restaurantId}/admin/settings`, label: 'SETTINGS', icon: Settings },
      ];
    }
    
    // Owner - Full access
    return [
      { href: `/r/${restaurantId}/admin`, label: 'DASHBOARD', icon: LayoutDashboard },
      { href: `/r/${restaurantId}/admin/orders`, label: 'ORDERS', icon: ClipboardList },
      { href: `/r/${restaurantId}/admin/menu`, label: 'MENU', icon: UtensilsCrossed },
      { href: `/r/${restaurantId}/admin/tables`, label: 'TABLES', icon: Grid3X3 },
      { href: `/r/${restaurantId}/admin/staff`, label: 'STAFF', icon: Users },
      { href: `/r/${restaurantId}/admin/raw-items`, label: 'RAW ITEMS', icon: Package },
      { href: `/r/${restaurantId}/admin/settings`, label: 'SETTINGS', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    router.push(`/r/${restaurantId}/admin/login`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        @keyframes slideInSidebar {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutSidebar {
          0% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        .sidebar-enter {
          animation: slideInSidebar 0.18s ease-out forwards;
        }
        .sidebar-exit {
          animation: slideOutSidebar 0.16s ease-in forwards;
        }
        @keyframes fadeInOverlay {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeOutOverlay {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .overlay-enter {
          animation: fadeInOverlay 0.18s ease-out forwards;
        }
        .overlay-exit {
          animation: fadeOutOverlay 0.16s ease-in forwards;
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b-2 border-gray-200 p-3 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-2">
          <Link 
            href={`/r/${restaurantId}/admin/orders`}
            className="relative flex items-center gap-2 px-3 py-1.5 border-2 border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all group"
          >
            <span className="text-xs font-bold">Orders</span>
            {pendingOrders.length > 0 && (
              <>
                <span className="bg-black text-white group-hover:bg-white group-hover:text-black text-xs font-bold px-1.5 py-0.5 transition-all">
                  {pendingOrders.length}
                </span>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              </>
            )}
          </Link>
          
          <Link 
            href={`/r/${restaurantId}/admin/calls`}
            className="relative flex items-center gap-2 px-3 py-1.5 border-2 border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all group"
          >
            <span className="text-xs font-bold">Calls</span>
            {pendingCalls && pendingCalls.length > 0 && (
              <>
                <span className="bg-black text-white group-hover:bg-white group-hover:text-black text-xs font-bold px-1.5 py-0.5 transition-all">
                  {pendingCalls.length}
                </span>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              </>
            )}
          </Link>
        </div>
        <button 
          onClick={() => {
            if (!mobileMenuOpen) {
              // Opening
              setMobileMenuVisible(true);
              setMobileMenuOpen(true);
            } else {
              // Closing with exit animation
              setMobileMenuOpen(false);
              setTimeout(() => setMobileMenuVisible(false), 160);
            }
          }}
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          {mobileMenuOpen ? <X size={20} className="text-black" /> : <Menu size={20} className="text-black" />}
        </button>
      </div>

      <div className="flex">
        {/* Mobile Menu Overlay */}
        {mobileMenuVisible && (
          <div
            className={`lg:hidden fixed inset-0 z-50 top-[57px] ${mobileMenuOpen ? 'overlay-enter' : 'overlay-exit'} bg-black/50`}
            onClick={() => {
              setMobileMenuOpen(false);
              setTimeout(() => setMobileMenuVisible(false), 160);
            }}
          >
            <div
              className={`bg-white w-64 h-full overflow-y-auto p-4 border-r-2 border-black ${mobileMenuOpen ? 'sidebar-enter' : 'sidebar-exit'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent 
                restaurantId={restaurantId}
                brandLogo={displayLogo}
                brandName={brandName}
                navItems={navItems}
                pathname={pathname}
                pendingCalls={pendingCalls}
                pendingOrders={pendingOrders}
                onLinkClick={() => setMobileMenuOpen(false)}
                isMobile={true}
                onLogoError={() => setLogoError(true)}
                authUser={authUser}
                onLogout={handleLogout}
              />
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r-2 border-gray-200 min-h-screen p-4">
          <SidebarContent 
            restaurantId={restaurantId}
            brandLogo={displayLogo}
            brandName={brandName}
            navItems={navItems}
            pathname={pathname}
            pendingCalls={pendingCalls}
            pendingOrders={pendingOrders}
            isMobile={false}
            onLogoError={() => setLogoError(true)}
            authUser={authUser}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Sidebar Content Component
function SidebarContent({ restaurantId, brandLogo, brandName, navItems, pathname, pendingCalls, pendingOrders, onLinkClick, isMobile, onLogoError, authUser, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* User Info */}
      <div className="mb-4 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg font-bold">
            {authUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-black text-sm truncate">{authUser?.name || 'User'}</p>
            <p className="text-xs text-gray-600 uppercase">{authUser?.role || 'Staff'}</p>
          </div>
        </div>
      </div>

      {/* Live Activity Section */}
      <div className="mb-4 pb-4 border-b-2 border-gray-200">
        <p className="text-[10px] text-gray-600 font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
          <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
          Live Activity
        </p>
        
        {/* Pending Calls */}
        {pendingCalls && pendingCalls.length > 0 && (
          <Link href={`/r/${restaurantId}/admin/calls`} className="block mb-2" onClick={onLinkClick}>
            <div className="bg-white border-2 border-black p-3 hover:bg-black hover:text-white transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-black group-hover:text-white text-xs font-bold uppercase">Staff Calls</span>
                <span className="bg-black text-white group-hover:bg-white group-hover:text-black text-xs font-bold px-2 py-0.5 transition-all">{pendingCalls.length}</span>
              </div>
              <div className="space-y-1">
                {pendingCalls.slice(0, 2).map(call => (
                  <p key={call._id} className="text-[10px] text-gray-700 group-hover:text-gray-200 truncate">
                    Table {call.tableNumber}: {call.reason || 'Assistance'}
                  </p>
                ))}
                {pendingCalls.length > 2 && (
                  <p className="text-[10px] text-gray-600 group-hover:text-gray-300">+{pendingCalls.length - 2} more</p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <Link href={`/r/${restaurantId}/admin/orders`} className="block" onClick={onLinkClick}>
            <div className="bg-white border-2 border-black p-3 hover:bg-black hover:text-white transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-black group-hover:text-white text-xs font-bold uppercase">New Orders</span>
                <span className="bg-black text-white group-hover:bg-white group-hover:text-black text-xs font-bold px-2 py-0.5 transition-all">{pendingOrders.length}</span>
              </div>
              <div className="space-y-1">
                {pendingOrders.slice(0, 2).map(order => (
                  <p key={order._id} className="text-[10px] text-gray-700 group-hover:text-gray-200 truncate">
                    Table {order.tableId}: ₹{order.total}
                  </p>
                ))}
                {pendingOrders.length > 2 && (
                  <p className="text-[10px] text-gray-600 group-hover:text-gray-300">+{pendingOrders.length - 2} more</p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* All Clear */}
        {(!pendingCalls || pendingCalls.length === 0) && pendingOrders.length === 0 && (
          <div className="text-center py-3 text-xs flex items-center justify-center gap-2 bg-white border-2 border-gray-200">
            <Check size={14} className="text-black" /> 
            <span className="text-black font-bold uppercase">All Clear</span>
          </div>
        )}
      </div>
      
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/r/${restaurantId}/admin` && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-all border-2 ${
                isActive
                  ? 'bg-black text-white border-black'
                  : 'text-black border-gray-200 hover:border-black hover:bg-black hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t-2 border-gray-200 mt-4 space-y-2">
        <Link 
          href={`/r/${restaurantId}`} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-black px-3 py-2.5 border-2 border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all" 
          onClick={onLinkClick}
        >
          <ArrowLeft size={16} /> 
          Customer View
        </Link>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-600 px-3 py-2.5 border-2 border-red-200 hover:border-red-600 hover:bg-red-600 hover:text-white transition-all"
        >
          <X size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
