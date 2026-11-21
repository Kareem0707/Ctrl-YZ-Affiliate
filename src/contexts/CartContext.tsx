'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  price: number;
  image: string;
  size: string;
  color?: string;
  quantity: number;
  commission?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, size: string, color?: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ctrl-yz-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch {
      console.error('Error loading cart from localStorage');
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const addToCart = useCallback(
    (product: any, size: string, color?: string) => {
      setCart((prev) => {
        const cartItemId = `${product.id}-${size}-${color || ''}`;
        const existingIndex = prev.findIndex((item) => item.id === cartItemId);

        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
          };
          return updated;
        }

        const effectivePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;

        return [
          ...prev,
          {
            id: cartItemId,
            productId: product.id,
            name: product.name_ar || product.name_en || product.name || 'منتج',
            name_en: product.name_en,
            name_ar: product.name_ar,
            price: Number(effectivePrice),
            image: product.images?.[0] || '',
            size: size || 'M',
            color: color || '',
            quantity: 1,
            commission: product.commission || 0,
          },
        ];
      });
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
