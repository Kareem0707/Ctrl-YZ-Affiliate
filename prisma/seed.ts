import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';

// Load .env and .env.local without requiring external dotenv dependency
function loadEnvFile(filename: string): void {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

interface LegacyProduct {
  id: string;
  name_en: string;
  name_ar: string;
  brand?: string;
  category?: string;
  costPrice: number;
  wholesalePrice: number;
  suggestedPrice: number;
  minPrice: number;
  price?: number;
  salePrice?: number;
  description_en?: string;
  description_ar?: string;
  images?: string[];
  marketingDriveUrl?: string;
  adCopies?: Array<{ title: string; copy: string }>;
  sizes?: string[];
  colors?: Array<{ name: string; hex?: string }>;
  stock?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

interface LegacyGovernorate {
  id: string;
  governorate_ar: string;
  governorate_en: string;
  fee: number;
  deliveryTime: string;
}

interface LegacyDatabase {
  products?: LegacyProduct[];
  governorates?: LegacyGovernorate[];
  settings?: {
    storeName?: string;
    currency?: string;
    contactWhatsApp?: string;
    minWithdrawalAmount?: number;
    announcement?: string;
  };
}

function getVerifiedPublicProductImages(): Set<string> {
  const productsDir = path.join(process.cwd(), 'public', 'products');
  if (!fs.existsSync(productsDir)) return new Set();
  const files = fs.readdirSync(productsDir);
  return new Set(files.map((f) => `/products/${f}`));
}

function toAsciiSlug(nameEn: string, fallbackId: string): string {
  const base = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  const suffix = fallbackId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? `${base}-${suffix}` : `product-${suffix}`;
}

function toSkuSegment(value: string, maxLen: number): string {
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, maxLen) || 'STD'
  );
}

function sanitizePricing(raw: LegacyProduct) {
  const cost = Math.max(0, Number(raw.costPrice) || 260);
  const wholesale = Math.max(cost, Number(raw.wholesalePrice) || cost + 100);
  const min = Math.max(wholesale, Number(raw.minPrice) || wholesale + 100);
  const suggested = Math.max(min, Number(raw.suggestedPrice ?? raw.price) || min + 80);
  const sale =
    raw.salePrice !== undefined &&
    raw.salePrice !== null &&
    Number(raw.salePrice) > 0 &&
    Number(raw.salePrice) < suggested
      ? Number(raw.salePrice)
      : null;

  return {
    costPrice: new Prisma.Decimal(cost.toFixed(2)),
    wholesalePrice: new Prisma.Decimal(wholesale.toFixed(2)),
    minPrice: new Prisma.Decimal(min.toFixed(2)),
    suggestedPrice: new Prisma.Decimal(suggested.toFixed(2)),
    salePrice: sale !== null ? new Prisma.Decimal(sale.toFixed(2)) : null,
  };
}

function sanitizeDriveUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Strip known placeholder folders that return 404
  if (trimmed.includes('drive.google.com/drive/folders/ctrl-yz-')) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

const SUPPLEMENTAL_GOVERNORATES: LegacyGovernorate[] = [
  { id: 'north-sinai', governorate_ar: 'شمال سيناء', governorate_en: 'North Sinai', fee: 75, deliveryTime: '4-6 أيام' },
  { id: 'south-sinai', governorate_ar: 'جنوب سيناء', governorate_en: 'South Sinai', fee: 75, deliveryTime: '4-6 أيام' },
  { id: 'new-valley', governorate_ar: 'الوادي الجديد', governorate_en: 'New Valley', fee: 75, deliveryTime: '4-6 أيام' },
];

