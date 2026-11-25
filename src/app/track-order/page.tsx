'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import OrderTrackingScreen from '@/components/storefront/OrderTrackingScreen';

export default function TrackOrderPage() {
  const router = useRouter();

  return (
    <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      <OrderTrackingScreen onBack={() => router.push('/')} />
    </div>
  );
}
