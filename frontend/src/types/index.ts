// Product types
export interface Product {
  id: string
  sku: string
  slug: string
  name: string
  description: string
  price: number
  sale_price?: number
  currency: string
  stock: number
  category_id?: string
  brand_id?: string
  images: ProductImage[]
  attributes: ProductAttribute[]
  variants?: ProductVariant[]
  meta_title: string
  meta_description: string
  status: 'active' | 'draft' | 'archived'
  weight: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  url: string
  alt: string
  position: number
  is_primary: boolean
}

export interface ProductAttribute {
  name: string
  value: string
  unit?: string
}

export interface ProductVariant {
  id: string
  sku: string
  name: string
  price: number
  stock: number
  options: VariantOption[]
}

export interface VariantOption {
  name: string
  value: string
}

// Category types
export interface Category {
  id: string
  parent_id?: string
  slug: string
  name: string
  description: string
  image: string
  position: number
  meta_title: string
  meta_description: string
  product_count: number
  published?: boolean
  children?: Category[]
  path: string
  created_at: string
  updated_at: string
}

// Brand type
export interface Brand {
  id: string
  slug: string
  name: string
  logo: string
  description: string
  website: string
}

// Cart types
export interface Cart {
  id: string
  session_id: string
  user_id?: string
  items: CartItem[]
  total: number
  currency: string
  created_at: string
  updated_at: string
  expires_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  product_id: string
  variant_id?: string
  quantity: number
  price: number
  product?: Product
}

// Order types
export interface Order {
  id: string
  order_number: string
  user_id?: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: string
  shipping_method: string
  shipping_price: number
  subtotal: number
  tax: number
  total: number
  currency: string
  billing_address: Address
  shipping_address: Address
  note: string
  items: OrderItem[]
  tracking_number: string
  invoice_number: string
  created_at: string
  updated_at: string
  paid_at?: string
  shipped_at?: string
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id?: string
  sku: string
  name: string
  price: number
  quantity: number
  total: number
}

// Address type
export interface Address {
  first_name: string
  last_name: string
  company?: string
  street: string
  city: string
  postal_code: string
  country: string
  country_code: string
  phone: string
  email: string
  ico?: string
  dic?: string
  ic_dph?: string
}

// User type
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'customer' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Filter types
export interface ProductFilter {
  category_id?: string
  brand_ids?: string[]
  price_min?: number
  price_max?: number
  in_stock?: boolean
  on_sale?: boolean
  attributes?: Record<string, string[]>
  search?: string
  sort?: 'price_asc' | 'price_desc' | 'name' | 'newest' | 'bestselling'
  page?: number
  limit?: number
}

export interface FilterOptions {
  categories: CategoryFilter[]
  brands: BrandFilter[]
  price_range: PriceRange
  attributes: AttributeFilter[]
}

export interface CategoryFilter {
  id: string
  name: string
  slug: string
  count: number
}

export interface BrandFilter {
  id: string
  name: string
  count: number
}

export interface PriceRange {
  min: number
  max: number
}

export interface AttributeFilter {
  name: string
  values: AttributeValue[]
}

export interface AttributeValue {
  value: string
  count: number
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Shipping & Payment
export interface ShippingMethod {
  id: string
  code: string
  name: string
  description: string
  price: number
  free_from: number
  is_active: boolean
}

export interface PaymentMethod {
  id: string
  code: string
  name: string
  description: string
  fee: number
  is_active: boolean
}

// Dashboard
export interface DashboardStats {
  total_revenue: number
  today_revenue: number
  total_orders: number
  today_orders: number
  pending_orders: number
  total_products: number
  low_stock_products: number
  total_customers: number
  recent_orders: Order[]
  top_products: ProductStat[]
  sales_chart: ChartData[]
}

export interface ProductStat {
  product: Product
  total_sold: number
  revenue: number
}

export interface ChartData {
  date: string
  revenue: number
  orders: number
}

// Feed
export interface Feed {
  id: string
  name: string
  url: string
  type: 'heureka' | 'google' | 'custom'
  mapping: Record<string, string>
  schedule: string
  is_active: boolean
  last_run_at?: string
  last_status: string
  product_count: number
  created_at: string
}

// Offer (from vendors/suppliers)
export interface Offer {
  id: string
  product_id: string
  shop_id?: string
  shop_name: string
  shop_logo?: string
  shop_url?: string
  price: number
  original_price?: number
  stock_status: 'instock' | 'outofstock' | 'preorder'
  delivery: string
  shipping: number
  rating?: number
  review_count?: number
  affiliate_url?: string
  display_mode?: 'free' | 'cpc' | 'master'
  is_master?: boolean
  initials?: string
}
