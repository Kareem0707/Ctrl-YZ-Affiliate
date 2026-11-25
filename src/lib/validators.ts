import { z } from 'zod';
import { customAlphabet } from 'nanoid';

// ─── Collision-Proof Code Generators (nanoid) ─────────────────

// Crockford-like unambiguous uppercase alphabet (excludes 0, O, 1, I, L)
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateRandomCode6 = customAlphabet(SAFE_ALPHABET, 6);
const generateRandomCode4 = customAlphabet(SAFE_ALPHABET, 4);

function formatDateStamp(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Collision-proof Order Number: e.g., ORD-20261125-7K9P2X */
export function generateOrderNumber(date?: Date): string {
  return `ORD-${formatDateStamp(date)}-${generateRandomCode6()}`;
}

/** Collision-proof Withdrawal Request Code: e.g., WD-20261125-4M8Q3Z */
export function generateWithdrawalCode(date?: Date): string {
  return `WD-${formatDateStamp(date)}-${generateRandomCode6()}`;
}

/** ASCII-only URL-safe Affiliate Referral Code: e.g., YZ-AHMD-7K9P */
export function generateAffiliateCode(hint?: string): string {
  const cleanedHint = (hint ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const middle = cleanedHint.length >= 2 ? cleanedHint : generateRandomCode4();
  return `YZ-${middle}-${generateRandomCode4()}`;
}

/** Deterministic/unique ASCII SKU for clothing variants */
export function generateVariantSku(slug: string, size: string, color: string): string {
  const clean = (val: string, maxLen: number) =>
    val
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, maxLen) || 'STD';
  return `CYZ-${clean(slug, 10)}-${clean(size, 4)}-${clean(color, 6)}-${generateRandomCode4()}`;
}

// ─── Financial Precision Helpers ──────────────────────────────

export type DecimalLike = number | string | { toNumber(): number; toString(): string };

/** Convert Prisma Decimal / string / number to finite 2-decimal number */
export function toMoneyNumber(value: DecimalLike | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number(value)
      : value.toNumber();
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/** Round monetary amount to exact 2 decimal places */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ─── Primitive Field Schemas ──────────────────────────────────

export const EGYPTIAN_PHONE_REGEX = /^(010|011|012|015)\d{8}$/;
export const EGYPTIAN_NATIONAL_ID_REGEX = /^[23]\d{13}$/;
export const ASCII_AFFILIATE_CODE_REGEX = /^[A-Z0-9][A-Z0-9_-]{2,23}$/;

export const egyptianPhoneSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s-]/g, '').replace(/^\+?20/, '0'))
  .refine((val) => EGYPTIAN_PHONE_REGEX.test(val), {
    message: 'رقم الهاتف المصري غير صحيح — يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015',
  });

export const egyptianNationalIdSchema = z
  .string()
  .trim()
  .refine((val) => EGYPTIAN_NATIONAL_ID_REGEX.test(val), {
    message: 'الرقم القومي المصري يجب أن يتكون من 14 رقماً صحيحاً ويبدأ بـ 2 أو 3',
  })
  .refine((val) => {
    const month = Number(val.slice(3, 5));
    const day = Number(val.slice(5, 7));
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }, {
    message: 'تاريخ الميلاد داخل الرقم القومي غير صالح',
  });

export const asciiAffiliateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => ASCII_AFFILIATE_CODE_REGEX.test(val), {
    message: 'كود الإحالة يجب أن يحتوي على حروف إنجليزية وأرقام فقط (3 إلى 24 حرفاً)',
  });

export const moneySchema = z.coerce
  .number()
  .finite('القيمة المالية غير صالحة')
  .min(0, 'القيمة المالية لا يمكن أن تكون سالبة')
  .max(9999999999.99, 'القيمة المالية تتجاوز الحد المسموح')
  .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, {
    message: 'القيمة المالية يجب ألا تزيد عن منزلتين عشريتين',
  });

export const positiveMoneySchema = moneySchema.refine((n) => n > 0, {
  message: 'يجب أن يكون المبلغ أكبر من صفر',
});

