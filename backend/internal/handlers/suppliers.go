package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"megashop/internal/database"
	"megashop/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ==================== SUPPLIER HANDLERS ====================

// ListSuppliers handles GET /api/admin/suppliers
func ListSuppliers(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		suppliers, err := db.ListSuppliers(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": suppliers})
	}
}

// GetSupplier handles GET /api/admin/suppliers/:id
func GetSupplier(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		supplier, err := db.GetSupplier(ctx, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if supplier == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Supplier not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": supplier})
	}
}

// CreateSupplier handles POST /api/admin/suppliers
func CreateSupplier(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var input models.Supplier
		if err := c.ShouldBindJSON(&input); err != nil {
			fmt.Printf("[DEBUG] CreateSupplier - JSON bind error: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": fmt.Sprintf("JSON parse error: %v", err)})
			return
		}

		fmt.Printf("[DEBUG] CreateSupplier - Input: name=%s, code=%s, feed_url=%s, feed_type=%s, feed_format=%s, auth_type=%s\n",
			input.Name, input.Code, input.FeedURL, input.FeedType, input.FeedFormat, input.AuthType)

		input.ID = uuid.New()
		input.CreatedAt = time.Now()
		input.UpdatedAt = time.Now()

		// Set defaults for JSONB fields if nil
		if input.AuthCredentials == nil {
			input.AuthCredentials = []byte("{}")
		}
		if input.FieldMappings == nil {
			input.FieldMappings = []byte("{}")
		}
		// Set defaults for other fields
		if input.FeedType == "" {
			input.FeedType = "xml"
		}
		if input.FeedFormat == "" {
			input.FeedFormat = "action"
		}
		if input.MaxDownloadsPerDay == 0 {
			input.MaxDownloadsPerDay = 8
		}
		if input.AuthType == "" {
			input.AuthType = "none"
		}

		fmt.Printf("[DEBUG] CreateSupplier - After defaults: auth_type=%s, feed_type=%s, max_downloads=%d\n",
			input.AuthType, input.FeedType, input.MaxDownloadsPerDay)

		if err := db.CreateSupplier(ctx, &input); err != nil {
			fmt.Printf("[DEBUG] CreateSupplier - DB error: %v\n", err)
			errMsg := err.Error()
			if strings.Contains(errMsg, "suppliers_code_key") || strings.Contains(errMsg, "duplicate key") {
				c.JSON(http.StatusConflict, gin.H{"success": false, "error": fmt.Sprintf("Dodávateľ s kódom '%s' už existuje. Použite iný kód.", input.Code)})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": fmt.Sprintf("DB error: %v", err)})
			return
		}

		fmt.Printf("[DEBUG] CreateSupplier - Success! ID=%s\n", input.ID)
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": input})
	}
}

// UpdateSupplier handles PUT /api/admin/suppliers/:id
func UpdateSupplier(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		var input models.Supplier
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}

		input.ID = id
		input.UpdatedAt = time.Now()

		if err := db.UpdateSupplier(ctx, &input); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": input})
	}
}

// DeleteSupplier handles DELETE /api/admin/suppliers/:id
func DeleteSupplier(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		if err := db.DeleteSupplier(ctx, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Supplier deleted"})
	}
}

// ==================== STORED FEEDS HANDLERS ====================

// ListStoredFeeds handles GET /api/admin/suppliers/:id/feeds
func ListStoredFeeds(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		feeds, err := db.ListStoredFeeds(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": feeds})
	}
}

// GetCurrentFeed handles GET /api/admin/suppliers/:id/feeds/current
func GetCurrentFeed(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		feed, err := db.GetCurrentFeed(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if feed == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "No current feed found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": feed})
	}
}

// Download progress tracking
var downloadProgress = make(map[uuid.UUID]*DownloadStatus)
var downloadProgressMu sync.RWMutex

type DownloadStatus struct {
	SupplierID   uuid.UUID `json:"supplier_id"`
	Status       string    `json:"status"` // downloading, completed, failed
	BytesTotal   int64     `json:"bytes_total"`
	BytesDown    int64     `json:"bytes_downloaded"`
	Percent      float64   `json:"percent"`
	Speed        string    `json:"speed"`
	Error        string    `json:"error,omitempty"`
	StartedAt    time.Time `json:"started_at"`
	FinishedAt   time.Time `json:"finished_at,omitempty"`
	FeedID       uuid.UUID `json:"feed_id,omitempty"`
}

