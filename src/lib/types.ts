export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'cancelled';

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
  stock: number;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number; // Selling price to customer
  wholesalePrice: number; // Cost to marketer
  commission: number; // Profit per item (price - wholesalePrice)
  quantity: number;
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
  shippingCompany?: string;
  trackingNumber?: string;
  statusNotes?: string;
  statusHistory?: OrderStatusHistoryItem[];
  isCommissionPaid?: boolean;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string;
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
  totalEarned: number;
  totalWithdrawn: number;
  ordersCount: number;
  deliveredCount: number;
  deliveryRate: number; // percentage (e.g. 85%)
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
  announcement: string;
  categories: string[];
}
