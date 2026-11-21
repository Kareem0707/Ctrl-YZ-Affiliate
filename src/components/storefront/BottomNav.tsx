'use client';

import React from 'react';
import { Home, Heart, ShoppingBag, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartCount: number;
  onCartClick: () => void;
}

export default function BottomNav({ activeTab, onTabChange, cartCount, onCartClick }: BottomNavProps) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'home', icon: Home, label: t('navigation.home') },
    { id: 'favorites', icon: Heart, label: t('navigation.favorites') },
    { id: 'cart', icon: ShoppingBag, label: t('navigation.cart') },
    { id: 'profile', icon: User, label: t('navigation.profile') },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-xs border-t border-border z-50">
      <div className="flex items-center justify-around py-2.5 px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCart = tab.id === 'cart';

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isCart) {
                  onCartClick();
                } else {
                  onTabChange(tab.id);
                }
              }}
              className="flex flex-col items-center gap-1 relative transition-colors duration-150"
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.6}
                  className={isActive ? 'text-ink' : 'text-neutral-400'}
                />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-brand text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center font-mono num-tabular">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  isActive ? 'font-semibold text-ink' : 'font-normal text-neutral-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for notched phones */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
