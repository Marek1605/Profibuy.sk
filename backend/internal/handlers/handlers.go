package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"megashop/internal/cache"
	"megashop/internal/config"
	"megashop/internal/database"
	"megashop/internal/email"
	"megashop/internal/models"
	"megashop/internal/search"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// ==================== PRODUCTS ====================

// ListProducts handles GET /api/products
func ListProducts(db *database.Postgres, redisCache *cache.Redis, searchEngine *search.Engine) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		filter := parseProductFilter(c)

		// Check cache
		if redisCache != nil {
			cacheKey := fmt.Sprintf("products:list:%v", filter)
			var cached models.PaginatedResponse
			if err := redisCache.Get(ctx, cacheKey, &cached); err == nil && cached.Total > 0 {
				c.JSON(http.StatusOK, cached)
				return
			}
		}

		result, err := db.ListProducts(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Cache result
		if redisCache != nil {
			cacheKey := fmt.Sprintf("products:list:%v", filter)
			redisCache.Set(ctx, cacheKey, result, cache.TTLProductList)
		}

		c.JSON(http.StatusOK, result)
	}
}

// GetProduct handles GET /api/products/:id
func GetProduct(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		// Check cache
		if redisCache != nil {
			cacheKey := fmt.Sprintf(cache.KeyProduct, id.String())
			var cached models.Product
			if err := redisCache.Get(ctx, cacheKey, &cached); err == nil && cached.ID != uuid.Nil {
				c.JSON(http.StatusOK, cached)
				return
			}
		}

		product, err := db.GetProduct(ctx, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if product == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		// Cache
		if redisCache != nil {
			cacheKey := fmt.Sprintf(cache.KeyProduct, id.String())
			redisCache.Set(ctx, cacheKey, product, cache.TTLProduct)
		}

		c.JSON(http.StatusOK, product)
	}
}

// GetProductBySlug handles GET /api/products/slug/:slug
func GetProductBySlug(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		slug := c.Param("slug")

		// Check cache
		if redisCache != nil {
			cacheKey := fmt.Sprintf(cache.KeyProductSlug, slug)
			var cached models.Product
			if err := redisCache.Get(ctx, cacheKey, &cached); err == nil && cached.ID != uuid.Nil {
				c.JSON(http.StatusOK, cached)
				return
			}
		}

		product, err := db.GetProductBySlug(ctx, slug)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if product == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		// Cache
		if redisCache != nil {
			cacheKey := fmt.Sprintf(cache.KeyProductSlug, slug)
			redisCache.Set(ctx, cacheKey, product, cache.TTLProduct)
		}

		c.JSON(http.StatusOK, product)
	}
}

// SearchProducts handles GET /api/products/search
func SearchProducts(db *database.Postgres, searchEngine *search.Engine) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Search query required"})
			return
		}

		filter := parseProductFilter(c)
		result, err := searchEngine.Search(ctx, query, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// CreateProduct handles POST /api/admin/products
func CreateProduct(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var product models.Product
		if err := c.ShouldBindJSON(&product); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Generate slug if not provided
		if product.Slug == "" {
			product.Slug = generateSlug(product.Name)
		}

		if err := db.CreateProduct(ctx, &product); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.InvalidateProductLists(ctx)
		}

		c.JSON(http.StatusCreated, product)
	}
}

// UpdateProduct handles PUT /api/admin/products/:id
func UpdateProduct(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		var product models.Product
		if err := c.ShouldBindJSON(&product); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		product.ID = id
		if err := db.UpdateProduct(ctx, &product); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.InvalidateProduct(ctx, id.String())
			redisCache.InvalidateProductLists(ctx)
		}

		c.JSON(http.StatusOK, product)
	}
}

// DeleteProduct handles DELETE /api/admin/products/:id
func DeleteProduct(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
			return
		}

		if err := db.DeleteProduct(ctx, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.InvalidateProduct(ctx, id.String())
			redisCache.InvalidateProductLists(ctx)
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteAllProducts handles DELETE /api/admin/products/delete-all
func DeleteAllProducts(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Delete all products
		count, err := db.DeleteAllProducts(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		// Also unlink all supplier products
		db.UnlinkAllSupplierProducts(ctx)

		// Invalidate cache
		if redisCache != nil {
			redisCache.InvalidateProductLists(ctx)
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "deleted": count})
	}
}

