import { getOrder } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id).catch(() => null)

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">발주를 찾을 수 없습니다.</p>
        <Link href="/orders" className="text-blue-600 text-sm hover:underline mt-2 block">← 목록으로</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-700">← 목록</Link>
        <h1 className="text-2xl font-bold text-gray-900">발주 상세</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <Row label="발주 ID" value={order.id} mono />
        <Row label="바이어 ID" value={order.buyer_id} mono />
        <Row label="약정 도착일" value={order.promised_delivery_date} />
        <Row label="상태" value={<StatusBadge status={order.status} />} />
        <Row label="생성일" value={new Date(order.created_at).toLocaleString('ko-KR')} />
      </div>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex">
      <dt className="w-32 text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
