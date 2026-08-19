"use client"

import { LoaderCircle, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState, type CSSProperties } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getServerHealth } from "@/lib/api-client"

type ServerState = "checking" | "waking" | "online" | "offline"

const stateContent: Record<
  ServerState,
  { label: string; message: string; color: string }
> = {
  checking: {
    label: "Checking",
    message: "Connecting to the Ledgerly API.",
    color: "var(--brand-secure)",
  },
  waking: {
    label: "Starting",
    message: "Starting up the server — this can take up to a minute on the free tier.",
    color: "var(--brand-secure)",
  },
  online: {
    label: "Online",
    message: "The Ledgerly API is ready.",
    color: "var(--semantic-success)",
  },
  offline: {
    label: "Unavailable",
    message: "The API did not respond. Check the backend or try again.",
    color: "var(--ink-tertiary)",
  },
}

export function ServerStatusIndicator() {
  const [state, setState] = useState<ServerState>("checking")

  const checkHealth = useCallback(async (signal?: AbortSignal) => {
    const wakingTimer = window.setTimeout(() => setState("waking"), 1_500)

    try {
      await getServerHealth(signal)
      window.clearTimeout(wakingTimer)
      setState("online")
    } catch {
      window.clearTimeout(wakingTimer)
      setState("offline")
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const startTimer = window.setTimeout(() => {
      void checkHealth(controller.signal)
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      controller.abort()
    }
  }, [checkHealth])

  const content = stateContent[state]
  const isPending = state === "checking" || state === "waking"

  return (
    <div
      className="flex min-h-11 flex-col gap-sm rounded-md border border-hairline bg-surface-1 px-md py-sm sm:flex-row sm:items-center sm:justify-between"
      aria-live="polite"
    >
      <div className="flex items-start gap-sm sm:items-center">
        <span
          className="status-dot mt-xs size-2 shrink-0 rounded-full sm:mt-0"
          style={{ "--status-color": content.color } as CSSProperties}
        />
        <div className="flex flex-col gap-xxs sm:flex-row sm:items-center sm:gap-sm">
          <Badge variant={state === "online" ? "success" : "secondary"}>
            {isPending ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : null}
            {content.label}
          </Badge>
          <p className="text-body-sm text-ink-subtle">{content.message}</p>
        </div>
      </div>
      {state === "offline" ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setState("checking")
            void checkHealth()
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Retry
        </Button>
      ) : null}
    </div>
  )
}
