import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Cart, CartItem, Product, User, Address, ShippingMethod, PaymentMethod } from '@/types'

// ==================== CART STORE ====================
interface CartState {
  cart: Cart | null
  isLoading: boolean
  error: string | null
  
  // Actions
  initCart: () => Promise<void>
  addItem: (product: Product, quantity?: number, variantId?: string) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => void
  getItemCount: () => number
  getTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      error: null,

      initCart: async () => {
        const { cart } = get()
        if (cart) return

        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: crypto.randomUUID() })
          })
          const data = await res.json()
          set({ cart: data, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to initialize cart', isLoading: false })
        }
      },

      addItem: async (product: Product, quantity = 1, variantId?: string) => {
        const { cart } = get()
        if (!cart) {
          await get().initCart()
        }

        const currentCart = get().cart
        if (!currentCart) return

        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`/api/cart/${currentCart.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: product.id,
              variant_id: variantId,
              quantity
            })
          })
          const data = await res.json()
          set({ cart: data, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to add item', isLoading: false })
        }
      },

      updateItem: async (itemId: string, quantity: number) => {
        const { cart } = get()
        if (!cart) return

        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`/api/cart/${cart.id}/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
          })
          const data = await res.json()
          set({ cart: data, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to update item', isLoading: false })
        }
      },

      removeItem: async (itemId: string) => {
        const { cart } = get()
        if (!cart) return

        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`/api/cart/${cart.id}/items/${itemId}`, {
            method: 'DELETE'
          })
          const data = await res.json()
          set({ cart: data, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to remove item', isLoading: false })
        }
      },

      clearCart: () => set({ cart: null }),

      getItemCount: () => {
        const { cart } = get()
        if (!cart) return 0
        return cart.items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getTotal: () => {
        const { cart } = get()
        if (!cart) return 0
        return cart.total
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart })
    }
  )
)

// ==================== AUTH STORE ====================
interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<boolean>
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })
          
          if (!res.ok) {
            const data = await res.json()
            set({ error: data.error || 'Login failed', isLoading: false })
            return false
          }

          const data = await res.json()
          set({ user: data.user, token: data.token, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Login failed', isLoading: false })
          return false
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })

          if (!res.ok) {
            const result = await res.json()
            set({ error: result.error || 'Registration failed', isLoading: false })
            return false
          }

          const result = await res.json()
          set({ user: result.user, token: result.token, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Registration failed', isLoading: false })
          return false
        }
      },

      logout: () => {
        set({ user: null, token: null })
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) return

        // Verify token is still valid
        // TODO: Implement token refresh
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
)

// ==================== CHECKOUT STORE ====================
interface CheckoutState {
  billingAddress: Address | null
  shippingAddress: Address | null
  sameAsBilling: boolean
  shippingMethod: ShippingMethod | null
  paymentMethod: PaymentMethod | null
  note: string
  isProcessing: boolean
  error: string | null

  setBillingAddress: (address: Address) => void
  setShippingAddress: (address: Address) => void
  setSameAsBilling: (same: boolean) => void
  setShippingMethod: (method: ShippingMethod) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setNote: (note: string) => void
  createOrder: (cartId: string) => Promise<string | null>
  reset: () => void
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  billingAddress: null,
  shippingAddress: null,
  sameAsBilling: true,
  shippingMethod: null,
  paymentMethod: null,
  note: '',
  isProcessing: false,
  error: null,

