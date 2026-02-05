"use client";
import { useState, useEffect, useRef } from 'react';

/**
 * ScrollAnimationWrapper Component
 * 
 * A utility component that triggers animations when elements scroll into view.
 * Uses Intersection Observer API for efficient viewport detection.
 * Includes fallback for browsers without Intersection Observer support.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements to animate
 * @param {string} props.animationClass - CSS animation class to apply when visible
 * @param {number} [props.threshold=0.2] - Intersection Observer threshold (0-1)
 * 
 * Requirements: 4.1
 * 
 * @example
 * <ScrollAnimationWrapper animationClass="animate-slide-up">
 *   <FeaturesSection />
 * </ScrollAnimationWrapper>
 */
export default function ScrollAnimationWrapper({ 
  children, 
  animationClass, 
  threshold = 0.2 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: show animations immediately if not supported
      setIsVisible(true);
      return;
    }

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When element enters viewport, trigger animation
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Unobserve after animation is triggered (one-time animation)
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold,
        // Add root margin for earlier triggering
        rootMargin: '0px 0px -50px 0px'
      }
    );

    // Start observing the element
    if (ref.current) {
      observer.observe(ref.current);
    }

    // Cleanup: disconnect observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div 
      ref={ref} 
      className={isVisible ? animationClass : 'opacity-0'}
      style={{
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
}
