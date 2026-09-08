import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardPage } from '@/pages/dashboard'
import { TrucksPage } from '@/pages/trucks'
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
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/truck-services" element={<TruckServicesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
