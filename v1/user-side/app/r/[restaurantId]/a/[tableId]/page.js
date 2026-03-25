"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { generateSessionKey, createQRSession } from "@/lib/qrAuth";

export default function AuthPage() {
  const { restaurantId, tableId } = useParams();
  const router = useRouter();
  
  // Get restaurant to check if it's active
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });

  useEffect(() => {
    if (!tableId || !restaurantId) {
      router.replace('/');
      return;
    }

    // Generate session key and create session
    const sessionKey = generateSessionKey();
    createQRSession(tableId, sessionKey);
    
    // Redirect to menu with key after brief delay
    setTimeout(() => {
      router.replace(`/r/${restaurantId}/m/${tableId}?key=${sessionKey}`);
    }, 500);
  }, [restaurantId, tableId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg] px-4">
      <div className="text-center">
        <p className="loader-4">Table {tableId}</p>
      </div>
    </div>
  );
}
