package database

// Embedded migration SQL - auto-executed on startup

var migration001 = `
-- MegaShop Database Schema
-- Optimized for 100,000 - 200,000 products

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "ltree";    -- For hierarchical categories

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==================== BRANDS ====================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(500),
    description TEXT,
    website VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON brands(slug);

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    position INTEGER DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description TEXT,
    product_count INTEGER DEFAULT 0,
    path ltree,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories USING GIST (path);

-- ==================== FEEDS ====================
CREATE TABLE IF NOT EXISTS feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'heureka',
    mapping JSONB DEFAULT '{}',
    schedule VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_status VARCHAR(50),
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PRODUCTS ====================
-- Main products table - optimized for large datasets
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100),
    slug VARCHAR(500) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    sale_price DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    stock INTEGER DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    images JSONB DEFAULT '[]',
    attributes JSONB DEFAULT '[]',
    variants JSONB DEFAULT '[]',
    meta_title VARCHAR(255),
    meta_description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    feed_id UUID REFERENCES feeds(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    weight DECIMAL(10, 3) DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL INDEXES for 200k products performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_sale_price ON products(sale_price);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_created ON products(created_at DESC);
CREATE INDEX idx_products_feed ON products(feed_id);
CREATE INDEX idx_products_external ON products(external_id, feed_id);

-- Full-text search index (GIN is faster for searching, GIST for updates)
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Trigram index for fuzzy matching
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- Composite indexes for common queries
CREATE INDEX idx_products_category_status ON products(category_id, status);
CREATE INDEX idx_products_category_price ON products(category_id, price);
CREATE INDEX idx_products_status_created ON products(status, created_at DESC);

-- Partial index for active products (most common query)
CREATE INDEX idx_products_active ON products(id) WHERE status = 'active';
CREATE INDEX idx_products_active_stock ON products(id, stock) WHERE status = 'active' AND stock > 0;

-- Unique constraint for feed imports
CREATE UNIQUE INDEX idx_products_feed_external ON products(feed_id, external_id) WHERE feed_id IS NOT NULL AND external_id IS NOT NULL;

-- Auto-update search vector trigger
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.sku, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_vector();

-- ==================== CARTS ====================
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_expires ON carts(expires_at);

-- ==================== CART ITEMS ====================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cart_id, product_id, variant_id);

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_status VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    shipping_method VARCHAR(50),
    shipping_price DECIMAL(12, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_address JSONB,
    shipping_address JSONB,
    note TEXT,
    tracking_number VARCHAR(100),
    invoice_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ==================== ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID,
    sku VARCHAR(100),
    name VARCHAR(500) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    total DECIMAL(12, 2) NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ==================== SHIPPING METHODS ====================
CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    free_from DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default shipping methods
INSERT INTO shipping_methods (id, code, name, description, price, free_from, is_active) VALUES
    (uuid_generate_v4(), 'dpd', 'DPD Kuriér', 'Doručenie kuriérom DPD do 24h', 4.99, 50, true),
    (uuid_generate_v4(), 'packeta', 'Zásielkovňa', 'Vyzdvihnutie na výdajnom mieste', 2.99, 30, true),
    (uuid_generate_v4(), 'gls', 'GLS Kuriér', 'Doručenie kuriérom GLS', 4.49, 50, true),
    (uuid_generate_v4(), 'posta', 'Slovenská pošta', 'Doručenie poštou', 3.99, 40, true),
    (uuid_generate_v4(), 'personal', 'Osobný odber', 'Vyzdvihnutie na predajni', 0, 0, true)
ON CONFLICT (code) DO NOTHING;

-- ==================== PAYMENT METHODS ====================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    fee DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment methods
INSERT INTO payment_methods (id, code, name, description, fee, is_active) VALUES
    (uuid_generate_v4(), 'card', 'Platba kartou', 'Platba cez Comgate/GoPay', 0, true),
    (uuid_generate_v4(), 'transfer', 'Bankový prevod', 'Platba vopred na účet', 0, true),
    (uuid_generate_v4(), 'cod', 'Dobierka', 'Platba pri prevzatí', 1.50, true)
ON CONFLICT (code) DO NOTHING;

-- ==================== SETTINGS ====================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "group" VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_group ON settings("group");

-- Insert default settings
INSERT INTO settings (id, key, value, "group") VALUES
    (uuid_generate_v4(), 'shop_name', '"MegaShop"', 'general'),
    (uuid_generate_v4(), 'shop_email', '"info@megashop.sk"', 'general'),
    (uuid_generate_v4(), 'shop_phone', '"+421 900 123 456"', 'general'),
    (uuid_generate_v4(), 'shop_address', '{"street": "Hlavná 1", "city": "Bratislava", "postal_code": "811 01", "country": "Slovensko"}', 'general'),
    (uuid_generate_v4(), 'currency', '"EUR"', 'general'),
    (uuid_generate_v4(), 'tax_rate', '20', 'general'),
    (uuid_generate_v4(), 'comgate_enabled', 'true', 'payments'),
    (uuid_generate_v4(), 'gopay_enabled', 'false', 'payments'),
    (uuid_generate_v4(), 'free_shipping_from', '50', 'shipping')
ON CONFLICT (key) DO NOTHING;

-- ==================== VIEWS ====================

-- Materialized view for category product counts (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_counts AS
SELECT 
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
GROUP BY c.id, c.name, c.slug;

CREATE UNIQUE INDEX idx_mv_category_counts ON mv_category_counts(id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_category_counts()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_counts;
END;
$$ LANGUAGE plpgsql;

-- ==================== CLEANUP ====================

-- Function to clean expired carts
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS void AS $$
BEGIN
    DELETE FROM carts WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==================== ADMIN USER ====================

-- Create default admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
VALUES (
    uuid_generate_v4(),
    'admin@megashop.sk',
    '$2a$10$8KzIVK0QQZ7qA3EhLnS3Gu8pBpYkZAqLnqYBj1XBFH9J8LqYhQXK2', -- bcrypt hash of 'admin123'
    'Admin',
    'User',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- ==================== PERFORMANCE TUNING ====================

-- Set statistics targets for better query planning on large tables
ALTER TABLE products ALTER COLUMN category_id SET STATISTICS 1000;
ALTER TABLE products ALTER COLUMN brand_id SET STATISTICS 1000;
ALTER TABLE products ALTER COLUMN status SET STATISTICS 100;
ALTER TABLE products ALTER COLUMN price SET STATISTICS 1000;

-- Analyze tables for optimal query planning
ANALYZE products;
ANALYZE categories;
ANALYZE orders;
`