// DownloadFeed handles POST /api/admin/suppliers/:id/download
// Starts async download with progress tracking
func DownloadFeed(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		// Get supplier
		supplier, err := db.GetSupplier(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if supplier == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Supplier not found"})
			return
		}

		// Check download limit
		canDownload, err := db.CanSupplierDownload(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if !canDownload {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   fmt.Sprintf("Download limit reached. Maximum %d downloads per day. Try again tomorrow.", supplier.MaxDownloadsPerDay),
				"limit":   supplier.MaxDownloadsPerDay,
				"used":    supplier.DownloadCountToday,
			})
			return
		}

		// Check if URL is set
		if supplier.FeedURL == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Feed URL not configured"})
			return
		}

		// Check if already downloading
		downloadProgressMu.RLock()
		existing, isRunning := downloadProgress[supplierID]
		downloadProgressMu.RUnlock()
		if isRunning && existing.Status == "downloading" {
			c.JSON(http.StatusConflict, gin.H{"success": false, "error": "Download already in progress"})
			return
		}

		// Create progress tracker
		status := &DownloadStatus{
			SupplierID: supplierID,
			Status:     "downloading",
			StartedAt:  time.Now(),
		}
		downloadProgressMu.Lock()
		downloadProgress[supplierID] = status
		downloadProgressMu.Unlock()

		// Start async download (counter will be incremented after successful connection)
		go runDownload(db, supplier, status)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Download started. Use GET /download-status to track progress.",
			"data":    status,
		})
	}
}

