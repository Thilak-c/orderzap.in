"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useRestaurant } from "@/lib/restaurant";
import { useBranding } from "@/app/r/[restaurantId]/layout";
import { useSession } from "@/lib/session";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { History, ScanLine } from "lucide-react";

export default function RestaurantHome() {
  const router = useRouter();
  const params = useParams();
  const { restaurant, isLoading } = useRestaurant();
  const { brandName, brandLogo } = useBranding();
  const { sessionId } = useSession();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [Html5Qrcode, setHtml5Qrcode] = useState(null);

  const hasOrders = useQuery(
    api.orders.hasOrders,
    sessionId ? { sessionId } : "skip"
  );

  // Dynamically import html5-qrcode
  useEffect(() => {
    import('html5-qrcode').then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
    });
  }, []);

  // Auto-open scanner when Html5Qrcode is loaded and restaurant is active
  useEffect(() => {
    if (Html5Qrcode && restaurant?.active) {
      // Increase delay to ensure DOM is ready
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  }, [Html5Qrcode, restaurant?.active]);

  const startScanner = async () => {
    if (!Html5Qrcode) return;

    // Wait for element to be available
    const qrReaderElement = document.getElementById("qr-reader");
    if (!qrReaderElement) {
      console.error("QR reader element not found, retrying...");
      setTimeout(startScanner, 200);
      return;
    }

    try {
      setScanning(true);
      setError("");

      const html5QrCode = new Html5Qrcode("qr-reader");

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => onScanSuccess(decodedText, html5QrCode),
        () => {} // Ignore scan failures
      );

      // Hide scan region box
      setTimeout(() => {
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
          const scanRegion = qrReader.querySelector('#qr-shaded-region');
          if (scanRegion) scanRegion.style.display = 'none';
        }
      }, 100);
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Unable to access camera. Please check permissions.");
      setScanning(false);
    }
  };

  const onScanSuccess = async (decodedText, html5QrCode) => {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (err) {
      console.log("Scanner stop:", err);
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Extract table number from QR code
    let tableNumber;
    if (decodedText.includes('/t/')) {
      const parts = decodedText.split('/t/');
      tableNumber = parts[1]?.split('?')[0].split('/')[0];
    } else {
      tableNumber = decodedText;
    }

    if (tableNumber) {
      router.push(`/r/${params.restaurantId}/t/${tableNumber}`);
    }
  };

  if (isLoading) {
    // Calculate character length for animation
    const nameLength = brandName?.length || 8;
    const themeColor = restaurant?.themeColors?.darkVibrant || '#EF4444';
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg] gap-">
        {brandLogo && (
          <img 
            className="w-16 h-16 rounded-full object-cover" 
            src={brandLogo} 
            alt={brandName} 
          />
        )}
        <div 
          className="loader-4" 
          style={{ 
            '--name-length': nameLength,
            textShadow: `0 0 0 #000, ${nameLength}ch 0 0 #000`,
            background: `linear-gradient(${themeColor} 0 0) bottom left/0% 3px no-repeat`,
          }}
        >
          {brandName}
        </div>
        <style jsx>{`
          .loader-4 {
            animation: loader-anim-${nameLength} 1.5s infinite;
          }
          @keyframes loader-anim-${nameLength} {
            80% {
              text-shadow: 0 0 0 #000, ${nameLength}ch 0 0 #000;
              background-size: 100% 3px;
            }
            100% {
              text-shadow: -${nameLength}ch 0 0 #000, 0 0 0 #000;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg] px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[--text-primary] mb-2">Restaurant Not Found</h1>
          <p className="text-[--text-muted]">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Check if restaurant exists and is closed
  if (restaurant && !restaurant.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg] px-6">
       <img className="h-[200px]" src="/assets/icons/currently-closed.png" alt="" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[--bg]">
      {/* Header */}
      <div className="p-3 flex items-center justify-between opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>

        {hasOrders && (
          <Link href={`/r/${params.restaurantId}/my-orders`} className="text-[--text-muted] hover:text-[--primary] transition-colors">
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
              {brandLogo && (
                <img src={brandLogo} alt={brandName} className="w-16 h-16 rounded-full object-cover" />
              )}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                      <ScanLine size={32} className="text-white" />
                    </div>
                    <p className="text-white text-sm font-medium mb-2">Camera Access Required</p>
                    <p className="text-white/70 text-xs mb-6">Please allow camera access to scan QR codes</p>
                    <button
                      onClick={startScanner}
                      className="btn-primary w-full py-3 rounded-xl text-sm font-semibold"
                    >
                      Grant Access
                    </button>
                  </div>
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
          href={`/r/${params.restaurantId}/admin`}
          className="text-[--text-muted] hover:text-[--text-primary] text-xs transition-colors"
        >
          Staff Login
        </Link>
      </div>
    </div>
  );
}
