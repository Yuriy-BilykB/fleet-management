import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Section } from '@/components/detail/detail-shell'
import { locations } from '@/hooks/use-resources'
import { showError } from '@/hooks/use-crud'
import { api } from '@/lib/api'
import type { ShipmentStop } from '@/types/api'

/**
 * Waypoints between a shipment's origin and destination. Changing them changes
 * the route's cache key, so the next map load re-routes automatically.
 */
export function ShipmentStops({ shipmentId }: { shipmentId: string }) {
  const queryClient = useQueryClient()
  const [picked, setPicked] = useState<string | null>(null)

  const stopsQuery = useQuery({
    queryKey: ['shipments', 'stops', shipmentId],
    queryFn: ({ signal }) => api.get<ShipmentStop[]>(`/shipments/${shipmentId}/stops`, { signal }),
  })

  const locationList = locations.useList({ pageSize: 200 })
  const options = useMemo(
    () => (locationList.data?.items ?? []).map((l) => ({
      value: l.id, label: `${l.name}, ${l.countryCode}`,
    })),
    [locationList.data],
  )

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['shipments', 'stops', shipmentId] })
    void queryClient.invalidateQueries({ queryKey: ['trips', 'track'] })
  }

  const add = useMutation({
    mutationFn: (locationId: string) =>
      api.post(`/shipments/${shipmentId}/stops`, { locationId, sequence: 0, notes: null }),
    onSuccess: () => {
      invalidate()
      setPicked(null)
      toast.success('Stop added')
    },
    onError: showError,
  })

  const remove = useMutation({
    mutationFn: (stopId: string) => api.del(`/shipments/${shipmentId}/stops/${stopId}`),
    onSuccess: () => {
      invalidate()
      toast.success('Stop removed')
    },
    onError: showError,
  })

  const stops = stopsQuery.data ?? []

  return (
    <Section title="Waypoints">
      {stops.length === 0 ? (
        <p className="text-muted-foreground px-[18px] py-6 text-center text-sm">
          Direct route — no intermediate stops.
        </p>
      ) : (
        <ul className="divide-y">
          {stops.map((stop) => (
            <li key={stop.id} className="flex items-center gap-3 px-[18px] py-2.5">
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]">
                {stop.sequence}
              </span>
              <MapPin className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {stop.locationName}, {stop.countryCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove stop"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(stop.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t p-3">
        <Select
          items={options}
          value={picked}
          onValueChange={(value) => setPicked(value)}
        >
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue placeholder="Add a city…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!picked || add.isPending}
          onClick={() => picked && add.mutate(picked)}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </Section>
  )
}
