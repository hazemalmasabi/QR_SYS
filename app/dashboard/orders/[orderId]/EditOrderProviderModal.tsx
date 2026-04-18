import { useState } from 'react'
import { X, Loader2, Minus, Plus } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'

interface EditOrderProviderModalProps {
  order: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currencySymbol: string
}

export function EditOrderProviderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
  currencySymbol
}: EditOrderProviderModalProps) {
  const t = useTranslations('orders')
  const tm = useTranslations('ordersDetails')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [pendingChanges, setPendingChanges] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  const MODIFICATION_PRESETS = tm.raw('modificationPresets') as Record<string, string>

  if (isOpen && items.length === 0 && order) {
    setItems(JSON.parse(JSON.stringify(order.order_items)))
  }

  const handleClose = () => {
    setItems([])
    setCustomReason('')
    setSelectedPreset(null)
    onClose()
  }

  const handleUpdateQuantity = (index: number, diff: number) => {
    setItems((prev) => {
      const nextQ = prev[index].quantity + diff
      if (nextQ < 0) return prev
      
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], quantity: nextQ }
      return newItems
    })
  }

  const handleSave = async () => {
    if (!order) return
    const finalReason = selectedPreset === 'other' ? customReason : (selectedPreset || customReason)

    if (!finalReason.trim()) {
      toast.error(t('modificationReasonRequired'))
      return
    }

    const finalItems = items.filter(i => i.quantity > 0)
    
    // Build Diff Summary
    const changes: string[] = []
    const originalItems = order.order_items || []
    
    originalItems.forEach((orig: any) => {
      const name = (orig.item_name as any)[locale] || (orig.item_name as any).en || (orig.item_name as any).ar || ''
      const current = items.find(i => i.item_id === orig.item_id)
      
      if (!current || current.quantity === 0) {
        changes.push(`• ${name}: ${t('was')} ${orig.quantity}, ${t('became')} 0 (${t('itemRemoved')})`)
      } else if (current.quantity !== orig.quantity) {
        changes.push(`• ${name}: ${t('was')} ${orig.quantity}, ${t('became')} ${current.quantity}`)
      }
    })

    if (changes.length > 0) {
      setPendingChanges(changes)
      setShowConfirmModal(true)
      return
    }

    executeSave(finalItems, finalReason)
  }

  const executeSave = async (finalItems: any[], finalReason: string, techLogs: string = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.order_id}/provider-edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit_edit',
          order_items: finalItems,
          modification_reason: techLogs ? `${finalReason}\n${techLogs}` : finalReason
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(t('saveChanges') + ' ✅')
        onSuccess()
        handleClose()
      } else {
        toast.error(data.message || 'Error occurred')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error saving order')
    } finally {
      setLoading(false)
      setShowConfirmModal(false)
    }
  }

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-md flex-col max-h-[90vh] rounded-xl bg-white shadow-xl overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">{t('editOrder')} #{order.order_number}</h2>
          <button onClick={handleClose} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto min-h-0 space-y-4">
          <div>
             <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('items')}</h3>
             <div className="space-y-3">
               {items.map((item, idx) => {
                 const name = (item.item_name as any)[locale] || (item.item_name as any).en || (item.item_name as any).ar || ''
                 return (
                   <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        <span className="text-xs text-gray-500">{item.unit_price ?? item.price ?? 0} {currencySymbol}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-4 text-center font-semibold text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                 )
               })}
             </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('modificationReason')} <span className="text-red-500">*</span></h3>
            
            <div className="space-y-2 mb-3">
              {Object.entries(MODIFICATION_PRESETS || {}).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedPreset === key
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="modificationReason"
                        value={key}
                        checked={selectedPreset === key}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                  </div>
                </label>
              ))}

              <label
                className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${
                  selectedPreset === 'other'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="modificationReason"
                      value="other"
                      checked={selectedPreset === 'other'}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{tm('otherReason') ?? 'Other'}</span>
                </div>
              </label>
            </div>

            {selectedPreset === 'other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full textarea resize-none mt-2"
                placeholder={t('modificationReasonPlaceholder')}
                rows={3}
                required
              />
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 btn-secondary"
          >
            {t('cancelEdit')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 btn-primary flex justify-center items-center"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('saveChanges')}
          </button>
        </div>

        {/* Confirmation Overlay Modal */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-10 flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('confirmModificationChanges')}
              </h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {pendingChanges.map((change, i) => (
                  <p key={i} className="text-sm font-medium text-gray-700 leading-relaxed max-w-full truncate whitespace-normal break-words">{change}</p>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-white">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="flex-1 btn-secondary"
              >
                {t('cancelEdit')}
              </button>
              <button
                onClick={() => executeSave(items.filter(i => i.quantity > 0), selectedPreset === 'other' ? customReason : (selectedPreset || customReason), pendingChanges.join('\n'))}
                disabled={loading}
                className="flex-1 btn-primary flex justify-center items-center"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('saveChanges')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
