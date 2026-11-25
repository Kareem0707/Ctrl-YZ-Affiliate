-- Idempotent DB-level CHECK constraints supplement
-- Safe to run after `npx prisma db push` (already included in prisma/migrations/20261125000000_init/migration.sql).

DO $$
BEGIN
  -- Affiliates
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_wallet_balance_non_negative') THEN
    ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_wallet_balance_non_negative" CHECK ("wallet_balance" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_pending_balance_non_negative') THEN
    ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_pending_balance_non_negative" CHECK ("pending_balance" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_locked_balance_non_negative') THEN
    ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_locked_balance_non_negative" CHECK ("locked_balance" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_total_earned_non_negative') THEN
    ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_total_earned_non_negative" CHECK ("total_earned" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_total_withdrawn_non_negative') THEN
    ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_total_withdrawn_non_negative" CHECK ("total_withdrawn" >= 0);
  END IF;

  -- Products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_price_non_negative') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_cost_price_non_negative" CHECK ("cost_price" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_pricing_hierarchy') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_pricing_hierarchy" CHECK (
      "cost_price" <= "wholesale_price"
      AND "wholesale_price" <= "min_price"
      AND "min_price" <= "suggested_price"
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sale_price_non_negative') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_sale_price_non_negative" CHECK ("sale_price" IS NULL OR "sale_price" >= 0);
  END IF;

  -- Product variants
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_stock_non_negative') THEN
    ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_non_negative" CHECK ("stock" >= 0);
  END IF;

  -- Orders
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_monetary_non_negative') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_monetary_non_negative" CHECK (
      "subtotal" >= 0
      AND "shipping_fee" >= 0
      AND "total_amount" >= 0
      AND "total_wholesale" >= 0
      AND "total_commission" >= 0
    );
  END IF;

  -- Order items
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_returned_quantity_bounds') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_returned_quantity_bounds" CHECK ("returned_quantity" >= 0 AND "returned_quantity" <= "quantity");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_prices_non_negative') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_prices_non_negative" CHECK ("unit_price" >= 0 AND "wholesale_price" >= 0 AND "cost_price" >= 0);
  END IF;

  -- Payout requests
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_requests_amount_positive') THEN
    ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_amount_positive" CHECK ("amount" > 0);
  END IF;

  -- Platform settings
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_singleton_id') THEN
    ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_singleton_id" CHECK ("id" = 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_min_withdrawal_positive') THEN
    ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_min_withdrawal_positive" CHECK ("min_withdrawal_amount" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_return_window_non_negative') THEN
    ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_return_window_non_negative" CHECK ("return_window_days" >= 0);
  END IF;

  -- Shipping rates
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipping_rates_fee_non_negative') THEN
    ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_fee_non_negative" CHECK ("fee" >= 0);
  END IF;
END $$;
