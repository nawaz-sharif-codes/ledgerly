export interface HealthResponse {
  status: "ok"
  service: "ledgerly-api"
  timestamp: string
}

const DEFAULT_API_BASE_URL = "http://localhost:3001"
const FIRST_REQUEST_TIMEOUT_MS = 90_000
const STANDARD_REQUEST_TIMEOUT_MS = 15_000
const FIRST_REQUEST_SESSION_KEY = "ledgerly:first-api-request-complete"

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
    /\/$/,
    "",
  )
}

function isFirstRequestInSession() {
  return (
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(FIRST_REQUEST_SESSION_KEY) !== "true"
  )
}

export async function getServerHealth(signal?: AbortSignal) {
  const firstRequest = isFirstRequestInSession()
  const timeoutSignal = AbortSignal.timeout(
    firstRequest ? FIRST_REQUEST_TIMEOUT_MS : STANDARD_REQUEST_TIMEOUT_MS,
  )
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  const response = await fetch(`${getApiBaseUrl()}/health`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: combinedSignal,
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(FIRST_REQUEST_SESSION_KEY, "true")
  }

  return (await response.json()) as HealthResponse
}
