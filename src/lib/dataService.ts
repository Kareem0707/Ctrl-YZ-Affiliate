import {
  Product,
  Marketer,
  MarketerStatus,
  Order,
  OrderStatus,
  WithdrawalRequest,
  GovernorateShipping,
  PlatformSettings,
} from './types';
import {
  INITIAL_GOVERNORATES,
  INITIAL_SETTINGS,
} from './mockData';
import { broadcastLocalChange } from './realtimeSync';

export interface PublicReferralInfo {
  id: string;
  affiliateCode: string;
  name: string;
}

export interface CreateOrderRequestPayload {
  source?: 'STOREFRONT' | 'AFFILIATE_DIRECT';
  affiliateCode?: string;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  customerPhone2?: string;
  governorate: string;
  customerCity?: string;
  customerAddress: string;
  notes?: string;
  idempotencyKey?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    size: string;
    color?: string;
    quantity: number;
    customUnitPrice?: number;
  }>;
}

export interface AdminStatsResponse {
  totalRevenue: number;
  totalSubtotal: number;
  totalWholesale: number;
  totalProfit: number;
  totalCommissions: number;
  ordersCount: number;
  activeOrdersCount: number;
  deliveredCount: number;
  returnedCount: number;
  partiallyReturnedCount: number;
  cancelledCount: number;
  pendingOrdersCount: number;
  deliveryRate: number;
  productsCount: number;
  marketersCount: number;
  activeMarketersCount: number;
  pendingMarketersCount: number;
  affiliateBalances: {
    walletBalance: number;
    lockedBalance: number;
    pendingBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
  };
  releasableCommissions: {
    count: number;
    amount: number;
  };
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
}

function unwrapCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

// ─── Products API (Prisma + Pagination) ───────────────────────

export async function getProducts(options?: {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  category?: string;
  search?: string;
}): Promise<Product[]> {
  if (typeof window === 'undefined') return [];
  try {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    params.set('limit', String(options?.limit ?? 100));
    if (options?.includeInactive) params.set('includeInactive', 'true');
    if (options?.category) params.set('category', options.category);
    if (options?.search) params.set('search', options.search);

    const res = await fetch(`/api/products?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return [];
    const payload = await res.json();
    return unwrapCollection<Product>(payload);
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!id || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null;
  }
}

export async function saveProduct(productData: Partial<Product>): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر حفظ بيانات المنتج');
  }

  broadcastLocalChange('product_saved', body.id);
  return body as Product;
}

export async function deleteProduct(id: string): Promise<{ success: boolean; softDeleted?: boolean }> {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر حذف المنتج');
  }

  broadcastLocalChange('product_deleted', id);
  return body;
}

// ─── Orders API (Server-Authoritative Prisma + Pagination) ────

export async function getOrders(options?: {
  page?: number;
  limit?: number;
  status?: string;
  affiliateId?: string;
  search?: string;
}): Promise<Order[]> {
  if (typeof window === 'undefined') return [];
  try {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    params.set('limit', String(options?.limit ?? 100));
    if (options?.status) params.set('status', options.status);
    if (options?.affiliateId) params.set('affiliateId', options.affiliateId);
    if (options?.search) params.set('search', options.search);

    const res = await fetch(`/api/orders?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return [];
    const payload = await res.json();
    return unwrapCollection<Order>(payload);
  } catch {
    return [];
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!id || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as Order;
  } catch {
    return null;
  }
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const cleaned = orderNumber.trim();
  if (!cleaned || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/orders?orderNumber=${encodeURIComponent(cleaned)}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as Order;
  } catch {
    return null;
  }
}

export async function getOrdersByAffiliate(affiliateId: string): Promise<Order[]> {
  return getOrders({ affiliateId, limit: 100 });
}

export async function createOrder(data: CreateOrderRequestPayload): Promise<Order> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر تسجيل الطلب، يرجى مراجعة البيانات والمخزون');
  }

  broadcastLocalChange('order_created', body.id);
  return body as Order;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    shippingCompany?: string;
    trackingNumber?: string;
    note?: string;
    returnedItems?: Array<{ orderItemId: string; returnQty: number }>;
  }
): Promise<Order> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: newStatus.toUpperCase(),
      shippingCompany: options?.shippingCompany,
      trackingNumber: options?.trackingNumber,
      note: options?.note,
      ...(options?.returnedItems ? { returnedItems: options.returnedItems } : {}),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر تحديث حالة الطلب');
  }

  broadcastLocalChange('order_updated', body.id);
  return body as Order;
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر حذف الطلب');
  }

  broadcastLocalChange('order_deleted', id);
}

