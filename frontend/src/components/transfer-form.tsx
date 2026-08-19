"use client"

import { ArrowRight, RefreshCw, Send } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState, type FormEvent } from "react"

import { usePersona } from "@/components/persona-provider"
import { ProductShell } from "@/components/product-shell"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, listWallets, transfer } from "@/lib/api-client"
import { DEMO_PERSONAS } from "@/lib/demo-personas"
import { formatMoney } from "@/lib/format-money"
import type { DemoPersona, Wallet } from "@/lib/types"

export function TransferForm({ initialFrom }: { initialFrom?: string }) {
  const { persona } = usePersona()

  return (
    <TransferFormContent
      key={`${persona.id}:${initialFrom ?? ""}`}
      initialFrom={initialFrom}
      persona={persona}
    />
  )
}

function TransferFormContent({
  initialFrom,
  persona,
}: {
  initialFrom?: string
  persona: DemoPersona
}) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fromWalletId, setFromWalletId] = useState(initialFrom ?? "")
  const [toWalletId, setToWalletId] = useState("")
  const [amount, setAmount] = useState("")
  const [submissionKey, setSubmissionKey] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadWallets = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const responses = await Promise.all(
          DEMO_PERSONAS.map((candidate) => listWallets(candidate.id, signal)),
        )
        const allWallets = responses.flatMap((response) => response.items)
        setWallets(allWallets)
        const currentWallets = allWallets.filter(
          (wallet) => wallet.userId === persona.id,
        )
        setFromWalletId((current) =>
          currentWallets.some((wallet) => wallet.id === current)
            ? current
            : (currentWallets[0]?.id ?? ""),
        )
      } catch (loadError) {
        if (signal?.aborted) return
        setError(
          loadError instanceof ApiError
            ? loadError.message
            : "Wallets could not be loaded.",
        )
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [persona.id],
  )

  useEffect(() => {
    const controller = new AbortController()
    const loadTask = window.setTimeout(() => {
      void loadWallets(controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(loadTask)
      controller.abort()
    }
  }, [loadWallets])

  const sourceWallets = wallets.filter((wallet) => wallet.userId === persona.id)
  const sourceWallet = sourceWallets.find(
    (wallet) => wallet.id === fromWalletId,
  )
  const destinationWallets = sourceWallet
    ? wallets.filter(
        (wallet) =>
          wallet.id !== sourceWallet.id &&
          wallet.currency === sourceWallet.currency,
      )
    : []
  const selectedToWalletId = destinationWallets.some(
    (wallet) => wallet.id === toWalletId,
  )
    ? toWalletId
    : (destinationWallets[0]?.id ?? "")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!fromWalletId || !selectedToWalletId || !amount) return
    const key = submissionKey ?? crypto.randomUUID()
    setSubmissionKey(key)
    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      await transfer(
        { fromWalletId, toWalletId: selectedToWalletId, amount },
        key,
      )
      setSuccess("Transfer settled. Both wallets were updated in one transaction.")
      setAmount("")
      setSubmissionKey(null)
      await loadWallets()
    } catch (transferError) {
      setError(
        transferError instanceof ApiError
          ? transferError.message
          : "The transfer could not be completed. Retry to reuse the same request key.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const destinationWallet = destinationWallets.find(
    (wallet) => wallet.id === selectedToWalletId,
  )

  function handleRetry() {
    setLoading(true)
    setError("")
    void loadWallets()
  }

  return (
    <ProductShell>
      <main className="mx-auto flex max-w-content flex-col gap-xl px-md py-xl md:px-xl md:py-xxl">
        <section className="max-w-3xl">
          <Badge variant="secondary">Atomic money movement</Badge>
          <h1 className="mt-sm text-display-mobile font-semibold md:text-display-lg">
            Transfer between wallets
          </h1>
          <p className="mt-sm max-w-[calc(var(--spacing-section)*6)] text-body text-ink-subtle">
            Matching currencies move together. Both ledger entries commit or neither does.
          </p>
        </section>

        {loading ? (
          <div className="grid gap-lg lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]">
            <Skeleton className="h-[calc(var(--spacing-section)*4)]" />
            <Skeleton className="h-[calc(var(--spacing-section)*3)]" />
          </div>
        ) : (
          <div className="grid gap-lg lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Transfer details</CardTitle>
                <p className="text-body-sm text-ink-subtle">
                  The idempotency key is retained if a retry is needed.
                </p>
              </CardHeader>
              <CardContent>
                {sourceWallets.length === 0 ? (
                  <div className="flex flex-col items-start gap-md py-xl">
                    <p className="text-body-sm text-ink-subtle">
                      {persona.name} has no wallets. Create one before transferring.
                    </p>
                    <Button nativeButton={false} render={<Link href="/" />}>
                      Create wallet
                    </Button>
                  </div>
                ) : (
                  <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-xs">
                      <Label htmlFor="from-wallet">From wallet</Label>
                      <Select
                        value={fromWalletId}
                        onValueChange={(value) => {
                          setFromWalletId(value ?? "")
                          setSubmissionKey(null)
                          setSuccess("")
                        }}
                      >
                        <SelectTrigger id="from-wallet">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceWallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.currency} · {formatMoney(wallet.balance, wallet.currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-xs">
                      <Label htmlFor="to-wallet">To wallet</Label>
                      <Select
                        value={selectedToWalletId}
                        onValueChange={(value) => {
                          setToWalletId(value ?? "")
                          setSubmissionKey(null)
                          setSuccess("")
                        }}
                        disabled={destinationWallets.length === 0}
                      >
                        <SelectTrigger id="to-wallet">
                          <SelectValue placeholder="No matching wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinationWallets.map((wallet) => {
                            const owner = DEMO_PERSONAS.find(
                              (candidate) => candidate.id === wallet.userId,
                            )
                            return (
                              <SelectItem key={wallet.id} value={wallet.id}>
                                {owner?.name ?? "Demo user"} · {wallet.currency}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      {destinationWallets.length === 0 ? (
                        <p className="text-caption text-ink-tertiary">
                          Create a matching-currency destination wallet for Alice or Bob.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-xs">
                      <Label htmlFor="transfer-amount">Amount</Label>
                      <Input
                        id="transfer-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value)
                          setSubmissionKey(null)
                          setSuccess("")
                        }}
                        placeholder="250.00"
                        required
                        pattern="\d+(\.\d{1,4})?"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={
                        submitting ||
                        !fromWalletId ||
                        !selectedToWalletId ||
                        !amount
                      }
                    >
                      <Send data-icon="inline-start" />
                      {submitting ? "Settling" : "Send transfer"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="bg-surface-2">
              <CardHeader>
                <CardTitle>Review</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-lg">
                <div>
                  <p className="text-caption text-ink-tertiary">Source</p>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    {sourceWallet
                      ? `${sourceWallet.currency} · ${formatMoney(sourceWallet.balance, sourceWallet.currency)}`
                      : "Select a wallet"}
                  </p>
                </div>
                <ArrowRight className="size-5 text-brand-secure" aria-hidden="true" />
                <div>
                  <p className="text-caption text-ink-tertiary">Destination</p>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    {destinationWallet
                      ? `${destinationWallet.currency} wallet`
                      : "Select a wallet"}
                  </p>
                </div>
                <div className="border-t border-hairline pt-lg">
                  <p className="text-caption text-ink-tertiary">Amount</p>
                  <p className="mt-xs text-card-title font-medium">
                    {sourceWallet && amount
                      ? formatMoney(amount, sourceWallet.currency)
                      : "Not entered"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {success ? (
          <div className="rounded-md border border-hairline-strong bg-surface-1 px-md py-sm text-body-sm text-ink-muted">
            {success}
          </div>
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
