'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useNotificationAlert } from '@/lib/useNotificationAlert';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Grid3X3, Calendar, MapPin, QrCode, BarChart3, Users, ChevronDown, Check, ArrowLeft, Settings, Menu, X, Package } from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  
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

  // Don't show sidebar on login page
  if (pathname?.includes('/login')) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">{children}</div>;
  }

  const isStaffActive = pathname?.includes('/staff');
  
  // Build nav items with restaurant ID
  const navItems = [
    { href: `/r/${restaurantId}/admin`, label: 'DASHBOARD', icon: LayoutDashboard },
    { href: `/r/${restaurantId}/admin/orders`, label: 'ORDERS', icon: ClipboardList },
    { href: `/r/${restaurantId}/admin/menu`, label: 'MENU', icon: UtensilsCrossed },
    { href: `/r/${restaurantId}/admin/tables`, label: 'TABLES', icon: Grid3X3 },
    { href: `/r/${restaurantId}/admin/raw-items`, label: 'RAW ITEMS', icon: Package },
    { href: `/r/${restaurantId}/admin/settings`, label: 'SETTINGS', icon: Settings },
    // { href: `/r/${restaurantId}/admin/reports`, label: 'REPORTS', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b-2 border-gray-200 p-3 flex items-center justify-between sticky top-0 z-50">
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
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          {mobileMenuOpen ? <X size={20} className="text-black" /> : <Menu size={20} className="text-black" />}
        </button>
      </div>

      <div className="flex">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40 top-[57px]" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-white w-64 h-full overflow-y-auto p-4 border-r-2 border-black" onClick={(e) => e.stopPropagation()}>
              <SidebarContent 
                restaurantId={restaurantId}
                brandLogo={displayLogo}
                brandName={brandName}
                navItems={navItems}
                pathname={pathname}
                pendingCalls={pendingCalls}
                pendingOrders={pendingOrders}
                staff={staff}
                isStaffActive={isStaffActive}
                staffDropdownOpen={staffDropdownOpen}
                setStaffDropdownOpen={setStaffDropdownOpen}
                onLinkClick={() => setMobileMenuOpen(false)}
                isMobile={true}
                onLogoError={() => setLogoError(true)}
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
            staff={staff}
            isStaffActive={isStaffActive}
            staffDropdownOpen={staffDropdownOpen}
            setStaffDropdownOpen={setStaffDropdownOpen}
            isMobile={false}
            onLogoError={() => setLogoError(true)}
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
function SidebarContent({ restaurantId, brandLogo, brandName, navItems, pathname, pendingCalls, pendingOrders, staff, isStaffActive, staffDropdownOpen, setStaffDropdownOpen, onLinkClick, isMobile, onLogoError }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand Header - Desktop only */}
     

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
        {navItems.slice(0, 4).map((item) => {
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

        {/* Staff Dropdown */}
        <div>
          <button
            onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-all border-2 ${
              isStaffActive
                ? 'bg-black text-white border-black'
                : 'text-black border-gray-200 hover:border-black hover:bg-black hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={16} />
              <span>STAFF</span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${staffDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {staffDropdownOpen && (
            <div className="ml-4 mt-1 space-y-1">
              <Link
                href={`/r/${restaurantId}/admin/staff`}
                onClick={onLinkClick}
                className={`block px-3 py-2 text-[10px] font-bold uppercase border ${
                  pathname === `/r/${restaurantId}/admin/staff` 
                    ? 'text-white bg-black border-black' 
                    : 'text-black border-gray-200 hover:border-black hover:bg-black hover:text-white'
                }`}
              >
                Manage Staff
              </Link>
              <Link
                href={`/r/${restaurantId}/admin/staff/balance`}
                onClick={onLinkClick}
                className={`block px-3 py-2 text-[10px] font-bold uppercase border ${
                  pathname === `/r/${restaurantId}/admin/staff/balance` 
                    ? 'text-white bg-black border-black' 
                    : 'text-black border-gray-200 hover:border-black hover:bg-black hover:text-white'
                }`}
              >
                Workload Balance
              </Link>
              <Link
                href={`/r/${restaurantId}/admin/staff/reports`}
                onClick={onLinkClick}
                className={`block px-3 py-2 text-[10px] font-bold uppercase border ${
                  pathname === `/r/${restaurantId}/admin/staff/reports` 
                    ? 'text-white bg-black border-black' 
                    : 'text-black border-gray-200 hover:border-black hover:bg-black hover:text-white'
                }`}
              >
                Compare Reports
              </Link>
              {staff && staff.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                    Individual Staff
                  </div>
                  {staff.map(s => (
                    <Link
                      key={s._id}
                      href={`/r/${restaurantId}/admin/staff/reports/${s._id}`}
                      onClick={onLinkClick}
                      className={`px-3 py-2 text-[10px] font-medium flex items-center gap-2 border ${
                        pathname === `/r/${restaurantId}/admin/staff/reports/${s._id}` 
                          ? 'text-white bg-black border-black' 
                          : 'text-black border-gray-200 hover:border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.isOnline === true ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {s.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {navItems.slice(4).map((item) => {
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

      <div className="pt-4 border-t-2 border-gray-200 mt-4">
        <Link 
          href={`/r/${restaurantId}`} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-black px-3 py-2.5 border-2 border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all" 
          onClick={onLinkClick}
        >
          <ArrowLeft size={16} /> 
          Customer View
        </Link>
      </div>
    </div>
  );
}
