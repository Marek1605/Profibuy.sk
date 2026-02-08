package handlers

import (
	"context"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"megashop/internal/cache"
	"megashop/internal/config"
	"megashop/internal/database"
	"megashop/internal/export"

	"github.com/gin-gonic/gin"
)

// feedCache stores the pre-generated XML feed
var feedCache struct {
	sync.RWMutex
	data      []byte
	generated time.Time
	generating bool
}

// maxFeedAge is the maximum age of the cached feed before regeneration
const maxFeedAge = 2 * time.Hour

// ExportHeurekaXML handles GET /api/export/heureka.xml
// Serves a pre-generated XML feed from memory/file cache
func ExportHeurekaXML(db *database.Postgres, cfg *config.Config, redisCache *cache.Redis) gin.HandlerFunc {
	// Try to load from file on startup
	if data, err := os.ReadFile("/tmp/heureka_feed.xml"); err == nil && len(data) > 100 {
		feedCache.Lock()
		feedCache.data = data
		feedCache.generated = time.Now() // Assume recent enough
		feedCache.Unlock()
		log.Printf("[EXPORT] Loaded cached feed from file (%d bytes)", len(data))
	}

	return func(c *gin.Context) {
		log.Printf("[EXPORT] Heureka XML feed requested from %s", c.ClientIP())

		feedCache.RLock()
		data := feedCache.data
		generated := feedCache.generated
		isGenerating := feedCache.generating
		feedCache.RUnlock()

		// If we have cached data, serve it
		if len(data) > 0 {
			c.Header("Content-Type", "application/xml; charset=utf-8")
			c.Header("Content-Disposition", "inline; filename=heureka_feed.xml")
			c.Header("Cache-Control", "public, max-age=3600")
			c.Header("X-Feed-Generated", generated.UTC().Format(time.RFC3339))
			c.Header("X-Feed-Age", time.Since(generated).Round(time.Second).String())
			c.Data(http.StatusOK, "application/xml; charset=utf-8", data)

			// Trigger background regeneration if stale
			if time.Since(generated) > maxFeedAge && !isGenerating {
				go regenerateFeed(db, cfg)
			}
			return
		}

		// No cached data - generate synchronously (first request)
		if !isGenerating {
			go regenerateFeed(db, cfg)
		}

		c.JSON(http.StatusAccepted, gin.H{
			"status":  "generating",
			"message": "Feed sa práve generuje. Skúste znova o 5 minút.",
		})
	}
}

// RegenerateHeurekaXML handles POST /api/admin/export/regenerate
func RegenerateHeurekaXML(db *database.Postgres, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		feedCache.RLock()
		isGenerating := feedCache.generating
		feedCache.RUnlock()

		if isGenerating {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"message": "Feed sa práve generuje",
			})
			return
		}

		go regenerateFeed(db, cfg)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Regenerácia feedu spustená na pozadí",
		})
	}
}

func regenerateFeed(db *database.Postgres, cfg *config.Config) {
	feedCache.Lock()
	if feedCache.generating {
		feedCache.Unlock()
		return
	}
	feedCache.generating = true
	feedCache.Unlock()

	defer func() {
		feedCache.Lock()
		feedCache.generating = false
		feedCache.Unlock()
	}()

	startTime := time.Now()
	log.Printf("[EXPORT] Starting background feed generation...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	exporter := export.NewHeurekaExporter(db.Pool(), cfg)

	data, err := exporter.GenerateXMLBytes(ctx)
	if err != nil {
		log.Printf("[EXPORT] Error generating feed: %v", err)
		return
	}

	// Save to memory cache
	feedCache.Lock()
	feedCache.data = data
	feedCache.generated = time.Now()
	feedCache.Unlock()

	// Save to file for persistence across restarts
	if err := os.WriteFile("/tmp/heureka_feed.xml", data, 0644); err != nil {
		log.Printf("[EXPORT] Warning: could not save feed to file: %v", err)
	}

	elapsed := time.Since(startTime)
	log.Printf("[EXPORT] Feed generated: %d bytes in %v", len(data), elapsed)
}

// ExportInfo handles GET /api/export/info
func ExportInfo(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var activeCount int64
		db.Pool().QueryRow(ctx, "SELECT COUNT(*) FROM products WHERE status = 'active'").Scan(&activeCount)

		var categoryCount int64
		db.Pool().QueryRow(ctx, "SELECT COUNT(DISTINCT category_id) FROM products WHERE status = 'active' AND category_id IS NOT NULL").Scan(&categoryCount)

		var brandCount int64
		db.Pool().QueryRow(ctx, "SELECT COUNT(DISTINCT brand_id) FROM products WHERE status = 'active' AND brand_id IS NOT NULL").Scan(&brandCount)

		feedCache.RLock()
		feedGenerated := feedCache.generated
		feedSize := len(feedCache.data)
		isGenerating := feedCache.generating
		feedCache.RUnlock()

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
					"generated":   feedGenerated.UTC().Format(time.RFC3339),
					"size_bytes":  feedSize,
					"generating":  isGenerating,
				},
			},
		})
	}
}
