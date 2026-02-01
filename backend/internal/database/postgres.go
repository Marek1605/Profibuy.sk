package database

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"megashop/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(connString string) (*Postgres, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// Optimalizácia pre veľké datasety
	config.MaxConns = 50
	config.MinConns = 10
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Close() {
	p.pool.Close()
}

func (p *Postgres) Pool() *pgxpool.Pool {
	return p.pool
}

// ==================== PRODUCTS ====================

// ListProducts - optimalizovaný listing s filtrami
func (p *Postgres) ListProducts(ctx context.Context, filter models.ProductFilter) (*models.PaginatedResponse, error) {
	var conditions []string
	var args []interface{}
	argNum := 1

	// Base conditions
	conditions = append(conditions, "status = 'active'")

	// Category filter
	if filter.CategoryID != nil {
		conditions = append(conditions, fmt.Sprintf("(category_id = $%d OR category_id IN (SELECT id FROM categories WHERE path <@ (SELECT path FROM categories WHERE id = $%d)))", argNum, argNum))
		args = append(args, *filter.CategoryID)
		argNum++
	}

	// Brand filter
	if len(filter.BrandIDs) > 0 {
		placeholders := make([]string, len(filter.BrandIDs))
		for i, brandID := range filter.BrandIDs {
			placeholders[i] = fmt.Sprintf("$%d", argNum)
			args = append(args, brandID)
			argNum++
		}
		conditions = append(conditions, fmt.Sprintf("brand_id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Price filter
	if filter.PriceMin != nil {
		conditions = append(conditions, fmt.Sprintf("COALESCE(sale_price, price) >= $%d", argNum))
		args = append(args, *filter.PriceMin)
		argNum++
	}
	if filter.PriceMax != nil {
		conditions = append(conditions, fmt.Sprintf("COALESCE(sale_price, price) <= $%d", argNum))
		args = append(args, *filter.PriceMax)
		argNum++
	}

	// Stock filter
	if filter.InStock != nil && *filter.InStock {
		conditions = append(conditions, "stock > 0")
	}

	// Sale filter
	if filter.OnSale != nil && *filter.OnSale {
		conditions = append(conditions, "sale_price IS NOT NULL AND sale_price < price")
	}

	// Full-text search
	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("search_vector @@ plainto_tsquery('simple', $%d)", argNum))
		args = append(args, filter.Search)
		argNum++
	}

	// Attribute filters
	for attrName, attrValues := range filter.Attributes {
		if len(attrValues) > 0 {
			placeholders := make([]string, len(attrValues))
			for i, val := range attrValues {
				placeholders[i] = fmt.Sprintf("$%d", argNum)
				args = append(args, val)
				argNum++
			}
			conditions = append(conditions, fmt.Sprintf(
				"EXISTS (SELECT 1 FROM jsonb_array_elements(attributes) AS attr WHERE attr->>'name' = $%d AND attr->>'value' IN (%s))",
				argNum, strings.Join(placeholders, ",")))
			args = append(args, attrName)
			argNum++
		}
	}

	whereClause := strings.Join(conditions, " AND ")

	// Sorting
	var orderBy string
	switch filter.Sort {
	case "price_asc":
		orderBy = "COALESCE(sale_price, price) ASC"
	case "price_desc":
		orderBy = "COALESCE(sale_price, price) DESC"
	case "name":
		orderBy = "name ASC"
	case "newest":
		orderBy = "created_at DESC"
	case "bestselling":
		orderBy = "sold_count DESC NULLS LAST"
	default:
		orderBy = "created_at DESC"
	}

	// Pagination
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 24
	}
	offset := (filter.Page - 1) * filter.Limit

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM products WHERE %s", whereClause)
	var total int64
	if err := p.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT id, sku, slug, name, description, price, sale_price, currency, stock, 
			   category_id, brand_id, images, attributes, meta_title, meta_description,
			   status, weight, created_at, updated_at
		FROM products 
		WHERE %s 
		ORDER BY %s 
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argNum, argNum+1)

	args = append(args, filter.Limit, offset)

	rows, err := p.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var prod models.Product
		err := rows.Scan(
			&prod.ID, &prod.SKU, &prod.Slug, &prod.Name, &prod.Description,
			&prod.Price, &prod.SalePrice, &prod.Currency, &prod.Stock,
			&prod.CategoryID, &prod.BrandID, &prod.Images, &prod.Attributes,
			&prod.MetaTitle, &prod.MetaDesc, &prod.Status, &prod.Weight,
			&prod.CreatedAt, &prod.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, prod)
	}

	return &models.PaginatedResponse{
		Items:      products,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: int(math.Ceil(float64(total) / float64(filter.Limit))),
	}, nil
}

