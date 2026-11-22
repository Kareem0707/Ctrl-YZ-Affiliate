import {
  Product,
  Marketer,
  Order,
  OrderStatus,
  WithdrawalRequest,
  GovernorateShipping,
  PlatformSettings,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_MARKETERS,
  INITIAL_ORDERS,
  INITIAL_WITHDRAWALS,
  INITIAL_GOVERNORATES,
  INITIAL_SETTINGS,
} from './mockData';
import { broadcastLocalChange } from './realtimeSync';

const KEYS = {
  PRODUCTS: 'ctrl_yz_products',
  ORDERS: 'ctrl_yz_orders',
  MARKETERS: 'ctrl_yz_marketers',
  WITHDRAWALS: 'ctrl_yz_withdrawals',
  GOVERNORATES: 'ctrl_yz_governorates',
  SETTINGS: 'ctrl_yz_settings',
  CATALOG_VERSION: 'ctrl_yz_catalog_version',
};

const CURRENT_CATALOG_VERSION = 'v6_full_realtime_database';

function checkCatalogVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = localStorage.getItem(KEYS.CATALOG_VERSION);
    if (current !== CURRENT_CATALOG_VERSION) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
      localStorage.setItem(KEYS.CATALOG_VERSION, CURRENT_CATALOG_VERSION);
    }
  } catch (e) {
    console.error('Error verifying catalog version:', e);
  }
}

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    checkCatalogVersion();
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('affiliate_data_changed', { detail: { key } }));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

