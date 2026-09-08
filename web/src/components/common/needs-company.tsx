import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/** Shown on company-scoped pages before any company exists. */
export function NeedsCompany() {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <Building2 className="text-muted-foreground size-8" />
      <div>
        <p className="font-medium">No company selected</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Create a company first — trucks, drivers, customers and shipments all belong to one.
        </p>
      </div>
      <Button render={<Link to="/companies" />}>Go to Companies</Button>
    </Card>
  )
}
