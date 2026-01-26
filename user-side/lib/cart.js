"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

// Helper to get table-specific storage keys
const getStorageKeys = (tableId) => ({
  cart: tableId ? `oz-cart-table-${tableId}` : 'oz-cart',
  saved: tableId ? `oz-saved-table-${tableId}` : 'oz-saved'
});

export function CartProvider({ children }) {
  const [carts, setCarts] = useState({}); // Store carts by tableId
  const [savedItemsByTable, setSavedItemsByTable] = useState({});
  const [hideCartBar, setHideCartBar] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTableId, setCurrentTableId] = useState(null);

  // Mark as hydrated on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getCart = (tableId) => {
    return carts[tableId] || [];
  };

  const getSavedItems = (tableId) => savedItemsByTable[tableId] || [];

  // Initialize cart for a table if not already loaded
  const initializeCart = (tableId) => {
    if (!tableId || carts[tableId] !== undefined) return;
    
    const keys = getStorageKeys(tableId);
    const storedCart = localStorage.getItem(keys.cart);
    const storedSaved = localStorage.getItem(keys.saved);
    
    let cart = [];
    let saved = [];
    
    if (storedCart) {
      try {
        cart = JSON.parse(storedCart);
      } catch (e) {
        console.error('Failed to parse cart from localStorage');
      }
    }
    
    if (storedSaved) {
      try {
        saved = JSON.parse(storedSaved);
      } catch (e) {
        console.error('Failed to parse saved items from localStorage');
      }
    }
    
    setCarts(prev => ({ ...prev, [tableId]: cart }));
    setSavedItemsByTable(prev => ({ ...prev, [tableId]: saved }));
  };

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated && currentTableId && carts[currentTableId]) {
      const keys = getStorageKeys(currentTableId);
      localStorage.setItem(keys.cart, JSON.stringify(carts[currentTableId]));
    }
  }, [carts, isHydrated, currentTableId]);

  // Save saved items to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated && currentTableId && savedItemsByTable[currentTableId]) {
      const keys = getStorageKeys(currentTableId);
      localStorage.setItem(keys.saved, JSON.stringify(savedItemsByTable[currentTableId]));
    }
  }, [savedItemsByTable, isHydrated, currentTableId]);

  const addToCart = (tableId, item) => {
    setCurrentTableId(tableId);
    setCarts((prev) => {
      const cart = prev[tableId] || [];
      const existing = cart.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return {
          ...prev,
          [tableId]: cart.map((i) =>
            i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return {
        ...prev,
        [tableId]: [...cart, { ...item, quantity: 1, itemNote: '', customizations: [] }]
      };
    });
  };

  const removeFromCart = (tableId, menuItemId) => {
    setCurrentTableId(tableId);
    setCarts((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] || []).filter((i) => i.menuItemId !== menuItemId)
    }));
  };

  const updateQuantity = (tableId, menuItemId, quantity) => {
    setCurrentTableId(tableId);
    if (quantity <= 0) {
      removeFromCart(tableId, menuItemId);
      return;
    }
    setCarts((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] || []).map((i) => 
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      )
    }));
  };

  const updateItemNote = (tableId, menuItemId, note) => {
    setCurrentTableId(tableId);
    setCarts((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] || []).map((i) => 
        i.menuItemId === menuItemId ? { ...i, itemNote: note } : i
      )
    }));
  };

  const updateCustomizations = (tableId, menuItemId, customizations) => {
    setCurrentTableId(tableId);
    setCarts((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] || []).map((i) => 
        i.menuItemId === menuItemId ? { ...i, customizations } : i
      )
    }));
  };

  const saveForLater = (tableId, menuItemId) => {
    setCurrentTableId(tableId);
    const cart = carts[tableId] || [];
    const item = cart.find((i) => i.menuItemId === menuItemId);
    if (item) {
      setSavedItemsByTable((prev) => {
        const saved = prev[tableId] || [];
        const exists = saved.find((i) => i.menuItemId === menuItemId);
        if (exists) return prev;
        return {
          ...prev,
          [tableId]: [...saved, { ...item, quantity: 1 }]
        };
      });
      removeFromCart(tableId, menuItemId);
    }
  };

  const moveToCart = (tableId, menuItemId) => {
    setCurrentTableId(tableId);
    const saved = savedItemsByTable[tableId] || [];
    const item = saved.find((i) => i.menuItemId === menuItemId);
    if (item) {
      addToCart(tableId, item);
      setSavedItemsByTable((prev) => ({
        ...prev,
        [tableId]: (prev[tableId] || []).filter((i) => i.menuItemId !== menuItemId)
      }));
    }
  };

  const removeFromSaved = (tableId, menuItemId) => {
    setCurrentTableId(tableId);
    setSavedItemsByTable((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] || []).filter((i) => i.menuItemId !== menuItemId)
    }));
  };

  const clearCart = (tableId) => {
    setCurrentTableId(tableId);
    setCarts((prev) => ({ ...prev, [tableId]: [] }));
    const keys = getStorageKeys(tableId);
    localStorage.removeItem(keys.cart);
  };

  const getCartTotal = (tableId) => {
    const cart = getCart(tableId);
    return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  };

  const getCartCount = (tableId) => {
    const cart = getCart(tableId);
    return cart.reduce((sum, i) => sum + i.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        getCart,
        getSavedItems,
        initializeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemNote,
        updateCustomizations,
        saveForLater,
        moveToCart,
        removeFromSaved,
        clearCart,
        getCartTotal,
        getCartCount,
        hideCartBar,
        setHideCartBar,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
