import { WalletDetail } from "@/components/wallet-detail"

export default async function WalletPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WalletDetail walletId={id} />
}