export function generateOrderNumber(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${digits}`;
}

export function generateWithdrawalId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `WD-${digits}`;
}

// ─── Products API ─────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStorageItem(KEYS.PRODUCTS, data);
        return data;
      }
    } catch {
      // Fallback to local storage if API is unreachable
    }
  }
  return getStorageItem<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/products/${id}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

export async function saveProduct(productData: Partial<Product>): Promise<Product> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const saved = await res.json();
        broadcastLocalChange('product_saved', saved.id);
        return saved;
      }
    } catch {
      // fallback
    }
  }

  // Local fallback
  const products = await getProducts();
  const now = new Date().toISOString();

  if (productData.id) {
    const index = products.findIndex((p) => p.id === productData.id);
    if (index > -1) {
      const updated: Product = {
        ...products[index],
        ...productData,
        updatedAt: now,
      };
      products[index] = updated;
      setStorageItem(KEYS.PRODUCTS, products);
      broadcastLocalChange('product_saved', updated.id);
      return updated;
    }
  }

  const newProduct: Product = {
    id: `prod-${Date.now().toString(36)}`,
    name_en: productData.name_en || 'New Product',
    name_ar: productData.name_ar || 'منتج جديد',
    brand: productData.brand || 'Ctrl YZ',
    category: productData.category || 'Streetwear',
    costPrice: Number(productData.costPrice || 260),
    wholesalePrice: Number(productData.wholesalePrice || 370),
    suggestedPrice: Number(productData.suggestedPrice || 590),
    minPrice: Number(productData.minPrice || 510),
    price: Number(productData.suggestedPrice || 590),
    salePrice: productData.salePrice ? Number(productData.salePrice) : undefined,
    commission: Number(productData.commission || (Number(productData.suggestedPrice || 590) - Number(productData.wholesalePrice || 370))),
    description_en: productData.description_en || '',
    description_ar: productData.description_ar || '',
    images: productData.images && productData.images.length > 0 ? productData.images : ['/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'],
    marketingDriveUrl: productData.marketingDriveUrl || '',
    adCopies: productData.adCopies || [],
    sizes: productData.sizes && productData.sizes.length > 0 ? productData.sizes : ['M', 'L', 'XL', '2XL', '3XL'],
    colors: productData.colors && productData.colors.length > 0 ? productData.colors : [{ name: 'Jet Black', hex: '#111827' }],
    stock: Number(productData.stock ?? 100),
    isActive: productData.isActive !== false,
    isFeatured: Boolean(productData.isFeatured),
    createdAt: now,
    updatedAt: now,
  };

  products.unshift(newProduct);
  setStorageItem(KEYS.PRODUCTS, products);
  broadcastLocalChange('product_saved', newProduct.id);
  return newProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      broadcastLocalChange('product_deleted', id);
    } catch {
      // fallback
    }
  }
  const products = await getProducts();
  const filtered = products.filter((p) => p.id !== id);
  setStorageItem(KEYS.PRODUCTS, filtered);
  broadcastLocalChange('product_deleted', id);
}

// ─── Orders API ───────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStorageItem(KEYS.ORDERS, data);
        return data;
      }
    } catch {
      // fallback
    }
  }
  return getStorageItem<Order[]>(KEYS.ORDERS, INITIAL_ORDERS);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const orders = await getOrders();
  return orders.find((o) => o.id === id) || null;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/orders?orderNumber=${encodeURIComponent(orderNumber)}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const orders = await getOrders();
  const cleaned = orderNumber.trim().toUpperCase();
  return orders.find((o) => o.orderNumber.toUpperCase() === cleaned) || null;
}

export async function getOrdersByAffiliate(affiliateId: string): Promise<Order[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/orders?affiliateId=${encodeURIComponent(affiliateId)}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const orders = await getOrders();
  return orders.filter((o) => o.affiliateId === affiliateId);
}

export async function createOrder(data: Partial<Order>): Promise<Order> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        broadcastLocalChange('order_created', created.id);
        return created;
      }
    } catch (e) {
      console.warn('API createOrder failed, falling back to local engine:', e);
    }
  }

  // Local fallback logic
  const orders = await getOrders();
  const now = new Date().toISOString();
  const orderNumber = generateOrderNumber();

  const items = data.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const wholesaleTotal = items.reduce((sum, item) => sum + (item.wholesalePrice || 0) * item.quantity, 0);
  const affiliateCommission = items.reduce(
    (sum, item) => sum + (item.commission || (item.price - item.wholesalePrice)) * item.quantity,
    0
  );
  const shippingFee = Number(data.shippingFee ?? 45);
  const totalAmount = subtotal + shippingFee;
  const platformProfit = Math.max(0, wholesaleTotal - (items.length * 150));

  const newOrder: Order = {
    id: `ord-${Date.now().toString(36)}`,
    orderNumber,
    affiliateId: data.affiliateId,
    affiliateName: data.affiliateName,
    affiliatePhone: data.affiliatePhone,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    customerPhone2: data.customerPhone2 || '',
    governorate: data.governorate || 'القاهرة',
    customerCity: data.customerCity || '',
    customerAddress: data.customerAddress || '',
    notes: data.notes || '',
    items,
    subtotal,
    shippingFee,
    totalAmount,
    wholesaleTotal,
    affiliateCommission,
    platformProfit,
    status: 'pending',
    shippingCompany: data.shippingCompany,
    trackingNumber: data.trackingNumber,
    statusNotes: 'تم إنشاء الطلب بنجاح وهو قيد المراجعة',
    statusHistory: [
      { status: 'pending', timestamp: now, note: 'تم تسجيل الطلب في النظام' },
    ],
    isCommissionPaid: false,
    createdAt: now,
    updatedAt: now,
  };

  orders.unshift(newOrder);
  setStorageItem(KEYS.ORDERS, orders);

  if (data.affiliateId) {
    const marketers = await getMarketers();
    const marketer = marketers.find((m) => m.id === data.affiliateId || m.uid === data.affiliateId);
    if (marketer) {
      marketer.pendingBalance += affiliateCommission;
      marketer.ordersCount += 1;
      setStorageItem(KEYS.MARKETERS, marketers);
    }
  }

  const products = await getProducts();
  items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
    }
  });
  setStorageItem(KEYS.PRODUCTS, products);

  broadcastLocalChange('order_created', newOrder.id);
  return newOrder;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: { shippingCompany?: string; trackingNumber?: string; note?: string }
): Promise<Order> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          shippingCompany: options?.shippingCompany,
          trackingNumber: options?.trackingNumber,
          statusNotes: options?.note,
          note: options?.note,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        broadcastLocalChange('order_updated', updated.id);
        return updated;
      }
    } catch {
      // fallback
    }
  }

  // Local fallback logic
  const orders = await getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) throw new Error('Order not found');

  const order = orders[index];
  const previousStatus = order.status;
  const now = new Date().toISOString();

  order.status = newStatus;
  order.updatedAt = now;
  if (options?.shippingCompany) order.shippingCompany = options.shippingCompany;
  if (options?.trackingNumber) order.trackingNumber = options.trackingNumber;
  if (options?.note) order.statusNotes = options.note;

  if (!order.statusHistory) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: newStatus,
    timestamp: now,
    note: options?.note || `تم تغيير الحالة إلى ${newStatus}`,
  });

  if (newStatus === 'delivered' && !order.isCommissionPaid && order.affiliateId) {
    order.isCommissionPaid = true;
    const marketers = await getMarketers();
    const marketer = marketers.find((m) => m.id === order.affiliateId || m.uid === order.affiliateId);
    if (marketer) {
      marketer.pendingBalance = Math.max(0, marketer.pendingBalance - order.affiliateCommission);
      marketer.walletBalance += order.affiliateCommission;
      marketer.totalEarned += order.affiliateCommission;
      marketer.deliveredCount += 1;
      marketer.deliveryRate = Math.round((marketer.deliveredCount / Math.max(1, marketer.ordersCount)) * 100);
      setStorageItem(KEYS.MARKETERS, marketers);
    }
  }

  if (
    (newStatus === 'returned' || newStatus === 'cancelled') &&
    previousStatus !== 'returned' &&
    previousStatus !== 'cancelled'
  ) {
    if (order.affiliateId && !order.isCommissionPaid) {
      const marketers = await getMarketers();
      const marketer = marketers.find((m) => m.id === order.affiliateId || m.uid === order.affiliateId);
      if (marketer) {
        marketer.pendingBalance = Math.max(0, marketer.pendingBalance - order.affiliateCommission);
        marketer.deliveryRate = Math.round((marketer.deliveredCount / Math.max(1, marketer.ordersCount)) * 100);
        setStorageItem(KEYS.MARKETERS, marketers);
      }
    }
  }

  orders[index] = order;
  setStorageItem(KEYS.ORDERS, orders);
  broadcastLocalChange('order_updated', order.id);
  return order;
}

export async function deleteOrder(id: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      broadcastLocalChange('order_deleted', id);
    } catch {
      // fallback
    }
  }
  const orders = await getOrders();
  setStorageItem(KEYS.ORDERS, orders.filter((o) => o.id !== id));
  broadcastLocalChange('order_deleted', id);
}

// ─── Marketers API ────────────────────────────────────────────

export async function getMarketers(): Promise<Marketer[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/marketers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStorageItem(KEYS.MARKETERS, data);
        return data;
      }
    } catch {
      // fallback
    }
  }
  return getStorageItem<Marketer[]>(KEYS.MARKETERS, INITIAL_MARKETERS);
}

export async function getMarketerById(id: string): Promise<Marketer | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/marketers?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const marketers = await getMarketers();
  return marketers.find((m) => m.id === id || m.uid === id) || null;
}

export async function getMarketerByCode(code: string): Promise<Marketer | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/marketers?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const marketers = await getMarketers();
  const cleaned = code.trim().toLowerCase();
  return marketers.find((m) => m.affiliateCode.toLowerCase() === cleaned) || null;
}

export async function saveMarketer(data: Partial<Marketer>): Promise<Marketer> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/marketers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const saved = await res.json();
        broadcastLocalChange('marketer_saved', saved.id);
        return saved;
      }
    } catch {
      // fallback
    }
  }

  const marketers = await getMarketers();
  const now = new Date().toISOString();

  if (data.id) {
    const idx = marketers.findIndex((m) => m.id === data.id);
    if (idx > -1) {
      const updated: Marketer = { ...marketers[idx], ...data };
      marketers[idx] = updated;
      setStorageItem(KEYS.MARKETERS, marketers);
      broadcastLocalChange('marketer_saved', updated.id);
      return updated;
    }
  }

  const newMarketer: Marketer = {
    id: `marketer-${Date.now().toString(36)}`,
    uid: data.uid || `user-${Date.now()}`,
    name: data.name || 'مسوق جديد',
    email: data.email || 'marketer@example.com',
    phone: data.phone || '',
    whatsapp: data.whatsapp || data.phone || '',
    affiliateCode: (data.affiliateCode || `AFF-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
    walletBalance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    ordersCount: 0,
    deliveredCount: 0,
    deliveryRate: 100,
    status: 'active',
    payoutInfo: data.payoutInfo || {
      method: 'vodafone_cash',
      accountNumber: data.phone || '',
      accountHolderName: data.name || '',
    },
    createdAt: now,
  };

  marketers.unshift(newMarketer);
  setStorageItem(KEYS.MARKETERS, marketers);
  broadcastLocalChange('marketer_saved', newMarketer.id);
  return newMarketer;
}