// ─── Marketers API (Phase 1B Hardened — No Mock/localStorage PII Fallback) ───

export async function getMarketers(): Promise<Marketer[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/marketers?limit=100', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) {
      return [];
    }
    const payload = await res.json();
    return unwrapCollection<Marketer>(payload);
  } catch {
    return [];
  }
}

export async function getMarketerById(id: string): Promise<Marketer | null> {
  if (!id) return null;
  const marketers = await getMarketers();
  return marketers.find((m) => m.id === id || m.uid === id) || null;
}

export async function getMarketerByCode(code: string): Promise<PublicReferralInfo | null> {
  const cleaned = code.trim();
  if (!cleaned || typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/referrals/${encodeURIComponent(cleaned)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.valid || !data?.id) return null;
    return {
      id: data.id,
      affiliateCode: data.affiliateCode,
      name: data.displayName || data.affiliateCode,
    };
  } catch {
    return null;
  }
}

export async function saveMarketer(data: Partial<Marketer>): Promise<Marketer> {
  const payoutMethodMap: Record<string, 'VODAFONE_CASH' | 'INSTAPAY' | 'BANK_TRANSFER'> = {
    vodafone_cash: 'VODAFONE_CASH',
    instapay: 'INSTAPAY',
    bank_transfer: 'BANK_TRANSFER',
  };

  const payload = {
    name: data.name?.trim(),
    email: data.email?.trim().toLowerCase(),
    phone: data.phone?.trim(),
    whatsapp: data.whatsapp?.trim() || undefined,
    nationalId: data.nationalId?.trim() || undefined,
    city: data.city?.trim() || 'القاهرة',
    affiliateCode: data.affiliateCode?.trim().toUpperCase() || undefined,
    payoutMethod: data.payoutInfo?.method
      ? payoutMethodMap[data.payoutInfo.method] || 'VODAFONE_CASH'
      : 'VODAFONE_CASH',
    payoutAccount: data.payoutInfo?.accountNumber?.trim() || data.phone?.trim() || undefined,
  };

  const res = await fetch('/api/marketers', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر حفظ بيانات المسوق');
  }

  broadcastLocalChange('marketer_saved', body.id);
  return body as Marketer;
}

export async function toggleMarketerStatus(
  id: string,
  currentStatus?: MarketerStatus
): Promise<Marketer> {
  const action = currentStatus === 'active' ? 'suspend' : 'reactivate';
  const res = await fetch(`/api/marketers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر تحديث حالة المسوق');
  }

  broadcastLocalChange('marketer_saved', id);
  return (body.affiliate ?? body) as Marketer;
}

export async function approveMarketer(id: string, customCode?: string): Promise<Marketer> {
  const trimmedCode = customCode?.trim().toUpperCase();
  const res = await fetch(`/api/marketers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      ...(trimmedCode ? { affiliateCode: trimmedCode } : {}),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر اعتماد طلب المسوق');
  }

  broadcastLocalChange('marketer_saved', id);
  return (body.affiliate ?? body) as Marketer;
}

