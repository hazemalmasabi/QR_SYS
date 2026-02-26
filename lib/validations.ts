import { z } from 'zod'

export const registerSchema = z.object({
  hotelName: z.string().min(3, 'min3').max(100, 'max100'),
  hotelNameEn: z.string().min(3, 'min3').max(100, 'max100'),
  timezone: z.string().min(1, 'required'),
  currencyCode: z.string().length(3, 'required'),
  fullName: z.string().min(3, 'min3').max(100, 'max100'),
  email: z.string().email('invalidEmail'),
  phone: z.string().regex(/^[0-9]{7,15}$/, 'phoneInvalid'),
  password: z
    .string()
    .min(8, 'passwordMin')
    .regex(/[A-Z]/, 'passwordRequirements')
    .regex(/[a-z]/, 'passwordRequirements')
    .regex(/[0-9]/, 'passwordRequirements')
    .regex(/[@#$%^&*!]/, 'passwordRequirements'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'passwordMismatch',
  path: ['confirmPassword'],
})

export const loginEmailSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string().min(1, 'required'),
})

export const loginUsernameSchema = z.object({
  hotelId: z.string().min(1, 'required'),
  username: z.string().min(1, 'required'),
  password: z.string().min(1, 'required'),
})

export const loginUnifiedSchema = z.object({
  identifier: z.string().min(1, 'required'),
  password: z.string().min(1, 'required'),
})

export const employeeSchema = z.object({
  fullName: z.string().min(3, 'required').max(100),
  username: z.string().min(3, 'required').max(50),
  phone: z.string().regex(/^[0-9]{7,15}$/).optional().or(z.literal('')),
  password: z.string().min(8, 'required'),
  role: z.enum(['hotel_supervisor', 'service_supervisor', 'service_employee']),
  assignedServiceId: z.string().optional(),
})

export const roomSchema = z.object({
  roomNumber: z.string().min(1, 'required').max(20),
  floorNumber: z.number().min(0).max(99).optional(),
  roomType: z.string().min(1, 'required'),
  notes: z.string().max(500).optional(),
})

export const mainServiceSchema = z.object({
  serviceNameAr: z.string().min(1, 'required'),
  serviceNameEn: z.string().min(1, 'required'),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  availabilityType: z.enum(['24/7', 'scheduled']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  displayOrder: z.number().min(1).default(1),
})

export const subServiceSchema = z.object({
  parentServiceId: z.string().min(1, 'required'),
  subServiceNameAr: z.string().min(1, 'required'),
  subServiceNameEn: z.string().min(1, 'required'),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  availabilityType: z.enum(['always', 'scheduled']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  displayOrder: z.number().min(1).default(1),
})

export const itemSchema = z.object({
  subServiceId: z.string().min(1, 'required'),
  itemNameAr: z.string().min(1, 'required'),
  itemNameEn: z.string().min(1, 'required'),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  isFree: z.boolean().default(false),
  price: z.any().transform(v => {
    const num = Number(v)
    return isNaN(num) ? 0 : num
  }),
  displayOrder: z.number().min(1).default(1),
}).refine((data) => data.isFree || data.price > 0, {
  message: 'required',
  path: ['price'],
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginEmailInput = z.infer<typeof loginEmailSchema>
export type LoginUsernameInput = z.infer<typeof loginUsernameSchema>
