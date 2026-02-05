package export

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"log"
	"strings"
	"time"

	"megashop/internal/config"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ==================== HEUREKA XML STRUCTURES ====================

// HeurekaShop is the root element
type HeurekaShop struct {
	XMLName  xml.Name          `xml:"SHOP"`
	Items    []HeurekaShopItem `xml:"SHOPITEM"`
}

// HeurekaShopItem represents a single product in the Heureka feed
type HeurekaShopItem struct {
	XMLName                       xml.Name              `xml:"SHOPITEM"`
	ItemID                        string                `xml:"ITEM_ID"`
	ProductName                   string                `xml:"PRODUCTNAME"`
	Product                       string                `xml:"PRODUCT"`
	Description                   string                `xml:"DESCRIPTION"`
	URL                           string                `xml:"URL"`
	ImgURL                        string                `xml:"IMGURL,omitempty"`
	ImgURLAlternatives            []string              `xml:"IMGURL_ALTERNATIVE,omitempty"`
	PriceVAT                      string                `xml:"PRICE_VAT"`
	HeurekaCPC                    string                `xml:"HEUREKA_CPC,omitempty"`
	Manufacturer                  string                `xml:"MANUFACTURER,omitempty"`
	CategoryText                  string                `xml:"CATEGORYTEXT,omitempty"`
	EAN                           string                `xml:"EAN,omitempty"`
	ISBN                          string                `xml:"ISBN,omitempty"`
	ProductNo                     string                `xml:"PRODUCTNO,omitempty"`
	Params                        []HeurekaParam        `xml:"PARAM,omitempty"`
	DeliveryDate                  string                `xml:"DELIVERY_DATE,omitempty"`
	Deliveries                    []HeurekaDelivery     `xml:"DELIVERY,omitempty"`
	ItemGroupID                   string                `xml:"ITEMGROUP_ID,omitempty"`
	Accessories                   []string              `xml:"ACCESSORY,omitempty"`
	Gift                          string                `xml:"GIFT,omitempty"`
	ExtendedWarranty              *HeurekaWarranty      `xml:"EXTENDED_WARRANTY,omitempty"`
	SpecialService                string                `xml:"SPECIAL_SERVICE,omitempty"`
	SalesVoucher                  *HeurekaSalesVoucher  `xml:"SALES_VOUCHER,omitempty"`
}

type HeurekaParam struct {
	XMLName   xml.Name `xml:"PARAM"`
	ParamName string   `xml:"PARAM_NAME"`
	Val       string   `xml:"VAL"`
	Unit      string   `xml:"UNIT,omitempty"`
}

type HeurekaDelivery struct {
	XMLName          xml.Name `xml:"DELIVERY"`
	DeliveryID       string   `xml:"DELIVERY_ID"`
	DeliveryPrice    string   `xml:"DELIVERY_PRICE"`
	DeliveryPriceCOD string   `xml:"DELIVERY_PRICE_COD"`
}

type HeurekaWarranty struct {
	XMLName xml.Name `xml:"EXTENDED_WARRANTY"`
	Val     string   `xml:"VAL"`
	Desc    string   `xml:"DESC"`
}

type HeurekaSalesVoucher struct {
	XMLName xml.Name `xml:"SALES_VOUCHER"`
	Code    string   `xml:"CODE"`
	Desc    string   `xml:"DESC"`
}

// ==================== INTERNAL DB MODELS ====================

type ExportProduct struct {
	ID          uuid.UUID
	SKU         string
	Slug        string
	Name        string
	Description string
	Price       float64
	SalePrice   *float64
	Currency    string
	Stock       int
	Weight      float64
	Images      json.RawMessage
	Attributes  json.RawMessage
	Variants    json.RawMessage
	ExternalID  string
	EAN         string

	// Joined fields
	BrandName    string
	CategoryPath string // "Elektronika | Mobilné telefóny"

	// From supplier_products (fallbacks)
	SupplierEAN         string
	SupplierWarranty    string
	SupplierTechSpecs   json.RawMessage
	SupplierProducer    string
	SupplierDescription string
	ItemGroupID         string
	DeliveryDays        int
}

type ExportShippingMethod struct {
	Code     string
	Name     string
	Price    float64
	FreeFrom float64
	IsActive bool
}

type ProductImage struct {
	URL       string `json:"url"`
	Alt       string `json:"alt,omitempty"`
	Position  int    `json:"position,omitempty"`
	IsPrimary bool   `json:"is_primary,omitempty"`
	IsMain    bool   `json:"is_main,omitempty"`
}

