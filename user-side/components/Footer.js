"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRestaurant } from "@/lib/restaurant";

export default function Footer() {
  const [gitInfo, setGitInfo] = useState(null);
  
  // Try to get restaurant context, but don't fail if not available
  let restaurant = null;
  try {
    const context = useRestaurant();
    restaurant = context?.restaurant;
  } catch (e) {
    // Not in RestaurantProvider context, use default styling
  }
  
  // Check if restaurant is inactive or closed
  const isRestaurantClosed = restaurant && (!restaurant.active || !restaurant.isOpen);

  return (
    <footer 
      className={`py-8 px-4 border-t relative ${
        isRestaurantClosed 
          ? 'border-gray-200 bg-white' 
          : 'border-[--border] bg-[--bg]'
      }`}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          {/* Logo and branding */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isRestaurantClosed ? 'text-gray-500' : 'text-[--text-muted]'}`}>
              Powered by
            </span>
            <Image
              src="/assets/logos/orderzap-logo.png"
              alt="OrderZap Logo"
              width={50}
              height={14}
              className="object-contain"
            />
          </div>

          {/* Footer links */}
         
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className={`text-xs ${isRestaurantClosed ? 'text-gray-500' : 'text-[--text-muted]'}`}>
            © {new Date().getFullYear()} OrderZap. All rights reserved.
          </p>
        </div>
      </div>

      {/* Git info (development only) */}
     
    </footer>
  );
}
