import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'
import { companies } from '@/hooks/use-resources'
import type { Company } from '@/types/api'

const STORAGE_KEY = 'fleet.companyId'

interface CompanyContextValue {
  companyId: string | null
  company: Company | null
  list: Company[]
  isLoading: boolean
  selectCompany: (id: string) => void
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(readStored)
  const { data, isLoading } = companies.useList({ pageSize: 200 })
  const list = useMemo(() => data?.items ?? [], [data])

  const selectCompany = useCallback((id: string) => {
    setSelectedId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Private browsing — selection stays in memory for this session.
    }
  }, [])

  // Derived, not synced: fall back to the first company when nothing is stored or
  // when the stored company no longer exists (deleted, or a different environment).
  const companyId = useMemo(() => {
    if (list.length === 0) return null
    if (selectedId && list.some((c) => c.id === selectedId)) return selectedId
    return list[0].id
  }, [list, selectedId])

  const value = useMemo<CompanyContextValue>(() => ({
    companyId,
    company: list.find((c) => c.id === companyId) ?? null,
    list,
    isLoading,
    selectCompany,
  }), [companyId, list, isLoading, selectCompany])

  return <CompanyContext value={value}>{children}</CompanyContext>
}

export function useCompany(): CompanyContextValue {
  const context = use(CompanyContext)
  if (!context) throw new Error('useCompany must be used inside <CompanyProvider>')
  return context
}
