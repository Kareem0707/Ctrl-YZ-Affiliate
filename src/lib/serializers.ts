import type {
  Affiliate,
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  OrderStatus as PrismaOrderStatus,
  PayoutMethod,
  PayoutRequest,
  PayoutStatus,
  PlatformSettings as PrismaPlatformSettings,
  Product as PrismaProduct,
  ProductVariant,
  ShippingRate,
  User,
} from '@prisma/client';
import type {
  AdCopy,
  GovernorateShipping,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryItem,
  PlatformSettings,
  Product,
  ProductColor,
  WithdrawalRequest,
  WithdrawalStatus,
} from '@/lib/types';
import { toMoneyNumber } from '@/lib/validators';

// ─── Enum Normalization Helpers ───────────────────────────────

export function mapPrismaOrderStatus(status: PrismaOrderStatus): OrderStatus {
  return status.toLowerCase() as OrderStatus;
}

export function normalizeOrderStatusInput(raw: unknown): PrismaOrderStatus | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  const valid: PrismaOrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'PARTIALLY_RETURNED',
  ];
  return valid.includes(upper as PrismaOrderStatus) ? (upper as PrismaOrderStatus) : null;
}

export function mapPrismaPayoutMethod(
  method: PayoutMethod
): 'vodafone_cash' | 'instapay' | 'bank_transfer' {
  switch (method) {
    case 'INSTAPAY':
      return 'instapay';
    case 'BANK_TRANSFER':
      return 'bank_transfer';
    case 'VODAFONE_CASH':
    default:
      return 'vodafone_cash';
  }
}

export function normalizePayoutMethodInput(raw: unknown): PayoutMethod | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'VODAFONE_CASH' || upper === 'INSTAPAY' || upper === 'BANK_TRANSFER') {
    return upper;
  }
  return null;
}

export function mapPrismaPayoutStatus(status: PayoutStatus): WithdrawalStatus {
  return status.toLowerCase() as WithdrawalStatus;
}

export function normalizeEgyptianPhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '').replace(/^\+?20/, '0');
}

// ─── Product Serializer ───────────────────────────────────────

export type ProductWithVariants = PrismaProduct & {
  variants: ProductVariant[];
};

export function serializeProductDTO(
  product: ProductWithVariants,
  options?: { includeCostPrice?: boolean }
): Product {
  const wholesalePrice = toMoneyNumber(product.wholesalePrice);
  const suggestedPrice = toMoneyNumber(product.suggestedPrice);
  const minPrice = toMoneyNumber(product.minPrice);
  const salePrice =
    product.salePrice !== null && product.salePrice !== undefined
      ? toMoneyNumber(product.salePrice)
      : undefined;
  const costPrice = options?.includeCostPrice ? toMoneyNumber(product.costPrice) : 0;

  const activeVariants = product.variants.filter((v) => v.isActive);
  const effectiveVariants = activeVariants.length > 0 ? activeVariants : product.variants;

  const sizeSet = new Set<string>();
  const colorMap = new Map<string, string>();
  let totalStock = 0;

  for (const v of effectiveVariants) {
    sizeSet.add(v.size);
    if (!colorMap.has(v.color)) {
      colorMap.set(v.color, v.colorHex || '#111827');
    }
    totalStock += Math.max(0, v.stock);
  }

  const colors: ProductColor[] = Array.from(colorMap.entries()).map(([name, hex]) => ({
    name,
    hex,
  }));

  const effectiveDisplayPrice = salePrice ?? suggestedPrice;
  const defaultCommission = Math.max(0, Math.round((effectiveDisplayPrice - wholesalePrice) * 100) / 100);

  return {
    id: product.id,
    slug: product.slug,
    name_en: product.nameEn,
    name_ar: product.nameAr,
    brand: product.brand,
    category: product.category,
    costPrice,
    wholesalePrice,
    suggestedPrice,
    minPrice,
    price: suggestedPrice,
    salePrice,
    commission: defaultCommission,
    description_en: product.descriptionEn,
    description_ar: product.descriptionAr,
    images: product.images,
    marketingDriveUrl: product.marketingDriveUrl ?? undefined,
    adCopies: Array.isArray(product.adCopies)
      ? (product.adCopies as unknown as AdCopy[])
      : undefined,
    sizes: Array.from(sizeSet),
    colors: colors.length > 0 ? colors : [{ name: 'Jet Black', hex: '#111827' }],
    variants: product.variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      isActive: v.isActive,
    })),
    stock: totalStock,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

// ─── Order Serializers ────────────────────────────────────────

export type OrderWithRelations = PrismaOrder & {
  items: (PrismaOrderItem & {
    product?: Pick<PrismaProduct, 'images'> | null;
  })[];
  affiliate?: (Pick<Affiliate, 'id' | 'phone' | 'affiliateCode'> & {
    user?: Pick<User, 'name'> | null;
  }) | null;
};