var migration002 = `
-- Migration 002: Suppliers and Feed Storage Management
-- Support for Action-style feeds with download limits

-- ==================== SUPPLIERS ====================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'action', 'ab', 'tech_data'
    description TEXT,
    website VARCHAR(500),
    logo VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Feed configuration
    feed_url TEXT,
    feed_type VARCHAR(20) DEFAULT 'xml' CHECK (feed_type IN ('xml', 'csv', 'json')),
    feed_format VARCHAR(50) DEFAULT 'action',  -- 'action', 'heureka', 'custom'
    xml_item_path VARCHAR(255) DEFAULT 'Product',  -- XPath to product element
    category_separator VARCHAR(10) DEFAULT '>',
    
    -- Download limits
    max_downloads_per_day INTEGER DEFAULT 8,  -- Action limit
    download_count_today INTEGER DEFAULT 0,
    last_download_date DATE,
    
    -- Authentication (if required)
    auth_type VARCHAR(20) DEFAULT 'none' CHECK (auth_type IN ('none', 'basic', 'bearer', 'api_key')),
    auth_credentials JSONB DEFAULT '{}',  -- encrypted in production
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,  -- Higher = more important
    
    -- Field mappings (source -> target)
    field_mappings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- ==================== STORED FEEDS ====================
-- Stores downloaded feed files locally
CREATE TABLE IF NOT EXISTS stored_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- File info
    filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,  -- Local path on server
    file_size BIGINT,  -- bytes
    file_hash VARCHAR(64),  -- SHA-256 hash to detect changes
    content_type VARCHAR(100) DEFAULT 'application/xml',
    
    -- Download info
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    download_duration_ms INTEGER,
    source_url TEXT,
    
    -- Parsing info
    total_products INTEGER DEFAULT 0,
    total_categories INTEGER DEFAULT 0,
    total_brands INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'downloaded' CHECK (status IN ('downloading', 'downloaded', 'parsed', 'imported', 'error', 'expired')),
    error_message TEXT,
    
    -- Metadata
    is_current BOOLEAN DEFAULT false,  -- Mark as the currently active feed
    expires_at TIMESTAMP WITH TIME ZONE,  -- When to consider this feed stale
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stored_feeds_supplier ON stored_feeds(supplier_id);
CREATE INDEX idx_stored_feeds_status ON stored_feeds(status);
CREATE INDEX idx_stored_feeds_current ON stored_feeds(supplier_id, is_current) WHERE is_current = true;
CREATE INDEX idx_stored_feeds_downloaded ON stored_feeds(downloaded_at DESC);

-- ==================== FEED IMPORTS ====================
-- Tracks import runs from stored feeds
CREATE TABLE IF NOT EXISTS feed_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    stored_feed_id UUID REFERENCES stored_feeds(id) ON DELETE SET NULL,
    
    -- Import stats
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Counts
    total_items INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    created INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    
    -- Category stats
    categories_created INTEGER DEFAULT 0,
    categories_updated INTEGER DEFAULT 0,
    brands_created INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress_percent DECIMAL(5, 2) DEFAULT 0,
    current_item VARCHAR(255),
    error_message TEXT,
    
    -- Who triggered it
    triggered_by VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'scheduled', 'api'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Import log (last N messages)
    logs JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feed_imports_supplier ON feed_imports(supplier_id);
CREATE INDEX idx_feed_imports_stored_feed ON feed_imports(stored_feed_id);
CREATE INDEX idx_feed_imports_status ON feed_imports(status);
CREATE INDEX idx_feed_imports_started ON feed_imports(started_at DESC);

-- ==================== SUPPLIER PRODUCTS ====================
-- Products from suppliers (before merging into main products)
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- External identifiers
    external_id VARCHAR(255) NOT NULL,  -- Product ID from supplier
    ean VARCHAR(50),
    manufacturer_part_number VARCHAR(100),
    
    -- Basic info
    name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Pricing
    price_net DECIMAL(12, 2),  -- Net price from supplier
    price_vat DECIMAL(12, 2),  -- Price with VAT
    vat_rate DECIMAL(5, 2) DEFAULT 20,
    srp DECIMAL(12, 2),  -- Suggested retail price
    
    -- Stock
    stock INTEGER DEFAULT 0,
    stock_status VARCHAR(50),  -- 'in_stock', 'on_order', 'out_of_stock'
    on_order BOOLEAN DEFAULT false,
    additional_availability_info VARCHAR(255),
    shipping_time_hours INTEGER,
    eta DATE,
    incoming_stock INTEGER DEFAULT 0,
    
    -- Categories from supplier
    main_category_tree VARCHAR(500),
    category_tree VARCHAR(500),
    sub_category_tree VARCHAR(500),
    category_id_external VARCHAR(100),
    
    -- Brand/Producer
    producer_id_external VARCHAR(100),
    producer_name VARCHAR(255),
    
    -- Images
    images JSONB DEFAULT '[]',  -- Array of {url, is_main, date, copyright}
    
    -- Multimedia
    multimedia JSONB DEFAULT '[]',  -- Manuals, videos, etc.
    
    -- Technical specs
    technical_specs JSONB DEFAULT '{}',  -- Sections with parameters
    
    -- Physical attributes
    weight DECIMAL(10, 3),  -- in weight_unit
    weight_unit VARCHAR(10) DEFAULT 'g',
    width DECIMAL(10, 2),
    length DECIMAL(10, 2),
    height DECIMAL(10, 2),
    size_unit VARCHAR(10) DEFAULT 'mm',
    dimensional_weight DECIMAL(10, 3),
    
    -- Flags
    special_offer BOOLEAN DEFAULT false,
    is_large BOOLEAN DEFAULT false,
    small_pallet BOOLEAN DEFAULT false,
    
    -- Warranty
    warranty VARCHAR(100),
    
    -- Date added to supplier
    date_added DATE,
    
    -- Linking to main products table
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Raw data for debugging
    raw_data JSONB,
    
    -- Timestamps
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_external_id ON supplier_products(supplier_id, external_id);
CREATE INDEX idx_supplier_products_ean ON supplier_products(ean);
CREATE INDEX idx_supplier_products_mpn ON supplier_products(manufacturer_part_number);
CREATE INDEX idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX idx_supplier_products_category ON supplier_products(category_tree);
CREATE INDEX idx_supplier_products_producer ON supplier_products(producer_name);
CREATE UNIQUE INDEX idx_supplier_products_unique ON supplier_products(supplier_id, external_id);

-- ==================== SUPPLIER CATEGORIES ====================
-- Categories from supplier feeds
CREATE TABLE IF NOT EXISTS supplier_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    external_id VARCHAR(100) NOT NULL,
    parent_external_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    full_path VARCHAR(1000),  -- e.g., "House and Garden > Tools > Batteries"
    
    -- Mapping to main categories
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    product_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_categories_supplier ON supplier_categories(supplier_id);
CREATE INDEX idx_supplier_categories_external ON supplier_categories(supplier_id, external_id);
CREATE INDEX idx_supplier_categories_parent ON supplier_categories(supplier_id, parent_external_id);
CREATE INDEX idx_supplier_categories_mapped ON supplier_categories(category_id);
CREATE UNIQUE INDEX idx_supplier_categories_unique ON supplier_categories(supplier_id, external_id);

-- ==================== SUPPLIER BRANDS ====================
CREATE TABLE IF NOT EXISTS supplier_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    external_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Mapping to main brands
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    
    product_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_brands_supplier ON supplier_brands(supplier_id);
CREATE INDEX idx_supplier_brands_external ON supplier_brands(supplier_id, external_id);
CREATE INDEX idx_supplier_brands_name ON supplier_brands(name);
CREATE INDEX idx_supplier_brands_mapped ON supplier_brands(brand_id);
CREATE UNIQUE INDEX idx_supplier_brands_unique ON supplier_brands(supplier_id, external_id);

-- ==================== FUNCTIONS ====================

-- Reset daily download counter
CREATE OR REPLACE FUNCTION reset_supplier_download_counts()
RETURNS void AS $$
BEGIN
    UPDATE suppliers 
    SET download_count_today = 0 
    WHERE last_download_date < CURRENT_DATE OR last_download_date IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Check if supplier can download
CREATE OR REPLACE FUNCTION can_supplier_download(p_supplier_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_max INTEGER;
    v_last_date DATE;
BEGIN
    SELECT download_count_today, max_downloads_per_day, last_download_date
    INTO v_count, v_max, v_last_date
    FROM suppliers WHERE id = p_supplier_id;
    
    -- Reset if new day
    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE THEN
        RETURN TRUE;
    END IF;
    
    RETURN v_count < v_max;
END;
$$ LANGUAGE plpgsql;

-- Increment download counter
CREATE OR REPLACE FUNCTION increment_supplier_download(p_supplier_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE suppliers 
    SET 
        download_count_today = CASE 
            WHEN last_download_date < CURRENT_DATE OR last_download_date IS NULL THEN 1
            ELSE download_count_today + 1
        END,
        last_download_date = CURRENT_DATE
    WHERE id = p_supplier_id;
END;
$$ LANGUAGE plpgsql;

-- ==================== INSERT DEFAULT ACTION SUPPLIER ====================
INSERT INTO suppliers (
    id, name, code, description, 
    feed_type, feed_format, xml_item_path,
    max_downloads_per_day, 
    field_mappings, 
    is_active
) VALUES (
    uuid_generate_v4(),
    'Action S.A.',
    'action',
    'Veľkoobchod s elektronikou a spotrebným tovarom',
    'xml',
    'action',
    'Product',
    8,  -- Limited to 8 downloads per day
    '{
        "id": "external_id",
        "name": "name",
        "priceNet": "price_net",
        "vat": "vat_rate",
        "srp": "srp",
        "available": "stock",
        "EAN": "ean",
        "manufacturerPartNumber": "manufacturer_part_number",
        "producer": "producer_id_external",
        "categoryId": "category_id_external",
        "warranty": "warranty",
        "weight": "weight",
        "weightMeasurementUnit": "weight_unit",
        "sizeWidth": "width",
        "sizeLength": "length",
        "sizeHeight": "height",
        "sizetMeasurementUnit": "size_unit",
        "dimensionalWeight": "dimensional_weight",
        "specialOffer": "special_offer",
        "productIsLarge": "is_large",
        "smallPallet": "small_pallet",
        "onOrder": "on_order",
        "date": "date_added",
        "additionalAvailabilityInfo": "additional_availability_info",
        "shippingTimeInHour": "shipping_time_hours",
        "ETA": "eta",
        "incomingStock": "incoming_stock",
        "mainCategoryTree": "main_category_tree",
        "categoryTree": "category_tree",
        "subCategoryTree": "sub_category_tree"
    }',
    true
) ON CONFLICT (code) DO NOTHING;

-- ==================== UPDATE feeds TABLE ====================
-- Add supplier_id column to existing feeds table for backward compatibility
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_feeds_supplier ON feeds(supplier_id);

-- ==================== TRIGGERS ====================

-- Update supplier updated_at
CREATE OR REPLACE FUNCTION update_supplier_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suppliers_updated
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_timestamp();

CREATE TRIGGER trg_supplier_products_updated
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_timestamp();

CREATE TRIGGER trg_supplier_categories_updated
    BEFORE UPDATE ON supplier_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_timestamp();

CREATE TRIGGER trg_supplier_brands_updated
    BEFORE UPDATE ON supplier_brands
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_timestamp();

-- Fix: Add default for auth_type if missing
DO $$ 
BEGIN
    ALTER TABLE suppliers ALTER COLUMN auth_type SET DEFAULT 'none';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`

