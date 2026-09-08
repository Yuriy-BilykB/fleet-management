import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { createCrudHooks } from '@/hooks/use-crud'
import type {
  Company, Customer, Dashboard, Driver, Shipment, Trip, Truck, TruckServiceRecord,
} from '@/types/api'

export const companies = createCrudHooks<Company, CompanyBody>('companies')
export const trucks = createCrudHooks<Truck, TruckBody>('trucks')
export const drivers = createCrudHooks<Driver, DriverBody>('drivers')
export const customers = createCrudHooks<Customer, CustomerBody>('customers')
export const shipments = createCrudHooks<Shipment, ShipmentBody>('shipments')
export const trips = createCrudHooks<Trip, TripBody>('trips')
export const truckServices = createCrudHooks<TruckServiceRecord, TruckServiceBody>('truck-services')

export function useDashboard(companyId: string | null) {
  return useQuery({
    queryKey: ['dashboard', companyId],
    queryFn: ({ signal }) => api.get<Dashboard>('/dashboard', { params: { companyId }, signal }),
    enabled: Boolean(companyId),
  })
}

/** Request bodies mirror the API contracts — every field is sent on PUT. */
export type CompanyBody = {
  name: string;
  taxId: string | null;
  address: string | null
  phone: string | null;
  email: string | null
}

export type TruckBody = {
  companyId: string; plateNumber: string; make: string; model: string
  vin: string | null; year: number | null; capacityKg: number; odometerKm: number
  status: string; insuranceExpiry: string | null; inspectionExpiry: string | null
  notes: string | null
}

export type DriverBody = {
  companyId: string; assignedTruckId: string | null; firstName: string; lastName: string
  phone: string | null; email: string | null; licenseNumber: string
  licenseExpiry: string | null; hiredOn: string | null; status: string; notes: string | null
}

export type CustomerBody = {
  companyId: string; name: string; taxId: string | null; contactPerson: string | null
  phone: string | null; email: string | null; address: string | null
  notes: string | null; isActive: boolean
}

export type ShipmentBody = {
  companyId: string; customerId: string; reference: string; originAddress: string
  destinationAddress: string; cargoDescription: string; weightKg: number
  price: number | null; currency: string; pickupDate: string
  deliveryDate: string | null; status: string; notes: string | null
}

export type TripBody = {
  shipmentId: string; driverId: string; truckId: string
  startedAt: string | null; completedAt: string | null
  distanceKm: number | null; fuelCost: number | null; status: string; notes: string | null
}

export type TruckServiceBody = {
  truckId: string; type: string; description: string; serviceDate: string
  cost: number; currency: string; odometerKm: number | null; provider: string | null
  nextServiceDate: string | null; notes: string | null
}
