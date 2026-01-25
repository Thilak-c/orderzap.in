"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";
import { useBranding } from "@/lib/useBranding";
import { ChevronRight, History, ScanLine, X } from "lucide-react";
import { isRestaurantOpen } from "@/components/ClosedPopup";

export default function Home() {
  const router = useRouter();
  const { sessionId } = useSession();
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [Html5Qrcode, setHtml5Qrcode] = useState(null);
  const html5QrCodeRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);

  const activeOrder = useQuery(
    api.orders.getActiveBySession,
    sessionId ? { sessionId } : "skip"
  );
  const hasOrders = useQuery(
    api.orders.hasOrders,
    sessionId ? { sessionId } : "skip"
  );

  // Removed auto-redirect to /my-orders when activeOrder exists

  // Dynamically import html5-qrcode and auto-open scanner
  useEffect(() => {
    import('html5-qrcode').then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
    });
  }, []);

  // Auto-open scanner when Html5Qrcode is loaded
  useEffect(() => {
    if (Html5Qrcode) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        startScanner();
      }, 100);
    }
  }, [Html5Qrcode]);

  const startScanner = async () => {
    if (!Html5Qrcode) return;

    try {
      setScanning(true);
      setError("");

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        onScanSuccess,
        onScanFailure
      );

      // Hide only the corner borders and overlays, not the video
      setTimeout(() => {
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
          // Hide scan region box and dashboard
          const scanRegion = qrReader.querySelector('#qr-shaded-region');
          if (scanRegion) scanRegion.style.display = 'none';
          
          const dashboard = qrReader.querySelector('#html5-qrcode-button-camera-permission, #html5-qrcode-button-camera-start, #html5-qrcode-button-camera-stop');
          if (dashboard) dashboard.style.display = 'none';
        }
      }, 100);
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Unable to access camera. Please check permissions.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.log("Scanner stop:", err.message);
      }
    }
  };

  const onScanSuccess = (decodedText) => {
    stopScanner();
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Check if it's a full URL or just a table number
    if (decodedText.includes('/a/')) {
      // It's our auth URL - extract the path and navigate
      try {
        const url = new URL(decodedText);
        router.push(url.pathname); // Navigate to /a/[tableId]
      } catch {
        // If URL parsing fails, try to extract table number
        const parts = decodedText.split('/a/');
        const tableNumber = parts[1]?.split('?')[0].split('/')[0];
        if (tableNumber) {
          router.push(`/a/${tableNumber}`);
        }
      }
    } else if (decodedText.includes('/auth/')) {
      // Legacy auth URL
      const parts = decodedText.split('/auth/');
      const tableNumber = parts[1]?.split('?')[0].split('/')[0];
      if (tableNumber) {
        router.push(`/a/${tableNumber}`);
      }
    } else if (decodedText.includes('/m/') || decodedText.includes('/menu/')) {
      // Legacy menu URL - extract table number and go to auth
      const parts = decodedText.split(/\/m\/|\/menu\//);
      const tableNumber = parts[1]?.split('?')[0].split('/')[0];
      if (tableNumber) {
        router.push(`/a/${tableNumber}`);
      }
    } else {
      // Just a table number
      router.push(`/a/${decodedText}`);
    }
  };

  const closeSidebar = () => {
    setSidebarClosing(true);
    setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, 300);
  };

  const onScanFailure = (error) => {
    // Ignore scan failures
  };

  const handleScanQR = () => {
    setShowScanner(true);
    setTimeout(() => {
      startScanner();
    }, 100);
  };

  const handleCloseScanner = () => {
    stopScanner();
    setShowScanner(false);
    setScanning(false);
    setError("");
  };

  const handleDismissClosed = () => {
    sessionStorage.setItem('closed-popup-dismissed', 'true');
  };

  // Show loading while branding loads
  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <img className="w-14" src="/assets/logos/favicon_io/android-chrome-192x192.png" alt="" />
        <div className="loader-2" />
      </div>
    );
  }

  // Full screen closed alert
  // if (!isRestaurantOpen()) {
  //   const now = new Date();
  //   const hour = now.getHours();
  //   const OPEN_HOUR = 12;
  //   let hoursUntilOpen = hour < OPEN_HOUR ? OPEN_HOUR - hour : (24 - hour) + OPEN_HOUR;

  //   return (
  //     <div className="min-h-screen flex flex-col">
  //       <div className="p-5 flex items-center justify-center opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
  //         <div className="flex items-center gap-3">
  //           <img src="/assets/logos/logo-black.png" alt="Order Zap" className="h-9 w-9 rounded-full object-contain" />
  //                    <span className="text-[--text-dim] text-[11px] tracking-[0.2em]  font-bold">| Order Zap <p className="text-[10px] font-thin" >| How Patna Order's</p></span>

  //         </div>
  //       </div>
  //       <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
  //         <div 
  //           className="px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-bounce-in bg-amber-500/10 text-amber-400 border border-amber-500/20"
  //           style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
  //         >
  //           <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse-soft" />
  //           Currently Closed
  //         </div>
  //         <div className="text-center mb-10">
  //           <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-4 opacity-0 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
  //             Business Hours
  //           </p>
  //           <div className="flex items-center gap-5">
  //             <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-left" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
  //               12 PM
  //             </span>
  //             <span className="text-[--text-dim] text-2xl opacity-0 animate-scale-in" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
  //               →
  //             </span>
  //             <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-right" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
  //               11 PM
  //             </span>
  //           </div>
  //         </div>
  //         <div className="divider-glow w-24 mb-10 opacity-0 animate-expand" style={{animationDelay: '0.7s', animationFillMode: 'forwards'}} />
  //         <div className="text-center opacity-0 animate-slide-up" style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}>
  //           <p className="text-[--text-primary] text-xl font-luxury">Opens in ~{hoursUntilOpen}h</p>
  //           <p className="text-[--text-muted] text-sm mt-1">Open daily</p>
  //         </div>
  //       </div>
  //       <div className="p-6 space-y-3">
  //         <Link 
  //           href="/book"
  //           className="btn-primary w-full py-4 rounded-xl text-sm font-medium opacity-0 animate-slide-up block text-center"
  //           style={{animationDelay: '0.9s', animationFillMode: 'forwards'}}
  //         >
  //           Book for Future
  //         </Link>
  //         <Link 
  //           href="/staff"
  //           className="block w-full py-3 text-center text-[--text-muted] text-sm hover:text-[--text-primary] transition-colors opacity-0 animate-slide-up"
  //           style={{animationDelay: '1s', animationFillMode: 'forwards'}}
  //         >
  //           Staff Portal
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex flex-col bg-[--bg]">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className={`fixed inset-0 bg-black/50 z-50 ${sidebarClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
          onClick={closeSidebar}
        >
          <div 
            className={`w-64 h-full bg-white shadow-2xl ${sidebarClosing ? 'animate-slide-out-left' : 'animate-slide-in-left'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar Header */}
            <div className="p- border-b border-[--border] flex items-center justify-between">
              <div className="flex items-center gap-">
                <img src="/assets/logos/logo_full.png" alt="OrderZap" className="" />
                {/* <span className="text-lg font-bold text-[--primary]">OrderZap</span> */}
              </div>
           
            </div>

            {/* Sidebar Menu */}
            <nav className="p-4 space-y-2">
              <Link
                href="/"
                onClick={closeSidebar}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--bg-elevated] transition-colors"
              >
                <Image src="/assets/icons/qr-scan.png" alt="Scan QR" width={28} height={28} />
                <span className="text-sm font-medium">Scan QR Code</span>
              </Link>

              <Link
                href="/book"
                onClick={closeSidebar}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--bg-elevated] transition-colors"
              >
                <Image src="/assets/icons/book-table.png" alt="Book Table" width={28} height={28} />
                <span className="text-sm font-medium">Book a Table</span>
              </Link>
 <button
                onClick={closeSidebar}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--bg-elevated] transition-colors w-full text-left"
              >
                <Image src="/assets/icons/takeaway-order.png" alt="Takeaway" width={28} height={28} />
                <span className="text-sm font-medium">Takeaway Order</span>
              </button>

              <button
                onClick={closeSidebar}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--bg-elevated] transition-colors w-full text-left"
              >
                <Image src="/assets/icons/order-online.png" alt="Order Online" width={28} height={28} />
                <span className="text-sm font-medium">Order Online</span>
              </button>
              {hasOrders && (
                <Link
                  href="/my-orders"
                  onClick={closeSidebar}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--bg-elevated] transition-colors"
                >
                  <Image src="/assets/icons/my-orders.png" alt="My Orders" width={28} height={28} />
                  <span className="text-sm font-medium">My Orders</span>
                </Link>
              )}

              <button
                onClick={closeSidebar}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--bg-elevated] transition-colors w-full text-left"
              >
                <Image src="/assets/icons/help.png" alt="Help" width={28} height={28} />
                <span className="text-sm font-medium">Help</span>
              </button>

             
            </nav>

            {/* Sidebar Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[--border]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-[--text-muted]">Powered by</span>
                <Image 
                  src="/assets/logos/orderzap-logo.png" 
                  alt="OrderZap" 
                  width={90} 
                  height={28}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3 flex items-center justify-between opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 flex flex-col items-center justify-center gap-1"
        >
          <span className="w-5 h-0.5 bg-[--text-primary] rounded-full"></span>
          <span className="w-5 h-0.5 bg-[--text-primary] rounded-full"></span>
          <span className="w-5 h-0.5 bg-[--text-primary] rounded-full"></span>
        </button>

        {hasOrders && (
          <Link href="/my-orders" className="text-[--text-muted] hover:text-[--primary] transition-colors">
            <History size={18} />
          </Link>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo Circle */}
          <div className="flex justify-center mb-4 opacity-0 animate-slide-up" style={{animationDelay: '0.15s', animationFillMode: 'forwards'}}>
            <div className="w-20 h-20 rounded-full bg-[--primary] flex items-center justify-center shadow-lg">
              <img src="/assets/logos/favicon_io/android-chrome-192x192.png" alt="OrderZap" className="w-16 h-16" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-4 opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
            <h1 className="text-2xl font-bold text-[--text-primary] mb-2">
              Ready to Order?
            </h1>
            <p className="text-sm text-[--text-muted]">
              Scan the QR code on your table
            </p>
          </div>

          {/* Inline Scanner Square */}
          <div className="opacity-0 animate-slide-up mb-4" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
            <div className="relative w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden border-4 border-[--primary] shadow-xl bg-black">
              <div id="qr-reader" className="w-full h-full" />
              
              {error && (
                <div className="absolute bottom-3 left-3 right-3 p-2 bg-red-500/90 rounded-lg animate-slide-up">
                  <p className="text-white text-xs text-center font-medium">{error}</p>
                </div>
              )}
              
              {!error && scanning && (
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white/90 text-xs text-center font-medium bg-black/50 backdrop-blur-sm py-1.5 px-3 rounded-lg">
                    Position QR code in frame
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
        <Link 
          href="/admin/login" 
          className="text-[--text-muted] hover:text-[--text-primary] text-xs transition-colors"
        >
          Staff Login
        </Link>
      </div>

      {/* Partner Restaurants - Flowing Wave */}
      <div className="relative py-8 overflow-hidden bg-gradient-to-b from-white to-[--bg-elevated]">
    
        
        <div className="relative h-32">
          <div className="absolute inset-0 flex items-center animate-wave-flow">
            <div className="flex gap-16 whitespace-nowrap">
              <span className="text-5xl font-serif italic text-[--primary] opacity-80">Bts Disc</span>
              <span className="text-5xl tracking-widest text-[--primary] opacity-80" style={{ fontFamily: 'Georgia, serif' }}>Magnet Cafe</span>
              <span className="text-5xl font-bold text-[--primary] opacity-80" style={{ fontFamily: 'Impact, sans-serif' }}>Hunter Biryani</span>
            </div>
            <div className="flex gap-16 whitespace-nowrap ml-16">
              <span className="text-5xl font-serif italic text-[--primary] opacity-80">Bts Disc</span>
              <span className="text-5xl tracking-widest text-[--primary] opacity-80" style={{ fontFamily: 'Georgia, serif' }}>Magnet Cafe</span>
              <span className="text-5xl font-bold text-[--primary] opacity-80" style={{ fontFamily: 'Impact, sans-serif' }}>Hunter Biryani</span>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center animate-wave-flow-slow" style={{ top: '60px' }}>
            <div className="flex gap-16 whitespace-nowrap">
              <span className="text-4xl tracking-widest text-[--text-muted] opacity-50" style={{ fontFamily: 'Georgia, serif' }}>Magnet Cafe</span>
              <span className="text-4xl font-bold text-[--text-muted] opacity-50" style={{ fontFamily: 'Impact, sans-serif' }}>Hunter Biryani</span>
              <span className="text-4xl font-serif italic text-[--text-muted] opacity-50">Bts Disc</span>
            </div>
            <div className="flex gap-16 whitespace-nowrap ml-16">
              <span className="text-4xl tracking-widest text-[--text-muted] opacity-50" style={{ fontFamily: 'Georgia, serif' }}>Magnet Cafe</span>
              <span className="text-4xl font-bold text-[--text-muted] opacity-50" style={{ fontFamily: 'Impact, sans-serif' }}>Hunter Biryani</span>
              <span className="text-4xl font-serif italic text-[--text-muted] opacity-50">Bts Disc</span>
            </div>
          </div>

          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10"></div>
        </div>
      </div>

 
    </div>
  );             
}