export const safeImageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (val) =>
      val.startsWith('/products/') ||
      val.startsWith('/uploads/') ||
      val.startsWith('https://'),
    {
      message: 'رابط الصورة يجب أن يكون مساراً محلياً صالحاً أو رابط HTTPS آمن',
    }
  );

export const payoutMethodSchema = z.enum(['VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER']);
export const orderSourceSchema = z.enum(['STOREFRONT', 'AFFILIATE_DIRECT']);
export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'PARTIALLY_RETURNED',
]);

// ─── Pagination DTOs & Query Schema ───────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().min(1).optional(),
  search: z.string().trim().max(120).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
  nextCursor: string | null = null
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextCursor,
  };
}

// ─── Product & Inventory Schemas ──────────────────────────────

export const productVariantInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(2).max(64).optional(),
  size: z.string().trim().min(1, 'المقاس مطلوب').max(24),
  color: z.string().trim().min(1, 'اللون مطلوب').max(40),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'كود اللون غير صالح')
    .optional()
    .nullable(),
  stock: z.coerce.number().int('المخزون يجب أن يكون عدداً صحيحاً').min(0, 'المخزون لا يمكن أن يكون سالباً'),
  isActive: z.boolean().default(true),
});

export const adCopySchema = z.object({
  title: z.string().trim().min(1).max(160),
  copy: z.string().trim().min(1).max(4000),
});

const productBaseSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'الرابط المختصر يجب أن يكون بحروف إنجليزية وأرقام وشرطات فقط')
    .max(120)
    .optional(),
  nameAr: z.string().trim().min(2, 'اسم المنتج بالعربية مطلوب').max(200),
  nameEn: z.string().trim().min(2, 'اسم المنتج بالإنجليزية مطلوب').max(200),
  descriptionAr: z.string().trim().min(1).max(4000),
  descriptionEn: z.string().trim().min(1).max(4000),
  brand: z.string().trim().min(1).max(80).default('Ctrl YZ'),
  category: z.string().trim().min(1).max(80),
  images: z.array(safeImageUrlSchema).min(1, 'يجب إضافة صورة واحدة على الأقل للمنتج').max(12),
  costPrice: moneySchema,
  wholesalePrice: moneySchema,
  minPrice: moneySchema,
  suggestedPrice: moneySchema,
  salePrice: moneySchema.optional().nullable(),
  marketingDriveUrl: z.string().trim().url('رابط Google Drive غير صالح').optional().nullable().or(z.literal('')),
  adCopies: z.array(adCopySchema).max(20).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  variants: z.array(productVariantInputSchema).min(1, 'يجب تحديد متغير واحد (مقاس/لون) على الأقل').max(100),
});

function validateProductPricingHierarchy(
  data: {
    costPrice?: number;
    wholesalePrice?: number;
    minPrice?: number;
    suggestedPrice?: number;
    salePrice?: number | null;
  },
  ctx: z.RefinementCtx
) {
  if (
    data.costPrice !== undefined &&
    data.wholesalePrice !== undefined &&
    data.costPrice > data.wholesalePrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesalePrice'],
      message: 'سعر الجملة للمسوق يجب أن يكون أكبر من أو يساوي تكلفة المنصة (costPrice <= wholesalePrice)',
    });
  }

  if (
    data.wholesalePrice !== undefined &&
    data.minPrice !== undefined &&
    data.wholesalePrice > data.minPrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minPrice'],
      message: 'الحد الأدنى للبيع يجب أن يكون أكبر من أو يساوي سعر الجملة (wholesalePrice <= minPrice)',
    });
  }

  if (
    data.minPrice !== undefined &&
    data.suggestedPrice !== undefined &&
    data.minPrice > data.suggestedPrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['suggestedPrice'],
      message: 'سعر البيع المقترح يجب أن يكون أكبر من أو يساوي الحد الأدنى للبيع (minPrice <= suggestedPrice)',
    });
  }

  if (
    data.salePrice !== undefined &&
    data.salePrice !== null &&
    data.suggestedPrice !== undefined &&
    data.salePrice > data.suggestedPrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salePrice'],
      message: 'سعر التخفيض لا يمكن أن يتجاوز سعر البيع المقترح',
    });
  }
}

