"use client"

import { Landmark, Send } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { usePersona } from "@/components/persona-provider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEMO_PERSONAS } from "@/lib/demo-personas"

export function ProductShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { persona, setPersonaId } = usePersona()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-hairline bg-background/95">
        <div className="mx-auto flex min-h-nav max-w-content flex-wrap items-center justify-between gap-sm px-md py-xs md:px-xl">
          <Link
            href="/"
            className="flex items-center gap-sm rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-focus/50"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="size-4" aria-hidden="true" />
            </span>
            <span className="text-body-sm font-medium">Ledgerly</span>
          </Link>

          <nav className="order-3 flex w-full items-center gap-xs md:order-2 md:w-auto">
            <Button
              variant={pathname === "/" ? "secondary" : "tertiary"}
              size="sm"
              nativeButton={false}
              render={<Link href="/" />}
            >
              Wallets
            </Button>
            <Button
              variant={pathname === "/transfer" ? "secondary" : "tertiary"}
              size="sm"
              nativeButton={false}
              render={<Link href="/transfer" />}
            >
              <Send data-icon="inline-start" />
              Transfer
            </Button>
          </nav>

          <div className="order-2 min-w-[var(--spacing-section)] md:order-3 md:min-w-[calc(var(--spacing-section)*2)]">
            <Select
              value={persona.id}
              onValueChange={(value) => {
                if (value) setPersonaId(value)
              }}
            >
              <SelectTrigger aria-label="Active demo persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMO_PERSONAS.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
