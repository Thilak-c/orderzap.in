"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRestaurant } from "@/lib/restaurant";
import { useParams } from "next/navigation";
import { Heart } from "lucide-react";

export default function Footer() {
  const [gitInfo, setGitInfo] = useState(null);
  const params = useParams();
  const restaurantId = params?.restaurantId;
  
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
  const brandName = restaurant?.brandName || restaurant?.name;

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
        {/* Collaboration Section */}
        {brandName && restaurantId && (
          <div className="flex flex-col items-center gap-3 mb-6">
            {/* Brand Collaboration */}
            <div className="flex items-center gap-3">
              {/* Restaurant Logo & Name */}
              <div className="flex items-center gap-2">
                <img
                  src={`/api/logo/${restaurantId}/favicon.webp`}
                  alt={brandName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className={`font-jersey-25 text-lg ${isRestaurantClosed ? 'text-gray-700' : 'text-[--text-primary]'}`}>
                  {brandName}
                </span>
              </div>

              {/* X Symbol */}
              <span className={`text-xl font-bold ${isRestaurantClosed ? 'text-gray-400' : 'text-[--text-muted]'}`}>
                ×
              </span>

              {/* OrderZap Logo & Name */}
              <div className="flex items-center gap-2">
                <img
              src="/assets/logos/s-logo-sq.webp"
              alt="OrderZap"
              className="h-8 w-8 rounded-full object-cover"
            />
                <span className={`font-jersey-25 text-lg ${isRestaurantClosed ? 'text-gray-700' : 'text-[--text-primary]'}`}>
                  OrderZap
                </span>
              </div>
            </div>

            {/* Heartfelt Message */}
            <div className="flex items-center gap-2">
              <Heart size={14} className={`${isRestaurantClosed ? 'text-red-400' : 'text-red-500'} fill-current animate-pulse`} />
              <p className={`text-xs italic ${isRestaurantClosed ? 'text-gray-600' : 'text-[--text-muted]'}`}>
                 Where Flavors Meet Technology
              </p>
              <Heart size={14} className={`${isRestaurantClosed ? 'text-red-400' : 'text-red-500'} fill-current animate-pulse`} />
            </div>
          </div>
        )}

        {/* Fallback for non-restaurant pages */}
        {!brandName && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
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
          </div>
        )}

        {/* Copyright */}
        <div className="text-center">
          <p className={`text-xs ${isRestaurantClosed ? 'text-gray-500' : 'text-[--text-muted]'}`}>
            © {new Date().getFullYear()} OrderZap. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
