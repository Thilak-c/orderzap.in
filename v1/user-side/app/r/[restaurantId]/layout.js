"use client";
import { RestaurantProvider, useRestaurant } from "@/lib/restaurant";
import { useParams, usePathname } from "next/navigation";
import FloatingQuickMenu from "@/components/FloatingQuickMenu";
import Footer from "@/components/Footer";
import { useEffect, useState, createContext, useContext } from "react";
import { mapColorsToTheme, applyTheme } from "@/lib/theme-utils";
import { useThemePersistence } from "@/lib/useThemePersistence";
import Head from "next/head";
import { squareLogoUrl, fullLogoUrl, faviconUrl } from "@/lib/logo-utils";
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
    
    // default to favicon image
    const brandLogo = `/api/logo/${id}/favicon.webp`;
    
    console.log("🎨 Generated branding from ID:", { id, brandName, brandLogo });
    return { brandName, brandLogo };
  };
  
  // Use restaurant data if available, otherwise construct from URL
  const branding = restaurant 
    ? {
        brandName: restaurant.name,
        brandLogo: squareLogoUrl(restaurant, restaurantId),
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
  const params = useParams();
  const restaurantId = params?.restaurantId;
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
              {restaurant && (
                <img 
                  src={squareLogoUrl(restaurant, restaurantId)}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              )}
              {/* Restaurant Name */}
              <p className="text-gray-600 text-center text-lg">
                <span className="font-jersey-25 text-2xl">{restaurant.brandName || restaurant.name}</span> is currently closed
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
  const params = useParams();
  const restaurantId = params?.restaurantId;

  const { restaurant } = useRestaurant();
  const [currentTheme, setCurrentTheme] = useState(null);
  
  // Load saved theme on mount and when restaurant changes
  useEffect(() => {
    if (restaurant?.primaryColor) {
      // Use primaryColor directly for all theme elements
      const primaryColor = restaurant.primaryColor;
      
      // Create a darker version for hover state (reduce brightness by ~10%)
      const darkenColor = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        const darken = (val) => Math.max(0, Math.floor(val * 0.85));
        
        return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
      };
      
      const theme = {
        bg: '#ffffff',
        primary: primaryColor,
        'primary-hover': darkenColor(primaryColor),
        secondary: primaryColor,
        accent: primaryColor,
        text: '#000000'
      };
      applyTheme(theme);
      setCurrentTheme(theme);
    } else if (restaurant?.themeColors) {
      // Fallback to themeColors if primaryColor not available
      const theme = mapColorsToTheme(restaurant.themeColors);
      applyTheme(theme);
      setCurrentTheme(theme);
    }
  }, [restaurant?.primaryColor, restaurant?.themeColors]);
  
  // Function to create circular favicon from logo
  const createCircularFavicon = (logoUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
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
        } catch (error) {
          console.error('Error creating circular favicon:', error);
          resolve(logoUrl); // Fallback to original URL
        }
      };
      
      img.onerror = () => {
        // If image fails to load, resolve with original URL
        console.warn('Failed to load logo for favicon, using original URL');
        resolve(logoUrl);
      };
      
      img.src = logoUrl;
    });
  };
  
  // Update favicon and title when restaurant data is available
  useEffect(() => {
    if (!restaurant || !restaurantId) return;
    
    // Update page title
    document.title = `${restaurant.name} | OrderZap`;
    
    // Update favicon with circular crop
    const src = faviconUrl(restaurant, restaurantId);
    createCircularFavicon(src).then((circularLogoUrl) => {
      // Remove existing favicons safely - use a more defensive approach
      try {
        const existingFavicons = document.querySelectorAll("link[rel*='icon']");
        const faviconsArray = Array.from(existingFavicons);
        faviconsArray.forEach(favicon => {
          if (favicon && favicon.parentNode && document.head.contains(favicon)) {
            favicon.parentNode.removeChild(favicon);
          }
        });
      } catch (e) {
        console.warn('Error removing favicons:', e);
      }
      
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
    }).catch(err => {
      console.warn('Error updating favicon:', err);
    });
  }, [restaurant, restaurantId]);
  
  // Use theme persistence hook to maintain theme across navigation
  useThemePersistence(currentTheme);
  
  return null;
}

export default function RestaurantLayout({ children }) {
  const params = useParams();
  const restaurantId = params?.restaurantId;
  const pathname = usePathname();
  const isMenuPage = pathname?.includes('/m/');

  return (
    <RestaurantProvider restaurantId={restaurantId}>
      <BrandingProvider>
        <ThemeLoader />
        <RestaurantClosedCheck>
          {children}
          <FloatingQuickMenu />
          {!isMenuPage && <Footer />}
        </RestaurantClosedCheck>
      </BrandingProvider>
    </RestaurantProvider>
  );
}
