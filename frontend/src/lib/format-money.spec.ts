import { describe, expect, it } from "vitest"

import { formatMoney } from "@/lib/format-money"

describe("formatMoney", () => {
  it("formats INR using Indian digit grouping without numeric conversion", () => {
    expect(formatMoney("12345678.9000", "INR")).toBe("₹1,23,45,678.90")
  })

  it("formats USD and preserves four significant decimal places", () => {
    expect(formatMoney("12345678.1234", "USD")).toBe("$12,345,678.1234")
  })

  it("uses a typographic minus sign for negative ledger values", () => {
    expect(formatMoney("-250.0000", "INR")).toBe("−₹250.00")
  })
})