// BulkUpdateProducts handles POST /api/admin/products/bulk
func BulkUpdateProducts(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var request struct {
			Action     string      `json:"action"` // update, delete, activate, deactivate
			ProductIDs []uuid.UUID `json:"product_ids"`
			Data       interface{} `json:"data,omitempty"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		switch request.Action {
		case "delete":
			for _, id := range request.ProductIDs {
				db.DeleteProduct(ctx, id)
			}
		case "activate":
			for _, id := range request.ProductIDs {
				db.Pool().Exec(ctx, "UPDATE products SET status = 'active' WHERE id = $1", id)
			}
		case "deactivate":
			for _, id := range request.ProductIDs {
				db.Pool().Exec(ctx, "UPDATE products SET status = 'draft' WHERE id = $1", id)
			}
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.InvalidateProductLists(ctx)
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "affected": len(request.ProductIDs)})
	}
}

// ImportProducts handles POST /api/admin/products/import (CSV/JSON)
func ImportProducts(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var products []models.Product
		if err := c.ShouldBindJSON(&products); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := db.BulkUpsertProducts(ctx, products); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.InvalidateProductLists(ctx)
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "imported": len(products)})
	}
}

// ==================== CATEGORIES ====================

// ListCategories handles GET /api/categories
func ListCategories(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Check cache
		if redisCache != nil {
			var cached []models.Category
			if err := redisCache.Get(ctx, cache.KeyCategories, &cached); err == nil && len(cached) > 0 {
				c.JSON(http.StatusOK, cached)
				return
			}
		}

		categories, err := db.ListCategories(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Build tree structure
		tree := buildCategoryTree(categories)

		// Cache
		if redisCache != nil {
			redisCache.Set(ctx, cache.KeyCategories, tree, cache.TTLCategory)
		}

		c.JSON(http.StatusOK, tree)
	}
}

// GetCategory handles GET /api/categories/:slug
func GetCategory(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		slug := c.Param("slug")

		category, err := db.GetCategory(ctx, slug)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if category == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
			return
		}

		// Load children for this category
		allCats, _ := db.ListCategories(ctx)
		category.Children = []models.Category{}
		for _, cat := range allCats {
			if cat.ParentID != nil && *cat.ParentID == category.ID {
				cat.Children = []models.Category{}
				// Also load grandchildren
				for _, gc := range allCats {
					if gc.ParentID != nil && *gc.ParentID == cat.ID {
						gc.Children = []models.Category{}
						cat.Children = append(cat.Children, gc)
					}
				}
				category.Children = append(category.Children, cat)
			}
		}

		c.JSON(http.StatusOK, category)
	}
}

// GetCategoryProducts handles GET /api/categories/:slug/products
func GetCategoryProducts(db *database.Postgres, redisCache *cache.Redis, searchEngine *search.Engine) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		slug := c.Param("slug")

		// Get category
		category, err := db.GetCategory(ctx, slug)
		if err != nil || category == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
			return
		}

		// Load children for this category
		allCats, _ := db.ListCategories(ctx)
		category.Children = []models.Category{}
		for _, cat := range allCats {
			if cat.ParentID != nil && *cat.ParentID == category.ID {
				cat.Children = []models.Category{}
				category.Children = append(category.Children, cat)
			}
		}

		// Get products - include products from child categories too
		filter := parseProductFilter(c)
		filter.CategoryID = &category.ID

		result, err := db.ListProducts(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"category": category,
			"products": result,
		})
	}
}

// CreateCategory handles POST /api/admin/categories
func CreateCategory(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var category models.Category
		if err := c.ShouldBindJSON(&category); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		category.ID = uuid.New()
		category.CreatedAt = time.Now()
		category.UpdatedAt = time.Now()

		if category.Slug == "" {
			category.Slug = generateSlug(category.Name)
		}

		query := `
			INSERT INTO categories (id, parent_id, slug, name, description, image, position, meta_title, meta_description, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`
		_, err := db.Pool().Exec(ctx, query,
			category.ID, category.ParentID, category.Slug, category.Name, category.Description,
			category.Image, category.Position, category.MetaTitle, category.MetaDesc,
			category.CreatedAt, category.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.Delete(ctx, cache.KeyCategories)
		}

		c.JSON(http.StatusCreated, category)
	}
}

// UpdateCategory handles PUT /api/admin/categories/:id
func UpdateCategory(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, _ := uuid.Parse(c.Param("id"))

		// Parse input as map to support partial updates
		var input map[string]interface{}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Build dynamic UPDATE query from provided fields
		var setClauses []string
		var args []interface{}
		argNum := 1

		// ID is always $1
		args = append(args, id)
		argNum++

		fieldMap := map[string]string{
			"name": "name", "slug": "slug", "description": "description",
			"image": "image", "position": "position", "parent_id": "parent_id",
			"meta_title": "meta_title", "meta_description": "meta_description",
		}

		for jsonField, dbField := range fieldMap {
			if val, ok := input[jsonField]; ok {
				setClauses = append(setClauses, fmt.Sprintf("%s = $%d", dbField, argNum))
				args = append(args, val)
				argNum++
			}
		}

		setClauses = append(setClauses, "updated_at = NOW()")

		if len(setClauses) == 1 {
			// Only updated_at, nothing to do
			c.JSON(http.StatusOK, gin.H{"success": true})
			return
		}

		query := fmt.Sprintf("UPDATE categories SET %s WHERE id = $1", strings.Join(setClauses, ", "))
		_, err := db.Pool().Exec(ctx, query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.Delete(ctx, cache.KeyCategories)
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeleteCategory handles DELETE /api/admin/categories/:id
func DeleteCategory(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, _ := uuid.Parse(c.Param("id"))

		_, err := db.Pool().Exec(ctx, "DELETE FROM categories WHERE id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.Delete(ctx, cache.KeyCategories)
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// AutoAssignCategoryThumbnails handles POST /api/admin/categories/auto-thumbnails
// For each category that has no image, finds a product in that category and uses its first image
func AutoAssignCategoryThumbnails(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Get all categories without an image (or empty image)
		rows, err := db.Pool().Query(ctx, `
			SELECT c.id, c.name
			FROM categories c
			WHERE c.image IS NULL OR c.image = ''
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type catInfo struct {
			ID   uuid.UUID
			Name string
		}
		var catsWithoutImage []catInfo
		for rows.Next() {
			var ci catInfo
			rows.Scan(&ci.ID, &ci.Name)
			catsWithoutImage = append(catsWithoutImage, ci)
		}

		if len(catsWithoutImage) == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "Všetky kategórie už majú obrázok",
				"updated": 0,
			})
			return
		}

		updated := 0
		skipped := 0

		for _, cat := range catsWithoutImage {
			// Try to find a product in this category that has images
			// First: direct products in this category
			// Then: products in child categories (recursive via ltree or parent_id)
			var imageJSON json.RawMessage
			err := db.Pool().QueryRow(ctx, `
				SELECT p.images
				FROM products p
				WHERE p.category_id = $1
				  AND p.images IS NOT NULL
				  AND p.images != '[]'::jsonb
				  AND p.images != 'null'::jsonb
				  AND jsonb_array_length(p.images) > 0
				  AND p.status = 'active'
				ORDER BY p.stock DESC, p.created_at DESC
				LIMIT 1
			`, cat.ID).Scan(&imageJSON)

			if err != nil {
				// Try child categories
				err = db.Pool().QueryRow(ctx, `
					SELECT p.images
					FROM products p
					JOIN categories child ON p.category_id = child.id
					WHERE child.parent_id = $1
					  AND p.images IS NOT NULL
					  AND p.images != '[]'::jsonb
					  AND p.images != 'null'::jsonb
					  AND jsonb_array_length(p.images) > 0
					  AND p.status = 'active'
					ORDER BY p.stock DESC, p.created_at DESC
					LIMIT 1
				`, cat.ID).Scan(&imageJSON)
			}

			if err != nil {
				skipped++
				continue
			}

			// Parse image array to get first image URL
			var images []struct {
				URL       string `json:"url"`
				IsPrimary bool   `json:"is_primary"`
				IsMain    bool   `json:"is_main"`
			}
			if jsonErr := json.Unmarshal(imageJSON, &images); jsonErr != nil || len(images) == 0 {
				skipped++
				continue
			}

			// Prefer primary/main image
			imageURL := images[0].URL
			for _, img := range images {
				if img.IsPrimary || img.IsMain {
					imageURL = img.URL
					break
				}
			}

			if imageURL == "" {
				skipped++
				continue
			}

			// Update category image
			_, err = db.Pool().Exec(ctx,
				"UPDATE categories SET image = $1, updated_at = NOW() WHERE id = $2",
				imageURL, cat.ID,
			)
			if err == nil {
				updated++
			}
		}

		// Invalidate cache
		if redisCache != nil {
			redisCache.Delete(ctx, cache.KeyCategories)
		}

		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"updated":  updated,
			"skipped":  skipped,
			"total":    len(catsWithoutImage),
			"message":  fmt.Sprintf("Aktualizovaných %d kategórií, %d preskočených (bez produktov s obrázkami)", updated, skipped),
		})
	}
}

