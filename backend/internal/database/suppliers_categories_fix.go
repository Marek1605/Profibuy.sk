package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"megashop/internal/models"

	"github.com/google/uuid"
)

// ExtractCategoriesFromProducts extracts hierarchical categories from supplier products
// This is the main fix - Action XML doesn't have Categories section, categories are in product attributes
func (p *Postgres) ExtractCategoriesFromProducts(ctx context.Context, supplierID uuid.UUID) (int, error) {
	// First, delete existing supplier categories for clean import
	_, err := p.pool.Exec(ctx, `DELETE FROM supplier_categories WHERE supplier_id = $1`, supplierID)
	if err != nil {
		return 0, fmt.Errorf("failed to clear categories: %w", err)
	}

	// Extract unique category combinations from products
	query := `
		SELECT DISTINCT
			category_id_external,
			main_category_tree,
			category_tree,
			sub_category_tree
		FROM supplier_products
		WHERE supplier_id = $1
		AND (main_category_tree IS NOT NULL AND main_category_tree != '')
	`

	rows, err := p.pool.Query(ctx, query, supplierID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	// Track created categories to avoid duplicates
	mainCategories := make(map[string]bool)    // mainCategoryTree -> created
	subCategories := make(map[string]bool)     // mainCategoryTree+categoryTree -> created
	subsubCategories := make(map[string]bool)  // full path -> created
	
	count := 0

	for rows.Next() {
		var catID, mainCat, subCat, subsubCat string
		err := rows.Scan(&catID, &mainCat, &subCat, &subsubCat)
		if err != nil {
			continue
		}

		// 1. Create main category (e.g., "Home Appliances")
		if mainCat != "" && !mainCategories[mainCat] {
			mainCategories[mainCat] = true
			
			mainSlug := strings.ToLower(strings.ReplaceAll(mainCat, " ", "-"))
			supCat := &models.SupplierCategory{
				ID:               uuid.New(),
				SupplierID:       supplierID,
				ExternalID:       mainSlug,
				ParentExternalID: "",
				Name:             mainCat,
				FullPath:         mainCat,
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			}
			if err := p.UpsertSupplierCategory(ctx, supCat); err == nil {
				count++
			}
		}

		// 2. Create sub category (e.g., "Home Appliance - Products")
		if subCat != "" {
			subKey := mainCat + "|" + subCat
			if !subCategories[subKey] {
				subCategories[subKey] = true
				
				parentSlug := strings.ToLower(strings.ReplaceAll(mainCat, " ", "-"))
				subSlug := strings.ToLower(strings.ReplaceAll(subCat, " ", "-"))
				
				supCat := &models.SupplierCategory{
					ID:               uuid.New(),
					SupplierID:       supplierID,
					ExternalID:       subSlug,
					ParentExternalID: parentSlug,
					Name:             subCat,
					FullPath:         mainCat + " > " + subCat,
					CreatedAt:        time.Now(),
					UpdatedAt:        time.Now(),
				}
				if err := p.UpsertSupplierCategory(ctx, supCat); err == nil {
					count++
				}
			}
		}

		// 3. Create subsub category (e.g., "Hair curlers") - this is the actual product category
		if subsubCat != "" {
			subsubKey := mainCat + "|" + subCat + "|" + subsubCat
			if !subsubCategories[subsubKey] {
				subsubCategories[subsubKey] = true
				
				// Parent is subCat if exists, otherwise mainCat
				var parentSlug string
				if subCat != "" {
					parentSlug = strings.ToLower(strings.ReplaceAll(subCat, " ", "-"))
				} else {
					parentSlug = strings.ToLower(strings.ReplaceAll(mainCat, " ", "-"))
				}
				
				// Use categoryId if available, otherwise generate slug
				externalID := catID
				if externalID == "" {
					externalID = strings.ToLower(strings.ReplaceAll(subsubCat, " ", "-"))
				}
				
				fullPath := mainCat
				if subCat != "" {
					fullPath += " > " + subCat
				}
				fullPath += " > " + subsubCat
				
				supCat := &models.SupplierCategory{
					ID:               uuid.New(),
					SupplierID:       supplierID,
					ExternalID:       externalID,
					ParentExternalID: parentSlug,
					Name:             subsubCat,
					FullPath:         fullPath,
					CreatedAt:        time.Now(),
					UpdatedAt:        time.Now(),
				}
				if err := p.UpsertSupplierCategory(ctx, supCat); err == nil {
					count++
				}
			}
		}
	}

	// Update product counts for each category
	_, err = p.pool.Exec(ctx, `
		UPDATE supplier_categories sc SET
			product_count = (
				SELECT COUNT(*) FROM supplier_products sp
				WHERE sp.supplier_id = sc.supplier_id
				AND (
					sp.category_id_external = sc.external_id
					OR LOWER(sp.sub_category_tree) = LOWER(sc.name)
					OR LOWER(sp.category_tree) = LOWER(sc.name)
					OR LOWER(sp.main_category_tree) = LOWER(sc.name)
				)
			)
		WHERE sc.supplier_id = $1
	`, supplierID)

	return count, err
}

// DeleteAllSupplierCategoriesForSupplier deletes all categories for a supplier (admin endpoint)
func (p *Postgres) DeleteAllSupplierCategoriesForSupplier(ctx context.Context, supplierID uuid.UUID) (int64, error) {
	result, err := p.pool.Exec(ctx, `DELETE FROM supplier_categories WHERE supplier_id = $1`, supplierID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// DeleteAllCategories deletes all main store categories (admin endpoint)
func (p *Postgres) DeleteAllCategories(ctx context.Context) (int64, error) {
	// First unlink products from categories
	_, _ = p.pool.Exec(ctx, `UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL`)
	
	// Then delete all categories
	result, err := p.pool.Exec(ctx, `DELETE FROM categories`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// RegenerateCategoriesFromProducts regenerates categories after import
func (p *Postgres) RegenerateCategoriesFromProducts(ctx context.Context, supplierID uuid.UUID) error {
	count, err := p.ExtractCategoriesFromProducts(ctx, supplierID)
	if err != nil {
		return err
	}
	fmt.Printf("[Categories] Extracted %d categories from products for supplier %s\n", count, supplierID)
	return nil
}
