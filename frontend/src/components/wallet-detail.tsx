"use client"

import { ArrowLeft, Plus, RefreshCw, Send } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState, type FormEvent } from "react"

import { ProductShell } from "@/components/product-shell"
import {
  type DisplayTransaction,
  TransactionList,
} from "@/components/transaction-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ApiError,
  deposit,
  getTransactionHistory,
  getWallet,
} from "@/lib/api-client"
import { formatMoney } from "@/lib/format-money"
import type { TransactionHistoryItem, Wallet } from "@/lib/types"

export function WalletDetail({ walletId }: { walletId: string }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submissionKey, setSubmissionKey] = useState<string | null>(null)
  const [success, setSuccess] = useState("")

  const loadWallet = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [walletResponse, historyResponse] = await Promise.all([
          getWallet(walletId, signal),
          getTransactionHistory(walletId, null, signal),
        ])
        setWallet(walletResponse)
        setTransactions(historyResponse.items)
        setNextCursor(historyResponse.nextCursor)
      } catch (loadError) {
        if (signal?.aborted) return
        setError(
          loadError instanceof ApiError
            ? loadError.message
            : "The wallet could not be loaded.",
        )
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [walletId],
  )

  useEffect(() => {
    const controller = new AbortController()
    const loadTask = window.setTimeout(() => {
      void loadWallet(controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(loadTask)
      controller.abort()
    }
  }, [loadWallet])

  async function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!amount) return
    const key = submissionKey ?? crypto.randomUUID()
    setSubmissionKey(key)
    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      await deposit(walletId, amount, key)
      setSuccess("Deposit settled. The balanced ledger entries are now immutable.")
      setAmount("")
      setSubmissionKey(null)
      await loadWallet()
    } catch (depositError) {
      setError(
        depositError instanceof ApiError
          ? depositError.message
          : "The deposit could not be completed. Retry to reuse the same request key.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function loadMore() {
    if (!nextCursor || !wallet) return
    setLoadingMore(true)
    setError("")
    try {
      const response = await getTransactionHistory(wallet.id, nextCursor)
      setTransactions((current) => [...current, ...response.items])
      setNextCursor(response.nextCursor)
    } catch (historyError) {
      setError(
        historyError instanceof ApiError
          ? historyError.message
          : "More transactions could not be loaded.",
      )
    } finally {
      setLoadingMore(false)
    }
  }

  function handleRetry() {
    setLoading(true)
    setError("")
    void loadWallet()
  }

  const displayTransactions: DisplayTransaction[] = wallet
    ? transactions.map((transaction) => ({
        ...transaction,
        currency: wallet.currency,
      }))
    : []

  return (
    <ProductShell>
      <main className="mx-auto flex max-w-content flex-col gap-xl px-md py-xl md:px-xl md:py-xxl">
        <Button
          variant="link"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <ArrowLeft data-icon="inline-start" />
          All wallets
        </Button>

        {loading ? (
          <div className="grid gap-lg lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
            <Skeleton className="h-[calc(var(--spacing-section)*3)]" />
            <Skeleton className="h-[calc(var(--spacing-section)*3)]" />
          </div>
        ) : wallet ? (
          <>
            <section className="grid gap-lg lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
              <Card className="surface-edge">
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <Badge variant="success">Active {wallet.currency}</Badge>
                    <CardTitle className="mt-sm text-headline">
                      Wallet balance
                    </CardTitle>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/transfer?from=${wallet.id}`} />}
                  >
                    <Send data-icon="inline-start" />
                    Transfer
                  </Button>
                </CardHeader>
                <CardContent className="flex min-h-[calc(var(--spacing-section)*2)] flex-col justify-end">
                  <p className="text-display-mobile font-semibold md:text-display-lg">
                    {formatMoney(wallet.balance, wallet.currency)}
                  </p>
                  <p className="mt-sm font-mono text-caption text-ink-tertiary">
                    {wallet.id}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Deposit funds</CardTitle>
                  <p className="text-body-sm text-ink-subtle">
                    Funds are balanced against the platform clearing wallet.
                  </p>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-md" onSubmit={handleDeposit}>
                    <div className="flex flex-col gap-xs">
                      <Label htmlFor="deposit-amount">Amount</Label>
                      <Input
                        id="deposit-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value)
                          setSubmissionKey(null)
                          setSuccess("")
                        }}
                        placeholder="1000.00"
                        required
                        pattern="\d+(\.\d{1,4})?"
                        aria-describedby="deposit-help"
                      />
                      <p id="deposit-help" className="text-caption text-ink-tertiary">
                        Enter {wallet.currency} with up to four decimal places.
                      </p>
                    </div>
                    <Button type="submit" disabled={submitting || !amount}>
                      <Plus data-icon="inline-start" />
                      {submitting ? "Settling" : "Deposit"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>

            {success ? (
              <div className="rounded-md border border-hairline-strong bg-surface-1 px-md py-sm text-body-sm text-ink-muted">
                {success}
              </div>
            ) : null}

            <section className="flex flex-col gap-lg">
              <div>
                <h2 className="text-headline font-semibold">Transaction history</h2>
                <p className="mt-xs text-body-sm text-ink-subtle">
                  Each row is backed by an append-only ledger entry.
                </p>
              </div>
              {displayTransactions.length === 0 ? (
                <div className="rounded-lg border border-hairline bg-surface-1 px-md py-xxl">
                  <p className="text-body-sm text-ink-subtle">
                    No transactions yet. Make the first deposit to populate this ledger.
                  </p>
                </div>
              ) : (
                <TransactionList items={displayTransactions} />
              )}
              {nextCursor ? (
                <Button
                  variant="secondary"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? "Loading" : "Load more"}
                </Button>
              ) : null}
            </section>
          </>
        ) : null}

        {error ? (
          <div className="flex flex-col gap-sm rounded-md border border-hairline-strong bg-surface-1 p-md sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-ink-muted">{error}</p>
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </div>
        ) : null}
      </main>
    </ProductShell>
  )
}