type ProductAttribute struct {
	Name  string `json:"name"`
	Value string `json:"value"`
	Unit  string `json:"unit,omitempty"`
}

// ==================== EXPORTER ====================

type HeurekaExporter struct {
	pool *pgxpool.Pool
	cfg  *config.Config
}

func NewHeurekaExporter(pool *pgxpool.Pool, cfg *config.Config) *HeurekaExporter {
	return &HeurekaExporter{
		pool: pool,
		cfg:  cfg,
	}
}

// WriteXML streams the Heureka XML feed directly to the writer
// This is memory-efficient for large catalogs (100k+ products)
func (e *HeurekaExporter) WriteXML(ctx context.Context, w io.Writer) error {
	startTime := time.Now()

	// Write XML header
	if _, err := io.WriteString(w, xml.Header); err != nil {
		return fmt.Errorf("write xml header: %w", err)
	}
	if _, err := io.WriteString(w, "<SHOP>\n"); err != nil {
		return fmt.Errorf("write shop open: %w", err)
	}

	// Load shipping methods once
	shippingMethods, err := e.loadShippingMethods(ctx)
	if err != nil {
		log.Printf("[EXPORT] Warning: could not load shipping methods: %v", err)
		shippingMethods = nil
	}

	// Stream products in batches
	batchSize := 1000
	offset := 0
	totalExported := 0

	for {
		products, err := e.loadProductBatch(ctx, batchSize, offset)
		if err != nil {
			return fmt.Errorf("load product batch at offset %d: %w", offset, err)
		}

		if len(products) == 0 {
			break
		}

		for _, prod := range products {
			item := e.convertToHeurekaItem(prod, shippingMethods)
			xmlBytes, err := xml.MarshalIndent(item, "  ", "    ")
			if err != nil {
				log.Printf("[EXPORT] Warning: failed to marshal product %s: %v", prod.ID, err)
				continue
			}

			if _, err := w.Write(xmlBytes); err != nil {
				return fmt.Errorf("write product xml: %w", err)
			}
			if _, err := io.WriteString(w, "\n"); err != nil {
				return fmt.Errorf("write newline: %w", err)
			}

			totalExported++
		}

		offset += batchSize

		if len(products) < batchSize {
			break
		}
	}

	if _, err := io.WriteString(w, "</SHOP>\n"); err != nil {
		return fmt.Errorf("write shop close: %w", err)
	}

	elapsed := time.Since(startTime)
	log.Printf("[EXPORT] Heureka XML export completed: %d products in %v", totalExported, elapsed)

	return nil
}

