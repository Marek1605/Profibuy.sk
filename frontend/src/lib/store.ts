'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, User } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (open: boolean) => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(i => i.product_id === product.id)
          if (existing) {
            return { items: state.items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i) }
          }
          return { items: [...state.items, { id: Math.random().toString(36), cart_id: '', product_id: product.id, quantity, price: product.sale_price || product.price, product }] }
        })
      },
      removeItem: (productId) => set((s) => ({ items: s.items.filter(i => i.product_id !== productId) })),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) { get().removeItem(productId); return }
        set((s) => ({ items: s.items.map(i => i.product_id === productId ? { ...i, quantity } : i) }))
      },
      clearCart: () => set({ items: [] }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      setCartOpen: (open) => set({ isOpen: open }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'megashop-cart' }
  )
)

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (data: { email: string; password: string; first_name: string; last_name: string; phone?: string }) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
          if (!res.ok) { set({ isLoading: false }); return false }
          const data = await res.json()
          set({ user: data.user, token: data.token, isLoading: false })
          return true
        } catch { set({ isLoading: false }); return false }
      },
      register: async (data) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          if (!res.ok) { set({ isLoading: false }); return false }
          const result = await res.json()
          set({ user: result.user, token: result.token, isLoading: false })
          return true
        } catch { set({ isLoading: false }); return false }
      },
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'megashop-auth' }
  )
)
