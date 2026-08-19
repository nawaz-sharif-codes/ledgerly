export type Currency = "INR" | "USD"

export interface DemoPersona {
  id: string
  name: string
  initials: string
}

export interface Wallet {
  id: string
  userId: string
  currency: Currency
  balance: string
  createdAt: string
}

export interface TransactionHistoryItem {
  id: string
  transactionId: string
  type: "deposit" | "transfer"
  status: "completed"
  direction: "debit" | "credit"
  amount: string
  balanceAfter: string
  createdAt: string
}

export interface TransactionHistoryPage {
  items: TransactionHistoryItem[]
  nextCursor: string | null
}

export interface MovementResponse {
  transaction: {
    id: string
    type: "deposit" | "transfer"
    status: "completed"
    amount: string
    currency: Currency
    createdAt: string
  }
}
