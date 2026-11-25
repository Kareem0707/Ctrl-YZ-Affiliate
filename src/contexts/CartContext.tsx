'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { CartItem, Product } from '@/lib/types';

export type { CartItem };

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: string, color?: string, variantId?: string) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ctrl-yz-cart-v2';

function sanitizeStoredCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => {
      const productId = String(entry.productId || entry.id || '').trim();
      const size = String(entry.size || entry.selectedSize || 'M').trim();
      const color = String(entry.color || '').trim();
      const id =
        typeof entry.id === 'string' && entry.id.includes('-')
          ? entry.id
          : `${productId}-${size}-${color}`;
      const maxStock = Math.max(1, Math.floor(Number(entry.maxStock ?? 50) || 50));
      const quantity = Math.min(maxStock, Math.max(1, Math.floor(Number(entry.quantity ?? 1) || 1)));
      const price = Math.max(0, Number(entry.price ?? 0) || 0);
      const image =
        typeof entry.image === 'string' && entry.image
          ? entry.image
          : Array.isArray(entry.images) && typeof entry.images[0] === 'string'
          ? entry.images[0]
          : '';

      return {
        id,
        productId,
        variantId: typeof entry.variantId === 'string' ? entry.variantId : undefined,
        name: String(entry.name || entry.name_ar || entry.name_en || 'منتج Ctrl YZ'),
        name_ar: typeof entry.name_ar === 'string' ? entry.name_ar : undefined,
        name_en: typeof entry.name_en === 'string' ? entry.name_en : undefined,
        brand: String(entry.brand || 'Ctrl YZ'),
        image,
        size,
        color,
        price,
        quantity,
        maxStock,
      };
    })
    .filter((item) => item.productId.length > 0);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem(CART_STORAGE_KEY) ?? localStorage.getItem('ctrl-yz-cart');
      if (savedCart) {
        setCart(sanitizeStoredCart(JSON.parse(savedCart)));
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
    (product: Product, size: string, color = '', variantId?: string): boolean => {
      const resolvedSize = size || product.sizes?.[0] || 'M';
      const resolvedColor = color || product.colors?.[0]?.name || '';

      const matchedVariant = product.variants?.find(
        (v) =>
          (variantId && v.id === variantId) ||
          (v.size.toLowerCase() === resolvedSize.toLowerCase() &&
            (!resolvedColor || v.color.toLowerCase() === resolvedColor.toLowerCase()))
      );

      const availableStock = matchedVariant ? matchedVariant.stock : product.stock;
      if (!product.isActive || availableStock <= 0) {
        return false;
      }

      const maxStock = Math.max(1, availableStock);
      const effectivePrice =
        product.salePrice && product.salePrice < product.price
          ? Number(product.salePrice)
          : Number(product.price);
      const cartItemId = `${product.id}-${resolvedSize}-${resolvedColor}`;

      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === cartItemId);
        if (existingIndex > -1) {
          const updated = [...prev];
          const current = updated[existingIndex];
          updated[existingIndex] = {
            ...current,
            maxStock,
            price: effectivePrice,
            variantId: matchedVariant?.id ?? variantId ?? current.variantId,
            quantity: Math.min(maxStock, current.quantity + 1),
          };
          return updated;
        }

        const newItem: CartItem = {
          id: cartItemId,
          productId: product.id,
          variantId: matchedVariant?.id ?? variantId,
          name: product.name_ar || product.name_en || 'منتج Ctrl YZ',
          name_ar: product.name_ar,
          name_en: product.name_en,
          brand: product.brand || 'Ctrl YZ',
          image: product.images?.[0] || '',
          size: resolvedSize,
          color: resolvedColor,
          price: effectivePrice,
          quantity: 1,
          maxStock,
        };

        return [...prev, newItem];
      });

      return true;
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setCart((prev) => {
      if (quantity < 1) {
        return prev.filter((item) => item.id !== id);
      }
      return prev.map((item) => {
        if (item.id !== id) return item;
        const clamped = Math.min(Math.max(1, item.maxStock), Math.floor(quantity));
        return { ...item, quantity: clamped };
      });
    });
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

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
