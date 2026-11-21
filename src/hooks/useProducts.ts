'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProducts } from '@/lib/dataService';
import type { Product } from '@/lib/types';

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err?.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const handleUpdate = () => {
      fetchProducts();
    };

    window.addEventListener('affiliate_data_changed', handleUpdate);
    return () => window.removeEventListener('affiliate_data_changed', handleUpdate);
  }, [fetchProducts]);

  return { products, loading, error, refresh: fetchProducts };
}
