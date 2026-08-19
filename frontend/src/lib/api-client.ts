import type {
  Currency,
  MovementResponse,
  TransactionHistoryPage,
  Wallet,
} from "@/lib/types"

export interface HealthResponse {
  status: "ok"
  service: "ledgerly-api"
  timestamp: string
}

interface ApiErrorPayload {
  statusCode: number
  code: string
  message: string
  requestId?: string
  details?: unknown
}

const DEFAULT_API_BASE_URL = "http://localhost:3001"
const FIRST_REQUEST_TIMEOUT_MS = 90_000
const STANDARD_REQUEST_TIMEOUT_MS = 15_000
const FIRST_REQUEST_SESSION_KEY = "ledgerly:first-api-request-complete"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

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

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const firstRequest = isFirstRequestInSession()
  const timeoutSignal = AbortSignal.timeout(
    firstRequest ? FIRST_REQUEST_TIMEOUT_MS : STANDARD_REQUEST_TIMEOUT_MS,
  )
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: combinedSignal,
  })

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(FIRST_REQUEST_SESSION_KEY, "true")
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({
      statusCode: response.status,
      code: `HTTP_${response.status}`,
      message: "The request could not be completed.",
    }))) as ApiErrorPayload

    throw new ApiError(
      response.status,
      payload.code,
      payload.message,
      payload.requestId,
      payload.details,
    )
  }

  return (await response.json()) as T
}

export function getServerHealth(signal?: AbortSignal) {
  return apiRequest<HealthResponse>("/health", {}, signal)
}

export function listWallets(userId: string, signal?: AbortSignal) {
  return apiRequest<{ items: Wallet[] }>(
    `/wallets?userId=${encodeURIComponent(userId)}`,
    {},
    signal,
  )
}

export function getWallet(walletId: string, signal?: AbortSignal) {
  return apiRequest<Wallet>(`/wallets/${walletId}`, {}, signal)
}

export function createWallet(userId: string, currency: Currency) {
  return apiRequest<Wallet>("/wallets", {
    method: "POST",
    body: JSON.stringify({ userId, currency }),
  })
}

export function deposit(
  walletId: string,
  amount: string,
  idempotencyKey: string,
) {
  return apiRequest<MovementResponse>(`/wallets/${walletId}/deposit`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ amount }),
  })
}

export function transfer(
  input: { fromWalletId: string; toWalletId: string; amount: string },
  idempotencyKey: string,
) {
  return apiRequest<MovementResponse>("/transfers", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  })
}

export function getTransactionHistory(
  walletId: string,
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ limit: "20" })
  if (cursor) query.set("cursor", cursor)

  return apiRequest<TransactionHistoryPage>(
    `/wallets/${walletId}/transactions?${query.toString()}`,
    {},
    signal,
  )
}
