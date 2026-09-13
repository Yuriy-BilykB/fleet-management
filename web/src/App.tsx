import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardPage } from '@/pages/dashboard'
import { TrucksPage } from '@/pages/trucks'
import { TruckDetailPage } from '@/pages/truck-detail'
import { DriverDetailPage } from '@/pages/driver-detail'
import { CustomerDetailPage } from '@/pages/customer-detail'
import { ShipmentDetailPage } from '@/pages/shipment-detail'
import { TripDetailPage } from '@/pages/trip-detail'
import { CompanyDetailPage } from '@/pages/company-detail'
import { DriversPage } from '@/pages/drivers'
import { CustomersPage } from '@/pages/customers'
import { ShipmentsPage } from '@/pages/shipments'
import { TripsPage } from '@/pages/trips'
import { TruckServicesPage } from '@/pages/truck-services'
import { CompaniesPage } from '@/pages/companies'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="/trucks" element={<TrucksPage />} />
        <Route path="/trucks/:id" element={<TruckDetailPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/drivers/:id" element={<DriverDetailPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/truck-services" element={<TruckServicesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