export async function toggleMarketerStatus(id: string): Promise<Marketer> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/marketers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_status' }),
      });
      if (res.ok) {
        const updated = await res.json();
        broadcastLocalChange('marketer_saved', id);
        return updated;
      }
    } catch {
      // fallback
    }
  }

  const marketers = await getMarketers();
  const marketer = marketers.find((m) => m.id === id);
  if (!marketer) throw new Error('Marketer not found');
  marketer.status = marketer.status === 'active' ? 'suspended' : 'active';
  setStorageItem(KEYS.MARKETERS, marketers);
  broadcastLocalChange('marketer_saved', id);
  return marketer;
}

export async function approveMarketer(id: string, customCode?: string): Promise<Marketer> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/marketers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', affiliateCode: customCode }),
      });
      if (res.ok) {
        const updated = await res.json();
        broadcastLocalChange('marketer_saved', id);
        return updated;
      }
    } catch {
      // fallback
    }
  }

  const marketers = await getMarketers();
  const marketer = marketers.find((m) => m.id === id);
  if (!marketer) throw new Error('Marketer not found');
  marketer.status = 'active';
  if (customCode) marketer.affiliateCode = customCode.trim().toUpperCase();
  marketer.reviewedAt = new Date().toISOString();
  marketer.reviewedBy = 'الإدارة العامة';
  setStorageItem(KEYS.MARKETERS, marketers);
  broadcastLocalChange('marketer_saved', id);
  return marketer;
}

