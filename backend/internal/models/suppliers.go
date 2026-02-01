package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ==================== SUPPLIER MODELS ====================

// Supplier represents a product supplier (e.g., Action, AB, Tech Data)
type Supplier struct {
	ID                   uuid.UUID       `json:"id" db:"id"`
	Name                 string          `json:"name" db:"name"`
	Code                 string          `json:"code" db:"code"` // unique code, e.g., 'action'
	Description          string          `json:"description" db:"description"`
	Website              string          `json:"website" db:"website"`
	Logo                 string          `json:"logo" db:"logo"`
	ContactEmail         string          `json:"contact_email" db:"contact_email"`
	ContactPhone         string          `json:"contact_phone" db:"contact_phone"`
	
	// Feed configuration
	FeedURL              string          `json:"feed_url" db:"feed_url"`
	FeedType             string          `json:"feed_type" db:"feed_type"`     // xml, csv, json
	FeedFormat           string          `json:"feed_format" db:"feed_format"` // action, heureka, custom
	XMLItemPath          string          `json:"xml_item_path" db:"xml_item_path"`
	CategorySeparator    string          `json:"category_separator" db:"category_separator"`
	
	// Download limits
	MaxDownloadsPerDay   int             `json:"max_downloads_per_day" db:"max_downloads_per_day"`
	DownloadCountToday   int             `json:"download_count_today" db:"download_count_today"`
	LastDownloadDate     *time.Time      `json:"last_download_date" db:"last_download_date"`
	
	// Authentication
	AuthType             string          `json:"auth_type" db:"auth_type"` // none, basic, bearer, api_key
	AuthCredentials      json.RawMessage `json:"auth_credentials" db:"auth_credentials"`
	
	// Field mappings
	FieldMappings        json.RawMessage `json:"field_mappings" db:"field_mappings"`
	
	// Status
	IsActive             bool            `json:"is_active" db:"is_active"`
	Priority             int             `json:"priority" db:"priority"`
	
	// Timestamps
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at" db:"updated_at"`
	
	// Computed fields (not in DB)
	CurrentFeed          *StoredFeed     `json:"current_feed,omitempty" db:"-"`
	ProductCount         int             `json:"product_count,omitempty" db:"-"`
}

// StoredFeed represents a downloaded and stored feed file
type StoredFeed struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	SupplierID       uuid.UUID  `json:"supplier_id" db:"supplier_id"`
	
	// File info
	Filename         string     `json:"filename" db:"filename"`
	FilePath         string     `json:"file_path" db:"file_path"`
	FileSize         int64      `json:"file_size" db:"file_size"`
	FileHash         string     `json:"file_hash" db:"file_hash"`
	ContentType      string     `json:"content_type" db:"content_type"`
	
	// Download info
	DownloadedAt     time.Time  `json:"downloaded_at" db:"downloaded_at"`
	DownloadDuration int        `json:"download_duration_ms" db:"download_duration_ms"`
	SourceURL        string     `json:"source_url" db:"source_url"`
	
	// Parsing info
	TotalProducts    int        `json:"total_products" db:"total_products"`
	TotalCategories  int        `json:"total_categories" db:"total_categories"`
	TotalBrands      int        `json:"total_brands" db:"total_brands"`
	
	// Status
	Status           string     `json:"status" db:"status"` // downloading, downloaded, parsed, imported, error, expired
	ErrorMessage     string     `json:"error_message,omitempty" db:"error_message"`
	
	// Flags
	IsCurrent        bool       `json:"is_current" db:"is_current"`
	ExpiresAt        time.Time  `json:"expires_at" db:"expires_at"`
	
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// FeedImport represents an import run from a stored feed
type FeedImport struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	SupplierID     uuid.UUID  `json:"supplier_id" db:"supplier_id"`
	StoredFeedID   uuid.UUID  `json:"stored_feed_id" db:"stored_feed_id"`
	
	// Timing
	StartedAt      time.Time  `json:"started_at" db:"started_at"`
	FinishedAt     time.Time  `json:"finished_at,omitempty" db:"finished_at"`
	DurationMs     int        `json:"duration_ms" db:"duration_ms"`
	
	// Counts
	TotalItems     int        `json:"total_items" db:"total_items"`
	Processed      int        `json:"processed" db:"processed"`
	Created        int        `json:"created" db:"created"`
	Updated        int        `json:"updated" db:"updated"`
	Skipped        int        `json:"skipped" db:"skipped"`
	Errors         int        `json:"errors" db:"errors"`
	
	// Category/brand stats
	CategoriesCreated int     `json:"categories_created" db:"categories_created"`
	CategoriesUpdated int     `json:"categories_updated" db:"categories_updated"`
	BrandsCreated     int     `json:"brands_created" db:"brands_created"`
	
	// Status
	Status           string   `json:"status" db:"status"` // pending, running, completed, failed, cancelled
	ProgressPercent  float64  `json:"progress_percent" db:"progress_percent"`
	CurrentItem      string   `json:"current_item" db:"current_item"`
	ErrorMessage     string   `json:"error_message,omitempty" db:"error_message"`
	
	// Trigger info
	TriggeredBy      string   `json:"triggered_by" db:"triggered_by"` // manual, scheduled, api
	UserID           *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	
	// Logs
	Logs             []string `json:"logs" db:"-"` // stored as JSONB
	
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// ==================== SUPPLIER PRODUCT MODELS ====================