async function seedPlatformSettings(legacySettings?: LegacyDatabase['settings']) {
  const settings = await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: legacySettings?.storeName || 'Ctrl YZ Official Store & Affiliate Network',
      currency: legacySettings?.currency || 'EGP',
      contactWhatsApp: legacySettings?.contactWhatsApp || '+201012345678',
      announcementAr:
        legacySettings?.announcement ||
        'كامبين الشتاء الرسمي 2026 — عمولات تبدأ من 220 ج.م وتصل إلى 260 ج.م على كل قطعة هودي',
      announcementEn:
        'Winter 2026 Official Campaign — Commissions from 220 EGP up to 260 EGP per hoodie',
      minWithdrawalAmount: new Prisma.Decimal(
        Number(legacySettings?.minWithdrawalAmount || 200).toFixed(2)
      ),
      returnWindowDays: 7,
    },
  });
  console.log(`✓ PlatformSettings ready (minWithdrawal=${settings.minWithdrawalAmount} ${settings.currency}, returnWindow=${settings.returnWindowDays}d)`);
}

async function seedShippingRates(legacyGovernorates: LegacyGovernorate[]) {
  const combined = new Map<string, LegacyGovernorate>();
  for (const gov of [...legacyGovernorates, ...SUPPLEMENTAL_GOVERNORATES]) {
    if (!combined.has(gov.governorate_ar)) {
      combined.set(gov.governorate_ar, gov);
    }
  }

  let count = 0;
  for (const gov of Array.from(combined.values())) {
    await prisma.shippingRate.upsert({
      where: { governorateAr: gov.governorate_ar },
      update: {
        governorateEn: gov.governorate_en,
        estimatedDays: gov.deliveryTime,
      },
      create: {
        governorateAr: gov.governorate_ar,
        governorateEn: gov.governorate_en,
        fee: new Prisma.Decimal(Math.max(0, Number(gov.fee) || 45).toFixed(2)),
        estimatedDays: gov.deliveryTime || '2-4 أيام',
        isActive: true,
      },
    });
    count++;
  }
  console.log(`✓ Seeded ${count} Egyptian governorate shipping rates`);
}

async function seedProductsAndVariants(
  legacyProducts: LegacyProduct[],
  verifiedImages: Set<string>
) {
  const fallbackVerifiedImage = Array.from(verifiedImages)[0];
  let productCount = 0;
  let variantCount = 0;

  for (const raw of legacyProducts) {
    const validImages = (raw.images ?? []).filter((img) => verifiedImages.has(img));
    if (validImages.length === 0) {
      if (!fallbackVerifiedImage) {
        console.warn(`! Skipping product ${raw.id}: no verified images available in public/products/`);
        continue;
      }
      validImages.push(fallbackVerifiedImage);
    }

    const slug = toAsciiSlug(raw.name_en || raw.id, raw.id);
    const pricing = sanitizePricing(raw);
    const driveUrl = sanitizeDriveUrl(raw.marketingDriveUrl);

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        nameAr: raw.name_ar,
        nameEn: raw.name_en,
        descriptionAr: raw.description_ar || '',
        descriptionEn: raw.description_en || '',
        brand: raw.brand || 'Ctrl YZ',
        category: raw.category || 'Streetwear',
        images: validImages,
        ...pricing,
        marketingDriveUrl: driveUrl,
        adCopies: raw.adCopies ? (raw.adCopies as Prisma.InputJsonValue) : Prisma.JsonNull,
        isFeatured: Boolean(raw.isFeatured),
        isActive: raw.isActive !== false,
      },
      create: {
        slug,
        nameAr: raw.name_ar,
        nameEn: raw.name_en,
        descriptionAr: raw.description_ar || '',
        descriptionEn: raw.description_en || '',
        brand: raw.brand || 'Ctrl YZ',
        category: raw.category || 'Streetwear',
        images: validImages,
        ...pricing,
        marketingDriveUrl: driveUrl,
        adCopies: raw.adCopies ? (raw.adCopies as Prisma.InputJsonValue) : Prisma.JsonNull,
        isFeatured: Boolean(raw.isFeatured),
        isActive: raw.isActive !== false,
      },
    });
    productCount++;

    const sizes = raw.sizes && raw.sizes.length > 0 ? raw.sizes : ['M', 'L', 'XL', '2XL', '3XL'];
    const colors =
      raw.colors && raw.colors.length > 0
        ? raw.colors
        : [{ name: 'Jet Black', hex: '#111827' }];

    const totalStock = Math.max(0, Math.floor(Number(raw.stock ?? 50)));
    const totalCombinations = sizes.length * colors.length;
    const basePerVariant = Math.floor(totalStock / totalCombinations);
    let remainder = totalStock % totalCombinations;

    for (const color of colors) {
      for (const size of sizes) {
        const variantStock = basePerVariant + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        const sku = `CYZ-${toSkuSegment(raw.id, 10)}-${toSkuSegment(size, 4)}-${toSkuSegment(
          color.name,
          6
        )}`;

        await prisma.productVariant.upsert({
          where: {
            productId_size_color: {
              productId: product.id,
              size,
              color: color.name,
            },
          },
          update: {
            colorHex: color.hex || null,
          },
          create: {
            productId: product.id,
            sku,
            size,
            color: color.name,
            colorHex: color.hex || null,
            stock: variantStock,
            isActive: true,
          },
        });
        variantCount++;
      }
    }
  }

  console.log(`✓ Seeded ${productCount} verified products and ${variantCount} size/color variants`);
}