// ==================== FILTERS ====================

// GetFilters handles GET /api/filters
func GetFilters(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		filters, err := db.GetFilterOptions(ctx, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, filters)
	}
}

// GetCategoryFilters handles GET /api/filters/:category
func GetCategoryFilters(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Get category by slug
		category, err := db.GetCategory(ctx, c.Param("category"))
		if err != nil || category == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
			return
		}

		filters, err := db.GetFilterOptions(ctx, &category.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, filters)
	}
}

// ==================== CART ====================

// CreateCart handles POST /api/cart
func CreateCart(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var req struct {
			SessionID string `json:"session_id"`
		}
		c.ShouldBindJSON(&req)

		if req.SessionID == "" {
			req.SessionID = uuid.New().String()
		}

		cart, err := db.CreateCart(ctx, req.SessionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, cart)
	}
}

// GetCart handles GET /api/cart/:id
func GetCart(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cart ID"})
			return
		}

		cart, err := db.GetCart(ctx, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if cart == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Cart not found"})
			return
		}

		c.JSON(http.StatusOK, cart)
	}
}

// AddToCart handles POST /api/cart/:id/items
func AddToCart(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		cartID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cart ID"})
			return
		}

		var item struct {
			ProductID uuid.UUID  `json:"product_id"`
			VariantID *uuid.UUID `json:"variant_id"`
			Quantity  int        `json:"quantity"`
		}
		if err := c.ShouldBindJSON(&item); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get product price
		product, err := db.GetProduct(ctx, item.ProductID)
		if err != nil || product == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		price := product.Price
		if product.SalePrice != nil {
			price = *product.SalePrice
		}

		// Insert cart item
		itemID := uuid.New()
		query := `
			INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, price)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (cart_id, product_id, variant_id) DO UPDATE SET
				quantity = cart_items.quantity + EXCLUDED.quantity,
				price = EXCLUDED.price
		`
		_, err = db.Pool().Exec(ctx, query, itemID, cartID, item.ProductID, item.VariantID, item.Quantity, price)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Update cart timestamp
		db.Pool().Exec(ctx, "UPDATE carts SET updated_at = $1 WHERE id = $2", time.Now(), cartID)

		// Return updated cart
		cart, _ := db.GetCart(ctx, cartID)
		c.JSON(http.StatusOK, cart)
	}
}

