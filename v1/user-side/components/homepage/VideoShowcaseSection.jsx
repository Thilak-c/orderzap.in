"use client";
import { useState, useEffect, useRef } from 'react';

/**
 * VideoShowcaseSection Component
 * 
 * Displays a video demonstration of OrderZap in action with lazy loading,
 * error handling, and responsive sizing.
 * 
 * Features:
 * - Lazy loading: Video loads only when section enters viewport
 * - Poster image for initial display
 * - Video controls for user interaction
 * - Error handling with fallback to poster image
 * - Responsive video sizing
 * - Preload metadata for faster initial render
 * 
 * Requirements: 4.6, 7.2, 8.3
 * 
 * @example
 * <VideoShowcaseSection />
 */
export default function VideoShowcaseSection() {
  const [isInViewport, setIsInViewport] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  // Implement lazy loading using Intersection Observer
  useEffect(() => {
    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load video immediately if not supported
      setIsInViewport(true);
      return;
    }

    // Create Intersection Observer to detect when section enters viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Section is in viewport, trigger video loading
          setIsInViewport(true);
          // Unobserve after triggering (one-time load)
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1, // Trigger when 10% of section is visible
        rootMargin: '100px' // Start loading slightly before section enters viewport
      }
    );

    // Start observing the section
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    // Cleanup: disconnect observer on unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle video loading errors
  const handleVideoError = (e) => {
    console.error('Video failed to load:', e);
    setHasError(true);
    setIsLoading(false);
  };

  // Handle video loaded successfully
  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  return (
    <section 
      ref={sectionRef}
      className="video-showcase-section py-12 sm:py-16 md:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50"
      aria-label="Video demonstration of OrderZap"
    >
      <div className="container mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
            See OrderZap in Action
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Watch how easy it is for customers to browse your menu, place orders, and pay—all from their phones
          </p>
        </div>

        {/* Video Container */}
        <div 
          className="video-container relative overflow-hidden shadow-2xl bg-gray-900"
          style={{
            borderRadius: '16px'
          }}
        >
          {/* Loading State */}
          {isLoading && !hasError && isInViewport && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-sm">Loading video...</p>
              </div>
            </div>
          )}

          {/* Video Element - Only render when in viewport */}
          {isInViewport && !hasError ? (
            <video
              ref={videoRef}
              src="/assets/videos/order-flow.mp4"
              poster="/assets/images/cooking-poster.jpg"
              controls
              preload="metadata"
              className="showcase-video w-full h-auto"
              onError={handleVideoError}
              onLoadedData={handleVideoLoaded}
              aria-label="OrderZap order flow demonstration video"
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block'
              }}
            >
              Your browser does not support the video tag.
            </video>
          ) : !hasError ? (
            // Show poster image before video loads
            <img
              src="/assets/images/cooking-poster.jpg"
              alt="OrderZap demonstration preview"
              className="w-full h-auto"
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          ) : null}

          {/* Error Fallback - Show poster image if video fails to load */}
          {hasError && (
            <div className="relative">
              <img
                src="/assets/images/cooking-poster.jpg"
                alt="OrderZap demonstration preview"
                className="w-full h-auto"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-center p-6 bg-gray-900 bg-opacity-75 rounded-lg max-w-md">
                  <svg 
                    className="w-12 h-12 mx-auto mb-4 text-red-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                    />
                  </svg>
                  <p className="text-lg font-semibold mb-2">Video Unavailable</p>
                  <p className="text-sm text-gray-300">
                    We're having trouble loading the video. Please check your connection or try again later.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Context */}
        <div className="mt-6 sm:mt-8 text-center px-4">
          <p className="text-gray-600 text-sm sm:text-base md:text-base">
            Experience the seamless ordering flow that delights customers and boosts your restaurant's efficiency
          </p>
        </div>
      </div>

      {/* Responsive Video Sizing Styles */}
      <style jsx>{`
        .video-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .showcase-video {
          aspect-ratio: 16 / 9;
          object-fit: contain;
        }

        /* Ensure video controls are accessible and touch-friendly on mobile */
        @media (max-width: 768px) {
          .showcase-video::-webkit-media-controls-panel {
            padding: 8px;
          }
          
          .showcase-video::-webkit-media-controls-play-button,
          .showcase-video::-webkit-media-controls-fullscreen-button {
            min-width: 44px;
            min-height: 44px;
          }
        }

        /* Smooth transitions */
        .video-container img,
        .video-container video {
          transition: opacity 0.3s ease-in-out;
        }
      `}</style>
    </section>
  );
}
