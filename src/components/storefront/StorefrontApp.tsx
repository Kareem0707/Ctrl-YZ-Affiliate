'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProducts } from '@/hooks/useProducts';
import { getMarketerByCode } from '@/lib/dataService';
import type { Marketer } from '@/lib/types';
import DiscoverScreen from './DiscoverScreen';
import ProductDetails from './ProductDetails';
import CartScreen from './CartScreen';
import CheckoutScreen from './CheckoutScreen';
import OrderTrackingScreen from './OrderTrackingScreen';
import BottomNav from './BottomNav';

type Screen = 'discover' | 'product' | 'cart' | 'checkout' | 'trackOrder';

interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  brand: string;
  price: number;
  salePrice?: number;
  commission?: number;
  description_en: string;
  description_ar: string;
  images: string[];
  category: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: number;
  isActive: boolean;
}

export default function StorefrontApp() {
  const [screen, setScreen] = useState<Screen>('discover');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [referralMarketer, setReferralMarketer] = useState<Marketer | null>(null);

  const { addToCart, cartCount } = useCart();
  const { dir, locale } = useLanguage();
  const { products, loading } = useProducts();

  // Capture Affiliate Referral from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        getMarketerByCode(ref).then((m) => {
          if (m) {
            localStorage.setItem('ctrl_yz_affiliate_ref', m.id);
            setReferralMarketer(m);
          }
        });
      }
    }
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setScreen('product');
  };

  const handleBack = () => {
    if (screen === 'product') setScreen('discover');
    else if (screen === 'cart') setScreen('discover');
    else if (screen === 'checkout') setScreen('cart');
    else if (screen === 'trackOrder') setScreen('discover');
  };

  const handleAddToCart = (product: Product, size: string) => {
    addToCart(product, size);
    setScreen('cart');
  };

  const handleGoToCart = () => {
    setActiveTab('cart');
    setScreen('cart');
  };

  const handleGoToCheckout = () => {
    setScreen('checkout');
  };

  const handleOrderPlaced = () => {
    setScreen('trackOrder');
  };

  const handleContinueShopping = () => {
    setScreen('discover');
    setActiveTab('home');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'home') setScreen('discover');
    if (tab === 'cart') setScreen('cart');
    if (tab === 'profile') setScreen('trackOrder');
  };

  return (
    <div dir={dir} className="max-w-2xl mx-auto min-h-screen bg-canvas relative pb-16">
      {/* Certified Affiliate Referral Banner (When visiting through a marketer's link) */}
      {referralMarketer && (
        <div className="bg-emerald-950 text-emerald-300 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-emerald-900">
          <CheckCircle2 size={13} strokeWidth={1.6} />
          <span>
            {locale === 'ar'
              ? `أهلاً بك! أنت تتسوق الآن عبر متجر المسوق المعتمد: ${referralMarketer.name}`
              : `Shopping via certified affiliate store: ${referralMarketer.name}`}
          </span>
        </div>
      )}

      {screen === 'discover' && (
        <>
          <DiscoverScreen
            products={products}
            loading={loading}
            onProductClick={handleProductClick}
          />
          <BottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            cartCount={cartCount}
            onCartClick={handleGoToCart}
          />
        </>
      )}

      {screen === 'product' && selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onBack={handleBack}
          onAddToCart={handleAddToCart}
        />
      )}

      {screen === 'cart' && (
        <CartScreen
          onBack={handleBack}
          onNext={handleGoToCheckout}
        />
      )}

      {screen === 'checkout' && (
        <CheckoutScreen
          onBack={handleBack}
          onOrderPlaced={handleOrderPlaced}
          onContinueShopping={handleContinueShopping}
        />
      )}

      {screen === 'trackOrder' && (
        <OrderTrackingScreen
          onBack={handleBack}
        />
      )}
    </div>
  );
}
