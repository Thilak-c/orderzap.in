"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MenuItemImage({ storageId, alt, className = "" }) {
  // Check if it's a storage ID (starts with a letter and contains alphanumeric chars)
  const isStorageId = storageId && !storageId.startsWith("http") && storageId.length > 10;
  
  const imageUrl = useQuery(
    api.files.getUrl,
    isStorageId ? { storageId } : "skip"
  );

  // If it's an emoji (short string), display it directly
  if (!storageId || storageId.length <= 4) {
    return <span className={className}>{storageId || "🍽️"}</span>;
  }

  // If it's already a URL, use it directly
  if (storageId.startsWith("http")) {
    return <img src={storageId} alt={alt} className={className} />;
  }

  // If it's a storage ID, wait for the URL
  if (!imageUrl) {
    return <div className={`${className} bg-zinc-800 animate-pulse`} />;
  }

  return <img src={imageUrl} alt={alt} className={className} />;
}
