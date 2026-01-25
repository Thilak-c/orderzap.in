'use client';
import { useState, useEffect } from 'react';

// Animated popup wrapper with enter/exit animations
export function AnimatedPopup({ show, onClose, children, className = '' }) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to trigger enter animation
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      // Wait for exit animation before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div 
        className={`${className} transition-all duration-300 ${isAnimating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Bottom sheet popup with slide animation
export function AnimatedBottomSheet({ show, onClose, children, maxHeight = '50vh' }) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-[--card] rounded-t-3xl p-6 border-t border-[--border] transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight, paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[--border] rounded-full mx-auto mb-5" />
        {children}
      </div>
    </div>
  );
}

// Toast notification with slide animation
export function AnimatedToast({ show, onClose, children, className = '', bottomClass = 'bottom-4' }) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed ${bottomClass} left-4 right-4 z-50 transition-all duration-300 ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
      onClick={onClose}
    >
      {children}
    </div>
  );
}

// Collapsible section with smooth height animation
export function AnimatedCollapse({ show, children }) {
  return (
    <div className={`grid transition-all duration-300 ease-out ${show ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Full screen overlay with fade animation
export function AnimatedOverlay({ show, children, className = '' }) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}
