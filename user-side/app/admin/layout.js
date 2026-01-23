'use client';

import './admin.css';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { useNotificationAlert } from '@/lib/useNotificationAlert';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Grid3X3, Calendar, MapPin, QrCode, BarChart3, Users, ChevronDown, Check, ArrowLeft, LogOut, Settings, Palette } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'ORDERS', icon: ClipboardList },
  { href: '/admin/menu', label: 'MENU', icon: UtensilsCrossed },
  { href: '/admin/tables', label: 'TABLES', icon: Grid3X3 },
  { href: '/admin/reservations', label: 'RESERVATIONS', icon: Calendar },
  { href: '/admin/zones', label: 'ZONES', icon: MapPin },
  { href: '/admin/qr-codes', label: 'QR CODES', icon: QrCode },
  { href: '/admin/reports', label: 'REPORTS', icon: BarChart3 },
  { href: '/admin/theme', label: 'THEME', icon: Palette },
  { href: '/admin/settings', label: 'SETTINGS', icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { isAuthenticated, loading, logout } = useAdminAuth();
  const [staffOpen, setStaffOpen] = useState(false);
  const staff = useQuery(api.staff.listActive);
  const pendingCalls = useQuery(api.staffCalls.listPending);
  const orders = useQuery(api.orders.list);
  const settings = useQuery(api.settings.getAll);
  const logoUrl = useQuery(
    api.files.getUrl,
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );

  // Get branding from settings
  const brandName = settings?.brandName || "BTS DISC";
  const brandLogo = logoUrl || settings?.brandLogo || "/logo.png";

  // Get pending/new orders
  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

  // Sound + vibration + push notification alert for new orders/calls
  const totalAlerts = (pendingCalls?.length || 0) + pendingOrders.length;
  useNotificationAlert(totalAlerts, {
    title: '🔔 New Activity',
    body: `${pendingCalls?.length || 0} calls, ${pendingOrders.length} orders pending`
  });

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <div className="admin-dark min-h-screen bg-[--bg] text-[--text-primary] font-mono">{children}</div>;
  }

  if (loading) {
    return (
      <div className="admin-dark min-h-screen bg-[--bg] flex items-center justify-center text-[--text-primary] font-mono">
        LOADING...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="admin-dark min-h-screen bg-[--bg] text-[--text-primary] font-mono">{children}</div>;
  }

  const isStaffActive = pathname.startsWith('/admin/staff');

  return (
    <div className="admin-dark min-h-screen bg-[--bg] text-[--text-primary] font-mono flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[--card] border-r border-[--border] min-h-screen p-4 flex flex-col">
        <div className="mb-6 pb-4 border-b border-[--border]">
          <div className="flex items-center gap-3 mb-2">
            <img src={brandLogo} alt={brandName} className="h-8 w-8 rounded-xl object-contain" />
            <div>
              <h1 className="text-sm font-bold text-[--text-primary] tracking-tight">{brandName}</h1>
              <p className="text-[10px] text-[--primary] uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Live Activity Section */}
        <div className="mb-4 pb-4 border-b border-[--border]">
          <p className="text-[9px] text-[--text-muted] uppercase tracking-widest mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live Activity
          </p>
          
          {/* Pending Calls */}
          {pendingCalls && pendingCalls.length > 0 && (
            <Link href="/admin/calls" className="block mb-2">
              <div className="bg-[--primary]/10 border border-[--primary]/20 rounded-lg p-2 hover:bg-[--primary]/15 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[--primary] text-[10px] font-bold uppercase">Staff Calls</span>
                  <span className="text-[--primary] font-bold">{pendingCalls.length}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {pendingCalls.slice(0, 3).map(call => (
                    <p key={call._id} className="text-[9px] text-[--text-muted] truncate">
                      T{call.tableNumber}: {call.reason || 'Assistance'}
                    </p>
                  ))}
                  {pendingCalls.length > 3 && (
                    <p className="text-[9px] text-[--text-muted]">+{pendingCalls.length - 3} more</p>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <Link href="/admin/orders" className="block">
              <div className="bg-[--primary]/10 border border-[--primary]/20 rounded-lg p-2 hover:bg-[--primary]/15 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[--primary] text-[10px] font-bold uppercase">New Orders</span>
                  <span className="text-[--primary] font-bold">{pendingOrders.length}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {pendingOrders.slice(0, 3).map(order => (
                    <p key={order._id} className="text-[9px] text-[--text-muted] truncate">
                      T{order.tableId}: ₹{order.total} ({order.items.length} items)
                    </p>
                  ))}
                  {pendingOrders.length > 3 && (
                    <p className="text-[9px] text-[--text-muted]">+{pendingOrders.length - 3} more</p>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* All Clear */}
          {(!pendingCalls || pendingCalls.length === 0) && pendingOrders.length === 0 && (
            <div className="text-center py-2 text-[--text-muted] text-[10px] flex items-center justify-center gap-1">
              <Check size={12} /> All clear
            </div>
          )}
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs uppercase tracking-wide transition-colors ${
                  isActive
                    ? 'bg-[--primary] text-[--bg] font-bold'
                    : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]'
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
              onClick={() => setStaffOpen(!staffOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs uppercase tracking-wide transition-colors ${
                isStaffActive
                  ? 'bg-[--primary] text-[--bg] font-bold'
                  : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={14} />
                <span>STAFF</span>
              </div>
              <ChevronDown size={12} className={`transition-transform ${staffOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {staffOpen && (
              <div className="ml-4 border-l border-[--border] mt-1">
                <Link
                  href="/admin/staff"
                  className={`block px-3 py-1.5 text-[10px] uppercase tracking-wide ${
                    pathname === '/admin/staff' ? 'text-[--primary] font-bold' : 'text-[--text-muted] hover:text-[--text-primary]'
                  }`}
                >
                  Manage Staff
                </Link>
                <Link
                  href="/admin/staff/balance"
                  className={`block px-3 py-1.5 text-[10px] uppercase tracking-wide ${
                    pathname === '/admin/staff/balance' ? 'text-[--primary] font-bold' : 'text-[--text-muted] hover:text-[--text-primary]'
                  }`}
                >
                  Workload Balance
                </Link>
                <Link
                  href="/admin/staff/reports"
                  className={`block px-3 py-1.5 text-[10px] uppercase tracking-wide ${
                    pathname === '/admin/staff/reports' ? 'text-[--primary] font-bold' : 'text-[--text-muted] hover:text-[--text-primary]'
                  }`}
                >
                  Compare Reports
                </Link>
                {staff && staff.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[9px] text-[--text-dim] uppercase tracking-widest mt-1">
                      Individual
                    </div>
                    {staff.map(s => (
                      <Link
                        key={s._id}
                        href={`/admin/staff/reports/${s._id}`}
                        className={`px-3 py-1.5 text-[10px] flex items-center gap-1.5 ${
                          pathname === `/admin/staff/reports/${s._id}` ? 'text-[--primary] font-bold' : 'text-[--text-muted] hover:text-[--text-primary]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.isOnline === true ? 'bg-green-500' : 'bg-[--text-dim]'}`} />
                        {s.name}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {navItems.slice(4).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs uppercase tracking-wide transition-colors ${
                  isActive
                    ? 'bg-[--primary] text-[--bg] font-bold'
                    : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[--border] space-y-2">
          <Link href="/" className="flex items-center gap-2 text-[10px] text-[--text-muted] hover:text-[--text-primary] uppercase tracking-wide">
            <ArrowLeft size={12} /> Customer View
          </Link>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 text-left text-[10px] text-[--text-muted] hover:text-[--text-primary] uppercase tracking-wide"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