// runDownload performs the actual file download in background
func runDownload(db *database.Postgres, supplier *models.Supplier, status *DownloadStatus) {
	ctx := context.Background()
	startTime := time.Now()

	updateStatus := func(s string, err string) {
		downloadProgressMu.Lock()
		status.Status = s
		if err != "" {
			status.Error = err
		}
		downloadProgressMu.Unlock()
	}

	// Create HTTP client with long timeout and proper headers
	client := &http.Client{
		Timeout: 30 * time.Minute, // Action XML can be huge
		Transport: &http.Transport{
			MaxIdleConns:        10,
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  false,
			TLSHandshakeTimeout: 60 * time.Second,
			ResponseHeaderTimeout: 5 * time.Minute, // Action.pl is slow to respond
		},
	}

	// Build request with proper headers
	req, err := http.NewRequest("GET", supplier.FeedURL, nil)
	if err != nil {
		updateStatus("failed", fmt.Sprintf("Invalid URL: %v", err))
		return
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ProfiBuy/2.0; +https://profibuy.sk)")
	req.Header.Set("Accept", "application/xml, text/xml, */*")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")

	fmt.Printf("[Download] Starting download from: %s\n", supplier.FeedURL)

	resp, err := client.Do(req)
	if err != nil {
		updateStatus("failed", fmt.Sprintf("Download failed: %v", err))
		fmt.Printf("[Download] ERROR: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		updateStatus("failed", fmt.Sprintf("Server returned HTTP %d: %s", resp.StatusCode, string(body)))
		fmt.Printf("[Download] ERROR: HTTP %d\n", resp.StatusCode)
		return
	}

	// Get content length if available
	if resp.ContentLength > 0 {
		status.BytesTotal = resp.ContentLength
	}

	fmt.Printf("[Download] Response OK. Content-Length: %d, Content-Type: %s\n", resp.ContentLength, resp.Header.Get("Content-Type"))

	// NOW increment download counter - only after successful connection
	if err := db.IncrementSupplierDownload(ctx, supplier.ID); err != nil {
		fmt.Printf("[Download] Warning: Failed to increment download counter: %v\n", err)
	}

	// Create storage directory
	storageDir := filepath.Join("storage", "feeds", supplier.Code)
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		updateStatus("failed", fmt.Sprintf("Failed to create directory: %v", err))
		return
	}

	// Create file
	filename := fmt.Sprintf("%s_%s.xml", supplier.Code, time.Now().Format("2006-01-02_15-04-05"))
	filePath := filepath.Join(storageDir, filename)

	file, err := os.Create(filePath)
	if err != nil {
		updateStatus("failed", "Failed to create file")
		return
	}

	// Download with progress tracking
	hash := sha256.New()
	writer := io.MultiWriter(file, hash)

	buf := make([]byte, 256*1024) // 256KB buffer
	var totalBytes int64
	lastLog := time.Now()

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := writer.Write(buf[:n])
			if writeErr != nil {
				file.Close()
				os.Remove(filePath)
				updateStatus("failed", fmt.Sprintf("Write error: %v", writeErr))
				return
			}
			totalBytes += int64(n)

			// Update progress
			downloadProgressMu.Lock()
			status.BytesDown = totalBytes
			if status.BytesTotal > 0 {
				status.Percent = float64(totalBytes) / float64(status.BytesTotal) * 100
			}
			elapsed := time.Since(startTime).Seconds()
			if elapsed > 0 {
				speedMBs := float64(totalBytes) / 1024 / 1024 / elapsed
				status.Speed = fmt.Sprintf("%.1f MB/s", speedMBs)
			}
			downloadProgressMu.Unlock()

			// Log progress every 10 seconds
			if time.Since(lastLog) > 10*time.Second {
				fmt.Printf("[Download] %s: %.1f MB downloaded (%.1f%%)\n",
					supplier.Code, float64(totalBytes)/1024/1024, status.Percent)
				lastLog = time.Now()
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			file.Close()
			os.Remove(filePath)
			updateStatus("failed", fmt.Sprintf("Read error: %v", readErr))
			return
		}
	}
	file.Close()

	downloadDuration := time.Since(startTime)
	fmt.Printf("[Download] %s: Completed! %.1f MB in %v\n",
		supplier.Code, float64(totalBytes)/1024/1024, downloadDuration.Round(time.Second))

	// Mark previous feeds as not current
	if err := db.MarkFeedsNotCurrent(ctx, supplier.ID); err != nil {
		fmt.Printf("Warning: Failed to mark previous feeds: %v\n", err)
	}

	// Create stored feed record
	storedFeed := &models.StoredFeed{
		ID:               uuid.New(),
		SupplierID:       supplier.ID,
		Filename:         filename,
		FilePath:         filePath,
		FileSize:         totalBytes,
		FileHash:         hex.EncodeToString(hash.Sum(nil)),
		ContentType:      resp.Header.Get("Content-Type"),
		DownloadedAt:     time.Now(),
		DownloadDuration: int(downloadDuration.Milliseconds()),
		SourceURL:        supplier.FeedURL,
		Status:           "downloaded",
		IsCurrent:        true,
		ExpiresAt:        time.Now().Add(24 * time.Hour),
		CreatedAt:        time.Now(),
	}

	if err := db.CreateStoredFeed(ctx, storedFeed); err != nil {
		updateStatus("failed", fmt.Sprintf("DB error: %v", err))
		return
	}

	// Update status to completed
	downloadProgressMu.Lock()
	status.Status = "completed"
	status.FinishedAt = time.Now()
	status.FeedID = storedFeed.ID
	downloadProgressMu.Unlock()

	// Clean up progress after 10 minutes
	go func() {
		time.Sleep(10 * time.Minute)
		downloadProgressMu.Lock()
		delete(downloadProgress, supplier.ID)
		downloadProgressMu.Unlock()
	}()
}

// GetDownloadStatus handles GET /api/admin/suppliers/:id/download-status
func GetDownloadStatus(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		supplier, err := db.GetSupplier(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if supplier == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Supplier not found"})
			return
		}

		canDownload, _ := db.CanSupplierDownload(ctx, supplierID)
		currentFeed, _ := db.GetCurrentFeed(ctx, supplierID)

		remaining := supplier.MaxDownloadsPerDay - supplier.DownloadCountToday
		if remaining < 0 {
			remaining = 0
		}

		// Check for active download progress
		downloadProgressMu.RLock()
		activeDownload, hasActive := downloadProgress[supplierID]
		downloadProgressMu.RUnlock()

		response := gin.H{
			"can_download":        canDownload,
			"downloads_today":     supplier.DownloadCountToday,
			"max_downloads":       supplier.MaxDownloadsPerDay,
			"downloads_remaining": remaining,
			"last_download":       supplier.LastDownloadDate,
			"current_feed":        currentFeed,
		}

		if hasActive {
			response["active_download"] = activeDownload
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    response,
		})
	}
}

