import Link from "next/link";
import { ScanLine, Lock } from "lucide-react";

export default function QRAccessDenied() {
  return (
    <div className="min-h-screen flex flex-col bg-[--bg]">
      {/* Header */}
      <div className="p-5 flex items-center justify-center opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
        <div className="flex items-center gap-3">
          <img src="/assets/logos/favicon_io/android-chrome-192x192.png" alt="OrderZap" className="h-9 w-9 rounded-full object-contain" />
          <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">OrderZap</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
        {/* Icon */}
        <div 
          className="w-20 h-20 rounded-full bg-[--primary]/10 border border-[--primary]/20 flex items-center justify-center mx-auto mb-6 opacity-0 animate-bounce-in"
          style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
        >
          <Lock size={32} className="text-[--primary]" />
        </div>

        {/* Message */}
        <div className="text-center mb-8 opacity-0 animate-slide-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
          <h1 className="text-2xl font-luxury font-semibold text-[--text-primary] mb-3">
            QR Scan Required
          </h1>
          <p className="text-[--text-muted] text-sm mb-2">
            Please scan the QR code on your table to access the menu
          </p>
          <p className="text-[--text-dim] text-xs">
            This ensures you get the right menu for your location
          </p>
        </div>

        <div className="divider-glow w-24 mb-8 opacity-0 animate-expand" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}} />

        {/* Instructions */}
        <div className="w-full max-w-xs space-y-4 mb-8 opacity-0 animate-slide-up" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[--card] border border-[--border]">
            <div className="w-8 h-8 rounded-full bg-[--primary]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[--primary] font-semibold text-sm">1</span>
            </div>
            <div>
              <p className="text-[--text-primary] text-sm font-medium mb-1">Find the QR Code</p>
              <p className="text-[--text-dim] text-xs">Look for the QR code on your table</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[--card] border border-[--border]">
            <div className="w-8 h-8 rounded-full bg-[--primary]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[--primary] font-semibold text-sm">2</span>
            </div>
            <div>
              <p className="text-[--text-primary] text-sm font-medium mb-1">Scan with Camera</p>
              <p className="text-[--text-dim] text-xs">Use your phone camera or the button below</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[--card] border border-[--border]">
            <div className="w-8 h-8 rounded-full bg-[--primary]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[--primary] font-semibold text-sm">3</span>
            </div>
            <div>
              <p className="text-[--text-primary] text-sm font-medium mb-1">Browse & Order</p>
              <p className="text-[--text-dim] text-xs">Access valid for 2 hours</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full max-w-xs opacity-0 animate-slide-up" style={{animationDelay: '0.7s', animationFillMode: 'forwards'}}>
          <Link 
            href="/"
            className="btn-primary w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ScanLine size={18} />
            Scan QR Code
          </Link>
        </div>
      </div>
    </div>
  );
}