export function serializeOrderDTO(
  order: OrderWithRelations,
  options?: { includePlatformCost?: boolean }
): Order {
  const items: OrderItem[] = order.items.map((item) => {
    const unitPrice = toMoneyNumber(item.unitPrice);
    const wholesalePrice = toMoneyNumber(item.wholesalePrice);
    const commissionAmount = toMoneyNumber(item.commissionAmount);
    const perUnitCommission =
      item.quantity > 0
        ? Math.round((commissionAmount / item.quantity) * 100) / 100
        : 0;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.productName,
      price: unitPrice,
      wholesalePrice,
      ...(options?.includePlatformCost ? { costPrice: toMoneyNumber(item.costPrice) } : {}),
      commission: perUnitCommission,
      commissionAmount,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity,
      size: item.size,
      color: item.color,
      image: item.product?.images?.[0] ?? '',
    };
  });

  const history = Array.isArray(order.statusHistory)
    ? (order.statusHistory as unknown as OrderStatusHistoryItem[])
    : [];

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    affiliateId: order.affiliateId ?? undefined,
    affiliateName: order.affiliate?.user?.name ?? undefined,
    affiliatePhone: order.affiliate?.phone ?? undefined,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerPhone2: order.customerAltPhone ?? undefined,
    governorate: order.governorate,
    customerCity: order.customerCity ?? order.governorate,
    customerAddress: order.customerAddress,
    notes: order.notes ?? undefined,
    items,
    subtotal: toMoneyNumber(order.subtotal),
    shippingFee: toMoneyNumber(order.shippingFee),
    totalAmount: toMoneyNumber(order.totalAmount),
    wholesaleTotal: toMoneyNumber(order.totalWholesale),
    affiliateCommission: toMoneyNumber(order.totalCommission),
    platformProfit: options?.includePlatformCost ? toMoneyNumber(order.platformProfit) : 0,
    status: mapPrismaOrderStatus(order.status),
    dbStatus: order.status,
    commissionState: order.commissionState,
    shippingCompany: order.shippingCompany ?? undefined,
    trackingNumber: order.trackingNumber ?? undefined,
    statusNotes: order.statusNotes ?? undefined,
    statusHistory: history,
    isCommissionPaid: order.commissionState === 'AVAILABLE',
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    returnWindowEndsAt: order.returnWindowEndsAt?.toISOString() ?? null,
  };
}

/**
 * Public order tracking DTO — strictly redacts affiliate PII, customer full address/phone,
 * wholesale cost, commission, and platform profit.
 */
export function serializePublicOrderTrackingDTO(order: OrderWithRelations) {
  const history = Array.isArray(order.statusHistory)
    ? (order.statusHistory as unknown as OrderStatusHistoryItem[])
    : [];

  const maskedName =
    order.customerName.length > 2
      ? `${order.customerName.slice(0, 2)}${'*'.repeat(Math.min(6, order.customerName.length - 2))}`
      : '***';

  return {
    orderNumber: order.orderNumber,
    status: mapPrismaOrderStatus(order.status),
    dbStatus: order.status,
    customerName: maskedName,
    governorate: order.governorate,
    customerCity: order.customerCity ?? order.governorate,
    subtotal: toMoneyNumber(order.subtotal),
    shippingFee: toMoneyNumber(order.shippingFee),
    totalAmount: toMoneyNumber(order.totalAmount),
    shippingCompany: order.shippingCompany ?? undefined,
    trackingNumber: order.trackingNumber ?? undefined,
    statusNotes: order.statusNotes ?? undefined,
    statusHistory: history,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      name_ar: item.productName,
      name_en: item.productName,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity,
      price: toMoneyNumber(item.unitPrice),
      image: item.product?.images?.[0] ?? '',
    })),
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    returnWindowEndsAt: order.returnWindowEndsAt?.toISOString() ?? null,
  };
}

// ─── Payout / Withdrawal Serializer ───────────────────────────

export type PayoutWithAffiliate = PayoutRequest & {
  affiliate: Pick<Affiliate, 'id' | 'phone'> & {
    user: Pick<User, 'name'>;
  };
};

export function serializeWithdrawalDTO(payout: PayoutWithAffiliate): WithdrawalRequest & {
  requestCode: string;
  dbStatus: PayoutStatus;
  processedBy?: string;
} {
  return {
    id: payout.id,
    requestId: payout.requestCode,
    requestCode: payout.requestCode,
    marketerId: payout.affiliateId,
    marketerName: payout.affiliate.user.name,
    marketerPhone: payout.affiliate.phone,
    amount: toMoneyNumber(payout.amount),
    paymentMethod: mapPrismaPayoutMethod(payout.method),
    accountDetails: payout.accountDetails,
    status: mapPrismaPayoutStatus(payout.status),
    dbStatus: payout.status,
    transactionReceipt: payout.receiptRef ?? undefined,
    rejectReason: payout.rejectionReason ?? undefined,
    processedBy: payout.processedBy ?? undefined,
    createdAt: payout.createdAt.toISOString(),
    processedAt: payout.processedAt?.toISOString() ?? undefined,
  };
}

// ─── Settings & Shipping Serializers ──────────────────────────

export function serializeSettingsDTO(
  settings: PrismaPlatformSettings,
  categories: string[] = []
): PlatformSettings {
  const currencySymbolMap: Record<string, string> = {
    EGP: 'ج.م',
    SAR: 'ر.س',
    USD: '$',
  };

  return {
    storeName: settings.storeName,
    currency: settings.currency,
    currencySymbol: currencySymbolMap[settings.currency] ?? settings.currency,
    contactWhatsApp: settings.contactWhatsApp,
    contactEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'support@ctrlyz.com',
    minWithdrawalAmount: toMoneyNumber(settings.minWithdrawalAmount),
    returnWindowDays: settings.returnWindowDays,
    announcement: settings.announcementAr,
    announcementEn: settings.announcementEn,
    categories:
      categories.length > 0
        ? categories
        : ['Streetwear', 'Arabic Calligraphy', 'Music & Artists', 'Cars & Motorsport', 'Anime & Manga'],
  };
}

export function serializeShippingRateDTO(rate: ShippingRate): GovernorateShipping {
  return {
    id: rate.id,
    governorate_ar: rate.governorateAr,
    governorate_en: rate.governorateEn,
    fee: toMoneyNumber(rate.fee),
    deliveryTime: rate.estimatedDays,
  };
}
