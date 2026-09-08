import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

/** A problem-details error returned by the API. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail?: string
  readonly errors?: Record<string, string[]>

  constructor(status: number, title: string, detail?: string, errors?: Record<string, string[]>) {
    super(detail || title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = detail
    this.errors = errors
  }

  /** Flattens ASP.NET validation errors into one readable line. */
  get fieldSummary(): string | undefined {
    if (!this.errors) return undefined
    return Object.entries(this.errors)
      .map(([field, messages]) => `${field}: ${messages.join(' ')}`)
      .join('\n')
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>

/** Drops empty filters so they never reach the query string. */
function clean(params: QueryParams): QueryParams {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

http.interceptors.request.use((config) => {
  if (config.params) config.params = clean(config.params as QueryParams)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    if (axios.isAxiosError(error)) {
      const response = error.response
      if (!response) {
        return Promise.reject(new ApiError(0, 'Network error', error.message))
      }

      const body = response.data as
        | { title?: string; detail?: string; errors?: Record<string, string[]> }
        | undefined

      return Promise.reject(
        new ApiError(
          response.status,
          body?.title ?? response.statusText ?? 'Request failed',
          body?.detail,
          body?.errors,
        ),
      )
    }

    return Promise.reject(
      new ApiError(0, 'Request failed', error instanceof Error ? error.message : String(error)),
    )
  },
)

export interface RequestOptions {
  params?: QueryParams
  signal?: AbortSignal
}

export const api = {
  get: async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { data } = await http.get<T>(path, options as AxiosRequestConfig)
    return data
  },
  post: async <T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> => {
    const { data } = await http.post<T>(path, body, options as AxiosRequestConfig)
    return data
  },
  put: async <T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> => {
    const { data } = await http.put<T>(path, body, options as AxiosRequestConfig)
    return data
  },
  del: async (path: string, options: RequestOptions = {}): Promise<void> => {
    await http.delete(path, options as AxiosRequestConfig)
  },
}
