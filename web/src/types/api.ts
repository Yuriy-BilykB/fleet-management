export const TRUCK_STATUSES = ['Available', 'OnTrip', 'InService', 'Decommissioned'] as const
export const DRIVER_STATUSES = ['Active', 'OnTrip', 'OnLeave', 'Inactive'] as const
export const SHIPMENT_STATUSES = ['Draft', 'Scheduled', 'InTransit', 'Delivered', 'Cancelled'] as const
export const TRIP_STATUSES = ['Planned', 'InProgress', 'Completed', 'Cancelled'] as const
export const SERVICE_TYPES = ['Maintenance', 'Repair', 'Inspection', 'TireChange', 'Other'] as const
export const DOCUMENT_TYPES = [
  'Other', 'Insurance', 'Registration', 'TechnicalInspection', 'DriverLicense',
  'MedicalCertificate', 'Contract', 'Invoice', 'WaybillCmr',
] as const
export const DOCUMENT_OWNER_TYPES = ['Truck', 'Driver', 'Shipment'] as const

export type TruckStatus = (typeof TRUCK_STATUSES)[number]
export type DriverStatus = (typeof DRIVER_STATUSES)[number]
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]
export type TripStatus = (typeof TRIP_STATUSES)[number]
export type ServiceType = (typeof SERVICE_TYPES)[number]
export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type DocumentOwnerType = (typeof DOCUMENT_OWNER_TYPES)[number]

export type Paged<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type Company = {
  id: string
  name: string
  taxId: string | null
  address: string | null
  phone: string | null
  email: string | null
  createdAt: string
}

export type Truck = {
  id: string
  companyId: string
  plateNumber: string
  make: string
  model: string
  vin: string | null
  year: number | null
  capacityKg: number
  odometerKm: number
  status: TruckStatus
  insuranceExpiry: string | null
  inspectionExpiry: string | null
  notes: string | null
  createdAt: string
}

export type Driver = {
  id: string
  companyId: string
  assignedTruckId: string | null
  assignedTruckPlate: string | null
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  licenseNumber: string
  licenseExpiry: string | null
  hiredOn: string | null
  status: DriverStatus
  notes: string | null
  createdAt: string
}

export type Customer = {
  id: string
  companyId: string
  name: string
  taxId: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

export type Shipment = {
  id: string
  companyId: string
  customerId: string
  customerName: string | null
  reference: string
  originAddress: string
  destinationAddress: string
  cargoDescription: string
  weightKg: number
  price: number | null
  currency: string
  pickupDate: string
  deliveryDate: string | null
  status: ShipmentStatus
  notes: string | null
  createdAt: string
}

export type Trip = {
  id: string
  shipmentId: string
  shipmentReference: string | null
  driverId: string
  driverName: string | null
  truckId: string
  truckPlate: string | null
  startedAt: string | null
  completedAt: string | null
  distanceKm: number | null
  fuelCost: number | null
  status: TripStatus
  notes: string | null
  createdAt: string
}

export type TruckServiceRecord = {
  id: string
  truckId: string
  truckPlate: string | null
  type: ServiceType
  description: string
  serviceDate: string
  cost: number
  currency: string
  odometerKm: number | null
  provider: string | null
  nextServiceDate: string | null
  notes: string | null
  createdAt: string
}

export type DocumentRecord = {
  id: string
  ownerType: DocumentOwnerType
  ownerId: string
  type: DocumentType
  title: string
  number: string | null
  fileUrl: string | null
  issuedOn: string | null
  expiresOn: string | null
  notes: string | null
  createdAt: string
}

export type Dashboard = {
  trucks: { total: number; available: number; onTrip: number; inService: number; expiringDocuments: number }
  drivers: { total: number; active: number; onTrip: number; expiringLicenses: number }
  shipments: {
    total: number; draft: number; scheduled: number
    inTransit: number; delivered: number; cancelled: number
  }
  activeCustomers: number
  serviceCostThisMonth: number
  activeTrips: Trip[]
  upcomingShipments: Shipment[]
  expiringDocuments: DocumentRecord[]
}
