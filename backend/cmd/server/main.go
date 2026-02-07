package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"megashop/internal/cache"
	"megashop/internal/config"
	"megashop/internal/database"
	"megashop/internal/email"
	"megashop/internal/handlers"
	"megashop/internal/middleware"
	"megashop/internal/search"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	godotenv.Load()

	// Config
	cfg := config.Load()

	// Database
	db, err := database.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := db.Migrate(); err != nil {
		log.Printf("Migration warning: %v", err)
	}

	// Redis Cache
	redisCache, err := cache.NewRedis(cfg.RedisURL)
	if err != nil {
		log.Printf("Redis connection failed, using memory cache: %v", err)
		redisCache = nil
	}

	// Search Engine
	searchEngine := search.NewEngine(db, redisCache)

	// Email Service
	emailSvc := email.NewService(cfg)
	if emailSvc.IsConfigured() {
		log.Println("📧 Email service configured")
	} else {
		log.Println("⚠️  Email service NOT configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")
	}

	// Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// CORS
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now().Unix()})
	})

	// API routes
	api := router.Group("/api")
	{
		// Public routes
		public := api.Group("")
		{
			// Products
			public.GET("/products", handlers.ListProducts(db, redisCache, searchEngine))
			public.GET("/products/:id", handlers.GetProduct(db, redisCache))
			public.GET("/products/slug/:slug", handlers.GetProductBySlug(db, redisCache))
			public.GET("/products/search", handlers.SearchProducts(db, searchEngine))
			
			// Categories
			public.GET("/categories", handlers.ListCategories(db, redisCache))
			public.GET("/categories/:slug", handlers.GetCategory(db, redisCache))
			public.GET("/categories/:slug/products", handlers.GetCategoryProducts(db, redisCache, searchEngine))
			
			// Filters
			public.GET("/filters", handlers.GetFilters(db, redisCache))
			public.GET("/filters/:category", handlers.GetCategoryFilters(db, redisCache))
			
			// Cart
			public.POST("/cart", handlers.CreateCart(db))
			public.GET("/cart/:id", handlers.GetCart(db))
			public.POST("/cart/:id/items", handlers.AddToCart(db))
			public.PUT("/cart/:id/items/:itemId", handlers.UpdateCartItem(db))
			public.DELETE("/cart/:id/items/:itemId", handlers.RemoveFromCart(db))
			
			// Orders
			public.POST("/orders", handlers.CreateOrder(db, cfg, emailSvc))
			public.GET("/orders/:id", handlers.GetOrder(db))
			public.GET("/orders/track/:number", handlers.TrackOrder(db))
			
			// Payments
			public.POST("/payments/comgate/init", handlers.InitComgatePayment(db, cfg))
			public.POST("/payments/comgate/callback", handlers.ComgateCallback(db, cfg))
			public.POST("/payments/gopay/init", handlers.InitGoPayPayment(db, cfg))
			public.POST("/payments/gopay/callback", handlers.GoPayCallback(db, cfg))
			
			// Shipping
			public.GET("/shipping/methods", handlers.GetShippingMethods(db))
			public.POST("/shipping/packeta/points", handlers.GetPacketaPoints(cfg))

			// Export feeds (Heureka XML, etc.)
			public.GET("/export/heureka.xml", handlers.ExportHeurekaXML(db, cfg, redisCache))
			public.GET("/export/info", handlers.ExportInfo(db))
			
			// Auth
			public.POST("/auth/login", handlers.Login(db, cfg))
			public.POST("/auth/register", handlers.Register(db, cfg))
			public.POST("/auth/refresh", handlers.RefreshToken(db, cfg))
		}

		// Protected routes (admin)
		// TODO: Re-enable auth middleware when login system is ready
		// admin.Use(middleware.Auth(cfg.JWTSecret))
		admin := api.Group("/admin")
		{
			// Dashboard
			admin.GET("/dashboard", handlers.GetDashboard(db, redisCache))
			admin.GET("/stats", handlers.GetStats(db, redisCache))
			
			// Products CRUD
			admin.GET("/products", handlers.ListProducts(db, redisCache, searchEngine))
			admin.POST("/products", handlers.CreateProduct(db, redisCache))
			admin.DELETE("/products/delete-all", handlers.DeleteAllProducts(db, redisCache))
			admin.PUT("/products/:id", handlers.UpdateProduct(db, redisCache))
			admin.DELETE("/products/:id", handlers.DeleteProduct(db, redisCache))
			admin.POST("/products/bulk", handlers.BulkUpdateProducts(db, redisCache))
			admin.POST("/products/import", handlers.ImportProducts(db, redisCache))
			
			// Categories CRUD (DELETE /all MUST be before /:id to avoid route conflict)
			admin.DELETE("/categories/all", handlers.DeleteAllCategories(db, redisCache))
			admin.POST("/categories/auto-thumbnails", handlers.AutoAssignCategoryThumbnails(db, redisCache))
			admin.POST("/categories", handlers.CreateCategory(db, redisCache))
			admin.PUT("/categories/:id", handlers.UpdateCategory(db, redisCache))
			admin.DELETE("/categories/:id", handlers.DeleteCategory(db, redisCache))
			
			// Orders management
			admin.GET("/orders", handlers.ListOrders(db))
			admin.PUT("/orders/:id/status", handlers.UpdateOrderStatus(db))
			admin.POST("/orders/:id/invoice", handlers.GenerateInvoice(db))
			
			// Settings
			admin.GET("/settings", handlers.GetSettings(db))
			admin.PUT("/settings", handlers.UpdateSettings(db, redisCache))
			
			// Feed import
			admin.POST("/feeds", handlers.CreateFeed(db))
			admin.GET("/feeds", handlers.ListFeeds(db))
			admin.POST("/feeds/:id/run", handlers.RunFeedImport(db, redisCache))
			admin.DELETE("/feeds/:id", handlers.DeleteFeed(db))
			
			// Suppliers (Action, etc.)
			admin.GET("/suppliers", handlers.ListSuppliers(db))
			admin.GET("/suppliers/:id", handlers.GetSupplier(db))
			admin.POST("/suppliers", handlers.CreateSupplier(db))
			admin.PUT("/suppliers/:id", handlers.UpdateSupplier(db))
			admin.DELETE("/suppliers/:id", handlers.DeleteSupplier(db))
			
			// Supplier feed management
			admin.GET("/suppliers/:id/feeds", handlers.ListStoredFeeds(db))
			admin.GET("/suppliers/:id/feeds/current", handlers.GetCurrentFeed(db))
			admin.POST("/suppliers/:id/download", handlers.DownloadFeed(db))
			admin.GET("/suppliers/:id/download-status", handlers.GetDownloadStatus(db))
			admin.DELETE("/suppliers/:id/feeds/:feedId", handlers.DeleteStoredFeed(db))
			
			// Supplier feed import
			admin.POST("/suppliers/:id/import", handlers.StartImport(db))
			admin.GET("/suppliers/:id/import/:importId/progress", handlers.GetImportProgress(db))
			admin.GET("/suppliers/:id/imports", handlers.ListImports(db))
			admin.POST("/suppliers/:id/preview", handlers.PreviewFeed(db))
			
			// Supplier products
			admin.GET("/suppliers/:id/products", handlers.ListSupplierProducts(db))
			admin.GET("/suppliers/:id/products/:productId", handlers.GetSupplierProduct(db))
			
			// Supplier categories and brands
			admin.GET("/suppliers/:id/categories", handlers.ListSupplierCategories(db))
			admin.DELETE("/suppliers/:id/categories", handlers.DeleteAllSupplierCategories(db))
			admin.POST("/suppliers/:id/categories/regenerate", handlers.RegenerateCategoriesFromProducts(db))
			admin.GET("/suppliers/:id/brands", handlers.ListSupplierBrands(db))
			
			// Link supplier products to main catalog
			admin.POST("/suppliers/:id/link-all", handlers.LinkAllProducts(db))
			admin.GET("/suppliers/:id/link/:linkId/progress", handlers.GetLinkProgress(db))
			admin.DELETE("/suppliers/:id/delete-all-products", handlers.DeleteAllSupplierProducts(db))
			
			// Cache management
			admin.POST("/cache/clear", handlers.ClearCache(redisCache))
			admin.POST("/cache/warmup", handlers.WarmupCache(db, redisCache))

			// Filter management
			admin.GET("/attributes/stats", handlers.GetAttributeStats(db))
			admin.GET("/filter-settings", handlers.GetFilterSettings(db))
			admin.POST("/filter-settings", handlers.SaveFilterSettings(db))

			// Export feed management
			// admin.POST("/export/regenerate", handlers.RegenerateHeurekaXML(db, cfg)) // TODO: implement
		}
	}

	// Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 5 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("🚀 Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
