"use client"

import { Plus, RefreshCw, Send } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { ProductShell } from "@/components/product-shell"
import { ServerStatusIndicator } from "@/components/server-status-indicator"
import {
  type DisplayTransaction,
  TransactionList,
} from "@/components/transaction-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePersona } from "@/components/persona-provider"
import { WalletCard } from "@/components/wallet-card"
import {
  ApiError,
  createWallet,
  getTransactionHistory,
  listWallets,
} from "@/lib/api-client"
import type { Currency, DemoPersona, Wallet } from "@/lib/types"

type LoadState = "loading" | "ready" | "error"

export function Dashboard() {
  const { persona } = usePersona()

  return <DashboardContent key={persona.id} persona={persona} />
}

function DashboardContent({ persona }: { persona: DemoPersona }) {
  const [state, setState] = useState<LoadState>("loading")
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([])
  const [error, setError] = useState("")
  const [creatingCurrency, setCreatingCurrency] = useState<Currency | null>(null)

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const walletResponse = await listWallets(persona.id, signal)
        const historyResponses = await Promise.all(
          walletResponse.items.map(async (wallet) => ({
            wallet,
            history: await getTransactionHistory(wallet.id, null, signal),
          })),
        )
        const recent = historyResponses
          .flatMap(({ wallet, history }) =>
            history.items.map((item) => ({ ...item, currency: wallet.currency })),
          )
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          )
          .slice(0, 6)

        setWallets(walletResponse.items)
        setTransactions(recent)
        setState("ready")
      } catch (loadError) {
        if (signal?.aborted) return
        setError(
          loadError instanceof ApiError
            ? loadError.message
            : "The wallet service could not be reached.",
        )
        setState("error")
      }
    },
    [persona.id],
  )

  useEffect(() => {
    const controller = new AbortController()
    const loadTask = window.setTimeout(() => {
      void loadDashboard(controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(loadTask)
      controller.abort()
    }
  }, [loadDashboard])

  async function handleCreateWallet(currency: Currency) {
    setCreatingCurrency(currency)
    setError("")
    try {
      await createWallet(persona.id, currency)
      await loadDashboard()
    } catch (createError) {
      setError(
        createError instanceof ApiError
          ? createError.message
          : "The wallet could not be created.",
      )
    } finally {
      setCreatingCurrency(null)
    }
  }

  function handleRetry() {
    setState("loading")
    setError("")
    void loadDashboard()
  }

  const missingCurrencies = (["INR", "USD"] as Currency[]).filter(
    (currency) => !wallets.some((wallet) => wallet.currency === currency),
  )

  return (
    <ProductShell>
      <main className="mx-auto flex max-w-content flex-col gap-xxl px-md py-xl md:px-xl md:py-xxl">
        <ServerStatusIndicator />

        <section className="flex flex-col gap-lg border-b border-hairline pb-xl md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <Badge variant="secondary">Demo account</Badge>
            <h1 className="mt-sm text-display-mobile font-semibold md:text-display-lg">
              {persona.name}&apos;s wallets
            </h1>
            <p className="mt-sm max-w-[calc(var(--spacing-section)*6)] text-body text-ink-subtle">
              Fund a wallet, move money, and inspect every immutable ledger entry.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/transfer" />}>
            <Send data-icon="inline-start" />
            New transfer
          </Button>
        </section>

        {error ? (
          <div className="flex flex-col gap-sm rounded-md border border-hairline-strong bg-surface-1 p-md sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-ink-muted">{error}</p>
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </div>
        ) : null}

        <section className="flex flex-col gap-lg">
          <div>
            <h2 className="text-headline font-semibold">Wallets</h2>
            <p className="mt-xs text-body-sm text-ink-subtle">
              INR and USD stay separate. Transfers never convert currency.
            </p>
          </div>

          {state === "loading" ? (
            <div className="grid gap-lg md:grid-cols-2">
              <Skeleton className="h-[calc(var(--spacing-section)*3)]" />
              <Skeleton className="h-[calc(var(--spacing-section)*3)]" />
            </div>
          ) : wallets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-md py-xxl">
                <h3 className="text-card-title font-medium">No wallets yet</h3>
                <p className="max-w-[calc(var(--spacing-section)*6)] text-body-sm text-ink-subtle">
                  Create an INR or USD wallet to begin the Phase 1 money flow.
                </p>
                <div className="flex flex-wrap gap-sm">
                  {(["INR", "USD"] as Currency[]).map((currency) => (
                    <Button
                      key={currency}
                      variant={currency === "INR" ? "default" : "secondary"}
                      disabled={creatingCurrency !== null}
                      onClick={() => handleCreateWallet(currency)}
                    >
                      <Plus data-icon="inline-start" />
                      Create {currency}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-lg md:grid-cols-2">
              {wallets.map((wallet) => (
                <WalletCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
          )}

          {state === "ready" &&
          wallets.length > 0 &&
          missingCurrencies.length > 0 ? (
            <div className="flex flex-wrap items-center gap-sm">
              <p className="text-body-sm text-ink-subtle">Add another currency:</p>
              {missingCurrencies.map((currency) => (
                <Button
                  key={currency}
                  variant="secondary"
                  size="sm"
                  disabled={creatingCurrency !== null}
                  onClick={() => handleCreateWallet(currency)}
                >
                  <Plus data-icon="inline-start" />
                  {creatingCurrency === currency ? "Creating" : currency}
                </Button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-lg">
          <div>
            <h2 className="text-headline font-semibold">Recent activity</h2>
            <p className="mt-xs text-body-sm text-ink-subtle">
              Latest ledger-backed movements across this demo account.
            </p>
          </div>
          {state === "loading" ? (
            <Skeleton className="h-[calc(var(--spacing-section)*2)]" />
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-hairline bg-surface-1 px-md py-xxl">
              <p className="text-body-sm text-ink-subtle">
                No transactions yet. Open a wallet to make the first deposit.
              </p>
            </div>
          ) : (
            <TransactionList items={transactions} />
          )}
        </section>
      </main>
    </ProductShell>
  )
}
