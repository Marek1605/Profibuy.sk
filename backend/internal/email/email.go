package email

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"strings"
	"time"

	"megashop/internal/config"
	"megashop/internal/models"
)

// Service handles email sending
type Service struct {
	cfg *config.Config
}

// NewService creates a new email service
func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

// IsConfigured returns true if SMTP is properly configured
func (s *Service) IsConfigured() bool {
	return s.cfg.SMTPHost != "" && s.cfg.SMTPUser != "" && s.cfg.SMTPPassword != ""
}

// SendOrderConfirmation sends order confirmation email to customer
func (s *Service) SendOrderConfirmation(order *models.Order) error {
	if !s.IsConfigured() {
		log.Printf("[EMAIL] SMTP not configured, skipping order confirmation for %s", order.OrderNumber)
		return nil
	}

	// Parse billing address to get email
	var billingAddr models.Address
	if err := json.Unmarshal(order.BillingAddress, &billingAddr); err != nil {
		return fmt.Errorf("failed to parse billing address: %w", err)
	}

	if billingAddr.Email == "" {
		return fmt.Errorf("no email address in billing address")
	}

	// Parse shipping address
	var shippingAddr models.Address
	json.Unmarshal(order.ShippingAddress, &shippingAddr)

	// Build template data
	data := OrderEmailData{
		ShopName:        s.cfg.ShopName,
		ShopURL:         s.cfg.ShopURL,
		OrderNumber:     order.OrderNumber,
		OrderDate:       order.CreatedAt.Format("02.01.2006"),
		OrderTime:       order.CreatedAt.Format("15:04"),
		Status:          translateStatus(order.Status),
		PaymentMethod:   translatePaymentMethod(order.PaymentMethod),
		ShippingMethod:  translateShippingMethod(order.ShippingMethod),
		Items:           order.Items,
		Subtotal:        formatEUR(order.Subtotal),
		ShippingPrice:   formatEUR(order.ShippingPrice),
		Tax:             formatEUR(order.Tax),
		Total:           formatEUR(order.Total),
		Currency:        order.Currency,
		Note:            order.Note,
		BillingAddress:  billingAddr,
		ShippingAddress: shippingAddr,
		Year:            time.Now().Year(),
	}

	// Render template
	html, err := renderOrderConfirmationHTML(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	subject := fmt.Sprintf("Potvrdenie objednávky #%s | %s", order.OrderNumber, s.cfg.ShopName)

	return s.sendHTML(billingAddr.Email, subject, html)
}

// sendHTML sends an HTML email
func (s *Service) sendHTML(to, subject, htmlBody string) error {
	from := s.cfg.SMTPFrom
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)

	headers := map[string]string{
		"From":                      fmt.Sprintf("%s <%s>", s.cfg.ShopName, from),
		"To":                        to,
		"Subject":                   subject,
		"MIME-Version":              "1.0",
		"Content-Type":              "text/html; charset=\"UTF-8\"",
		"X-Mailer":                  "ProfiBuy-Mailer",
		"List-Unsubscribe":         fmt.Sprintf("<%s/unsubscribe>", s.cfg.ShopURL),
	}

	var msg bytes.Buffer
	for k, v := range headers {
		fmt.Fprintf(&msg, "%s: %s\r\n", k, v)
	}
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)

	// Try TLS first
	tlsConfig := &tls.Config{
		ServerName: s.cfg.SMTPHost,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		// Fallback to STARTTLS
		log.Printf("[EMAIL] TLS dial failed, trying STARTTLS: %v", err)
		return smtp.SendMail(addr, auth, from, []string{to}, msg.Bytes())
	}

	client, err := smtp.NewClient(conn, s.cfg.SMTPHost)
	if err != nil {
		return fmt.Errorf("SMTP client error: %w", err)
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth error: %w", err)
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("SMTP MAIL FROM error: %w", err)
	}

	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("SMTP RCPT TO error: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA error: %w", err)
	}

	_, err = w.Write(msg.Bytes())
	if err != nil {
		return fmt.Errorf("SMTP write error: %w", err)
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("SMTP close error: %w", err)
	}

	log.Printf("[EMAIL] ✅ Order confirmation sent to %s for order #%s", to, subject)
	return client.Quit()
}