// UpdateCartItem handles PUT /api/cart/:id/items/:itemId
func UpdateCartItem(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		cartID, _ := uuid.Parse(c.Param("id"))
		itemID, _ := uuid.Parse(c.Param("itemId"))

		var req struct {
			Quantity int `json:"quantity"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.Quantity <= 0 {
			// Remove item
			db.Pool().Exec(ctx, "DELETE FROM cart_items WHERE id = $1 AND cart_id = $2", itemID, cartID)
		} else {
			// Update quantity
			db.Pool().Exec(ctx, "UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3", req.Quantity, itemID, cartID)
		}

		// Update cart timestamp
		db.Pool().Exec(ctx, "UPDATE carts SET updated_at = $1 WHERE id = $2", time.Now(), cartID)

		// Return updated cart
		cart, _ := db.GetCart(ctx, cartID)
		c.JSON(http.StatusOK, cart)
	}
}

// RemoveFromCart handles DELETE /api/cart/:id/items/:itemId
func RemoveFromCart(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		cartID, _ := uuid.Parse(c.Param("id"))
		itemID, _ := uuid.Parse(c.Param("itemId"))

		db.Pool().Exec(ctx, "DELETE FROM cart_items WHERE id = $1 AND cart_id = $2", itemID, cartID)
		db.Pool().Exec(ctx, "UPDATE carts SET updated_at = $1 WHERE id = $2", time.Now(), cartID)

		cart, _ := db.GetCart(ctx, cartID)
		c.JSON(http.StatusOK, cart)
	}
}

// ==================== ORDERS ====================

// CreateOrder handles POST /api/orders
func CreateOrder(db *database.Postgres, cfg *config.Config, emailSvc *email.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var req struct {
			// Support both modes: cart_id based or direct items
			CartID          *uuid.UUID      `json:"cart_id,omitempty"`
			Items           []OrderItemReq  `json:"items,omitempty"`
			PaymentMethod   string          `json:"payment_method"`
			ShippingMethod  string          `json:"shipping_method"`
			BillingAddress  models.Address  `json:"billing_address"`
			ShippingAddress models.Address  `json:"shipping_address"`
			Note            string          `json:"note"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var orderItems []models.OrderItem
		var subtotal float64

		if req.CartID != nil {
			// Cart-based order (original flow)
			cart, err := db.GetCart(ctx, *req.CartID)
			if err != nil || cart == nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Cart not found"})
				return
			}
			if len(cart.Items) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Cart is empty"})
				return
			}
			subtotal = cart.Total
			for _, item := range cart.Items {
				orderItems = append(orderItems, models.OrderItem{
					ProductID: item.ProductID,
					VariantID: item.VariantID,
					SKU:       item.Product.SKU,
					Name:      item.Product.Name,
					Price:     item.Price,
					Quantity:  item.Quantity,
					Total:     item.Price * float64(item.Quantity),
				})
			}
		} else if len(req.Items) > 0 {
			// Direct items order (from frontend checkout)
			for _, item := range req.Items {
				productID, err := uuid.Parse(item.ProductID)
				if err != nil {
					continue
				}
				// Fetch product to get name/SKU
				product, err := db.GetProduct(ctx, productID)
				name := ""
				sku := ""
				price := item.Price
				if err == nil && product != nil {
					name = product.Name
					sku = product.SKU
					// Use DB price for security
					if product.SalePrice != nil && *product.SalePrice > 0 {
						price = *product.SalePrice
					} else {
						price = product.Price
					}
				}

				itemTotal := price * float64(item.Quantity)
				subtotal += itemTotal

				orderItems = append(orderItems, models.OrderItem{
					ProductID: productID,
					SKU:       sku,
					Name:      name,
					Price:     price,
					Quantity:  item.Quantity,
					Total:     itemTotal,
				})
			}
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No items provided"})
			return
		}

		if len(orderItems) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No valid items"})
			return
		}

		// Determine shipping price from method
		shippingPrice := getShippingPrice(req.ShippingMethod, subtotal)
		paymentFee := getPaymentFee(req.PaymentMethod)
		tax := subtotal * 0.20 // 20% DPH
		total := subtotal + shippingPrice + paymentFee + tax

		// Create order
		billingJSON, _ := json.Marshal(req.BillingAddress)
		shippingJSON, _ := json.Marshal(req.ShippingAddress)

		order := &models.Order{
			Status:          "pending",
			PaymentStatus:   "pending",
			PaymentMethod:   req.PaymentMethod,
			ShippingMethod:  req.ShippingMethod,
			ShippingPrice:   shippingPrice,
			Subtotal:        subtotal,
			Tax:             tax,
			Total:           total,
			Currency:        "EUR",
			BillingAddress:  billingJSON,
			ShippingAddress: shippingJSON,
			Note:            req.Note,
			Items:           orderItems,
		}

		if err := db.CreateOrder(ctx, order); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Clear cart if cart_id was provided
		if req.CartID != nil {
			db.Pool().Exec(ctx, "DELETE FROM cart_items WHERE cart_id = $1", req.CartID)
		}

		// Send confirmation email asynchronously
		go func() {
			if err := emailSvc.SendOrderConfirmation(order); err != nil {
				log.Printf("[ORDER] Failed to send confirmation email for #%s: %v", order.OrderNumber, err)
			}
		}()

		c.JSON(http.StatusCreated, order)
	}
}

