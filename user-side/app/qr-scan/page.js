"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import { useBranding } from "@/lib/useBranding";

export default function QRScanPage() {
  const router = useRouter();
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [Html5Qrcode, setHtml5Qrcode] = useState(null);
  const html5QrCodeRef = useRef(null);
  const [scannedNumber, setScannedNumber] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);

  // Dynamically import html5-qrcode to avoid SSR issues
  useEffect(() => {
    import('html5-qrcode').then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
    });
  }, []);

  useEffect(() => {
    if (Html5Qrcode) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
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
          qrbox: { width: 250, height: 250 }, // Use object format
          aspectRatio: 1.0,
          disableFlip: false,
          // Disable the default UI overlay
          showTorchButtonIfSupported: false,
          showZoomSliderIfSupported: false,
        },
        onScanSuccess,
        onScanFailure
      );

      // Aggressively remove all overlay elements
      setTimeout(() => {
        // Remove scan region
        const scanRegion = document.getElementById('qr-reader__scan_region');
        if (scanRegion) {
          scanRegion.remove();
        }
        
        // Remove all divs except video container
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
          const allDivs = qrReader.querySelectorAll('div');
          allDivs.forEach(div => {
            div.style.display = 'none';
            div.remove();
          });
          
          // Remove all canvas elements
          const allCanvas = qrReader.querySelectorAll('canvas');
          allCanvas.forEach(canvas => {
            canvas.style.display = 'none';
          });
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
        // Only stop if scanner is actually running
        if (state === 2) { // 2 = SCANNING state
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Silently handle stop errors
        console.log("Scanner stop:", err.message);
      }
    }
  };

  const onScanSuccess = (decodedText) => {
    // Extract table number from QR code
    // Expected format: https://yoursite.com/a/5 or just "5"
    let tableNumber = decodedText;
    
    // If it's a URL, extract the table number
    if (decodedText.includes('/a/')) {
      const parts = decodedText.split('/a/');
      tableNumber = parts[1];
    } else if (decodedText.includes('/auth/')) {
      const parts = decodedText.split('/auth/');
      tableNumber = parts[1];
    } else if (decodedText.includes('/m/')) {
      const parts = decodedText.split('/m/');
      tableNumber = parts[1];
    } else if (decodedText.includes('/menu/')) {
      const parts = decodedText.split('/menu/');
      tableNumber = parts[1];
    }

    // Stop scanner and show animation
    stopScanner();
    setScannedNumber(tableNumber);
    setShowAnimation(true);

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Navigate after animation
    setTimeout(() => {
      router.push(`/a/${tableNumber}`);
    }, 1500);
  };

  const onScanFailure = (error) => {
    // Ignore scan failures (happens continuously while scanning)
  };

  const handleManualEntry = () => {
    stopScanner();
    router.push('/?manual=true');
  };

  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[--bg] relative overflow-hidden">
      {/* Ambient background gradient */}
      <div className="absolute inset-0 bg-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 p-6 flex  justify-between">
        <Link href="/" className="w-10 h-10 rounded-none bg-[--card] border border-[--border] flex items-center justify-center hover:border-[--text-dim] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} className="text-[--text-primary]" />
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-8">
        {/* Top Section - Title */}
        <div className="w-full max-w-sm text-center pt-8">
          <h1 className="text-[28px] font-semibold text-[--text-primary] mb-3 tracking-tight">
            Scan Table QR
          </h1>
          <p className="text-[--text-muted] text-[15px] leading-relaxed">= just
            Position the QR code within the frame
          </p>
        </div>

        {/* Middle Section - Scanner Frame */}
        <div className="w-full max-w-sm">
          {/* Premium scanning frame with camera feed */}
          <div className="relative aspect-square w-full max-w-[280px] mx-auto">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[--primary]/20 blur-[60px] rounded-none scale-75 animate-pulse-soft" />
            
            {/* Main frame */}
            <div className="relative w-full h-full rounded-[32px] border-2 border-[--primary]/40 bg-[--card]/20 backdrop-blur-sm overflow-hidden">
              {/* Camera feed - positioned behind overlays */}
              <div id="qr-reader" className="absolute inset-0 w-full h-full" />
              
              {/* Animated scanning line */}
              {scanning && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-transparent animate-scan-smooth shadow-[0_0_20px_rgba(212,175,125,0.6)] z-10" />
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-6 p-4 bg-black/5 border border-black/10 rounded-none animate-fade-in">
              <p className="text-black text-[13px] text-center leading-relaxed">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Section - CTA */}
        <div className="w-full max-w-sm pb-8">
          <button
            onClick={handleManualEntry}
            className="w-full py-4 rounded-none border border-transparent transition-all active:scale-[0.98]"
          >
          </button>
        </div>
      </div>

      {/* Success Animation Overlay - Premium Apple Style */}
      {showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--bg]/80 backdrop-blur-xl animate-fade-in">
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[400px] h-[400px] bg-[--primary]/10 blur-[120px] rounded-none animate-pulse-soft" />
          </div>

          {/* Main content container */}
          <div className="relative">
            {/* Glassmorphic card with table number */}
            <div className="relative px-12 py-10 rounded-none bg-[--card]/40 backdrop-blur-2xl border border-[--border] shadow-none opacity-0 animate-spring-in">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 rounded-none bg-black pointer-events-none" />
              
              {/* Content */}
              <div className="relative text-center">
                {/* Success icon */}
                <div className="w-16 h-16 mx-auto mb-6 rounded-none bg-[--primary]/10 backdrop-blur-sm flex items-center justify-center opacity-0 animate-scale-bounce" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                  <svg className="w-8 h-8 text-[--primary]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Table label */}
                <div className="mb-3 opacity-0 animate-fade-slide-up" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
                  <p className="text-[--text-muted] text-xs tracking-[0.2em] uppercase font-medium">
                    Table
                  </p>
                </div>

                {/* Table number - hero element */}
                <div className="mb-6 opacity-0 animate-number-spring" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                  <div className="text-[72px] font-luxury font-light text-[--primary] leading-none tracking-tight">
                    {scannedNumber}
                  </div>
                </div>

                {/* Loading indicator */}
                <div className="flex justify-center opacity-0 animate-fade-in" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
                  <div className="loader"></div>
                </div>
              </div>
            </div>

            {/* Floating particles for depth */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-none bg-[--primary]/30 animate-float-particle"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
