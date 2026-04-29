import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Loader2, DoorOpen, Search } from 'lucide-react'
import type { Room } from '@/types'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'

export function SelectRoomModal({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (roomId: string, roomNum: string) => void
}) {
  const t = useTranslations('payments')
  const tc = useTranslations('common')
  const tr = useTranslations('rooms')

  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [unpaidOnly, setUnpaidOnly] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch('/api/rooms?limit=1000')
        .then(r => r.json())
        .then(d => {
          console.log('SelectRoomModal: Rooms data:', d)
          if (d.success) {
            setRooms(d.rooms || [])
          }
        })
        .catch(() => toast.error(tc('error')))
        .finally(() => setLoading(false))
    } else {
      setRooms([])
      setSearchTerm('')
      setUnpaidOnly(false)
    }
  }, [isOpen, tc])

  const filteredRooms = rooms.filter(r => {
    const isActive = r.current_session?.status === 'active'
    if (!isActive) return false

    const matchSearch = r.room_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchUnpaid = !unpaidOnly || (r.balance || 0) > 0
    return matchSearch && matchUnpaid
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden p-6 flex flex-col max-h-[90vh]">
        {/* Header: Title and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
          <h3 className="text-xl font-black text-gray-900 shrink-0">{t('selectRoom')}</h3>
          
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <input 
              type="text"
              className="input icon-input h-10 text-sm border-gray-200 focus:border-primary-300 focus:ring-primary-100"
              placeholder={tc('search') || 'Search room...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <button onClick={onClose} className="btn-ghost p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters Row - Above the line */}
        <div className="flex items-center justify-between mb-4 shrink-0">
           <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setUnpaidOnly(!unpaidOnly)}>
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm",
                unpaidOnly ? "bg-primary-600 border-primary-600" : "border-gray-300 bg-white group-hover:border-primary-400"
              )}>
                {unpaidOnly && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <span className="text-sm font-bold text-gray-700">{tr('unpaidOnly') || 'Unpaid only'}</span>
           </div>
           
           <div className="text-sm text-gray-500 font-bold">
             {filteredRooms.length} {tr('rooms') || 'Rooms'}
           </div>
        </div>

        <hr className="mb-4 border-gray-100 shrink-0" />

        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
               <DoorOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
               <p>{searchTerm || unpaidOnly ? tc('noResults') : tr('noRooms')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
               {filteredRooms.map(room => {
                 return (
                   <button
                     key={room.room_id}
                     onClick={() => onSelect(room.room_id, room.room_number)}
                     className={cn(
                       "relative py-5 px-4 rounded-2xl flex flex-col items-center justify-center transition-all border-2",
                       "hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md",
                       "bg-white border-gray-100 hover:border-primary-200"
                     )}
                   >
                     <span className="text-2xl font-black text-gray-900 mb-1">{room.room_number}</span>
                     <span className={cn(
                       "text-xs font-bold px-2 py-0.5 rounded-full mt-1",
                        (room.balance || 0) > 0 ? "text-red-700 bg-red-50" : "text-green-700 bg-green-50"
                     )}>
                       {formatCurrency(room.balance || 0, '', 'SAR')}
                     </span>
                   </button>
                 )
               })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