// SupplierProduct represents a product from a supplier's feed
type SupplierProduct struct {
	ID                     uuid.UUID              `json:"id" db:"id"`
	SupplierID             uuid.UUID              `json:"supplier_id" db:"supplier_id"`
	
	// Identifiers
	ExternalID             string                 `json:"external_id" db:"external_id"`
	EAN                    string                 `json:"ean" db:"ean"`
	ManufacturerPartNumber string                 `json:"manufacturer_part_number" db:"manufacturer_part_number"`
	
	// Basic info
	Name                   string                 `json:"name" db:"name"`
	Description            string                 `json:"description" db:"description"`
	
	// Pricing
	PriceNet               float64                `json:"price_net" db:"price_net"`
	PriceVAT               float64                `json:"price_vat" db:"price_vat"`
	VATRate                float64                `json:"vat_rate" db:"vat_rate"`
	SRP                    float64                `json:"srp" db:"srp"` // Suggested retail price
	
	// Stock
	Stock                  int                    `json:"stock" db:"stock"`
	StockStatus            string                 `json:"stock_status" db:"stock_status"` // in_stock, on_order, out_of_stock
	OnOrder                bool                   `json:"on_order" db:"on_order"`
	AdditionalAvailabilityInfo string             `json:"additional_availability_info" db:"additional_availability_info"`
	ShippingTimeHours      int                    `json:"shipping_time_hours" db:"shipping_time_hours"`
	ETA                    time.Time              `json:"eta,omitempty" db:"eta"`
	IncomingStock          int                    `json:"incoming_stock" db:"incoming_stock"`
	
	// Categories
	MainCategoryTree       string                 `json:"main_category_tree" db:"main_category_tree"`
	CategoryTree           string                 `json:"category_tree" db:"category_tree"`
	SubCategoryTree        string                 `json:"sub_category_tree" db:"sub_category_tree"`
	CategoryIDExternal     string                 `json:"category_id_external" db:"category_id_external"`
	
	// Producer
	ProducerIDExternal     string                 `json:"producer_id_external" db:"producer_id_external"`
	ProducerName           string                 `json:"producer_name" db:"producer_name"`
	
	// Images
	Images                 []ProductImage         `json:"images" db:"-"` // stored as JSONB
	
	// Multimedia
	Multimedia             []ProductMultimedia    `json:"multimedia" db:"-"` // stored as JSONB
	
	// Technical specs
	TechnicalSpecs         map[string]interface{} `json:"technical_specs" db:"-"` // stored as JSONB
	
	// Physical attributes
	Weight                 float64                `json:"weight" db:"weight"`
	WeightUnit             string                 `json:"weight_unit" db:"weight_unit"`
	Width                  float64                `json:"width" db:"width"`
	Length                 float64                `json:"length" db:"length"`
	Height                 float64                `json:"height" db:"height"`
	SizeUnit               string                 `json:"size_unit" db:"size_unit"`
	DimensionalWeight      float64                `json:"dimensional_weight" db:"dimensional_weight"`
	
	// Flags
	SpecialOffer           bool                   `json:"special_offer" db:"special_offer"`
	IsLarge                bool                   `json:"is_large" db:"is_large"`
	SmallPallet            bool                   `json:"small_pallet" db:"small_pallet"`
	
	// Warranty
	Warranty               string                 `json:"warranty" db:"warranty"`
	
	// Date added to supplier
	DateAdded              time.Time              `json:"date_added" db:"date_added"`
	
	// Link to main products table
	ProductID              *uuid.UUID             `json:"product_id,omitempty" db:"product_id"`
	
	// Raw data for debugging
	RawData                json.RawMessage        `json:"raw_data,omitempty" db:"raw_data"`
	
	// Timestamps
	LastSeenAt             time.Time              `json:"last_seen_at" db:"last_seen_at"`
	CreatedAt              time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt              time.Time              `json:"updated_at" db:"updated_at"`
}

// ProductImage for supplier products (extends the basic one)

// ProductMultimedia for manuals, videos, etc.
type ProductMultimedia struct {
	URL         string `json:"url"`
	Description string `json:"description"`
	Type        string `json:"type"` // manual pdf, video, etc.
	Copyright   bool   `json:"copyright"`
}

// SupplierProductFilter for filtering supplier products
type SupplierProductFilter struct {
	SupplierID uuid.UUID
	Search     string
	Category   string
	Brand      string
	InStock    *bool
	Limit      int
	Offset     int
}

// ==================== SUPPLIER CATEGORY MODELS ====================

// SupplierCategory represents a category from a supplier's feed
type SupplierCategory struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	SupplierID       uuid.UUID  `json:"supplier_id" db:"supplier_id"`
	ExternalID       string     `json:"external_id" db:"external_id"`
	ParentExternalID string     `json:"parent_external_id" db:"parent_external_id"`
	Name             string     `json:"name" db:"name"`
	FullPath         string     `json:"full_path" db:"full_path"` // e.g., "House > Garden > Tools"
	CategoryID       *uuid.UUID `json:"category_id,omitempty" db:"category_id"` // mapped main category
	ProductCount     int        `json:"product_count" db:"product_count"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

// SupplierCategoryTree for hierarchical display
type SupplierCategoryTree struct {
	*SupplierCategory
	Children []*SupplierCategoryTree `json:"children,omitempty"`
}

// ==================== SUPPLIER BRAND MODELS ====================

// SupplierBrand represents a brand/producer from a supplier's feed
type SupplierBrand struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	SupplierID   uuid.UUID  `json:"supplier_id" db:"supplier_id"`
	ExternalID   string     `json:"external_id" db:"external_id"`
	Name         string     `json:"name" db:"name"`
	BrandID      *uuid.UUID `json:"brand_id,omitempty" db:"brand_id"` // mapped main brand
	ProductCount int        `json:"product_count" db:"product_count"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}
