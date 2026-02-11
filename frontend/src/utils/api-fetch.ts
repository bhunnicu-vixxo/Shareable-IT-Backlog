import { ApiError } from '@/utils/api-error'
import { setNetworkDenied } from '@/features/auth/network-access.store'

type ApiErrorBody = {
  error?: {
    message?: unknown
    code?: unknown
  }
}

async function safeParseJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function getErrorFields(body: unknown): { message: string | null; code: string | null } {
  const maybe = body as ApiErrorBody | null
  const message =
    typeof maybe?.error?.message === 'string' ? (maybe.error.message as string) : null
  const code = typeof maybe?.error?.code === 'string' ? (maybe.error.code as string) : null
  return { message, code }
}

/**
 * Fetch JSON and throw a typed ApiError on non-2xx responses.
 *
 * Also triggers a global "network denied" state when the backend returns:
 * HTTP 403 + error.code === NETWORK_ACCESS_DENIED
 */
export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { fallbackMessage?: string },
): Promise<T> {
  const merged: RequestInit = { ...init, credentials: 'include' }
  const res = await fetch(input, merged)
  if (res.ok) {
    return (await res.json()) as T
  }

  const body = await safeParseJson(res)
  const { message, code } = getErrorFields(body)

  if (res.status === 403 && code === 'NETWORK_ACCESS_DENIED') {
    setNetworkDenied(true)
  }

  const fallback = res.statusText
    ? `Request failed: ${res.statusText}`
    : `Request failed with status ${res.status}`

  throw new ApiError(
    message ?? options?.fallbackMessage ?? fallback,
    res.status,
    code ?? 'UNKNOWN_ERROR',
  )
}

