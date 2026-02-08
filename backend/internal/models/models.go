package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Product - hlavný model pre produkty
type Product struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	SKU         string          `json:"sku" db:"sku"`
	Slug        string          `json:"slug" db:"slug"`
	Name        string          `json:"name" db:"name"`
	Description string          `json:"description" db:"description"`
	Price       float64         `json:"price" db:"price"`
	SalePrice   *float64        `json:"sale_price,omitempty" db:"sale_price"`
	Currency    string          `json:"currency" db:"currency"`
	Stock       int             `json:"stock" db:"stock"`
	CategoryID  *uuid.UUID      `json:"category_id,omitempty" db:"category_id"`
	BrandID     *uuid.UUID      `json:"brand_id,omitempty" db:"brand_id"`
	Images      json.RawMessage `json:"images" db:"images"`
	Attributes  json.RawMessage `json:"attributes" db:"attributes"`
	Variants    json.RawMessage `json:"variants,omitempty" db:"variants"`
	MetaTitle   string          `json:"meta_title" db:"meta_title"`
	MetaDesc    string          `json:"meta_description" db:"meta_description"`
	Status      string          `json:"status" db:"status"` // active, draft, archived
	FeedID      *uuid.UUID      `json:"feed_id,omitempty" db:"feed_id"`
	ExternalID  string          `json:"external_id,omitempty" db:"external_id"`
	Weight      float64         `json:"weight" db:"weight"`
	EAN              string     `json:"ean,omitempty" db:"ean"`
	DeliveryDays     int        `json:"delivery_days,omitempty" db:"delivery_days"`
	HeurekaCPC       *float64   `json:"heureka_cpc,omitempty" db:"heureka_cpc"`
	ItemGroupID      string     `json:"itemgroup_id,omitempty" db:"itemgroup_id"`
	ManufacturerName string     `json:"manufacturer_name,omitempty" db:"manufacturer_name"`
	SearchVector string         `json:"-" db:"search_vector"` // tsvector pre full-text search
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
}

// ProductImage - štruktúra pre obrázky
type ProductImage struct {
	URL       string `json:"url"`
	Alt       string `json:"alt,omitempty"`
	Position  int    `json:"position,omitempty"`
	IsPrimary bool   `json:"is_primary,omitempty"`
	IsMain    bool   `json:"is_main,omitempty"`
	Date      string `json:"date,omitempty"`
	Copyright bool   `json:"copyright,omitempty"`
}

// ProductAttribute - atribúty produktu
type ProductAttribute struct {
	Name  string `json:"name"`
	Value string `json:"value"`
	Unit  string `json:"unit,omitempty"`
}

// ProductVariant - varianty produktu
type ProductVariant struct {
	ID       uuid.UUID  `json:"id"`
	SKU      string     `json:"sku"`
	Name     string     `json:"name"`
	Price    float64    `json:"price"`
	Stock    int        `json:"stock"`
	Options  []VariantOption `json:"options"`
}

type VariantOption struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// Category - kategórie s hierarchiou
type Category struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty" db:"parent_id"`
	Slug        string     `json:"slug" db:"slug"`
	Name        string     `json:"name" db:"name"`
	Description string     `json:"description" db:"description"`
	Image       string     `json:"image" db:"image"`
	Position    int        `json:"position" db:"position"`
	MetaTitle   string     `json:"meta_title" db:"meta_title"`
	MetaDesc    string     `json:"meta_description" db:"meta_description"`
	ProductCount int       `json:"product_count" db:"product_count"`
	Published   *bool      `json:"published" db:"published"`
	Children    []Category `json:"children,omitempty" db:"-"`
	Path        string     `json:"path" db:"path"` // ltree pre hierarchiu
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// Brand
type Brand struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Slug        string    `json:"slug" db:"slug"`
	Name        string    `json:"name" db:"name"`
	Logo        string    `json:"logo" db:"logo"`
	Description string    `json:"description" db:"description"`
	Website     string    `json:"website" db:"website"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Cart
type Cart struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	SessionID string     `json:"session_id" db:"session_id"`
	UserID    *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	Items     []CartItem `json:"items" db:"-"`
	Total     float64    `json:"total" db:"-"`
	Currency  string     `json:"currency" db:"currency"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	ExpiresAt time.Time  `json:"expires_at" db:"expires_at"`
}

type CartItem struct {
	ID        uuid.UUID `json:"id" db:"id"`
	CartID    uuid.UUID `json:"cart_id" db:"cart_id"`
	ProductID uuid.UUID `json:"product_id" db:"product_id"`
	VariantID *uuid.UUID `json:"variant_id,omitempty" db:"variant_id"`
	Quantity  int       `json:"quantity" db:"quantity"`
	Price     float64   `json:"price" db:"price"`
	Product   *Product  `json:"product,omitempty" db:"-"`
}