// OrderItemReq is the request structure for direct item orders
type OrderItemReq struct {
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

// getShippingPrice returns shipping price based on method and order subtotal
func getShippingPrice(method string, subtotal float64) float64 {
	freeFrom := 50.0
	if subtotal >= freeFrom {
		return 0
	}
	prices := map[string]float64{
		"packeta": 2.99,
		"dpd":     4.49,
		"gls":     3.99,
		"posta":   2.49,
	}
	if p, ok := prices[method]; ok {
		return p
	}
	return 4.99
}

// getPaymentFee returns fee for payment method
func getPaymentFee(method string) float64 {
	if method == "cod" {
		return 1.50
	}
	return 0
}

// GetOrder handles GET /api/orders/:id
func GetOrder(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
			return
		}

		order, err := db.GetOrder(ctx, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if order == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}

		c.JSON(http.StatusOK, order)
	}
}

// TrackOrder handles GET /api/orders/track/:number
func TrackOrder(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		orderNumber := c.Param("number")

		var order models.Order
		err := db.Pool().QueryRow(ctx, `
			SELECT id, order_number, status, tracking_number, created_at, shipped_at
			FROM orders WHERE order_number = $1
		`, orderNumber).Scan(&order.ID, &order.OrderNumber, &order.Status, &order.TrackingNumber, &order.CreatedAt, &order.ShippedAt)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}

		c.JSON(http.StatusOK, order)
	}
}

