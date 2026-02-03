"use client";
import { RestaurantProvider, useRestaurant } from "@/lib/restaurant";
import { useParams, usePathname } from "next/navigation";
import FloatingQuickMenu from "@/components/FloatingQuickMenu";

function RestaurantClosedCheck({ children }) {
  const { restaurant, isLoading } = useRestaurant();
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
  
  // Show closed screen if restaurant is inactive (but not for admin)
  if (restaurant && !restaurant.active && !isAdminPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg] px-6 gap-6">
        <img 
          className="h-[200px]" 
          src="/assets/icons/currently-closed.png" 
          alt="Currently Closed" 
        />
        {restaurant.name && (
          <p className="text-[--text-muted] text-center">
            {restaurant.name} is currently closed
          </p>
        )}
      </div>
    );
  }
  
  return children;
}

export default function RestaurantLayout({ children }) {
  const params = useParams();
  const restaurantId = params?.restaurantId;

  return (
    <RestaurantProvider restaurantId={restaurantId}>
      <RestaurantClosedCheck>
        {children}
      </RestaurantClosedCheck>
      <FloatingQuickMenu />
    </RestaurantProvider>
  );
}
