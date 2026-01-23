"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

const CART_STORAGE_KEY = 'bts-cart';
const SAVED_STORAGE_KEY = 'bts-saved';

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [hideCartBar, setHideCartBar] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart and saved items from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    const storedSaved = localStorage.getItem(SAVED_STORAGE_KEY);
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage');
      }
    }
    if (storedSaved) {
      try {
        setSavedItems(JSON.parse(storedSaved));
      } catch (e) {
        console.error('Failed to parse saved items from localStorage');
      }
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  // Save saved items to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
    }
  }, [savedItems, isHydrated]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, itemNote: '', customizations: [] }];
    });
  };

  const removeFromCart = (menuItemId) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  };

  // Update item note for a specific item
  const updateItemNote = (menuItemId, note) => {
    setCart((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, itemNote: note } : i))
    );
  };

  // Update customizations for a specific item
  const updateCustomizations = (menuItemId, customizations) => {
    setCart((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, customizations } : i))
    );
  };

  // Save item for later
  const saveForLater = (menuItemId) => {
    const item = cart.find((i) => i.menuItemId === menuItemId);
    if (item) {
      setSavedItems((prev) => {
        const exists = prev.find((i) => i.menuItemId === menuItemId);
        if (exists) return prev;
        return [...prev, { ...item, quantity: 1 }];
      });
      removeFromCart(menuItemId);
    }
  };

  // Move saved item back to cart
  const moveToCart = (menuItemId) => {
    const item = savedItems.find((i) => i.menuItemId === menuItemId);
    if (item) {
      addToCart(item);
      setSavedItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
    }
  };

  // Remove from saved items
  const removeFromSaved = (menuItemId) => {
    setSavedItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        savedItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemNote,
        updateCustomizations,
        saveForLater,
        moveToCart,
        removeFromSaved,
        clearCart,
        cartTotal,
        cartCount,
        hideCartBar,
        setHideCartBar,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
