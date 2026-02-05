'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useNotificationAlert } from '@/lib/useNotificationAlert';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Grid3X3, Calendar, MapPin, QrCode, BarChart3, Users, ChevronDown, Check, ArrowLeft, Settings, Menu, X } from 'lucide-react';

const navItems = [
  { href: '/demo/admin', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/demo/admin/orders', label: 'ORDERS', icon: ClipboardList },
  { href: '/demo/admin/menu', label: 'MENU', icon: UtensilsCrossed },
  { href: '/demo/admin/tables', label: 'TABLES', icon: Grid3X3 },
  { href: '/demo/admin/reservations', label: 'RESERVATIONS', icon: Calendar },
  { href: '/demo/admin/zones', label: 'ZONES', icon: MapPin },
  { href: '/demo/admin/qr-codes', label: 'QR CODES', icon: QrCode },
  { href: '/demo/admin/reports', label: 'REPORTS', icon: BarChart3 },
  { href: '/demo/admin/settings', label: 'SETTINGS', icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  
  // Load all data in parallel
  const staff = useQuery(api.staff.listActive);
  const pendingCalls = useQuery(api.staffCalls.listPending);
  const orders = useQuery(api.orders.list);
  const settings = useQuery(api.settings.getAll);
  const logoUrl = useQuery(
    api.files.getUrl,
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );

  // Get branding from settings with fallbacks
  const brandName = settings?.brandName || "OrderZap";
  const brandLogo = logoUrl || settings?.brandLogo || "/assets/logos/orderzap-logo.png";

  // Get pending/new orders
  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

  // Sound + vibration + push notification alert for new orders/calls
  const totalAlerts = (pendingCalls?.length || 0) + pendingOrders.length;
  useNotificationAlert(totalAlerts, {
    title: '🔔 New Activity',
    body: `${pendingCalls?.length || 0} calls, ${pendingOrders.length} orders pending`
  });

  // Don't show sidebar on login page
  if (pathname === '/demo/admin/login') {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">{children}</div>;
  }

  const isStaffActive = pathname.startsWith('/demo/admin/staff');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* Mobile Header */}
      <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt={brandName} className="h-8 w-8 rounded-full object-contain" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">{brandName}</h1>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Admin</p>
          </div>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-zinc-800 rounded"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="flex">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40 top-[73px]" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-zinc-900 w-64 h-full overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
              <SidebarContent 
                brandLogo={brandLogo}
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
              />
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 bg-zinc-900 border-r border-zinc-800 min-h-screen p-4">
          <SidebarContent 
            brandLogo={brandLogo}
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
function SidebarContent({ brandLogo, brandName, navItems, pathname, pendingCalls, pendingOrders, staff, isStaffActive, staffDropdownOpen, setStaffDropdownOpen, onLinkClick, isMobile }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand Header - Desktop only */}
      {!isMobile && (
        <div className="mb-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <img src={brandLogo} alt={brandName} className="h-8 w-8 rounded-full object-contain" />
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">{brandName}</h1>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Activity Section */}
      <div className="mb-4 pb-4 border-b border-zinc-800">
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live Activity
        </p>
        
        {/* Pending Calls */}
        {pendingCalls && pendingCalls.length > 0 && (
          <Link href="/demo/admin/calls" className="block mb-2" onClick={onLinkClick}>
            <div className="bg-red-500/10 border border-red-500/30 p-2 hover:bg-red-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-[10px] font-bold uppercase">Staff Calls</span>
                <span className="text-red-400 font-bold">{pendingCalls.length}</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {pendingCalls.slice(0, 3).map(call => (
                  <p key={call._id} className="text-[9px] text-zinc-400 truncate">
                    T{call.tableNumber}: {call.reason || 'Assistance'}
                  </p>
                ))}
                {pendingCalls.length > 3 && (
                  <p className="text-[9px] text-zinc-500">+{pendingCalls.length - 3} more</p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <Link href="/demo/admin/orders" className="block" onClick={onLinkClick}>
            <div className="bg-amber-500/10 border border-amber-500/30 p-2 hover:bg-amber-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-[10px] font-bold uppercase">New Orders</span>
                <span className="text-amber-400 font-bold">{pendingOrders.length}</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {pendingOrders.slice(0, 3).map(order => (
                  <p key={order._id} className="text-[9px] text-zinc-400 truncate">
                    T{order.tableId}: ₹{order.total} ({order.items.length} items)
                  </p>
                ))}
                {pendingOrders.length > 3 && (
                  <p className="text-[9px] text-zinc-500">+{pendingOrders.length - 3} more</p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* All Clear */}
        {(!pendingCalls || pendingCalls.length === 0) && pendingOrders.length === 0 && (
          <div className="text-center py-2 text-zinc-600 text-[10px] flex items-center justify-center gap-1">
            <Check size={12} /> All clear
          </div>
        )}
      </div>
      
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {navItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/demo/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wide transition-colors ${
                isActive
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Staff Dropdown */}
        <div>
          <button
            onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wide transition-colors ${
              isStaffActive
                ? 'bg-white text-black font-bold'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={14} />
              <span>STAFF</span>
            </div>
            <ChevronDown size={12} className={`transition-transform ${staffDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {staffDropdownOpen && (
            <div className="ml-4 border-l border-zinc-800 mt-1">
              <Link
                href="/demo/admin/staff"
                onClick={onLinkClick}
                className={`block px-3 py-1.5 text-[10px] uppercase tracking-wide ${
                  pathname === '/demo/admin/staff' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Manage Staff
              </Link>
              <Link
                href="/demo/admin/staff/balance"
                onClick={onLinkClick}
                className={`block px-3 py-1.5 text-[10px] uppercase tracking-wide ${
                  pathname === '/demo/admin/staff/balance' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Workload Balance
              </Link>
              <Link
                href="/demo/admin/staff/reports"
                onClick={onLinkClick}
                className={`block px-3 py-1.5 text-[10px] uppercase tracking-wide ${
                  pathname === '/demo/admin/staff/reports' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Compare Reports
              </Link>
              {staff && staff.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[9px] text-zinc-600 uppercase tracking-widest mt-1">
                    Individual
                  </div>
                  {staff.map(s => (
                    <Link
                      key={s._id}
                      href={`/demo/admin/staff/reports/${s._id}`}
                      onClick={onLinkClick}
                      className={`px-3 py-1.5 text-[10px] flex items-center gap-1.5 ${
                        pathname === `/demo/admin/staff/reports/${s._id}` ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.isOnline === true ? 'bg-green-500' : 'bg-zinc-600'}`} />
                      {s.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {navItems.slice(4).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/demo/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wide transition-colors ${
                isActive
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-zinc-800 space-y-2 mt-4">
        <Link href="/" className="flex items-center gap-2 text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-wide" onClick={onLinkClick}>
          <ArrowLeft size={12} /> Customer View
        </Link>
      </div>
    </div>
  );
}