// GetProduct by ID
func (p *Postgres) GetProduct(ctx context.Context, id uuid.UUID) (*models.Product, error) {
	query := `
		SELECT id, sku, slug, name, description, price, sale_price, currency, stock, 
			   category_id, brand_id, images, attributes, variants, meta_title, meta_description,
			   status, weight, created_at, updated_at
		FROM products 
		WHERE id = $1
	`

	var prod models.Product
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&prod.ID, &prod.SKU, &prod.Slug, &prod.Name, &prod.Description,
		&prod.Price, &prod.SalePrice, &prod.Currency, &prod.Stock,
		&prod.CategoryID, &prod.BrandID, &prod.Images, &prod.Attributes,
		&prod.Variants, &prod.MetaTitle, &prod.MetaDesc, &prod.Status,
		&prod.Weight, &prod.CreatedAt, &prod.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}

	return &prod, nil
}

// GetProductBySlug
func (p *Postgres) GetProductBySlug(ctx context.Context, slug string) (*models.Product, error) {
	query := `
		SELECT id, sku, slug, name, description, price, sale_price, currency, stock, 
			   category_id, brand_id, images, attributes, variants, meta_title, meta_description,
			   status, weight, created_at, updated_at
		FROM products 
		WHERE slug = $1 AND status = 'active'
	`

	var prod models.Product
	err := p.pool.QueryRow(ctx, query, slug).Scan(
		&prod.ID, &prod.SKU, &prod.Slug, &prod.Name, &prod.Description,
		&prod.Price, &prod.SalePrice, &prod.Currency, &prod.Stock,
		&prod.CategoryID, &prod.BrandID, &prod.Images, &prod.Attributes,
		&prod.Variants, &prod.MetaTitle, &prod.MetaDesc, &prod.Status,
		&prod.Weight, &prod.CreatedAt, &prod.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get product by slug: %w", err)
	}

	return &prod, nil
}

// CreateProduct
func (p *Postgres) CreateProduct(ctx context.Context, prod *models.Product) error {
	prod.ID = uuid.New()
	prod.CreatedAt = time.Now()
	prod.UpdatedAt = time.Now()

	query := `
		INSERT INTO products (
			id, sku, slug, name, description, price, sale_price, currency, stock,
			category_id, brand_id, images, attributes, variants, meta_title, meta_description,
			status, feed_id, external_id, weight, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		)
	`

	_, err := p.pool.Exec(ctx, query,
		prod.ID, prod.SKU, prod.Slug, prod.Name, prod.Description,
		prod.Price, prod.SalePrice, prod.Currency, prod.Stock,
		prod.CategoryID, prod.BrandID, prod.Images, prod.Attributes,
		prod.Variants, prod.MetaTitle, prod.MetaDesc, prod.Status,
		prod.FeedID, prod.ExternalID, prod.Weight, prod.CreatedAt, prod.UpdatedAt,
	)

	return err
}

// UpdateProduct
func (p *Postgres) UpdateProduct(ctx context.Context, prod *models.Product) error {
	prod.UpdatedAt = time.Now()

	query := `
		UPDATE products SET
			sku = $2, slug = $3, name = $4, description = $5, price = $6, sale_price = $7,
			currency = $8, stock = $9, category_id = $10, brand_id = $11, images = $12,
			attributes = $13, variants = $14, meta_title = $15, meta_description = $16,
			status = $17, weight = $18, updated_at = $19
		WHERE id = $1
	`

	_, err := p.pool.Exec(ctx, query,
		prod.ID, prod.SKU, prod.Slug, prod.Name, prod.Description,
		prod.Price, prod.SalePrice, prod.Currency, prod.Stock,
		prod.CategoryID, prod.BrandID, prod.Images, prod.Attributes,
		prod.Variants, prod.MetaTitle, prod.MetaDesc, prod.Status,
		prod.Weight, prod.UpdatedAt,
	)

	return err
}

// DeleteProduct
func (p *Postgres) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	_, err := p.pool.Exec(ctx, "DELETE FROM products WHERE id = $1", id)
	return err
}

