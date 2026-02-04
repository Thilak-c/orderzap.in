import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const CACHE_KEY = "branding_cache";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Preload image to browser cache
const preloadImage = (src) => {
  if (!src || typeof window === 'undefined') return;
  const img = new Image();
  img.src = src;
};

export function useBranding() {
  const params = useParams();
  const restaurantId = params?.restaurantId;
  
  // Query restaurant directly using the ID from params
  const restaurant = useQuery(
    api.restaurants.getByShortId,
    restaurantId ? { id: restaurantId } : "skip"
  );
  
  const settings = useQuery(api.settings.getAll);
  
  // Get restaurant logo URL
  const restaurantLogoUrl = useQuery(
    api.files.getUrl,
    restaurant?.logo ? { storageId: restaurant.logo } : "skip"
  );
  
  // Get settings logo URL
  const settingsLogoUrl = useQuery(
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
    if ((restaurant || settings) && (restaurantLogoUrl !== undefined || settingsLogoUrl !== undefined)) {
      const brandData = {
        brandName: restaurant?.name || settings?.brandName || "Restaurant",
        brandLogo: restaurantLogoUrl || settingsLogoUrl || settings?.brandLogo,
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
  }, [restaurant, settings, restaurantLogoUrl, settingsLogoUrl]);
  
  const isLoading = (restaurant === undefined && settings === undefined) && cachedBranding === null;
  const brandLogo = restaurantLogoUrl || settingsLogoUrl || settings?.brandLogo || cachedBranding?.brandLogo;
  const brandName = restaurant?.name || settings?.brandName || cachedBranding?.brandName || "Restaurant";
  
  return {
    brandName,
    brandLogo,
    isLoading,
  };
}
