import type { CSSProperties, ReactNode } from "react"
import {
  Check,
  Landmark,
  ShieldCheck,
} from "lucide-react"

import { ServerStatusIndicator } from "@/components/server-status-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const colorTokens = [
  { name: "Primary", variable: "--primary", value: "#5e6ad2" },
  { name: "Primary hover", variable: "--primary-hover", value: "#828fff" },
  { name: "Canvas", variable: "--canvas", value: "#010102" },
  { name: "Surface 1", variable: "--surface-1", value: "#0f1011" },
  { name: "Surface 2", variable: "--surface-2", value: "#141516" },
  { name: "Surface 3", variable: "--surface-3", value: "#18191a" },
  { name: "Ink", variable: "--ink", value: "#f7f8f8" },
  { name: "Ink subtle", variable: "--ink-subtle", value: "#8a8f98" },
]

const spacingTokens = [
  { name: "xxs", variable: "--spacing-xxs", value: "4px" },
  { name: "xs", variable: "--spacing-xs", value: "8px" },
  { name: "sm", variable: "--spacing-sm", value: "12px" },
  { name: "md", variable: "--spacing-md", value: "16px" },
  { name: "lg", variable: "--spacing-lg", value: "24px" },
  { name: "xl", variable: "--spacing-xl", value: "32px" },
  { name: "xxl", variable: "--spacing-xxl", value: "48px" },
]

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-xl border-t border-hairline py-section first:border-t-0">
      <div className="grid gap-md md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] md:items-end">
        <div className="flex flex-col gap-sm">
          <p className="text-eyebrow font-medium text-primary">{eyebrow}</p>
          <h2 className="text-display-mobile font-semibold md:text-display-md">
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-body text-ink-subtle">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-caption text-ink-tertiary">{children}</p>
  )
}