var migration003 = `
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
DO $$
BEGIN
    UPDATE products p
    SET ean = sp.ean
    FROM supplier_products sp
    WHERE sp.product_id = p.id 
      AND sp.ean IS NOT NULL 
      AND sp.ean != ''
      AND (p.ean IS NULL OR p.ean = '');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update manufacturer_name from supplier_products.producer_name
DO $$
BEGIN
    UPDATE products p
    SET manufacturer_name = sp.producer_name
    FROM supplier_products sp
    WHERE sp.product_id = p.id
      AND sp.producer_name IS NOT NULL
      AND sp.producer_name != ''
      AND (p.manufacturer_name IS NULL OR p.manufacturer_name = '');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Also try from brands table
DO $$
BEGIN
    UPDATE products p
    SET manufacturer_name = b.name
    FROM brands b
    WHERE p.brand_id = b.id
      AND (p.manufacturer_name IS NULL OR p.manufacturer_name = '');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update delivery_days from supplier shipping time
DO $$
BEGIN
    UPDATE products p
    SET delivery_days = GREATEST(1, CEIL(sp.shipping_time_hours::DECIMAL / 24))
    FROM supplier_products sp
    WHERE sp.product_id = p.id
      AND sp.shipping_time_hours > 0
      AND (p.delivery_days IS NULL OR p.delivery_days = 0);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Set default delivery days for remaining products
UPDATE products SET delivery_days = 3 WHERE delivery_days IS NULL OR delivery_days = 0;
`