// ListOrders handles GET /api/admin/orders
func ListOrders(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := db.ListOrders(ctx, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// UpdateOrderStatus handles PUT /api/admin/orders/:id/status
func UpdateOrderStatus(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, _ := uuid.Parse(c.Param("id"))

		var req struct {
			Status         string `json:"status"`
			TrackingNumber string `json:"tracking_number"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		query := `UPDATE orders SET status = $1, tracking_number = $2, updated_at = $3 WHERE id = $4`
		if req.Status == "shipped" {
			query = `UPDATE orders SET status = $1, tracking_number = $2, updated_at = $3, shipped_at = $3 WHERE id = $4`
		}

		_, err := db.Pool().Exec(ctx, query, req.Status, req.TrackingNumber, time.Now(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		order, _ := db.GetOrder(ctx, id)
		c.JSON(http.StatusOK, order)
	}
}

// GenerateInvoice handles POST /api/admin/orders/:id/invoice
func GenerateInvoice(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Generate PDF invoice
		c.JSON(http.StatusOK, gin.H{"message": "Invoice generated"})
	}
}

// ==================== AUTH ====================

// Login handles POST /api/auth/login
func Login(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		user, err := db.GetUserByEmail(ctx, req.Email)
		if err != nil || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// Generate JWT
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":   user.ID.String(),
			"email": user.Email,
			"role":  user.Role,
			"exp":   time.Now().Add(24 * time.Hour).Unix(),
		})

		tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": tokenString,
			"user":  user,
		})
	}
}

// Register handles POST /api/auth/register
func Register(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var req struct {
			Email     string `json:"email"`
			Password  string `json:"password"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if user exists
		existing, _ := db.GetUserByEmail(ctx, req.Email)
		if existing != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
			return
		}

		// Hash password
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		user := &models.User{
			Email:        req.Email,
			PasswordHash: string(hash),
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			Role:         "customer",
			IsActive:     true,
		}

		if err := db.CreateUser(ctx, user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Generate JWT
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":   user.ID.String(),
			"email": user.Email,
			"role":  user.Role,
			"exp":   time.Now().Add(24 * time.Hour).Unix(),
		})

		tokenString, _ := token.SignedString([]byte(cfg.JWTSecret))

		c.JSON(http.StatusCreated, gin.H{
			"token": tokenString,
			"user":  user,
		})
	}
}

// RefreshToken handles POST /api/auth/refresh
func RefreshToken(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement token refresh
		c.JSON(http.StatusOK, gin.H{"message": "Token refreshed"})
	}
}

// ==================== DASHBOARD ====================