export default function StyleGuidePage() {
  return (
    <div className="style-guide-shell min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-hairline bg-background/95">
        <div className="mx-auto flex h-nav max-w-content items-center justify-between px-md md:px-xl">
          <div className="flex items-center gap-sm">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="size-4" aria-hidden="true" />
            </span>
            <span className="text-body-sm font-medium">Ledgerly</span>
          </div>
          <Badge variant="outline">Design system · Alpha</Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-content flex-col px-md md:px-xl">
        <section className="flex min-h-[calc(100vh-var(--spacing-nav))] flex-col justify-between gap-xxl py-section">
          <ServerStatusIndicator />
          <div className="flex max-w-4xl flex-col gap-lg">
            <Badge variant="secondary">Payments with a verifiable trail</Badge>
            <h1 className="text-display-mobile font-semibold md:text-display-xl">
              Precision for every movement of money.
            </h1>
            <p className="max-w-2xl text-body-lg text-ink-subtle">
              The Ledgerly interface is quiet by design. Every surface supports
              clear balances, traceable transactions, and confident financial
              operations.
            </p>
          </div>
        </section>

        <Section
          eyebrow="01 · Foundations"
          title="Color carries hierarchy, not decoration."
          description="Near-black surfaces create depth through measured lift and hairline borders. Lavender is reserved for focus, action, and identity."
        >
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
            {colorTokens.map((token) => (
              <Card key={token.variable} size="sm">
                <CardContent className="flex flex-col gap-md">
                  <div
                    className="token-swatch h-xxl rounded-md border border-hairline"
                    style={
                      {
                        "--swatch-color": `var(${token.variable})`,
                      } as CSSProperties
                    }
                  />
                  <div className="flex items-end justify-between gap-sm">
                    <div>
                      <p className="text-body-sm font-medium">{token.name}</p>
                      <Label>{token.variable}</Label>
                    </div>
                    <Label>{token.value}</Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="02 · Typography"
          title="One voice from display to transaction ID."
          description="Negative tracking gives display type its deliberate edge. Body copy stays neutral; monospaced type is reserved for financial and technical identifiers."
        >
          <Card>
            <CardContent className="flex flex-col divide-y divide-hairline">
              <div className="grid gap-md py-lg first:pt-0 md:grid-cols-[1fr_4fr] md:items-baseline">
                <Label>display-xl · 80/84</Label>
                <p className="text-display-mobile font-semibold md:text-display-xl">
                  Financial clarity
                </p>
              </div>
              <div className="grid gap-md py-lg md:grid-cols-[1fr_4fr] md:items-baseline">
                <Label>display-md · 40/46</Label>
                <p className="text-display-md font-semibold">Every entry balances.</p>
              </div>
              <div className="grid gap-md py-lg md:grid-cols-[1fr_4fr] md:items-baseline">
                <Label>body · 16/24</Label>
                <p className="max-w-2xl text-body text-ink-muted">
                  Wallet balances are clear, payment states are explicit, and
                  the ledger remains the source of truth.
                </p>
              </div>
              <div className="grid gap-md py-lg last:pb-0 md:grid-cols-[1fr_4fr] md:items-baseline">
                <Label>mono · 13/19.5</Label>
                <p className="font-mono text-mono text-ink-muted">
                  txn_8ddc42e4 · idem_98f31ab2 · INR 1,000.00
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section
          eyebrow="03 · Spacing"
          title="A four-pixel rhythm throughout."
          description="Compact controls and generous section separation keep dense financial information calm and scan-friendly."
        >
          <Card>
            <CardContent className="flex flex-col gap-md">
              {spacingTokens.map((token) => (
                <div
                  key={token.name}
                  className="grid grid-cols-[var(--spacing-xxl)_1fr_var(--spacing-xxl)] items-center gap-md"
                >
                  <Label>{token.name}</Label>
                  <div className="h-xs rounded-xs bg-surface-2">
                    <div
                      className="h-full rounded-xs bg-primary"
                      style={{ width: `var(${token.variable})` }}
                    />
                  </div>
                  <Label>{token.value}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>

        <Section
          eyebrow="04 · Actions"
          title="Compact, explicit controls."
          description="Every interactive primitive includes hover, focus, active, and disabled behavior. Primary lavender remains scarce."
        >
          <div className="grid gap-lg lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Button variants</CardTitle>
                <CardDescription>Approved action hierarchy.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-sm">
                <Button>Primary action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="tertiary">Tertiary</Button>
                <Button variant="inverse">Inverse</Button>
                <Button variant="link">Text link</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interaction states</CardTitle>
                <CardDescription>Reference states for review.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-sm sm:grid-cols-2">
                <div className="flex flex-col gap-xs">
                  <Label>default</Label>
                  <Button>Send payment</Button>
                </div>
                <div className="flex flex-col gap-xs">
                  <Label>focus</Label>
                  <Button className="border-primary-focus ring-2 ring-primary-focus/50">
                    Send payment
                  </Button>
                </div>
                <div className="flex flex-col gap-xs">
                  <Label>active</Label>
                  <Button className="translate-y-px bg-primary-focus">
                    Send payment
                  </Button>
                </div>
                <div className="flex flex-col gap-xs">
                  <Label>disabled</Label>
                  <Button disabled>Send payment</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="05 · Inputs and status"
          title="Make system state unmistakable."
          description="Inputs retain the same dark surface through focus. Status pills communicate meaning without turning the interface into a palette."
        >
          <div className="grid gap-lg lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Text inputs</CardTitle>
                <CardDescription>Default, focus, and disabled states.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-md">
                <div className="flex flex-col gap-xs">
                  <Label>default</Label>
                  <Input placeholder="Wallet reference" />
                </div>
                <div className="flex flex-col gap-xs">
                  <Label>focus</Label>
                  <Input
                    className="border-primary-focus ring-2 ring-primary-focus/50"
                    defaultValue="wal_01J8Q7V3"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <Label>disabled</Label>
                  <Input disabled defaultValue="Managed by the ledger" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges</CardTitle>
                <CardDescription>Small, legible state markers.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-sm">
                <Badge>Action required</Badge>
                <Badge variant="success">
                  <Check data-icon="inline-start" />
                  Settled
                </Badge>
                <Badge variant="secondary">Pending</Badge>
                <Badge variant="outline">Reference only</Badge>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="06 · Containers"
          title="Surfaces frame the financial record."
          description="Cards use charcoal lift and hairline borders instead of shadow. Content hierarchy stays visible even when the data becomes dense."
        >
          <div className="grid gap-lg lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Wallet balance</CardTitle>
                <CardDescription>Available to spend</CardDescription>
                <CardAction>
                  <Badge variant="success">Active</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-headline font-semibold">₹12,480.00</p>
              </CardContent>
              <CardFooter className="justify-between text-body-sm text-ink-subtle">
                <span>INR wallet</span>
                <Button variant="link" size="sm">
                  View ledger
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-surface-2">
              <CardHeader>
                <CardTitle>Protected movement</CardTitle>
                <CardDescription>
                  Every mutating request carries an idempotency key.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-sm text-body-sm text-ink-muted">
                <ShieldCheck className="size-5 text-brand-secure" />
                Safe to retry after a timeout
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Ledger entry</CardTitle>
                <CardDescription>High-fidelity product panel</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-sm">
                <div className="flex justify-between gap-md border-b border-hairline pb-sm text-body-sm">
                  <span className="text-ink-subtle">Debit</span>
                  <span className="font-mono">−₹1,000.00</span>
                </div>
                <div className="flex justify-between gap-md text-body-sm">
                  <span className="text-ink-subtle">Credit</span>
                  <span className="font-mono">+₹1,000.00</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>

      <footer className="border-t border-hairline px-md py-xxl text-caption text-ink-tertiary md:px-xl">
        <div className="mx-auto flex max-w-content flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
          <span>Ledgerly design system · Version alpha</span>
          <Badge variant="outline">DESIGN.md is authoritative</Badge>
        </div>
      </footer>
    </div>
  )
}