export async function rejectMarketer(id: string, reason?: string): Promise<Marketer> {
  const res = await fetch(`/api/marketers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reject',
      rejectionReason: reason?.trim() || 'لم يتم استيفاء شروط الانضمام المطلوبة',
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر رفض طلب المسوق');
  }

  broadcastLocalChange('marketer_saved', id);
  return (body.affiliate ?? body) as Marketer;
}

// ─── Withdrawals API (Atomic Prisma + Row Locks) ──────────────

export async function getWithdrawals(options?: {
  page?: number;
  limit?: number;
  status?: string;
  marketerId?: string;
}): Promise<WithdrawalRequest[]> {
  if (typeof window === 'undefined') return [];
  try {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    params.set('limit', String(options?.limit ?? 100));
    if (options?.status) params.set('status', options.status);
    if (options?.marketerId) params.set('marketerId', options.marketerId);

    const res = await fetch(`/api/withdrawals?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return [];
    const payload = await res.json();
    return unwrapCollection<WithdrawalRequest>(payload);
  } catch {
    return [];
  }
}

export async function getWithdrawalsByMarketer(marketerId: string): Promise<WithdrawalRequest[]> {
  return getWithdrawals({ marketerId, limit: 100 });
}

export async function createWithdrawalRequest(
  data: Omit<WithdrawalRequest, 'id' | 'requestId' | 'status' | 'createdAt'> & {
    idempotencyKey?: string;
  }
): Promise<WithdrawalRequest> {
  const methodMap: Record<string, 'VODAFONE_CASH' | 'INSTAPAY' | 'BANK_TRANSFER'> = {
    vodafone_cash: 'VODAFONE_CASH',
    instapay: 'INSTAPAY',
    bank_transfer: 'BANK_TRANSFER',
  };

  const res = await fetch('/api/withdrawals', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: data.amount,
      method: methodMap[data.paymentMethod] || data.paymentMethod,
      accountDetails: data.accountDetails,
      ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر إنشاء طلب السحب');
  }

  broadcastLocalChange('withdrawal_created', body.id);
  return body as WithdrawalRequest;
}

export async function updateWithdrawalStatus(
  id: string,
  newStatus: 'approved' | 'rejected',
  receiptOrReason?: string
): Promise<WithdrawalRequest> {
  const payload =
    newStatus === 'approved'
      ? {
          status: 'APPROVED',
          receiptRef: receiptOrReason?.trim() || 'TX-VERIFIED',
        }
      : {
          status: 'REJECTED',
          rejectionReason: receiptOrReason?.trim() || 'تم رفض طلب السحب',
        };

  const res = await fetch(`/api/withdrawals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر معالجة طلب السحب');
  }

  broadcastLocalChange('withdrawal_updated', id);
  return body as WithdrawalRequest;
}

// ─── Governorates Shipping & Platform Settings API ────────────

export async function getShippingRates(): Promise<GovernorateShipping[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/shipping?limit=100', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const payload = await res.json();
      const list = unwrapCollection<GovernorateShipping>(payload);
      if (list.length > 0) return list;
    }
  } catch {
    // ignore
  }
  return INITIAL_GOVERNORATES;
}

export async function updateShippingRate(id: string, fee: number): Promise<GovernorateShipping> {
  const res = await fetch(`/api/shipping/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fee }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر تحديث تكلفة الشحن');
  }
  broadcastLocalChange('settings_updated', id);
  return body as GovernorateShipping;
}

export async function getSettings(): Promise<PlatformSettings> {
  if (typeof window === 'undefined') return INITIAL_SETTINGS;
  try {
    const res = await fetch('/api/settings', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.settings) return data.settings as PlatformSettings;
    }
  } catch {
    // fallback
  }
  return INITIAL_SETTINGS;
}

export async function updateSettings(
  settingsData: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: settingsData }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر حفظ إعدادات المنصة');
  }

  broadcastLocalChange('settings_updated');
  return body.settings as PlatformSettings;
}

// ─── Platform Analytics & Commission Release API ──────────────

export async function getAdminStats(): Promise<AdminStatsResponse | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/admin/stats', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminStatsResponse;
  } catch {
    return null;
  }
}

export async function triggerReleaseCommissions(): Promise<{
  success: boolean;
  releasedCount: number;
  totalReleasedAmount: number;
  releasedOrderNumbers: string[];
}> {
  const res = await fetch('/api/cron/release-commissions', {
    method: 'POST',
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'تعذر تشغيل تحرير العمولات');
  }
  broadcastLocalChange('commissions_released');
  return body;
}
