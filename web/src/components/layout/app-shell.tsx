import { NavLink, Outlet } from 'react-router-dom'
import {
  Building2, LayoutDashboard, Package, Route, Truck, UserRound, Users, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompanySwitcher } from '@/components/layout/company-switcher'
import { ThemeToggle } from '@/components/layout/theme-toggle'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trucks', label: 'Trucks', icon: Truck },
  { to: '/drivers', label: 'Drivers', icon: UserRound },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/shipments', label: 'Shipments', icon: Package },
  { to: '/trips', label: 'Trips', icon: Route },
  { to: '/truck-services', label: 'Truck Services', icon: Wrench },
  { to: '/companies', label: 'Companies', icon: Building2 },
]

export function AppShell() {
  return (
    <div className="bg-background text-foreground min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="bg-card sticky top-0 z-20 flex h-dvh flex-col border-e max-md:static max-md:h-auto">
        <div className="flex items-center gap-2 px-5 py-4">
          <Truck className="size-5" />
          <span className="font-semibold tracking-tight">Fleet</span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {navLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t p-3 max-md:hidden">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="bg-background/80 sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-6 py-3 backdrop-blur">
          <CompanySwitcher />
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 space-y-6 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
