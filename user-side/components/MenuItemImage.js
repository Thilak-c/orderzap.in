"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function MenuItemImage({ storageId, alt, className = "", restaurantId, itemName }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Normalize legacy file-system paths to the stable API route
  // Example legacy: /restro_assets/bts/menu_img/biryani.webp
  // Becomes:       /api/menu_item/bts/biryani.webp
  if (storageId && typeof storageId === "string" && storageId.startsWith("/restro_assets/")) {
    try {
      const parts = storageId.split("/").filter(Boolean);
      // parts = ["restro_assets", "<restaurantId>", "menu_img", "<filename>"]
      if (parts.length >= 4 && parts[0] === "restro_assets") {
        const restaurantFromPath = parts[1];
        const filename = parts[3]; // e.g. biryani.webp
        storageId = `/api/menu_item/${restaurantFromPath}/${filename}`;
      }
    } catch {
      // If anything goes wrong, fall back to original storageId
    }
  }
  
  // If restaurantId and itemName provided, construct the API path
  if (restaurantId && itemName) {
    const itemNameSlug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const imagePath = `/api/menu_item/${restaurantId}/${itemNameSlug}.webp`;
    
    return (
      <div className="relative w-full h-full">
        {!imageLoaded && (
          <div 
            className={`${className} absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%]`}
            style={{
              animation: 'shimmer 2s infinite linear'
            }}
          />
        )}
        <img 
          src={imagePath} 
          alt={alt} 
          className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            // Fallback to placeholder if image doesn't exist
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<span class="text-4xl">🍽️</span>';
          }}
        />
      </div>
    );
  }
  
  // Check if it's a storage ID (starts with a letter and contains alphanumeric chars)
  const isStorageId = storageId && !storageId.startsWith("http") && !storageId.startsWith("/") && storageId.length > 10;
  
  const imageUrl = useQuery(
    api.files.getUrl,
    isStorageId ? { storageId } : "skip"
  );

  // If it's an emoji (short string), display it directly
  if (!storageId || storageId.length <= 4) {
    return <span className={className}>{storageId || "🍽️"}</span>;
  }

  // If it's already a URL or file path, use it directly
  if (storageId.startsWith("http") || storageId.startsWith("/")) {
    return (
      <div className="relative w-full h-full">
        {!imageLoaded && (
          <div 
            className={`${className} absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%]`}
            style={{
              animation: 'shimmer 2s infinite linear'
            }}
          />
        )}
        <img 
          src={storageId} 
          alt={alt} 
          className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    );
  }

  // If it's a storage ID, wait for the URL
  if (!imageUrl) {
    return (
      <div 
        className={`${className} bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%]`}
        style={{
          animation: 'shimmer 2s infinite linear'
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      {!imageLoaded && (
        <div 
          className={`${className} absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%]`}
          style={{
            animation: 'shimmer 2s infinite linear'
          }}
        />
      )}
      <img 
        src={imageUrl} 
        alt={alt} 
        className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}