// GetDashboard handles GET /api/admin/dashboard
func GetDashboard(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		stats, err := db.GetDashboardStats(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}

// GetStats handles GET /api/admin/stats
func GetStats(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		stats, err := db.GetDashboardStats(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}

// ==================== SETTINGS ====================

// GetSettings handles GET /api/admin/settings
func GetSettings(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		rows, err := db.Pool().Query(ctx, "SELECT key, value, \"group\" FROM settings")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		settings := make(map[string]interface{})
		for rows.Next() {
			var key, group string
			var value json.RawMessage
			rows.Scan(&key, &value, &group)

			if _, ok := settings[group]; !ok {
				settings[group] = make(map[string]interface{})
			}
			settings[group].(map[string]interface{})[key] = value
		}

		c.JSON(http.StatusOK, settings)
	}
}

// UpdateSettings handles PUT /api/admin/settings
func UpdateSettings(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var settings map[string]interface{}
		if err := c.ShouldBindJSON(&settings); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		for key, value := range settings {
			valueJSON, _ := json.Marshal(value)
			db.Pool().Exec(ctx, `
				INSERT INTO settings (id, key, value) VALUES ($1, $2, $3)
				ON CONFLICT (key) DO UPDATE SET value = $3
			`, uuid.New(), key, valueJSON)
		}

		// Clear settings cache
		if redisCache != nil {
			redisCache.DeletePattern(ctx, "settings:*")
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ==================== FEEDS ====================

// CreateFeed handles POST /api/admin/feeds
func CreateFeed(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var feed models.Feed
		if err := c.ShouldBindJSON(&feed); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		feed.ID = uuid.New()
		feed.CreatedAt = time.Now()
		feed.IsActive = true

		query := `
			INSERT INTO feeds (id, name, url, type, mapping, schedule, is_active, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		_, err := db.Pool().Exec(ctx, query,
			feed.ID, feed.Name, feed.URL, feed.Type, feed.Mapping, feed.Schedule, feed.IsActive, feed.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, feed)
	}
}

// ListFeeds handles GET /api/admin/feeds
func ListFeeds(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		rows, err := db.Pool().Query(ctx, `
			SELECT id, name, url, type, schedule, is_active, last_run_at, last_status, product_count, created_at
			FROM feeds ORDER BY created_at DESC
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var feeds []models.Feed
		for rows.Next() {
			var feed models.Feed
			rows.Scan(&feed.ID, &feed.Name, &feed.URL, &feed.Type, &feed.Schedule,
				&feed.IsActive, &feed.LastRunAt, &feed.LastStatus, &feed.ProductCount, &feed.CreatedAt)
			feeds = append(feeds, feed)
		}

		c.JSON(http.StatusOK, feeds)
	}
}

// RunFeedImport handles POST /api/admin/feeds/:id/run
func RunFeedImport(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Trigger async feed import
		c.JSON(http.StatusOK, gin.H{"message": "Feed import started"})
	}
}

// DeleteFeed handles DELETE /api/admin/feeds/:id
func DeleteFeed(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, _ := uuid.Parse(c.Param("id"))

		_, err := db.Pool().Exec(ctx, "DELETE FROM feeds WHERE id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ==================== SHIPPING ====================

// GetShippingMethods handles GET /api/shipping/methods
func GetShippingMethods(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		rows, err := db.Pool().Query(ctx, `
			SELECT id, code, name, description, price, free_from, is_active
			FROM shipping_methods WHERE is_active = true ORDER BY price
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var methods []models.ShippingMethod
		for rows.Next() {
			var m models.ShippingMethod
			rows.Scan(&m.ID, &m.Code, &m.Name, &m.Description, &m.Price, &m.FreeFrom, &m.IsActive)
			methods = append(methods, m)
		}

		c.JSON(http.StatusOK, methods)
	}
}

// GetPacketaPoints handles POST /api/shipping/packeta/points
func GetPacketaPoints(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Call Packeta API
		c.JSON(http.StatusOK, gin.H{"points": []interface{}{}})
	}
}

// ==================== PAYMENTS ====================

// InitComgatePayment handles POST /api/payments/comgate/init
func InitComgatePayment(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Initialize Comgate payment
		c.JSON(http.StatusOK, gin.H{"redirect_url": ""})
	}
}

// ComgateCallback handles POST /api/payments/comgate/callback
func ComgateCallback(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Handle Comgate callback
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// InitGoPayPayment handles POST /api/payments/gopay/init
func InitGoPayPayment(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Initialize GoPay payment
		c.JSON(http.StatusOK, gin.H{"redirect_url": ""})
	}
}

// GoPayCallback handles POST /api/payments/gopay/callback
func GoPayCallback(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Handle GoPay callback
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ==================== CACHE ====================

// ClearCache handles POST /api/admin/cache/clear
func ClearCache(redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		if redisCache == nil {
			c.JSON(http.StatusOK, gin.H{"message": "No cache configured"})
			return
		}

		ctx := c.Request.Context()
		if err := redisCache.InvalidateAll(ctx); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// WarmupCache handles POST /api/admin/cache/warmup
func WarmupCache(db *database.Postgres, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Pre-warm cache with popular products/categories
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ==================== HELPERS ====================

func parseProductFilter(c *gin.Context) models.ProductFilter {
	filter := models.ProductFilter{
		Page:  1,
		Limit: 24,
	}

	if page, err := strconv.Atoi(c.Query("page")); err == nil && page > 0 {
		filter.Page = page
	}
	if limit, err := strconv.Atoi(c.Query("limit")); err == nil && limit > 0 && limit <= 100 {
		filter.Limit = limit
	}

	if catID := c.Query("category"); catID != "" {
		if id, err := uuid.Parse(catID); err == nil {
			filter.CategoryID = &id
		}
	}

	if brands := c.Query("brands"); brands != "" {
		for _, b := range strings.Split(brands, ",") {
			if id, err := uuid.Parse(b); err == nil {
				filter.BrandIDs = append(filter.BrandIDs, id)
			}
		}
	}

	if min := c.Query("price_min"); min != "" {
		if v, err := strconv.ParseFloat(min, 64); err == nil {
			filter.PriceMin = &v
		}
	}
	if max := c.Query("price_max"); max != "" {
		if v, err := strconv.ParseFloat(max, 64); err == nil {
			filter.PriceMax = &v
		}
	}

	if c.Query("in_stock") == "true" {
		inStock := true
		filter.InStock = &inStock
	}
	if c.Query("on_sale") == "true" {
		onSale := true
		filter.OnSale = &onSale
	}

	filter.Sort = c.DefaultQuery("sort", "newest")
	filter.Search = c.Query("q")

	return filter
}

func buildCategoryTree(categories []models.Category) []models.Category {
	// Create map with pointers
	categoryMap := make(map[uuid.UUID]*models.Category)
	for i := range categories {
		categories[i].Children = []models.Category{}
		categoryMap[categories[i].ID] = &categories[i]
	}

	// Build parent-child relationships
	var roots []models.Category
	for i := range categories {
		if categories[i].ParentID == nil {
			roots = append(roots, categories[i])
		} else if parent, ok := categoryMap[*categories[i].ParentID]; ok {
			parent.Children = append(parent.Children, categories[i])
		} else {
			// Parent not found, treat as root
			roots = append(roots, categories[i])
		}
	}

	// Re-read roots from map to get updated children
	var result []models.Category
	for i := range categories {
		if categories[i].ParentID == nil {
			if cat, ok := categoryMap[categories[i].ID]; ok {
				result = append(result, *cat)
			}
		} else if _, ok := categoryMap[*categories[i].ParentID]; !ok {
			if cat, ok := categoryMap[categories[i].ID]; ok {
				result = append(result, *cat)
			}
		}
	}

	if result == nil {
		return []models.Category{}
	}
	return result
}

func generateSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "á", "a")
	slug = strings.ReplaceAll(slug, "é", "e")
	slug = strings.ReplaceAll(slug, "í", "i")
	slug = strings.ReplaceAll(slug, "ó", "o")
	slug = strings.ReplaceAll(slug, "ú", "u")
	slug = strings.ReplaceAll(slug, "ý", "y")
	slug = strings.ReplaceAll(slug, "č", "c")
	slug = strings.ReplaceAll(slug, "ď", "d")
	slug = strings.ReplaceAll(slug, "ľ", "l")
	slug = strings.ReplaceAll(slug, "ň", "n")
	slug = strings.ReplaceAll(slug, "ŕ", "r")
	slug = strings.ReplaceAll(slug, "š", "s")
	slug = strings.ReplaceAll(slug, "ť", "t")
	slug = strings.ReplaceAll(slug, "ž", "z")
	return slug
}
