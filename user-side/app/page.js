"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";
import { useBranding } from "@/lib/useBranding";
import { ChevronRight, History, ScanLine } from "lucide-react";
import { isRestaurantOpen } from "@/components/ClosedPopup";

export default function Home() {
  const router = useRouter();
  const { sessionId } = useSession();
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();

  const activeOrder = useQuery(
    api.orders.getActiveBySession,
    sessionId ? { sessionId } : "skip"
  );
  const hasOrders = useQuery(
    api.orders.hasOrders,
    sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    if (activeOrder) {
      router.replace(`/my-orders`);
    }
  }, [activeOrder, router]);

  const handleScanQR = () => {
    router.push('/qr-scan');
  };

  const handleDismissClosed = () => {
    sessionStorage.setItem('closed-popup-dismissed', 'true');
  };

  // Show loading while branding loads
  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="loader" />
      </div>
    );
  }

  // COMMENTED OUT: Full screen closed alert (restaurant always open now)
  /*
  if (!isRestaurantOpen()) {
    const now = new Date();
    const hour = now.getHours();
    const OPEN_HOUR = 12;
    let hoursUntilOpen = hour < OPEN_HOUR ? OPEN_HOUR - hour : (24 - hour) + OPEN_HOUR;

    return (
      <div className="min-h-screen flex flex-col">
        <div className="p-5 flex items-center justify-center opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt={brandName} className="h-9 w-9 rounded-none object-contain" />
            <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">{brandName}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
          <div 
            className="px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-bounce-in bg-black/5 text-black border border-black/10"
            style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-none bg-current mr-2 animate-pulse-soft" />
            Currently Closed
          </div>
          <div className="text-center mb-10">
            <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-4 opacity-0 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
              Business Hours
            </p>
            <div className="flex items-center gap-5">
              <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-left" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
                12 PM
              </span>
              <span className="text-[--text-dim] text-2xl opacity-0 animate-scale-in" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
                →
              </span>
              <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-right" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
                11 PM
              </span>
            </div>
          </div>
          <div className="divider-glow w-24 mb-10 opacity-0 animate-expand" style={{animationDelay: '0.7s', animationFillMode: 'forwards'}} />
          <div className="text-center opacity-0 animate-slide-up" style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}>
            <p className="text-[--text-primary] text-xl font-luxury">Opens in ~{hoursUntilOpen}h</p>
            <p className="text-[--text-muted] text-sm mt-1">Open daily</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <Link 
            href="/book"
            className="btn-primary w-full py-4 rounded-none text-sm font-medium opacity-0 animate-slide-up block text-center"
            style={{animationDelay: '0.9s', animationFillMode: 'forwards'}}
          >
            Book for Future
          </Link>
          <Link 
            href="/staff"
            className="block w-full py-3 text-center text-[--text-muted] text-sm hover:text-[--text-primary] transition-colors opacity-0 animate-slide-up"
            style={{animationDelay: '1s', animationFillMode: 'forwards'}}
          >
            Staff Portal
          </Link>
        </div>
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen flex flex-col bg-[--bg]">
      {/* Header */}
      <div className="p-6 flex items-center justify-between opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
        <div className="flex items-center gap-2.5">
          <img src={brandLogo} alt={brandName} className=" w-14 rounded-none object-contain opacity-90" />
          <span className="text-[--text-dim] text-[11px] tracking-[0.2em] uppercase font-medium">{brandName}</span>
        </div>
        {hasOrders && (
          <Link href="/my-orders" className="text-[--text-dim] hover:text-[--primary] transition-colors">
            <History size={18} strokeWidth={1.5} />
          </Link>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-16 opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
            <h1 className="text-[32px] leading-tight font-luxury font-medium text-[--text-primary] mb-3 tracking-tight">
              Welcome back
            </h1>
            <p className="text-[--text-muted] text-[15px] leading-relaxed">
              Scan the QR code on your table to get started
            </p>
          </div>

          {/* Scan QR Button */}
          <button
            onClick={handleScanQR}
            className="w-full text-left p-6 rounded-none bg-[--card] border border-[--border] hover:border-[--text-dim] transition-all duration-200 active:scale-[0.99] opacity-0 animate-slide-up"
            style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-none bg-[--bg] flex items-center justify-center">
                  <ScanLine size={20} className="text-[--text-primary]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[--text-primary] font-medium text-[15px] mb-0.5">Scan QR Code</div>
                  <div className="text-[--text-dim] text-[13px]">Scan the code on your table</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[--text-dim]" strokeWidth={1.5} />
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
        <Link 
          href="/admin/login" 
          className="text-[--text-dim] hover:text-[--text-primary] text-[12px] tracking-[0.05em] transition-colors"
        >
          Staff Login
        </Link>
      </div>
    </div>
  );
}