// DeleteStoredFeed handles DELETE /api/admin/suppliers/:id/feeds/:feedId
func DeleteStoredFeed(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		feedID, err := uuid.Parse(c.Param("feedId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid feed ID"})
			return
		}

		feed, err := db.GetStoredFeed(ctx, feedID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if feed == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Feed not found"})
			return
		}

		// Delete file
		if feed.FilePath != "" {
			os.Remove(feed.FilePath)
		}

		// Delete from database
		if err := db.DeleteStoredFeed(ctx, feedID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Feed deleted"})
	}
}

// ==================== IMPORT HANDLERS ====================

// Import progress tracking
var importProgress = make(map[uuid.UUID]*models.FeedImport)
var importProgressMu sync.RWMutex

// StartImport handles POST /api/admin/suppliers/:id/import
func StartImport(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		// Get supplier
		supplier, err := db.GetSupplier(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if supplier == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Supplier not found"})
			return
		}

		// Get current feed (or specified feed)
		feedIDStr := c.Query("feed_id")
		var storedFeed *models.StoredFeed
		if feedIDStr != "" {
			feedID, err := uuid.Parse(feedIDStr)
			if err == nil {
				storedFeed, _ = db.GetStoredFeed(ctx, feedID)
			}
		}
		if storedFeed == nil {
			storedFeed, err = db.GetCurrentFeed(ctx, supplierID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
				return
			}
		}
		if storedFeed == nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "No feed available. Please download a feed first."})
			return
		}

		// Create import record
		feedImport := &models.FeedImport{
			ID:           uuid.New(),
			SupplierID:   supplierID,
			StoredFeedID: storedFeed.ID,
			StartedAt:    time.Now(),
			Status:       "running",
			TriggeredBy:  "manual",
			Logs:         []string{"Import started..."},
			CreatedAt:    time.Now(),
		}

		if err := db.CreateFeedImport(ctx, feedImport); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		// Store progress reference
		importProgressMu.Lock()
		importProgress[feedImport.ID] = feedImport
		importProgressMu.Unlock()

		// Run import in background
		go runImport(db, supplier, storedFeed, feedImport)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    feedImport,
			"message": "Import started",
		})
	}
}

// GetImportProgress handles GET /api/admin/suppliers/:id/import/:importId/progress
func GetImportProgress(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		importID, err := uuid.Parse(c.Param("importId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid import ID"})
			return
		}

		importProgressMu.RLock()
		progress, exists := importProgress[importID]
		importProgressMu.RUnlock()

		if !exists {
			// Try to get from database
			ctx := c.Request.Context()
			progress, err = db.GetFeedImport(ctx, importID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
				return
			}
			if progress == nil {
				c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Import not found"})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": progress})
	}
}

// ListImports handles GET /api/admin/suppliers/:id/imports
func ListImports(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

		imports, err := db.ListFeedImports(ctx, supplierID, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": imports})
	}
}

// ==================== ACTION XML PARSER ====================

// ActionCatalog represents the root of Action XML feed
type ActionCatalog struct {
	XMLName    xml.Name         `xml:"Catalog"`
	Categories ActionCategories `xml:"Categories"`
	Producers  ActionProducers  `xml:"Producers"`
	Products   ActionProducts   `xml:"Products"`
}

type ActionCategories struct {
	MainCategories []ActionMainCategory `xml:"MainCategory"`
}

type ActionMainCategory struct {
	ID            string                `xml:"id,attr"`
	Name          string                `xml:"nazwa,attr"`
	SubCategories []ActionSubCategory   `xml:"SubCategories>SubCategory"`
}

type ActionSubCategory struct {
	ID   string `xml:"id,attr"`
	Name string `xml:"nazwa,attr"`
}

type ActionProducers struct {
	Producers []ActionProducer `xml:"Producer"`
}

type ActionProducer struct {
	ID   string `xml:"id,attr"`
	Name string `xml:"name,attr"`
}

type ActionProducts struct {
	Products []ActionProduct `xml:"Product"`
}

