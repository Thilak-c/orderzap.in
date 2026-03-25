"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const RestaurantContext = createContext();

export function RestaurantProvider({ children, restaurantId }) {
  const [currentRestaurantId, setCurrentRestaurantId] = useState(restaurantId);
  
  const restaurant = useQuery(
    api.restaurants.getByShortId,
    currentRestaurantId ? { id: currentRestaurantId } : "skip"
  );

  const value = {
    restaurantId: currentRestaurantId,
    restaurant,
    setRestaurantId: setCurrentRestaurantId,
    isLoading: restaurant === undefined,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error("useRestaurant must be used within RestaurantProvider");
  }
  return context;
}
