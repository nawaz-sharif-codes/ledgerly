import { ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatMoney } from "@/lib/format-money"
import type { Currency, TransactionHistoryItem } from "@/lib/types"

export interface DisplayTransaction extends TransactionHistoryItem {
  currency: Currency
}

export function TransactionList({ items }: { items: DisplayTransaction[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
      {items.map((transaction) => {
        const isCredit = transaction.direction === "credit"
        const Icon =
          transaction.type === "deposit"
            ? Landmark
            : isCredit
              ? ArrowDownLeft
              : ArrowUpRight

        return (
          <div
            key={transaction.id}
            className="grid gap-sm border-b border-hairline px-md py-md last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-center gap-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-brand-secure">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-xs">
                  <p className="text-body-sm font-medium capitalize">
                    {transaction.type}
                  </p>
                  <Badge variant="success">Settled</Badge>
                </div>
                <p className="truncate font-mono text-caption text-ink-tertiary">
                  {transaction.transactionId}
                </p>
              </div>
            </div>
            <div className="pl-[calc(var(--spacing-lg)+var(--spacing-sm))] text-left sm:pl-0 sm:text-right">
              <p className="font-mono text-body-sm text-ink">
                {isCredit ? "+" : ""}
                {formatMoney(transaction.amount, transaction.currency)}
              </p>
              <time className="text-caption text-ink-tertiary">
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(transaction.createdAt))}
              </time>
            </div>
          </div>
        )
      })}
    </div>
  )
}
