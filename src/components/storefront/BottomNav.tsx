'use client';

import React, { useState, useEffect, useRef, useId, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartCount: number;
  onCartClick: () => void;
  primaryColor?: string;
  softFillColor?: string;
}

export type NavTabId = 'home' | 'favorites' | 'cart' | 'transactions' | 'profile';

/* --------------------------------------------------------------------------
 * Custom Duotone & Minimalist Line-Art Icons for E-Commerce / Affiliate
 * -------------------------------------------------------------------------- */
function BottomNavIcon({
  id,
  active,
  primaryColor = '#0258ED',
  softFillColor = '#DBEAFE',
  cartCount = 0,
}: {
  id: NavTabId;
  active: boolean;
  primaryColor?: string;
  softFillColor?: string;
  cartCount?: number;
}) {
  switch (id) {
    case 'home':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Soft duotone interior fill */}
            <path
              d="M4 10.5L12 3.5L20 10.5V19C20 19.5523 19.5523 20 19 20H15V14C15 13.4477 14.5523 13 14 13H10C9.44772 13 9 13.4477 9 14V20H5C4.44772 20 4 19.5523 4 19V10.5Z"
              fill={softFillColor}
            />
            {/* Crisp primary accent stroke */}
            <path
              d="M3 10.5L12 3L21 10.5"
              stroke={primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 9.5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V9.5"
              stroke={primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 21V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V21"
              stroke={primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      }
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );

    case 'favorites':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={softFillColor}
              stroke={primaryColor}
              strokeWidth="2"
            />
          </svg>
        );
      }
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );

    case 'cart':
      if (active) {
        return (
          <div className="relative flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"
                fill={softFillColor}
                stroke={primaryColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M3 6h18" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
              <path
                d="M16 10a4 4 0 0 1-8 0"
                stroke={primaryColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#EA580C] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs font-mono num-tabular">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </div>
        );
      }
      return (
        <div className="relative flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#EA580C] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs font-mono num-tabular">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </div>
      );

    case 'transactions':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8.5" fill={softFillColor} opacity="0.75" />
            <path
              d="M7 8.5H17M17 8.5L13.5 5M17 8.5L13.5 12"
              stroke={primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 15.5H7M7 15.5L10.5 12M7 15.5L10.5 19"
              stroke={primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      }
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m-4 6H4m0 0l4-4m-4 4l4 4" />
        </svg>
      );

    case 'profile':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9.5" fill={softFillColor} opacity="0.8" />
            <circle cx="12" cy="12" r="9.5" stroke={primaryColor} strokeWidth="2.2" />
            <circle cx="12" cy="8.5" r="3" fill={primaryColor} />
            <path
              d="M7 17.5C7.8 15.2 9.7 13.8 12 13.8C14.3 13.8 16.2 15.2 17 17.5"
              stroke={primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        );
      }
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M6.168 18.849a4 4 0 0 1 3.832-2.849h4a4 4 0 0 1 3.832 2.849" />
        </svg>
      );

    default:
      return null;
  }
}

