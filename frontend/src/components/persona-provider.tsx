"use client"

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  DEFAULT_PERSONA,
  DEMO_PERSONAS,
} from "@/lib/demo-personas"
import type { DemoPersona } from "@/lib/types"

const PERSONA_STORAGE_KEY = "ledgerly:demo-persona"
const PERSONA_CHANGE_EVENT = "ledgerly:demo-persona-change"

interface PersonaContextValue {
  persona: DemoPersona
  setPersonaId: (personaId: string) => void
}

const PersonaContext = createContext<PersonaContextValue | null>(null)

export function PersonaProvider({ children }: { children: ReactNode }) {
  const personaId = useSyncExternalStore(
    subscribeToPersona,
    getStoredPersonaId,
    () => DEFAULT_PERSONA.id,
  )

  const value = useMemo<PersonaContextValue>(() => {
    const persona =
      DEMO_PERSONAS.find((candidate) => candidate.id === personaId) ??
      DEFAULT_PERSONA

    return {
      persona,
      setPersonaId(nextPersonaId) {
        window.localStorage.setItem(PERSONA_STORAGE_KEY, nextPersonaId)
        window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT))
      },
    }
  }, [personaId])

  return (
    <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
  )
}

function subscribeToPersona(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(PERSONA_CHANGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(PERSONA_CHANGE_EVENT, onStoreChange)
  }
}

function getStoredPersonaId() {
  const storedPersonaId = window.localStorage.getItem(PERSONA_STORAGE_KEY)
  return DEMO_PERSONAS.some((persona) => persona.id === storedPersonaId)
    ? (storedPersonaId as string)
    : DEFAULT_PERSONA.id
}

export function usePersona() {
  const context = useContext(PersonaContext)
  if (!context) throw new Error("usePersona must be used within PersonaProvider")
  return context
}