// Order
type Order struct {
	ID              uuid.UUID       `json:"id" db:"id"`
	OrderNumber     string          `json:"order_number" db:"order_number"`
	UserID          *uuid.UUID      `json:"user_id,omitempty" db:"user_id"`
	Status          string          `json:"status" db:"status"` // pending, paid, processing, shipped, delivered, cancelled
	PaymentStatus   string          `json:"payment_status" db:"payment_status"`
	PaymentMethod   string          `json:"payment_method" db:"payment_method"`
	ShippingMethod  string          `json:"shipping_method" db:"shipping_method"`
	ShippingPrice   float64         `json:"shipping_price" db:"shipping_price"`
	Subtotal        float64         `json:"subtotal" db:"subtotal"`
	Tax             float64         `json:"tax" db:"tax"`
	Total           float64         `json:"total" db:"total"`
	Currency        string          `json:"currency" db:"currency"`
	BillingAddress  json.RawMessage `json:"billing_address" db:"billing_address"`
	ShippingAddress json.RawMessage `json:"shipping_address" db:"shipping_address"`
	Note            string          `json:"note" db:"note"`
	Items           []OrderItem     `json:"items" db:"-"`
	TrackingNumber  string          `json:"tracking_number" db:"tracking_number"`
	InvoiceNumber   string          `json:"invoice_number" db:"invoice_number"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
	PaidAt          *time.Time      `json:"paid_at,omitempty" db:"paid_at"`
	ShippedAt       *time.Time      `json:"shipped_at,omitempty" db:"shipped_at"`
}

type OrderItem struct {
	ID        uuid.UUID `json:"id" db:"id"`
	OrderID   uuid.UUID `json:"order_id" db:"order_id"`
	ProductID uuid.UUID `json:"product_id" db:"product_id"`
	VariantID *uuid.UUID `json:"variant_id,omitempty" db:"variant_id"`
	SKU       string    `json:"sku" db:"sku"`
	Name      string    `json:"name" db:"name"`
	Price     float64   `json:"price" db:"price"`
	Quantity  int       `json:"quantity" db:"quantity"`
	Total     float64   `json:"total" db:"total"`
}

// Address
type Address struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Company     string `json:"company,omitempty"`
	Street      string `json:"street"`
	City        string `json:"city"`
	PostalCode  string `json:"postal_code"`
	Country     string `json:"country"`
	CountryCode string `json:"country_code"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	ICO         string `json:"ico,omitempty"`
	DIC         string `json:"dic,omitempty"`
	ICDPH       string `json:"ic_dph,omitempty"`
}

// User
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FirstName    string    `json:"first_name" db:"first_name"`
	LastName     string    `json:"last_name" db:"last_name"`
	Phone        string    `json:"phone" db:"phone"`
	Role         string    `json:"role" db:"role"` // customer, admin
	IsActive     bool      `json:"is_active" db:"is_active"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// Feed - pre XML import
type Feed struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	URL         string    `json:"url" db:"url"`
	Type        string    `json:"type" db:"type"` // heureka, google, custom
	Mapping     json.RawMessage `json:"mapping" db:"mapping"`
	Schedule    string    `json:"schedule" db:"schedule"` // cron expression
	IsActive    bool      `json:"is_active" db:"is_active"`
	LastRunAt   *time.Time `json:"last_run_at,omitempty" db:"last_run_at"`
	LastStatus  string    `json:"last_status" db:"last_status"`
	ProductCount int      `json:"product_count" db:"product_count"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Settings
type Settings struct {
	ID    string          `json:"id" db:"id"`
	Key   string          `json:"key" db:"key"`
	Value json.RawMessage `json:"value" db:"value"`
	Group string          `json:"group" db:"group"`
}

// ShippingMethod
type ShippingMethod struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Code        string    `json:"code" db:"code"` // dpd, packeta, gls, posta
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Price       float64   `json:"price" db:"price"`
	FreeFrom    float64   `json:"free_from" db:"free_from"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	Config      json.RawMessage `json:"config" db:"config"`
}

// PaymentMethod
type PaymentMethod struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Code        string    `json:"code" db:"code"` // card, transfer, cod
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Fee         float64   `json:"fee" db:"fee"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	Config      json.RawMessage `json:"config" db:"config"`
}

// Filter for product listing
type ProductFilter struct {
	CategoryID  *uuid.UUID `json:"category_id"`
	BrandIDs    []uuid.UUID `json:"brand_ids"`
	PriceMin    *float64   `json:"price_min"`
	PriceMax    *float64   `json:"price_max"`
	InStock     *bool      `json:"in_stock"`
	OnSale      *bool      `json:"on_sale"`
	Attributes  map[string][]string `json:"attributes"`
	Search      string     `json:"search"`
	Sort        string     `json:"sort"` // price_asc, price_desc, name, newest, bestselling
	Page        int        `json:"page"`
	Limit       int        `json:"limit"`
}

// Pagination response
type PaginatedResponse struct {
	Items      interface{} `json:"items"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

// Filter options for UI
type FilterOptions struct {
	Categories []CategoryFilter `json:"categories"`
	Brands     []BrandFilter    `json:"brands"`
	PriceRange PriceRange       `json:"price_range"`
	Attributes []AttributeFilter `json:"attributes"`
}

type CategoryFilter struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Slug  string    `json:"slug"`
	Count int       `json:"count"`
}

type BrandFilter struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Count int       `json:"count"`
}

type PriceRange struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type AttributeFilter struct {
	Name   string          `json:"name"`
	Values []AttributeValue `json:"values"`
}

type AttributeValue struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}

// Dashboard stats
type DashboardStats struct {
	TotalRevenue     float64 `json:"total_revenue"`
	TodayRevenue     float64 `json:"today_revenue"`
	TotalOrders      int64   `json:"total_orders"`
	TodayOrders      int64   `json:"today_orders"`
	PendingOrders    int64   `json:"pending_orders"`
	TotalProducts    int64   `json:"total_products"`
	LowStockProducts int64   `json:"low_stock_products"`
	TotalCustomers   int64   `json:"total_customers"`
	RecentOrders     []Order `json:"recent_orders"`
	TopProducts      []ProductStat `json:"top_products"`
	SalesChart       []ChartData `json:"sales_chart"`
}

type ProductStat struct {
	Product    Product `json:"product"`
	TotalSold  int     `json:"total_sold"`
	Revenue    float64 `json:"revenue"`
}

type ChartData struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}
