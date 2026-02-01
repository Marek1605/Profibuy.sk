# MegaShop - E-commerce Platform

High-performance e-commerce platform optimized for 100,000 - 200,000 products.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 14    │────▶│    Go Backend   │────▶│   PostgreSQL    │
│    Frontend     │     │   (Gin + pgx)   │     │  + Full-Text    │
│   (SSR/ISR)     │     │                 │     │     Search      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │     Redis       │
                        │    (Cache)      │
                        └─────────────────┘
```

## Tech Stack

### Backend (Go)
- **Framework**: Gin
- **Database**: PostgreSQL with pgx driver
- **Cache**: Redis
- **Features**:
  - Full-text search with tsvector
  - Batch imports (1000 products/batch)
  - Connection pooling (50 connections)
  - JWT authentication
  - Comgate/GoPay payments
  - Packeta shipping integration

### Frontend (Next.js 14)
- **Rendering**: SSR/ISR for SEO
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Data Fetching**: React Query

## Project Structure

```
megashop/
├── backend/
│   ├── cmd/server/          # Main entry point
│   ├── internal/
│   │   ├── cache/           # Redis cache layer
│   │   ├── config/          # Configuration
│   │   ├── database/        # PostgreSQL operations
│   │   ├── handlers/        # HTTP handlers
│   │   ├── middleware/      # Auth, CORS, etc.
│   │   ├── models/          # Data models
│   │   └── search/          # Full-text search
│   ├── migrations/          # SQL migrations
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utils, API, store
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Development

1. Clone repository
```bash
git clone https://github.com/your-repo/megashop.git
cd megashop
```

2. Copy environment file
```bash
cp .env.example .env
# Edit .env with your values
```

3. Start services
```bash
docker-compose up -d
```

4. Access
- Frontend: http://localhost:3000
- API: http://localhost:8080
- Admin: http://localhost:3000/admin (login: admin@megashop.sk / admin123)

## Deployment with Coolify

### Option 1: Docker Compose

1. Create new service in Coolify
2. Select "Docker Compose"
3. Point to your repository
4. Set environment variables in Coolify dashboard
5. Deploy

### Option 2: Separate Services

Deploy each service separately:

1. **PostgreSQL** - Use Coolify's managed PostgreSQL
2. **Redis** - Use Coolify's managed Redis
3. **Backend** - Docker build from `/backend`
4. **Frontend** - Docker build from `/frontend`

### Environment Variables for Coolify

```
# Database
DATABASE_URL=postgres://user:pass@host:5432/megashop

# Redis
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-secure-secret-min-32-chars

# API URL (for frontend)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# CORS
ALLOWED_ORIGINS=https://yourdomain.com
```

## Performance

### Database Optimizations (200k products)

- **Indexes**: 15+ specialized indexes for common queries
- **Full-text search**: GIN index with tsvector
- **Trigram search**: Fuzzy matching support
- **Partial indexes**: Active products only
- **Batch inserts**: 1000 products/batch for imports

### Caching Strategy

| Data | TTL | Strategy |
|------|-----|----------|
| Product | 15 min | Per-item |
| Category | 30 min | Full list |
| Filters | 10 min | Per-category |
| Product List | 5 min | Query hash |
| Cart | 24 hours | Per-session |

### Expected Performance

- Product listing: < 50ms (cached), < 200ms (uncached)
- Product detail: < 30ms (cached), < 100ms (uncached)
- Search: < 100ms for 200k products
- XML import: ~5 min for 200k products

## API Endpoints

### Public

```
GET  /api/products              # List products with filters
GET  /api/products/:id          # Get product by ID
GET  /api/products/slug/:slug   # Get product by slug
GET  /api/products/search       # Full-text search
GET  /api/categories            # List categories
GET  /api/categories/:slug      # Get category with products
GET  /api/filters               # Get filter options
POST /api/cart                  # Create cart
GET  /api/cart/:id              # Get cart
POST /api/orders                # Create order
GET  /api/shipping/methods      # Get shipping methods
POST /api/auth/login            # Login
POST /api/auth/register         # Register
```

### Admin (requires auth)

```
GET    /api/admin/dashboard     # Dashboard stats
POST   /api/admin/products      # Create product
PUT    /api/admin/products/:id  # Update product
DELETE /api/admin/products/:id  # Delete product
POST   /api/admin/products/bulk # Bulk operations
GET    /api/admin/orders        # List orders
PUT    /api/admin/orders/:id    # Update order status
POST   /api/admin/feeds         # Create XML feed
POST   /api/admin/feeds/:id/run # Run feed import
POST   /api/admin/cache/clear   # Clear cache
```

## XML Feed Import

Supports Heureka XML format:

```xml
<?xml version="1.0" encoding="utf-8"?>
<SHOP>
  <SHOPITEM>
    <ITEM_ID>SKU123</ITEM_ID>
    <PRODUCTNAME>Product Name</PRODUCTNAME>
    <DESCRIPTION>Description</DESCRIPTION>
    <PRICE_VAT>99.99</PRICE_VAT>
    <IMGURL>https://...</IMGURL>
    <CATEGORYTEXT>Category > Subcategory</CATEGORYTEXT>
  </SHOPITEM>
</SHOP>
```

## License

MIT
