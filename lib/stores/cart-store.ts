import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Item, CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (
    item: Item,
    serviceId?: string,
    serviceName?: { ar: string; en: string },
    serviceDisplayOrder?: number
  ) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (
        item: Item,
        serviceId?: string,
        serviceName?: { ar: string; en: string },
        serviceDisplayOrder?: number
      ) => {
        set((state) => {
          const existing = state.items.find((ci) => ci.item.item_id === item.item_id)
          if (existing) {
            return {
              items: state.items.map((ci) =>
                ci.item.item_id === item.item_id
                  ? {
                    ...ci,
                    quantity: ci.quantity + 1,
                    serviceId: serviceId || ci.serviceId,
                    serviceName: serviceName || ci.serviceName,
                    serviceDisplayOrder: serviceDisplayOrder !== undefined ? serviceDisplayOrder : ci.serviceDisplayOrder
                  }
                  : ci
              ),
            }
          }
          return {
            items: [
              ...state.items,
              { item, quantity: 1, serviceId, serviceName, serviceDisplayOrder },
            ],
          }
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
          (sum, ci) => sum + (ci.item.is_free ? 0 : ci.item.price) * ci.quantity,
          0
        )
      },

      getItemCount: () => {
        return get().items.reduce((sum, ci) => sum + ci.quantity, 0)
      },
    }),
    {
      name: 'guest-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
