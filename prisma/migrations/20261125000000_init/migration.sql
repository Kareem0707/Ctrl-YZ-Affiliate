-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'MARKETER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'WHATSAPP_OTP');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('STOREFRONT', 'AFFILIATE_DIRECT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED');

-- CreateEnum
CREATE TYPE "CommissionState" AS ENUM ('NONE', 'PENDING', 'LOCKED_RETURN_WINDOW', 'AVAILABLE', 'CLAWED_BACK', 'VOIDED');

-- CreateEnum
CREATE TYPE "WalletLedgerType" AS ENUM ('COMMISSION_PENDING', 'COMMISSION_LOCKED', 'COMMISSION_RELEASED', 'COMMISSION_CLAWBACK', 'COMMISSION_VOIDED', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_PAID', 'WITHDRAWAL_REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_sub" TEXT,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "email_verified_at" TIMESTAMPTZ(6),
    "phone_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "national_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "marketing_channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channel_links" TEXT,
    "experience_level" TEXT,
    "expected_monthly_orders" TEXT,
    "affiliate_code" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "wallet_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "locked_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_earned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payout_method" "PayoutMethod" NOT NULL DEFAULT 'VODAFONE_CASH',
    "payout_account" TEXT NOT NULL,
    "payout_holder_name" TEXT,
    "payout_bank_name" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'Ctrl YZ',
    "category" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cost_price" DECIMAL(12,2) NOT NULL,
    "wholesale_price" DECIMAL(12,2) NOT NULL,
    "min_price" DECIMAL(12,2) NOT NULL,
    "suggested_price" DECIMAL(12,2) NOT NULL,
    "sale_price" DECIMAL(12,2),
    "marketing_drive_url" TEXT,
    "ad_copies" JSONB,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "color_hex" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "user_agent_hash" TEXT NOT NULL,
    "landing_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "affiliate_id" TEXT,
    "source" "OrderSource" NOT NULL DEFAULT 'STOREFRONT',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "commission_state" "CommissionState" NOT NULL DEFAULT 'NONE',
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_alt_phone" TEXT,
    "governorate" TEXT NOT NULL,
    "customer_city" TEXT,
    "customer_address" TEXT NOT NULL,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "total_wholesale" DECIMAL(12,2) NOT NULL,
    "total_commission" DECIMAL(12,2) NOT NULL,
    "platform_profit" DECIMAL(12,2) NOT NULL,
    "shipping_company" TEXT,
    "tracking_number" TEXT,
    "status_notes" TEXT,
    "status_history" JSONB,
    "idempotency_key" TEXT,
    "delivered_at" TIMESTAMPTZ(6),
    "return_window_ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "returned_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "wholesale_price" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "order_id" TEXT,
    "payout_request_id" TEXT,
    "type" "WalletLedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "request_code" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "account_details" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "receipt_ref" TEXT,
    "rejection_reason" TEXT,
    "processed_by" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "store_name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "contact_whatsapp" TEXT NOT NULL,
    "announcement_ar" TEXT NOT NULL,
    "announcement_en" TEXT NOT NULL,
    "min_withdrawal_amount" DECIMAL(12,2) NOT NULL DEFAULT 200,
    "return_window_days" INTEGER NOT NULL DEFAULT 7,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "governorate_ar" TEXT NOT NULL,
    "governorate_en" TEXT NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "estimated_days" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_phone_key" ON "affiliates"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_national_id_key" ON "affiliates"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_affiliate_code_key" ON "affiliates"("affiliate_code");

-- CreateIndex
CREATE INDEX "affiliates_status_created_at_idx" ON "affiliates"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_channel_created_at_idx" ON "verification_tokens"("user_id", "channel", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_is_active_archived_at_category_idx" ON "products"("is_active", "archived_at", "category");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_size_color_key" ON "product_variants"("product_id", "size", "color");

-- CreateIndex
CREATE INDEX "affiliate_clicks_affiliate_id_created_at_idx" ON "affiliate_clicks"("affiliate_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "affiliate_clicks_affiliate_id_ip_hash_created_at_idx" ON "affiliate_clicks"("affiliate_id", "ip_hash", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_affiliate_id_status_created_at_idx" ON "orders"("affiliate_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_tracking_number_idx" ON "orders"("tracking_number");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_commission_state_return_window_ends_at_idx" ON "orders"("commission_state", "return_window_ends_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_idempotency_key_key" ON "wallet_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_ledger_affiliate_id_created_at_idx" ON "wallet_ledger"("affiliate_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_ledger_order_id_idx" ON "wallet_ledger"("order_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_payout_request_id_idx" ON "wallet_ledger"("payout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_request_code_key" ON "payout_requests"("request_code");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_idempotency_key_key" ON "payout_requests"("idempotency_key");

-- CreateIndex
CREATE INDEX "payout_requests_affiliate_id_status_created_at_idx" ON "payout_requests"("affiliate_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rates_governorate_ar_key" ON "shipping_rates"("governorate_ar");

-- CreateIndex
CREATE UNIQUE INDEX "sync_logs_idempotency_key_key" ON "sync_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "sync_logs_source_status_created_at_idx" ON "sync_logs"("source", "status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_payout_request_id_fkey" FOREIGN KEY ("payout_request_id") REFERENCES "payout_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================
-- DB-Level Financial, Inventory & Pricing CHECK Constraints
-- ============================================================

-- Affiliates non-negative financial balances
ALTER TABLE "affiliates"
  ADD CONSTRAINT "affiliates_wallet_balance_non_negative" CHECK ("wallet_balance" >= 0),
  ADD CONSTRAINT "affiliates_pending_balance_non_negative" CHECK ("pending_balance" >= 0),
  ADD CONSTRAINT "affiliates_locked_balance_non_negative" CHECK ("locked_balance" >= 0),
  ADD CONSTRAINT "affiliates_total_earned_non_negative" CHECK ("total_earned" >= 0),
  ADD CONSTRAINT "affiliates_total_withdrawn_non_negative" CHECK ("total_withdrawn" >= 0);

-- Products pricing invariant: 0 <= cost_price <= wholesale_price <= min_price <= suggested_price
ALTER TABLE "products"
  ADD CONSTRAINT "products_cost_price_non_negative" CHECK ("cost_price" >= 0),
  ADD CONSTRAINT "products_pricing_hierarchy" CHECK (
    "cost_price" <= "wholesale_price"
    AND "wholesale_price" <= "min_price"
    AND "min_price" <= "suggested_price"
  ),
  ADD CONSTRAINT "products_sale_price_non_negative" CHECK ("sale_price" IS NULL OR "sale_price" >= 0);

-- Product variants non-negative stock
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stock_non_negative" CHECK ("stock" >= 0);

-- Orders non-negative totals
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_monetary_non_negative" CHECK (
    "subtotal" >= 0
    AND "shipping_fee" >= 0
    AND "total_amount" >= 0
    AND "total_wholesale" >= 0
    AND "total_commission" >= 0
  );

-- Order items quantity and partial return invariants
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_returned_quantity_bounds" CHECK ("returned_quantity" >= 0 AND "returned_quantity" <= "quantity"),
  ADD CONSTRAINT "order_items_prices_non_negative" CHECK ("unit_price" >= 0 AND "wholesale_price" >= 0 AND "cost_price" >= 0);

-- Payout requests strictly positive withdrawal amount
ALTER TABLE "payout_requests"
  ADD CONSTRAINT "payout_requests_amount_positive" CHECK ("amount" > 0);

-- Platform settings singleton row and positive thresholds
ALTER TABLE "platform_settings"
  ADD CONSTRAINT "platform_settings_singleton_id" CHECK ("id" = 1),
  ADD CONSTRAINT "platform_settings_min_withdrawal_positive" CHECK ("min_withdrawal_amount" > 0),
  ADD CONSTRAINT "platform_settings_return_window_non_negative" CHECK ("return_window_days" >= 0);

-- Shipping rates non-negative fee
ALTER TABLE "shipping_rates"
  ADD CONSTRAINT "shipping_rates_fee_non_negative" CHECK ("fee" >= 0);
