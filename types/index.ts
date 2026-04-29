export interface Hotel {
  hotel_id: string
  hotel_name: string
  hotel_name_translations?: Record<string, string>
  hotel_logo_url?: string
  barcode_text_translations?: Record<string, string>
  timezone: string
  currency_code: string
  currency_symbol: string
  room_types: RoomType[]
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface RoomType {
  code: string
  name: Record<string, string>
  original_code?: string
  rooms_count?: number
}

export interface Employee {
  employee_id: string
  hotel_id: string
  full_name: string
  username: string
  email: string | null
  phone_number: string | null
  role: 'hotel_supervisor' | 'service_supervisor' | 'service_employee'
  assigned_service_id: string | null
  is_primary_supervisor: boolean
  status: 'active' | 'disabled'
  email_verified: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface Room {
  room_id: string
  hotel_id: string
  room_number: string
  floor_number: number | null
  room_type: string
  notes: string | null
  qr_code: string | null
  status: 'active' | 'inactive'
  deleted_at: string | null
  created_at: string
  updated_at: string
  current_session?: GuestSession | null
  balance?: number
}

export interface MainService {
  service_id: string
  hotel_id: string
  service_name: Record<string, string>
  description: Record<string, string>
  image_url: string | null
  availability_type: '24/7' | 'scheduled'
  start_time: string | null
  end_time: string | null
  estimated_time_min: number | null
  estimated_time_max: number | null
  estimated_time_unit: 'minutes' | 'hours' | null
  status: 'active' | 'inactive'
  display_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface SubService {
  sub_service_id: string
  parent_service_id: string
  sub_service_name: Record<string, string>
  description: Record<string, string> | null
  image_url: string | null
  display_order: number
  availability_type: 'always' | 'scheduled'
  start_time: string | null
  end_time: string | null
  status: 'active' | 'inactive'
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Item {
  item_id: string
  sub_service_id: string
  item_name: Record<string, string>
  description: Record<string, string>
  image_url: string | null
  price: number
  is_free: boolean
  display_order: number
  availability_status: 'available' | 'unavailable'
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  item_id: string
  item_name: Record<string, string>
  quantity: number
  unit_price: number
  total: number
}

export interface Order {
  order_id: string
  order_number: string
  room_id: string
  hotel_id: string
  service_id: string
  sub_service_id: string | null
  order_items: OrderItem[]
  total_amount: number
  currency_code: string
  status: 'new' | 'under_modification' | 'in_progress' | 'completed' | 'cancelled'
  session_id?: string | null
  payment_status?: 'unpaid' | 'paid_in_full' | 'partial_paid' | 'pay_on_checkout'
  paid_amount?: number
  created_at: string
  accepted_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  updated_at: string
  cancellation_reason: string | null
  estimated_time: number | null
  actual_time: number | null
  handled_by: string | null
  notes: string | null
  modification_reason: string | null
}

export interface RoomQRMapping {
  mapping_id: string
  qr_code_id: string
  room_id: string
  hotel_id: string
  qr_image_url: string | null
  is_active: boolean
  created_at: string
}

export interface SessionPayload {
  employeeId: string
  hotelId: string
  role: 'hotel_supervisor' | 'service_supervisor' | 'service_employee'
  isPrimarySupervisor: boolean
  assignedServiceId: string | null
  fullName: string
}

export interface CartItem {
  item: Item
  quantity: number
  serviceId?: string
  serviceName?: Record<string, string>
  serviceDisplayOrder?: number
}

export interface GuestSession {
  session_id: string
  hotel_id: string
  room_id: string
  status: 'active' | 'checked_out'
  guest_name: string | null
  check_in_time: string
  check_out_time: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  payment_id: string
  hotel_id: string
  session_id: string
  order_id: string | null
  amount: number
  payment_method: 'cash' | 'card' | null
  payment_type: 'payment' | 'transfer'
  received_by_employee_id: string | null
  location_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
