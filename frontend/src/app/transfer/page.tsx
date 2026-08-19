import { TransferForm } from "@/components/transfer-form"

export default async function TransferPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  return <TransferForm initialFrom={from} />
}