// BulkUpsertProducts - pre XML import, optimalizované pre 200k produktov
func (p *Postgres) BulkUpsertProducts(ctx context.Context, products []models.Product) error {
	if len(products) == 0 {
		return nil
	}

	// Batch po 1000 produktov
	batchSize := 1000
	for i := 0; i < len(products); i += batchSize {
		end := i + batchSize
		if end > len(products) {
			end = len(products)
		}
		batch := products[i:end]

		// Prepare batch
		b := &pgx.Batch{}
		for _, prod := range batch {
			if prod.ID == uuid.Nil {
				prod.ID = uuid.New()
			}
			now := time.Now()

			query := `
				INSERT INTO products (
					id, sku, slug, name, description, price, sale_price, currency, stock,
					category_id, brand_id, images, attributes, meta_title, meta_description,
					status, feed_id, external_id, weight, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
				)
				ON CONFLICT (external_id, feed_id) DO UPDATE SET
					sku = EXCLUDED.sku,
					name = EXCLUDED.name,
					description = EXCLUDED.description,
					price = EXCLUDED.price,
					sale_price = EXCLUDED.sale_price,
					stock = EXCLUDED.stock,
					images = EXCLUDED.images,
					attributes = EXCLUDED.attributes,
					updated_at = EXCLUDED.updated_at
			`

			b.Queue(query,
				prod.ID, prod.SKU, prod.Slug, prod.Name, prod.Description,
				prod.Price, prod.SalePrice, prod.Currency, prod.Stock,
				prod.CategoryID, prod.BrandID, prod.Images, prod.Attributes,
				prod.MetaTitle, prod.MetaDesc, prod.Status,
				prod.FeedID, prod.ExternalID, prod.Weight, now, now,
			)
		}

		// Execute batch
		br := p.pool.SendBatch(ctx, b)
		for range batch {
			if _, err := br.Exec(); err != nil {
				br.Close()
				return fmt.Errorf("batch exec: %w", err)
			}
		}
		br.Close()
	}

	return nil
}

// ==================== CATEGORIES ====================

func (p *Postgres) ListCategories(ctx context.Context) ([]models.Category, error) {
	query := `
		SELECT id, parent_id, slug, name, description, image, position, 
			   meta_title, meta_description, product_count, path, created_at, updated_at
		FROM categories 
		ORDER BY position, name
	`

	rows, err := p.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		err := rows.Scan(
			&cat.ID, &cat.ParentID, &cat.Slug, &cat.Name, &cat.Description,
			&cat.Image, &cat.Position, &cat.MetaTitle, &cat.MetaDesc,
			&cat.ProductCount, &cat.Path, &cat.CreatedAt, &cat.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, cat)
	}

	return categories, nil
}

func (p *Postgres) GetCategory(ctx context.Context, slug string) (*models.Category, error) {
	query := `
		SELECT id, parent_id, slug, name, description, image, position, 
			   meta_title, meta_description, product_count, path, created_at, updated_at
		FROM categories 
		WHERE slug = $1
	`

	var cat models.Category
	err := p.pool.QueryRow(ctx, query, slug).Scan(
		&cat.ID, &cat.ParentID, &cat.Slug, &cat.Name, &cat.Description,
		&cat.Image, &cat.Position, &cat.MetaTitle, &cat.MetaDesc,
		&cat.ProductCount, &cat.Path, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get category: %w", err)
	}

	return &cat, nil
}

// ==================== ORDERS ====================

