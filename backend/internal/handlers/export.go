package handlers

import (
	"log"
	"net/http"
	"time"

	"megashop/internal/cache"
	"megashop/internal/config"
	"megashop/internal/database"
	"megashop/internal/export"

	"github.com/gin-gonic/gin"
)

// ExportHeurekaXML handles GET /api/export/heureka.xml
// Generates a Heureka-compatible XML feed of all active products
// This is used for CPC marketplace integration (MegaPrice.sk, etc.)
func ExportHeurekaXML(db *database.Postgres, cfg *config.Config, redisCache *cache.Redis) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		startTime := time.Now()

		log.Printf("[EXPORT] Heureka XML feed requested from %s", c.ClientIP())

		// Set response headers for XML
		c.Header("Content-Type", "application/xml; charset=utf-8")
		c.Header("Content-Disposition", "inline; filename=heureka_feed.xml")
		c.Header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
		c.Header("X-Feed-Generated", startTime.UTC().Format(time.RFC3339))

		// Create exporter and stream XML directly to response
		exporter := export.NewHeurekaExporter(db.Pool(), cfg)

		c.Status(http.StatusOK)
		if err := exporter.WriteXML(ctx, c.Writer); err != nil {
			log.Printf("[EXPORT] Error generating Heureka XML: %v", err)
			// Can't change status anymore since we already started writing
			// Just log the error
			return
		}

		elapsed := time.Since(startTime)
		log.Printf("[EXPORT] Heureka XML feed served in %v", elapsed)
	}
}

// ExportInfo handles GET /api/export/info
// Returns information about available export feeds
func ExportInfo(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Count active products
		var activeCount int64
		db.Pool().QueryRow(ctx, "SELECT COUNT(*) FROM products WHERE status = 'active'").Scan(&activeCount)

		// Count categories with products
		var categoryCount int64
		db.Pool().QueryRow(ctx, "SELECT COUNT(DISTINCT category_id) FROM products WHERE status = 'active' AND category_id IS NOT NULL").Scan(&categoryCount)

		// Count brands
		var brandCount int64
		db.Pool().QueryRow(ctx, "SELECT COUNT(DISTINCT brand_id) FROM products WHERE status = 'active' AND brand_id IS NOT NULL").Scan(&brandCount)

		c.JSON(http.StatusOK, gin.H{
			"feeds": []gin.H{
				{
					"name":        "Heureka XML Feed",
					"description": "Heureka-kompatibilný XML feed pre CPC porovnávače",
					"url":         "/api/export/heureka.xml",
					"format":      "XML (Heureka format)",
					"products":    activeCount,
					"categories":  categoryCount,
					"brands":      brandCount,
				},
			},
			"note": "Feed sa generuje v reálnom čase a je cachovaný na 1 hodinu",
		})
	}
}
