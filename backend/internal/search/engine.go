package search

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"megashop/internal/cache"
	"megashop/internal/database"
	"megashop/internal/models"
)

type Engine struct {
	db    *database.Postgres
	cache *cache.Redis
}

func NewEngine(db *database.Postgres, cache *cache.Redis) *Engine {
	return &Engine{db: db, cache: cache}
}

// Search performs full-text search on products
func (e *Engine) Search(ctx context.Context, query string, filter models.ProductFilter) (*models.PaginatedResponse, error) {
	// Set search query in filter
	filter.Search = query

	// Generate cache key
	cacheKey := e.generateCacheKey(filter)

	// Check cache
	if e.cache != nil {
		var cached models.PaginatedResponse
		if err := e.cache.Get(ctx, cacheKey, &cached); err == nil && cached.Total > 0 {
			return &cached, nil
		}
	}

	// Search in database
	result, err := e.db.ListProducts(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("search products: %w", err)
	}

	// Cache result
	if e.cache != nil && result.Total > 0 {
		e.cache.Set(ctx, cacheKey, result, cache.TTLProductList)
	}

	return result, nil
}

// Autocomplete returns suggestions for search
func (e *Engine) Autocomplete(ctx context.Context, query string, limit int) ([]string, error) {
	if len(query) < 2 {
		return nil, nil
	}

	if limit <= 0 || limit > 20 {
		limit = 10
	}

	// Search for product names matching prefix
	sql := `
		SELECT DISTINCT name 
		FROM products 
		WHERE status = 'active' 
		AND name ILIKE $1 
		ORDER BY name 
		LIMIT $2
	`

	rows, err := e.db.Pool().Query(ctx, sql, query+"%", limit)
	if err != nil {
		return nil, fmt.Errorf("autocomplete query: %w", err)
	}
	defer rows.Close()

	var suggestions []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		suggestions = append(suggestions, name)
	}

	return suggestions, nil
}

// ReindexProduct updates search vector for a product
func (e *Engine) ReindexProduct(ctx context.Context, productID string) error {
	sql := `
		UPDATE products 
		SET search_vector = 
			setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
			setweight(to_tsvector('simple', COALESCE(sku, '')), 'A') ||
			setweight(to_tsvector('simple', COALESCE(description, '')), 'B') ||
			setweight(to_tsvector('simple', COALESCE(
				(SELECT string_agg(value::text, ' ') FROM jsonb_array_elements(attributes) AS attr, jsonb_each_text(attr) AS kv(key, value)),
				''
			)), 'C')
		WHERE id = $1
	`

	_, err := e.db.Pool().Exec(ctx, sql, productID)
	return err
}

// ReindexAll reindexes all products
func (e *Engine) ReindexAll(ctx context.Context) error {
	sql := `
		UPDATE products 
		SET search_vector = 
			setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
			setweight(to_tsvector('simple', COALESCE(sku, '')), 'A') ||
			setweight(to_tsvector('simple', COALESCE(description, '')), 'B')
	`

	_, err := e.db.Pool().Exec(ctx, sql)
	return err
}

// GetRelatedProducts returns products related to given product
func (e *Engine) GetRelatedProducts(ctx context.Context, productID string, limit int) ([]models.Product, error) {
	if limit <= 0 || limit > 20 {
		limit = 8
	}

	// Get related products based on category and similar attributes
	sql := `
		WITH target AS (
			SELECT category_id, brand_id, search_vector
			FROM products WHERE id = $1
		)
		SELECT p.id, p.sku, p.slug, p.name, p.price, p.sale_price, p.currency, p.stock, p.images
		FROM products p, target t
		WHERE p.id != $1
		AND p.status = 'active'
		AND (p.category_id = t.category_id OR p.brand_id = t.brand_id)
		ORDER BY 
			CASE WHEN p.category_id = t.category_id AND p.brand_id = t.brand_id THEN 1
				 WHEN p.category_id = t.category_id THEN 2
				 ELSE 3 END,
			ts_rank(p.search_vector, t.search_vector) DESC
		LIMIT $2
	`

	rows, err := e.db.Pool().Query(ctx, sql, productID, limit)
	if err != nil {
		return nil, fmt.Errorf("get related products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.SKU, &p.Slug, &p.Name, &p.Price, &p.SalePrice, &p.Currency, &p.Stock, &p.Images)
		if err != nil {
			continue
		}
		products = append(products, p)
	}

	return products, nil
}

// generateCacheKey creates a unique cache key for a filter
func (e *Engine) generateCacheKey(filter models.ProductFilter) string {
	data, _ := json.Marshal(filter)
	hash := md5.Sum(data)
	return fmt.Sprintf(cache.KeyProductList, hex.EncodeToString(hash[:]))
}

// ParseSearchQuery parses and normalizes a search query
func ParseSearchQuery(query string) string {
	// Remove extra spaces
	query = strings.TrimSpace(query)
	query = strings.Join(strings.Fields(query), " ")

	// Remove special characters that could break search
	replacer := strings.NewReplacer(
		"'", "",
		"\"", "",
		";", "",
		"--", "",
	)
	query = replacer.Replace(query)

	return query
}
