package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Page model
type Page struct {
	ID              uuid.UUID `json:"id"`
	Slug            string    `json:"slug"`
	Title           string    `json:"title"`
	Content         string    `json:"content"`
	MetaTitle       string    `json:"meta_title"`
	MetaDescription string    `json:"meta_description"`
	Published       bool      `json:"published"`
	Position        int       `json:"position"`
	ShowInFooter    bool      `json:"show_in_footer"`
	FooterGroup     string    `json:"footer_group"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ==================== PUBLIC ====================

// GetPage handles GET /api/pages/:slug
func GetPage(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		var p Page
		err := pool.QueryRow(c.Request.Context(), `
			SELECT id, slug, title, content, meta_title, meta_description, published, position, show_in_footer, footer_group, created_at, updated_at
			FROM pages WHERE slug = $1 AND published = true
		`, slug).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.MetaTitle, &p.MetaDescription, &p.Published, &p.Position, &p.ShowInFooter, &p.FooterGroup, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Stránka nenájdená"})
			return
		}
		c.JSON(http.StatusOK, p)
	}
}

// ListPages handles GET /api/pages (public - only published)
func ListPublicPages(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := pool.Query(c.Request.Context(), `
			SELECT id, slug, title, meta_title, published, position, show_in_footer, footer_group, created_at, updated_at
			FROM pages WHERE published = true ORDER BY position ASC, title ASC
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var pages []Page
		for rows.Next() {
			var p Page
			rows.Scan(&p.ID, &p.Slug, &p.Title, &p.MetaTitle, &p.Published, &p.Position, &p.ShowInFooter, &p.FooterGroup, &p.CreatedAt, &p.UpdatedAt)
			pages = append(pages, p)
		}
		c.JSON(http.StatusOK, pages)
	}
}

// ==================== ADMIN ====================

// ListAdminPages handles GET /api/admin/pages
func ListAdminPages(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := pool.Query(c.Request.Context(), `
			SELECT id, slug, title, content, meta_title, meta_description, published, position, show_in_footer, footer_group, created_at, updated_at
			FROM pages ORDER BY position ASC, title ASC
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		defer rows.Close()

		var pages []Page
		for rows.Next() {
			var p Page
			rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.MetaTitle, &p.MetaDescription, &p.Published, &p.Position, &p.ShowInFooter, &p.FooterGroup, &p.CreatedAt, &p.UpdatedAt)
			pages = append(pages, p)
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": pages})
	}
}

// GetAdminPage handles GET /api/admin/pages/:id
func GetAdminPage(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var p Page
		err := pool.QueryRow(c.Request.Context(), `
			SELECT id, slug, title, content, meta_title, meta_description, published, position, show_in_footer, footer_group, created_at, updated_at
			FROM pages WHERE id = $1
		`, id).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.MetaTitle, &p.MetaDescription, &p.Published, &p.Position, &p.ShowInFooter, &p.FooterGroup, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Page not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": p})
	}
}

// CreatePage handles POST /api/admin/pages
func CreatePage(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var p Page
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		p.ID = uuid.New()
		_, err := pool.Exec(c.Request.Context(), `
			INSERT INTO pages (id, slug, title, content, meta_title, meta_description, published, position, show_in_footer, footer_group)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, p.ID, p.Slug, p.Title, p.Content, p.MetaTitle, p.MetaDescription, p.Published, p.Position, p.ShowInFooter, p.FooterGroup)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": p})
	}
}

// UpdatePage handles PUT /api/admin/pages/:id
func UpdatePage(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var p Page
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		_, err := pool.Exec(c.Request.Context(), `
			UPDATE pages SET slug=$2, title=$3, content=$4, meta_title=$5, meta_description=$6, 
			published=$7, position=$8, show_in_footer=$9, footer_group=$10, updated_at=NOW()
			WHERE id = $1
		`, id, p.Slug, p.Title, p.Content, p.MetaTitle, p.MetaDescription, p.Published, p.Position, p.ShowInFooter, p.FooterGroup)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// DeletePage handles DELETE /api/admin/pages/:id
func DeletePage(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		_, err := pool.Exec(c.Request.Context(), `DELETE FROM pages WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// Placeholder - not used but referenced
func unusedPageCtx() context.Context { return context.Background() }
func unusedPageJSON() json.RawMessage { return nil }
