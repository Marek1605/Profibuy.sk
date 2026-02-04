package database

import (
	"context"
	"strings"

	"megashop/internal/models"

	"github.com/google/uuid"
)

// GetOrCreateHierarchicalCategory creates main->sub->subsub hierarchy
func (p *Postgres) GetOrCreateHierarchicalCategory(ctx context.Context, main, sub, subsub string) (*models.Category, error) {
	if main == "" {
		return nil, nil
	}

	var parentID *uuid.UUID
	var lastCat *models.Category

	// Create main category
	mainCat, err := p.findOrCreateCategory(ctx, main, nil)
	if err != nil {
		return nil, err
	}
	lastCat = mainCat
	parentID = &mainCat.ID

	// Create sub if provided
	if sub != "" && sub != main {
		subCat, err := p.findOrCreateCategory(ctx, sub, parentID)
		if err != nil {
			return nil, err
		}
		lastCat = subCat
		parentID = &subCat.ID
	}

	// Create subsub if provided
	if subsub != "" && subsub != sub {
		cleanName := subsub
		if idx := strings.Index(subsub, " - "); idx > 0 {
			cleanName = strings.TrimSpace(subsub[idx+3:])
		}
		if cleanName != "" && cleanName != sub {
			subsubCat, err := p.findOrCreateCategory(ctx, cleanName, parentID)
			if err != nil {
				return nil, err
			}
			lastCat = subsubCat
		}
	}

	return lastCat, nil
}

func (p *Postgres) findOrCreateCategory(ctx context.Context, name string, parentID *uuid.UUID) (*models.Category, error) {
	slug := strings.ToLower(strings.ReplaceAll(name, " ", "-"))
	slug = strings.ReplaceAll(slug, "/", "-")

	var cat models.Category
	var err error

	if parentID == nil {
		err = p.pool.QueryRow(ctx, 
			`SELECT id, parent_id, name, slug FROM categories WHERE name = $1 AND parent_id IS NULL`, 
			name).Scan(&cat.ID, &cat.ParentID, &cat.Name, &cat.Slug)
	} else {
		err = p.pool.QueryRow(ctx,
			`SELECT id, parent_id, name, slug FROM categories WHERE name = $1 AND parent_id = $2`,
			name, *parentID).Scan(&cat.ID, &cat.ParentID, &cat.Name, &cat.Slug)
	}

	if err == nil {
		return &cat, nil
	}

	// Create new
	cat.ID = uuid.New()
	cat.Name = name
	cat.Slug = slug
	cat.ParentID = parentID

	_, err = p.pool.Exec(ctx, `
		INSERT INTO categories (id, parent_id, name, slug, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (slug) DO UPDATE SET parent_id = COALESCE(EXCLUDED.parent_id, categories.parent_id)
	`, cat.ID, cat.ParentID, cat.Name, cat.Slug)

	if err != nil {
		p.pool.QueryRow(ctx, `SELECT id, parent_id, name, slug FROM categories WHERE slug = $1`, slug).Scan(&cat.ID, &cat.ParentID, &cat.Name, &cat.Slug)
	}

	return &cat, nil
}

// GetCategoriesTree returns hierarchical category tree
func (p *Postgres) GetCategoriesTree(ctx context.Context) ([]models.Category, error) {
	cats, err := p.ListCategories(ctx)
	if err != nil {
		return nil, err
	}

	catMap := make(map[uuid.UUID]*models.Category)
	for i := range cats {
		cats[i].Children = []models.Category{}
		catMap[cats[i].ID] = &cats[i]
	}

	var roots []models.Category
	for i := range cats {
		if cats[i].ParentID == nil {
			roots = append(roots, cats[i])
		} else if parent, ok := catMap[*cats[i].ParentID]; ok {
			parent.Children = append(parent.Children, cats[i])
		}
	}

	return roots, nil
}

// AutoSetCategoryImages sets images from products
func (p *Postgres) AutoSetCategoryImages(ctx context.Context) (int, error) {
	result, err := p.pool.Exec(ctx, `
		UPDATE categories c SET image = (
			SELECT (p.images->0->>'url')
			FROM products p 
			WHERE p.category_id = c.id 
			AND p.images IS NOT NULL 
			AND jsonb_array_length(p.images) > 0
			LIMIT 1
		)
		WHERE c.image IS NULL OR c.image = ''
	`)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// UpdateAllCategoryProductCounts updates counts
func (p *Postgres) UpdateAllCategoryProductCounts(ctx context.Context) error {
	_, err := p.pool.Exec(ctx, `
		UPDATE categories c SET product_count = (
			SELECT COUNT(*) FROM products p WHERE p.category_id = c.id
		)
	`)
	return err
}
