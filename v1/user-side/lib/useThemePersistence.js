/**
 * useThemePersistence Hook
 * Ensures theme persists across client-side navigation
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { applyTheme } from './theme-utils';

/**
 * Hook to preserve and reapply theme during navigation
 * @param {Object} themeColors - Current theme colors object
 */
export function useThemePersistence(themeColors) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const currentTheme = useRef(themeColors);

  // Update current theme reference when theme changes
  useEffect(() => {
    if (themeColors) {
      currentTheme.current = themeColors;
    }
  }, [themeColors]);

  // Listen for navigation events and reapply theme
  useEffect(() => {
    // Check if navigation occurred
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      
      // Reapply theme after navigation if we have a theme
      if (currentTheme.current) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          applyTheme(currentTheme.current);
        });
      }
    }
  }, [pathname]);

  // Also listen for popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (currentTheme.current) {
        requestAnimationFrame(() => {
          applyTheme(currentTheme.current);
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Listen for Next.js route change events
  useEffect(() => {
    const handleRouteChange = () => {
      if (currentTheme.current) {
        requestAnimationFrame(() => {
          applyTheme(currentTheme.current);
        });
      }
    };

    // Listen for custom navigation events that might be dispatched
    window.addEventListener('routeChangeComplete', handleRouteChange);
    
    return () => {
      window.removeEventListener('routeChangeComplete', handleRouteChange);
    };
  }, []);
}
