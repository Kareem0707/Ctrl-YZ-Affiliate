'use client';

import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type NavIconType = 'home' | 'cards' | 'add-funds' | 'transaction' | 'profile';

export interface NavItem {
  id: string;
  label: string;
  iconName?: NavIconType;
  badge?: number | string;
}

export interface LiquidBottomNavProps {
  items?: NavItem[];
  activeTab?: string;
  onChange?: (id: string) => void;
  primaryColor?: string;
  softFillColor?: string;
  isRTL?: boolean;
  showHomeIndicator?: boolean;
  className?: string;
}

// Default 5 navigation items as requested
const DEFAULT_ITEMS_LTR: NavItem[] = [
  { id: 'home', label: 'Home', iconName: 'home' },
  { id: 'cards', label: 'Cards', iconName: 'cards' },
  { id: 'add-funds', label: 'Add Funds', iconName: 'add-funds' },
  { id: 'transaction', label: 'Transaction', iconName: 'transaction' },
  { id: 'profile', label: 'Profile', iconName: 'profile' },
];

const DEFAULT_ITEMS_RTL: NavItem[] = [
  { id: 'home', label: 'الرئيسية', iconName: 'home' },
  { id: 'cards', label: 'البطاقات', iconName: 'cards' },
  { id: 'add-funds', label: 'شحن رصيد', iconName: 'add-funds' },
  { id: 'transaction', label: 'المعاملات', iconName: 'transaction' },
  { id: 'profile', label: 'حسابي', iconName: 'profile' },
];

/* -------------------------------------------------------------
 * Custom Duotone & Minimalist Line-Art Icons (26px Active / 22px Inactive)
 * ------------------------------------------------------------- */
function NavIcon({
  name,
  active,
  primaryColor = '#4324E8',
  softFillColor = '#B8A9FA',
}: {
  name?: NavIconType;
  active: boolean;
  primaryColor?: string;
  softFillColor?: string;
}) {
  switch (name) {
    case 'home':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 10.5L12 3.5L20 10.5V19C20 19.5523 19.5523 20 19 20H15V14C15 13.4477 14.5523 13 14 13H10C9.44772 13 9 13.4477 9 14V20H5C4.44772 20 4 19.5523 4 19V10.5Z"
              fill={softFillColor}
            />
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

    case 'cards':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2.5" y="5.5" width="19" height="13" rx="3" fill={softFillColor} opacity="0.85" />
            <rect x="2.5" y="5.5" width="19" height="13" rx="3" stroke={primaryColor} strokeWidth="2.2" />
            <path d="M2.5 10H21.5" stroke={primaryColor} strokeWidth="2.2" strokeLinecap="round" />
            <rect x="5.5" y="13.5" width="4" height="2.5" rx="0.6" fill={primaryColor} />
          </svg>
        );
      }
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      );

    case 'add-funds':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z"
              fill={softFillColor}
              opacity="0.85"
            />
            <path
              d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z"
              stroke={primaryColor}
              strokeWidth="2.2"
            />
            <path d="M17 7V5C17 3.89543 16.1046 3 15 3H6" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="13" r="3.2" fill={primaryColor} />
            <path d="M16 11.5V14.5M14.5 13H17.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          <path d="M16 7V5a2 2 0 0 0-2-2H6" />
          <line x1="12" y1="11" x2="12" y2="15" />
          <line x1="10" y1="13" x2="14" y2="13" />
        </svg>
      );

    case 'transaction':
      if (active) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8.5" fill={softFillColor} opacity="0.65" />
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
            <circle cx="12" cy="12" r="9.5" fill={softFillColor} opacity="0.75" />
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

export default function LiquidBottomNav({
  items,
  activeTab: controlledActiveTab,
  onChange,
  primaryColor = '#4324E8',
  softFillColor = '#B8A9FA',
  isRTL = false,
  showHomeIndicator = true,
  className = '',
}: LiquidBottomNavProps) {
  // Generate a unique ID for the SVG mask to avoid ID collisions if multiple instances render
  const rawId = useId();
  const maskId = useMemo(() => `liquid-notch-mask-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);

  const navItems = items || (isRTL ? DEFAULT_ITEMS_RTL : DEFAULT_ITEMS_LTR);

  const [internalActive, setInternalActive] = useState<string>(navItems[0]?.id || 'home');
  const currentTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActive;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [barWidth, setBarWidth] = useState<number>(380);
  const barHeight = 74;

  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex((it) => it.id === currentTab);
    return idx >= 0 ? idx : 0;
  }, [navItems, currentTab]);

  // Initial estimate of active tab center to prevent visual flash before DOM measurement
  const initialEstimate = useMemo(() => {
    const count = navItems.length;
    return ((activeIndex + 0.5) / count) * barWidth;
  }, [activeIndex, navItems.length, barWidth]);

  const [activeCenterX, setActiveCenterX] = useState<number>(initialEstimate);

  // Measure tab centers dynamically with ResizeObserver
  const measureTabCenter = () => {
    const container = containerRef.current;
    const tabEl = tabRefs.current[activeIndex];
    if (container && tabEl) {
      const cRect = container.getBoundingClientRect();
      const tRect = tabEl.getBoundingClientRect();
      setBarWidth(cRect.width);
      const center = tRect.left - cRect.left + tRect.width / 2;
      setActiveCenterX(center);
    }
  };

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
  }, [activeIndex, navItems.length]);

  const handleTabClick = (id: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActive(id);
    }
    onChange?.(id);
  };

  const activeItem = navItems[activeIndex];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[420px] select-none ${className}`}
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
            filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.10)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.04))',
          }}
          viewBox={`0 0 ${barWidth} ${barHeight}`}
        >
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-100" y="-50" width={barWidth + 200} height={barHeight + 100}>
              {/* Solid white base card with exact 22px rounded corners */}
              <rect x="0" y="0" width={barWidth} height={barHeight} rx="22" ry="22" fill="#FFFFFF" />

              {/* Dynamic Animated Cutout Notch in Black (Cuts through the card revealing page background) */}
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
          className="absolute top-[-32px] left-0 w-[56px] h-[56px] rounded-full bg-white z-20 flex items-center justify-center cursor-pointer"
          style={{
            boxShadow: '0 8px 20px -2px rgba(0, 0, 0, 0.12), 0 3px 8px -1px rgba(0, 0, 0, 0.06)',
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
              <NavIcon
                name={activeItem?.iconName}
                active={true}
                primaryColor={primaryColor}
                softFillColor={softFillColor}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ==============================================================
         * 3. Navigation Items Grid (5 Equal Columns)
         * ============================================================== */}
        <div className="relative z-10 w-full h-full grid grid-cols-5 items-stretch">
          {navItems.map((item, idx) => {
            const isActive = item.id === currentTab;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                onClick={() => handleTabClick(item.id)}
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
                    <NavIcon
                      name={item.iconName}
                      active={false}
                      primaryColor={primaryColor}
                      softFillColor={softFillColor}
                    />
                  </motion.div>

                  {/* Optional Badge */}
                  {item.badge !== undefined && (
                    <span
                      className="absolute -top-1.5 -right-2 text-[10px] font-bold text-white px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Tab Label (Shared baseline alignment for both Active & Inactive) */}
                <span
                  className={`text-[11px] leading-tight transition-colors duration-200 ${
                    isActive
                      ? 'font-bold text-[#111111] text-[11.5px]'
                      : 'font-normal text-[#555555]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ==============================================================
         * 4. Optional Mobile Indicator Pill
         * ============================================================== */}
        {showHomeIndicator && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[34%] h-[4px] bg-[#666666] rounded-full opacity-40 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