export const productCreateSchema = productBaseSchema.superRefine((data, ctx) => {
  validateProductPricingHierarchy(data, ctx);
});

export const productUpdateSchema = productBaseSchema
  .partial()
  .extend({
    id: z.string().trim().min(1),
  })
  .superRefine((data, ctx) => {
    validateProductPricingHierarchy(data, ctx);
  });

export const productStockPatchSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('set'),
    variantId: z.string().trim().min(1),
    stock: z.coerce.number().int().min(0).max(100000),
  }),
  z.object({
    mode: z.literal('delta'),
    variantId: z.string().trim().min(1),
    delta: z.coerce.number().int().min(-10000).max(10000),
  }),
]);

// ─── Order & Return Lifecycle Schemas ─────────────────────────

export const orderItemInputSchema = z.object({
  productId: z.string().trim().min(1, 'معرف المنتج مطلوب'),
  variantId: z.string().trim().min(1).optional(),
  size: z.string().trim().min(1, 'المقاس مطلوب').max(24),
  color: z.string().trim().min(1, 'اللون مطلوب').max(40),
  quantity: z.coerce.number().int('الكمية يجب أن تكون عدداً صحيحاً').min(1, 'الكمية لا تقل عن 1').max(50, 'الحد الأقصى للقطعة الواحدة 50'),
  /** Only respected for AFFILIATE_DIRECT orders; validated server-side against product.minPrice */
  customUnitPrice: positiveMoneySchema.optional(),
});

export const orderCreateSchema = z.object({
  source: orderSourceSchema.default('STOREFRONT'),
  affiliateCode: asciiAffiliateCodeSchema.optional(),
  customerName: z.string().trim().min(3, 'اسم العميل يجب ألا يقل عن 3 أحرف').max(120),
  customerPhone: egyptianPhoneSchema,
  customerAltPhone: egyptianPhoneSchema.optional().or(z.literal('')),
  governorate: z.string().trim().min(2, 'المحافظة مطلوبة').max(80),
  customerCity: z.string().trim().min(2, 'المدينة / المنطقة مطلوبة').max(100),
  customerAddress: z.string().trim().min(6, 'العنوان التفصيلي مطلوب').max(400),
  notes: z.string().trim().max(500).optional(),
  items: z.array(orderItemInputSchema).min(1, 'يجب أن يحتوي الطلب على منتج واحد على الأقل').max(20),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

/** Strict State Machine transitions for clothing COD orders */
export const ALLOWED_ORDER_TRANSITIONS: Record<
  z.infer<typeof orderStatusSchema>,
  readonly z.infer<typeof orderStatusSchema>[]
> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED', 'PARTIALLY_RETURNED'],
  PARTIALLY_RETURNED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

export const orderItemReturnInputSchema = z
  .object({
    orderItemId: z.string().trim().min(1),
    returnQuantity: z.coerce.number().int().min(1).optional(),
    returnQty: z.coerce.number().int().min(1).optional(),
  })
  .refine((d) => (d.returnQuantity ?? d.returnQty) !== undefined, {
    message: 'الكمية المرتجعة مطلوبة ويجب أن تكون 1 على الأقل',
  })
  .transform((d) => ({
    orderItemId: d.orderItemId,
    returnQuantity: (d.returnQuantity ?? d.returnQty) as number,
  }));

export const orderStatusTransitionSchema = z
  .object({
    status: orderStatusSchema,
    shippingCompany: z.string().trim().max(80).optional(),
    trackingNumber: z.string().trim().max(80).optional(),
    note: z.string().trim().max(400).optional(),
    returnedItems: z.array(orderItemReturnInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'PARTIALLY_RETURNED' && (!data.returnedItems || data.returnedItems.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnedItems'],
        message: 'يجب تحديد القطع والكميات المرتجعة عند اختيار مرتجع جزئي',
      });
    }
  });

// ─── Affiliate Onboarding & Review Schemas ────────────────────

export const marketerOnboardingSchema = z
  .object({
    name: z.string().trim().min(6, 'يرجى إدخال الاسم الكامل (6 أحرف على الأقل)').max(120),
    phone: egyptianPhoneSchema,
    whatsapp: egyptianPhoneSchema,
    nationalId: egyptianNationalIdSchema,
    city: z.string().trim().min(2, 'المحافظة مطلوبة').max(80),
    marketingChannels: z.array(z.string().trim().min(1)).min(1, 'اختر قناة تسويقية واحدة على الأقل').max(10),
    channelLinks: z.string().trim().max(1000).optional(),
    experienceLevel: z.enum(['beginner', 'intermediate', 'expert']).default('intermediate'),
    expectedMonthlyOrders: z.string().trim().max(40).default('20-50'),
    payoutMethod: payoutMethodSchema,
    payoutAccount: z.string().trim().min(6, 'بيانات حساب استلام الأرباح مطلوبة').max(120),
    payoutHolderName: z.string().trim().max(120).optional(),
    payoutBankName: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payoutMethod === 'VODAFONE_CASH' && !EGYPTIAN_PHONE_REGEX.test(data.payoutAccount.replace(/[\s-]/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payoutAccount'],
        message: 'رقم محفظة فودافون كاش يجب أن يكون رقم هاتف مصري صحيح (11 رقماً)',
      });
    }
    if (data.payoutMethod === 'BANK_TRANSFER' && !data.payoutBankName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payoutBankName'],
        message: 'يرجى تحديد اسم البنك عند اختيار التحويل البنكي',
      });
    }
  });