type ActionProduct struct {
	ID                       string              `xml:"id,attr"`
	Name                     string              `xml:"name,attr"`
	ProducerID               string              `xml:"producer,attr"`
	CategoryID               string              `xml:"categoryId,attr"`
	PriceNet                 string              `xml:"priceNet,attr"`
	VAT                      string              `xml:"vat,attr"`
	VATType                  string              `xml:"vat_type,attr"`
	PKWIU                    string              `xml:"pkwiu,attr"`
	SRP                      string              `xml:"srp,attr"`
	Date                     string              `xml:"date,attr"`
	Warranty                 string              `xml:"warranty,attr"`
	Available                string              `xml:"available,attr"`
	OnOrder                  string              `xml:"onOrder,attr"`
	SpecialOffer             string              `xml:"specialOffer,attr"`
	SmallPallet              string              `xml:"smallPallet,attr"`
	ProductIsLarge           string              `xml:"productIsLarge,attr"`
	ManufacturerPartNumber   string              `xml:"manufacturerPartNumber,attr"`
	EAN                      string              `xml:"EAN,attr"`
	SizeWidth                string              `xml:"sizeWidth,attr"`
	SizeLength               string              `xml:"sizeLength,attr"`
	SizeHeight               string              `xml:"sizeHeight,attr"`
	Weight                   string              `xml:"weight,attr"`
	SizeMeasurementUnit      string              `xml:"sizetMeasurementUnit,attr"`
	WeightMeasurementUnit    string              `xml:"weightMeasurementUnit,attr"`
	SaleReason               string              `xml:"saleReason,attr"`
	DimensionalWeight        string              `xml:"dimensionalWeight,attr"`
	AdditionalAvailability   string              `xml:"additionalAvailabilityInfo,attr"`
	ShippingTimeInHour       string              `xml:"shippingTimeInHour,attr"`
	ETA                      string              `xml:"ETA,attr"`
	IncomingStock            string              `xml:"incomingStock,attr"`
	MainCategoryTree         string              `xml:"mainCategoryTree,attr"`
	CategoryTree             string              `xml:"categoryTree,attr"`
	SubCategoryTree          string              `xml:"subCategoryTree,attr"`
	Images                   []ActionImage       `xml:"Images>Image"`
	Multimedia               []ActionMultimedia  `xml:"Multimedia>MultimediaItem"`
	TechnicalSpecs           []ActionSection     `xml:"TechnicalSpecification>Section"`
}

type ActionImage struct {
	URL       string `xml:"url,attr"`
	IsMain    string `xml:"isMain,attr"`
	Date      string `xml:"date,attr"`
	Copyright string `xml:"copyright,attr"`
}

type ActionMultimedia struct {
	URL         string `xml:"url,attr"`
	Description string `xml:"description,attr"`
	Type        string `xml:"type,attr"`
	Copyright   string `xml:"copyright,attr"`
}

type ActionSection struct {
	Name       string            `xml:"name,attr"`
	Parameters []ActionParameter `xml:"Parameters>Parameter"`
	Attributes []ActionAttribute `xml:"Attributes>Attribute"`
}

type ActionParameter struct {
	Name  string `xml:"name,attr"`
	Value string `xml:"value,attr"`
}

type ActionAttribute struct {
	Name   string              `xml:"name,attr"`
	Values []ActionAttrValue   `xml:"Values>Value"`
}

type ActionAttrValue struct {
	Name string `xml:"name,attr"`
}