export default function BottomNav({
  activeTab,
  onTabChange,
  cartCount,
  onCartClick,
  primaryColor = '#0258ED', // Official Ctrl YZ Electric Royal Blue
  softFillColor = '#DBEAFE', // Soft tint
}: BottomNavProps) {
  const { dir, locale } = useLanguage();
  const isRTL = dir === 'rtl' || locale === 'ar';

  const rawId = useId();
  const maskId = useMemo(() => `storefront-notch-mask-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);

  // Tab definitions (5 tabs matching e-commerce & affiliate transactions)
  const tabs: { id: NavTabId; label: string }[] = useMemo(() => {
    if (isRTL) {
      return [
        { id: 'home', label: 'الرئيسية' },
        { id: 'favorites', label: 'المفضلة' },
        { id: 'cart', label: 'السلة' },
        { id: 'transactions', label: 'المعاملات' },
        { id: 'profile', label: 'حسابي' },
      ];
    }
    return [
      { id: 'home', label: 'Home' },
      { id: 'favorites', label: 'Wishlist' },
      { id: 'cart', label: 'Cart' },
      { id: 'transactions', label: 'Orders' },
      { id: 'profile', label: 'Account' },
    ];
  }, [isRTL]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [barWidth, setBarWidth] = useState<number>(380);
  const barHeight = 74;

  const activeIndex = useMemo(() => {
    // Map existing activeTab to one of our 5 tabs
    let target = activeTab;
    if (activeTab === 'discover') target = 'home';
    if (activeTab === 'trackOrder') target = 'transactions';

    const idx = tabs.findIndex((t) => t.id === target);
    return idx >= 0 ? idx : 0;
  }, [tabs, activeTab]);

  // RTL-aware initial estimate before DOM measurement (prevents left->right jump on first paint)
  const [activeCenterX, setActiveCenterX] = useState<number>(() => {
    const visualIndex = isRTL ? tabs.length - 1 - activeIndex : activeIndex;
    return ((visualIndex + 0.5) / tabs.length) * 380;
  });

  // Measure tab centers dynamically with ResizeObserver
  const measureTabCenter = useCallback(() => {
    const container = containerRef.current;
    const tabEl = tabRefs.current[activeIndex];
    if (container && tabEl) {
      const cRect = container.getBoundingClientRect();
      const tRect = tabEl.getBoundingClientRect();
      setBarWidth(cRect.width);
      const center = tRect.left - cRect.left + tRect.width / 2;
      setActiveCenterX(center);
    }
  }, [activeIndex]);

  useEffect(() => {
    measureTabCenter();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      measureTabCenter();
    });
    ro.observe(container);

    window.addEventListener('resize', measureTabCenter);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureTabCenter);
    };
  }, [measureTabCenter, tabs.length]);

  const handleTabClick = (tabId: NavTabId) => {
    if (tabId === 'cart') {
      onCartClick();
    } else {
      onTabChange(tabId);
    }
  };

  const activeItem = tabs[activeIndex];

  return (
    <nav
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[430px] select-none"
      style={{ touchAction: 'manipulation' }}
    >
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: `${barHeight}px` }}
      >
        {/* ==============================================================
         * 1. True Transparent SVG Masked Card Background
         * ============================================================== */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            overflow: 'visible',
            filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.12)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.04))',
          }}
          viewBox={`0 0 ${barWidth} ${barHeight}`}
        >
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="-100"
              y="-50"
              width={barWidth + 200}
              height={barHeight + 100}
            >
              {/* Solid white base card with exact 22px rounded corners */}
              <rect x="0" y="0" width={barWidth} height={barHeight} rx="22" ry="22" fill="#FFFFFF" />

              {/* Dynamic Animated Cutout Notch in Black (reveals page background behind it) */}
              <motion.g
                animate={{ x: activeCenterX }}
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 30,
                  mass: 0.8,
                }}
              >
                {/* Mathematical C^1-smooth notch cradle with 8px concentric gap for 56px circle */}
                <path
                  d="M -48 -25
                     L -48 0
                     C -36.3 0, -34.58 11.4, -26.75 20.09
                     A 36 36 0 0 0 26.75 20.09
                     C 34.58 11.4, 36.3 0, 48 0
                     L 48 -25 Z"
                  fill="#000000"
                />
              </motion.g>
            </mask>
          </defs>

          {/* Masked white card geometry */}
          <rect
            x="0"
            y="0"
            width={barWidth}
            height={barHeight}
            rx="22"
            ry="22"
            fill="#FFFFFF"
            mask={`url(#${maskId})`}
          />
        </svg>

        {/* ==============================================================
         * 2. Elevated Floating Active Circle (56px x 56px, nested in cradle)
         * ============================================================== */}
        <motion.div
          animate={{ x: activeCenterX - 28 }}
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 30,
            mass: 0.8,
          }}
          className="absolute top-[-32px] left-0 w-[56px] h-[56px] rounded-full bg-white z-20 flex items-center justify-center cursor-pointer shadow-md"
          style={{
            boxShadow: '0 8px 20px -2px rgba(0, 0, 0, 0.14), 0 3px 8px -1px rgba(0, 0, 0, 0.06)',
          }}
          onClick={() => activeItem && handleTabClick(activeItem.id)}
        >
          {/* Animated Icon Pop on Tab Change */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeItem?.id}
              initial={{ scale: 0.78, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.78, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 24,
              }}
              className="flex items-center justify-center w-full h-full"
            >
              <BottomNavIcon
                id={activeItem?.id || 'home'}
                active={true}
                primaryColor={primaryColor}
                softFillColor={softFillColor}
                cartCount={cartCount}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ==============================================================
         * 3. Navigation Items Grid (5 Equal Columns)
         * ============================================================== */}
        <div className="relative z-10 w-full h-full grid grid-cols-5 items-stretch">
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeItem?.id;

            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                onClick={() => handleTabClick(tab.id)}
                className="relative flex flex-col items-center justify-between pt-3 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-400 rounded-xl transition-transform active:scale-95"
              >
                {/* Inactive Icon Slot (Fades out when active tab slides here) */}
                <div className="h-[24px] flex items-center justify-center relative">
                  <motion.div
                    animate={{
                      opacity: isActive ? 0 : 1,
                      scale: isActive ? 0.7 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <BottomNavIcon
                      id={tab.id}
                      active={false}
                      primaryColor={primaryColor}
                      softFillColor={softFillColor}
                      cartCount={cartCount}
                    />
                  </motion.div>
                </div>

                {/* Tab Label (Shared baseline alignment for both Active & Inactive) */}
                <span
                  className={`text-[11px] leading-tight transition-colors duration-200 ${
                    isActive
                      ? 'font-bold text-[#111111] text-[11.5px]'
                      : 'font-normal text-[#555555]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ==============================================================
         * 4. Optional Mobile Indicator Pill
         * ============================================================== */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[34%] h-[4px] bg-[#666666] rounded-full opacity-35 pointer-events-none" />
      </div>
    </nav>
  );
}
