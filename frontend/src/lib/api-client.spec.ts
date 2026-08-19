import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, deposit, transfer } from "@/lib/api-client"

const movementResponse = {
  transactionId: "20000000-0000-4000-8000-000000000001",
  status: "completed" as const,
  amount: "25.0000",
  currency: "INR" as const,
  replayed: false,
}

describe("api-client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("sends the caller's idempotency key unchanged for money mutations", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify(movementResponse), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    )

    const key = "30000000-0000-4000-8000-000000000001"
    await deposit("40000000-0000-4000-8000-000000000001", "25.00", key)
    await transfer(
      {
        fromWalletId: "40000000-0000-4000-8000-000000000001",
        toWalletId: "40000000-0000-4000-8000-000000000002",
        amount: "25.00",
      },
      key,
    )

    for (const [, options] of vi.mocked(fetch).mock.calls) {
      expect(options?.headers).toMatchObject({ "Idempotency-Key": key })
    }
  })

  it("maps the stable backend error contract to ApiError", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 422,
          code: "INSUFFICIENT_FUNDS",
          message: "The source wallet has insufficient funds.",
          requestId: "req-test",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    )

    try {
      await deposit(
        "40000000-0000-4000-8000-000000000001",
        "25.00",
        "30000000-0000-4000-8000-000000000001",
      )
      throw new Error("Expected deposit to reject")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({
        status: 422,
        code: "INSUFFICIENT_FUNDS",
        message: "The source wallet has insufficient funds.",
        requestId: "req-test",
      })
    }
  })
})