// runImport runs the import process in background
func runImport(db *database.Postgres, supplier *models.Supplier, storedFeed *models.StoredFeed, feedImport *models.FeedImport) {
	ctx := context.Background()
	startTime := time.Now()

	fmt.Printf("[Import] Starting import for supplier %s, feed: %s\n", supplier.Code, storedFeed.FilePath)

	updateProgress := func(status string, message string) {
		importProgressMu.Lock()
		feedImport.Status = status
		feedImport.Logs = append(feedImport.Logs, fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), message))
		if len(feedImport.Logs) > 100 {
			feedImport.Logs = feedImport.Logs[len(feedImport.Logs)-100:]
		}
		importProgressMu.Unlock()
		fmt.Printf("[Import] %s: %s\n", status, message)
	}

	updateProgress("running", "Opening feed file...")

	// Open feed file
	file, err := os.Open(storedFeed.FilePath)
	if err != nil {
		fmt.Printf("[Import] ERROR opening file %s: %v\n", storedFeed.FilePath, err)
		updateProgress("failed", fmt.Sprintf("Failed to open feed file: %v", err))
		feedImport.ErrorMessage = err.Error()
		feedImport.Status = "failed"
		feedImport.FinishedAt = time.Now()
		db.UpdateFeedImport(ctx, feedImport)
		return
	}
	defer file.Close()

	fmt.Printf("[Import] File opened successfully, size info from stat...\n")
	if fi, err := file.Stat(); err == nil {
		fmt.Printf("[Import] File size: %d bytes\n", fi.Size())
	}

	updateProgress("running", "Parsing XML...")

	// Parse XML
	var catalog ActionCatalog
	decoder := xml.NewDecoder(file)
	if err := decoder.Decode(&catalog); err != nil {
		updateProgress("failed", fmt.Sprintf("Failed to parse XML: %v", err))
		feedImport.ErrorMessage = err.Error()
		feedImport.Status = "failed"
		feedImport.FinishedAt = time.Now()
		db.UpdateFeedImport(ctx, feedImport)
		return
	}

	// Process categories
	updateProgress("running", fmt.Sprintf("Processing %d categories...", len(catalog.Categories.MainCategories)))
	for _, mainCat := range catalog.Categories.MainCategories {
		// Create main category
		supCat := &models.SupplierCategory{
			ID:         uuid.New(),
			SupplierID: supplier.ID,
			ExternalID: mainCat.ID,
			Name:       mainCat.Name,
			FullPath:   mainCat.Name,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if err := db.UpsertSupplierCategory(ctx, supCat); err == nil {
			feedImport.CategoriesCreated++
		}

		// Create subcategories
		for _, subCat := range mainCat.SubCategories {
			supSubCat := &models.SupplierCategory{
				ID:               uuid.New(),
				SupplierID:       supplier.ID,
				ExternalID:       subCat.ID,
				ParentExternalID: mainCat.ID,
				Name:             subCat.Name,
				FullPath:         mainCat.Name + " > " + subCat.Name,
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			}
			if err := db.UpsertSupplierCategory(ctx, supSubCat); err == nil {
				feedImport.CategoriesCreated++
			}
		}
	}

	// Process producers/brands
	updateProgress("running", fmt.Sprintf("Processing %d producers...", len(catalog.Producers.Producers)))
	producerMap := make(map[string]string)
	for _, producer := range catalog.Producers.Producers {
		producerMap[producer.ID] = producer.Name
		
		supBrand := &models.SupplierBrand{
			ID:         uuid.New(),
			SupplierID: supplier.ID,
			ExternalID: producer.ID,
			Name:       producer.Name,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if err := db.UpsertSupplierBrand(ctx, supBrand); err == nil {
			feedImport.BrandsCreated++
		}
	}

	// Process products
	totalProducts := len(catalog.Products.Products)
	feedImport.TotalItems = totalProducts
	updateProgress("running", fmt.Sprintf("Processing %d products...", totalProducts))

	batchSize := 500
	for i, product := range catalog.Products.Products {
		// Parse product
		supProduct := parseActionProduct(supplier.ID, &product, producerMap)

		// Upsert to database
		isNew, err := db.UpsertSupplierProduct(ctx, supProduct)
		if err != nil {
			feedImport.Errors++
		} else if isNew {
			feedImport.Created++
		} else {
			feedImport.Updated++
		}
		feedImport.Processed++

		// Update progress every batch
		if (i+1)%batchSize == 0 || i == totalProducts-1 {
			feedImport.ProgressPercent = float64(i+1) / float64(totalProducts) * 100
			feedImport.CurrentItem = product.Name
			updateProgress("running", fmt.Sprintf("Processed %d/%d products (%.1f%%)", i+1, totalProducts, feedImport.ProgressPercent))

			// Save progress to database periodically
			db.UpdateFeedImport(ctx, feedImport)
		}
	}

	// Complete
	feedImport.Status = "completed"
	feedImport.FinishedAt = time.Now()
	feedImport.DurationMs = int(time.Since(startTime).Milliseconds())
	updateProgress("completed", fmt.Sprintf("Import completed! Created: %d, Updated: %d, Errors: %d", feedImport.Created, feedImport.Updated, feedImport.Errors))

	// Update stored feed stats
	storedFeed.TotalProducts = totalProducts
	storedFeed.TotalCategories = len(catalog.Categories.MainCategories)
	storedFeed.TotalBrands = len(catalog.Producers.Producers)
	storedFeed.Status = "imported"
	db.UpdateStoredFeed(ctx, storedFeed)

	// Final save
	db.UpdateFeedImport(ctx, feedImport)

	// Clean up progress after some time
	go func() {
		time.Sleep(5 * time.Minute)
		importProgressMu.Lock()
		delete(importProgress, feedImport.ID)
		importProgressMu.Unlock()
	}()
}

// parseActionProduct converts Action XML product to SupplierProduct model
func parseActionProduct(supplierID uuid.UUID, p *ActionProduct, producerMap map[string]string) *models.SupplierProduct {
	product := &models.SupplierProduct{
		ID:         uuid.New(),
		SupplierID: supplierID,
		ExternalID: p.ID,
		Name:       p.Name,
		EAN:        p.EAN,
		ManufacturerPartNumber: p.ManufacturerPartNumber,
		CategoryIDExternal:     p.CategoryID,
		ProducerIDExternal:     p.ProducerID,
		ProducerName:           producerMap[p.ProducerID],
		MainCategoryTree:       p.MainCategoryTree,
		CategoryTree:           p.CategoryTree,
		SubCategoryTree:        p.SubCategoryTree,
		Warranty:               p.Warranty,
		SpecialOffer:           p.SpecialOffer == "Y",
		IsLarge:                p.ProductIsLarge == "Y",
		SmallPallet:            p.SmallPallet == "Y",
		OnOrder:                p.OnOrder == "Y",
		AdditionalAvailabilityInfo: p.AdditionalAvailability,
		SizeUnit:               p.SizeMeasurementUnit,
		WeightUnit:             p.WeightMeasurementUnit,
		LastSeenAt:             time.Now(),
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}

	// Parse numeric fields
	if v, err := strconv.ParseFloat(p.PriceNet, 64); err == nil {
		product.PriceNet = v
	}
	if v, err := strconv.ParseFloat(p.VAT, 64); err == nil {
		product.VATRate = v
	}
	if v, err := strconv.ParseFloat(p.SRP, 64); err == nil {
		product.SRP = v
	}
	
	// Calculate price with VAT
	product.PriceVAT = product.PriceNet * (1 + product.VATRate/100)

	// Stock
	if strings.Contains(strings.ToLower(p.Available), "greater") {
		product.Stock = 200
		product.StockStatus = "in_stock"
	} else if v, err := strconv.Atoi(p.Available); err == nil {
		product.Stock = v
		if v > 0 {
			product.StockStatus = "in_stock"
		} else if p.OnOrder == "Y" {
			product.StockStatus = "on_order"
		} else {
			product.StockStatus = "out_of_stock"
		}
	}

	// Dimensions
	if v, err := strconv.ParseFloat(p.Weight, 64); err == nil {
		product.Weight = v
	}
	if v, err := strconv.ParseFloat(p.SizeWidth, 64); err == nil {
		product.Width = v
	}
	if v, err := strconv.ParseFloat(p.SizeLength, 64); err == nil {
		product.Length = v
	}
	if v, err := strconv.ParseFloat(p.SizeHeight, 64); err == nil {
		product.Height = v
	}
	if v, err := strconv.ParseFloat(p.DimensionalWeight, 64); err == nil {
		product.DimensionalWeight = v
	}
	if v, err := strconv.Atoi(p.ShippingTimeInHour); err == nil {
		product.ShippingTimeHours = v
	}
	if v, err := strconv.Atoi(p.IncomingStock); err == nil {
		product.IncomingStock = v
	}

	// Parse date
	if t, err := time.Parse("2006-01-02", p.Date); err == nil {
		product.DateAdded = t
	}

	// Parse ETA
	if p.ETA != "" {
		// Try different date formats
		for _, format := range []string{"02.01.2006", "2006-01-02", "01/02/2006"} {
			if t, err := time.Parse(format, p.ETA); err == nil {
				product.ETA = t
				break
			}
		}
	}

	// Images
	images := make([]models.ProductImage, 0, len(p.Images))
	for _, img := range p.Images {
		images = append(images, models.ProductImage{
			URL:       img.URL,
			IsMain:    img.IsMain == "1",
			Date:      img.Date,
			Copyright: img.Copyright == "1",
		})
	}
	product.Images = images

	// Multimedia
	multimedia := make([]models.ProductMultimedia, 0, len(p.Multimedia))
	for _, mm := range p.Multimedia {
		multimedia = append(multimedia, models.ProductMultimedia{
			URL:         mm.URL,
			Description: mm.Description,
			Type:        mm.Type,
			Copyright:   mm.Copyright == "1",
		})
	}
	product.Multimedia = multimedia

	// Technical specs
	specs := make(map[string]interface{})
	for _, section := range p.TechnicalSpecs {
		sectionData := make(map[string]interface{})
		
		// Parameters
		params := make(map[string]string)
		for _, param := range section.Parameters {
			params[param.Name] = param.Value
		}
		if len(params) > 0 {
			sectionData["parameters"] = params
		}

		// Attributes
		attrs := make(map[string][]string)
		for _, attr := range section.Attributes {
			values := make([]string, 0, len(attr.Values))
			for _, v := range attr.Values {
				values = append(values, v.Name)
			}
			attrs[attr.Name] = values
		}
		if len(attrs) > 0 {
			sectionData["attributes"] = attrs
		}

		if len(sectionData) > 0 {
			specs[section.Name] = sectionData
		}
	}
	product.TechnicalSpecs = specs

	return product
}

// ==================== SUPPLIER PRODUCTS HANDLERS ====================

// ListSupplierProducts handles GET /api/admin/suppliers/:id/products
func ListSupplierProducts(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
		search := c.Query("search")
		category := c.Query("category")
		brand := c.Query("brand")

		filter := models.SupplierProductFilter{
			SupplierID: supplierID,
			Limit:      limit,
			Offset:     offset,
			Search:     search,
			Category:   category,
			Brand:      brand,
		}

		products, total, err := db.ListSupplierProducts(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    products,
			"total":   total,
			"limit":   limit,
			"offset":  offset,
		})
	}
}

