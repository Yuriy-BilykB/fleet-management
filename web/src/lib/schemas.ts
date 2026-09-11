import { z } from 'zod'
import {
  DRIVER_STATUSES, SERVICE_TYPES, SHIPMENT_STATUSES, TRIP_STATUSES, TRUCK_STATUSES,
} from '@/types/api'

/**
 * Form validation for every resource, in one place.
 *
 * These mirror the API contracts in `api/Contracts/` — max lengths and required
 * fields match the data annotations there, so the server rejects nothing the
 * form let through. Optional text fields are `.nullable()` because the form
 * controls send `null` for an empty input, and the API expects null, not "".
 */

export const companySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  taxId: z.string().max(32).nullable(),
  address: z.string().max(400).nullable(),
  phone: z.string().max(32).nullable(),
  email: z.email('Invalid email').max(200).nullable(),
})

export const truckSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required').max(16),
  make: z.string().min(1, 'Make is required').max(64),
  model: z.string().min(1, 'Model is required').max(64),
  vin: z.string().max(32).nullable(),
  year: z.number().int().min(1900).max(2100).nullable(),
  capacityKg: z.number().min(0, 'Must be 0 or more').max(100000),
  odometerKm: z.number().int().min(0, 'Must be 0 or more'),
  status: z.enum(TRUCK_STATUSES),
  insuranceExpiry: z.string().nullable(),
  inspectionExpiry: z.string().nullable(),
  notes: z.string().max(1000).nullable(),
})

export const driverSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(32).nullable(),
  email: z.email('Invalid email').max(200).nullable(),
  licenseNumber: z.string().min(1, 'License number is required').max(64),
  licenseExpiry: z.string().nullable(),
  hiredOn: z.string().nullable(),
  status: z.enum(DRIVER_STATUSES),
  assignedTruckId: z.uuid().nullable(),
  notes: z.string().max(1000).nullable(),
})

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  taxId: z.string().max(32).nullable(),
  contactPerson: z.string().max(200).nullable(),
  phone: z.string().max(32).nullable(),
  email: z.email('Invalid email').max(200).nullable(),
  address: z.string().max(400).nullable(),
  notes: z.string().max(1000).nullable(),
  isActive: z.boolean(),
})

export const shipmentSchema = z
  .object({
    customerId: z.uuid('Pick a customer'),
    reference: z.string().min(1, 'Reference is required').max(32),
    originAddress: z.string().min(1, 'Origin is required').max(400),
    destinationAddress: z.string().min(1, 'Destination is required').max(400),
    cargoDescription: z.string().min(1, 'Describe the cargo').max(1000),
    weightKg: z.number().min(0).max(100000),
    price: z.number().min(0).nullable(),
    currency: z.string().length(3, 'Use a 3-letter code'),
    pickupDate: z.string().min(1, 'Pickup date is required'),
    deliveryDate: z.string().nullable(),
    status: z.enum(SHIPMENT_STATUSES),
    notes: z.string().max(1000).nullable(),
  })
  // The API enforces this too; checking here keeps the error on the field.
  .refine((v) => !v.deliveryDate || new Date(v.deliveryDate) >= new Date(v.pickupDate), {
    path: ['deliveryDate'],
    message: 'Delivery cannot be before pickup',
  })

/** Driver + truck assignment that creates a trip for a shipment. */
export const assignShipmentSchema = z.object({
  driverId: z.uuid('Pick a driver'),
  truckId: z.uuid('Pick a truck'),
  startedAt: z.string().nullable(),
  notes: z.string().max(1000).nullable(),
})

export const tripSchema = z
  .object({
    shipmentId: z.uuid('Pick a shipment'),
    driverId: z.uuid('Pick a driver'),
    truckId: z.uuid('Pick a truck'),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    distanceKm: z.number().min(0).nullable(),
    fuelCost: z.number().min(0).nullable(),
    status: z.enum(TRIP_STATUSES),
    notes: z.string().max(1000).nullable(),
  })
  .refine((v) => !v.completedAt || !v.startedAt || new Date(v.completedAt) >= new Date(v.startedAt), {
    path: ['completedAt'],
    message: 'Completion cannot be before the start',
  })

export const truckServiceSchema = z.object({
  truckId: z.uuid('Pick a truck'),
  type: z.enum(SERVICE_TYPES),
  description: z.string().min(1, 'Describe the work').max(1000),
  serviceDate: z.string().min(1, 'Service date is required'),
  cost: z.number().min(0),
  currency: z.string().length(3, 'Use a 3-letter code'),
  odometerKm: z.number().int().min(0).nullable(),
  provider: z.string().max(200).nullable(),
  nextServiceDate: z.string().nullable(),
  notes: z.string().max(1000).nullable(),
})

export type CompanyFormValues = z.infer<typeof companySchema>
export type TruckFormValues = z.infer<typeof truckSchema>
export type DriverFormValues = z.infer<typeof driverSchema>
export type CustomerFormValues = z.infer<typeof customerSchema>
export type ShipmentFormValues = z.infer<typeof shipmentSchema>
export type AssignShipmentFormValues = z.infer<typeof assignShipmentSchema>
export type TripFormValues = z.infer<typeof tripSchema>
export type TruckServiceFormValues = z.infer<typeof truckServiceSchema>
