'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useNotificationAlert } from '@/lib/useNotificationAlert';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Grid3X3, Calendar, MapPin, QrCode, BarChart3, Users, ChevronDown, Check, ArrowLeft, Settings, Menu, X } from 'lucide-react';

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
    { href: `/r/${restaurantId}/admin/reports`, label: 'REPORTS', icon: BarChart3 },
    { href: `/r/${restaurantId}/admin/settings`, label: 'SETTINGS', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src={displayLogo} 
            alt={brandName} 
            className="h-8 w-8 rounded-full object-contain bg-slate-100 p-1" 
            onError={() => setLogoError(true)}
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900">{brandName}</h1>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X size={20} className="text-slate-700" /> : <Menu size={20} className="text-slate-700" />}
        </button>
      </div>

      <div className="flex">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 top-[73px]" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-white w-64 h-full overflow-y-auto p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-screen p-4 shadow-sm">
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
      {!isMobile && (
        <div className="mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src={brandLogo} 
              alt={brandName} 
              className="h-10 w-10 rounded-xl object-contain shadow-sm bg-slate-100 p-1.5" 
              onError={onLogoError}
            />
            <div>
              <h1 className="text-base font-bold text-slate-900">{brandName}</h1>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Activity Section */}
      <div className="mb-4 pb-4 border-b border-slate-200">
        <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live Activity
        </p>
        
        {/* Pending Calls */}
        {pendingCalls && pendingCalls.length > 0 && (
          <Link href={`/r/${restaurantId}/admin/calls`} className="block mb-2" onClick={onLinkClick}>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 hover:bg-red-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-700 text-xs font-semibold">Staff Calls</span>
                <span className="bg-red-200 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingCalls.length}</span>
              </div>
              <div className="space-y-1">
                {pendingCalls.slice(0, 2).map(call => (
                  <p key={call._id} className="text-xs text-red-600 truncate">
                    Table {call.tableNumber}: {call.reason || 'Assistance'}
                  </p>
                ))}
                {pendingCalls.length > 2 && (
                  <p className="text-xs text-red-500">+{pendingCalls.length - 2} more</p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <Link href={`/r/${restaurantId}/admin/orders`} className="block" onClick={onLinkClick}>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 hover:bg-amber-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-700 text-xs font-semibold">New Orders</span>
                <span className="bg-amber-200 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
              </div>
              <div className="space-y-1">
                {pendingOrders.slice(0, 2).map(order => (
                  <p key={order._id} className="text-xs text-amber-600 truncate">
                    Table {order.tableId}: ₹{order.total}
                  </p>
                ))}
                {pendingOrders.length > 2 && (
                  <p className="text-xs text-amber-500">+{pendingOrders.length - 2} more</p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* All Clear */}
        {(!pendingCalls || pendingCalls.length === 0) && pendingOrders.length === 0 && (
          <div className="text-center py-3 text-slate-500 text-xs flex items-center justify-center gap-2 bg-emerald-50 rounded-xl border border-emerald-200">
            <Check size={14} className="text-emerald-600" /> 
            <span className="text-emerald-700 font-medium">All clear</span>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Staff Dropdown */}
        <div>
          <button
            onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isStaffActive
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>STAFF</span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${staffDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {staffDropdownOpen && (
            <div className="ml-4 mt-1 space-y-1">
              <Link
                href={`/r/${restaurantId}/admin/staff`}
                onClick={onLinkClick}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  pathname === `/r/${restaurantId}/admin/staff` 
                    ? 'text-blue-700 bg-blue-50 font-medium' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Manage Staff
              </Link>
              <Link
                href={`/r/${restaurantId}/admin/staff/balance`}
                onClick={onLinkClick}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  pathname === `/r/${restaurantId}/admin/staff/balance` 
                    ? 'text-blue-700 bg-blue-50 font-medium' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Workload Balance
              </Link>
              <Link
                href={`/r/${restaurantId}/admin/staff/reports`}
                onClick={onLinkClick}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  pathname === `/r/${restaurantId}/admin/staff/reports` 
                    ? 'text-blue-700 bg-blue-50 font-medium' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Compare Reports
              </Link>
              {staff && staff.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    Individual Staff
                  </div>
                  {staff.map(s => (
                    <Link
                      key={s._id}
                      href={`/r/${restaurantId}/admin/staff/reports/${s._id}`}
                      onClick={onLinkClick}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        pathname === `/r/${restaurantId}/admin/staff/reports/${s._id}` 
                          ? 'text-blue-700 bg-blue-50 font-medium' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.isOnline === true ? 'bg-emerald-500' : 'bg-slate-300'}`} />
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-200 mt-4">
        <Link 
          href={`/r/${restaurantId}`} 
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all font-medium" 
          onClick={onLinkClick}
        >
          <ArrowLeft size={16} /> 
          Customer View
        </Link>
      </div>
    </div>
  );
}