// GetSupplierProduct handles GET /api/admin/suppliers/:id/products/:productId
func GetSupplierProduct(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		productID, err := uuid.Parse(c.Param("productId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid product ID"})
			return
		}

		product, err := db.GetSupplierProduct(ctx, productID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if product == nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Product not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": product})
	}
}

// ==================== SUPPLIER CATEGORIES HANDLERS ====================

// ListSupplierCategories handles GET /api/admin/suppliers/:id/categories
func ListSupplierCategories(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		categories, err := db.ListSupplierCategories(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		// Build tree structure
		tree := buildSupplierCategoryTree(categories)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    tree,
			"flat":    categories,
		})
	}
}

// buildSupplierCategoryTree builds a hierarchical tree from flat supplier categories
func buildSupplierCategoryTree(categories []*models.SupplierCategory) []*models.SupplierCategoryTree {
	catMap := make(map[string]*models.SupplierCategoryTree)
	for _, cat := range categories {
		catMap[cat.ExternalID] = &models.SupplierCategoryTree{
			SupplierCategory: cat,
			Children:         make([]*models.SupplierCategoryTree, 0),
		}
	}
	roots := make([]*models.SupplierCategoryTree, 0)
	for _, cat := range categories {
		node := catMap[cat.ExternalID]
		if cat.ParentExternalID == "" {
			roots = append(roots, node)
		} else if parent, ok := catMap[cat.ParentExternalID]; ok {
			parent.Children = append(parent.Children, node)
		} else {
			roots = append(roots, node)
		}
	}
	return roots
}

