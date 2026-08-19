import { ArrowUpRight, WalletCards } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatMoney } from "@/lib/format-money"
import type { Wallet } from "@/lib/types"

export function WalletCard({ wallet }: { wallet: Wallet }) {
  return (
    <Card className="surface-edge">
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex items-center gap-sm">
          <span className="flex size-10 items-center justify-center rounded-md bg-surface-2 text-brand-secure">
            <WalletCards className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>{wallet.currency} wallet</CardTitle>
            <p className="font-mono text-caption text-ink-tertiary">
              {wallet.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <Badge variant="success">Active</Badge>
      </CardHeader>
      <CardContent className="py-xl">
        <p className="text-caption text-ink-subtle">Available balance</p>
        <p className="mt-xs text-headline font-semibold md:text-display-md">
          {formatMoney(wallet.balance, wallet.currency)}
        </p>
      </CardContent>
      <CardFooter className="justify-between border-t border-hairline pt-md">
        <span className="text-caption text-ink-tertiary">
          No conversion fees or FX logic
        </span>
        <Button
          variant="link"
          size="sm"
          nativeButton={false}
          render={<Link href={`/wallets/${wallet.id}`} />}
        >
          Open
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}