export const marketerReviewSchema = z.discriminatedUnion('action', [
  z.object({
    id: z.string().trim().min(1),
    action: z.literal('approve'),
    affiliateCode: asciiAffiliateCodeSchema.optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    action: z.literal('reject'),
    rejectionReason: z.string().trim().min(4, 'يرجى ذكر سبب الرفض').max(400),
  }),
  z.object({
    id: z.string().trim().min(1),
    action: z.literal('suspend'),
    rejectionReason: z.string().trim().max(400).optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    action: z.literal('reactivate'),
  }),
]);

// ─── Payout / Withdrawal Schemas ──────────────────────────────

export const withdrawalCreateSchema = z.object({
  amount: positiveMoneySchema,
  method: payoutMethodSchema,
  accountDetails: z.string().trim().min(6, 'بيانات التحويل غير مكتملة').max(160),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const withdrawalProcessSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.string().trim().min(1),
    status: z.literal('APPROVED'),
    receiptRef: z.string().trim().min(3, 'رقم مرجع التحويل مطلوب').max(120),
  }),
  z.object({
    id: z.string().trim().min(1),
    status: z.literal('REJECTED'),
    rejectionReason: z.string().trim().min(4, 'سبب رفض طلب السحب مطلوب').max(400),
  }),
]);

// ─── Settings & Shipping Rates Schemas ────────────────────────

export const settingsUpdateSchema = z.object({
  storeName: z.string().trim().min(2).max(120).optional(),
  currency: z.enum(['EGP', 'SAR', 'USD']).optional(),
  contactWhatsApp: z.string().trim().min(8).max(24).optional(),
  announcementAr: z.string().trim().max(300).optional(),
  announcementEn: z.string().trim().max(300).optional(),
  minWithdrawalAmount: positiveMoneySchema.optional(),
  returnWindowDays: z.coerce.number().int().min(0).max(60).optional(),
});

export const shippingRateUpdateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  governorateAr: z.string().trim().min(2).max(80),
  governorateEn: z.string().trim().min(2).max(80),
  fee: moneySchema,
  estimatedDays: z.string().trim().min(1).max(60),
  isActive: z.boolean().default(true),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderStatusTransitionInput = z.infer<typeof orderStatusTransitionSchema>;
export type MarketerOnboardingInput = z.infer<typeof marketerOnboardingSchema>;
export type WithdrawalCreateInput = z.infer<typeof withdrawalCreateSchema>;
export type WithdrawalProcessInput = z.infer<typeof withdrawalProcessSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type ShippingRateUpdateInput = z.infer<typeof shippingRateUpdateSchema>;