// ListSupplierBrands handles GET /api/admin/suppliers/:id/brands
func ListSupplierBrands(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		brands, err := db.ListSupplierBrands(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "data": brands})
	}
}

// ==================== PREVIEW FEED ====================

// PreviewFeed handles POST /api/admin/suppliers/:id/preview
// Returns sample data from the stored feed without importing
func PreviewFeed(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid supplier ID"})
			return
		}

		// Get current feed
		storedFeed, err := db.GetCurrentFeed(ctx, supplierID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		if storedFeed == nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "No feed available"})
			return
		}

		// Open and parse
		file, err := os.Open(storedFeed.FilePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to open feed file"})
			return
		}
		defer file.Close()

		var catalog ActionCatalog
		decoder := xml.NewDecoder(file)
		if err := decoder.Decode(&catalog); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to parse XML"})
			return
		}

		// Get sample products (first 10)
		sampleProducts := catalog.Products.Products
		if len(sampleProducts) > 10 {
			sampleProducts = sampleProducts[:10]
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"total_categories":  len(catalog.Categories.MainCategories),
				"total_producers":   len(catalog.Producers.Producers),
				"total_products":    len(catalog.Products.Products),
				"sample_categories": catalog.Categories.MainCategories[:min(5, len(catalog.Categories.MainCategories))],
				"sample_producers":  catalog.Producers.Producers[:min(10, len(catalog.Producers.Producers))],
				"sample_products":   sampleProducts,
			},
		})
	}
}