// loadProductBatch loads a batch of products with their category paths and brand names
func (e *HeurekaExporter) loadProductBatch(ctx context.Context, limit, offset int) ([]ExportProduct, error) {
	query := `
		SELECT 
			p.id, 
			COALESCE(p.sku, '') as sku,
			p.slug, 
			p.name, 
			COALESCE(p.description, '') as description,
			p.price, 
			p.sale_price,
			COALESCE(p.currency, 'EUR') as currency,
			p.stock,
			COALESCE(p.weight, 0) as weight,
			COALESCE(p.images, '[]') as images,
			COALESCE(p.attributes, '[]') as attributes,
			COALESCE(p.variants, '[]') as variants,
			COALESCE(p.external_id, '') as external_id,
			COALESCE(b.name, '') as brand_name,
			COALESCE(cat_path.category_path, '') as category_path,
			COALESCE(sp.ean, '') as supplier_ean,
			COALESCE(sp.warranty, '') as supplier_warranty,
			COALESCE(sp.technical_specs, '{}') as supplier_tech_specs,
			COALESCE(sp.producer_name, '') as supplier_producer,
			COALESCE(sp.description, '') as supplier_description,
			COALESCE(p.itemgroup_id, '') as itemgroup_id,
			COALESCE(p.delivery_days, 
				CASE 
					WHEN p.stock > 10 THEN 1
					WHEN p.stock > 0 THEN 3
					ELSE 14
				END
			) as delivery_days
		FROM products p
		LEFT JOIN brands b ON p.brand_id = b.id
		LEFT JOIN LATERAL (
			SELECT sp2.ean, sp2.warranty, sp2.technical_specs, sp2.producer_name, sp2.description
			FROM supplier_products sp2 
			WHERE sp2.product_id = p.id
			ORDER BY sp2.updated_at DESC
			LIMIT 1
		) sp ON true
		LEFT JOIN LATERAL (
			SELECT string_agg(cat.name, ' | ' ORDER BY cat.depth) as category_path
			FROM (
				WITH RECURSIVE cat_hierarchy AS (
					SELECT c.id, c.name, c.parent_id, 0 as depth
					FROM categories c
					WHERE c.id = p.category_id
					UNION ALL
					SELECT c2.id, c2.name, c2.parent_id, ch.depth + 1
					FROM categories c2
					JOIN cat_hierarchy ch ON c2.id = ch.parent_id
				)
				SELECT name, depth FROM cat_hierarchy ORDER BY depth DESC
			) cat
		) cat_path ON true
		WHERE p.status = 'active'
		ORDER BY p.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := e.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	var products []ExportProduct
	for rows.Next() {
		var prod ExportProduct
		err := rows.Scan(
			&prod.ID,
			&prod.SKU,
			&prod.Slug,
			&prod.Name,
			&prod.Description,
			&prod.Price,
			&prod.SalePrice,
			&prod.Currency,
			&prod.Stock,
			&prod.Weight,
			&prod.Images,
			&prod.Attributes,
			&prod.Variants,
			&prod.ExternalID,
			&prod.BrandName,
			&prod.CategoryPath,
			&prod.SupplierEAN,
			&prod.SupplierWarranty,
			&prod.SupplierTechSpecs,
			&prod.SupplierProducer,
			&prod.SupplierDescription,
			&prod.ItemGroupID,
			&prod.DeliveryDays,
		)
		if err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}

		// Resolve EAN: first from product attributes, then from supplier
		prod.EAN = e.extractEAN(prod.Attributes)
		if prod.EAN == "" {
			prod.EAN = prod.SupplierEAN
		}

		// Enrich description from supplier if main is empty
		if prod.Description == "" && prod.SupplierDescription != "" {
			prod.Description = prod.SupplierDescription
		}

		// Use supplier producer name if brand is empty
		if prod.BrandName == "" && prod.SupplierProducer != "" {
			prod.BrandName = prod.SupplierProducer
		}

		products = append(products, prod)
	}

	return products, nil
}

// loadShippingMethods loads all active shipping methods
func (e *HeurekaExporter) loadShippingMethods(ctx context.Context) ([]ExportShippingMethod, error) {
	query := `
		SELECT code, name, price, COALESCE(free_from, 0)
		FROM shipping_methods 
		WHERE is_active = true
		ORDER BY price ASC
	`

	rows, err := e.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var methods []ExportShippingMethod
	for rows.Next() {
		var m ExportShippingMethod
		if err := rows.Scan(&m.Code, &m.Name, &m.Price, &m.FreeFrom); err != nil {
			return nil, err
		}
		m.IsActive = true
		methods = append(methods, m)
	}

	return methods, nil
}

// convertToHeurekaItem converts an ExportProduct to a HeurekaShopItem
func (e *HeurekaExporter) convertToHeurekaItem(prod ExportProduct, shippingMethods []ExportShippingMethod) HeurekaShopItem {
	shopURL := strings.TrimRight(e.cfg.ShopURL, "/")
	cdnURL := strings.TrimRight(e.cfg.CDNUrl, "/")

	// Determine item ID: prefer SKU, then external_id, then UUID
	itemID := prod.SKU
	if itemID == "" {
		itemID = prod.ExternalID
	}
	if itemID == "" {
		itemID = prod.ID.String()
	}

	// Determine the final price (sale price if available, otherwise regular)
	finalPrice := prod.Price
	if prod.SalePrice != nil && *prod.SalePrice > 0 && *prod.SalePrice < prod.Price {
		finalPrice = *prod.SalePrice
	}

	// Build product URL
	productURL := fmt.Sprintf("%s/products/%s", shopURL, prod.Slug)

	// Parse images
	var images []ProductImage
	json.Unmarshal(prod.Images, &images)

	mainImg := ""
	var altImgs []string

	for _, img := range images {
		imgURL := e.resolveImageURL(img.URL, cdnURL, shopURL)
		if imgURL == "" {
			continue
		}

		if (img.IsPrimary || img.IsMain || img.Position == 0) && mainImg == "" {
			mainImg = imgURL
		} else {
			altImgs = append(altImgs, imgURL)
		}
	}

	// If no primary found, use first image
	if mainImg == "" && len(images) > 0 {
		mainImg = e.resolveImageURL(images[0].URL, cdnURL, shopURL)
		if len(altImgs) == 0 && len(images) > 1 {
			for _, img := range images[1:] {
				resolved := e.resolveImageURL(img.URL, cdnURL, shopURL)
				if resolved != "" {
					altImgs = append(altImgs, resolved)
				}
			}
		}
	}

	// Parse attributes as PARAM elements
	var attributes []ProductAttribute
	json.Unmarshal(prod.Attributes, &attributes)

	var params []HeurekaParam
	seenParams := make(map[string]bool) // avoid duplicates

	for _, attr := range attributes {
		if attr.Name == "" || attr.Value == "" {
			continue
		}
		// Skip EAN/ISBN/GTIN — these go into dedicated elements
		nameLower := strings.ToLower(attr.Name)
		if nameLower == "ean" || nameLower == "isbn" || nameLower == "gtin" || nameLower == "upc" {
			continue
		}
		if seenParams[attr.Name] {
			continue
		}
		seenParams[attr.Name] = true
		params = append(params, HeurekaParam{
			ParamName: attr.Name,
			Val:       attr.Value,
			Unit:      attr.Unit,
		})
	}

	// Parse supplier technical_specs and add as PARAMs
	if len(prod.SupplierTechSpecs) > 2 && string(prod.SupplierTechSpecs) != "{}" {
		e.parseTechSpecsToParams(&params, prod.SupplierTechSpecs, seenParams)
	}

	// Add weight as param if non-zero
	if prod.Weight > 0 && !seenParams["Hmotnosť"] {
		params = append(params, HeurekaParam{
			ParamName: "Hmotnosť",
			Val:       fmt.Sprintf("%.2f", prod.Weight),
			Unit:      "kg",
		})
	}

	// Delivery date from DB or computed from stock
	deliveryDate := fmt.Sprintf("%d", prod.DeliveryDays)

	// Build delivery methods
	var deliveries []HeurekaDelivery
	for _, sm := range shippingMethods {
		heurekaDeliveryID := mapShippingCodeToHeureka(sm.Code)
		if heurekaDeliveryID == "" {
			continue
		}

		// Calculate shipping price (free shipping threshold)
		shipPrice := sm.Price
		if sm.FreeFrom > 0 && finalPrice >= sm.FreeFrom {
			shipPrice = 0
		}

		deliveries = append(deliveries, HeurekaDelivery{
			DeliveryID:       heurekaDeliveryID,
			DeliveryPrice:    formatPrice(shipPrice),
			DeliveryPriceCOD: formatPrice(shipPrice + 1.50), // COD surcharge
		})
	}

	// Clean description (strip HTML tags, limit length)
	description := cleanDescription(prod.Description)

	// Build the clean product name (without brand if already included)
	productName := prod.Name
	product := prod.Name
	if prod.BrandName != "" && !strings.Contains(strings.ToLower(prod.Name), strings.ToLower(prod.BrandName)) {
		productName = prod.BrandName + " " + prod.Name
	}

	item := HeurekaShopItem{
		ItemID:       itemID,
		ProductName:  productName,
		Product:      product,
		Description:  description,
		URL:          productURL,
		ImgURL:       mainImg,
		PriceVAT:     formatPrice(finalPrice),
		Manufacturer: prod.BrandName,
		CategoryText: prod.CategoryPath,
		EAN:          prod.EAN,
		ProductNo:    prod.SKU,
		Params:       params,
		DeliveryDate: deliveryDate,
		Deliveries:   deliveries,
	}

	if len(altImgs) > 0 {
		item.ImgURLAlternatives = altImgs
	}

	// ItemGroupID for variant grouping
	if prod.ItemGroupID != "" {
		item.ItemGroupID = prod.ItemGroupID
	}

	// Extended warranty from supplier
	if prod.SupplierWarranty != "" {
		item.ExtendedWarranty = &HeurekaWarranty{
			Val:  prod.SupplierWarranty,
			Desc: fmt.Sprintf("Záruka %s", prod.SupplierWarranty),
		}
	}

	return item
}

// ==================== HELPERS ====================

// parseTechSpecsToParams extracts technical specifications from supplier JSONB
// and converts them to Heureka PARAM elements
// Supports formats: {"section": [{"name":"x","value":"y"}]} or {"key": "value"} or {"section": {"key": "value"}}
func (e *HeurekaExporter) parseTechSpecsToParams(params *[]HeurekaParam, techSpecsJSON json.RawMessage, seenParams map[string]bool) {
	// Try as map of sections with array of name/value pairs
	var sections map[string]json.RawMessage
	if err := json.Unmarshal(techSpecsJSON, &sections); err != nil {
		return
	}

	for _, sectionData := range sections {
		// Try as array of {name, value, unit} objects
		var specItems []struct {
			Name  string `json:"name"`
			Value string `json:"value"`
			Unit  string `json:"unit"`
		}
		if err := json.Unmarshal(sectionData, &specItems); err == nil {
			for _, item := range specItems {
				if item.Name == "" || item.Value == "" {
					continue
				}
				nameLower := strings.ToLower(item.Name)
				if nameLower == "ean" || nameLower == "gtin" || nameLower == "upc" || nameLower == "isbn" {
					continue
				}
				if seenParams[item.Name] {
					continue
				}
				seenParams[item.Name] = true
				*params = append(*params, HeurekaParam{
					ParamName: item.Name,
					Val:       item.Value,
					Unit:      item.Unit,
				})
			}
			continue
		}

		// Try as flat key-value map
		var kvMap map[string]string
		if err := json.Unmarshal(sectionData, &kvMap); err == nil {
			for k, v := range kvMap {
				if k == "" || v == "" {
					continue
				}
				if seenParams[k] {
					continue
				}
				seenParams[k] = true
				*params = append(*params, HeurekaParam{
					ParamName: k,
					Val:       v,
				})
			}
			continue
		}

		// Try as single string value (section name = param name)
		var strVal string
		if err := json.Unmarshal(sectionData, &strVal); err == nil && strVal != "" {
			// Skip, section name without structured data
			continue
		}
	}
}

func (e *HeurekaExporter) resolveImageURL(url, cdnURL, shopURL string) string {
	if url == "" {
		return ""
	}

	// Already absolute URL
	if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		return url
	}

	// Relative URL — prepend CDN or shop URL
	url = "/" + strings.TrimLeft(url, "/")
	if cdnURL != "" {
		return cdnURL + url
	}
	return shopURL + url
}

func (e *HeurekaExporter) extractEAN(attributesJSON json.RawMessage) string {
	var attributes []ProductAttribute
	if err := json.Unmarshal(attributesJSON, &attributes); err != nil {
		return ""
	}

	for _, attr := range attributes {
		nameLower := strings.ToLower(attr.Name)
		if nameLower == "ean" || nameLower == "gtin" || nameLower == "upc" {
			return attr.Value
		}
	}

	return ""
}

// mapShippingCodeToHeureka maps internal shipping codes to Heureka delivery IDs
func mapShippingCodeToHeureka(code string) string {
	mapping := map[string]string{
		"dpd":      "DPD",
		"gls":      "GLS",
		"posta":    "SLOVENSKA_POSTA",
		"packeta":  "ZASIELKOVNA",
		"personal": "OSOBNY_ODBER",
	}
	if hID, ok := mapping[code]; ok {
		return hID
	}
	// Return the original code uppercased as fallback
	return strings.ToUpper(code)
}

func formatPrice(price float64) string {
	return fmt.Sprintf("%.2f", price)
}

func cleanDescription(desc string) string {
	if desc == "" {
		return ""
	}

	// Unescape any double-encoded HTML
	desc = html.UnescapeString(desc)

	// Strip common HTML tags
	replacer := strings.NewReplacer(
		"<br>", " ",
		"<br/>", " ",
		"<br />", " ",
		"<p>", " ",
		"</p>", " ",
		"<div>", " ",
		"</div>", " ",
		"<ul>", " ",
		"</ul>", " ",
		"<li>", "- ",
		"</li>", " ",
		"<ol>", " ",
		"</ol>", " ",
		"<strong>", "",
		"</strong>", "",
		"<b>", "",
		"</b>", "",
		"<em>", "",
		"</em>", "",
		"<i>", "",
		"</i>", "",
		"<span>", "",
		"</span>", "",
		"<h1>", "",
		"</h1>", " ",
		"<h2>", "",
		"</h2>", " ",
		"<h3>", "",
		"</h3>", " ",
		"<h4>", "",
		"</h4>", " ",
		"<table>", "",
		"</table>", "",
		"<tr>", "",
		"</tr>", " ",
		"<td>", "",
		"</td>", " ",
		"<th>", "",
		"</th>", " ",
		"<tbody>", "",
		"</tbody>", "",
		"<thead>", "",
		"</thead>", "",
		"&nbsp;", " ",
		"\n", " ",
		"\r", "",
		"\t", " ",
	)

	desc = replacer.Replace(desc)

	// Remove remaining HTML tags with a simple approach
	for {
		start := strings.Index(desc, "<")
		if start == -1 {
			break
		}
		end := strings.Index(desc[start:], ">")
		if end == -1 {
			break
		}
		desc = desc[:start] + " " + desc[start+end+1:]
	}

	// Collapse whitespace
	for strings.Contains(desc, "  ") {
		desc = strings.ReplaceAll(desc, "  ", " ")
	}
	desc = strings.TrimSpace(desc)

	return desc
}
