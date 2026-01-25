'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useBranding } from '@/lib/useBranding';

// Business hours: 12 PM (12:00) to 11 PM (23:00)
const OPEN_HOUR = 12;  // 12 PM
const CLOSE_HOUR = 23; // 11 PM

export function isRestaurantOpen() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR;
}

export function ClosedPopup({ tableId }) {
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Check if already dismissed this session
    const wasDismissed = sessionStorage.getItem('closed-popup-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
    setIsOpen(isRestaurantOpen());
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
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

  // Don't show if open or dismissed
  if (isOpen || dismissed) return null;

  const now = new Date();
  const hour = now.getHours();
  
  // Calculate time until open
  let hoursUntilOpen;
  if (hour < OPEN_HOUR) {
    hoursUntilOpen = OPEN_HOUR - hour;
  } else {
    // After closing, opens next day at 12 PM
    hoursUntilOpen = (24 - hour) + OPEN_HOUR;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-5 flex items-center justify-between opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt={brandName} className="h-9 w-9 rounded-full object-contain" />
          <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">{brandName}</span>
        </div>
        {tableId && (
          <span className="text-[--text-dim] text-xs flex items-center gap-2">
            <span className="tracking-wider">TABLE {tableId}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
        {/* Status Badge */}
        <div 
          className="px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-bounce-in bg-amber-500/10 text-amber-400 border border-amber-500/20"
          style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2" />
          Currently Closed
        </div>

        {/* Icon */}
        <div 
          className="w-20 h-20 rounded-full bg-[--primary]/10 flex items-center justify-center mb-8 opacity-0 animate-scale-in"
          style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}
        >
          <Clock size={36} className="text-[--primary]" />
        </div>

        {/* Message */}
        <div className="text-center mb-8 opacity-0 animate-fade-in" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
          <h2 className="text-2xl font-luxury font-semibold text-[--text-primary] mb-2">
            We're Resting
          </h2>
          <p className="text-[--text-muted] text-sm">
            Our kitchen is closed right now
          </p>
        </div>

        {/* Divider */}
        <div className="divider-glow w-24 mb-8 opacity-0 animate-expand" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}} />

        {/* Time Display */}
        <div className="text-center mb-8">
          <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-4 opacity-0 animate-fade-in" style={{animationDelay: '0.7s', animationFillMode: 'forwards'}}>
            Business Hours
          </p>
          <div className="flex items-center gap-5">
            <span className="text-4xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-left" style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}>
              12:00
            </span>
            <span className="text-[--text-dim] text-xl opacity-0 animate-scale-in" style={{animationDelay: '0.9s', animationFillMode: 'forwards'}}>
              →
            </span>
            <span className="text-4xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-right" style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}>
              23:00
            </span>
          </div>
          <p className="text-[--text-dim] text-xs mt-2 opacity-0 animate-fade-in" style={{animationDelay: '1s', animationFillMode: 'forwards'}}>
            Open Daily
          </p>
        </div>

        {/* Opens in */}
        <div 
          className="px-4 py-2 rounded-lg bg-[--primary]/5 border border-[--primary]/10 opacity-0 animate-fade-in"
          style={{animationDelay: '1.1s', animationFillMode: 'forwards'}}
        >
          <p className="text-[--primary] text-sm font-medium">
            Opens in ~{hoursUntilOpen} hour{hoursUntilOpen !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button 
          onClick={handleDismiss}
          className="btn-primary w-full py-4 rounded-xl text-sm font-medium opacity-0 animate-slide-up"
          style={{animationDelay: '1.2s', animationFillMode: 'forwards'}}
        >
          Browse Menu Anyway
        </button>
        <Link 
          href="/"
          className="block w-full py-3 text-center text-[--text-muted] text-sm hover:text-[--text-primary] transition-colors opacity-0 animate-slide-up"
          style={{animationDelay: '1.3s', animationFillMode: 'forwards'}}
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
