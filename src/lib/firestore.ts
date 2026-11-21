// Re-export all types and methods from dataService for unified access
export * from './types';
export * from './dataService';

// Backward compatibility helpers for existing components
import {
  getProducts as dsGetProducts,
  getProductById as dsGetProductById,
  createOrder as dsCreateOrder,
  getOrders as dsGetOrders,
  getOrderById as dsGetOrderById,
  getOrderByNumber as dsGetOrderByNumber,
  updateOrderStatus as dsUpdateOrderStatus,
  getSettings as dsGetSettings,
  updateSettings as dsUpdateSettings,
} from './dataService';
import type { Product, Order, OrderStatus } from './types';

export const getProducts = dsGetProducts;
export const getProduct = dsGetProductById;
export const getOrders = dsGetOrders;
export const getOrder = dsGetOrderById;
export const getOrderByNumber = dsGetOrderByNumber;
export const updateOrderStatus = dsUpdateOrderStatus;
export const getSettings = dsGetSettings;
export const updateSettings = dsUpdateSettings;

export async function createOrder(
  data: any
): Promise<{ id: string; orderNumber: string }> {
  // Normalize data whether coming from customer storefront checkout or marketer direct order
  let normalizedItems: any[] = [];
  if (Array.isArray(data.items)) {
    normalizedItems = data.items.map((it: any) => ({
      productId: it.productId || it.id || '',
      name: it.name || it.name_ar || it.name_en || 'منتج',
      price: Number(it.price || it.salePrice || 0),
      wholesalePrice: Number(it.wholesalePrice || it.price * 0.7 || 0),
      commission: Number(it.commission || 0),
      quantity: Number(it.quantity || 1),
      size: it.size || it.selectedSize || 'Standard',
      color: it.color || it.selectedColor || '',
      image: it.image || it.images?.[0] || '',
    }));
  }

  const orderPayload: Partial<Order> = {
    affiliateId: data.affiliateId || data.merchantId,
    affiliateName: data.affiliateName,
    affiliatePhone: data.affiliatePhone,
    customerName: data.customerName || data.customer?.name || '',
    customerPhone: data.customerPhone || data.customer?.phone || '',
    customerPhone2: data.customerPhone2 || '',
    governorate: data.governorate || data.customer?.governorate || 'القاهرة',
    customerCity: data.customerCity || data.customer?.city || '',
    customerAddress: data.customerAddress || data.customer?.address || '',
    notes: data.notes || data.customer?.notes || '',
    items: normalizedItems,
    shippingFee: Number(data.shippingFee ?? 45),
  };

  const created = await dsCreateOrder(orderPayload);
  return { id: created.id, orderNumber: created.orderNumber };
}