// OrderEmailData holds data for order confirmation template
type OrderEmailData struct {
	ShopName        string
	ShopURL         string
	OrderNumber     string
	OrderDate       string
	OrderTime       string
	Status          string
	PaymentMethod   string
	ShippingMethod  string
	Items           []models.OrderItem
	Subtotal        string
	ShippingPrice   string
	Tax             string
	Total           string
	Currency        string
	Note            string
	BillingAddress  models.Address
	ShippingAddress models.Address
	Year            int
}

func formatEUR(amount float64) string {
	return fmt.Sprintf("%.2f €", amount)
}

func translateStatus(status string) string {
	m := map[string]string{
		"pending":    "Čaká na spracovanie",
		"paid":       "Zaplatená",
		"processing": "Spracováva sa",
		"shipped":    "Odoslaná",
		"delivered":  "Doručená",
		"cancelled":  "Zrušená",
	}
	if v, ok := m[status]; ok {
		return v
	}
	return status
}

func translatePaymentMethod(method string) string {
	m := map[string]string{
		"card":     "Platba kartou",
		"transfer": "Bankový prevod",
		"cod":      "Dobierka",
	}
	if v, ok := m[method]; ok {
		return v
	}
	return method
}

func translateShippingMethod(method string) string {
	m := map[string]string{
		"packeta": "Zásielkovňa",
		"dpd":     "DPD kuriér",
		"gls":     "GLS kuriér",
		"posta":   "Slovenská pošta",
	}
	if v, ok := m[method]; ok {
		return v
	}
	return method
}

func itemTotal(item models.OrderItem) string {
	return formatEUR(item.Price * float64(item.Quantity))
}

func itemPrice(item models.OrderItem) string {
	return formatEUR(item.Price)
}

