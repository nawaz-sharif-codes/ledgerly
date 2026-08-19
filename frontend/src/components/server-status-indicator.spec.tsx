import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ServerStatusIndicator } from "@/components/server-status-indicator"
import { getServerHealth } from "@/lib/api-client"

vi.mock("@/lib/api-client", () => ({
  getServerHealth: vi.fn(),
}))

describe("ServerStatusIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("explains the free-tier cold start when health is still pending", async () => {
    vi.mocked(getServerHealth).mockReturnValue(new Promise(() => undefined))
    render(<ServerStatusIndicator />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })

    expect(
      screen.getByText(/Starting up the server.*free tier/),
    ).toBeInTheDocument()
    expect(screen.getByText("Starting")).toBeInTheDocument()
  })
})