async function seedAdminUser() {
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@ctrlyz.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: {
        email,
        name: 'Ctrl YZ Platform Admin',
        role: 'ADMIN',
        emailVerifiedAt: new Date(),
      },
    });
  }
  console.log(`✓ Seeded ${adminEmails.length} authorized admin account(s)`);
}

/**
 * Opt-in sample affiliate & mathematically reconciled order/ledger seed
 * Enable only for local dev/staging via SEED_SAMPLE_DATA=true.
 */
async function seedReconciledSampleOrderAndLedger() {
  if (process.env.SEED_SAMPLE_DATA !== 'true') {
    console.log('ℹ Skipping sample affiliate/order seed (set SEED_SAMPLE_DATA=true for dev fixtures)');
    return;
  }

  const firstProduct = await prisma.product.findFirst({
    where: { isActive: true },
    include: { variants: { take: 1 } },
  });
  if (!firstProduct || firstProduct.variants.length === 0) return;

  const variant = firstProduct.variants[0];
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const unitPrice = Number(firstProduct.suggestedPrice);
  const wholesale = Number(firstProduct.wholesalePrice);
  const cost = Number(firstProduct.costPrice);
  const commission = unitPrice - wholesale;
  const platformProfit = wholesale - cost;
  const shippingFee = 45;
  const totalAmount = unitPrice + shippingFee;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: 'sample.affiliate@ctrlyz.com' },
      update: {},
      create: {
        email: 'sample.affiliate@ctrlyz.com',
        name: 'Sample Verified Affiliate',
        role: 'MARKETER',
        emailVerifiedAt: tenDaysAgo,
        phoneVerifiedAt: tenDaysAgo,
      },
    });

    const affiliate = await tx.affiliate.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        phone: '01099990001',
        whatsapp: '01099990001',
        nationalId: '29901011234567',
        city: 'القاهرة',
        marketingChannels: ['Facebook Page', 'TikTok Ads'],
        affiliateCode: 'YZ-SAMPLE-01',
        status: 'ACTIVE',
        walletBalance: new Prisma.Decimal(commission.toFixed(2)),
        pendingBalance: new Prisma.Decimal('0.00'),
        lockedBalance: new Prisma.Decimal('0.00'),
        totalEarned: new Prisma.Decimal(commission.toFixed(2)),
        totalWithdrawn: new Prisma.Decimal('0.00'),
        payoutMethod: 'VODAFONE_CASH',
        payoutAccount: '01099990001',
        reviewedBy: 'SEED_SYSTEM',
        reviewedAt: tenDaysAgo,
      },
    });

    const orderNumber = 'ORD-20261115-SAMPLE1';
    const existingOrder = await tx.order.findUnique({ where: { orderNumber } });
    if (!existingOrder) {
      const order = await tx.order.create({
        data: {
          orderNumber,
          affiliateId: affiliate.id,
          source: 'STOREFRONT',
          status: 'DELIVERED',
          commissionState: 'AVAILABLE',
          customerName: 'عميل تجريبي موثّق',
          customerPhone: '01122223333',
          governorate: 'القاهرة',
          customerCity: 'المعادي',
          customerAddress: 'شارع 9 المعادي، القاهرة',
          subtotal: new Prisma.Decimal(unitPrice.toFixed(2)),
          shippingFee: new Prisma.Decimal(shippingFee.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          totalWholesale: new Prisma.Decimal(wholesale.toFixed(2)),
          totalCommission: new Prisma.Decimal(commission.toFixed(2)),
          platformProfit: new Prisma.Decimal(platformProfit.toFixed(2)),
          shippingCompany: 'Bosta',
          trackingNumber: 'BOSTA-SEED-0001',
          idempotencyKey: 'seed-order-sample-1',
          deliveredAt: tenDaysAgo,
          returnWindowEndsAt: threeDaysAgo,
          items: {
            create: {
              productId: firstProduct.id,
              variantId: variant.id,
              productName: firstProduct.nameAr,
              size: variant.size,
              color: variant.color,
              quantity: 1,
              returnedQuantity: 0,
              unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
              wholesalePrice: new Prisma.Decimal(wholesale.toFixed(2)),
              costPrice: new Prisma.Decimal(cost.toFixed(2)),
              commissionAmount: new Prisma.Decimal(commission.toFixed(2)),
            },
          },
        },
      });

      // Immutable matching ledger entries: Pending -> Locked -> Released (reconciles exactly to walletBalance)
      await tx.walletLedger.createMany({
        data: [
          {
            affiliateId: affiliate.id,
            orderId: order.id,
            type: 'COMMISSION_PENDING',
            amount: new Prisma.Decimal(commission.toFixed(2)),
            balanceAfter: new Prisma.Decimal('0.00'),
            idempotencyKey: `seed-ledger-pending-${order.id}`,
            note: 'Order created — pending delivery',
          },
          {
            affiliateId: affiliate.id,
            orderId: order.id,
            type: 'COMMISSION_LOCKED',
            amount: new Prisma.Decimal(commission.toFixed(2)),
            balanceAfter: new Prisma.Decimal('0.00'),
            idempotencyKey: `seed-ledger-locked-${order.id}`,
            note: 'Order delivered — locked for 7-day return window',
          },
          {
            affiliateId: affiliate.id,
            orderId: order.id,
            type: 'COMMISSION_RELEASED',
            amount: new Prisma.Decimal(commission.toFixed(2)),
            balanceAfter: new Prisma.Decimal(commission.toFixed(2)),
            idempotencyKey: `seed-ledger-released-${order.id}`,
            note: 'Return window elapsed — released to available wallet balance',
          },
        ],
        skipDuplicates: true,
      });
    }
  });

  console.log('✓ Seeded mathematically reconciled sample affiliate, order, and WalletLedger entries');
}

async function main() {
  console.log('Starting idempotent Ctrl YZ PostgreSQL seed...');

  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  const legacy: LegacyDatabase = fs.existsSync(dbPath)
    ? (JSON.parse(fs.readFileSync(dbPath, 'utf-8')) as LegacyDatabase)
    : {};

  const verifiedImages = getVerifiedPublicProductImages();
  console.log(`Found ${verifiedImages.size} verified product images in public/products/`);

  await seedPlatformSettings(legacy.settings);
  await seedShippingRates(legacy.governorates ?? []);
  await seedProductsAndVariants(legacy.products ?? [], verifiedImages);
  await seedAdminUser();
  await seedReconciledSampleOrderAndLedger();

  console.log('✅ Seed completed successfully.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
