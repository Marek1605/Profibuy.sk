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
func (p *Postgres) ExtractCategoriesFromProducts(ctx context.Context, supplierID uuid.UUID) (int, error) {
	_, err := p.pool.Exec(ctx, `DELETE FROM supplier_categories WHERE supplier_id = $1`, supplierID)
	if err != nil {
		return 0, fmt.Errorf("failed to clear categories: %w", err)
	}

	query := `
		SELECT DISTINCT category_id_external, main_category_tree, category_tree, sub_category_tree
		FROM supplier_products
		WHERE supplier_id = $1 AND main_category_tree IS NOT NULL AND main_category_tree != ''
	`
	rows, err := p.pool.Query(ctx, query, supplierID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	mainCategories := make(map[string]bool)
	subCategories := make(map[string]bool)
	subsubCategories := make(map[string]bool)
	count := 0

	for rows.Next() {
		var catID, mainCat, subCat, subsubCat string
		if err := rows.Scan(&catID, &mainCat, &subCat, &subsubCat); err != nil {
			continue
		}

		if mainCat != "" && !mainCategories[mainCat] {
			mainCategories[mainCat] = true
			mainSlug := strings.ToLower(strings.ReplaceAll(mainCat, " ", "-"))
			supCat := &models.SupplierCategory{
				ID: uuid.New(), SupplierID: supplierID, ExternalID: mainSlug,
				Name: mainCat, FullPath: mainCat, CreatedAt: time.Now(), UpdatedAt: time.Now(),
			}
			if p.UpsertSupplierCategory(ctx, supCat) == nil { count++ }
		}

		if subCat != "" {
			subKey := mainCat + "|" + subCat
			if !subCategories[subKey] {
				subCategories[subKey] = true
				parentSlug := strings.ToLower(strings.ReplaceAll(mainCat, " ", "-"))
				subSlug := strings.ToLower(strings.ReplaceAll(subCat, " ", "-"))
				supCat := &models.SupplierCategory{
					ID: uuid.New(), SupplierID: supplierID, ExternalID: subSlug,
					ParentExternalID: parentSlug, Name: subCat, FullPath: mainCat + " > " + subCat,
					CreatedAt: time.Now(), UpdatedAt: time.Now(),
				}
				if p.UpsertSupplierCategory(ctx, supCat) == nil { count++ }
			}
		}

		if subsubCat != "" {
			subsubKey := mainCat + "|" + subCat + "|" + subsubCat
			if !subsubCategories[subsubKey] {
				subsubCategories[subsubKey] = true
				var parentSlug string
				if subCat != "" {
					parentSlug = strings.ToLower(strings.ReplaceAll(subCat, " ", "-"))
				} else {
					parentSlug = strings.ToLower(strings.ReplaceAll(mainCat, " ", "-"))
				}
				externalID := catID
				if externalID == "" {
					externalID = strings.ToLower(strings.ReplaceAll(subsubCat, " ", "-"))
				}
				fullPath := mainCat
				if subCat != "" { fullPath += " > " + subCat }
				fullPath += " > " + subsubCat
				supCat := &models.SupplierCategory{
					ID: uuid.New(), SupplierID: supplierID, ExternalID: externalID,
					ParentExternalID: parentSlug, Name: subsubCat, FullPath: fullPath,
					CreatedAt: time.Now(), UpdatedAt: time.Now(),
				}
				if p.UpsertSupplierCategory(ctx, supCat) == nil { count++ }
			}
		}
	}

	p.pool.Exec(ctx, `
		UPDATE supplier_categories sc SET product_count = (
			SELECT COUNT(*) FROM supplier_products sp
			WHERE sp.supplier_id = sc.supplier_id
			AND (sp.category_id_external = sc.external_id OR LOWER(sp.sub_category_tree) = LOWER(sc.name))
		) WHERE sc.supplier_id = $1
	`, supplierID)

	return count, nil
}

func (p *Postgres) DeleteAllSupplierCategoriesForSupplier(ctx context.Context, supplierID uuid.UUID) (int64, error) {
	result, err := p.pool.Exec(ctx, `DELETE FROM supplier_categories WHERE supplier_id = $1`, supplierID)
	if err != nil { return 0, err }
	return result.RowsAffected(), nil
}

func (p *Postgres) DeleteAllCategories(ctx context.Context) (int64, error) {
	result, err := p.pool.Exec(ctx, `DELETE FROM categories`)
	if err != nil { return 0, err }
	return result.RowsAffected(), nil
}
