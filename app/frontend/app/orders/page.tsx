import { getOrders } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const orders = await getOrders().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">발주 목록</h1>
        <Link href="/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + 새 발주
        </Link>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {orders.length === 0 && (
          <p className="p-6 text-center text-gray-400">발주 없음</p>
        )}
        {orders.map(order => (
          <Link key={order.id} href={`/orders/${order.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
            <div className="space-y-1">
              <p className="text-sm font-mono text-gray-500">#{order.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-900">약정 도착일: <strong>{order.promised_delivery_date}</strong></p>
              <p className="text-xs text-gray-400">생성: {new Date(order.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
            <StatusBadge status={order.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}
