'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import OrderTrackingScreen from '@/components/storefront/OrderTrackingScreen';

export default function TrackOrderPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <OrderTrackingScreen onBack={() => router.push('/')} />
    </div>
  );
}
