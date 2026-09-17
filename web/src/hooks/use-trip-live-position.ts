import { useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import type { TruckPosition } from '@/types/api'

const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/hubs/trips'

export type LiveStatus = 'connecting' | 'live' | 'offline'

/**
 * Subscribes to a truck's position feed over SignalR. Real telematics reports per
 * vehicle, so the map follows the trip's truck rather than the trip itself. The
 * initial track still comes from REST, so a dropped socket degrades to stale data
 * rather than an empty map.
 */
export function useTruckLivePosition(truckId: string | undefined) {
  const [position, setPosition] = useState<TruckPosition | null>(null)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!truckId) return

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection
    connection.on('position', (next: TruckPosition) => setPosition(next))
    connection.onreconnecting(() => setStatus('connecting'))
    connection.onreconnected(() => {
      setStatus('live')
      void connection.invoke('JoinTruck', truckId)
    })
    connection.onclose(() => setStatus('offline'))

    connection
      .start()
      .then(() => connection.invoke('JoinTruck', truckId))
      .then(() => setStatus('live'))
      .catch(() => setStatus('offline'))

    return () => {
      // Leave the group before tearing down so the server stops sending.
      if (connection.state === HubConnectionState.Connected) {
        void connection.invoke('LeaveTruck', truckId).catch(() => {})
      }
      void connection.stop()
      connectionRef.current = null
    }
  }, [truckId])

  return { position, status }
}
