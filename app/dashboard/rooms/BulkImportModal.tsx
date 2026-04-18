'use client'

import { useState, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { X, Loader2, FileSpreadsheet, AlertCircle } from 'lucide-react'
import type { RoomType } from '@/types'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  roomTypes: RoomType[]
}

interface ParsedRoom {
  room_number: string
  floor_number: number | null
  notes: string | null
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  roomTypes,
}: BulkImportModalProps) {
  const t = useTranslations('rooms')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [hasHeaders, setHasHeaders] = useState(true)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [parsedData, setParsedData] = useState<ParsedRoom[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      handleParse(selected, hasHeaders)
    }
  }

  const handleParse = (selectedFile: File, hasHeaderRow: boolean) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Ensure raw to get an array of arrays
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Remove empty rows
        let dataRows = rawJson.filter(row => row.length > 0 && row.some(cell => cell !== undefined && cell !== null && cell !== ''))
        
        if (hasHeaderRow && dataRows.length > 0) {
          dataRows.shift() // Remove header
        }
        
        const roomsToImport: ParsedRoom[] = dataRows.map(row => {
          const rawRoomNumber = row[0]
          return {
            room_number: rawRoomNumber !== undefined && rawRoomNumber !== null ? String(rawRoomNumber) : '',
            floor_number: row[1] && !isNaN(Number(row[1])) ? Number(row[1]) : null,
            notes: row[2] ? String(row[2]) : null
          }
        }).filter(r => r.room_number.trim() !== '')
        setParsedData(roomsToImport)
        setStep(2)
      } catch {
        toast.error(tc('error'))
      }
    }
    reader.onerror = () => {
      toast.error(tc('error'))
    }
    reader.readAsBinaryString(selectedFile)
  }

  const handleImport = async () => {
    if (!selectedRoomType) {
      toast.error(t('roomType') + ' - ' + tc('required'))
      return
    }

    if (parsedData.length === 0) {
      toast.error(tc('noData'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        rooms: parsedData.map(r => ({
          ...r,
          room_type: selectedRoomType
        }))
      }

      const res = await fetch('/api/rooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        onSuccess()
        onClose()
      } else {
        toast.error(data.message === 'allDuplicatesOrInvalid' ? t('allDuplicatesOrInvalid') : tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setParsedData([])
    setSelectedRoomType('')
    setStep(1)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col max-h-[90vh] rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 1 ? t('importTitle1') : t('importTitle2', { count: parsedData.length })}
          </h2>
          <button onClick={handleClose} className="btn-ghost p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto min-h-0" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          {step === 1 ? (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">{t('importFormatInstTitle')}</p>
                    <p>{t('importFormatInstDesc')}</p>
                    <ol className="list-decimal ms-5 mt-2 space-y-1">
                      <li>{t('importCol1')}</li>
                      <li>{t('importCol2')}</li>
                      <li>{t('importCol3')}</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="hasHeaders" 
                  checked={hasHeaders} 
                  onChange={(e) => setHasHeaders(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-600"
                />
                <label htmlFor="hasHeaders" className="text-sm font-medium text-gray-700 cursor-pointer">
                  {t('hasHeadersToggle')}
                </label>
              </div>

              <div className="pt-2">
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 hover:border-primary-500 transition-colors group"
                >
                  <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{t('uploadBtnTxt')}</span>
                  <span className="text-xs text-gray-500 mt-1">{t('uploadHint')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-sm text-green-800">
                {t.rich('foundValidRooms', { count: parsedData.length, strong: (chunks) => <strong>{chunks}</strong> })}
              </div>

              {parsedData.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden shrink-0">
                  <table className="w-full text-sm text-start">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3 font-medium text-start">{t('roomNumber')}</th>
                        <th className="py-2 px-3 font-medium text-start">{t('floor')}</th>
                        <th className="py-2 px-3 font-medium text-start">{t('notes')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2 px-3">{parsedData[0].room_number}</td>
                        <td className="py-2 px-3">{parsedData[0].floor_number ?? '-'}</td>
                        <td className="py-2 px-3 truncate max-w-[150px]">{parsedData[0].notes ?? '-'}</td>
                      </tr>
                      {parsedData.length > 2 && (
                        <tr>
                          <td colSpan={3} className="py-1 px-3 text-center text-gray-400 bg-gray-50/50">
                            {t('otherRoomsCount', { count: parsedData.length - 2 })}
                          </td>
                        </tr>
                      )}
                      {parsedData.length > 1 && (
                        <tr>
                          <td className="py-2 px-3">{parsedData[parsedData.length - 1].room_number}</td>
                          <td className="py-2 px-3">{parsedData[parsedData.length - 1].floor_number ?? '-'}</td>
                          <td className="py-2 px-3 truncate max-w-[150px]">{parsedData[parsedData.length - 1].notes ?? '-'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="label block mb-1">{t('importRoomTypeLabel')} <span className="text-red-500">*</span></label>
                <select
                  value={selectedRoomType}
                  onChange={(e) => setSelectedRoomType(e.target.value)}
                  className="input w-full"
                >
                  <option value="">{tc('select')}</option>
                  {roomTypes.map((rt) => {
                    const displayName = rt.name?.[locale] || rt.name?.en || rt.code
                    return (
                      <option key={rt.code} value={rt.code}>
                        {displayName}
                      </option>
                    )
                  })}
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={step === 2 ? () => setStep(1) : handleClose}
            className="btn-secondary"
            disabled={loading}
          >
            {step === 2 ? tc('back') : tc('cancel')}
          </button>
          
          {step === 2 && (
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleImport}
              disabled={loading || !selectedRoomType}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('confirmImportBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
