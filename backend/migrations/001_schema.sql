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
