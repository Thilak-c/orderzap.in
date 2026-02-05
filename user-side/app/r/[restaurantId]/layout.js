"use client";
import { RestaurantProvider, useRestaurant } from "@/lib/restaurant";
import { useParams, usePathname } from "next/navigation";
import FloatingQuickMenu from "@/components/FloatingQuickMenu";
import Footer from "@/components/Footer";
import { useEffect, useState, createContext, useContext } from "react";
import { mapColorsToTheme, applyTheme } from "@/lib/theme-utils";
import { useThemePersistence } from "@/lib/useThemePersistence";
import Head from "next/head";

// Branding Context
const BrandingContext = createContext();

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}

function BrandingProvider({ children }) {
  const params = useParams();
  const restaurantId = params?.restaurantId;
  const { restaurant, isLoading } = useRestaurant();
  
  // Generate branding from restaurant ID
  const getBrandingFromId = (id) => {
    if (!id) return { brandName: "Restaurant", brandLogo: null };
    
    const brandName = id.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const brandLogo = `/api/logo/${id}/logo.webp`;
    
    console.log("🎨 Generated branding from ID:", { id, brandName, brandLogo });
    return { brandName, brandLogo };
  };
  
  // Use restaurant data if available, otherwise construct from URL
  const branding = restaurant 
    ? {
        brandName: restaurant.name,
        brandLogo: restaurant.logo_url || `/api/logo/${restaurantId}/logo.webp`,
        isLoading: false,
      }
    : {
        ...getBrandingFromId(restaurantId),
        isLoading,
      };
  
  console.log("✅ Final branding:", branding);
  
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

function RestaurantClosedCheck({ children }) {
  const { restaurant } = useRestaurant();
  const pathname = usePathname();
  
  // Don't show closed screen for admin pages
  const isAdminPage = pathname?.includes('/admin');
  
  // Show loading screen while checking restaurant status
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg] gap-4">
  //       <img 
  //         className="w-16 h-16 rounded-full object-contain animate-pulse" 
  //         src="/assets/logos/favicon_io/android-chrome-192x192.png" 
  //         alt="Loading" 
  //       />
  //       <div className="loader-2">Loading</div>
  //     </div>
  //   );
  // }
  
  // Show closed screen if restaurant is inactive or closed (but not for admin)
  if (restaurant && (!restaurant.active || !restaurant.isOpen) && !isAdminPage) {
    return (
      <>
        <style jsx global>{`
          :root {
            --bg: #ffffff;
            --card: #ffffff;
            --border: #e5e7eb;
            --text-muted: #6b7280;
          }
        `}</style>
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 gap-6">
          <img 
            className="h-[200px]" 
            src="/assets/icons/currently-closed.png" 
            alt="Currently Closed" 
          />
          {restaurant.name && (
            <div className="flex items-center gap-3">
              {/* Restaurant Logo */}
              {restaurant.logo_url && (
                <img 
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              )}
              {/* Restaurant Name */}
              <p className="text-gray-600 text-center text-lg">
                {restaurant.name} is currently closed
              </p>
            </div>
          )}
        </div>
        {/* Footer only - no FloatingQuickMenu */}
        <Footer />
      </>
    );
  }
  
  return children;
}

function ThemeLoader() {
  const { restaurant } = useRestaurant();
  const [currentTheme, setCurrentTheme] = useState(null);
  
  // Load saved theme on mount and when restaurant changes
  useEffect(() => {
    if (restaurant?.themeColors) {
      const theme = mapColorsToTheme(restaurant.themeColors);
      applyTheme(theme);
      setCurrentTheme(theme);
    }
  }, [restaurant?.themeColors]);
  
  // Function to create circular favicon from logo
  const createCircularFavicon = (logoUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const size = 128; // Favicon size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw circle clip path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw image centered and cropped
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        // Convert to data URL
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        // If image fails to load, resolve with original URL
        resolve(logoUrl);
      };
      
      img.src = logoUrl;
    });
  };
  
  // Update favicon and title when restaurant data is available
  useEffect(() => {
    if (restaurant) {
      // Update page title
      document.title = `${restaurant.name} | OrderZap`;
      
      // Update favicon with circular crop
      if (restaurant.logo_url) {
        createCircularFavicon(restaurant.logo_url).then((circularLogoUrl) => {
          // Remove existing favicons
          const existingFavicons = document.querySelectorAll("link[rel*='icon']");
          existingFavicons.forEach(favicon => favicon.remove());
          
          // Add new circular favicon
          const favicon = document.createElement('link');
          favicon.rel = 'icon';
          favicon.href = circularLogoUrl;
          document.head.appendChild(favicon);
          
          // Add apple touch icon
          const appleTouchIcon = document.createElement('link');
          appleTouchIcon.rel = 'apple-touch-icon';
          appleTouchIcon.href = circularLogoUrl;
          document.head.appendChild(appleTouchIcon);
        });
      }
    }
  }, [restaurant]);
  
  // Use theme persistence hook to maintain theme across navigation
  useThemePersistence(currentTheme);
  
  return null;
}

export default function RestaurantLayout({ children }) {
  const params = useParams();
  const restaurantId = params?.restaurantId;

  return (
    <RestaurantProvider restaurantId={restaurantId}>
      <BrandingProvider>
        <ThemeLoader />
        <RestaurantClosedCheck>
          {children}
          <FloatingQuickMenu />
          <Footer />
        </RestaurantClosedCheck>
      </BrandingProvider>
    </RestaurantProvider>
  );
}
