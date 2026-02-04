import type { Product, Category, PaginatedResponse, FilterOptions, ShippingMethod, PaymentMethod, Order, DashboardStats, Feed, Offer } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Generic fetch wrapper with better error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`
  
  console.log(`[API] Fetching: ${url}`)
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[API] Error ${res.status}: ${errorText}`)
      throw new Error(`Request failed: ${res.status}`)
    }

    const data = await res.json()
    console.log(`[API] Success: ${endpoint}`, data ? 'has data' : 'empty')
    return data
  } catch (error) {
    console.error(`[API] Fetch error for ${endpoint}:`, error)
    throw error
  }
}

// ==================== PRODUCTS ====================

export async function getProducts(params?: URLSearchParams): Promise<PaginatedResponse<Product>> {
  const query = params ? `?${params.toString()}` : ''
  try {
    return await fetchAPI<PaginatedResponse<Product>>(`/api/products${query}`)
  } catch (error) {
    console.error('getProducts failed:', error)
    return { items: [], total: 0, page: 1, limit: 20, total_pages: 0 }
  }
}

export async function getProduct(id: string): Promise<Product> {
  return fetchAPI<Product>(`/api/products/${id}`)
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return fetchAPI<Product>(`/api/products/slug/${slug}`)
}

export async function searchProducts(query: string, params?: URLSearchParams): Promise<PaginatedResponse<Product>> {
  const searchParams = params || new URLSearchParams()
  searchParams.set('q', query)
  return fetchAPI<PaginatedResponse<Product>>(`/api/products/search?${searchParams.toString()}`)
}

// ==================== CATEGORIES ====================

export async function getCategories(): Promise<Category[]> {
  try {
    return await fetchAPI<Category[]>('/api/categories')
  } catch (error) {
    console.error('getCategories failed:', error)
    return []
  }
}

export async function getCategory(slug: string): Promise<Category> {
  return fetchAPI<Category>(`/api/categories/${slug}`)
}

export async function getCategoryProducts(slug: string, params?: URLSearchParams): Promise<{ category: Category; products: PaginatedResponse<Product> }> {
  const query = params ? `?${params.toString()}` : ''
  return fetchAPI(`/api/categories/${slug}/products${query}`)
}

// ==================== OFFERS ====================

export async function getProductOffers(productId: string): Promise<Offer[]> {
  try {
    const data = await fetchAPI<{ offers: Offer[] }>(`/api/products/${productId}/offers`)
    return data?.offers || []
  } catch {
    return []
  }
}

// ==================== FILTERS ====================

export async function getFilters(categorySlug?: string): Promise<FilterOptions> {
  if (categorySlug) {
    return fetchAPI<FilterOptions>(`/api/filters/${categorySlug}`)
  }
  return fetchAPI<FilterOptions>('/api/filters')
}

// ==================== SHIPPING & PAYMENT ====================

export async function getShippingMethods(): Promise<ShippingMethod[]> {
  return fetchAPI<ShippingMethod[]>('/api/shipping/methods')
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  // This endpoint might need to be added
  return [
    { id: '1', code: 'card', name: 'Platba kartou', description: 'Platba cez Comgate', fee: 0, is_active: true },
    { id: '2', code: 'transfer', name: 'Bankový prevod', description: 'Platba vopred na účet', fee: 0, is_active: true },
    { id: '3', code: 'cod', name: 'Dobierka', description: 'Platba pri prevzatí', fee: 1.5, is_active: true },
  ]
}

// ==================== ORDERS ====================

export async function getOrder(id: string): Promise<Order> {
  return fetchAPI<Order>(`/api/orders/${id}`)
}

export async function trackOrder(orderNumber: string): Promise<Order> {
  return fetchAPI<Order>(`/api/orders/track/${orderNumber}`)
}

// ==================== ADMIN ====================

export async function getDashboard(token: string): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function getAdminProducts(token: string, params?: URLSearchParams): Promise<PaginatedResponse<Product>> {
  const query = params ? `?${params.toString()}` : ''
  return fetchAPI<PaginatedResponse<Product>>(`/api/admin/products${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function createProduct(token: string, product: Partial<Product>): Promise<Product> {
  return fetchAPI<Product>('/api/admin/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(product)
  })
}

export async function updateProduct(token: string, id: string, product: Partial<Product>): Promise<Product> {
  return fetchAPI<Product>(`/api/admin/products/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(product)
  })
}

export async function deleteProduct(token: string, id: string): Promise<void> {
  await fetchAPI(`/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function getAdminOrders(token: string, params?: URLSearchParams): Promise<PaginatedResponse<Order>> {
  const query = params ? `?${params.toString()}` : ''
  return fetchAPI<PaginatedResponse<Order>>(`/api/admin/orders${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function updateOrderStatus(token: string, orderId: string, status: string, trackingNumber?: string): Promise<Order> {
  return fetchAPI<Order>(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, tracking_number: trackingNumber })
  })
}

export async function getFeeds(token: string): Promise<Feed[]> {
  return fetchAPI<Feed[]>('/api/admin/feeds', {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function createFeed(token: string, feed: Partial<Feed>): Promise<Feed> {
  return fetchAPI<Feed>('/api/admin/feeds', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(feed)
  })
}

export async function runFeedImport(token: string, feedId: string): Promise<void> {
  await fetchAPI(`/api/admin/feeds/${feedId}/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function clearCache(token: string): Promise<void> {
  await fetchAPI('/api/admin/cache/clear', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
}

// ==================== UTILS ====================

export function formatPrice(price: number | undefined | null, currency = 'EUR'): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0,00 €'
  }
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency
  }).format(price)
}

export function getProductImage(product: Product | null | undefined): string {
  if (!product) return '/placeholder.svg'
  if (!product.images || product.images.length === 0) {
    return '/placeholder.svg'
  }
  const primary = product.images.find(img => img.is_primary)
  return primary?.url || product.images[0]?.url || '/placeholder.svg'
}

export function calculateDiscount(price: number | undefined, salePrice?: number): number {
  if (!price || !salePrice || salePrice >= price) return 0
  return Math.round((1 - salePrice / price) * 100)
}
