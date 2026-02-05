-- Migration 003: Heureka XML Export Support
-- Adds missing fields needed for Heureka/CPC feed export

-- Add EAN to main products table (was only on supplier_products)
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);

-- Add delivery_date (days to ship) 
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 0;

-- Add heureka_cpc (custom CPC bid)
ALTER TABLE products ADD COLUMN IF NOT EXISTS heureka_cpc DECIMAL(6, 2);

-- Add itemgroup_id for variant grouping
ALTER TABLE products ADD COLUMN IF NOT EXISTS itemgroup_id VARCHAR(100);

-- Add manufacturer fields (separate from brand for Heureka compliance)
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(255);

-- Update existing products: copy EAN from supplier_products where available
UPDATE products p
SET ean = sp.ean
FROM supplier_products sp
WHERE sp.product_id = p.id 
  AND sp.ean IS NOT NULL 
  AND sp.ean != ''
  AND (p.ean IS NULL OR p.ean = '');

-- Update manufacturer_name from supplier_products.producer_name
UPDATE products p
SET manufacturer_name = sp.producer_name
FROM supplier_products sp
WHERE sp.product_id = p.id
  AND sp.producer_name IS NOT NULL
  AND sp.producer_name != ''
  AND (p.manufacturer_name IS NULL OR p.manufacturer_name = '');

-- Also try from brands table
UPDATE products p
SET manufacturer_name = b.name
FROM brands b
WHERE p.brand_id = b.id
  AND (p.manufacturer_name IS NULL OR p.manufacturer_name = '');

-- Update delivery_days from supplier shipping time
UPDATE products p
SET delivery_days = GREATEST(1, CEIL(sp.shipping_time_hours::DECIMAL / 24))
FROM supplier_products sp
WHERE sp.product_id = p.id
  AND sp.shipping_time_hours > 0
  AND (p.delivery_days IS NULL OR p.delivery_days = 0);

-- Set default delivery days for remaining products
UPDATE products SET delivery_days = 3 WHERE delivery_days IS NULL OR delivery_days = 0;
