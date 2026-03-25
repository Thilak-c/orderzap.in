import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes for most data
const LONG_CACHE_DURATION = 1000 * 60 * 60; // 1 hour for rarely changing data

// Preload images to browser cache
const preloadImages = (items, imageKey = 'image') => {
  if (!items || typeof window === 'undefined') return;
  items.forEach(item => {
    if (item[imageKey]) {
      const img = new Image();
      img.src = item[imageKey];
    }
  });
};

export function useCachedQuery(queryFunction, args, cacheKey, options = {}) {
  const {
    cacheDuration = CACHE_DURATION,
    preloadImageKey = null,
  } = options;

  const data = useQuery(queryFunction, args);
  const [cachedData, setCachedData] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load from cache on mount
  useEffect(() => {
    if (!cacheKey) return;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data: cachedItems, timestamp } = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - timestamp < cacheDuration) {
          setCachedData(cachedItems);
          // Preload images from cache
          if (preloadImageKey && Array.isArray(cachedItems)) {
            preloadImages(cachedItems, preloadImageKey);
          }
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.error(`Failed to load cache for ${cacheKey}:`, e);
    }
    setIsInitialLoad(false);
  }, [cacheKey, cacheDuration, preloadImageKey]);

  // Update cache when data changes
  useEffect(() => {
    if (!cacheKey || !data) return;

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
      setCachedData(data);
      
      // Preload images from new data
      if (preloadImageKey && Array.isArray(data)) {
        preloadImages(data, preloadImageKey);
      }
    } catch (e) {
      console.error(`Failed to cache ${cacheKey}:`, e);
    }
  }, [data, cacheKey, preloadImageKey]);

  // Return cached data immediately if available, otherwise wait for query
  const finalData = data || cachedData;
  const isLoading = data === undefined && cachedData === null && isInitialLoad;

  return {
    data: finalData,
    isLoading,
    isCached: !data && cachedData !== null,
  };
}

// Clear specific cache
export function clearCache(cacheKey) {
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {
    console.error(`Failed to clear cache for ${cacheKey}:`, e);
  }
}

// Clear all app caches
export function clearAllCaches() {
  const cacheKeys = [
    'menu_items_cache',
    'zones_cache',
    'tables_cache',
    'branding_cache',
  ];
  
  cacheKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to clear cache for ${key}:`, e);
    }
  });
}

// Cache keys constants
export const CACHE_KEYS = {
  MENU_ITEMS: 'menu_items_cache',
  ZONES: 'zones_cache',
  TABLES: 'tables_cache',
  BRANDING: 'branding_cache',
  STAFF: 'staff_cache',
};

// Cache durations
export const CACHE_DURATIONS = {
  SHORT: 1000 * 60 * 2, // 2 minutes
  MEDIUM: 1000 * 60 * 5, // 5 minutes
  LONG: 1000 * 60 * 60, // 1 hour
};
