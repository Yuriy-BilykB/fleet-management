import {
  useMutation, useQuery, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api, type QueryParams } from '@/lib/api'
import type { Paged } from '@/types/api'

export function createCrudHooks<TEntity, TRequest>(resource: string) {
  const basePath = `/${resource}`
  const listKey = (params: QueryParams) => [resource, params] as const

  function useList(params: QueryParams, enabled = true): UseQueryResult<Paged<TEntity>> {
    return useQuery({
      queryKey: listKey(params),
      queryFn: ({ signal }) => api.get<Paged<TEntity>>(basePath, { params, signal }),
      enabled,
      placeholderData: (previous) => previous,
    })
  }

  function useInvalidate() {
    const queryClient = useQueryClient()
    return () => {
      void queryClient.invalidateQueries({ queryKey: [resource] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  }

  function useCreate(): UseMutationResult<TEntity, ApiError, TRequest> {
    const invalidate = useInvalidate()
    return useMutation<TEntity, ApiError, TRequest>({
      mutationFn: (body) => api.post<TEntity>(basePath, body),
      onSuccess: () => {
        invalidate()
        toast.success('Created')
      },
      onError: showError,
    })
  }

  function useUpdate(): UseMutationResult<TEntity, ApiError, { id: string; body: TRequest }> {
    const invalidate = useInvalidate()
    return useMutation<TEntity, ApiError, { id: string; body: TRequest }>({
      mutationFn: ({ id, body }) => api.put<TEntity>(`${basePath}/${id}`, body),
      onSuccess: () => {
        invalidate()
        toast.success('Saved')
      },
      onError: showError,
    })
  }

  function useRemove(): UseMutationResult<void, ApiError, string> {
    const invalidate = useInvalidate()
    return useMutation<void, ApiError, string>({
      mutationFn: (id) => api.del(`${basePath}/${id}`),
      onSuccess: () => {
        invalidate()
        toast.success('Deleted')
      },
      onError: showError,
    })
  }

  return { useList, useCreate, useUpdate, useRemove, listKey }
}

/** Surfaces problem-details errors, including per-field validation messages. */
export function showError(error: unknown) {
  if (error instanceof ApiError) {
    toast.error(error.title, { description: error.fieldSummary ?? error.detail })
    return
  }
  toast.error('Request failed', {
    description: error instanceof Error ? error.message : String(error),
  })
}