func (p *Postgres) CreateOrder(ctx context.Context, order *models.Order) error {
	order.ID = uuid.New()
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	// Generate order number
	order.OrderNumber = fmt.Sprintf("ORD-%d-%s", time.Now().Unix(), order.ID.String()[:8])

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert order
	query := `
		INSERT INTO orders (
			id, order_number, user_id, status, payment_status, payment_method,
			shipping_method, shipping_price, subtotal, tax, total, currency,
			billing_address, shipping_address, note, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
	`

	billingJSON, _ := json.Marshal(order.BillingAddress)
	shippingJSON, _ := json.Marshal(order.ShippingAddress)

	_, err = tx.Exec(ctx, query,
		order.ID, order.OrderNumber, order.UserID, order.Status, order.PaymentStatus,
		order.PaymentMethod, order.ShippingMethod, order.ShippingPrice,
		order.Subtotal, order.Tax, order.Total, order.Currency,
		billingJSON, shippingJSON, order.Note, order.CreatedAt, order.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert order: %w", err)
	}

	// Insert order items
	for _, item := range order.Items {
		item.ID = uuid.New()
		item.OrderID = order.ID

		itemQuery := `
			INSERT INTO order_items (id, order_id, product_id, variant_id, sku, name, price, quantity, total)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`
		_, err = tx.Exec(ctx, itemQuery,
			item.ID, item.OrderID, item.ProductID, item.VariantID,
			item.SKU, item.Name, item.Price, item.Quantity, item.Total,
		)
		if err != nil {
			return fmt.Errorf("insert order item: %w", err)
		}

		// Decrease stock
		_, err = tx.Exec(ctx, "UPDATE products SET stock = stock - $1 WHERE id = $2", item.Quantity, item.ProductID)
		if err != nil {
			return fmt.Errorf("update stock: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (p *Postgres) GetOrder(ctx context.Context, id uuid.UUID) (*models.Order, error) {
	query := `
		SELECT id, order_number, user_id, status, payment_status, payment_method,
			   shipping_method, shipping_price, subtotal, tax, total, currency,
			   billing_address, shipping_address, note, tracking_number, invoice_number,
			   created_at, updated_at, paid_at, shipped_at
		FROM orders WHERE id = $1
	`

	var order models.Order
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&order.ID, &order.OrderNumber, &order.UserID, &order.Status, &order.PaymentStatus,
		&order.PaymentMethod, &order.ShippingMethod, &order.ShippingPrice,
		&order.Subtotal, &order.Tax, &order.Total, &order.Currency,
		&order.BillingAddress, &order.ShippingAddress, &order.Note,
		&order.TrackingNumber, &order.InvoiceNumber,
		&order.CreatedAt, &order.UpdatedAt, &order.PaidAt, &order.ShippedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}

	// Get items
	itemsQuery := `
		SELECT id, order_id, product_id, variant_id, sku, name, price, quantity, total
		FROM order_items WHERE order_id = $1
	`
	rows, err := p.pool.Query(ctx, itemsQuery, id)
	if err != nil {
		return nil, fmt.Errorf("get order items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item models.OrderItem
		err := rows.Scan(
			&item.ID, &item.OrderID, &item.ProductID, &item.VariantID,
			&item.SKU, &item.Name, &item.Price, &item.Quantity, &item.Total,
		)
		if err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}
		order.Items = append(order.Items, item)
	}

	return &order, nil
}

func (p *Postgres) ListOrders(ctx context.Context, page, limit int) (*models.PaginatedResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders").Scan(&total)

	query := `
		SELECT id, order_number, user_id, status, payment_status, payment_method,
			   shipping_method, total, currency, created_at
		FROM orders 
		ORDER BY created_at DESC 
		LIMIT $1 OFFSET $2
	`

	rows, err := p.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var order models.Order
		err := rows.Scan(
			&order.ID, &order.OrderNumber, &order.UserID, &order.Status,
			&order.PaymentStatus, &order.PaymentMethod, &order.ShippingMethod,
			&order.Total, &order.Currency, &order.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, order)
	}

	return &models.PaginatedResponse{
		Items:      orders,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	}, nil
}

// ==================== CART ====================

func (p *Postgres) CreateCart(ctx context.Context, sessionID string) (*models.Cart, error) {
	cart := &models.Cart{
		ID:        uuid.New(),
		SessionID: sessionID,
		Currency:  "EUR",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}

	query := `
		INSERT INTO carts (id, session_id, currency, created_at, updated_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := p.pool.Exec(ctx, query,
		cart.ID, cart.SessionID, cart.Currency,
		cart.CreatedAt, cart.UpdatedAt, cart.ExpiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create cart: %w", err)
	}

	return cart, nil
}

func (p *Postgres) GetCart(ctx context.Context, id uuid.UUID) (*models.Cart, error) {
	query := `SELECT id, session_id, user_id, currency, created_at, updated_at, expires_at FROM carts WHERE id = $1`

	var cart models.Cart
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&cart.ID, &cart.SessionID, &cart.UserID, &cart.Currency,
		&cart.CreatedAt, &cart.UpdatedAt, &cart.ExpiresAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get cart: %w", err)
	}

	// Get items with products
	itemsQuery := `
		SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity, ci.price,
			   p.name, p.slug, p.images
		FROM cart_items ci
		JOIN products p ON ci.product_id = p.id
		WHERE ci.cart_id = $1
	`
	rows, err := p.pool.Query(ctx, itemsQuery, id)
	if err != nil {
		return nil, fmt.Errorf("get cart items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item models.CartItem
		var prodName, prodSlug string
		var prodImages json.RawMessage

		err := rows.Scan(
			&item.ID, &item.CartID, &item.ProductID, &item.VariantID,
			&item.Quantity, &item.Price, &prodName, &prodSlug, &prodImages,
		)
		if err != nil {
			return nil, fmt.Errorf("scan cart item: %w", err)
		}

		item.Product = &models.Product{
			ID:     item.ProductID,
			Name:   prodName,
			Slug:   prodSlug,
			Images: prodImages,
		}

		cart.Items = append(cart.Items, item)
		cart.Total += item.Price * float64(item.Quantity)
	}

	return &cart, nil
}

// ==================== FILTERS ====================

func (p *Postgres) GetFilterOptions(ctx context.Context, categoryID *uuid.UUID) (*models.FilterOptions, error) {
	var catCondition string
	var args []interface{}

	if categoryID != nil {
		catCondition = "WHERE category_id = $1 OR category_id IN (SELECT id FROM categories WHERE path <@ (SELECT path FROM categories WHERE id = $1))"
		args = append(args, *categoryID)
	} else {
		catCondition = "WHERE status = 'active'"
	}

	filters := &models.FilterOptions{}

	// Price range
	priceQuery := fmt.Sprintf(`
		SELECT COALESCE(MIN(COALESCE(sale_price, price)), 0), COALESCE(MAX(COALESCE(sale_price, price)), 0)
		FROM products %s
	`, catCondition)
	p.pool.QueryRow(context.Background(), priceQuery, args...).Scan(&filters.PriceRange.Min, &filters.PriceRange.Max)

	// Brands
	brandQuery := fmt.Sprintf(`
		SELECT b.id, b.name, COUNT(p.id) as count
		FROM brands b
		JOIN products p ON p.brand_id = b.id
		%s
		GROUP BY b.id, b.name
		ORDER BY count DESC
	`, strings.Replace(catCondition, "WHERE", "AND", 1))
	if catCondition == "WHERE status = 'active'" {
		brandQuery = `
			SELECT b.id, b.name, COUNT(p.id) as count
			FROM brands b
			JOIN products p ON p.brand_id = b.id
			WHERE p.status = 'active'
			GROUP BY b.id, b.name
			ORDER BY count DESC
		`
	}

	rows, _ := p.pool.Query(context.Background(), brandQuery, args...)
	for rows.Next() {
		var bf models.BrandFilter
		rows.Scan(&bf.ID, &bf.Name, &bf.Count)
		filters.Brands = append(filters.Brands, bf)
	}
	rows.Close()

	return filters, nil
}

// ==================== STATS ====================

func (p *Postgres) GetDashboardStats(ctx context.Context) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	// Revenue
	p.pool.QueryRow(ctx, "SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'paid'").Scan(&stats.TotalRevenue)

	today := time.Now().Format("2006-01-02")
	p.pool.QueryRow(ctx, "SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'paid' AND DATE(created_at) = $1", today).Scan(&stats.TodayRevenue)

	// Orders
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders").Scan(&stats.TotalOrders)
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = $1", today).Scan(&stats.TodayOrders)
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders WHERE status = 'pending'").Scan(&stats.PendingOrders)

	// Products
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM products WHERE status = 'active'").Scan(&stats.TotalProducts)
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM products WHERE status = 'active' AND stock < 5").Scan(&stats.LowStockProducts)

	// Customers
	p.pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = 'customer'").Scan(&stats.TotalCustomers)

	return stats, nil
}

// ==================== USERS ====================

func (p *Postgres) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at FROM users WHERE email = $1`

	var user models.User
	err := p.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.Phone, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (p *Postgres) CreateUser(ctx context.Context, user *models.User) error {
	user.ID = uuid.New()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := p.pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.FirstName, user.LastName,
		user.Phone, user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)

	return err
}

// Migrate runs database migrations
func (p *Postgres) Migrate() error {
	// Migration will be run from SQL file
	return nil
}
