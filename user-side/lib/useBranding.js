import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

const CACHE_KEY = "branding_cache";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Preload image to browser cache
const preloadImage = (src) => {
  if (!src || typeof window === 'undefined') return;
  const img = new Image();
  img.src = src;
};

export function useBranding() {
  const settings = useQuery(api.settings.getAll);
  const logoUrl = useQuery(
    api.files.getUrl,
    settings?.brandLogoStorageId ? { storageId: settings.brandLogoStorageId } : "skip"
  );
  
  const [cachedBranding, setCachedBranding] = useState(null);
  
  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_DURATION) {
          setCachedBranding(data);
          // Preload cached logo
          if (data.brandLogo) {
            preloadImage(data.brandLogo);
          }
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to load branding cache:", e);
    }
  }, []);
  
  // Update cache when data changes
  useEffect(() => {
    if (settings && (logoUrl !== undefined || !settings.brandLogoStorageId)) {
      const brandData = {
        brandName: settings.brandName || "BTS DISC",
        brandLogo: logoUrl || settings.brandLogo || "/logo.png",
      };
      
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: brandData,
          timestamp: Date.now(),
        }));
        setCachedBranding(brandData);
        // Preload new logo
        if (brandData.brandLogo) {
          preloadImage(brandData.brandLogo);
        }
      } catch (e) {
        console.error("Failed to cache branding:", e);
      }
    }
  }, [settings, logoUrl]);
  
  const isLoading = settings === undefined && cachedBranding === null;
  const brandLogo = logoUrl || settings?.brandLogo || cachedBranding?.brandLogo || "/logo.png";
  const brandName = settings?.brandName || cachedBranding?.brandName || "BTS DISC";
  
  return {
    brandName,
    brandLogo,
    isLoading,
  };
}
