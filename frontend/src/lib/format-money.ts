import type { Currency } from "@/lib/types"

const currencySymbols: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
}

function groupThousands(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function groupIndian(value: string) {
  if (value.length <= 3) return value
  const lastThree = value.slice(-3)
  const leading = value.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")
  return `${leading},${lastThree}`
}

export function formatMoney(value: string, currency: Currency) {
  const negative = value.startsWith("-")
  const unsigned = negative ? value.slice(1) : value
  const [integer = "0", decimal = ""] = unsigned.split(".")
  const grouped =
    currency === "INR" ? groupIndian(integer) : groupThousands(integer)
  const significantDecimal = decimal.replace(/0+$/, "")
  const fraction = significantDecimal.padEnd(2, "0")

  return `${negative ? "−" : ""}${currencySymbols[currency]}${grouped}.${fraction}`
}