func renderOrderConfirmationHTML(data OrderEmailData) (string, error) {
	funcMap := template.FuncMap{
		"itemTotal": itemTotal,
		"itemPrice": itemPrice,
		"upper":     strings.ToUpper,
	}

	tmpl, err := template.New("order_confirmation").Funcs(funcMap).Parse(orderConfirmationTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// Modern order confirmation HTML email template
const orderConfirmationTemplate = `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Potvrdenie objednávky #{{.OrderNumber}}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Wrapper -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6f9;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Container -->
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<!-- Header with gradient -->
<tr>
<td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#3b82f6 100%);padding:40px 40px 32px;text-align:center;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td align="center">
    <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">{{.ShopName}}</h1>
    <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:400;">Váš spoľahlivý online obchod</p>
  </td></tr>
  </table>
</td>
</tr>

<!-- Success icon + message -->
<tr>
<td style="padding:32px 40px 24px;text-align:center;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td align="center">
    <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);margin:0 auto 20px;line-height:72px;text-align:center;">
      <span style="color:#ffffff;font-size:36px;">✓</span>
    </div>
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Ďakujeme za objednávku!</h2>
    <p style="margin:0;color:#6b7280;font-size:15px;line-height:1.5;">
      Vaša objednávka bola úspešne prijatá a čoskoro ju začneme spracovávať.
    </p>
  </td></tr>
  </table>
</td>
</tr>

<!-- Order info card -->
<tr>
<td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
  <tr>
    <td style="padding:20px 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Číslo objednávky</p>
          <p style="margin:0;color:#1e3a5f;font-size:18px;font-weight:700;">#{{.OrderNumber}}</p>
        </td>
        <td style="width:50%;vertical-align:top;text-align:right;">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Dátum</p>
          <p style="margin:0;color:#374151;font-size:15px;font-weight:600;">{{.OrderDate}} o {{.OrderTime}}</p>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="width:50%;vertical-align:top;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Doprava</p>
              <p style="margin:0;color:#374151;font-size:14px;font-weight:500;">{{.ShippingMethod}}</p>
            </td>
            <td style="width:50%;vertical-align:top;text-align:right;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Platba</p>
              <p style="margin:0;color:#374151;font-size:14px;font-weight:500;">{{.PaymentMethod}}</p>
            </td>
          </tr>
          </table>
        </td>
      </tr>
      </table>
    </td>
  </tr>
  </table>
</td>
</tr>

<!-- Items header -->
<tr>
<td style="padding:0 40px 12px;">
  <h3 style="margin:0;color:#111827;font-size:16px;font-weight:700;">Položky objednávky</h3>
</td>
</tr>

<!-- Items list -->
<tr>
<td style="padding:0 40px 8px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <!-- Table header -->
  <tr>
    <td style="padding:8px 0;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Produkt</td>
    <td style="padding:8px 0;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;text-align:center;width:50px;">Ks</td>
    <td style="padding:8px 0;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;text-align:right;width:90px;">Cena</td>
  </tr>
  {{range .Items}}
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">{{.Name}}</p>
      {{if .SKU}}<p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">SKU: {{.SKU}}</p>{{end}}
    </td>
    <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;font-size:14px;">{{.Quantity}}×</td>
    <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">{{itemTotal .}}</p>
      {{if gt .Quantity 1}}<p style="margin:2px 0 0;color:#9ca3af;font-size:12px;">{{itemPrice .}}/ks</p>{{end}}
    </td>
  </tr>
  {{end}}
  </table>
</td>
</tr>

<!-- Totals -->
<tr>
<td style="padding:16px 40px 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border-radius:12px;padding:20px 24px;">
  <tr><td>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:14px;">Medzisúčet</td>
      <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:500;">{{.Subtotal}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:14px;">Doprava</td>
      <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:500;">{{.ShippingPrice}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:14px;">DPH (20%)</td>
      <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:500;">{{.Tax}}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:12px 0 0;"><div style="border-top:2px solid #e5e7eb;"></div></td>
    </tr>
    <tr>
      <td style="padding:12px 0 0;color:#111827;font-size:20px;font-weight:800;">Celkom</td>
      <td style="padding:12px 0 0;color:#1e3a5f;font-size:20px;font-weight:800;text-align:right;">{{.Total}}</td>
    </tr>
    </table>
  </td></tr>
  </table>
</td>
</tr>

<!-- Addresses -->
<tr>
<td style="padding:0 40px 32px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="width:50%;vertical-align:top;padding-right:12px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <p style="margin:0 0 12px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Fakturačná adresa</p>
        <p style="margin:0;color:#111827;font-size:14px;font-weight:600;line-height:1.6;">
          {{.BillingAddress.FirstName}} {{.BillingAddress.LastName}}<br>
          {{.BillingAddress.Street}}<br>
          {{.BillingAddress.PostalCode}} {{.BillingAddress.City}}<br>
          {{.BillingAddress.Country}}
        </p>
        {{if .BillingAddress.Phone}}<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">📱 {{.BillingAddress.Phone}}</p>{{end}}
        {{if .BillingAddress.Email}}<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">📧 {{.BillingAddress.Email}}</p>{{end}}
      </div>
    </td>
    <td style="width:50%;vertical-align:top;padding-left:12px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <p style="margin:0 0 12px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Dodacia adresa</p>
        <p style="margin:0;color:#111827;font-size:14px;font-weight:600;line-height:1.6;">
          {{.ShippingAddress.FirstName}} {{.ShippingAddress.LastName}}<br>
          {{.ShippingAddress.Street}}<br>
          {{.ShippingAddress.PostalCode}} {{.ShippingAddress.City}}<br>
          {{.ShippingAddress.Country}}
        </p>
        {{if .ShippingAddress.Phone}}<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">📱 {{.ShippingAddress.Phone}}</p>{{end}}
      </div>
    </td>
  </tr>
  </table>
</td>
</tr>

{{if .Note}}
<!-- Note -->
<tr>
<td style="padding:0 40px 32px;">
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;">
    <p style="margin:0 0 4px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Poznámka k objednávke</p>
    <p style="margin:0;color:#78350f;font-size:14px;line-height:1.5;">{{.Note}}</p>
  </div>
</td>
</tr>
{{end}}

<!-- CTA Button -->
<tr>
<td style="padding:0 40px 32px;text-align:center;">
  <a href="{{.ShopURL}}/account/orders" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
    Sledovať objednávku
  </a>
</td>
</tr>

<!-- Divider -->
<tr>
<td style="padding:0 40px;">
  <div style="border-top:1px solid #e5e7eb;"></div>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:28px 40px 32px;text-align:center;">
  <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
    Ak máte akékoľvek otázky, kontaktujte nás na<br>
    <a href="mailto:info@profibuy.net" style="color:#2563eb;text-decoration:none;font-weight:600;">info@profibuy.net</a>
  </p>
  <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
    © {{.Year}} {{.ShopName}} | Všetky práva vyhradené
  </p>
</td>
</tr>

</table>
<!-- /Container -->

</td></tr>
</table>
<!-- /Wrapper -->

</body>
</html>`
