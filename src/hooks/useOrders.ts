'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrders, createOrder as dsCreateOrder } from '@/lib/dataService';
import type { Order } from '@/lib/types';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  createNewOrder: (orderData: Partial<Order>) => Promise<Order>;
  refresh: () => Promise<void>;
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => {
      fetchOrders();
    };

    window.addEventListener('affiliate_data_changed', handleUpdate);
    return () => window.removeEventListener('affiliate_data_changed', handleUpdate);
  }, [fetchOrders]);

  const createNewOrder = useCallback(async (orderData: Partial<Order>) => {
    return dsCreateOrder(orderData);
  }, []);

  return { orders, loading, createNewOrder, refresh: fetchOrders };
}
