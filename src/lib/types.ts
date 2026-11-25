export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'partially_returned'
  | 'returned'
  | 'cancelled';

export type OrderCommissionState =
  | 'NONE'
  | 'PENDING'
  | 'LOCKED_RETURN_WINDOW'
  | 'AVAILABLE'
  | 'CLAWED_BACK'
  | 'VOIDED';

export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string | null;
  stock: number;
  isActive: boolean;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface AdCopy {
  title: string;
  copy: string;
}

export interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  brand: string;
  category: string;
  costPrice: number; // Cost for platform
  wholesalePrice: number; // Wholesale price for marketer
  suggestedPrice: number; // Suggested selling price
  minPrice: number; // Minimum allowed selling price
  price: number; // Public store display price
  salePrice?: number;
  commission: number; // Default suggested commission (suggestedPrice - wholesalePrice)
  description_en: string;
  description_ar: string;
  images: string[];
  marketingDriveUrl?: string; // Media download link (images, high-res videos)
  adCopies?: AdCopy[];
  sizes: string[];
  colors: ProductColor[];
  variants?: ProductVariantDTO[];
  slug?: string;
  stock: number;
  isActive: boolean;
  isFeatured?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string; // `${productId}-${size}-${color}`
  productId: string;
  variantId?: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  brand: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export interface OrderItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  name: string;
  price: number; // Selling price to customer
  wholesalePrice: number; // Cost to marketer
  costPrice?: number;
  commission: number; // Profit per item (price - wholesalePrice)
  commissionAmount?: number; // Total line commission
  quantity: number;
  returnedQuantity?: number;
  size: string;
  color?: string;
  image: string;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  source?: 'STOREFRONT' | 'AFFILIATE_DIRECT';
  affiliateId?: string;
  affiliateName?: string;
  affiliatePhone?: string;
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  governorate: string;
  customerCity: string;
  customerAddress: string;
  notes?: string;
  items: OrderItem[];
  subtotal?: number;
  shippingFee: number;
  totalAmount: number; // subtotal + shippingFee (collected from customer)
  wholesaleTotal: number;
  affiliateCommission: number;
  platformProfit: number;
  status: OrderStatus;
  dbStatus?: string;
  commissionState?: OrderCommissionState;
  shippingCompany?: string;
  trackingNumber?: string;
  statusNotes?: string;
  statusHistory?: OrderStatusHistoryItem[];
  isCommissionPaid?: boolean;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  returnWindowEndsAt?: string | null;
}

export interface MarketerPayoutInfo {
  method: 'vodafone_cash' | 'instapay' | 'bank_transfer';
  accountNumber: string;
  accountHolderName?: string;
  bankName?: string;
}

export type MarketerStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export interface Marketer {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatar?: string;
  nationalId?: string; // الرقم القومي (14 رقم للتحقق المالي)
  city?: string; // المحافظة / المدينة
  marketingChannels?: string[]; // Facebook, TikTok, Instagram, Telegram, Website, WhatsApp, Other
  channelLinks?: string; // روابط الصفحات أو القنوات
  experienceLevel?: 'beginner' | 'intermediate' | 'expert'; // مستوى الخبرة
  expectedMonthlyOrders?: string; // حجم المبيعات المتوقع شهرياً
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  affiliateCode: string;
  walletBalance: number; // Available for withdrawal
  pendingBalance: number; // Pending with shipping
  lockedBalance?: number; // Locked in apparel return window
  totalEarned: number;
  totalWithdrawn: number;
  ordersCount: number;
  deliveredCount: number;
  deliveryRate: number; // percentage (e.g. 85%)
  clicksCount?: number;
  conversionRate?: number; // percentage (orders / clicks * 100)
  status: MarketerStatus;
  payoutInfo: MarketerPayoutInfo;
  createdAt: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  requestId: string;
  marketerId: string;
  marketerName: string;
  marketerPhone: string;
  amount: number;
  paymentMethod: 'vodafone_cash' | 'instapay' | 'bank_transfer';
  accountDetails: string;
  status: WithdrawalStatus;
  transactionReceipt?: string;
  rejectReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface GovernorateShipping {
  id: string;
  governorate_ar: string;
  governorate_en: string;
  fee: number;
  deliveryTime: string;
}

export interface PlatformSettings {
  storeName: string;
  currency: string;
  currencySymbol: string;
  contactWhatsApp: string;
  contactEmail: string;
  minWithdrawalAmount: number;
  returnWindowDays?: number;
  announcement: string;
  announcementEn?: string;
  categories: string[];
}

// ─── Phase 1A Relational & Pagination DTO Contracts ───────────

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

export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string | null;
  stock: number;
  isActive: boolean;
}

export type CommissionLifecycleState =
  | 'NONE'
  | 'PENDING'
  | 'LOCKED_RETURN_WINDOW'
  | 'AVAILABLE'
  | 'CLAWED_BACK'
  | 'VOIDED';

export type WalletLedgerTypeDTO =
  | 'COMMISSION_PENDING'
  | 'COMMISSION_LOCKED'
  | 'COMMISSION_RELEASED'
  | 'COMMISSION_CLAWBACK'
  | 'COMMISSION_VOIDED'
  | 'WITHDRAWAL_HOLD'
  | 'WITHDRAWAL_PAID'
  | 'WITHDRAWAL_REFUND'
  | 'ADJUSTMENT';

export interface WalletLedgerEntryDTO {
  id: string;
  affiliateId: string;
  orderId?: string | null;
  payoutRequestId?: string | null;
  type: WalletLedgerTypeDTO;
  amount: number;
  balanceAfter: number;
  idempotencyKey: string;
  note?: string | null;
  createdAt: string;
}
