import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { WalletDetail } from "@/components/wallet-detail"
import {
  ApiError,
  deposit,
  getTransactionHistory,
  getWallet,
} from "@/lib/api-client"

vi.mock("@/components/product-shell", () => ({
  ProductShell: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/lib/api-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api-client")>()
  return {
    ...original,
    deposit: vi.fn(),
    getTransactionHistory: vi.fn(),
    getWallet: vi.fn(),
  }
})

const wallet = {
  id: "40000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000001",
  walletType: "customer" as const,
  currency: "INR" as const,
  balance: "100.0000",
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
}

describe("WalletDetail", () => {
  beforeEach(() => {
    vi.mocked(getWallet).mockResolvedValue(wallet)
    vi.mocked(getTransactionHistory).mockResolvedValue({
      items: [],
      nextCursor: null,
    })
  })

  it("reuses one idempotency key when a failed submission is retried", async () => {
    vi.mocked(deposit)
      .mockRejectedValueOnce(
        new ApiError(503, "SERVICE_UNAVAILABLE", "Temporary failure"),
      )
      .mockResolvedValueOnce({
        transaction: {
          id: "20000000-0000-4000-8000-000000000001",
          type: "deposit",
          status: "completed",
          amount: "10.0000",
          currency: "INR",
          createdAt: "2026-08-19T00:00:00.000Z",
        },
      })

    render(<WalletDetail walletId={wallet.id} />)
    const amountInput = await screen.findByLabelText("Amount")
    fireEvent.change(amountInput, { target: { value: "10.00" } })
    fireEvent.click(screen.getByRole("button", { name: "Deposit" }))

    await screen.findByText("Temporary failure")
    fireEvent.click(screen.getByRole("button", { name: "Deposit" }))

    await waitFor(() => expect(deposit).toHaveBeenCalledTimes(2))
    expect(vi.mocked(deposit).mock.calls[0]?.[2]).toBe(
      vi.mocked(deposit).mock.calls[1]?.[2],
    )
  })
})
