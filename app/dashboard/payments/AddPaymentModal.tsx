'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddPaymentModal({ isOpen, onClose, onSuccess }: AddPaymentModalProps) {
  const t = useTranslations('payments')
  const tc = useTranslations('common')

  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentType, setPaymentType] = useState('payment')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(t('invalidAmount'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          payment_method: paymentMethod,
          payment_type: paymentType,
          notes: notes
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        setAmount('')
        setNotes('')
        setPaymentMethod('cash')
        onSuccess()
      } else {
        toast.error(data.message ? (t(data.message as any) || data.message) : tc('error'))
        setError(data.message)
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">
            {t('addManualPayment')}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1" disabled={loading}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('amount')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => {
                // Convert Arabic/Persian digits to English digits
                const v = e.target.value
                  .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
                  .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
                
                const cleaned = v.replace(/[^0-9.]/g, '')
                const final = cleaned.indexOf('.') !== cleaned.lastIndexOf('.') 
                  ? cleaned.substring(0, cleaned.lastIndexOf('.')) 
                  : cleaned
                setAmount(final)
                setError('')
              }}
              className={cn("input", error && "border-red-500")}
              placeholder="0.00"
              inputMode="decimal"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('type')}
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="input"
            >
              <option value="payment">{t('payment')}</option>
              <option value="refund">{t('refund')}</option>
              <option value="transfer">{t('transferType')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('method')}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input"
            >
              <option value="cash">{t('cash')}</option>
              <option value="card">{t('card')}</option>
              <option value="transfer">{t('transfer')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {tc('notes')} ({tc('optional')})
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              placeholder={t('notesPlaceholder')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={onClose} 
            className="btn-secondary"
            disabled={loading}
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount}
            className="btn-primary"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {tc('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