export async function rejectMarketer(id: string, reason?: string): Promise<Marketer> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/marketers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject', rejectionReason: reason }),
      });
      if (res.ok) {
        const updated = await res.json();
        broadcastLocalChange('marketer_saved', id);
        return updated;
      }
    } catch {
      // fallback
    }
  }

  const marketers = await getMarketers();
  const marketer = marketers.find((m) => m.id === id);
  if (!marketer) throw new Error('Marketer not found');
  marketer.status = 'rejected';
  marketer.rejectionReason = reason || 'لم يستوفِ الشروط المطلوبة';
  marketer.reviewedAt = new Date().toISOString();
  marketer.reviewedBy = 'الإدارة العامة';
  setStorageItem(KEYS.MARKETERS, marketers);
  broadcastLocalChange('marketer_saved', id);
  return marketer;
}

// ─── Withdrawals API ──────────────────────────────────────────

export async function getWithdrawals(): Promise<WithdrawalRequest[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/withdrawals', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStorageItem(KEYS.WITHDRAWALS, data);
        return data;
      }
    } catch {
      // fallback
    }
  }
  return getStorageItem<WithdrawalRequest[]>(KEYS.WITHDRAWALS, INITIAL_WITHDRAWALS);
}

export async function getWithdrawalsByMarketer(marketerId: string): Promise<WithdrawalRequest[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/withdrawals?marketerId=${encodeURIComponent(marketerId)}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
  }
  const withdrawals = await getWithdrawals();
  return withdrawals.filter((w) => w.marketerId === marketerId);
}

export async function createWithdrawalRequest(
  data: Omit<WithdrawalRequest, 'id' | 'requestId' | 'status' | 'createdAt'>
): Promise<WithdrawalRequest> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        broadcastLocalChange('withdrawal_created', created.id);
        return created;
      }
    } catch {
      // fallback
    }
  }

  // Local fallback
  const withdrawals = await getWithdrawals();
  const marketers = await getMarketers();
  const marketer = marketers.find((m) => m.id === data.marketerId);

  if (!marketer) throw new Error('Marketer not found');
  if (marketer.walletBalance < data.amount) {
    throw new Error('رصيد المحفظة المتاح أقل من المبلغ المطلوب سحبه');
  }

  marketer.walletBalance -= data.amount;
  setStorageItem(KEYS.MARKETERS, marketers);

  const now = new Date().toISOString();
  const newWithdrawal: WithdrawalRequest = {
    id: `wd-${Date.now().toString(36)}`,
    requestId: generateWithdrawalId(),
    marketerId: data.marketerId,
    marketerName: data.marketerName || marketer.name,
    marketerPhone: data.marketerPhone || marketer.phone,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    accountDetails: data.accountDetails,
    status: 'pending',
    createdAt: now,
  };

  withdrawals.unshift(newWithdrawal);
  setStorageItem(KEYS.WITHDRAWALS, withdrawals);
  broadcastLocalChange('withdrawal_created', newWithdrawal.id);
  return newWithdrawal;
}

