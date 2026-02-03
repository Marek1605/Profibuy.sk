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

-- Add linked_product_id to supplier_products for linking to main products catalog
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_products_linked ON supplier_products(linked_product_id);

-- Add unique constraint on external_id for product linking
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id) WHERE external_id IS NOT NULL AND external_id != '';
