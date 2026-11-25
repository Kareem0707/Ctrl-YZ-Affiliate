'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';

interface SafeProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  iconSize?: number;
  sizes?: string;
  priority?: boolean;
}

const OPTIMIZED_REMOTE_HOSTS = [
  'lh3.googleusercontent.com',
  '.public.blob.vercel-storage.com',
  '.r2.dev',
];

function canOptimizeWithNextImage(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    const parsed = new URL(src);
    if (parsed.protocol !== 'https:') return false;
    return OPTIMIZED_REMOTE_HOSTS.some((h) =>
      h.startsWith('.') ? parsed.hostname.endsWith(h) : parsed.hostname === h
    );
  } catch {
    return false;
  }
}

/**
 * Resilient Next.js Image component (`next/image`) with WebP/AVIF optimization,
 * responsive `sizes`, and graceful `onError` fallback placeholder.
 */
export default function SafeProductImage({
  src,
  alt,
  className = 'object-contain',
  placeholderClassName = 'w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 gap-1.5 p-3',
  iconSize = 26,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  priority = false,
}: SafeProductImageProps) {
  const cleanedSrc = typeof src === 'string' ? src.trim() : '';
  const [hasError, setHasError] = useState(!cleanedSrc);

  useEffect(() => {
    setHasError(!cleanedSrc);
  }, [cleanedSrc]);

  if (hasError || !cleanedSrc) {
    return (
      <div className={placeholderClassName} role="img" aria-label={alt}>
        <ShoppingBag size={iconSize} strokeWidth={1.4} className="text-zinc-500" />
        <span className="text-[10px] font-medium text-zinc-500 text-center line-clamp-1">
          Ctrl YZ
        </span>
      </div>
    );
  }

  const unoptimized = !canOptimizeWithNextImage(cleanedSrc);

  return (
    <div className="relative w-full h-full">
      <Image
        src={cleanedSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        onError={() => setHasError(true)}
        className={className}
      />
    </div>
  );
}