export async function updateWithdrawalStatus(
  id: string,
  newStatus: 'approved' | 'rejected',
  receiptOrReason?: string
): Promise<WithdrawalRequest> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, receiptOrReason }),
      });
      if (res.ok) {
        const updated = await res.json();
        broadcastLocalChange('withdrawal_updated', id);
        return updated;
      }
    } catch {
      // fallback
    }
  }

  // Local fallback
  const withdrawals = await getWithdrawals();
  const index = withdrawals.findIndex((w) => w.id === id);
  if (index === -1) throw new Error('Withdrawal request not found');

  const req = withdrawals[index];
  const now = new Date().toISOString();

  req.status = newStatus;
  req.processedAt = now;

  const marketers = await getMarketers();
  const marketer = marketers.find((m) => m.id === req.marketerId);

  if (newStatus === 'approved') {
    req.transactionReceipt = receiptOrReason || 'TX-SUCCESS-VERIFIED';
    if (marketer) {
      marketer.totalWithdrawn += req.amount;
      setStorageItem(KEYS.MARKETERS, marketers);
    }
  } else if (newStatus === 'rejected') {
    req.rejectReason = receiptOrReason || 'تم رفض العملية';
    if (marketer) {
      marketer.walletBalance += req.amount;
      setStorageItem(KEYS.MARKETERS, marketers);
    }
  }

  withdrawals[index] = req;
  setStorageItem(KEYS.WITHDRAWALS, withdrawals);
  broadcastLocalChange('withdrawal_updated', id);
  return req;
}

// ─── Governorates Shipping API ───────────────────────────────

export async function getShippingRates(): Promise<GovernorateShipping[]> {
  return getStorageItem<GovernorateShipping[]>(KEYS.GOVERNORATES, INITIAL_GOVERNORATES);
}

export async function updateShippingRate(id: string, fee: number): Promise<void> {
  const rates = await getShippingRates();
  const item = rates.find((r) => r.id === id);
  if (item) {
    item.fee = fee;
    setStorageItem(KEYS.GOVERNORATES, rates);
  }
}

// ─── Settings API ─────────────────────────────────────────────

export async function getSettings(): Promise<PlatformSettings> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setStorageItem(KEYS.SETTINGS, data.settings);
          return data.settings;
        }
      }
    } catch {
      // fallback
    }
  }
  return getStorageItem<PlatformSettings>(KEYS.SETTINGS, INITIAL_SETTINGS);
}

export async function updateSettings(settingsData: Partial<PlatformSettings>): Promise<PlatformSettings> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsData }),
      });
      if (res.ok) {
        const data = await res.json();
        broadcastLocalChange('settings_updated');
        return data.settings;
      }
    } catch {
      // fallback
    }
  }
  const current = await getSettings();
  const updated = { ...current, ...settingsData };
  setStorageItem(KEYS.SETTINGS, updated);
  broadcastLocalChange('settings_updated');
  return updated;
}

// ─── Platform Analytics API ──────────────────────────────────

export async function getAdminStats() {
  const orders = await getOrders();
  const products = await getProducts();
  const marketers = await getMarketers();
  const withdrawals = await getWithdrawals();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const totalWholesale = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.wholesaleTotal : 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (o.status === 'delivered' ? o.platformProfit : 0), 0);
  const totalCommissions = orders.reduce((sum, o) => sum + (o.status === 'delivered' ? o.affiliateCommission : 0), 0);
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const deliveryRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');

  return {
    totalRevenue,
    totalWholesale,
    totalProfit,
    totalCommissions,
    ordersCount: orders.length,
    deliveredCount: deliveredOrders.length,
    deliveryRate,
    productsCount: products.length,
    marketersCount: marketers.length,
    pendingWithdrawalsCount: pendingWithdrawals.length,
    pendingWithdrawalsAmount: pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0),
  };
}
