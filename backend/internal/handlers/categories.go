
// DeleteAllCategories handles DELETE /api/admin/categories/all
func DeleteAllCategories(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		
		result, err := db.Pool().Exec(ctx, "DELETE FROM categories")
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": err.Error()})
			return
		}
		
		c.JSON(200, gin.H{
			"success": true,
			"deleted": result.RowsAffected(),
		})
	}
}

// DeleteAllSupplierCategories handles DELETE /api/admin/suppliers/:id/categories/all
func DeleteAllSupplierCategories(db *database.Postgres) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		supplierID := c.Param("id")
		
		result, err := db.Pool().Exec(ctx, "DELETE FROM supplier_categories WHERE supplier_id = $1", supplierID)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": err.Error()})
			return
		}
		
		c.JSON(200, gin.H{
			"success": true,
			"deleted": result.RowsAffected(),
		})
	}
}
