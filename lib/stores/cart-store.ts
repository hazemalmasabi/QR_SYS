import { create } from 'zustand'
import type { Item, CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (item: Item) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item: Item) => {
    set((state) => {
      const existing = state.items.find((ci) => ci.item.item_id === item.item_id)
      if (existing) {
        return {
          items: state.items.map((ci) =>
            ci.item.item_id === item.item_id
              ? { ...ci, quantity: ci.quantity + 1 }
              : ci
          ),
        }
      }
      return { items: [...state.items, { item, quantity: 1 }] }
    })
  },

  removeItem: (itemId: string) => {
    set((state) => ({
      items: state.items.filter((ci) => ci.item.item_id !== itemId),
    }))
  },

  updateQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(itemId)
      return
    }
    set((state) => ({
      items: state.items.map((ci) =>
        ci.item.item_id === itemId ? { ...ci, quantity } : ci
      ),
    }))
  },

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce(
      (sum, ci) => sum + ci.item.price * ci.quantity,
      0
    )
  },

  getItemCount: () => {
    return get().items.reduce((sum, ci) => sum + ci.quantity, 0)
  },
}))