  setBillingAddress: (address) => set({ billingAddress: address }),
  setShippingAddress: (address) => set({ shippingAddress: address }),
  setSameAsBilling: (same) => set({ sameAsBilling: same }),
  setShippingMethod: (method) => set({ shippingMethod: method }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setNote: (note) => set({ note }),

  createOrder: async (cartId: string) => {
    const { billingAddress, shippingAddress, sameAsBilling, shippingMethod, paymentMethod, note } = get()

    if (!billingAddress || !shippingMethod || !paymentMethod) {
      set({ error: 'Please fill all required fields' })
      return null
    }

    set({ isProcessing: true, error: null })

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_id: cartId,
          payment_method: paymentMethod.code,
          shipping_method: shippingMethod.code,
          billing_address: billingAddress,
          shipping_address: sameAsBilling ? billingAddress : shippingAddress,
          note
        })
      })

      if (!res.ok) {
        const data = await res.json()
        set({ error: data.error || 'Failed to create order', isProcessing: false })
        return null
      }

      const order = await res.json()
      set({ isProcessing: false })

      // Clear cart
      useCartStore.getState().clearCart()

      return order.id
    } catch (error) {
      set({ error: 'Failed to create order', isProcessing: false })
      return null
    }
  },

  reset: () => set({
    billingAddress: null,
    shippingAddress: null,
    sameAsBilling: true,
    shippingMethod: null,
    paymentMethod: null,
    note: '',
    isProcessing: false,
    error: null
  })
}))

// ==================== UI STORE ====================
interface UIState {
  isMobileMenuOpen: boolean
  isCartOpen: boolean
  isSearchOpen: boolean
  searchQuery: string

  toggleMobileMenu: () => void
  toggleCart: () => void
  toggleSearch: () => void
  setSearchQuery: (query: string) => void
  closeAll: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  isCartOpen: false,
  isSearchOpen: false,
  searchQuery: '',

  toggleMobileMenu: () => set((state) => ({ 
    isMobileMenuOpen: !state.isMobileMenuOpen,
    isCartOpen: false,
    isSearchOpen: false
  })),

  toggleCart: () => set((state) => ({ 
    isCartOpen: !state.isCartOpen,
    isMobileMenuOpen: false,
    isSearchOpen: false
  })),

  toggleSearch: () => set((state) => ({ 
    isSearchOpen: !state.isSearchOpen,
    isMobileMenuOpen: false,
    isCartOpen: false
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  closeAll: () => set({
    isMobileMenuOpen: false,
    isCartOpen: false,
    isSearchOpen: false
  })
}))

// ==================== FILTER STORE ====================
interface FilterState {
  filters: {
    category?: string
    brands: string[]
    priceMin?: number
    priceMax?: number
    inStock: boolean
    onSale: boolean
    sort: string
  }
  
  setCategory: (category: string | undefined) => void
  toggleBrand: (brandId: string) => void
  setPriceRange: (min?: number, max?: number) => void
  setInStock: (inStock: boolean) => void
  setOnSale: (onSale: boolean) => void
  setSort: (sort: string) => void
  resetFilters: () => void
  getQueryString: () => string
}

const defaultFilters = {
  category: undefined,
  brands: [],
  priceMin: undefined,
  priceMax: undefined,
  inStock: false,
  onSale: false,
  sort: 'newest'
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: { ...defaultFilters },

  setCategory: (category) => set((state) => ({
    filters: { ...state.filters, category }
  })),

  toggleBrand: (brandId) => set((state) => {
    const brands = state.filters.brands.includes(brandId)
      ? state.filters.brands.filter(id => id !== brandId)
      : [...state.filters.brands, brandId]
    return { filters: { ...state.filters, brands } }
  }),

  setPriceRange: (min, max) => set((state) => ({
    filters: { ...state.filters, priceMin: min, priceMax: max }
  })),

  setInStock: (inStock) => set((state) => ({
    filters: { ...state.filters, inStock }
  })),

  setOnSale: (onSale) => set((state) => ({
    filters: { ...state.filters, onSale }
  })),

  setSort: (sort) => set((state) => ({
    filters: { ...state.filters, sort }
  })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  getQueryString: () => {
    const { filters } = get()
    const params = new URLSearchParams()

    if (filters.category) params.set('category', filters.category)
    if (filters.brands.length) params.set('brands', filters.brands.join(','))
    if (filters.priceMin) params.set('price_min', String(filters.priceMin))
    if (filters.priceMax) params.set('price_max', String(filters.priceMax))
    if (filters.inStock) params.set('in_stock', 'true')
    if (filters.onSale) params.set('on_sale', 'true')
    if (filters.sort !== 'newest') params.set('sort', filters.sort)

    return params.toString()
  }
}))
