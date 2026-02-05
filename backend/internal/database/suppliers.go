package database

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"megashop/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ==================== SUPPLIERS ====================

// ListSuppliers returns all suppliers
func (p *Postgres) ListSuppliers(ctx context.Context) ([]*models.Supplier, error) {
	query := `
		SELECT s.id, s.name, s.code, 
			   COALESCE(s.description, ''), COALESCE(s.website, ''), COALESCE(s.logo, ''),
			   COALESCE(s.contact_email, ''), COALESCE(s.contact_phone, ''),
			   COALESCE(s.feed_url, ''), COALESCE(s.feed_type, 'xml'), COALESCE(s.feed_format, 'action'), 
			   COALESCE(s.xml_item_path, ''), COALESCE(s.category_separator, ''),
			   COALESCE(s.max_downloads_per_day, 8), COALESCE(s.download_count_today, 0), s.last_download_date,
			   COALESCE(s.auth_type, 'none'), COALESCE(s.auth_credentials, '{}'), 
			   COALESCE(s.is_active, true), COALESCE(s.priority, 0), COALESCE(s.field_mappings, '{}'),
			   s.created_at, s.updated_at,
			   COALESCE((SELECT COUNT(*) FROM supplier_products sp WHERE sp.supplier_id = s.id), 0) as product_count
		FROM suppliers s
		ORDER BY s.priority DESC, s.name ASC
	`

	rows, err := p.pool.Query(ctx, query)
	if err != nil {
		fmt.Printf("[DEBUG] ListSuppliers query error: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var suppliers []*models.Supplier
	for rows.Next() {
		var s models.Supplier
		var productCount int
		err := rows.Scan(
			&s.ID, &s.Name, &s.Code, &s.Description, &s.Website, &s.Logo,
			&s.ContactEmail, &s.ContactPhone,
			&s.FeedURL, &s.FeedType, &s.FeedFormat, &s.XMLItemPath, &s.CategorySeparator,
			&s.MaxDownloadsPerDay, &s.DownloadCountToday, &s.LastDownloadDate,
			&s.AuthType, &s.AuthCredentials, &s.IsActive, &s.Priority, &s.FieldMappings,
			&s.CreatedAt, &s.UpdatedAt,
			&productCount,
		)
		if err != nil {
			fmt.Printf("[DEBUG] ListSuppliers scan error: %v\n", err)
			return nil, err
		}
		s.ProductCount = productCount
		// Load current feed for this supplier
		s.CurrentFeed, _ = p.GetCurrentFeed(ctx, s.ID)
		suppliers = append(suppliers, &s)
	}

	fmt.Printf("[DEBUG] ListSuppliers: found %d suppliers\n", len(suppliers))
	return suppliers, nil
}

// GetSupplier returns a supplier by ID
func (p *Postgres) GetSupplier(ctx context.Context, id uuid.UUID) (*models.Supplier, error) {
	query := `
		SELECT s.id, s.name, s.code,
			   COALESCE(s.description, ''), COALESCE(s.website, ''), COALESCE(s.logo, ''),
			   COALESCE(s.contact_email, ''), COALESCE(s.contact_phone, ''),
			   COALESCE(s.feed_url, ''), COALESCE(s.feed_type, 'xml'), COALESCE(s.feed_format, 'action'),
			   COALESCE(s.xml_item_path, ''), COALESCE(s.category_separator, ''),
			   COALESCE(s.max_downloads_per_day, 8), COALESCE(s.download_count_today, 0), s.last_download_date,
			   COALESCE(s.auth_type, 'none'), COALESCE(s.auth_credentials, '{}'),
			   COALESCE(s.is_active, true), COALESCE(s.priority, 0), COALESCE(s.field_mappings, '{}'),
			   s.created_at, s.updated_at,
			   COALESCE((SELECT COUNT(*) FROM supplier_products sp WHERE sp.supplier_id = s.id), 0) as product_count
		FROM suppliers s
		WHERE s.id = $1
	`

	var s models.Supplier
	var productCount int
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Code, &s.Description, &s.Website, &s.Logo,
		&s.ContactEmail, &s.ContactPhone,
		&s.FeedURL, &s.FeedType, &s.FeedFormat, &s.XMLItemPath, &s.CategorySeparator,
		&s.MaxDownloadsPerDay, &s.DownloadCountToday, &s.LastDownloadDate,
		&s.AuthType, &s.AuthCredentials, &s.IsActive, &s.Priority, &s.FieldMappings,
		&s.CreatedAt, &s.UpdatedAt,
		&productCount,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.ProductCount = productCount

	// Get current feed
	s.CurrentFeed, _ = p.GetCurrentFeed(ctx, id)

	return &s, nil
}

// GetSupplierByCode returns a supplier by code
func (p *Postgres) GetSupplierByCode(ctx context.Context, code string) (*models.Supplier, error) {
	query := `SELECT id FROM suppliers WHERE code = $1`
	var id uuid.UUID
	err := p.pool.QueryRow(ctx, query, code).Scan(&id)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p.GetSupplier(ctx, id)
}

// CreateSupplier creates a new supplier
func (p *Postgres) CreateSupplier(ctx context.Context, s *models.Supplier) error {
	query := `
		INSERT INTO suppliers (
			id, name, code, description, website, logo, contact_email, contact_phone,
			feed_url, feed_type, feed_format, xml_item_path, category_separator,
			max_downloads_per_day, download_count_today, last_download_date,
			auth_type, auth_credentials, is_active, priority, field_mappings,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15, $16,
			$17, $18, $19, $20, $21,
			$22, $23
		)
	`

	_, err := p.pool.Exec(ctx, query,
		s.ID, s.Name, s.Code, s.Description, s.Website, s.Logo, s.ContactEmail, s.ContactPhone,
		s.FeedURL, s.FeedType, s.FeedFormat, s.XMLItemPath, s.CategorySeparator,
		s.MaxDownloadsPerDay, s.DownloadCountToday, s.LastDownloadDate,
		s.AuthType, s.AuthCredentials, s.IsActive, s.Priority, s.FieldMappings,
		s.CreatedAt, s.UpdatedAt,
	)

	return err
}

// UpdateSupplier updates a supplier
func (p *Postgres) UpdateSupplier(ctx context.Context, s *models.Supplier) error {
	query := `
		UPDATE suppliers SET
			name = $2, description = $3, website = $4, logo = $5,
			contact_email = $6, contact_phone = $7,
			feed_url = $8, feed_type = $9, feed_format = $10, xml_item_path = $11, category_separator = $12,
			max_downloads_per_day = $13,
			auth_type = $14, auth_credentials = $15, is_active = $16, priority = $17, field_mappings = $18,
			updated_at = $19
		WHERE id = $1
	`

	_, err := p.pool.Exec(ctx, query,
		s.ID, s.Name, s.Description, s.Website, s.Logo,
		s.ContactEmail, s.ContactPhone,
		s.FeedURL, s.FeedType, s.FeedFormat, s.XMLItemPath, s.CategorySeparator,
		s.MaxDownloadsPerDay,
		s.AuthType, s.AuthCredentials, s.IsActive, s.Priority, s.FieldMappings,
		s.UpdatedAt,
	)

	return err
}

// DeleteSupplier deletes a supplier
func (p *Postgres) DeleteSupplier(ctx context.Context, id uuid.UUID) error {
	_, err := p.pool.Exec(ctx, "DELETE FROM suppliers WHERE id = $1", id)
	return err
}

// CanSupplierDownload checks if supplier can download based on daily limit
func (p *Postgres) CanSupplierDownload(ctx context.Context, supplierID uuid.UUID) (bool, error) {
	query := `
		SELECT 
			download_count_today,
			max_downloads_per_day,
			last_download_date
		FROM suppliers WHERE id = $1
	`

	var count, max int
	var lastDate *time.Time
	err := p.pool.QueryRow(ctx, query, supplierID).Scan(&count, &max, &lastDate)
	if err != nil {
		return false, err
	}

	// Reset if new day
	if lastDate == nil || lastDate.Before(time.Now().Truncate(24*time.Hour)) {
		return true, nil
	}

	return count < max, nil
}

// IncrementSupplierDownload increments the download counter
func (p *Postgres) IncrementSupplierDownload(ctx context.Context, supplierID uuid.UUID) error {
	query := `
		UPDATE suppliers SET
			download_count_today = CASE 
				WHEN last_download_date < CURRENT_DATE OR last_download_date IS NULL THEN 1
				ELSE download_count_today + 1
			END,
			last_download_date = CURRENT_DATE
		WHERE id = $1
	`

	_, err := p.pool.Exec(ctx, query, supplierID)
	return err
}

// ==================== STORED FEEDS ====================

// ListStoredFeeds returns all stored feeds for a supplier
func (p *Postgres) ListStoredFeeds(ctx context.Context, supplierID uuid.UUID) ([]*models.StoredFeed, error) {
	query := `
		SELECT id, supplier_id, filename, file_path, file_size, file_hash, content_type,
			   downloaded_at, download_duration_ms, source_url,
			   total_products, total_categories, total_brands,
			   status, error_message, is_current, expires_at, created_at
		FROM stored_feeds
		WHERE supplier_id = $1
		ORDER BY downloaded_at DESC
		LIMIT 50
	`

	rows, err := p.pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feeds []*models.StoredFeed
	for rows.Next() {
		var f models.StoredFeed
		err := rows.Scan(
			&f.ID, &f.SupplierID, &f.Filename, &f.FilePath, &f.FileSize, &f.FileHash, &f.ContentType,
			&f.DownloadedAt, &f.DownloadDuration, &f.SourceURL,
			&f.TotalProducts, &f.TotalCategories, &f.TotalBrands,
			&f.Status, &f.ErrorMessage, &f.IsCurrent, &f.ExpiresAt, &f.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		feeds = append(feeds, &f)
	}

	return feeds, nil
}

// GetStoredFeed returns a stored feed by ID
func (p *Postgres) GetStoredFeed(ctx context.Context, id uuid.UUID) (*models.StoredFeed, error) {
	query := `
		SELECT id, supplier_id, filename, file_path, file_size, file_hash, content_type,
			   downloaded_at, download_duration_ms, source_url,
			   total_products, total_categories, total_brands,
			   status, error_message, is_current, expires_at, created_at
		FROM stored_feeds
		WHERE id = $1
	`

	var f models.StoredFeed
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.SupplierID, &f.Filename, &f.FilePath, &f.FileSize, &f.FileHash, &f.ContentType,
		&f.DownloadedAt, &f.DownloadDuration, &f.SourceURL,
		&f.TotalProducts, &f.TotalCategories, &f.TotalBrands,
		&f.Status, &f.ErrorMessage, &f.IsCurrent, &f.ExpiresAt, &f.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &f, nil
}

// GetCurrentFeed returns the current (active) feed for a supplier
func (p *Postgres) GetCurrentFeed(ctx context.Context, supplierID uuid.UUID) (*models.StoredFeed, error) {
	query := `
		SELECT id, supplier_id, filename, file_path, file_size, file_hash, content_type,
			   downloaded_at, download_duration_ms, source_url,
			   total_products, total_categories, total_brands,
			   status, error_message, is_current, expires_at, created_at
		FROM stored_feeds
		WHERE supplier_id = $1 AND is_current = true
		ORDER BY downloaded_at DESC
		LIMIT 1
	`

	var f models.StoredFeed
	err := p.pool.QueryRow(ctx, query, supplierID).Scan(
		&f.ID, &f.SupplierID, &f.Filename, &f.FilePath, &f.FileSize, &f.FileHash, &f.ContentType,
		&f.DownloadedAt, &f.DownloadDuration, &f.SourceURL,
		&f.TotalProducts, &f.TotalCategories, &f.TotalBrands,
		&f.Status, &f.ErrorMessage, &f.IsCurrent, &f.ExpiresAt, &f.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &f, nil
}

// CreateStoredFeed creates a new stored feed record
func (p *Postgres) CreateStoredFeed(ctx context.Context, f *models.StoredFeed) error {
	query := `
		INSERT INTO stored_feeds (
			id, supplier_id, filename, file_path, file_size, file_hash, content_type,
			downloaded_at, download_duration_ms, source_url,
			total_products, total_categories, total_brands,
			status, error_message, is_current, expires_at, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10,
			$11, $12, $13,
			$14, $15, $16, $17, $18
		)
	`

	_, err := p.pool.Exec(ctx, query,
		f.ID, f.SupplierID, f.Filename, f.FilePath, f.FileSize, f.FileHash, f.ContentType,
		f.DownloadedAt, f.DownloadDuration, f.SourceURL,
		f.TotalProducts, f.TotalCategories, f.TotalBrands,
		f.Status, f.ErrorMessage, f.IsCurrent, f.ExpiresAt, f.CreatedAt,
	)

	return err
}

// UpdateStoredFeed updates a stored feed record
func (p *Postgres) UpdateStoredFeed(ctx context.Context, f *models.StoredFeed) error {
	query := `
		UPDATE stored_feeds SET
			total_products = $2, total_categories = $3, total_brands = $4,
			status = $5, error_message = $6, is_current = $7
		WHERE id = $1
	`

	_, err := p.pool.Exec(ctx, query,
		f.ID, f.TotalProducts, f.TotalCategories, f.TotalBrands,
		f.Status, f.ErrorMessage, f.IsCurrent,
	)

	return err
}

// MarkFeedsNotCurrent marks all feeds for a supplier as not current
func (p *Postgres) MarkFeedsNotCurrent(ctx context.Context, supplierID uuid.UUID) error {
	_, err := p.pool.Exec(ctx, "UPDATE stored_feeds SET is_current = false WHERE supplier_id = $1", supplierID)
	return err
}

// DeleteStoredFeed deletes a stored feed record
func (p *Postgres) DeleteStoredFeed(ctx context.Context, id uuid.UUID) error {
	_, err := p.pool.Exec(ctx, "DELETE FROM stored_feeds WHERE id = $1", id)
	return err
}

// ==================== FEED IMPORTS ====================

// CreateFeedImport creates a new feed import record
func (p *Postgres) CreateFeedImport(ctx context.Context, f *models.FeedImport) error {
	logsJSON, _ := json.Marshal(f.Logs)

	query := `
		INSERT INTO feed_imports (
			id, supplier_id, stored_feed_id,
			started_at, finished_at, duration_ms,
			total_items, processed, created, updated, skipped, errors,
			categories_created, categories_updated, brands_created,
			status, progress_percent, current_item, error_message,
			triggered_by, user_id, logs, created_at
		) VALUES (
			$1, $2, $3,
			$4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15,
			$16, $17, $18, $19,
			$20, $21, $22, $23
		)
	`

	_, err := p.pool.Exec(ctx, query,
		f.ID, f.SupplierID, f.StoredFeedID,
		f.StartedAt, f.FinishedAt, f.DurationMs,
		f.TotalItems, f.Processed, f.Created, f.Updated, f.Skipped, f.Errors,
		f.CategoriesCreated, f.CategoriesUpdated, f.BrandsCreated,
		f.Status, f.ProgressPercent, f.CurrentItem, f.ErrorMessage,
		f.TriggeredBy, f.UserID, logsJSON, f.CreatedAt,
	)

	return err
}

// UpdateFeedImport updates a feed import record
func (p *Postgres) UpdateFeedImport(ctx context.Context, f *models.FeedImport) error {
	logsJSON, _ := json.Marshal(f.Logs)

	query := `
		UPDATE feed_imports SET
			finished_at = $2, duration_ms = $3,
			total_items = $4, processed = $5, created = $6, updated = $7, skipped = $8, errors = $9,
			categories_created = $10, categories_updated = $11, brands_created = $12,
			status = $13, progress_percent = $14, current_item = $15, error_message = $16,
			logs = $17
		WHERE id = $1
	`

	_, err := p.pool.Exec(ctx, query,
		f.ID, f.FinishedAt, f.DurationMs,
		f.TotalItems, f.Processed, f.Created, f.Updated, f.Skipped, f.Errors,
		f.CategoriesCreated, f.CategoriesUpdated, f.BrandsCreated,
		f.Status, f.ProgressPercent, f.CurrentItem, f.ErrorMessage,
		logsJSON,
	)

	return err
}

// GetFeedImport returns a feed import by ID
func (p *Postgres) GetFeedImport(ctx context.Context, id uuid.UUID) (*models.FeedImport, error) {
	query := `
		SELECT id, supplier_id, stored_feed_id,
			   started_at, finished_at, duration_ms,
			   total_items, processed, created, updated, skipped, errors,
			   categories_created, categories_updated, brands_created,
			   status, progress_percent, current_item, error_message,
			   triggered_by, user_id, logs, created_at
		FROM feed_imports
		WHERE id = $1
	`

	var f models.FeedImport
	var logsJSON []byte
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.SupplierID, &f.StoredFeedID,
		&f.StartedAt, &f.FinishedAt, &f.DurationMs,
		&f.TotalItems, &f.Processed, &f.Created, &f.Updated, &f.Skipped, &f.Errors,
		&f.CategoriesCreated, &f.CategoriesUpdated, &f.BrandsCreated,
		&f.Status, &f.ProgressPercent, &f.CurrentItem, &f.ErrorMessage,
		&f.TriggeredBy, &f.UserID, &logsJSON, &f.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(logsJSON, &f.Logs)
	return &f, nil
}

// ListFeedImports returns feed imports for a supplier
func (p *Postgres) ListFeedImports(ctx context.Context, supplierID uuid.UUID, limit, offset int) ([]*models.FeedImport, error) {
	query := `
		SELECT id, supplier_id, stored_feed_id,
			   started_at, finished_at, duration_ms,
			   total_items, processed, created, updated, skipped, errors,
			   categories_created, categories_updated, brands_created,
			   status, progress_percent, current_item, error_message,
			   triggered_by, user_id, logs, created_at
		FROM feed_imports
		WHERE supplier_id = $1
		ORDER BY started_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := p.pool.Query(ctx, query, supplierID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var imports []*models.FeedImport
	for rows.Next() {
		var f models.FeedImport
		var logsJSON []byte
		err := rows.Scan(
			&f.ID, &f.SupplierID, &f.StoredFeedID,
			&f.StartedAt, &f.FinishedAt, &f.DurationMs,
			&f.TotalItems, &f.Processed, &f.Created, &f.Updated, &f.Skipped, &f.Errors,
			&f.CategoriesCreated, &f.CategoriesUpdated, &f.BrandsCreated,
			&f.Status, &f.ProgressPercent, &f.CurrentItem, &f.ErrorMessage,
			&f.TriggeredBy, &f.UserID, &logsJSON, &f.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		json.Unmarshal(logsJSON, &f.Logs)
		imports = append(imports, &f)
	}

	return imports, nil
}

// ==================== SUPPLIER PRODUCTS ====================

// UpsertSupplierProduct creates or updates a supplier product
func (p *Postgres) UpsertSupplierProduct(ctx context.Context, product *models.SupplierProduct) (bool, error) {
	// Convert complex fields to JSON
	imagesJSON, _ := json.Marshal(product.Images)
	multimediaJSON, _ := json.Marshal(product.Multimedia)
	specsJSON, _ := json.Marshal(product.TechnicalSpecs)

	query := `
		INSERT INTO supplier_products (
			id, supplier_id, external_id, ean, manufacturer_part_number,
			name, description,
			price_net, price_vat, vat_rate, srp,
			stock, stock_status, on_order, additional_availability_info, shipping_time_hours, eta, incoming_stock,
			main_category_tree, category_tree, sub_category_tree, category_id_external,
			producer_id_external, producer_name,
			images, multimedia, technical_specs,
			weight, weight_unit, width, length, height, size_unit, dimensional_weight,
			special_offer, is_large, small_pallet,
			warranty, date_added, product_id, raw_data,
			last_seen_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7,
			$8, $9, $10, $11,
			$12, $13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22,
			$23, $24,
			$25, $26, $27,
			$28, $29, $30, $31, $32, $33, $34,
			$35, $36, $37,
			$38, $39, $40, $41,
			$42, $43, $44
		)
		ON CONFLICT (supplier_id, external_id) DO UPDATE SET
			ean = EXCLUDED.ean,
			manufacturer_part_number = EXCLUDED.manufacturer_part_number,
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			price_net = EXCLUDED.price_net,
			price_vat = EXCLUDED.price_vat,
			vat_rate = EXCLUDED.vat_rate,
			srp = EXCLUDED.srp,
			stock = EXCLUDED.stock,
			stock_status = EXCLUDED.stock_status,
			on_order = EXCLUDED.on_order,
			additional_availability_info = EXCLUDED.additional_availability_info,
			shipping_time_hours = EXCLUDED.shipping_time_hours,
			eta = EXCLUDED.eta,
			incoming_stock = EXCLUDED.incoming_stock,
			main_category_tree = EXCLUDED.main_category_tree,
			category_tree = EXCLUDED.category_tree,
			sub_category_tree = EXCLUDED.sub_category_tree,
			category_id_external = EXCLUDED.category_id_external,
			producer_id_external = EXCLUDED.producer_id_external,
			producer_name = EXCLUDED.producer_name,
			images = EXCLUDED.images,
			multimedia = EXCLUDED.multimedia,
			technical_specs = EXCLUDED.technical_specs,
			weight = EXCLUDED.weight,
			weight_unit = EXCLUDED.weight_unit,
			width = EXCLUDED.width,
			length = EXCLUDED.length,
			height = EXCLUDED.height,
			size_unit = EXCLUDED.size_unit,
			dimensional_weight = EXCLUDED.dimensional_weight,
			special_offer = EXCLUDED.special_offer,
			is_large = EXCLUDED.is_large,
			small_pallet = EXCLUDED.small_pallet,
			warranty = EXCLUDED.warranty,
			date_added = EXCLUDED.date_added,
			last_seen_at = EXCLUDED.last_seen_at,
			updated_at = EXCLUDED.updated_at
		RETURNING (xmax = 0) as is_new
	`

	var isNew bool
	err := p.pool.QueryRow(ctx, query,
		product.ID, product.SupplierID, product.ExternalID, product.EAN, product.ManufacturerPartNumber,
		product.Name, product.Description,
		product.PriceNet, product.PriceVAT, product.VATRate, product.SRP,
		product.Stock, product.StockStatus, product.OnOrder, product.AdditionalAvailabilityInfo, product.ShippingTimeHours, product.ETA, product.IncomingStock,
		product.MainCategoryTree, product.CategoryTree, product.SubCategoryTree, product.CategoryIDExternal,
		product.ProducerIDExternal, product.ProducerName,
		imagesJSON, multimediaJSON, specsJSON,
		product.Weight, product.WeightUnit, product.Width, product.Length, product.Height, product.SizeUnit, product.DimensionalWeight,
		product.SpecialOffer, product.IsLarge, product.SmallPallet,
		product.Warranty, product.DateAdded, product.ProductID, product.RawData,
		product.LastSeenAt, product.CreatedAt, product.UpdatedAt,
	).Scan(&isNew)

	return isNew, err
}

// GetSupplierProduct returns a supplier product by ID
func (p *Postgres) GetSupplierProduct(ctx context.Context, id uuid.UUID) (*models.SupplierProduct, error) {
	query := `
		SELECT id, supplier_id, external_id, ean, manufacturer_part_number,
			   name, description,
			   price_net, price_vat, vat_rate, srp,
			   stock, stock_status, on_order, additional_availability_info, shipping_time_hours, eta, incoming_stock,
			   main_category_tree, category_tree, sub_category_tree, category_id_external,
			   producer_id_external, producer_name,
			   images, multimedia, technical_specs,
			   weight, weight_unit, width, length, height, size_unit, dimensional_weight,
			   special_offer, is_large, small_pallet,
			   warranty, date_added, product_id, raw_data,
			   last_seen_at, created_at, updated_at
		FROM supplier_products
		WHERE id = $1
	`

	var p2 models.SupplierProduct
	var imagesJSON, multimediaJSON, specsJSON []byte
	err := p.pool.QueryRow(ctx, query, id).Scan(
		&p2.ID, &p2.SupplierID, &p2.ExternalID, &p2.EAN, &p2.ManufacturerPartNumber,
		&p2.Name, &p2.Description,
		&p2.PriceNet, &p2.PriceVAT, &p2.VATRate, &p2.SRP,
		&p2.Stock, &p2.StockStatus, &p2.OnOrder, &p2.AdditionalAvailabilityInfo, &p2.ShippingTimeHours, &p2.ETA, &p2.IncomingStock,
		&p2.MainCategoryTree, &p2.CategoryTree, &p2.SubCategoryTree, &p2.CategoryIDExternal,
		&p2.ProducerIDExternal, &p2.ProducerName,
		&imagesJSON, &multimediaJSON, &specsJSON,
		&p2.Weight, &p2.WeightUnit, &p2.Width, &p2.Length, &p2.Height, &p2.SizeUnit, &p2.DimensionalWeight,
		&p2.SpecialOffer, &p2.IsLarge, &p2.SmallPallet,
		&p2.Warranty, &p2.DateAdded, &p2.ProductID, &p2.RawData,
		&p2.LastSeenAt, &p2.CreatedAt, &p2.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(imagesJSON, &p2.Images)
	json.Unmarshal(multimediaJSON, &p2.Multimedia)
	json.Unmarshal(specsJSON, &p2.TechnicalSpecs)

	return &p2, nil
}

// ListSupplierProducts returns supplier products with filtering
func (p *Postgres) ListSupplierProducts(ctx context.Context, filter models.SupplierProductFilter) ([]*models.SupplierProduct, int, error) {
	var conditions []string
	var args []interface{}
	argNum := 1

	conditions = append(conditions, fmt.Sprintf("supplier_id = $%d", argNum))
	args = append(args, filter.SupplierID)
	argNum++

	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR ean ILIKE $%d OR external_id ILIKE $%d)", argNum, argNum, argNum))
		args = append(args, "%"+filter.Search+"%")
		argNum++
	}

	if filter.Category != "" {
		conditions = append(conditions, fmt.Sprintf("(category_tree ILIKE $%d OR main_category_tree ILIKE $%d)", argNum, argNum))
		args = append(args, "%"+filter.Category+"%")
		argNum++
	}

	if filter.Brand != "" {
		conditions = append(conditions, fmt.Sprintf("producer_name ILIKE $%d", argNum))
		args = append(args, "%"+filter.Brand+"%")
		argNum++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM supplier_products WHERE %s", whereClause)
	var total int
	p.pool.QueryRow(ctx, countQuery, args...).Scan(&total)

	// Data query
	query := fmt.Sprintf(`
		SELECT id, supplier_id, external_id, ean, manufacturer_part_number,
			   name, description,
			   price_net, price_vat, vat_rate, srp,
			   stock, stock_status, on_order, additional_availability_info, shipping_time_hours, eta, incoming_stock,
			   main_category_tree, category_tree, sub_category_tree, category_id_external,
			   producer_id_external, producer_name,
			   images, multimedia, technical_specs,
			   weight, weight_unit, width, length, height, size_unit, dimensional_weight,
			   special_offer, is_large, small_pallet,
			   warranty, date_added, product_id, raw_data,
			   last_seen_at, created_at, updated_at
		FROM supplier_products
		WHERE %s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argNum, argNum+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := p.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []*models.SupplierProduct
	for rows.Next() {
		var p2 models.SupplierProduct
		var imagesJSON, multimediaJSON, specsJSON []byte
		err := rows.Scan(
			&p2.ID, &p2.SupplierID, &p2.ExternalID, &p2.EAN, &p2.ManufacturerPartNumber,
			&p2.Name, &p2.Description,
			&p2.PriceNet, &p2.PriceVAT, &p2.VATRate, &p2.SRP,
			&p2.Stock, &p2.StockStatus, &p2.OnOrder, &p2.AdditionalAvailabilityInfo, &p2.ShippingTimeHours, &p2.ETA, &p2.IncomingStock,
			&p2.MainCategoryTree, &p2.CategoryTree, &p2.SubCategoryTree, &p2.CategoryIDExternal,
			&p2.ProducerIDExternal, &p2.ProducerName,
			&imagesJSON, &multimediaJSON, &specsJSON,
			&p2.Weight, &p2.WeightUnit, &p2.Width, &p2.Length, &p2.Height, &p2.SizeUnit, &p2.DimensionalWeight,
			&p2.SpecialOffer, &p2.IsLarge, &p2.SmallPallet,
			&p2.Warranty, &p2.DateAdded, &p2.ProductID, &p2.RawData,
			&p2.LastSeenAt, &p2.CreatedAt, &p2.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		json.Unmarshal(imagesJSON, &p2.Images)
		json.Unmarshal(multimediaJSON, &p2.Multimedia)
		json.Unmarshal(specsJSON, &p2.TechnicalSpecs)

		products = append(products, &p2)
	}

	return products, total, nil
}

// ==================== SUPPLIER CATEGORIES ====================

// UpsertSupplierCategory creates or updates a supplier category
func (p *Postgres) UpsertSupplierCategory(ctx context.Context, cat *models.SupplierCategory) error {
	query := `
		INSERT INTO supplier_categories (
			id, supplier_id, external_id, parent_external_id, name, full_path,
			category_id, product_count, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (supplier_id, external_id) DO UPDATE SET
			parent_external_id = EXCLUDED.parent_external_id,
			name = EXCLUDED.name,
			full_path = EXCLUDED.full_path,
			updated_at = EXCLUDED.updated_at
	`

	_, err := p.pool.Exec(ctx, query,
		cat.ID, cat.SupplierID, cat.ExternalID, cat.ParentExternalID, cat.Name, cat.FullPath,
		cat.CategoryID, cat.ProductCount, cat.CreatedAt, cat.UpdatedAt,
	)

	return err
}

// ListSupplierCategories returns all categories for a supplier
func (p *Postgres) ListSupplierCategories(ctx context.Context, supplierID uuid.UUID) ([]*models.SupplierCategory, error) {
	query := `
		SELECT id, supplier_id, external_id, parent_external_id, name, full_path,
			   category_id, product_count, created_at, updated_at
		FROM supplier_categories
		WHERE supplier_id = $1
		ORDER BY full_path ASC
	`

	rows, err := p.pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*models.SupplierCategory
	for rows.Next() {
		var c models.SupplierCategory
		err := rows.Scan(
			&c.ID, &c.SupplierID, &c.ExternalID, &c.ParentExternalID, &c.Name, &c.FullPath,
			&c.CategoryID, &c.ProductCount, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		categories = append(categories, &c)
	}

	return categories, nil
}

// ==================== SUPPLIER BRANDS ====================

// UpsertSupplierBrand creates or updates a supplier brand
func (p *Postgres) UpsertSupplierBrand(ctx context.Context, brand *models.SupplierBrand) error {
	query := `
		INSERT INTO supplier_brands (
			id, supplier_id, external_id, name, brand_id, product_count, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (supplier_id, external_id) DO UPDATE SET
			name = EXCLUDED.name,
			updated_at = EXCLUDED.updated_at
	`

	_, err := p.pool.Exec(ctx, query,
		brand.ID, brand.SupplierID, brand.ExternalID, brand.Name, brand.BrandID, brand.ProductCount, brand.CreatedAt, brand.UpdatedAt,
	)

	return err
}

// ListSupplierBrands returns all brands for a supplier
func (p *Postgres) ListSupplierBrands(ctx context.Context, supplierID uuid.UUID) ([]*models.SupplierBrand, error) {
	query := `
		SELECT id, supplier_id, external_id, name, brand_id, product_count, created_at, updated_at
		FROM supplier_brands
		WHERE supplier_id = $1
		ORDER BY name ASC
	`

	rows, err := p.pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brands []*models.SupplierBrand
	for rows.Next() {
		var b models.SupplierBrand
		err := rows.Scan(
			&b.ID, &b.SupplierID, &b.ExternalID, &b.Name, &b.BrandID, &b.ProductCount, &b.CreatedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		brands = append(brands, &b)
	}

	return brands, nil
}

// GetUnlinkedSupplierProducts returns supplier products not yet linked to main catalog
func (p *Postgres) GetUnlinkedSupplierProducts(ctx context.Context, supplierID uuid.UUID) ([]*models.SupplierProduct, error) {
	query := `
		SELECT id, supplier_id, external_id, ean, manufacturer_part_number,
			   name, description,
			   COALESCE(price_net, 0), COALESCE(price_vat, 0), COALESCE(vat_rate, 0), COALESCE(srp, 0),
			   COALESCE(stock, 0), COALESCE(stock_status, ''), COALESCE(on_order, false),
			   COALESCE(main_category_tree, ''), COALESCE(category_tree, ''), COALESCE(sub_category_tree, ''),
			   COALESCE(producer_id_external, ''), COALESCE(producer_name, ''),
			   COALESCE(images, '[]'), COALESCE(technical_specs, '{}'),
			   COALESCE(weight, 0)
		FROM supplier_products
		WHERE supplier_id = $1 AND linked_product_id IS NULL
		ORDER BY name
	`
	
	rows, err := p.pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var products []*models.SupplierProduct
	for rows.Next() {
		var sp models.SupplierProduct
		var imagesJSON, specsJSON []byte
		
		err := rows.Scan(
			&sp.ID, &sp.SupplierID, &sp.ExternalID, &sp.EAN, &sp.ManufacturerPartNumber,
			&sp.Name, &sp.Description,
			&sp.PriceNet, &sp.PriceVAT, &sp.VATRate, &sp.SRP,
			&sp.Stock, &sp.StockStatus, &sp.OnOrder,
			&sp.MainCategoryTree, &sp.CategoryTree, &sp.SubCategoryTree,
			&sp.ProducerIDExternal, &sp.ProducerName,
			&imagesJSON, &specsJSON,
			&sp.Weight,
		)
		if err != nil {
			return nil, err
		}
		
		json.Unmarshal(imagesJSON, &sp.Images)
		json.Unmarshal(specsJSON, &sp.TechnicalSpecs)
		
		products = append(products, &sp)
	}
	
	return products, nil
}

// GetOrCreateCategoryByPath finds or creates category hierarchy with proper parent relationships
func (p *Postgres) GetOrCreateCategoryByPath(ctx context.Context, main, sub, subsub string) (*models.Category, error) {
	if main == "" {
		return nil, nil
	}

	// Helper to generate slug
	makeSlug := func(name string) string {
		slug := strings.ToLower(name)
		replacements := map[string]string{
			" ": "-", "á": "a", "ä": "a", "č": "c", "ď": "d", "é": "e", "ě": "e",
			"í": "i", "ľ": "l", "ĺ": "l", "ň": "n", "ó": "o", "ô": "o", "ö": "o",
			"ŕ": "r", "ř": "r", "š": "s", "ť": "t", "ú": "u", "ů": "u", "ü": "u",
			"ý": "y", "ž": "z", "&": "-and-", "/": "-", "\\": "-", ",": "", "'": "",
		}
		for old, new := range replacements {
			slug = strings.ReplaceAll(slug, old, new)
		}
		return slug
	}

	// 1. Get or create main category
	var mainCat models.Category
	mainSlug := makeSlug(main)
	err := p.pool.QueryRow(ctx, `SELECT id, name, slug, parent_id FROM categories WHERE slug = $1`, mainSlug).Scan(&mainCat.ID, &mainCat.Name, &mainCat.Slug, &mainCat.ParentID)
	if err != nil {
		// Create main category
		mainCat.ID = uuid.New()
		mainCat.Name = main
		mainCat.Slug = mainSlug
		_, err = p.pool.Exec(ctx, `
			INSERT INTO categories (id, name, slug, parent_id, created_at, updated_at)
			VALUES ($1, $2, $3, NULL, NOW(), NOW())
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		`, mainCat.ID, mainCat.Name, mainCat.Slug)
		if err != nil {
			return nil, fmt.Errorf("create main category: %w", err)
		}
	}

	// If no sub category, return main
	if sub == "" {
		return &mainCat, nil
	}

	// 2. Get or create sub category
	var subCat models.Category
	subSlug := makeSlug(sub)
	err = p.pool.QueryRow(ctx, `SELECT id, name, slug, parent_id FROM categories WHERE slug = $1`, subSlug).Scan(&subCat.ID, &subCat.Name, &subCat.Slug, &subCat.ParentID)
	if err != nil {
		// Create sub category with parent
		subCat.ID = uuid.New()
		subCat.Name = sub
		subCat.Slug = subSlug
		subCat.ParentID = &mainCat.ID
		_, err = p.pool.Exec(ctx, `
			INSERT INTO categories (id, name, slug, parent_id, created_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = COALESCE(categories.parent_id, EXCLUDED.parent_id), updated_at = NOW()
		`, subCat.ID, subCat.Name, subCat.Slug, subCat.ParentID)
		if err != nil {
			return nil, fmt.Errorf("create sub category: %w", err)
		}
	}

	// If no subsub category, return sub
	if subsub == "" {
		return &subCat, nil
	}

	// 3. Get or create subsub category
	var subsubCat models.Category
	subsubSlug := makeSlug(subsub)
	err = p.pool.QueryRow(ctx, `SELECT id, name, slug, parent_id FROM categories WHERE slug = $1`, subsubSlug).Scan(&subsubCat.ID, &subsubCat.Name, &subsubCat.Slug, &subsubCat.ParentID)
	if err != nil {
		// Create subsub category with parent
		subsubCat.ID = uuid.New()
		subsubCat.Name = subsub
		subsubCat.Slug = subsubSlug
		subsubCat.ParentID = &subCat.ID
		_, err = p.pool.Exec(ctx, `
			INSERT INTO categories (id, name, slug, parent_id, created_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = COALESCE(categories.parent_id, EXCLUDED.parent_id), updated_at = NOW()
		`, subsubCat.ID, subsubCat.Name, subsubCat.Slug, subsubCat.ParentID)
		if err != nil {
			return nil, fmt.Errorf("create subsub category: %w", err)
		}
	}

	return &subsubCat, nil
}

// GetOrCreateBrand finds or creates a brand
func (p *Postgres) GetOrCreateBrand(ctx context.Context, name string) (*models.Brand, error) {
	if name == "" {
		return nil, nil
	}
	
	var brand models.Brand
	err := p.pool.QueryRow(ctx, `SELECT id, name, slug FROM brands WHERE name = $1`, name).Scan(&brand.ID, &brand.Name, &brand.Slug)
	if err == nil {
		return &brand, nil
	}
	
	brand.ID = uuid.New()
	brand.Name = name
	brand.Slug = strings.ToLower(strings.ReplaceAll(name, " ", "-"))
	
	_, err = p.pool.Exec(ctx, `
		INSERT INTO brands (id, name, slug, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (slug) DO NOTHING
	`, brand.ID, brand.Name, brand.Slug)
	
	if err != nil {
		return nil, err
	}
	
	return &brand, nil
}

// UpsertProduct creates or updates a main catalog product
func (p *Postgres) UpsertProduct(ctx context.Context, product *models.Product) (bool, error) {
	// First check if product with this external_id exists
	var existingID uuid.UUID
	err := p.pool.QueryRow(ctx, `SELECT id FROM products WHERE external_id = $1`, product.ExternalID).Scan(&existingID)
	
	if err == nil {
		// Product exists - update it
		_, err = p.pool.Exec(ctx, `
			UPDATE products SET
				name = $1, description = $2, price = $3, sale_price = $4,
				stock = $5, category_id = $6, brand_id = $7, images = $8,
				attributes = $9, weight = $10, updated_at = NOW()
			WHERE id = $11
		`, product.Name, product.Description, product.Price, product.SalePrice,
			product.Stock, product.CategoryID, product.BrandID, product.Images,
			product.Attributes, product.Weight, existingID)
		
		if err != nil {
			return false, fmt.Errorf("update failed: %w", err)
		}
		product.ID = existingID
		return false, nil
	}
	
	// Product doesn't exist - insert it
	query := `
		INSERT INTO products (
			id, sku, slug, name, description, price, sale_price, currency,
			stock, category_id, brand_id, images, attributes, 
			external_id, status, weight, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, 'EUR',
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17
		)
	`
	
	_, err = p.pool.Exec(ctx, query,
		product.ID, product.SKU, product.Slug, product.Name, product.Description,
		product.Price, product.SalePrice,
		product.Stock, product.CategoryID, product.BrandID,
		product.Images, product.Attributes,
		product.ExternalID, product.Status, product.Weight,
		product.CreatedAt, product.UpdatedAt,
	)
	
	if err != nil {
		return false, fmt.Errorf("insert failed: %w", err)
	}
	
	return true, nil
}

// LinkSupplierProduct links a supplier product to a main product
func (p *Postgres) LinkSupplierProduct(ctx context.Context, supplierProductID, mainProductID uuid.UUID) error {
	_, err := p.pool.Exec(ctx, `
		UPDATE supplier_products SET linked_product_id = $1, updated_at = NOW()
		WHERE id = $2
	`, mainProductID, supplierProductID)
	return err
}

// DeleteLinkedMainProducts deletes main products linked to supplier products
func (p *Postgres) DeleteLinkedMainProducts(ctx context.Context, supplierID uuid.UUID) (int, error) {
	result, err := p.pool.Exec(ctx, `
		DELETE FROM products 
		WHERE id IN (
			SELECT linked_product_id FROM supplier_products 
			WHERE supplier_id = $1 AND linked_product_id IS NOT NULL
		)
	`, supplierID)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// DeleteAllSupplierProducts deletes all supplier products for a supplier
func (p *Postgres) DeleteAllSupplierProducts(ctx context.Context, supplierID uuid.UUID) (int, error) {
	result, err := p.pool.Exec(ctx, `
		DELETE FROM supplier_products WHERE supplier_id = $1
	`, supplierID)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// DeleteSupplierCategories deletes all supplier categories
func (p *Postgres) DeleteSupplierCategories(ctx context.Context, supplierID uuid.UUID) error {
	_, err := p.pool.Exec(ctx, `DELETE FROM supplier_categories WHERE supplier_id = $1`, supplierID)
	return err
}

// DeleteSupplierBrands deletes all supplier brands
func (p *Postgres) DeleteSupplierBrands(ctx context.Context, supplierID uuid.UUID) error {
	_, err := p.pool.Exec(ctx, `DELETE FROM supplier_brands WHERE supplier_id = $1`, supplierID)
	return err
}

// GetUniqueProductCategories extracts unique category trees from products
func (p *Postgres) GetUniqueProductCategories(ctx context.Context, supplierID uuid.UUID) error {
	query := `
		INSERT INTO supplier_categories (id, supplier_id, external_id, name, full_path, created_at, updated_at)
		SELECT 
			gen_random_uuid(),
			$1,
			COALESCE(sp.attributes->>'categoryId', sp.external_id),
			COALESCE(sp.attributes->>'subCategoryTree', sp.attributes->>'categoryTree', sp.attributes->>'mainCategoryTree', 'Unknown'),
			CONCAT_WS(' > ', 
				NULLIF(sp.attributes->>'mainCategoryTree', ''),
				NULLIF(sp.attributes->>'categoryTree', ''),
				NULLIF(sp.attributes->>'subCategoryTree', '')
			),
			NOW(), NOW()
		FROM supplier_products sp
		WHERE sp.supplier_id = $1
		GROUP BY sp.attributes->>'categoryId', sp.attributes->>'mainCategoryTree', sp.attributes->>'categoryTree', sp.attributes->>'subCategoryTree', sp.external_id
		ON CONFLICT (supplier_id, external_id) DO UPDATE SET
			name = EXCLUDED.name,
			full_path = EXCLUDED.full_path,
			updated_at = NOW()
	`
	_, err := p.pool.Exec(ctx, query, supplierID)
	return err
}
